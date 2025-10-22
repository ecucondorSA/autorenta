import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { injectSupabase } from './supabase-client.service';
import { WalletService } from './wallet.service';
import { PwaService } from './pwa.service';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly walletService = inject(WalletService);
  private readonly pwaService = inject(PwaService);

  async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
    });
    if (error) throw error;

    const bookingId = this.extractBookingId(data);
    if (!bookingId) {
      throw new Error('request_booking did not return a booking id');
    }

    // Recalculate pricing breakdown after creating booking
    await this.recalculatePricing(bookingId);

    // Fetch the updated booking with breakdown
    const updated = await this.getBookingById(bookingId);
    if (updated) {
      return updated;
    }

    return { ...(data as Booking), id: bookingId };
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

    const bookings = (data ?? []) as Booking[];

    // Update app badge with pending bookings count
    await this.updateAppBadge(bookings);

    return bookings;
  }

  /**
   * Update app badge with pending bookings count
   */
  private async updateAppBadge(bookings: Booking[]): Promise<void> {
    const pendingCount = bookings.filter(
      b => b.status === 'pending' || b.status === 'confirmed'
    ).length;

    if (pendingCount > 0) {
      await this.pwaService.setAppBadge(pendingCount);
    } else {
      await this.pwaService.clearAppBadge();
    }
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
  async recalculatePricing(bookingId: string): Promise<void> {
    const { error } = await this.supabase.rpc('pricing_recalculate', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
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
   * Charge rental from user's wallet using the new ledger system
   * This is called when a booking is completed and the owner wants to charge the renter
   */
  async chargeRentalFromWallet(
    bookingId: string,
    amountCents: number,
    description?: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Get booking to verify user_id
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.user_id) {
        return { ok: false, error: 'Booking has no user_id' };
      }

      // Generate unique ref
      const ref = `rental-${bookingId}-${Date.now()}`;

      // Call wallet_charge_rental RPC function
      const { data, error } = await this.supabase.rpc('wallet_charge_rental', {
        p_user_id: booking.user_id,
        p_booking_id: bookingId,
        p_amount_cents: amountCents,
        p_ref: ref,
        p_meta: {
          charged_at: new Date().toISOString(),
          description: description || `Cargo por alquiler - Reserva ${bookingId.substring(0, 8)}`,
          car_id: booking.car_id,
        },
      });

      if (error) {
        console.error('Error charging rental from wallet:', error);
        return { ok: false, error: error.message };
      }

      // Update booking status
      await this.updateBooking(bookingId, {
        status: 'completed',
        wallet_status: 'charged',
        paid_at: new Date().toISOString(),
      });

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      console.error('Exception charging rental:', err);
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Process rental payment (receives payment from renter to owner)
   * This is the counterpart - when the owner receives the payment for a completed rental
   */
  async processRentalPayment(
    bookingId: string,
    amountCents: number,
    description?: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Get booking to verify car owner
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.owner_id) {
        return { ok: false, error: 'Booking has no owner_id' };
      }

      // Generate unique ref
      const ref = `rental-payment-${bookingId}-${Date.now()}`;

      // Insert rental_payment ledger entry manually
      const { error } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.owner_id,
        kind: 'rental_payment',
        amount_cents: amountCents,
        ref,
        booking_id: bookingId,
        meta: {
          received_at: new Date().toISOString(),
          description: description || `Pago recibido - Reserva ${bookingId.substring(0, 8)}`,
          car_id: booking.car_id,
          renter_id: booking.user_id,
        },
      });

      if (error) {
        console.error('Error processing rental payment:', error);
        return { ok: false, error: error.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      console.error('Exception processing rental payment:', err);
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Lock security deposit (guarantee) when booking is confirmed
   * The funds stay in the user's wallet but are marked as locked
   */
  async lockSecurityDeposit(
    bookingId: string,
    depositAmountCents: number,
    description?: string
  ): Promise<{ ok: boolean; transaction_id?: string; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.user_id) {
        return { ok: false, error: 'Booking has no user_id' };
      }

      // Check if user has sufficient available balance
      const { data: wallet, error: walletError } = await this.supabase
        .from('user_wallets')
        .select('available_balance')
        .eq('user_id', booking.user_id)
        .single();

      if (walletError) {
        return { ok: false, error: 'Error checking wallet balance' };
      }

      if (wallet.available_balance < depositAmountCents) {
        return {
          ok: false,
          error: `Saldo insuficiente. Disponible: ${wallet.available_balance / 100}, Requerido: ${depositAmountCents / 100}`,
        };
      }

      const ref = `security-deposit-lock-${bookingId}-${Date.now()}`;

      // Lock funds using wallet service
      const lockResult = await this.walletService.lockFunds({
        booking_id: bookingId,
        amount: depositAmountCents,
        description:
          description ||
          `Garantía bloqueada - Reserva ${bookingId.substring(0, 8)}`,
      });

      if (!lockResult.success) {
        return { ok: false, error: lockResult.message };
      }

      // Update booking with security deposit info
      await this.updateBooking(bookingId, {
        wallet_status: 'locked',
        wallet_lock_transaction_id: lockResult.transaction_id ?? undefined,
      });

      return {
        ok: true,
        transaction_id: lockResult.transaction_id ?? undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      console.error('Exception locking security deposit:', err);
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Release security deposit when rental ends without issues
   */
  async releaseSecurityDeposit(
    bookingId: string,
    description?: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (booking.wallet_status !== 'locked') {
        return { ok: false, error: 'No security deposit is locked for this booking' };
      }

      // Unlock funds
      const unlockResult = await this.walletService.unlockFunds({
        booking_id: bookingId,
        description:
          description ||
          `Garantía liberada - Sin daños - Reserva ${bookingId.substring(0, 8)}`,
      });

      if (!unlockResult.success) {
        return { ok: false, error: unlockResult.message };
      }

      // Update booking
      await this.updateBooking(bookingId, {
        wallet_status: 'refunded',
      });

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      console.error('Exception releasing security deposit:', err);
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Deduct from security deposit for damages
   * Charges a portion (or all) of the locked security deposit
   */
  async deductFromSecurityDeposit(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string
  ): Promise<{ ok: boolean; remaining_deposit?: number; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.user_id || !booking.owner_id) {
        return { ok: false, error: 'Booking missing user_id or owner_id' };
      }

      if (booking.wallet_status !== 'locked') {
        return { ok: false, error: 'No security deposit is locked for this booking' };
      }

      // Get locked amount from consolidated view
      // ACTUALIZADO (2025-10-22): Usa vista consolidada que incluye legacy + ledger
      const { data: lockTx, error: lockTxError } = await this.supabase
        .from('v_wallet_history')
        .select('amount_cents')
        .eq('id', booking.wallet_lock_transaction_id)
        .in('transaction_type', ['lock', 'security_deposit_lock', 'rental_payment_lock'])
        .single();

      if (lockTxError || !lockTx) {
        return { ok: false, error: 'Lock transaction not found' };
      }

      // Vista consolidada retorna amount_cents, convertir a centavos si es necesario
      const lockedAmount = lockTx.amount_cents;

      if (damageAmountCents > lockedAmount) {
        return {
          ok: false,
          error: `Damage amount (${damageAmountCents / 100}) exceeds locked deposit (${lockedAmount / 100})`,
        };
      }

      // Generate unique ref
      const ref = `damage-deduction-${bookingId}-${Date.now()}`;

      // 1. Deduct from renter's locked funds (rental_charge kind)
      const { error: deductError } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.user_id,
        kind: 'rental_charge',
        amount_cents: damageAmountCents,
        ref: `${ref}-charge`,
        booking_id: bookingId,
        meta: {
          damage_description: damageDescription,
          deducted_at: new Date().toISOString(),
          car_id: booking.car_id,
          original_deposit: lockedAmount,
        },
      });

      if (deductError) {
        console.error('Error deducting from deposit:', deductError);
        return { ok: false, error: deductError.message };
      }

      // 2. Pay to owner (rental_payment kind)
      const { error: paymentError } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.owner_id,
        kind: 'rental_payment',
        amount_cents: damageAmountCents,
        ref: `${ref}-payment`,
        booking_id: bookingId,
        meta: {
          damage_description: damageDescription,
          received_at: new Date().toISOString(),
          car_id: booking.car_id,
          renter_id: booking.user_id,
        },
      });

      if (paymentError) {
        console.error('Error paying owner:', paymentError);
        return { ok: false, error: paymentError.message };
      }

      // 3. Release remaining deposit (if any)
      const remainingDeposit = lockedAmount - damageAmountCents;

      if (remainingDeposit > 0) {
        // Unlock remaining funds
        await this.walletService.unlockFunds({
          booking_id: bookingId,
          description: `Garantía parcialmente liberada - Daños: ${damageAmountCents / 100} - Reserva ${bookingId.substring(0, 8)}`,
        });

        await this.updateBooking(bookingId, {
          wallet_status: 'partially_charged',
        });
      } else {
        // All deposit used
        await this.updateBooking(bookingId, {
          wallet_status: 'charged',
        });
      }

      return {
        ok: true,
        remaining_deposit: remainingDeposit,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      console.error('Exception deducting from security deposit:', err);
      return { ok: false, error: errorMsg };
    }
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

  private extractBookingId(response: unknown): string | null {
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

    return null;
  }
}
