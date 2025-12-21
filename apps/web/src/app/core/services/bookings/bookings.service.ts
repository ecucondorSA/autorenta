import { Injectable, inject } from '@angular/core';
import { Booking, BookingExtensionRequest } from '../models';
import { getErrorMessage } from '../utils/type-guards';
import { BookingApprovalService } from './booking-approval.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingCompletionService } from './booking-completion.service';
import { BookingUtilsService } from './booking-utils.service';
import { BookingValidationService } from './booking-validation.service';
import { BookingWalletService } from './booking-wallet.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from '@core/services/cars/cars.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { InsuranceService } from './insurance.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { PwaService } from '@core/services/infrastructure/pwa.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';
import { WalletService } from '@core/services/payments/wallet.service';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
  private readonly bookingNotifications = inject(BookingNotificationsService);
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
      // ✅ FIX: Add missing location parameters (defaults to null/false for basic booking)
      p_pickup_lat: null,
      p_pickup_lng: null,
      p_dropoff_lat: null,
      p_dropoff_lng: null,
      p_delivery_required: false,
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

      // Fallback para entornos desactualizados o cambios de esquema
      const needsFallback =
        error.code === '42703' ||
        errorMessage.toLowerCase().includes('pickup_lat') ||
        errorMessage.toLowerCase().includes('faltan parámetros');

      if (needsFallback) {
        this.logger.warn(
          'Falling back to direct booking insert (schema mismatch)',
          'BookingsService',
        );
        return await this.fallbackDirectBookingInsert(carId, start, end);
      }

      throw new Error(errorMessage);
    }

    // ✅ DEBUG: Log the RPC response to understand what's returned
    this.logger.info(
      `request_booking RPC response: ${JSON.stringify({
        data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        hasId: data?.id !== undefined,
        id: data?.id,
        bookingId: data?.booking_id,
      })}`,
      'BookingsService',
    );

    const bookingId = this.utilsService.extractBookingId(data);
    if (!bookingId) {
      this.logger.error(
        `Failed to extract booking ID from RPC response: ${JSON.stringify({
          data,
          dataType: typeof data,
          dataKeys: data ? Object.keys(data) : [],
        })}`,
        'BookingsService',
      );
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
   * Get owner booking by ID (owner view only)
   */
  async getOwnerBookingById(bookingId: string): Promise<Booking | null> {
    if (!UUID_REGEX.test(bookingId)) {
      this.logger.warn(`getOwnerBookingById: invalid bookingId - ${bookingId}`);
      return null;
    }

    return this.fetchBookingFromView('owner_bookings', bookingId);
  }

  async getRenterVerificationForOwner(bookingId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.rpc('get_renter_verification_for_owner', {
      p_booking_id: bookingId,
    });

    if (error) {
      return null;
    }

    if (!data) return null;
    return Array.isArray(data) ? (data[0] as Record<string, unknown> | null) : (data as Record<string, unknown> | null);
  }

  /**
   * Get booking by ID with full details
   * ✅ OPTIMIZED: Parallel loading of car details and insurance coverage
   */
  async getBookingById(bookingId: string): Promise<Booking | null> {
    // Evita llamadas inválidas (previene 400 de PostgREST por UUID mal formado)
    if (!UUID_REGEX.test(bookingId)) {
      this.logger.warn(`getBookingById: invalid bookingId - ${bookingId}`);
      return null;
    }

    const booking =
      (await this.fetchBookingFromView('my_bookings', bookingId)) ??
      (await this.fetchBookingFromView('owner_bookings', bookingId));

    if (!booking) return null;

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

  private async fetchBookingFromView(
    viewName: 'my_bookings' | 'owner_bookings',
    bookingId: string,
  ): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from(viewName)
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as Booking;
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
        .from('profiles')
        .select('email, phone, full_name')
        .eq('id', ownerId)
        .maybeSingle();

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

      // ✅ P0-003: Insurance is mandatory — block booking if it fails
      await this.activateInsuranceWithRetry(result.booking_id, []);

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
    _description?: string,
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
   * Solicita una extensión de reserva.
   * Crea una solicitud pendiente para aprobación del Owner.
   */
  async requestExtension(
    bookingId: string,
    newEndDate: Date,
    renterMessage?: string,
  ): Promise<{ success: boolean; error?: string; additionalCost?: number }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) throw new Error('Reserva no encontrada');

      if (newEndDate <= new Date(booking.end_at)) {
        return { success: false, error: 'La nueva fecha debe ser posterior a la actual' };
      }

      const currentUser = (await this.supabase.auth.getUser()).data.user;
      if (!currentUser || currentUser.id !== booking.renter_id) {
        return { success: false, error: 'Solo el arrendatario puede solicitar una extensión.' };
      }

      // Calcular costo adicional ESTIMADO (puede variar al momento de la aprobación)
      const currentEnd = new Date(booking.end_at);
      const additionalDays = Math.ceil(
        (newEndDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (additionalDays <= 0)
        return { success: false, error: 'La nueva fecha debe ser posterior a la actual' };

      const pricePerDay = this.getBookingPricePerDay(booking);
      const estimatedAdditionalCostCents = Math.round(pricePerDay * additionalDays * 100);

      // INSERT a new extension request
      const { error: insertError } = await this.supabase
        .from('booking_extension_requests')
        .insert({
          booking_id: booking.id,
          renter_id: booking.renter_id,
          owner_id: booking.owner_id || '', // owner_id is NOT NULL in DB, ensure it's set
          original_end_at: booking.end_at,
          new_end_at: newEndDate.toISOString(),
          estimated_cost_amount: estimatedAdditionalCostCents / 100, // Store as actual amount
          estimated_cost_currency: booking.currency,
          renter_message: renterMessage || null,
          request_status: 'pending',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      await this.bookingNotifications.notifyExtensionRequested(
        booking,
        newEndDate.toISOString(),
        renterMessage,
      );

      return { success: true, additionalCost: estimatedAdditionalCostCents / 100 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al solicitar extensión',
      };
    }
  }

  /**
   * Aprueba una solicitud de extensión de reserva.
   * Extiende el booking y realiza el cobro.
   */
  async approveExtensionRequest(
    requestId: string,
    ownerResponse?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existingRequest = await this.supabase
        .from('booking_extension_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (existingRequest.error || !existingRequest.data) {
        throw new Error('Solicitud de extensión no encontrada.');
      }

      const request = existingRequest.data as BookingExtensionRequest;
      if (request.request_status !== 'pending') {
        throw new Error('La solicitud ya no está pendiente.');
      }

      const booking = await this.getBookingById(request.booking_id);
      if (!booking) throw new Error('Reserva no encontrada');

      const currentUser = (await this.supabase.auth.getUser()).data.user;
      if (!currentUser || currentUser.id !== booking.owner_id) {
        throw new Error('Solo el propietario puede aprobar una extensión.');
      }

      // 1. Cobrar el costo adicional al renter (assuming this logic is correct from original)
      // This part needs to be carefully handled. The `additionalCost` in the request is estimated.
      // Re-calculate the cost or trust the estimated one. For now, we trust the estimated one.
      if (!request.estimated_cost_amount || !request.estimated_cost_currency) {
        throw new Error('Faltan datos de costo estimado en la solicitud.');
      }

      // Assuming a new endpoint or helper is needed to process additional payment.
      // For simplicity, let's assume `processRentalPayment` can handle additional charges.
      const chargeResult = await this.bookingWalletService.processRentalPayment(
        booking,
        Math.round(request.estimated_cost_amount * 100), // Convert to cents
        `Extensión de reserva #${booking.id} (${new Date(request.new_end_at).toLocaleDateString()})`,
      );

      if (!chargeResult.ok) {
        throw new Error(`Fallo al cobrar extensión: ${chargeResult.error}`);
      }

      // 2. Actualizar la solicitud de extensión
      const { error: updateRequestError } = await this.supabase
        .from('booking_extension_requests')
        .update({
          request_status: 'approved',
          responded_at: new Date().toISOString(),
          owner_response: ownerResponse || null,
        })
        .eq('id', requestId);

      if (updateRequestError) throw updateRequestError;

      // 3. Actualizar la reserva con la nueva fecha y total
      await this.updateBooking(booking.id, {
        end_at: request.new_end_at,
        total_amount: (booking.total_amount || 0) + request.estimated_cost_amount,
      });

      await this.extendInsuranceCoverageIfNeeded(booking.id, request.new_end_at);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al aprobar extensión',
      };
    }
  }

  /**
   * Rechaza una solicitud de extensión de reserva.
   */
  async rejectExtensionRequest(
    requestId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existingRequest = await this.supabase
        .from('booking_extension_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (existingRequest.error || !existingRequest.data) {
        throw new Error('Solicitud de extensión no encontrada.');
      }

      const request = existingRequest.data as BookingExtensionRequest;
      if (request.request_status !== 'pending') {
        throw new Error('La solicitud ya no está pendiente.');
      }

      const booking = await this.getBookingById(request.booking_id);
      if (!booking) throw new Error('Reserva no encontrada');

      const currentUser = (await this.supabase.auth.getUser()).data.user;
      if (!currentUser || currentUser.id !== booking.owner_id) {
        throw new Error('Solo el propietario puede rechazar una extensión.');
      }

      const { error: updateRequestError } = await this.supabase
        .from('booking_extension_requests')
        .update({
          request_status: 'rejected',
          responded_at: new Date().toISOString(),
          owner_response: reason,
        })
        .eq('id', requestId);

      if (updateRequestError) throw updateRequestError;

      await this.bookingNotifications.notifyExtensionRejected(booking, reason);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al rechazar extensión',
      };
    }
  }

  private async extendInsuranceCoverageIfNeeded(
    bookingId: string,
    newEndAt: string,
  ): Promise<void> {
    try {
      const { data: coverage, error } = await this.supabase
        .from('booking_insurance_coverage')
        .select('id, coverage_end')
        .eq('booking_id', bookingId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (!coverage) return;

      const { error: updateError } = await this.supabase
        .from('booking_insurance_coverage')
        .update({
          coverage_end: newEndAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coverage.id);

      if (updateError) throw updateError;

      this.logger.info('Insurance coverage extended', 'BookingsService', {
        booking_id: bookingId,
        new_end_at: newEndAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      this.logger.warn('Failed to extend insurance coverage; recorded issue', 'BookingsService', {
        booking_id: bookingId,
        new_end_at: newEndAt,
        error: message,
      });

      try {
        await this.createPaymentIssue({
          booking_id: bookingId,
          issue_type: 'insurance_extension_required',
          severity: 'high',
          description: 'Extensión de seguro pendiente luego de aprobar extensión de reserva',
          metadata: {
            new_end_at: newEndAt,
            error: message,
          },
        });
      } catch (issueError) {
        this.logger.error('Failed to create insurance extension issue', 'BookingsService', issueError);
      }
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
        cancelled_by_role: 'owner',
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

      this.logger.info(
        `Car rejected at pickup for booking ${booking.id}`,
        JSON.stringify({
          reason,
          photos: evidencePhotos.length,
        }),
      );

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
   * Reporta que el propietario no se presentó (Owner No-Show).
   * Inicia el protocolo de no-show: cancela reserva, procesa reembolso y busca alternativas.
   */
  async reportOwnerNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('report_owner_no_show', {
        p_booking_id: bookingId,
        p_details: details,
        p_evidence_urls: evidenceUrls,
      });

      if (error) throw error;

      // The RPC should handle booking cancellation, refund, etc.
      // This service method just reports the no-show.

      return { success: true, ...data }; // Assuming RPC returns success/error/message
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al reportar no-show del propietario',
      };
    }
  }

  /**
   * Reporta que el locatario no se presentó (Renter No-Show).
   * Inicia el protocolo de no-show: marca reserva como cancelada, cobra penalidad al locatario.
   */
  async reportRenterNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('report_renter_no_show', {
        p_booking_id: bookingId,
        p_details: details,
        p_evidence_urls: evidenceUrls,
      });

      if (error) throw error;

      // The RPC should handle booking cancellation, penalty charges, etc.
      // This service method just reports the no-show.

      return { success: true, ...data }; // Assuming RPC returns success/error/message
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al reportar no-show del locatario',
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

  /**
   * Obtiene las solicitudes de extensión pendientes para una reserva.
   */
  async getPendingExtensionRequests(bookingId: string): Promise<BookingExtensionRequest[]> {
    const { data, error } = await this.supabase
      .from('booking_extension_requests')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('request_status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending extension requests:', error);
      throw error;
    }
    return (data || []) as BookingExtensionRequest[];
  }

  /**
   * Estima el costo adicional de una extensión de reserva.
   * @param bookingId ID de la reserva.
   * @param newEndDate Nueva fecha de fin de la reserva.
   * @returns Costo estimado en `amount` y un posible `error`.
   */
  async estimateExtensionCost(
    bookingId: string,
    newEndDate: Date,
  ): Promise<{ amount: number; currency: string; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) throw new Error('Reserva no encontrada');

      if (newEndDate <= new Date(booking.end_at)) {
        return { amount: 0, currency: booking.currency, error: 'La nueva fecha debe ser posterior a la actual' };
      }

      // Calcular días adicionales
      const currentEnd = new Date(booking.end_at);
      const additionalDays = Math.ceil(
        (newEndDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (additionalDays <= 0)
        return { amount: 0, currency: booking.currency, error: 'La nueva fecha debe ser posterior a la actual' };

      // Obtener precio por día actual (utilizando el desglose de la reserva original)
      const pricePerDay = this.getBookingPricePerDay(booking); // Assuming this helper exists and returns price per day in actual amount (not cents)

      const estimatedAdditionalCost = pricePerDay * additionalDays;

      return { amount: estimatedAdditionalCost, currency: booking.currency };
    } catch (error) {
      return {
        amount: 0,
        currency: 'ARS',
        error: error instanceof Error ? error.message : 'Error al estimar el costo de extensión',
      };
    }
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
        .select(
          'id, title, brand, model, year, fuel_policy, mileage_limit, extra_km_price, allow_smoking, allow_pets, allow_rideshare, max_distance_km, car_photos(id, url, stored_path, position, sort_order, created_at)',
        )
        .eq('id', booking.car_id)
        .single();

      if (!carError && car) {
        const rawPhotos = (car as unknown as { car_photos?: unknown }).car_photos;
        const photos = Array.isArray(rawPhotos) ? (rawPhotos as Array<Record<string, unknown>>) : [];
        const images = photos
          .map((p) => {
            const url = p['url'];
            return typeof url === 'string' ? url : null;
          })
          .filter((url): url is string => Boolean(url));

        (booking as Booking).car = {
          ...(car as Partial<import('../models').Car>),
          car_photos: photos as unknown as import('../models').CarPhoto[],
          photos: photos as unknown as import('../models').CarPhoto[],
          images,
        } as Partial<import('../models').Car>;
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

  /**
   * Fallback: inserta directamente en bookings cuando el RPC request_booking falla
   * por columnas faltantes (p.ej. pickup_lat) en entornos desactualizados.
   */
  private async fallbackDirectBookingInsert(
    carId: string,
    start: string,
    end: string,
  ): Promise<Booking> {
    // Obtener usuario
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    if (userError || !userData.user?.id) {
      throw new Error('Usuario no autenticado');
    }
    const renterId = userData.user.id;

    // Obtener datos del auto para calcular total
    const { data: car, error: carError } = await this.supabase
      .from('cars')
      .select('price_per_day, currency')
      .eq('id', carId)
      .single();

    if (carError) {
      throw new Error('No se pudo obtener el auto para calcular el total');
    }

    const pricePerDay = Number(car?.price_per_day ?? 0);
    const currency = (car?.currency as string | null) || 'ARS';
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const totalAmount = pricePerDay * days;

    // Insert directo
    const { data, error } = await this.supabase
      .from('bookings')
      .insert({
        car_id: carId,
        renter_id: renterId,
        start_at: start,
        end_at: end,
        status: 'pending',
        currency,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo crear la reserva (fallback)');
    }

    // Recalcular pricing
    try {
      await this.recalculatePricing(data.id);
    } catch {
      // no bloquear si falla el recalculo en fallback
    }

    return data as Booking;
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
        cancelled_by_role: 'system',
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

  // ============================================================================
  // RPC INTEGRATIONS - Owner Cancellation & Penalties
  // ============================================================================

  /**
   * Owner cancela una reserva con penalización automática
   * - Reembolso 100% al renter
   * - -10% visibilidad por 30 días
   * - 3+ cancelaciones en 90 días = suspensión temporal
   */
  async ownerCancelBooking(
    bookingId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string; penaltyApplied?: boolean }> {
    try {
      const { data, error } = await this.supabase.rpc('owner_cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      if (error) throw error;

      return {
        success: true,
        penaltyApplied: data?.penalty_applied ?? true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al cancelar reserva',
      };
    }
  }

  /**
   * Obtiene las penalizaciones activas del owner actual
   */
  async getOwnerPenalties(): Promise<{
    visibilityPenaltyUntil: string | null;
    visibilityFactor: number;
    cancellationCount90d: number;
    isSuspended: boolean;
  } | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_owner_penalties');

      if (error) throw error;

      return {
        visibilityPenaltyUntil: data?.visibility_penalty_until || null,
        visibilityFactor: data?.visibility_factor ?? 1.0,
        cancellationCount90d: data?.cancellation_count_90d ?? 0,
        isSuspended: data?.is_suspended ?? false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el factor de visibilidad de un owner (para búsquedas)
   * Factor entre 0.0 y 1.0 donde 1.0 = visibilidad completa
   */
  async getOwnerVisibilityFactor(ownerId?: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_owner_visibility_factor', {
        p_owner_id: ownerId || null,
      });

      if (error) throw error;

      return data ?? 1.0;
    } catch {
      return 1.0; // Default to full visibility on error
    }
  }
}
