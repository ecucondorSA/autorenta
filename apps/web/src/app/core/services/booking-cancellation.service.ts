import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { environment } from '../../../environments/environment';
import { getErrorMessage } from '../utils/type-guards';
import { injectSupabase } from './supabase-client.service';
import { BookingWalletService } from './booking-wallet.service';
import { BookingValidationService } from './booking-validation.service';
import { LoggerService } from './logger.service';

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
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validate status
      const statusValidation = this.validationService.validateCancellationStatus(booking);
      if (!statusValidation.allowed) {
        return {
          success: false,
          error: statusValidation.error,
        };
      }

      // 2. Validate timing (24h before)
      const timingValidation = this.validationService.validateCancellationTiming(booking, force);
      if (!timingValidation.allowed) {
        return {
          success: false,
          error: timingValidation.error,
        };
      }

      // 3. Update status to 'cancelled'
      const { error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) {
        return {
          success: false,
          error: 'Error al cancelar la reserva. Intenta de nuevo.',
        };
      }

      // 4. Process automatic refund if booking was paid
      if (booking.status === 'confirmed') {
        await this.processRefund(booking, force);
      }

      // 5. Unlock wallet funds if locked
      await this.bookingWalletService.unlockFundsForCancellation(booking, 'Cancelled by user');

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado al cancelar';
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
      .eq('id', booking.id);

    if (error) throw error;
  }

  /**
   * Process refund for cancelled booking
   */
  private async processRefund(booking: Booking, force: boolean): Promise<void> {
    try {
      const metadata =
        booking && typeof booking === 'object'
          ? (booking as { metadata?: Record<string, unknown> }).metadata
          : undefined;
      const mercadopagoPaymentId =
        metadata && typeof metadata === 'object'
          ? (metadata as Record<string, unknown>).mercadopago_payment_id
          : undefined;

      if (typeof mercadopagoPaymentId !== 'string') {
        this.logger.warn('No MercadoPago payment ID found for refund');
        return;
      }

      // Calculate cancellation penalty based on policy
      const { refundType, refundAmount } = this.calculateRefund(booking, force);

      // Get auth token
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
            booking_id: booking.id,
            refund_type: refundType,
            ...(refundType === 'partial' && refundAmount && { amount: refundAmount }),
            mercadopago_payment_id: mercadopagoPaymentId,
            reason: 'Cancelación de reserva',
          }),
        },
      );

      if (!refundResponse.ok) {
        const errorData = await refundResponse.json().catch(() => ({}));
        this.logger.error(
          'Error processing refund',
          'BookingCancellationService',
          new Error(JSON.stringify(errorData)),
        );
      } else {
        const refundData = await refundResponse.json();
        this.logger.info('Refund processed successfully', refundData);
      }
    } catch (refundError) {
      this.logger.error(
        'Error calling refund API',
        'BookingCancellationService',
        refundError instanceof Error ? refundError : new Error(getErrorMessage(refundError)),
      );
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
    const totalAmount = parseFloat(booking.total_amount?.toString() || '0');

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
}
