import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../models';
import { injectSupabase } from './supabase-client.service';
import { WalletService } from './wallet.service';
import { LoggerService } from './logger.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';
import { PaymentsService } from './payments.service'; // NEW: Import PaymentsService

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
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly carsService = inject(CarsService);
  private readonly paymentsService = inject(PaymentsService); // NEW: Inject PaymentsService

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

      // ✅ NUEVO: Notificar al dueño del auto sobre el pago recibido
      this.notifyOwnerOfPaymentReceived(booking, amountCents).catch((notificationError) => {
        this.logger.warn(
          'Failed to notify owner about payment received',
          'BookingWalletService',
          notificationError instanceof Error
            ? notificationError
            : new Error(String(notificationError)),
        );
      });

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
    paymentMethod: 'card' | 'wallet', // NUEVO: Método de pago
    description?: string,
  ): Promise<{ ok: boolean; transaction_id?: string; mp_order_id?: string; error?: string }> {
    try {
      if (!booking.user_id) {
        return { ok: false, error: 'Booking has no user_id' };
      }

      // 1. Si es con Wallet: Usar lógica existente de bloqueo de fondos
      if (paymentMethod === 'wallet') {
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
      }

      // 2. Si es con Tarjeta: Crear pre-autorización de MercadoPago
      if (paymentMethod === 'card') {
        // Crear un PaymentIntent de tipo security_deposit
        const intent = await this.paymentsService.createPaymentIntent({
          bookingId: booking.id,
          userId: booking.user_id,
          amount: depositAmountCents / 100, // MP espera monto en la moneda base
          currency: booking.currency || 'ARS',
          intentType: 'security_deposit',
          isPreAuth: true,
          description: description || `Pre-autorización Garantía Reserva ${booking.id.substring(0, 8)}`,
        });

        // Llamar a la RPC de Supabase para crear la pre-autorización en MP
        const updatedIntent = await this.paymentsService.createMpPreAuthOrder(
          intent.id,
          depositAmountCents,
          description || `Pre-autorización Garantía Reserva ${booking.id.substring(0, 8)}`,
          booking.id,
        );

        // Actualizar el booking con el ID de la orden de MP
        await this.supabase
          
          .from('bookings')
          .update({
            mp_security_deposit_order_id: updatedIntent.mp_order_id,
            deposit_status: 'locked', // Usar el nuevo estado de depósito
            payment_method: 'credit_card',
          })
          .eq('id', booking.id);

        return {
          ok: true,
          mp_order_id: updatedIntent.mp_order_id ?? undefined,
        };
      }

      return { ok: false, error: 'Método de pago no soportado para garantía' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      this.logger.error(
        'lockSecurityDeposit exception',
        'BookingWalletService',
        err instanceof Error ? err : new Error(errorMsg),
      );
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
   * P0-SECURITY: Uses atomic RPC function to prevent partial state
   *
   * All operations (deduct from renter, pay to owner, update booking)
   * happen in a single database transaction. If any step fails,
   * everything is rolled back automatically.
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

      // P0-SECURITY: Use atomic RPC function instead of multiple inserts
      // This ensures all operations succeed or fail together
      const { data, error } = await this.supabase.rpc('wallet_deduct_damage_atomic', {
        p_booking_id: booking.id,
        p_renter_id: booking.user_id,
        p_owner_id: booking.owner_id,
        p_damage_amount_cents: damageAmountCents,
        p_damage_description: damageDescription,
        p_car_id: booking.car_id,
      });

      if (error) {
        this.logger.error('Atomic damage deduction failed', 'BookingWalletService', error as Error);
        return { ok: false, error: error.message };
      }

      // Parse the JSONB result from the RPC
      const result = data as {
        ok: boolean;
        remaining_deposit?: number;
        damage_charged?: number;
        original_deposit?: number;
        error?: string;
        error_code?: string;
      };

      if (!result.ok) {
        return {
          ok: false,
          error: result.error || 'Error en transacción atómica de deducción',
        };
      }

      this.logger.info(
        `Atomic damage deduction successful: ${damageAmountCents / 100} charged, ` +
          `${(result.remaining_deposit ?? 0) / 100} remaining`,
      );

      return {
        ok: true,
        remaining_deposit: result.remaining_deposit,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      this.logger.error(
        'deductFromSecurityDeposit exception',
        'BookingWalletService',
        err instanceof Error ? err : new Error(errorMsg),
      );
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
        this.logger.error(
          'Failed to unlock funds',
          'BookingWalletService',
          new Error(unlockResult.message),
        );
        return { ok: false, error: unlockResult.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Notifica al dueño del auto sobre un pago recibido
   */
  private async notifyOwnerOfPaymentReceived(booking: Booking, amountCents: number): Promise<void> {
    try {
      if (!booking.owner_id || !booking.car_id) return;

      const amount = amountCents / 100; // Convertir centavos a pesos
      const bookingUrl = `/bookings/${booking.id}`;

      this.carOwnerNotifications.notifyPaymentReceived(amount, booking.id, bookingUrl);
    } catch (error) {
      this.logger.warn(
        'Failed to notify owner about payment received',
        'BookingWalletService',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
