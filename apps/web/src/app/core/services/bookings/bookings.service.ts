import { Injectable, inject } from '@angular/core';
import { Booking, BookingExtensionRequest } from '@core/models';
import { ProfileService } from '@core/services/auth/profile.service';
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
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { PwaService } from '@core/services/infrastructure/pwa.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';
import { getErrorMessage } from '@core/utils/type-guards';
import type { BookingLocationData } from '@features/bookings/components/booking-location-form/booking-location-form.component';

// Validation Regex for UUIDs
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Extended types for internal use
type BookingWithMetadata = Booking & {
  car?: { title?: string | null } | null;
  price_per_day?: number | null;
};

type OperationResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * **BookingsService (Facade)**
 *
 * Central entry point for all booking-related operations.
 * Orchestrates specialized services and handles cross-cutting concerns (logging, analytics, notifications).
 *
 * @architecture
 * - **Facade Pattern:** Delegates complex logic to specialized services (Wallet, Approval, Completion).
 * - **Strict Typing:** No `any`. Explicit return types.
 * - **Security:** No frontend business logic fallbacks. Relies on backend RPCs.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  // Infrastructure
  private readonly supabase = injectSupabase();
  private readonly pwaService = inject(PwaService);
  private readonly logger = inject(LoggerService);
  private readonly tiktokEvents = inject(TikTokEventsService);

  // Domain Services (Delegates)
  private readonly bookingWalletService = inject(BookingWalletService);
  private readonly approvalService = inject(BookingApprovalService);
  private readonly completionService = inject(BookingCompletionService);
  private readonly validationService = inject(BookingValidationService);
  private readonly cancellationService = inject(BookingCancellationService);
  private readonly extensionService = inject(BookingExtensionService);
  private readonly disputeService = inject(BookingDisputeService);
  private readonly utilsService = inject(BookingUtilsService);
  private readonly insuranceHelper = inject(BookingInsuranceHelperService);
  private readonly ownerPenaltyService = inject(BookingOwnerPenaltyService);
  private readonly dataLoaderService = inject(BookingDataLoaderService);

  // Notification & Data Services
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);
  private readonly profileService = inject(ProfileService);

  // ============================================================================
  // 1. CORE CRUD OPERATIONS (Creation & Retrieval)
  // ============================================================================

  /**
   * Creates a new booking request via RPC.
   * Handles insurance activation and notifications as side effects.
   *
   * @param carId - The ID of the car to book
   * @param start - ISO string of start date
   * @param end - ISO string of end date
   * @throws Error if RPC fails or booking ID is missing
   */
  async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
    try {
      // 1. Call Backend RPC
      const { data, error } = await this.supabase.rpc('request_booking', {
        p_car_id: carId,
        p_start: start,
        p_end: end,
      });

      if (error) throw error;

      // 2. Validate Response
      const bookingId = this.utilsService.extractBookingId(data);
      if (!bookingId) {
        throw new Error('RPC request_booking returned success but no valid booking ID.');
      }

      // 3. Side Effect: Activate Insurance (Critical)
      await this.insuranceHelper.activateInsuranceWithRetry(
        bookingId,
        [],
        this.updateBooking.bind(this)
      );

      // 4. Initialize Booking Object
      // Use returned data as base, then enrich
      let finalBooking: Booking = { ...(data as unknown as Booking), id: bookingId };

      // 5. Post-Creation Enrichment (Non-blocking for user, but logged)
      try {
        await this.recalculatePricing(bookingId);
        const updated = await this.getBookingById(bookingId);
        if (updated) {
          finalBooking = updated;
        }
      } catch (enrichError) {
        this.logger.warn(
          'Booking created but enrichment failed',
          'BookingsService',
          enrichError instanceof Error ? enrichError : new Error(String(enrichError))
        );
      }

      // 6. Analytics & Notifications (Fire-and-forget)
      this.trackBookingCreation(finalBooking);
      void this.notifyOwnerOfNewBooking(finalBooking);

      return finalBooking;
    } catch (error) {
      this.handleError('requestBooking', error, { carId, start, end });
      throw error; // Re-throw to let caller handle UI feedback
    }
  }

  /**
   * Creates a new booking with specific delivery/location data.
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
    }
  ): Promise<Booking> {
    try {
      const { data, error } = await this.supabase.rpc('request_booking', {
        p_car_id: carId,
        p_start: start,
        p_end: end,
        p_pickup_lat: locationData.pickupLat,
        p_pickup_lng: locationData.pickupLng,
        p_dropoff_lat: locationData.dropoffLat,
        p_dropoff_lng: locationData.dropoffLng,
        p_delivery_required: locationData.deliveryRequired,
      });

      if (error) throw error;

      const bookingId = this.utilsService.extractBookingId(data);
      if (!bookingId) {
        throw new Error('RPC request_booking did not return a valid ID.');
      }

      // Side Effects
      await this.insuranceHelper.activateInsuranceWithRetry(
        bookingId,
        [],
        this.updateBooking.bind(this)
      );

      let finalBooking: Booking = { ...(data as unknown as Booking), id: bookingId };

      // Enrichment
      try {
        await this.recalculatePricing(bookingId);
        const updated = await this.getBookingById(bookingId);
        if (updated) finalBooking = updated;
      } catch (err) {
        this.logger.warn('Enrichment failed', 'BookingsService', err);
      }

      // Analytics
      this.trackBookingCreation(finalBooking);

      return finalBooking;
    } catch (error) {
      this.handleError('requestBookingWithLocation', error, { carId });
      throw error;
    }
  }

  /**
   * Fetches full details for a booking by ID.
   * Loads relationships (car, insurance) in parallel.
   */
  async getBookingById(bookingId: string): Promise<Booking | null> {
    if (!UUID_REGEX.test(bookingId)) {
      this.logger.warn(`Invalid UUID format for bookingId: ${bookingId}`);
      return null;
    }

    try {
      // Try fetching from both views (renter vs owner)
      const booking =
        (await this.fetchBookingFromView('my_bookings', bookingId)) ??
        (await this.fetchBookingFromView('owner_bookings', bookingId));

      if (!booking) return null;

      // Parallel data loading
      await this.dataLoaderService.loadAllRelatedData(booking);

      return booking;
    } catch (error) {
      this.handleError('getBookingById', error, { bookingId });
      return null;
    }
  }

  /**
   * Retrieves renter bookings with pagination.
   */
  async getMyBookings(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ bookings: Booking[]; total: number }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let query = this.supabase
      .from('my_bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const bookings = (data ?? []) as Booking[];
    void this.updateAppBadge(bookings);

    return { bookings, total: count ?? 0 };
  }

  /**
   * Retrieves owner bookings with pagination.
   */
  async getOwnerBookings(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ bookings: Booking[]; total: number }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let query = this.supabase
      .from('owner_bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return { bookings: (data ?? []) as Booking[], total: count ?? 0 };
  }

  // ============================================================================
  // 2. STATE MUTATIONS (Updates & Transitions)
  // ============================================================================

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

  async markAsPaid(bookingId: string, paymentIntentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;

    // Track purchase event
    const booking = await this.getBookingById(bookingId);
    if (booking) {
      void this.trackBookingPurchase(booking);
    }
  }

  async recalculatePricing(bookingId: string): Promise<void> {
    const { error } = await this.supabase.rpc('pricing_recalculate', {
      p_booking_id: bookingId,
    });
    if (error) throw error;
  }

  // ============================================================================
  // 3. DELEGATED OPERATIONS (Service Facade Implementation)
  // ============================================================================

  // --- Wallet & Payments ---

  async chargeRentalFromWallet(
    bookingId: string,
    amountCents: number
  ): Promise<OperationResult> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.chargeRentalFromWallet(booking, amountCents);
    
    if (result.ok) {
      await this.updateBooking(bookingId, {
        status: 'completed',
        wallet_status: 'charged',
        paid_at: new Date().toISOString(),
      });
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  async lockSecurityDeposit(
    bookingId: string,
    depositAmountCents: number,
    description?: string
  ): Promise<OperationResult<{ transactionId?: string }>> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.lockSecurityDeposit(
      booking,
      depositAmountCents,
      'wallet',
      description
    );

    if (result.ok) {
      await this.updateBooking(bookingId, {
        wallet_status: 'locked',
        wallet_lock_transaction_id: result.transaction_id,
      });
      return { success: true, data: { transactionId: result.transaction_id } };
    }
    return { success: false, error: result.error };
  }

  async releaseSecurityDeposit(
    bookingId: string,
    description?: string
  ): Promise<OperationResult> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const result = await this.bookingWalletService.releaseSecurityDeposit(booking, description);
    
    if (result.ok) {
      await this.updateBooking(bookingId, { wallet_status: 'refunded' });
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  // --- Approvals & Workflow ---

  async approveBooking(bookingId: string): Promise<OperationResult> {
    return this.approvalService.approveBooking(bookingId);
  }

  async rejectBooking(bookingId: string, reason?: string): Promise<OperationResult> {
    return this.approvalService.rejectBooking(bookingId, reason);
  }

  async startRental(bookingId: string): Promise<OperationResult> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const { data, error } = await this.supabase.rpc('booking_v2_start_rental', {
        p_booking_id: bookingId,
        p_renter_id: user.user.id,
      });

      if (error) throw error;
      if (data && !data.success) {
        return { success: false, error: data.error || 'Error al iniciar renta' };
      }
      return { success: true, message: data?.message };
    } catch (err) {
      this.logger.error('startRental RPC failed', 'BookingsService', err);
      return { success: false, error: getErrorMessage(err) };
    }
  }

  // --- Completion & Disputes ---

  async completeBookingClean(bookingId: string): Promise<OperationResult> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    return this.completionService.completeBookingClean(booking, this.updateBooking.bind(this));
  }

  async completeBookingWithDamages(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
    claimSeverity: number = 1
  ): Promise<OperationResult> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const result = await this.completionService.completeBookingWithDamages(
      booking,
      damageAmountCents,
      damageDescription,
      claimSeverity,
      this.updateBooking.bind(this)
    );

    return {
      success: result.success,
      error: result.error,
      data: undefined // completionService returns a slightly different shape
    };
  }

  // --- Cancellations ---

  async cancelBooking(bookingId: string, force: boolean = false): Promise<OperationResult> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };
    return this.cancellationService.cancelBooking(booking, force);
  }

  async ownerCancelBooking(
    bookingId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string; penaltyApplied?: boolean }> {
    return this.ownerPenaltyService.ownerCancelBooking(bookingId, reason);
  }

  // --- Extensions ---

  async requestExtension(
    bookingId: string,
    newEndDate: Date,
    renterMessage?: string
  ): Promise<{ success: boolean; error?: string; additionalCost?: number }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };
    return this.extensionService.requestExtension(booking, newEndDate, renterMessage);
  }

  async approveExtensionRequest(requestId: string, ownerResponse?: string): Promise<OperationResult> {
    const booking = await this.getBookingByExtensionRequestId(requestId);
    if (!booking) return { success: false, error: 'Solicitud o reserva no encontrada' };

    return this.extensionService.approveExtensionRequest(
      requestId,
      booking,
      ownerResponse,
      this.updateBooking.bind(this)
    );
  }

  async rejectExtensionRequest(requestId: string, reason: string): Promise<OperationResult> {
    const booking = await this.getBookingByExtensionRequestId(requestId);
    if (!booking) return { success: false, error: 'Solicitud o reserva no encontrada' };

    return this.extensionService.rejectExtensionRequest(requestId, booking, reason);
  }

  async getPendingExtensionRequests(bookingId: string): Promise<BookingExtensionRequest[]> {
    return this.extensionService.getPendingExtensionRequests(bookingId);
  }

  // ============================================================================
  // 4. UTILITIES & HELPERS
  // ============================================================================

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
        return { success: false, error: 'No se pudo obtener información del propietario' };
      }

      return {
        success: true,
        email: data.email,
        phone: data.phone || undefined,
        name: data.full_name || undefined,
      };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  }

  private async fetchBookingFromView(
    viewName: 'my_bookings' | 'owner_bookings',
    bookingId: string
  ): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from(viewName)
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error fetching booking from ${viewName}`, 'BookingsService', error);
      throw error;
    }

    return data as Booking;
  }

  private async getBookingByExtensionRequestId(requestId: string): Promise<Booking | null> {
    const { data: request } = await this.supabase
      .from('booking_extension_requests')
      .select('booking_id')
      .eq('id', requestId)
      .single();

    if (!request?.booking_id) return null;
    return this.getBookingById(request.booking_id);
  }

  private async updateAppBadge(bookings: Booking[]): Promise<void> {
    const pendingCount = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed'
    ).length;

    if (pendingCount > 0) {
      await this.pwaService.setAppBadge(pendingCount);
    } else {
      await this.pwaService.clearAppBadge();
    }
  }

  private handleError(method: string, error: unknown, context: Record<string, unknown> = {}): void {
    const message = getErrorMessage(error);
    this.logger.error(`[BookingsService] ${method} failed`, 'BookingsService', {
      error,
      message,
      context,
    });
  }

  // --- Analytics Helpers ---

  private trackBookingCreation(booking: BookingWithMetadata): void {
    const name = this.getBookingCarTitle(booking);
    void this.tiktokEvents.trackPlaceAnOrder({
      contentId: booking.car_id,
      contentName: name,
      value: booking.total_amount || 0,
      currency: booking.currency || 'USD',
    });
  }

  private trackBookingPurchase(booking: BookingWithMetadata): void {
    const name = this.getBookingCarTitle(booking);
    void this.tiktokEvents.trackPurchase({
      contentId: booking.car_id,
      contentName: name,
      value: booking.total_amount || 0,
      currency: booking.currency || 'USD',
    });
  }

  private getBookingCarTitle(booking: BookingWithMetadata): string {
    const fallbackTitle = booking.car?.title?.trim();
    return booking.car_title || fallbackTitle || 'Auto';
  }

  private getBookingPricePerDay(booking: BookingWithMetadata): number {
    return typeof booking.price_per_day === 'number' ? (booking.price_per_day ?? 0) : 0;
  }

  private async notifyOwnerOfNewBooking(booking: Booking): Promise<void> {
    try {
      if (!booking.owner_id || !booking.car_id) return;

      const [car, renter] = await Promise.all([
        this.carsService.getCarById(booking.car_id),
        this.profileService.getProfileById(booking.user_id || booking.renter_id || ''),
      ]);

      if (car && renter) {
        this.carOwnerNotifications.notifyNewBookingRequest(
          renter.full_name || 'Un usuario',
          car.title || 'tu auto',
          this.getBookingPricePerDay(booking),
          `/bookings/${booking.id}`
        );
      }
    } catch (err) {
      this.logger.warn('Failed to notify owner', 'BookingsService', err);
    }
  }

  // ============================================================================
  // 5. MISSING METHODS RESTORATION (Delegated)
  // ============================================================================

  async createBookingWithValidation(
    carId: string,
    startDate: string,
    endDate: string,
    locationDataOrCallback?:
      | BookingLocationData
      | ((carId: string, start: string, end: string) => Promise<Booking>),
  ): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    canWaitlist?: boolean;
  }> {
    let callback: (carId: string, start: string, end: string) => Promise<Booking>;

    if (locationDataOrCallback && typeof locationDataOrCallback === 'function') {
      callback = locationDataOrCallback;
    } else {
      const locationData = locationDataOrCallback as BookingLocationData | undefined;
      if (locationData) {
        callback = (cid, s, e) =>
          this.requestBookingWithLocation(cid, s, e, {
            pickupLat: locationData.pickupLat,
            pickupLng: locationData.pickupLng,
            dropoffLat: locationData.dropoffLat,
            dropoffLng: locationData.dropoffLng,
            deliveryRequired: locationData.deliveryRequired,
          });
      } else {
        callback = this.requestBooking.bind(this);
      }
    }

    return this.validationService.createBookingWithValidation(carId, startDate, endDate, callback);
  }

  async getPendingApprovals(): Promise<Record<string, unknown>[]> {
    return this.approvalService.getPendingApprovals();
  }

  isExpired(booking: Booking): boolean {
    return this.utilsService.isExpired(booking);
  }

  getTimeUntilExpiration(booking: Booking): number | null {
    return this.utilsService.getTimeUntilExpiration(booking);
  }

  formatTimeRemaining(milliseconds: number): string {
    return this.utilsService.formatTimeRemaining(milliseconds);
  }

  async getRenterVerificationForOwner(bookingId: string): Promise<Record<string, unknown> | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_renter_verification_for_owner', {
        p_booking_id: bookingId,
      });

      if (error) return null;
      if (!data) return null;
      return Array.isArray(data) ? (data[0] as Record<string, unknown>) : (data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async getOwnerPenalties(): Promise<{
    visibilityPenaltyUntil: string | null;
    visibilityFactor: number;
    cancellationCount90d: number;
    isSuspended: boolean;
  } | null> {
    return this.ownerPenaltyService.getOwnerPenalties();
  }

  async createBookingAtomic(params: {
    carId: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    currency: string;
    paymentMode: string;
    riskSnapshot: Record<string, unknown>;
    [key: string]: unknown;
  }): Promise<{
    success: boolean;
    bookingId?: string;
    riskSnapshotId?: string;
    error?: string;
  }> {
    try {
      const booking = await this.requestBooking(params.carId, params.startDate, params.endDate);
      return {
        success: true,
        bookingId: booking.id,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  async reportOwnerNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = []
  ): Promise<{ success: boolean; error?: string }> {
    return this.disputeService.reportOwnerNoShow(bookingId, details, evidenceUrls);
  }

  async reportRenterNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = []
  ): Promise<{ success: boolean; error?: string }> {
    return this.disputeService.reportRenterNoShow(bookingId, details, evidenceUrls);
  }
}
