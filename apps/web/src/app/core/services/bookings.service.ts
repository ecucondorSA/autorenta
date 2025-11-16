import { Injectable, inject, signal, computed } from '@angular/core';
import { Booking } from '../models';
import { getErrorMessage } from '../utils/type-guards';
import { injectSupabase } from './supabase-client.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';
import { LoggerService } from './logger.service';
import { BookingWalletService } from './booking-wallet.service';
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
  private readonly walletService = inject(BookingWalletService);
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
  // SIGNAL-BASED STATE MANAGEMENT
  // ============================================================================

  // Cache for user's bookings (as renter)
  readonly myBookings = signal<Booking[]>([]);
  readonly myBookingsLoading = signal(false);
  readonly myBookingsError = signal<string | null>(null);

  // Cache for owner's bookings (as owner)
  readonly ownerBookings = signal<Booking[]>([]);
  readonly ownerBookingsLoading = signal(false);
  readonly ownerBookingsError = signal<string | null>(null);

  // Cache for individual booking details (by ID)
  private readonly bookingCacheMap = signal<Map<string, Booking>>(new Map());
  readonly bookingCache = computed(() => this.bookingCacheMap());

  // Cache for pending approvals
  readonly pendingApprovals = signal<Record<string, unknown>[]>([]);
  readonly pendingApprovalsLoading = signal(false);

  // Computed values
  readonly myBookingsCount = computed(() => this.myBookings().length);
  readonly ownerBookingsCount = computed(() => this.ownerBookings().length);
  readonly pendingApprovalsCount = computed(() => this.pendingApprovals().length);

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

    // Activate insurance coverage automatically
    try {
      await this.insuranceService.activateCoverage({
        booking_id: bookingId,
        addon_ids: [],
      });
    } catch (insuranceError) {
      this.logger.error(
        'Insurance activation failed',
        'BookingsService',
        insuranceError instanceof Error
          ? insuranceError
          : new Error(getErrorMessage(insuranceError)),
      );
      // Don't block booking if insurance fails
    }

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

    // Activate insurance coverage automatically
    try {
      await this.insuranceService.activateCoverage({
        booking_id: bookingId,
        addon_ids: [],
      });
    } catch (insuranceError) {
      this.logger.error(
        'Insurance activation failed',
        'BookingsService',
        insuranceError instanceof Error
          ? insuranceError
          : new Error(getErrorMessage(insuranceError)),
      );
      // Don't block booking if insurance fails
    }

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
   */
  async getMyBookings(options: { forceRefresh?: boolean } = {}): Promise<Booking[]> {
    // Return cached data if available and not forcing refresh
    if (!options.forceRefresh && this.myBookings().length > 0) {
      return this.myBookings();
    }

    this.myBookingsLoading.set(true);
    this.myBookingsError.set(null);

    try {
      const { data, error } = await this.supabase
        .from('my_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bookings = (data ?? []) as Booking[];
      await this.updateAppBadge(bookings);

      // Update cache
      this.myBookings.set(bookings);
      return bookings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cargar mis reservas';
      this.myBookingsError.set(errorMessage);
      throw error;
    } finally {
      this.myBookingsLoading.set(false);
    }
  }

  /**
   * Get bookings for cars owned by current user
   */
  async getOwnerBookings(options: { forceRefresh?: boolean } = {}): Promise<Booking[]> {
    // Return cached data if available and not forcing refresh
    if (!options.forceRefresh && this.ownerBookings().length > 0) {
      return this.ownerBookings();
    }

    this.ownerBookingsLoading.set(true);
    this.ownerBookingsError.set(null);

    try {
      const { data, error } = await this.supabase
        .from('owner_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bookings = (data ?? []) as Booking[];

      // Update cache
      this.ownerBookings.set(bookings);
      return bookings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cargar reservas del propietario';
      this.ownerBookingsError.set(errorMessage);
      throw error;
    } finally {
      this.ownerBookingsLoading.set(false);
    }
  }

  /**
   * Get booking by ID with full details
   */
  async getBookingById(
    bookingId: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<Booking | null> {
    // Check cache first
    if (!options.forceRefresh) {
      const cached = this.bookingCacheMap().get(bookingId);
      if (cached) {
        return cached;
      }
    }

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

    // Load car details
    if (booking?.car_id) {
      await this.loadCarDetails(booking);
    }

    // Load insurance coverage
    if (booking?.insurance_coverage_id) {
      await this.loadInsuranceCoverage(booking);
    }

    // Update cache
    this.bookingCacheMap.update((cache) => {
      const newCache = new Map(cache);
      newCache.set(bookingId, booking);
      return newCache;
    });

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

    const result = await this.walletService.chargeRentalFromWallet(
      booking,
      amountCents,
      description,
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

    return this.walletService.processRentalPayment(booking, amountCents, description);
  }

  async lockSecurityDeposit(
    bookingId: string,
    depositAmountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; transaction_id?: string; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.walletService.lockSecurityDeposit(
      booking,
      depositAmountCents,
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

    const result = await this.walletService.releaseSecurityDeposit(booking, description);
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

    const result = await this.walletService.deductFromSecurityDeposit(
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
}
