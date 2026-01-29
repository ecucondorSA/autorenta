import { Injectable, computed, inject } from '@angular/core';
import { BookingsStore } from '@core/stores/bookings.store';
import type { Booking } from '@core/models';

/**
 * UI Context Modes for bookings hub
 * Each mode triggers a completely different UI experience
 */
export type BookingContextMode = 'pre-trip' | 'active-trip' | 'pending-action' | 'idle';

export interface BookingContext {
  mode: BookingContextMode;
  booking: Booking | null;
  /** Hours until pickup (only for pre-trip) */
  hoursToPickup?: number;
  /** Action type (only for pending-action) */
  actionType?: 'confirm-return' | 'complete-payment' | 'pending-approval';
}

/**
 * BookingContextService - Determines which UI mode to show
 *
 * Priority order:
 * 1. ACTIVE-TRIP: User currently has a car (highest priority)
 * 2. PENDING-ACTION: User needs to take action (confirm return, pay, etc)
 * 3. PRE-TRIP: Pickup in <48h, show countdown & preparation
 * 4. IDLE: No active trips, show history & search CTA
 */
@Injectable({
  providedIn: 'root',
})
export class BookingContextService {
  private readonly store = inject(BookingsStore);

  /**
   * Main computed that determines current context
   * Reactively updates when bookings change
   */
  readonly context = computed<BookingContext>(() => {
    const bookings = this.store.myBookings();

    if (!bookings.length) {
      return { mode: 'idle', booking: null };
    }

    // 1. Check for active trip (in_progress status)
    const activeTrip = bookings.find((b) => b.status === 'in_progress');
    if (activeTrip) {
      return { mode: 'active-trip', booking: activeTrip };
    }

    // 2. Check for pending actions
    const pendingAction = this.findPendingAction(bookings);
    if (pendingAction) {
      return pendingAction;
    }

    // 3. Check for pre-trip (confirmed, pickup within 48h)
    const preTrip = this.findPreTrip(bookings);
    if (preTrip) {
      return preTrip;
    }

    // 4. Default to idle
    return { mode: 'idle', booking: null };
  });

  /**
   * Convenient accessors for individual context properties
   */
  readonly mode = computed(() => this.context().mode);
  readonly contextBooking = computed(() => this.context().booking);
  readonly isPreTrip = computed(() => this.context().mode === 'pre-trip');
  readonly isActiveTrip = computed(() => this.context().mode === 'active-trip');
  readonly isPendingAction = computed(() => this.context().mode === 'pending-action');
  readonly isIdle = computed(() => this.context().mode === 'idle');

  /**
   * Find booking requiring user action
   */
  private findPendingAction(bookings: Booking[]): BookingContext | null {
    // Check for pending_review (needs return confirmation)
    const pendingReview = bookings.find((b) => b.status === 'pending_review');
    if (pendingReview) {
      return {
        mode: 'pending-action',
        booking: pendingReview,
        actionType: 'confirm-return',
      };
    }

    // Check for in_progress with completion_status requiring renter action
    const needsReturnConfirm = bookings.find(
      (b) =>
        b.status === 'in_progress' &&
        (b.completion_status === 'pending_renter' || b.completion_status === 'pending_both'),
    );
    if (needsReturnConfirm) {
      return {
        mode: 'pending-action',
        booking: needsReturnConfirm,
        actionType: 'confirm-return',
      };
    }

    // Check for pending payment (not expired)
    const pendingPayment = bookings.find((b) => {
      const isPending = b.status === 'pending' || b.status === 'pending_payment';
      return isPending && !this.isExpired(b);
    });
    if (pendingPayment) {
      // Wallet bookings are pending owner approval, not payment
      const isWallet = pendingPayment.payment_mode === 'wallet';
      return {
        mode: 'pending-action',
        booking: pendingPayment,
        actionType: isWallet ? 'pending-approval' : 'complete-payment',
      };
    }

    return null;
  }

  /**
   * Find confirmed booking with pickup within 48 hours
   */
  private findPreTrip(bookings: Booking[]): BookingContext | null {
    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue;
      if (!booking.start_at) continue;

      const startDate = new Date(booking.start_at);
      const hoursToPickup = this.hoursUntil(startDate);

      // Within 48 hours and not passed
      if (hoursToPickup <= 48 && hoursToPickup > 0) {
        return {
          mode: 'pre-trip',
          booking,
          hoursToPickup,
        };
      }
    }

    return null;
  }

  /**
   * Calculate hours until a date
   */
  private hoursUntil(date: Date): number {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Check if booking start date has passed
   */
  private isExpired(booking: Booking): boolean {
    if (!booking.start_at) return false;
    const startDate = new Date(booking.start_at);
    return startDate < new Date();
  }
}
