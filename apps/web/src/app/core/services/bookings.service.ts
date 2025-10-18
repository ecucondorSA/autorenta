import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { injectSupabase } from './supabase-client.service';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly walletService = inject(WalletService);

  async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
    });
    if (error) throw error;

    // Recalculate pricing breakdown after creating booking
    const booking = data as Booking;
    await this.recalculatePricing(booking.id);

    // Fetch the updated booking with breakdown
    const updated = await this.getBookingById(booking.id);
    return updated ?? booking;
  }

  /**
   * Get bookings for current user using the my_bookings view
   * This includes car details, photos, and payment status
   */
  async getMyBookings(): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('my_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Booking[];
  }

  /**
   * Get bookings for cars owned by current user
   */
  async getOwnerBookings(): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('owner_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Booking[];
  }

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
    return data as Booking;
  }

  /**
   * Recalculate pricing breakdown for a booking
   */
  async recalculatePricing(bookingId: string): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('pricing_recalculate', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    return data as Booking;
  }

  /**
   * Update booking fields
   * NOTE: This method is used to update a booking with partial data.
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
   * Cancel a booking
   * If the booking has locked wallet funds, they will be unlocked automatically
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    // 1. Get booking to check wallet status
    const booking = await this.getBookingById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // 2. If wallet funds are locked, unlock them before cancelling
    if (booking.wallet_status === 'locked' && booking.wallet_lock_transaction_id) {
      try {
        await this.walletService.unlockFunds({
          booking_id: bookingId,
          description: `Fondos desbloqueados por cancelación: ${reason ?? 'Cancelled by user'}`,
        });
      } catch (unlockError) {
        console.error('Error unlocking wallet funds during cancellation:', unlockError);
        // Continue with cancellation even if unlock fails
        // The unlock can be retried manually later
      }
    }

    // 3. Cancel the booking
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Cancelled by user',
        wallet_status: booking.wallet_status === 'locked' ? 'refunded' : booking.wallet_status,
      })
      .eq('id', bookingId);

    if (error) throw error;
  }

  /**
   * Mark booking as paid
   */
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
  }

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
}
