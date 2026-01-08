import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import type { Booking, BookingStatus } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import { RealtimeConnectionService } from '@core/services/infrastructure/realtime-connection.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * BookingsStore - Centralized state management for bookings
 *
 * This store provides:
 * - Single source of truth for booking data
 * - Automatic cache invalidation (5-min TTL)
 * - Request deduplication to prevent parallel fetches
 * - Optimistic updates with rollback on error
 * - Real-time integration for live updates
 * - Computed values for common derived state
 *
 * Usage:
 * ```typescript
 * constructor(private bookingsStore = inject(BookingsStore)) {}
 *
 * ngOnInit() {
 *   this.bookingsStore.loadMyBookings();
 * }
 *
 * // In template:
 * {{ bookingsStore.currentBooking()?.status }}
 * {{ bookingsStore.activeBookings().length }}
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class BookingsStore {
  private readonly bookingsService = inject(BookingsService);
  private readonly bookingRealtime = inject(BookingRealtimeService);
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  // ==================== CORE STATE ====================

  /**
   * Current booking being viewed/edited (null if none selected)
   */
  readonly currentBooking = signal<Booking | null>(null);

  /**
   * User's bookings as renter
   */
  readonly myBookings = signal<Booking[]>([]);

  /**
   * User's bookings as owner
   */
  readonly ownerBookings = signal<Booking[]>([]);

  /**
   * Loading state for booking operations
   */
  readonly loading = signal(false);

  /**
   * Loading state for list operations
   */
  readonly loadingList = signal(false);

  /**
   * Error state for booking operations
   */
  readonly error = signal<string | null>(null);

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Cache timestamp for my bookings
   */
  private myBookingsCacheTimestamp = 0;

  /**
   * Cache timestamp for owner bookings
   */
  private ownerBookingsCacheTimestamp = 0;

  /**
   * Cache timestamp for current booking
   */
  private currentBookingCacheTimestamp = 0;

  /**
   * Cache duration in milliseconds (5 minutes)
   */
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000;

  /**
   * Request deduplication: pending fetch for my bookings
   */
  private pendingMyBookingsFetch: Promise<{ bookings: Booking[]; total: number }> | null = null;

  /**
   * Request deduplication: pending fetch for owner bookings
   */
  private pendingOwnerBookingsFetch: Promise<{ bookings: Booking[]; total: number }> | null = null;

  /**
   * Request deduplication: pending fetch for current booking
   */
  private pendingCurrentBookingFetch: Promise<Booking | null> | null = null;

  // ==================== PAGINATION STATE ====================

  /**
   * Total count for my bookings
   */
  readonly myBookingsTotal = signal(0);

  /**
   * Total count for owner bookings
   */
  readonly ownerBookingsTotal = signal(0);

  // ==================== COMPUTED VALUES ====================

  /**
   * Active bookings (confirmed or in progress)
   */
  readonly activeBookings = computed(() =>
    this.myBookings().filter((b) => ['confirmed', 'in_progress'].includes(b.status)),
  );

  /**
   * Pending bookings (awaiting payment or approval)
   */
  readonly pendingBookings = computed(() =>
    this.myBookings().filter((b) =>
      ['pending', 'pending_payment', 'pending_approval'].includes(b.status),
    ),
  );

  /**
   * Completed bookings
   */
  readonly completedBookings = computed(() =>
    this.myBookings().filter((b) => b.status === 'completed'),
  );

  /**
   * Owner's pending approval count
   */
  readonly pendingApprovalCount = computed(
    () => this.ownerBookings().filter((b) => b.status === 'pending').length,
  );

  /**
   * Owner's active rentals count
   */
  readonly ownerActiveCount = computed(
    () =>
      this.ownerBookings().filter((b) => ['confirmed', 'in_progress'].includes(b.status)).length,
  );

  /**
   * Is booking loaded
   */
  readonly isCurrentBookingLoaded = computed(() => this.currentBooking() !== null);

  /**
   * Is loading any data
   */
  readonly isLoading = computed(() => this.loading() || this.loadingList());

  /**
   * Has error
   */
  readonly hasError = computed(() => this.error() !== null);

  /**
   * Realtime connection status (from RealtimeConnectionService)
   */
  readonly connectionStatus = this.realtimeConnection.connectionStatus;

  // ==================== LOAD METHODS ====================

  /**
   * Load a single booking by ID (with cache check)
   */
  async loadBooking(bookingId: string, force = false): Promise<Booking | null> {
    // Check cache if not forcing refresh
    const currentBooking = this.currentBooking();
    if (!force && currentBooking?.id === bookingId && this.isCurrentBookingCacheValid()) {
      return currentBooking;
    }

    // Request deduplication
    if (this.pendingCurrentBookingFetch) {
      return this.pendingCurrentBookingFetch;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      this.pendingCurrentBookingFetch = this.bookingsService.getBookingById(bookingId);
      const booking = await this.pendingCurrentBookingFetch;

      this.currentBooking.set(booking);
      this.currentBookingCacheTimestamp = Date.now();

      return booking;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No pudimos cargar la reserva.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.loading.set(false);
      this.pendingCurrentBookingFetch = null;
    }
  }

  /**
   * Load user's bookings as renter (with cache check and pagination)
   */
  async loadMyBookings(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    force?: boolean;
  }): Promise<void> {
    const force = options?.force ?? false;

    // Check cache if not forcing refresh and no pagination
    if (
      !force &&
      !options?.offset &&
      this.isMyBookingsCacheValid() &&
      this.myBookings().length > 0
    ) {
      return;
    }

    // Request deduplication (only for initial load without offset)
    if (!options?.offset && this.pendingMyBookingsFetch) {
      await this.pendingMyBookingsFetch;
      return;
    }

    this.loadingList.set(true);
    this.error.set(null);

    try {
      const fetchPromise = this.bookingsService.getMyBookings({
        limit: options?.limit,
        offset: options?.offset,
        status: options?.status,
      });

      // Only dedupe initial loads
      if (!options?.offset) {
        this.pendingMyBookingsFetch = fetchPromise;
      }

      const { bookings, total } = await fetchPromise;

      // Append for pagination, replace for initial/refresh
      if (options?.offset) {
        this.myBookings.update((current) => [...current, ...bookings]);
      } else {
        this.myBookings.set(bookings);
        this.myBookingsCacheTimestamp = Date.now();
      }

      this.myBookingsTotal.set(total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No pudimos cargar tus reservas.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.loadingList.set(false);
      this.pendingMyBookingsFetch = null;
    }
  }

  /**
   * Load user's bookings as owner (with cache check and pagination)
   */
  async loadOwnerBookings(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    force?: boolean;
  }): Promise<void> {
    const force = options?.force ?? false;

    // Check cache if not forcing refresh and no pagination
    if (
      !force &&
      !options?.offset &&
      this.isOwnerBookingsCacheValid() &&
      this.ownerBookings().length > 0
    ) {
      return;
    }

    // Request deduplication (only for initial load without offset)
    if (!options?.offset && this.pendingOwnerBookingsFetch) {
      await this.pendingOwnerBookingsFetch;
      return;
    }

    this.loadingList.set(true);
    this.error.set(null);

    try {
      const fetchPromise = this.bookingsService.getOwnerBookings({
        limit: options?.limit,
        offset: options?.offset,
        status: options?.status,
      });

      // Only dedupe initial loads
      if (!options?.offset) {
        this.pendingOwnerBookingsFetch = fetchPromise;
      }

      const { bookings, total } = await fetchPromise;

      // Append for pagination, replace for initial/refresh
      if (options?.offset) {
        this.ownerBookings.update((current) => [...current, ...bookings]);
      } else {
        this.ownerBookings.set(bookings);
        this.ownerBookingsCacheTimestamp = Date.now();
      }

      this.ownerBookingsTotal.set(total);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'No pudimos cargar tus reservas de propietario.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.loadingList.set(false);
      this.pendingOwnerBookingsFetch = null;
    }
  }

  // ==================== OPTIMISTIC UPDATE METHODS ====================

  /**
   * Update current booking with optimistic update and rollback on error
   */
  async updateCurrentBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking> {
    this.loading.set(true);
    this.error.set(null);

    // Store current state for rollback
    const previousBooking = this.currentBooking();
    const previousMyBookings = this.myBookings();
    const previousOwnerBookings = this.ownerBookings();

    // Optimistic update
    if (previousBooking?.id === bookingId) {
      this.currentBooking.set({ ...previousBooking, ...updates } as Booking);
    }

    // Update in lists
    this.myBookings.update((bookings) =>
      bookings.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)),
    );
    this.ownerBookings.update((bookings) =>
      bookings.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)),
    );

    try {
      // Note: BookingsService doesn't have a direct updateBooking method exposed
      // This would need to call the appropriate RPC or delegated service
      // For now, we reload after optimistic update
      const updated = await this.bookingsService.getBookingById(bookingId);

      if (updated) {
        this.currentBooking.set(updated);
        this.currentBookingCacheTimestamp = Date.now();

        // Sync lists
        this.myBookings.update((bookings) =>
          bookings.map((b) => (b.id === bookingId ? updated : b)),
        );
        this.ownerBookings.update((bookings) =>
          bookings.map((b) => (b.id === bookingId ? updated : b)),
        );
      }

      return updated || ({ ...previousBooking, ...updates } as Booking);
    } catch (err) {
      // Rollback on error
      this.currentBooking.set(previousBooking);
      this.myBookings.set(previousMyBookings);
      this.ownerBookings.set(previousOwnerBookings);

      const errorMessage = err instanceof Error ? err.message : 'No pudimos actualizar la reserva.';
      this.error.set(errorMessage);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update booking status with optimistic update
   */
  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
    await this.updateCurrentBooking(bookingId, { status });
  }

  // ==================== REALTIME INTEGRATION ====================

  /**
   * Subscribe to realtime updates for a booking
   */
  subscribeToBooking(bookingId: string): void {
    this.bookingRealtime.subscribeToBooking(bookingId, {
      onBookingChange: (booking) => {
        this.logger.debug('[BookingsStore] Realtime: Booking updated', booking.status);
        this.currentBooking.set(booking);
        this.currentBookingCacheTimestamp = Date.now();

        // Sync with lists
        this.myBookings.update((bookings) =>
          bookings.map((b) => (b.id === bookingId ? booking : b)),
        );
        this.ownerBookings.update((bookings) =>
          bookings.map((b) => (b.id === bookingId ? booking : b)),
        );
      },
      onConnectionChange: (status) => {
        this.logger.debug('[BookingsStore] Realtime connection:', status);
      },
    });
  }

  /**
   * Subscribe to user's bookings list updates
   */
  subscribeToUserBookings(role: 'owner' | 'renter'): void {
    const userId = this.authService.userId();
    if (!userId) return;

    this.bookingRealtime.subscribeToUserBookings(userId, role, {
      onBookingsChange: () => {
        this.logger.debug(`[BookingsStore] Realtime: ${role} bookings changed`);
        // Reload the appropriate list
        if (role === 'renter') {
          void this.loadMyBookings({ force: true });
        } else {
          void this.loadOwnerBookings({ force: true });
        }
      },
      onConnectionChange: (status) => {
        this.logger.debug(`[BookingsStore] Realtime ${role} connection:`, status);
      },
    });
  }

  /**
   * Unsubscribe from all realtime channels
   */
  unsubscribeAll(): void {
    this.bookingRealtime.unsubscribeAll();
    this.bookingRealtime.unsubscribeUserBookings();
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Invalidate all caches and force reload
   */
  invalidateCache(): void {
    this.myBookingsCacheTimestamp = 0;
    this.ownerBookingsCacheTimestamp = 0;
    this.currentBookingCacheTimestamp = 0;
  }

  /**
   * Refresh current booking
   */
  async refreshCurrentBooking(): Promise<Booking | null> {
    const bookingId = this.currentBooking()?.id;
    if (!bookingId) return null;
    return this.loadBooking(bookingId, true);
  }

  /**
   * Clear all booking state (useful for logout)
   */
  clear(): void {
    this.currentBooking.set(null);
    this.myBookings.set([]);
    this.ownerBookings.set([]);
    this.myBookingsTotal.set(0);
    this.ownerBookingsTotal.set(0);
    this.error.set(null);
    this.invalidateCache();
    this.unsubscribeAll();
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Check if my bookings cache is still valid
   */
  private isMyBookingsCacheValid(): boolean {
    return Date.now() - this.myBookingsCacheTimestamp < this.CACHE_DURATION_MS;
  }

  /**
   * Check if owner bookings cache is still valid
   */
  private isOwnerBookingsCacheValid(): boolean {
    return Date.now() - this.ownerBookingsCacheTimestamp < this.CACHE_DURATION_MS;
  }

  /**
   * Check if current booking cache is still valid
   */
  private isCurrentBookingCacheValid(): boolean {
    return Date.now() - this.currentBookingCacheTimestamp < this.CACHE_DURATION_MS;
  }
}
