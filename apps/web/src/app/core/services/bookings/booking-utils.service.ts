import { Injectable } from '@angular/core';
import { Booking } from '../models';

/**
 * Service for booking utility methods
 * Handles time calculations, formatting, and data extraction
 */
@Injectable({
  providedIn: 'root',
})
export class BookingUtilsService {
  private readonly uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  /**
   * Get time remaining until booking expires (in milliseconds)
   * Returns null if booking has no expiration or is already expired
   */
  getTimeUntilExpiration(booking: Booking): number | null {
    if (!booking.expires_at || booking.status !== 'pending') {
      return null;
    }

    const expiresAt = new Date(booking.expires_at).getTime();
    const now = Date.now();
    const remaining = expiresAt - now;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Format time remaining as human-readable string
   */
  formatTimeRemaining(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Check if booking is expired
   */
  isExpired(booking: Booking): boolean {
    if (!booking.expires_at) return false;
    return new Date(booking.expires_at).getTime() < Date.now();
  }

  /**
   * Extract booking ID from RPC response
   * Handles different response formats including arrays
   */
  extractBookingId(response: unknown): string | null {
    // Some RPCs return an array of rows
    if (Array.isArray(response)) {
      if (response.length === 0) return null;
      return this.extractBookingId(response[0]);
    }

    // Some RPCs return the UUID as a string
    if (typeof response === 'string') {
      const trimmed = response.trim();
      return this.uuidRegex.test(trimmed) ? trimmed : null;
    }

    if (!response || typeof response !== 'object') {
      return null;
    }

    const maybeBooking = response as Partial<Booking>;
    if (typeof maybeBooking.id === 'string' && maybeBooking.id.length > 0) {
      return maybeBooking.id;
    }

    const withBookingId = response as { booking_id?: unknown; bookingId?: unknown };
    if (typeof withBookingId.booking_id === 'string' && withBookingId.booking_id.length > 0) {
      return withBookingId.booking_id;
    }

    if (typeof withBookingId.bookingId === 'string' && withBookingId.bookingId.length > 0) {
      return withBookingId.bookingId;
    }

    // Some RPCs wrap the payload
    const maybeWrapped = response as { data?: unknown; result?: unknown; booking?: unknown };
    if (maybeWrapped.data) return this.extractBookingId(maybeWrapped.data);
    if (maybeWrapped.result) return this.extractBookingId(maybeWrapped.result);
    if (maybeWrapped.booking) return this.extractBookingId(maybeWrapped.booking);

    return null;
  }

  /**
   * Calculate booking duration in days
   */
  calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Check if booking is in the past
   */
  isInPast(booking: Booking): boolean {
    const endDate = new Date(booking.end_at);
    return endDate < new Date();
  }

  /**
   * Check if booking is currently active (in progress)
   */
  isActive(booking: Booking): boolean {
    const now = new Date();
    const startDate = new Date(booking.start_at);
    const endDate = new Date(booking.end_at);
    return now >= startDate && now <= endDate && booking.status === 'confirmed';
  }

  /**
   * Check if booking is upcoming (confirmed but not started)
   */
  isUpcoming(booking: Booking): boolean {
    const now = new Date();
    const startDate = new Date(booking.start_at);
    return now < startDate && booking.status === 'confirmed';
  }
}
