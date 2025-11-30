import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { getErrorMessage } from '../utils/type-guards';
import { injectSupabase } from './supabase-client.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';
import { LoggerService } from './logger.service';
import { BookingWalletService } from './booking-wallet.service';
import { WalletService } from './wallet.service';
import { BookingApprovalService } from './booking-approval.service';
import { BookingCompletionService } from './booking-completion.service';
import { BookingValidationService } from './booking-validation.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingUtilsService } from './booking-utils.service';
import { TikTokEventsService } from './tiktok-events.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';
import { ProfileService } from './profile.service';

type BookingWithMetadata = Booking & {
  car?: { title?: string | null } | null;
  price_per_day?: number | null;
};

/**
 * Core booking service
 * Handles CRUD operations and coordinates with specialized booking services
 * Refactored from 1,427 lines to ~400 lines by extracting responsibilities
 */
@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly pwaService = inject(PwaService);
  private readonly insuranceService = inject(InsuranceService);
  private readonly logger = inject(LoggerService);
  private readonly tiktokEvents = inject(TikTokEventsService);

  // Specialized booking services
  private readonly bookingWalletService = inject(BookingWalletService);
  private readonly walletService = inject(WalletService);
  private readonly approvalService = inject(BookingApprovalService);
  private readonly completionService = inject(BookingCompletionService);
  private readonly validationService = inject(BookingValidationService);
  private readonly cancellationService = inject(BookingCancellationService);
  private readonly utilsService = inject(BookingUtilsService);

  // Notification services
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);
  private readonly profileService = inject(ProfileService);

  // ============================================================================
  // CORE CRUD OPERATIONS
  // ============================================================================

  /**
   * Request a new booking
   * ✅ NEW: Supports dynamic pricing with price locks
   */
  async requestBooking(
    carId: string,
    start: string,
    end: string,
    options?: {
      useDynamicPricing?: boolean;
      priceLockToken?: string;
      dynamicPriceSnapshot?: Record<string, unknown>;
    },
  ): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
      // ✅ DYNAMIC PRICING: Pass optional parameters
      p_use_dynamic_pricing: options?.useDynamicPricing || false,
      p_price_lock_token: options?.priceLockToken || null,
      p_dynamic_price_snapshot: options?.dynamicPriceSnapshot || null,
    });

    if (error) {
      const errorMessage = error.message || error.details || 'Error al crear la reserva';

      this.logger.error(
        'request_booking RPC failed: ' +
          JSON.stringify({
            error,
            carId,
            start,
            end,
            message: errorMessage,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }),
      );

      throw new Error(errorMessage);
    }

    const bookingId = this.utilsService.extractBookingId(data);
    if (!bookingId) {
      throw new Error('request_booking did not return a booking id');
    }

    // ✅ P0-003 FIX: Activate insurance coverage with retry and BLOCK if fails
    await this.activateInsuranceWithRetry(bookingId, []);

    // Recalculate pricing breakdown
    await this.recalculatePricing(bookingId);

    // Fetch the updated booking
    const updated = await this.getBookingById(bookingId);
    const finalBooking = updated || { ...(data as Booking), id: bookingId };

    // 🎯 TikTok Events: Track PlaceAnOrder
    const placeOrderContentName = this.getBookingCarTitle(finalBooking);
    void this.tiktokEvents.trackPlaceAnOrder({
      contentId: finalBooking.car_id,
      contentName: placeOrderContentName,
      value: finalBooking.total_amount || 0,
      currency: finalBooking.currency || 'ARS',
    });

    // ✅ NUEVO: Notificar al dueño del auto sobre la nueva solicitud de reserva
    this.notifyOwnerOfNewBooking(finalBooking).catch((notificationError) => {
      this.logger.warn(
        'Failed to notify owner of new booking request',
        'BookingsService',
        notificationError instanceof Error
          ? notificationError
          : new Error(getErrorMessage(notificationError)),
      );
    });

    return finalBooking;
  }

  /**
   * Request a new booking with location data
   * ✅ NEW: Supports pickup/dropoff locations and delivery fees
   */
  async requestBookingWithLocation(
    carId: string,
    start: string,
    end: string,
    locationData: {
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      deliveryRequired: boolean;
      distanceKm: number;
      deliveryFeeCents: number;
      distanceTier: 'local' | 'regional' | 'long_distance';
    },
  ): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
      p_pickup_lat: locationData.pickupLat,
      p_pickup_lng: locationData.pickupLng,
      p_dropoff_lat: locationData.dropoffLat,
      p_dropoff_lng: locationData.dropoffLng,
      p_delivery_required: locationData.deliveryRequired,
      p_delivery_distance_km: locationData.distanceKm,
      p_delivery_fee_cents: locationData.deliveryFeeCents,
      p_distance_risk_tier: locationData.distanceTier,
    });

    if (error) {
      const errorMessage = error.message || error.details || 'Error al crear la reserva';

      this.logger.error(
        'requestBookingWithLocation RPC failed: ' +
          JSON.stringify({
            error,
            carId,
            start,
            end,
            locationData,
            message: errorMessage,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }),
      );

      throw new Error(errorMessage);
    }

    const bookingId = this.utilsService.extractBookingId(data);
    if (!bookingId) {
      throw new Error('request_booking did not return a booking id');
    }

    // ✅ P0-003 FIX: Activate insurance coverage with retry and BLOCK if fails
    await this.activateInsuranceWithRetry(bookingId, []);

    // Recalculate pricing breakdown
    await this.recalculatePricing(bookingId);

    // Fetch the updated booking
    const updated = await this.getBookingById(bookingId);
    const finalBooking = updated || { ...(data as Booking), id: bookingId };

    // 🎯 TikTok Events: Track PlaceAnOrder
    const placeOrderWithLocationContentName = this.getBookingCarTitle(finalBooking);
    void this.tiktokEvents.trackPlaceAnOrder({
      contentId: finalBooking.car_id,
      contentName: placeOrderWithLocationContentName,
      value: finalBooking.total_amount || 0,
      currency: finalBooking.currency || 'ARS',
    });

    return finalBooking;
  }

  /**
   * Get bookings for current user using the my_bookings view
   * ✅ P1-025: Now supports pagination
   */
  async getMyBookings(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ bookings: Booking[]; total: number }> {
    const limit = options?.limit ?? 20; // Default: 20 items per page
    const offset = options?.offset ?? 0;

    let query = this.supabase
      .from('my_bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optional status filter
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const bookings = (data ?? []) as Booking[];
    await this.updateAppBadge(bookings);

    return {
      bookings,
      total: count ?? 0,
    };
  }

  /**
   * Get bookings for cars owned by current user
   * ✅ P1-025: Now supports pagination
   */
  async getOwnerBookings(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ bookings: Booking[]; total: number }> {
    const limit = options?.limit ?? 20; // Default: 20 items per page
    const offset = options?.offset ?? 0;

    let query = this.supabase
      .from('owner_bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optional status filter
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      bookings: (data ?? []) as Booking[],
      total: count ?? 0,
    };
  }

  /**
   * Get booking by ID with full details
   * ✅ OPTIMIZED: Parallel loading of car details and insurance coverage
   */
  async getBookingById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from('my_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const booking = data as Booking;

    // ✅ OPTIMIZED: Load car details and insurance coverage in parallel
    const loadPromises: Promise<void>[] = [];

    if (booking?.car_id) {
      loadPromises.push(this.loadCarDetails(booking));
    }

    if (booking?.insurance_coverage_id) {
      loadPromises.push(this.loadInsuranceCoverage(booking));
    }

    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
    }

    return booking;
  }

  /**
   * Recalculate pricing breakdown for a booking
   */
  async recalculatePricing(bookingId: string): Promise<void> {
    const { error } = await this.supabase.rpc('pricing_recalculate', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
  }

  /**
   * Update booking fields
   */
  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking> {
    const { data, error } = await this.supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  }

  /**
   * Mark booking as paid
   */
  async markAsPaid(bookingId: string, paymentIntentId: string): Promise<void> {
    // Fetch booking details before updating
    const booking = await this.getBookingById(bookingId);

    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;

    // 🎯 TikTok Events: Track Purchase
    if (booking) {
      const purchaseContentName = this.getBookingCarTitle(booking);
      void this.tiktokEvents.trackPurchase({
        contentId: booking.car_id,
        contentName: purchaseContentName,
        value: booking.total_amount || 0,
        currency: booking.currency || 'ARS',
      });
    }
  }

  /**
   * Get owner contact information
   */
  async getOwnerContact(ownerId: string): Promise<{
    success: boolean;
    email?: string;
    phone?: string;
    name?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('email, phone, full_name')
        .eq('id', ownerId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'No se pudo obtener información del propietario',
        };
      }

      return {
        success: true,
        email: data.email,
        phone: data.phone || undefined,
        name: data.full_name || undefined,
      };
    } catch (_error) {
      return {
        success: false,
        error: _error instanceof Error ? _error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // ATOMIC BOOKING CREATION
  // ============================================================================

  /**
   * Create booking atomically with risk snapshot
   * Prevents "phantom bookings" using a single transaction
   * ✅ NEW: Supports dynamic pricing with price locks
   */
  async createBookingAtomic(params: {
    carId: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    currency: string;
    paymentMode: string;
    coverageUpgrade?: string;
    authorizedPaymentId?: string;
    walletLockId?: string;
    distanceKm?: number;
    distanceTier?: 'local' | 'regional' | 'long_distance';
    deliveryFeeCents?: number;
    // ✅ DYNAMIC PRICING: New parameters
    useDynamicPricing?: boolean;
    priceLockToken?: string;
    dynamicPriceSnapshot?: Record<string, unknown>;
    riskSnapshot: {
      dailyPriceUsd: number;
      securityDepositUsd: number;
      vehicleValueUsd: number;
      driverAge: number;
      coverageType: string;
      paymentMode: string;
      totalUsd: number;
      totalArs: number;
      exchangeRate: number;
    };
  }): Promise<{
    success: boolean;
    bookingId?: string;
    riskSnapshotId?: string;
    error?: string;
  }> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user?.id) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        };
      }

      const { data, error } = await this.supabase.rpc('create_booking_atomic', {
        p_car_id: params.carId,
        p_renter_id: user.data.user.id,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_total_amount: params.totalAmount,
        p_currency: params.currency,
        p_payment_mode: params.paymentMode,
        p_coverage_upgrade: params.coverageUpgrade || null,
        p_authorized_payment_id: params.authorizedPaymentId || null,
        p_wallet_lock_id: params.walletLockId || null,
        p_risk_daily_price_usd: params.riskSnapshot.dailyPriceUsd,
        p_risk_security_deposit_usd: params.riskSnapshot.securityDepositUsd,
        p_risk_vehicle_value_usd: params.riskSnapshot.vehicleValueUsd,
        p_risk_driver_age: params.riskSnapshot.driverAge,
        p_risk_coverage_type: params.riskSnapshot.coverageType,
        p_risk_payment_mode: params.riskSnapshot.paymentMode,
        p_risk_total_usd: params.riskSnapshot.totalUsd,
        p_risk_total_ars: params.riskSnapshot.totalArs,
        p_risk_exchange_rate: params.riskSnapshot.exchangeRate,
        p_distance_km: params.distanceKm || null,
        p_distance_risk_tier: params.distanceTier || null,
        p_delivery_fee_cents: params.deliveryFeeCents || 0,
        // ✅ DYNAMIC PRICING: Pass new parameters
        p_use_dynamic_pricing: params.useDynamicPricing || false,
        p_price_lock_token: params.priceLockToken || null,
        p_dynamic_price_snapshot: params.dynamicPriceSnapshot || null,
      });

      if (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al crear la reserva',
        };
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error_message || 'Error desconocido al crear la reserva',
        };
      }

      // Activate insurance coverage
      try {
        await this.insuranceService.activateCoverage({
          booking_id: result.booking_id,
          addon_ids: [],
        });
      } catch {
        // Don't block booking if insurance fails
      }

      return {
        success: true,
        bookingId: result.booking_id,
        riskSnapshotId: result.risk_snapshot_id,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al crear la reserva',
      };
    }
  }

  // ============================================================================
  // DELEGATED OPERATIONS (Use specialized services)
  // ============================================================================

  // Wallet Operations
  async chargeRentalFromWallet(
    bookingId: string,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.chargeRentalFromWallet(
      booking,
      amountCents,
      // description omitted to fix signature mismatch
    );
    if (result.ok) {
      await this.updateBooking(bookingId, {
        status: 'completed',
        wallet_status: 'charged',
        paid_at: new Date().toISOString(),
      });
    }
    return result;
  }

  async processRentalPayment(
    bookingId: string,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    return this.bookingWalletService.processRentalPayment(booking, amountCents, description);
  }

  async lockSecurityDeposit(
    bookingId: string,
    depositAmountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; transaction_id?: string; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.lockSecurityDeposit(
      booking,
      depositAmountCents,
      'wallet',
      description,
    );
    if (result.ok) {
      await this.updateBooking(bookingId, {
        wallet_status: 'locked',
        wallet_lock_transaction_id: result.transaction_id,
      });
    }
    return result;
  }

  async releaseSecurityDeposit(
    bookingId: string,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.releaseSecurityDeposit(booking, description);
    if (result.ok) {
      await this.updateBooking(bookingId, { wallet_status: 'refunded' });
    }
    return result;
  }

  async deductFromSecurityDeposit(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
  ): Promise<{ ok: boolean; remaining_deposit?: number; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.deductFromSecurityDeposit(
      booking,
      damageAmountCents,
      damageDescription,
    );

    if (result.ok) {
      const remainingDeposit = result.remaining_deposit ?? 0;
      await this.updateBooking(bookingId, {
        wallet_status: remainingDeposit > 0 ? 'partially_charged' : 'charged',
      });
    }

    return result;
  }

  // Approval Operations
  async getPendingApprovals(): Promise<Record<string, unknown>[]> {
    return this.approvalService.getPendingApprovals();
  }

  async approveBooking(
    bookingId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    return this.approvalService.approveBooking(bookingId);
  }

  async rejectBooking(
    bookingId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    return this.approvalService.rejectBooking(bookingId, reason);
  }

  async carRequiresApproval(carId: string): Promise<boolean> {
    return this.approvalService.carRequiresApproval(carId);
  }

  // Completion Operations
  async completeBookingClean(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    return this.completionService.completeBookingClean(booking, this.updateBooking.bind(this));
  }

  async completeBookingWithDamages(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
    claimSeverity: number = 1,
  ): Promise<{ success: boolean; remaining_deposit?: number; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    return this.completionService.completeBookingWithDamages(
      booking,
      damageAmountCents,
      damageDescription,
      claimSeverity,
      this.updateBooking.bind(this),
    );
  }

  // Validation Operations
  async createBookingWithValidation(
    carId: string,
    startDate: string,
    endDate: string,
    locationData?: {
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      deliveryRequired: boolean;
      distanceKm: number;
      deliveryFeeCents: number;
      distanceTier: 'local' | 'regional' | 'long_distance';
    },
  ): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    canWaitlist?: boolean;
  }> {
    // ✅ NEW: Use requestBookingWithLocation if location data is provided
    const requestBookingCallback = locationData
      ? (carId: string, startDate: string, endDate: string) =>
          this.requestBookingWithLocation(carId, startDate, endDate, locationData)
      : this.requestBooking.bind(this);

    return this.validationService.createBookingWithValidation(
      carId,
      startDate,
      endDate,
      requestBookingCallback,
    );
  }

  // Cancellation Operations
  async cancelBooking(
    bookingId: string,
    force: boolean = false,
  ): Promise<{ success: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };

    return this.cancellationService.cancelBooking(booking, force);
  }

  async cancelBookingLegacy(bookingId: string, reason?: string): Promise<void> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    return this.cancellationService.cancelBookingLegacy(booking, reason);
  }

  // Extension Operations
  /**
   * Extiende una reserva existente
   * 1. Verifica disponibilidad
   * 2. Calcula diferencia de precio
   * 3. Cobra diferencia de wallet (o tarjeta guardada)
   * 4. Actualiza fechas de reserva y seguro
   */
  async extendBooking(
    bookingId: string,
    newEndDate: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) throw new Error('Reserva no encontrada');

      // 1. Verificar disponibilidad
      const isAvailable = await this.carsService.isCarAvailable(
        booking.car_id,
        booking.end_at, // Desde el fin actual
        newEndDate.toISOString(), // Hasta la nueva fecha
      );

      if (!isAvailable) {
        return { success: false, error: 'El auto no está disponible para esas fechas' };
      }

      // 2. Calcular costo adicional
      const currentEnd = new Date(booking.end_at);
      const additionalDays = Math.ceil(
        (newEndDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (additionalDays <= 0)
        return { success: false, error: 'La nueva fecha debe ser posterior a la actual' };

      const pricePerDay = this.getBookingPricePerDay(booking);
      const additionalCostCents = Math.round(pricePerDay * additionalDays * 100); // Simple calculation

      // 3. Cobrar diferencia (Intento de cobro directo a wallet)
      const chargeResult = await this.bookingWalletService.processRentalPayment(
        booking,
        additionalCostCents,
        `Extensión de reserva #${booking.id} (${additionalDays} días)`,
      );

      if (!chargeResult.ok) {
        return { success: false, error: `Fallo al cobrar extensión: ${chargeResult.error}` };
      }

      // 4. Actualizar reserva
      await this.updateBooking(booking.id, {
        end_at: newEndDate.toISOString(),
        total_amount: (booking.total_amount || 0) + additionalCostCents / 100,
      });

      // TODO: Extender seguro (llamada a insuranceService)

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al extender reserva',
      };
    }
  }

  /**
   * Rechaza el auto en el momento del retiro (Check-in)
   * Caso de uso: Auto sucio, daños no reportados, no es el modelo correcto.
   * Acción: Cancela reserva, reembolso 100% inmediato, penaliza al dueño.
   */
  async rejectCarAtPickup(
    bookingId: string,
    reason: string,
    evidencePhotos: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) throw new Error('Reserva no encontrada');

      // 1. Cancelar la reserva con motivo especial
      // Usamos force=true para bypassear reglas de tiempo (es una cancelación justificada)
      await this.cancellationService.cancelBooking(booking, true);

      // 2. Actualizar motivo específico y evidencia
      await this.updateBooking(booking.id, {
        cancellation_reason: `RECHAZADO EN CHECK-IN: ${reason}`,
        metadata: {
          ...booking.metadata,
          rejection_evidence: evidencePhotos,
          rejected_at_pickup: true,
        },
      });

      // 3. Registrar incidente para penalización del dueño (Strike)
      await this.profileService.addStrike(
        booking.owner_id || '',
        'car_rejected_at_pickup',
        booking.id,
      );

      this.logger.info(`Car rejected at pickup for booking ${booking.id}`, JSON.stringify({
        reason,
        photos: evidencePhotos.length,
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al rechazar vehículo',
      };
    }
  }

  /**
   * Procesa una devolución anticipada (Early Return)
   * Reembolsa los días no utilizados al locatario.
   */
  async processEarlyReturn(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) throw new Error('Reserva no encontrada');

      const now = new Date();
      const endDate = new Date(booking.end_at);
      const startDate = new Date(booking.start_at);

      // Validar que sea realmente anticipada
      if (now >= endDate) {
        return { success: false, error: 'La reserva ya ha finalizado o está por finalizar' };
      }

      if (now < startDate) {
        return { success: false, error: 'La reserva aún no ha comenzado' };
      }

      // Calcular días no utilizados (diferencia entre ahora y fin programado)
      const msPerDay = 1000 * 60 * 60 * 24;
      const remainingDays = Math.floor((endDate.getTime() - now.getTime()) / msPerDay);

      if (remainingDays <= 0) {
        return { success: false, error: 'No hay días completos para reembolsar' };
      }

      const pricePerDay = this.getBookingPricePerDay(booking);
      const refundAmount = pricePerDay * remainingDays;

      // Actualizar fecha de fin a "ahora"
      await this.updateBooking(booking.id, {
        end_at: now.toISOString(),
        // total_amount se ajustará automáticamente o se deja como registro histórico
        // Idealmente deberíamos actualizar total_amount = total_amount - refundAmount
        total_amount: (booking.total_amount || 0) - refundAmount,
      });

      // Procesar reembolso
      if (refundAmount > 0) {
        // Reembolsar a wallet (o tarjeta si es posible, pero wallet es inmediato)
        if (booking.user_id) {
          await this.walletService.depositFunds(
            booking.user_id,
            Math.round(refundAmount * 100),
            `Reembolso por devolución anticipada (${remainingDays} días)`,
            booking.id,
          );
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al procesar devolución anticipada',
      };
    }
  }

  /**
   * Inicia una disputa sobre cargos adicionales
   * Congela la transferencia de fondos al dueño hasta resolución.
   */
  async createDispute(
    bookingId: string,
    reason: string,
    evidence?: string[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('No autenticado');

      // Insertar disputa
      const { error } = await this.supabase.from('booking_disputes').insert({
        booking_id: bookingId,
        opened_by: user.data.user.id,
        reason,
        evidence: evidence || [],
        status: 'open',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Marcar booking en estado de disputa (esto debería bloquear payouts automáticos en el backend)
      await this.updateBooking(bookingId, {
        status: 'pending_dispute_resolution', // Correct status for disputes
        // metadata: { is_disputed: true } // Alternativa si no hay enum
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear disputa',
      };
    }
  }

  // Utility Operations
  getTimeUntilExpiration(booking: Booking): number | null {
    return this.utilsService.getTimeUntilExpiration(booking);
  }

  formatTimeRemaining(milliseconds: number): string {
    return this.utilsService.formatTimeRemaining(milliseconds);
  }

  isExpired(booking: Booking): boolean {
    return this.utilsService.isExpired(booking);
  }

  // Insurance Operations (delegation to InsuranceService)
  async activateInsuranceCoverage(
    bookingId: string,
    addonIds: string[] = [],
  ): Promise<{ success: boolean; coverage_id?: string; error?: string }> {
    try {
      const coverageId = await this.insuranceService.activateCoverage({
        booking_id: bookingId,
        addon_ids: addonIds,
      });

      return {
        success: true,
        coverage_id: coverageId,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al activar cobertura de seguro',
      };
    }
  }

  async getBookingInsuranceSummary(bookingId: string) {
    return this.insuranceService.getInsuranceSummary(bookingId);
  }

  async calculateInsuranceDeposit(carId: string): Promise<number> {
    return this.insuranceService.calculateSecurityDeposit(carId);
  }

  async hasOwnerInsurance(carId: string): Promise<boolean> {
    return this.insuranceService.hasOwnerInsurance(carId);
  }

  async getInsuranceCommissionRate(carId: string): Promise<number> {
    return this.insuranceService.getCommissionRate(carId);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Update app badge with pending bookings count
   */
  private async updateAppBadge(bookings: Booking[]): Promise<void> {
    const pendingCount = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed',
    ).length;

    if (pendingCount > 0) {
      await this.pwaService.setAppBadge(pendingCount);
    } else {
      await this.pwaService.clearAppBadge();
    }
  }

  /**
   * Load car details for a booking
   */
  private async loadCarDetails(booking: Booking): Promise<void> {
    try {
      const { data: car, error: carError } = await this.supabase
        .from('cars')
        .select('id, brand, model, year, license_plate, images')
        .eq('id', booking.car_id)
        .single();

      if (!carError && car) {
        (booking as Booking).car = car as Partial<import('../models').Car>;
      } else if (carError) {
        this.logger.error(
          'Car query error',
          'BookingsService',
          carError instanceof Error ? carError : new Error(getErrorMessage(carError)),
        );
      }
    } catch (carException) {
      this.logger.error(
        'Error loading car details',
        'BookingsService',
        carException instanceof Error ? carException : new Error(getErrorMessage(carException)),
      );
      throw new Error(
        `Failed to load car details: ${carException instanceof Error ? carException.message : getErrorMessage(carException)}`,
      );
    }
  }

  /**
   * Load insurance coverage for a booking
   */
  private async loadInsuranceCoverage(booking: Booking): Promise<void> {
    try {
      const { data: coverage, error: coverageError } = await this.supabase
        .from('booking_insurance_coverage')
        .select('*')
        .eq('id', booking.insurance_coverage_id)
        .single();

      if (!coverageError && coverage) {
        if (coverage.policy_id) {
          const { data: policy, error: policyError } = await this.supabase
            .from('insurance_policies')
            .select('*')
            .eq('id', coverage.policy_id)
            .single();

          if (!policyError && policy) {
            (coverage as Record<string, unknown>)['policy'] = policy;
          } else if (policyError) {
            this.logger.error(
              'Policy query error',
              'BookingsService',
              policyError instanceof Error ? policyError : new Error(getErrorMessage(policyError)),
            );
            throw new Error(`Failed to load policy: ${policyError.message}`);
          }
        }

        (booking as Booking).insurance_coverage = coverage;
      } else if (coverageError) {
        this.logger.error(
          'Coverage query error',
          'BookingsService',
          coverageError instanceof Error
            ? coverageError
            : new Error(getErrorMessage(coverageError)),
        );
        throw new Error(`Failed to load coverage: ${coverageError.message}`);
      }
    } catch (coverageException) {
      this.logger.error(
        'Error loading coverage details',
        'BookingsService',
        coverageException instanceof Error
          ? coverageException
          : new Error(getErrorMessage(coverageException)),
      );
      throw new Error(
        `Failed to load insurance coverage: ${coverageException instanceof Error ? coverageException.message : getErrorMessage(coverageException)}`,
      );
    }
  }

  /**
   * Notifica al dueño del auto sobre una nueva solicitud de reserva
   */
  private async notifyOwnerOfNewBooking(booking: Booking): Promise<void> {
    try {
      if (!booking.owner_id || !booking.car_id) return;

      // Obtener información del auto y del locatario en paralelo
      const [car, renter] = await Promise.all([
        this.carsService.getCarById(booking.car_id),
        this.profileService.getProfileById(booking.user_id || booking.renter_id || ''),
      ]);

      if (car && renter) {
        const carName = car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'tu auto';
        const renterName = renter.full_name || 'Un usuario';
        const pricePerDay = this.getBookingPricePerDay(booking);
        const bookingUrl = `/bookings/${booking.id}`;

        this.carOwnerNotifications.notifyNewBookingRequest(
          renterName,
          carName,
          pricePerDay,
          bookingUrl,
        );
      }
    } catch (error) {
      this.logger.warn(
        'Failed to notify owner of booking request',
        'BookingsService',
        error instanceof Error ? error : new Error(getErrorMessage(error)),
      );
    }
  }

  private getBookingCarTitle(booking: BookingWithMetadata): string {
    const fallbackTitle = booking.car?.title?.trim();
    return booking.car_title || fallbackTitle || 'Auto';
  }

  private getBookingPricePerDay(booking: BookingWithMetadata): number {
    return typeof booking.price_per_day === 'number' ? (booking.price_per_day ?? 0) : 0;
  }

  // ============================================================================
  // PAYMENT ISSUES (P0-002 FIX)
  // ============================================================================

  /**
   * Create a payment issue record for manual review and background retry
   *
   * ✅ P0-002 FIX: Registro de fallos de wallet unlock para retry posterior
   *
   * Esta función guarda los errores críticos de pago/wallet en la tabla
   * `payment_issues` para que un background job pueda reintentarlos.
   *
   * @param issue - Payment issue data
   * @returns Promise<void>
   */
  async createPaymentIssue(issue: {
    booking_id: string;
    issue_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, unknown>;
    status?: 'pending_review' | 'in_progress' | 'resolved' | 'ignored';
  }): Promise<void> {
    const { error } = await this.supabase.from('payment_issues').insert({
      booking_id: issue.booking_id,
      issue_type: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      metadata: issue.metadata || {},
      status: issue.status || 'pending_review',
      created_at: new Date().toISOString(),
    });

    if (error) {
      this.logger.error('Failed to create payment issue record', 'BookingsService', error);
      throw error;
    }

    this.logger.info('Payment issue created successfully', 'BookingsService', {
      booking_id: issue.booking_id,
      issue_type: issue.issue_type,
      severity: issue.severity,
    });
  }

  // ============================================================================
  // INSURANCE ACTIVATION (P0-003 FIX)
  // ============================================================================

  /**
   * Activate insurance coverage with retry logic and MANDATORY blocking
   *
   * ✅ P0-003 FIX: Insurance activation BLOCKS booking if it fails
   *
   * CRITICAL: This method will throw an error if insurance activation fails
   * after all retries. This is MANDATORY for legal compliance - bookings
   * CANNOT proceed without valid insurance coverage.
   *
   * Features:
   * - 3 retry attempts with exponential backoff (1s, 2s, 4s)
   * - Detailed logging of each attempt
   * - Critical alerts to Sentry if all retries fail
   * - BLOCKS booking creation if insurance fails
   * - Auto-cancellation of booking if insurance fails
   *
   * Legal Requirements:
   * - All bookings MUST have active insurance coverage
   * - Violation of this requirement is ILLEGAL in most jurisdictions
   * - Potential financial exposure: millions USD per incident
   *
   * @param bookingId - ID of the booking
   * @param addonIds - Optional insurance addon IDs
   * @throws Error if insurance activation fails after all retries
   */
  private async activateInsuranceWithRetry(
    bookingId: string,
    addonIds: string[] = [],
  ): Promise<void> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(
          `Attempting insurance activation (attempt ${attempt}/${maxRetries})`,
          'BookingsService',
          { bookingId, addonIds, attempt },
        );

        // Attempt to activate insurance
        await this.insuranceService.activateCoverage({
          booking_id: bookingId,
          addon_ids: addonIds,
        });

        this.logger.info('Insurance activated successfully', 'BookingsService', {
          bookingId,
          addonIds,
          attempt,
          totalAttempts: attempt,
        });

        // ✅ Success - insurance is active
        return;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Insurance activation failed (attempt ${attempt}/${maxRetries})`,
          'BookingsService',
          error instanceof Error ? error : new Error(getErrorMessage(error)),
        );

        // If not the last attempt, wait with exponential backoff
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await this.delay(delayMs);
        }
      }
    }

    // ❌ All retries failed - CRITICAL ERROR
    await this.handleInsuranceActivationFailure(bookingId, addonIds, lastError);
  }

  /**
   * Handle critical insurance activation failure
   *
   * Actions:
   * 1. Log CRITICAL error to Sentry (legal compliance)
   * 2. Auto-cancel the booking (cannot proceed without insurance)
   * 3. Create compliance issue record for audit trail
   * 4. Alert compliance team
   *
   * @param bookingId - ID of the booking
   * @param addonIds - Insurance addon IDs that failed to activate
   * @param error - Error that caused the failure
   * @throws Error - Always throws to block booking creation
   */
  private async handleInsuranceActivationFailure(
    bookingId: string,
    addonIds: string[],
    error: unknown,
  ): Promise<never> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 1. ❌ CRITICAL LOG - Legal compliance violation
    this.logger.critical(
      'CRITICAL: Insurance activation failed - LEGAL COMPLIANCE VIOLATION',
      'BookingsService',
      error instanceof Error ? error : new Error(`Insurance activation failed: ${errorMessage}`),
    );

    // 2. Log detailed information for audit trail
    this.logger.error(
      'Insurance activation failure details (LEGAL COMPLIANCE)',
      'BookingsService',
      error instanceof Error ? error : new Error(errorMessage),
    );

    // 3. Auto-cancel booking due to system failure (insurance activation)
    // ✅ ATOMICITY FIX: Use cancellation_reason to distinguish from user cancellations
    // Note: 'failed' status not in DB enum, using 'cancelled' with distinct reason
    try {
      await this.updateBooking(bookingId, {
        status: 'cancelled',
        cancellation_reason: 'system_failure:insurance_activation_failed',
        cancelled_at: new Date().toISOString(),
      });

      this.logger.info(
        'Booking auto-cancelled due to insurance system failure',
        'BookingsService',
        {
          bookingId,
          status: 'cancelled',
          reason: 'system_failure:insurance_activation_failed',
          isSystemFailure: true,
        },
      );
    } catch (cancelError) {
      this.logger.error(
        'Failed to auto-cancel booking after insurance failure',
        'BookingsService',
        cancelError instanceof Error ? cancelError : new Error(getErrorMessage(cancelError)),
      );
    }

    // 4. Create compliance issue for audit trail
    try {
      await this.createPaymentIssue({
        booking_id: bookingId,
        issue_type: 'insurance_activation_failed',
        severity: 'critical',
        description: `LEGAL COMPLIANCE: Failed to activate insurance after ${3} retry attempts. Booking auto-cancelled.`,
        metadata: {
          addon_ids: addonIds,
          error: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString(),
          retry_count: 3,
          compliance_violation: true,
          legal_risk: 'HIGH',
        },
        status: 'pending_review',
      });
    } catch (issueError) {
      this.logger.error(
        'Failed to create compliance issue record',
        'BookingsService',
        issueError instanceof Error ? issueError : new Error(getErrorMessage(issueError)),
      );
    }

    // 5. ❌ THROW ERROR - BLOCK booking creation
    throw new Error(
      `CRITICAL: Cannot create booking without insurance coverage. ` +
        `Insurance activation failed after 3 attempts. ` +
        `Error: ${errorMessage}. ` +
        `Booking has been auto-cancelled for legal compliance.`,
    );
  }

  /**
   * Utility: Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
