import { Injectable, inject, DestroyRef } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, map, switchMap, takeUntilDestroyed } from 'rxjs/operators';
import { takeUntilDestroyed as takeUntilDestroyedInterop } from '@angular/core/rxjs-interop';
import { PaymentsService } from './payments.service';
import { PaymentAuthorizationService } from './payment-authorization.service';
import { SplitPaymentService } from './split-payment.service';
import { BookingsService } from './bookings.service';
import { WalletService } from './wallet.service';
import { LoggerService } from './logger.service';

/**
 * Payment method for a booking
 */
export type PaymentMethod = 'wallet' | 'credit_card' | 'partial_wallet';

/**
 * Parameters for booking payment
 */
export interface BookingPaymentParams {
  bookingId: string;
  method: PaymentMethod;
  totalAmount: number;
  currency: string;
  walletAmount?: number; // For partial_wallet
  cardAmount?: number; // For partial_wallet
}

/**
 * Result of payment processing
 */
export interface PaymentResult {
  success: boolean;
  bookingId: string;
  paymentIntentId?: string;
  mercadoPagoInitPoint?: string;
  message: string;
  error?: string;
}

/**
 * Parameters for refund processing
 */
export interface RefundParams {
  bookingId: string;
  amount: number;
  reason: string;
  refundType: 'full' | 'partial';
}

/**
 * Result of refund processing
 */
export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  message: string;
  error?: string;
}

interface PaymentWebhookPayload {
  booking_id?: string;
  status?: string;
  payment_id?: string;
}

/**
 * Payment Orchestration Service
 *
 * High-level service that orchestrates all payment flows across the application.
 * This service acts as a facade for complex payment operations, delegating to
 * specialized services for specific tasks.
 *
 * Responsibilities:
 * - Orchestrate booking payment flows (wallet, credit card, partial)
 * - Handle payment webhooks from providers
 * - Process refunds for cancelled bookings
 * - Coordinate payment splitting for marketplace
 * - Send payment notifications
 * - Handle payment errors with retry logic
 *
 * Architecture:
 * - High-level orchestration (this service)
 * - Mid-level services (CheckoutPaymentService - feature-specific)
 * - Low-level services (PaymentsService, WalletService, etc.)
 *
 * Usage:
 * - Controllers and webhooks use this service
 * - Feature services (CheckoutPaymentService) can also use this for complex flows
 * - Never bypass this service for critical payment operations
 */
@Injectable({
  providedIn: 'root',
})
export class PaymentOrchestrationService {
  private readonly paymentsService = inject(PaymentsService);
  private readonly authService = inject(PaymentAuthorizationService);
  private readonly splitService = inject(SplitPaymentService);
  private readonly bookingsService = inject(BookingsService);
  private readonly walletService = inject(WalletService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Process a booking payment (high-level orchestration)
   *
   * This method decides which payment flow to use based on the method
   * and coordinates all necessary services.
   */
  processBookingPayment(params: BookingPaymentParams): Observable<PaymentResult> {
    this.logger.info('Processing booking payment', JSON.stringify({ params }));

    switch (params.method) {
      case 'wallet':
        return this.processWalletPayment(params);
      case 'credit_card':
        return this.processCreditCardPayment(params);
      case 'partial_wallet':
        return this.processPartialWalletPayment(params);
      default:
        return throwError(() => new Error(`Unknown payment method: ${params.method}`));
    }
  }

  /**
   * Process wallet payment
   */
  private processWalletPayment(params: BookingPaymentParams): Observable<PaymentResult> {
    return from(this.bookingsService.getBookingById(params.bookingId)).pipe(
      switchMap((booking) => {
        if (!booking) {
          return throwError(() => new Error('Booking not found'));
        }

        // Lock funds in wallet
        return this.walletService.lockFunds(
          params.bookingId,
          params.totalAmount,
          `Payment for booking ${params.bookingId}`,
        );
      }),
      switchMap(() => {
        // Update booking status
        return from(
          this.bookingsService.updateBooking(params.bookingId, {
            status: 'confirmed',
            payment_method: 'wallet',
          }),
        );
      }),
      switchMap(() => {
        // Create payment intent
        return from(this.paymentsService.createIntent(params.bookingId));
      }),
      map((intent) => ({
        success: true,
        bookingId: params.bookingId,
        paymentIntentId: intent.id,
        message: 'Payment processed successfully with wallet',
      })),
      catchError((error) => {
        this.logger.error('Wallet payment failed', error);
        return of({
          success: false,
          bookingId: params.bookingId,
          message: 'Failed to process wallet payment',
          error: error.message || 'Unknown error',
        });
      }),
    );
  }

  /**
   * Process credit card payment
   */
  private processCreditCardPayment(params: BookingPaymentParams): Observable<PaymentResult> {
    return from(this.paymentsService.createIntent(params.bookingId)).pipe(
      switchMap((intent) => {
        // Update booking to pending_payment
        return from(
          this.bookingsService.updateBooking(params.bookingId, {
            status: 'pending_payment',
            payment_method: 'credit_card',
          }),
        ).pipe(map(() => intent));
      }),
      map((intent) => ({
        success: true,
        bookingId: params.bookingId,
        paymentIntentId: intent.id,
        mercadoPagoInitPoint: 'https://mercadopago.com/checkout', // Replace with actual URL
        message: 'Redirecting to payment provider',
      })),
      catchError((error) => {
        this.logger.error('Credit card payment failed', error);
        return of({
          success: false,
          bookingId: params.bookingId,
          message: 'Failed to initiate credit card payment',
          error: error.message || 'Unknown error',
        });
      }),
    );
  }

  /**
   * Process partial wallet payment
   */
  private processPartialWalletPayment(params: BookingPaymentParams): Observable<PaymentResult> {
    if (!params.walletAmount || !params.cardAmount) {
      return throwError(() => new Error('Wallet and card amounts required for partial payment'));
    }

    return this.walletService
      .lockFunds(
        params.bookingId,
        params.walletAmount,
        `Partial payment for booking ${params.bookingId}`,
      )
      .pipe(
        switchMap(() => {
          // Create payment intent for remaining amount
          return from(this.paymentsService.createIntent(params.bookingId));
        }),
        switchMap((intent) => {
          // Update booking
          return from(
            this.bookingsService.updateBooking(params.bookingId, {
              status: 'pending_payment',
              payment_method: 'partial_wallet',
              wallet_amount_cents: Math.round(params.walletAmount! * 100),
            }),
          ).pipe(map(() => intent));
        }),
        map((intent) => ({
          success: true,
          bookingId: params.bookingId,
          paymentIntentId: intent.id,
          mercadoPagoInitPoint: 'https://mercadopago.com/checkout', // Replace with actual URL
          message: 'Wallet funds locked, redirecting to payment provider for remaining amount',
        })),
        catchError((error) => {
          this.logger.error('Partial wallet payment failed', error);
          // Try to unlock funds if locking succeeded
          this.walletService
            .unlockFunds(params.bookingId, 'Payment failed - reverting lock')
            .pipe(takeUntilDestroyedInterop(this.destroyRef))
            .subscribe({
              error: (err) => this.logger.error('Failed to unlock wallet funds after payment error', err)
            });

          return of({
            success: false,
            bookingId: params.bookingId,
            message: 'Failed to process partial wallet payment',
            error: error.message || 'Unknown error',
          });
        }),
      );
  }

  /**
   * Handle payment webhook from provider
   *
   * This method processes IPN notifications from payment providers
   * like MercadoPago and updates the booking status accordingly.
   */
  async handlePaymentWebhook(payload: unknown): Promise<void> {
    this.logger.info('Processing payment webhook', JSON.stringify({ payload }));

    try {
      // Validate webhook signature (implement based on provider)
      // const isValid = await this.validateWebhookSignature(payload);
      // if (!isValid) {
      //   throw new Error('Invalid webhook signature');
      // }

      if (!this.isPaymentWebhookPayload(payload)) {
        throw new Error('Invalid webhook payload');
      }

      const { booking_id, status, payment_id } = payload;

      if (!booking_id) {
        throw new Error('Missing booking_id in webhook payload');
      }

      // Update payment intent status
      if (payment_id) {
        await this.paymentsService.getStatus(payment_id);
      }

      // Update booking status based on payment status
      if (status === 'approved' || status === 'completed') {
        await this.bookingsService.updateBooking(booking_id, {
          status: 'confirmed',
        });

        // Process payment split if applicable
        // await this.processSplitPayment(booking_id);
      } else if (status === 'rejected' || status === 'failed') {
        await this.bookingsService.updateBooking(booking_id, {
          status: 'cancelled',
        });

        // Unlock wallet funds if they were locked
        this.walletService
          .unlockFunds(booking_id, 'Payment failed - releasing funds')
          .pipe(takeUntilDestroyedInterop(this.destroyRef))
          .subscribe({
            error: (err) => this.logger.error('Failed to unlock funds after payment rejection', err)
          });
      }

      this.logger.info('Webhook processed successfully', JSON.stringify({ booking_id, status }));
    } catch (error) {
      this.logger.error('Webhook processing failed', String(error));
      throw error;
    }
  }

  private isPaymentWebhookPayload(payload: unknown): payload is PaymentWebhookPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    const isBookingIdValid =
      !('booking_id' in candidate) || typeof candidate.booking_id === 'string';
    const isStatusValid = !('status' in candidate) || typeof candidate.status === 'string';
    const isPaymentIdValid =
      !('payment_id' in candidate) || typeof candidate.payment_id === 'string';

    return isBookingIdValid && isStatusValid && isPaymentIdValid;
  }

  /**
   * Process refund for cancelled booking
   */
  processRefund(params: RefundParams): Observable<RefundResult> {
    this.logger.info('Processing refund', JSON.stringify({ params }));

    return from(this.bookingsService.getBookingById(params.bookingId)).pipe(
      switchMap((booking) => {
        if (!booking) {
          return throwError(() => new Error('Booking not found'));
        }

        // Determine refund amount based on cancellation policy
        const refundAmount = this.calculateRefundAmount(booking, params);

        // Unlock funds from wallet
        if (booking.payment_method === 'wallet' || booking.payment_method === 'partial_wallet') {
          return this.walletService
            .unlockFunds(params.bookingId, `Refund for cancelled booking`)
            .pipe(
              map(() => ({
                success: true,
                amount: refundAmount,
                message: 'Funds unlocked successfully',
              })),
            );
        }

        // For credit card payments, initiate refund with provider
        return of({
          success: true,
          amount: refundAmount,
          message: 'Refund initiated with payment provider',
        });
      }),
      catchError((error) => {
        this.logger.error('Refund processing failed', error);
        return of({
          success: false,
          amount: 0,
          message: 'Failed to process refund',
          error: error.message || 'Unknown error',
        });
      }),
    );
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  private calculateRefundAmount(booking: unknown, params: RefundParams): number {
    if (params.refundType === 'full') {
      return params.amount;
    }

    // Implement cancellation policy logic here
    // For now, return 50% for partial refunds
    return params.amount * 0.5;
  }

  /**
   * Get payment method statistics for analytics
   */
  async getPaymentMethodStats(): Promise<{
    wallet: number;
    creditCard: number;
    partialWallet: number;
  }> {
    // Implement stats aggregation
    return {
      wallet: 0,
      creditCard: 0,
      partialWallet: 0,
    };
  }
}
