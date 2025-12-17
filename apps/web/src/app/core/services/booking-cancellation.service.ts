import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { environment } from '../../../environments/environment';
import { getErrorMessage } from '../utils/type-guards';
import { injectSupabase } from './supabase-client.service';
import { BookingWalletService } from './booking-wallet.service';
import { BookingValidationService } from './booking-validation.service';
import { LoggerService } from './logger.service';
import { WalletService } from './wallet.service'; // NUEVO: Importar WalletService

/**
 * Service for booking cancellation
 * Handles cancellation logic, refund processing, and wallet unlocking
 */
@Injectable({
  providedIn: 'root',
})
export class BookingCancellationService {
  private readonly supabase = injectSupabase();
  private readonly bookingWalletService = inject(BookingWalletService);
  private readonly validationService = inject(BookingValidationService);
  private readonly logger = inject(LoggerService);
  private readonly walletService = inject(WalletService); // NUEVO: Inyectar WalletService

  /**
   * ✅ SPRINT 3: Cancel a booking
   *
   * Validates that the booking:
   * - Belongs to the current user
   * - Is in 'confirmed' or 'pending' status
   * - Has at least 24h before start (optional, configurable)
   *
   * @param booking - Booking to cancel
   * @param force - Force cancellation without validating time (admin use)
   * @returns Promise with operation result
   */
  async cancelBooking(
    booking: Booking,
    force: boolean = false,
    refundDestination: 'wallet' | 'card' = 'card', // NUEVO: Destino del reembolso
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validate status
      const statusValidation = this.validationService.validateCancellationStatus(booking);
      if (!statusValidation.allowed) {
        return {
          success: false,
          error: statusValidation['error'],
        };
      }

      // 2. Validate timing (24h before)
      const timingValidation = this.validationService.validateCancellationTiming(booking, force);
      if (!timingValidation.allowed) {
        return {
          success: false,
          error: timingValidation['error'],
        };
      }

      // 3. Update status to 'cancelled'
      const { error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking['id']);

      if (error) {
        return {
          success: false,
          error: 'Error al cancelar la reserva. Intenta de nuevo.',
        };
      }

      // 4. ✅ P0-021 FIX: Process automatic refund if booking was paid
      // Always process refund for confirmed or in_progress bookings
      // If refund fails, log error but don't block cancellation
      if (booking['status'] === 'confirmed' || booking['status'] === 'in_progress') {
        try {
          await this.processRefund(booking, force, refundDestination);
        } catch (refundError) {
          this.logger['error'](
            'Refund failed during cancellation - booking still cancelled',
            'BookingCancellationService',
            refundError instanceof Error ? refundError : new Error(getErrorMessage(refundError)),
          );
          // ✅ P0-021: Log error but continue - cancellation should not fail if refund fails
          // Admin will be notified via Sentry and can process refund manually
        }
      }

      // 5. Unlock wallet funds if locked
      await this.bookingWalletService.unlockFundsForCancellation(booking, 'Cancelled by user');

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error['message'] : 'Error inesperado al cancelar';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Legacy cancellation method
   * Deprecated: Use cancelBooking for new code
   */
  async cancelBookingLegacy(booking: Booking, reason?: string): Promise<void> {
    // 1. Unlock wallet funds if locked
    if (booking.wallet_status === 'locked' && booking.wallet_lock_transaction_id) {
      await this.bookingWalletService.unlockFundsForCancellation(booking, reason);
    }

    // 2. Cancel the booking
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Cancelled by user',
        wallet_status: booking.wallet_status === 'locked' ? 'refunded' : booking.wallet_status,
      })
      .eq('id', booking['id']);

    if (error) throw error;
  }

  /**
   * Process refund for cancelled booking
   */
  /**
   * Process refund for cancelled booking
   * @param booking - The booking being cancelled
   * @param force - If true, bypasses time validations (admin)
   * @param refundDestination - Where to send the refund: 'wallet' or 'card'
   */
  private async processRefund(
    booking: Booking,
    force: boolean,
    refundDestination: 'wallet' | 'card',
  ): Promise<void> {
    try {
      // 1. Calcular el monto del reembolso según la política
      const { refundType, refundAmount } = this.calculateRefund(booking, force);

      // Si no hay monto a reembolsar, salir
      if (!refundAmount || refundAmount <= 0) {
        this.logger.info(
          'No refund amount calculated, skipping refund process',
          'BookingCancellationService',
          { bookingId: booking['id'] },
        );
        return;
      }

      // 2. Procesar reembolso según el destino
      if (refundDestination === 'wallet') {
        // Reembolsar a la wallet del usuario
        if (!booking['user_id']) {
          throw new Error('Booking has no user_id for wallet refund');
        }
        await this.walletService.depositFunds(
          booking['user_id'],
          Math.round(refundAmount * 100), // Convertir a centavos
          `Reembolso por cancelación de reserva ${booking['id'].substring(0, 8)}`,
          booking['id'], // referenceId
        );
        this.logger.info(
          `Refunded ${refundAmount} ${booking['currency']} to user wallet`,
          'BookingCancellationService',
          { bookingId: booking['id'] },
        );
      } else {
        // Reembolsar a la tarjeta (MercadoPago)
        const metadata = booking.metadata;
        const mercadopagoPaymentId = metadata?.['mercadopago_payment_id'];

        if (typeof mercadopagoPaymentId !== 'string') {
          this.logger.warn('No MercadoPago payment ID found for card refund');
          return;
        }

        // Get auth token (needed for Edge Function invocation)
        const {
          data: { session },
        } = await this.supabase.auth.getSession();
        if (!session?.access_token) {
          this.logger.warn('No auth token available for refund processing');
          return;
        }

        // Call Edge Function for refunds
        const refundResponse = await fetch(
          `${environment.supabaseUrl}/functions/v1/mercadopago-process-refund`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              booking_id: booking['id'],
              refund_type: refundType,
              amount: refundAmount, // Pasar el monto específico
              mercadopago_payment_id: mercadopagoPaymentId,
              reason: 'Cancelación de reserva',
            }),
          },
        );

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json().catch(() => ({}));
          this.logger['error'](
            'Error processing refund via MercadoPago API',
            'BookingCancellationService',
            new Error(JSON.stringify(errorData)),
          );
          throw new Error(errorData['message'] || 'Error en reembolso con MercadoPago');
        } else {
          const refundData = await refundResponse.json();
          this.logger.info('MercadoPago refund processed successfully', refundData);
        }
      }
    } catch (refundError) {
      this.logger['error'](
        'Error during refund process',
        'BookingCancellationService',
        refundError instanceof Error ? refundError : new Error(getErrorMessage(refundError)),
      );
      throw refundError; // Re-throw para que el caller pueda manejarlo
    }
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  private calculateRefund(
    booking: Booking,
    force: boolean,
  ): { refundType: 'full' | 'partial'; refundAmount?: number } {
    if (force) {
      return { refundType: 'full' };
    }

    const startDate = new Date(booking.start_at);
    const now = new Date();
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const totalAmount = parseFloat(booking['total_amount']?.toString() || '0');

    // Less than 24h: 25% penalty
    if (hoursUntilStart < 24) {
      const cancellationFee = totalAmount * 0.25;
      const refundAmount = totalAmount - cancellationFee;
      return { refundType: 'partial', refundAmount };
    }

    // Less than 48h: 10% penalty
    if (hoursUntilStart < 48) {
      const cancellationFee = totalAmount * 0.1;
      const refundAmount = totalAmount - cancellationFee;
      return { refundType: 'partial', refundAmount };
    }

    // More than 48h: full refund
    return { refundType: 'full' };
  }

  /**
   * Procesa la cancelación por "No Show" (No presentación)
   * Aplica una multa del 40% al inquilino
   */
  async processNoShow(booking: Booking): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Actualizar estado a 'cancelled' con razón 'no_show'
      const { error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          cancellation_reason: 'no_show',
        })
        .eq('id', booking['id']);

      if (error) {
        return { success: false, error: 'Error al procesar No Show' };
      }

      // 2. Procesar reembolso parcial (60% refund, 40% multa)
      // Si está pagada, reembolsar solo el 60%
      if (booking['status'] === 'confirmed' && booking['total_amount']) {
        const totalAmount = parseFloat(booking['total_amount'].toString());
        const penaltyAmount = totalAmount * 0.4; // Multa del 40%
        const refundAmount = totalAmount - penaltyAmount;

        // Llamar a función de reembolso parcial
        // Nota: Usamos refundType 'partial' y pasamos el monto a devolver
        const metadata = booking.metadata;
        const paymentId = metadata?.['mercadopago_payment_id'];

        if (paymentId) {
          await this.callRefundApi(booking['id'], paymentId as string, refundAmount);
        }
      }

      // 3. Desbloquear wallet si corresponde (la garantía se libera íntegra en No Show)
      await this.bookingWalletService.unlockFundsForCancellation(booking, 'No Show cancellation');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error['message'] : 'Error en proceso de No Show',
      };
    }
  }

  private async callRefundApi(bookingId: string, paymentId: string, amount: number) {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${environment.supabaseUrl}/functions/v1/mercadopago-process-refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booking_id: bookingId,
        mercadopago_payment_id: paymentId,
        refund_type: 'partial',
        amount: amount,
        reason: 'No Show penalty (40%)',
      }),
    });
  }
}
