import { Injectable, inject } from '@angular/core';
import { Booking, BookingExtensionRequest } from '@core/models';
import { getErrorMessage } from '@core/utils/type-guards';
import { BookingApprovalService } from '@core/services/bookings/booking-approval.service';
import { BookingCancellationService } from '@core/services/bookings/booking-cancellation.service';
import { BookingCompletionService } from '@core/services/bookings/booking-completion.service';
import { BookingDataLoaderService } from '@core/services/bookings/booking-data-loader.service';
import { BookingDisputeService } from '@core/services/bookings/booking-dispute.service';
import { BookingExtensionService } from '@core/services/bookings/booking-extension.service';
import { BookingInsuranceHelperService } from '@core/services/bookings/booking-insurance-helper.service';
import { BookingOwnerPenaltyService } from '@core/services/bookings/booking-owner-penalty.service';
import { BookingUtilsService } from '@core/services/bookings/booking-utils.service';
import { BookingValidationService } from '@core/services/bookings/booking-validation.service';
import { BookingWalletService } from '@core/services/bookings/booking-wallet.service';
import { CarOwnerNotificationsService } from '@core/services/cars/car-owner-notifications.service';
import { CarsService } from '@core/services/cars/cars.service';
import { BookingNotificationsService } from '@core/services/bookings/booking-notifications.service';
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
  private readonly logger = inject(LoggerService);
  private readonly tiktokEvents = inject(TikTokEventsService);

  // Specialized booking services
  private readonly bookingWalletService = inject(BookingWalletService);
  private readonly walletService = inject(WalletService);
  private readonly approvalService = inject(BookingApprovalService);
  private readonly completionService = inject(BookingCompletionService);
  private readonly validationService = inject(BookingValidationService);
  private readonly cancellationService = inject(BookingCancellationService);
  private readonly extensionService = inject(BookingExtensionService);
  private readonly disputeService = inject(BookingDisputeService);
  private readonly utilsService = inject(BookingUtilsService);

  // Extracted services
  private readonly insuranceHelper = inject(BookingInsuranceHelperService);
  private readonly ownerPenaltyService = inject(BookingOwnerPenaltyService);
  private readonly dataLoaderService = inject(BookingDataLoaderService);

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
    await this.insuranceHelper.activateInsuranceWithRetry(
      bookingId,
      [],
      this.updateBooking.bind(this),
    );

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
    await this.insuranceHelper.activateInsuranceWithRetry(
      bookingId,
      [],
      this.updateBooking.bind(this),
    );

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
    try {
      const { data, error } = await this.supabase.rpc('get_renter_verification_for_owner', {
        p_booking_id: bookingId,
      });

      if (error) {
        return null;
      }

      if (!data) return null;
      return Array.isArray(data)
        ? (data[0] as Record<string, unknown> | null)
        : (data as Record<string, unknown> | null);
    } catch {
      // Silently handle RPC errors (e.g., 400 when user is not the owner)
      return null;
    }
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
    await this.dataLoaderService.loadAllRelatedData(booking);

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
      await this.insuranceHelper.activateInsuranceWithRetry(
        result.booking_id,
        [],
        this.updateBooking.bind(this),
      );

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

  // Extension Operations (delegated to BookingExtensionService)
  async requestExtension(
    bookingId: string,
    newEndDate: Date,
    renterMessage?: string,
  ): Promise<{ success: boolean; error?: string; additionalCost?: number }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };
    return this.extensionService.requestExtension(booking, newEndDate, renterMessage);
  }

  async approveExtensionRequest(
    requestId: string,
    ownerResponse?: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Get request to find booking
    const { data: request, error } = await this.supabase
      .from('booking_extension_requests')
      .select('booking_id')
      .eq('id', requestId)
      .single();

    if (error || !request) {
      return { success: false, error: 'Solicitud de extensión no encontrada.' };
    }

    const booking = await this.getBookingById(request.booking_id);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };

    return this.extensionService.approveExtensionRequest(
      requestId,
      booking,
      ownerResponse,
      this.updateBooking.bind(this),
    );
  }

  async rejectExtensionRequest(
    requestId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Get request to find booking
    const { data: request, error } = await this.supabase
      .from('booking_extension_requests')
      .select('booking_id')
      .eq('id', requestId)
      .single();

    if (error || !request) {
      return { success: false, error: 'Solicitud de extensión no encontrada.' };
    }

    const booking = await this.getBookingById(request.booking_id);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };

    return this.extensionService.rejectExtensionRequest(requestId, booking, reason);
  }

  // Dispute Operations (delegated to BookingDisputeService)
  async rejectCarAtPickup(
    bookingId: string,
    reason: string,
    evidencePhotos: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };

    return this.disputeService.rejectCarAtPickup(
      booking,
      reason,
      evidencePhotos,
      this.updateBooking.bind(this),
    );
  }

  async processEarlyReturn(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };

    return this.disputeService.processEarlyReturn(booking, this.updateBooking.bind(this));
  }

  async reportOwnerNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    return this.disputeService.reportOwnerNoShow(bookingId, details, evidenceUrls);
  }

  async reportRenterNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    return this.disputeService.reportRenterNoShow(bookingId, details, evidenceUrls);
  }

  async createDispute(
    bookingId: string,
    reason: string,
    evidence?: string[],
  ): Promise<{ success: boolean; error?: string }> {
    return this.disputeService.createDispute(
      bookingId,
      reason,
      evidence,
      this.updateBooking.bind(this),
    );
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
    return this.extensionService.getPendingExtensionRequests(bookingId);
  }

  /**
   * Estima el costo adicional de una extensión de reserva.
   */
  async estimateExtensionCost(
    bookingId: string,
    newEndDate: Date,
  ): Promise<{ amount: number; currency: string; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      return { amount: 0, currency: 'ARS', error: 'Reserva no encontrada' };
    }
    return this.extensionService.estimateExtensionCost(booking, newEndDate);
  }

  // Insurance Operations (delegated to BookingInsuranceHelperService)
  async activateInsuranceCoverage(
    bookingId: string,
    addonIds: string[] = [],
  ): Promise<{ success: boolean; coverage_id?: string; error?: string }> {
    return this.insuranceHelper.activateInsuranceCoverage(bookingId, addonIds);
  }

  async getBookingInsuranceSummary(bookingId: string) {
    return this.insuranceHelper.getBookingInsuranceSummary(bookingId);
  }

  async calculateInsuranceDeposit(carId: string): Promise<number> {
    return this.insuranceHelper.calculateInsuranceDeposit(carId);
  }

  async hasOwnerInsurance(carId: string): Promise<boolean> {
    return this.insuranceHelper.hasOwnerInsurance(carId);
  }

  async getInsuranceCommissionRate(carId: string): Promise<number> {
    return this.insuranceHelper.getInsuranceCommissionRate(carId);
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
      Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)),
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
  // RPC INTEGRATIONS - Owner Cancellation & Penalties (delegated)
  // ============================================================================

  /**
   * Owner cancela una reserva con penalización automática
   */
  async ownerCancelBooking(
    bookingId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string; penaltyApplied?: boolean }> {
    return this.ownerPenaltyService.ownerCancelBooking(bookingId, reason);
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
    return this.ownerPenaltyService.getOwnerPenalties();
  }

  /**
   * Obtiene el factor de visibilidad de un owner (para búsquedas)
   */
  async getOwnerVisibilityFactor(ownerId?: string): Promise<number> {
    return this.ownerPenaltyService.getOwnerVisibilityFactor(ownerId);
  }

  // ============================================================================
  // PAYMENT ISSUES (delegated to BookingInsuranceHelperService)
  // ============================================================================

  /**
   * Create a payment issue record for manual review and background retry
   * Delegated to BookingInsuranceHelperService for consistency
   */
  async createPaymentIssue(issue: {
    booking_id: string;
    issue_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, unknown>;
    status?: 'pending_review' | 'in_progress' | 'resolved' | 'ignored';
  }): Promise<void> {
    return this.insuranceHelper.createPaymentIssue(issue);
  }
}
