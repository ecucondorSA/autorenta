import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../models';
import { injectSupabase } from './supabase-client.service';
import { WalletService } from './wallet.service';
import { LoggerService } from './logger.service';

/**
 * Service for managing booking-related wallet operations
 * Handles security deposits, rental charges, and payment processing
 */
@Injectable({
  providedIn: 'root',
})
export class BookingWalletService {
  private readonly supabase = injectSupabase();
  private readonly walletService = inject(WalletService);
  private readonly logger = inject(LoggerService);

  /**
   * Charge rental from user's wallet using the new ledger system
   * This is called when a booking is completed and the owner wants to charge the renter
   */
  async chargeRentalFromWallet(
    booking: Booking,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!booking.user_id) {
        return { ok: false, error: 'Booking has no user_id' };
      }

      // Generate unique ref
      const ref = `rental-${booking.id}-${Date.now()}`;

      // Call wallet_charge_rental RPC function
      const { error } = await this.supabase.rpc('wallet_charge_rental', {
        p_user_id: booking.user_id,
        p_booking_id: booking.id,
        p_amount_cents: amountCents,
        p_ref: ref,
        p_meta: {
          charged_at: new Date().toISOString(),
          description: description || `Cargo por alquiler - Reserva ${booking.id.substring(0, 8)}`,
          car_id: booking.car_id,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Process rental payment (receives payment from renter to owner)
   * This is the counterpart - when the owner receives the payment for a completed rental
   */
  async processRentalPayment(
    booking: Booking,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!booking.owner_id) {
        return { ok: false, error: 'Booking has no owner_id' };
      }

      // Generate unique ref
      const ref = `rental-payment-${booking.id}-${Date.now()}`;

      // Insert rental_payment ledger entry manually
      const { error } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.owner_id,
        kind: 'rental_payment',
        amount_cents: amountCents,
        ref,
        booking_id: booking.id,
        meta: {
          received_at: new Date().toISOString(),
          description: description || `Pago recibido - Reserva ${booking.id.substring(0, 8)}`,
          car_id: booking.car_id,
          renter_id: booking.user_id,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Lock security deposit (guarantee) when booking is confirmed
   * The funds stay in the user's wallet but are marked as locked
   */
  async lockSecurityDeposit(
    booking: Booking,
    depositAmountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; transaction_id?: string; error?: string }> {
    try {
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

      // Lock funds using wallet service
      const lockResult = await firstValueFrom(
        this.walletService.lockFunds(
          booking.id,
          depositAmountCents,
          description || `Garantía bloqueada - Reserva ${booking.id.substring(0, 8)}`,
        ),
      );

      if (!lockResult.success) {
        return { ok: false, error: lockResult.message };
      }

      return {
        ok: true,
        transaction_id: lockResult.transaction_id ?? undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Release security deposit when rental ends without issues
   */
  async releaseSecurityDeposit(
    booking: Booking,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      if (booking.wallet_status !== 'locked') {
        return { ok: false, error: 'No security deposit is locked for this booking' };
      }

      // Unlock funds
      const unlockResult = await firstValueFrom(
        this.walletService.unlockFunds(
          booking.id,
          description || `Garantía liberada - Sin daños - Reserva ${booking.id.substring(0, 8)}`,
        ),
      );

      if (!unlockResult.success) {
        return { ok: false, error: unlockResult.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Deduct from security deposit for damages
   * Charges a portion (or all) of the locked security deposit
   */
  async deductFromSecurityDeposit(
    booking: Booking,
    damageAmountCents: number,
    damageDescription: string,
  ): Promise<{ ok: boolean; remaining_deposit?: number; error?: string }> {
    try {
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
      const ref = `damage-deduction-${booking.id}-${Date.now()}`;

      // 1. Deduct from renter's locked funds (rental_charge kind)
      const { error: deductError } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.user_id,
        kind: 'rental_charge',
        amount_cents: damageAmountCents,
        ref: `${ref}-charge`,
        booking_id: booking.id,
        meta: {
          damage_description: damageDescription,
          deducted_at: new Date().toISOString(),
          car_id: booking.car_id,
          original_deposit: lockedAmount,
        },
      });

      if (deductError) {
        return { ok: false, error: deductError.message };
      }

      // 2. Pay to owner (rental_payment kind)
      const { error: paymentError } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.owner_id,
        kind: 'rental_payment',
        amount_cents: damageAmountCents,
        ref: `${ref}-payment`,
        booking_id: booking.id,
        meta: {
          damage_description: damageDescription,
          received_at: new Date().toISOString(),
          car_id: booking.car_id,
          renter_id: booking.user_id,
        },
      });

      if (paymentError) {
        return { ok: false, error: paymentError.message };
      }

      // 3. Calculate remaining deposit
      const remainingDeposit = lockedAmount - damageAmountCents;

      // 4. Release remaining deposit (if any)
      if (remainingDeposit > 0) {
        // Unlock remaining funds
        await this.walletService.unlockFunds(
          booking.id,
          `Garantía parcialmente liberada - Daños: ${damageAmountCents / 100} - Reserva ${booking.id.substring(0, 8)}`,
        );
      }

      return {
        ok: true,
        remaining_deposit: remainingDeposit,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Unlock wallet funds for a cancelled booking
   */
  async unlockFundsForCancellation(
    booking: Booking,
    reason?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      if (booking.wallet_status !== 'locked' || !booking.wallet_lock_transaction_id) {
        return { ok: true }; // Nothing to unlock
      }

      const unlockResult = await firstValueFrom(
        this.walletService.unlockFunds(
          booking.id,
          `Fondos desbloqueados por cancelación: ${reason ?? 'Cancelled by user'}`,
        ),
      );

      if (!unlockResult.success) {
        this.logger.error('Failed to unlock funds', new Error(unlockResult.message));
        return { ok: false, error: unlockResult.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }
}
