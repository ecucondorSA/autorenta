import { Injectable, OnDestroy, inject } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  RealtimeConnectionService,
  ConnectionStatus,
} from '@core/services/infrastructure/realtime-connection.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import type { Booking } from '@core/models';
import { validateBookingPayload } from '@core/utils/booking-validators';
import type { BookingConfirmationRow } from './booking-ops.service';

/**
 * Handlers for realtime booking updates (single booking)
 */
export interface BookingRealtimeHandlers {
  /** Called when the booking record changes (status, flags, metadata) */
  onBookingChange?: (booking: Booking) => void;
  /** Called when confirmation record changes (bilateral confirmations) */
  onConfirmationChange?: (confirmation: BookingConfirmationRow) => void;
  /** Called when inspections change (check-in/check-out) */
  onInspectionChange?: () => void;
  /** Called when extension requests change */
  onExtensionChange?: () => void;
  /** Called when insurance claims change */
  onClaimChange?: () => void;
  /** Called when traffic fines change */
  onFineChange?: () => void;
  /** Connection status callback */
  onConnectionChange?: (status: ConnectionStatus) => void;
}

/**
 * Handlers for realtime user bookings list updates
 */
export interface UserBookingsRealtimeHandlers {
  /** Called when any booking for this user changes */
  onBookingsChange?: () => void;
  /** Connection status callback */
  onConnectionChange?: (status: ConnectionStatus) => void;
}

/**
 * Service for realtime booking updates
 *
 * Subscribes to multiple tables that affect the booking flow:
 * - bookings: status changes, metadata updates
 * - bookings_confirmation: bilateral confirmations, funds release
 * - booking_inspections: check-in/check-out FGO
 * - booking_extension_requests: extension approvals/rejections
 * - insurance_claims: new claims reported
 * - traffic_infractions: new fines reported
 *
 * Usage:
 * ```typescript
 * // In BookingDetailPage.ngOnInit()
 * this.bookingRealtime.subscribeToBooking(bookingId, {
 *   onBookingChange: (b) => this.booking.set(b),
 *   onConfirmationChange: (c) => this.confirmation.set(c),
 *   onInspectionChange: () => this.loadInspections(),
 *   // ...
 * });
 *
 * // In BookingDetailPage.ngOnDestroy()
 * this.bookingRealtime.unsubscribeAll();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class BookingRealtimeService implements OnDestroy {
  private readonly realtimeConnection = inject(RealtimeConnectionService);
  private readonly logger = inject(LoggerService);

  // Active channels for current booking
  private channels: RealtimeChannel[] = [];
  private currentBookingId: string | null = null;

  ngOnDestroy(): void {
    this.unsubscribeAll();
  }

  /**
   * Subscribe to all realtime updates for a booking
   */
  subscribeToBooking(bookingId: string, handlers: BookingRealtimeHandlers): void {
    // Clean up previous subscriptions
    this.unsubscribeAll();
    this.currentBookingId = bookingId;

    this.logger.debug(`[BookingRealtime] Subscribing to booking: ${bookingId}`);

    // 1. Main booking table
    if (handlers.onBookingChange) {
      const channel = this.realtimeConnection.subscribeWithRetry<Booking>(
        `booking-${bookingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          this.logger.debug('[BookingRealtime] Booking changed:', payload.eventType);

          // ✅ OPTIMIZATION: Validate payload before processing
          const validation = validateBookingPayload(payload.new);
          if (!validation.valid) {
            this.logger.warn('[BookingRealtime] Invalid payload rejected:', validation.errors);
            return;
          }

          handlers.onBookingChange?.(validation.data as Booking);
        },
        handlers.onConnectionChange,
      );
      this.channels.push(channel);
    }

    // 2. Confirmations (bilateral confirmations, funds release)
    if (handlers.onConfirmationChange) {
      const channel = this.realtimeConnection.subscribeWithRetry<BookingConfirmationRow>(
        `booking-confirmation-${bookingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'bookings_confirmation',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          this.logger.debug('[BookingRealtime] Confirmation changed:', payload.eventType);
          const row = payload.new as BookingConfirmationRow;
          if (row?.booking_id) {
            handlers.onConfirmationChange?.(row);
          }
        },
      );
      this.channels.push(channel);
    }

    // 3. Inspections (FGO check-in/check-out)
    if (handlers.onInspectionChange) {
      const channel = this.realtimeConnection.subscribeWithRetry(
        `booking-inspections-${bookingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'booking_inspections',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          this.logger.debug('[BookingRealtime] Inspection changed');
          handlers.onInspectionChange?.();
        },
      );
      this.channels.push(channel);
    }

    // 4. Extension requests
    if (handlers.onExtensionChange) {
      const channel = this.realtimeConnection.subscribeWithRetry(
        `booking-extensions-${bookingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'booking_extension_requests',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          this.logger.debug('[BookingRealtime] Extension changed');
          handlers.onExtensionChange?.();
        },
      );
      this.channels.push(channel);
    }

    // 5. Insurance claims
    if (handlers.onClaimChange) {
      const channel = this.realtimeConnection.subscribeWithRetry(
        `booking-claims-${bookingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'insurance_claims',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          this.logger.debug('[BookingRealtime] Claim changed');
          handlers.onClaimChange?.();
        },
      );
      this.channels.push(channel);
    }

    // 6. Traffic infractions
    if (handlers.onFineChange) {
      const channel = this.realtimeConnection.subscribeWithRetry(
        `booking-fines-${bookingId}`,
        {
          event: '*',
          schema: 'public',
          table: 'traffic_infractions',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          this.logger.debug('[BookingRealtime] Traffic fine changed');
          handlers.onFineChange?.();
        },
      );
      this.channels.push(channel);
    }

    this.logger.debug(`[BookingRealtime] Subscribed to ${this.channels.length} channels`);
  }

  /**
   * Unsubscribe from all booking channels
   */
  unsubscribeAll(): void {
    // Clear debounce timer FIRST to prevent stale handler execution after navigation
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.channels.length === 0) return;

    this.logger.debug(`[BookingRealtime] Unsubscribing from ${this.channels.length} channels`);

    for (const channel of this.channels) {
      this.realtimeConnection.unsubscribe(channel.topic);
    }

    this.channels = [];
    this.currentBookingId = null;
  }

  /**
   * Get current subscription status
   */
  isSubscribed(): boolean {
    return this.channels.length > 0 && this.currentBookingId !== null;
  }

  /**
   * Get current booking ID being monitored
   */
  getCurrentBookingId(): string | null {
    return this.currentBookingId;
  }

  // ========================================
  // User bookings list subscriptions
  // ========================================

  private userChannels: RealtimeChannel[] = [];
  private currentUserId: string | null = null;
  private currentRole: 'owner' | 'renter' | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Subscribe to realtime updates for a user's bookings list.
   * Use this in list pages (MyBookings, OwnerBookings, PendingApproval).
   *
   * @param userId - The user ID to monitor
   * @param role - 'owner' filters by owner_id, 'renter' filters by renter_id
   * @param handlers - Callbacks for changes
   */
  subscribeToUserBookings(
    userId: string,
    role: 'owner' | 'renter',
    handlers: UserBookingsRealtimeHandlers,
  ): void {
    // Clean up previous user subscriptions
    this.unsubscribeUserBookings();
    this.currentUserId = userId;
    this.currentRole = role;

    const filterColumn = role === 'owner' ? 'owner_id' : 'renter_id';
    this.logger.debug(`[BookingRealtime] Subscribing to ${role} bookings for user: ${userId}`);

    // Debounced handler to avoid rapid-fire refreshes
    const debouncedHandler = () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.logger.debug(`[BookingRealtime] User bookings changed (${role})`);
        handlers.onBookingsChange?.();
      }, 300); // 300ms debounce
    };

    // Subscribe to bookings table filtered by user
    const channel = this.realtimeConnection.subscribeWithRetry<Booking>(
      `user-bookings-${role}-${userId}`,
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `${filterColumn}=eq.${userId}`,
      },
      debouncedHandler,
      handlers.onConnectionChange,
    );
    this.userChannels.push(channel);

    this.logger.debug(`[BookingRealtime] Subscribed to user bookings (${role})`);
  }

  /**
   * Unsubscribe from user bookings list channels
   */
  unsubscribeUserBookings(): void {
    if (this.userChannels.length === 0) return;

    this.logger.debug(
      `[BookingRealtime] Unsubscribing from ${this.userChannels.length} user channels`,
    );

    for (const channel of this.userChannels) {
      this.realtimeConnection.unsubscribe(channel.topic);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.userChannels = [];
    this.currentUserId = null;
    this.currentRole = null;
  }

  /**
   * Check if subscribed to user bookings
   */
  isUserSubscribed(): boolean {
    return this.userChannels.length > 0 && this.currentUserId !== null;
  }
}
