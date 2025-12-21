import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Booking } from '../../../../core/models';
import { BookingPaymentMethod } from '@core/models/wallet.model';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { PaymentsService } from '@core/services/payments/payments.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { CheckoutStateService } from '../state/checkout-state.service';
import {
  MercadoPagoBookingGateway,
  type MercadoPagoPreferenceResponse,
} from '../support/mercadopago-booking.gateway';
import { CheckoutRiskCalculator } from '../support/risk-calculator';

export type CheckoutPaymentOutcome =
  | { kind: 'wallet_success'; bookingId: string }
  | { kind: 'redirect_to_mercadopago'; initPoint: string; preferenceId: string; bookingId: string };

@Injectable()
export class CheckoutPaymentService {
  private readonly logger;

  constructor(
    private readonly state: CheckoutStateService,
    private readonly wallet: WalletService,
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
    private readonly router: Router,
    private readonly mpGateway: MercadoPagoBookingGateway,
    private readonly riskCalculator: CheckoutRiskCalculator,
    private readonly fgoService: FgoV1_1Service,
    private readonly loggerService: LoggerService,
  ) {
    this.logger = this.loggerService.createChildLogger('CheckoutPaymentService');
  }

  async processPayment(): Promise<CheckoutPaymentOutcome> {
    const booking = this.state.getBooking();
    const bookingId = this.state.getBookingId();

    if (!booking || !bookingId) {
      throw new Error('No hay una reserva válida para procesar el pago.');
    }

    const method = this.state.getPaymentMethod();

    switch (method) {
      case 'wallet':
        return this.payWithWallet(booking);
      case 'partial_wallet':
        return this.payWithPartialWallet(booking);
      case 'credit_card':
      default:
        return this.payWithCreditCard(booking);
    }
  }

  private async payWithWallet(booking: Booking): Promise<CheckoutPaymentOutcome> {
    const bookingId = booking.id;
    const depositUsd = this.state.getDepositUsd();
    const rentalAmount = booking.total_amount;

    const lock = await firstValueFrom(
      this.wallet.lockRentalAndDeposit(bookingId, rentalAmount, depositUsd),
    );

    if (!lock.success) {
      throw new Error(lock.message ?? 'No se pudo bloquear la garantía en wallet');
    }

    try {
      await this.bookings.updateBooking(bookingId, {
        payment_method: 'wallet',
        rental_amount_cents: Math.round(rentalAmount * 100),
        deposit_amount_cents: Math.round(depositUsd * 100),
        rental_lock_transaction_id: lock.rental_lock_transaction_id,
        deposit_lock_transaction_id: lock.deposit_lock_transaction_id,
        deposit_status: 'locked',
        status: 'confirmed',
      });

      await this.bookings.recalculatePricing(bookingId);

      this.state.setStatus('paid_with_wallet');
      this.state.setMessage('Pago confirmado con wallet. Redirigiendo al detalle de tu reserva.');

      this.scheduleRiskSnapshot(booking, 'wallet').catch((_err) => {
        // Silent error - risk snapshot is non-critical
      });

      await this.router.navigate(['/bookings', bookingId]);

      return { kind: 'wallet_success', bookingId };
    } catch (_error) {
      await this.safeUnlockWallet(bookingId, 'Reversión por error en checkout (wallet)');
      throw _error instanceof Error
        ? _error
        : new Error('Error inesperado al actualizar la reserva.');
    }
  }

  private async payWithCreditCard(booking: Booking): Promise<CheckoutPaymentOutcome> {
    const bookingId = booking.id;

    const intent = await this.payments.createIntent(bookingId);
    this.state.setStatus(intent.status);

    await this.bookings.updateBooking(bookingId, {
      payment_method: 'credit_card',
      wallet_amount_cents: 0,
      deposit_amount_cents: Math.round(this.state.getDepositUsd() * 100),
    });

    await this.bookings.recalculatePricing(bookingId);

    this.state.setMessage('Redirigiendo a Mercado Pago...');

    const preference = await this.requestPreferenceOrThrow(bookingId);
    this.state.setStatus('redirecting_to_mercadopago');

    this.scheduleRiskSnapshot(booking, 'credit_card').catch((_err) => {
      // Silent error - risk snapshot is non-critical
    });

    return {
      kind: 'redirect_to_mercadopago',
      initPoint: preference.initPoint,
      preferenceId: preference.preferenceId,
      bookingId,
    };
  }

  private async payWithPartialWallet(booking: Booking): Promise<CheckoutPaymentOutcome> {
    const bookingId = booking.id;
    const split = this.state.getWalletSplit();
    const walletAmount = Math.max(0, Number(split.wallet ?? 0));
    const cardAmount = Math.max(0, Number(split.card ?? 0));

    if (walletAmount <= 0) {
      throw new Error('Seleccioná un monto a bloquear de tu wallet mayor a 0.');
    }

    if (cardAmount <= 0) {
      throw new Error('El monto restante en tarjeta debe ser mayor a 0 para pago mixto.');
    }

    const depositUsd = this.state.getDepositUsd();
    let walletLocked = false;

    try {
      const lockResult = await firstValueFrom(
        this.wallet.lockFunds(
          bookingId,
          walletAmount,
          `Pago parcial Autorentar (${bookingId.slice(0, 8)})`,
        ),
      );

      if (!lockResult.success) {
        throw new Error(lockResult.message ?? 'No se pudo bloquear fondos en tu wallet.');
      }

      walletLocked = true;

      const intent = await this.payments.createIntent(bookingId);
      this.state.setStatus(intent.status);

      await this.bookings.updateBooking(bookingId, {
        status: 'pending_payment',
        payment_method: 'partial_wallet',
        wallet_amount_cents: Math.round(walletAmount * 100),
        wallet_status: 'locked',
        wallet_lock_transaction_id: lockResult.transaction_id ?? undefined,
        payment_intent_id: intent.id,
        deposit_amount_cents: Math.round(depositUsd * 100),
      });

      await this.bookings.recalculatePricing(bookingId);

      const preference = await this.requestPreferenceOrThrow(bookingId);

      const walletText = this.formatUsd(walletAmount);
      const cardText = this.formatUsd(cardAmount);

      this.state.setStatus('redirecting_to_mercadopago');
      this.state.setMessage(
        `${walletText} bloqueados de tu wallet. Redirigiendo a Mercado Pago para pagar ${cardText}...`,
      );

      this.scheduleRiskSnapshot(booking, 'partial_wallet').catch((_err) => {
        // Silently ignore risk snapshot errors
      });

      return {
        kind: 'redirect_to_mercadopago',
        initPoint: preference.initPoint,
        preferenceId: preference.preferenceId,
        bookingId,
      };
    } catch (_error) {
      if (walletLocked) {
        await this.safeUnlockWallet(bookingId, 'Reversión pago parcial fallido');
      }

      try {
        await this.bookings.updateBooking(bookingId, {
          status: 'pending',
          payment_method: booking.payment_method ?? null,
          wallet_amount_cents: booking.wallet_amount_cents ?? undefined,
          wallet_status: booking.wallet_status ?? 'none',
          wallet_lock_transaction_id: booking.wallet_lock_transaction_id ?? undefined,
          payment_intent_id: booking.payment_intent_id ?? undefined,
        });
      } catch {
        // Silently ignore rollback errors
      }

      throw _error instanceof Error
        ? _error
        : new Error('No pudimos completar el pago mixto. Intentá nuevamente.');
    }
  }

  private async requestPreferenceOrThrow(
    bookingId: string,
  ): Promise<MercadoPagoPreferenceResponse> {
    try {
      return await this.mpGateway.createPreference(bookingId);
    } catch (_error) {
      if (this.isOwnerOnboardingError(_error)) {
        this.handleOwnerOnboardingBlock(_error);
      }

      throw _error instanceof Error
        ? _error
        : new Error('No pudimos iniciar el pago con Mercado Pago.');
    }
  }

  private isOwnerOnboardingError(
    error: unknown,
  ): error is Error & { code?: string; meta?: unknown } {
    return (
      !!error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'OWNER_ONBOARDING_REQUIRED'
    );
  }

  private handleOwnerOnboardingBlock(_error: Error & { code?: string; meta?: unknown }): never {
    const message =
      _error.message ||
      'El propietario todavía no completó la vinculación de Mercado Pago. Tu reserva quedará pendiente y te avisaremos cuando pueda cobrar.';
    this.state.setStatus('owner_onboarding_blocked');
    this.state.setMessage(message);
    throw _error;
  }

  private async scheduleRiskSnapshot(
    booking: Booking,
    method: BookingPaymentMethod,
  ): Promise<void> {
    const bucket = this.state.getBucket();
    if (!bucket) {
      return;
    }

    const franchise = this.state.getFranchiseInfo();
    if (!franchise) {
      return;
    }

    const guarantee = this.riskCalculator.calculateGuarantee({
      booking,
      franchise,
      fxSnapshot: this.state.getFxSnapshot(),
      paymentMethod: method,
      walletSplit: this.state.getWalletSplit(),
    });

    const request$ = this.fgoService
      .createRiskSnapshot({
        bookingId: booking.id,
        countryCode: 'AR',
        bucket,
        fxSnapshot: this.state.getFxSnapshot(),
        currency: booking.currency as 'USD' | 'ARS',
        estimatedHoldAmount: guarantee.holdUsd,
        estimatedDeposit: guarantee.creditSecurityUsd,
        franchiseUsd: guarantee.franchiseStandardUsd,
        hasCard: method === 'credit_card' || method === 'partial_wallet',
        hasWalletSecurity: method === 'wallet' || method === 'partial_wallet',
      })
      .pipe(
        timeout({ each: 10_000 }),
        catchError((_error) => {
          return of(null);
        }),
      );

    await firstValueFrom(request$);
  }

  /**
   * Unlock wallet funds with retry logic and proper error handling
   *
   * ✅ P0-002 FIX: Wallet unlock con retry automático y alertas
   *
   * Features:
   * - 3 retry attempts con exponential backoff (1s, 2s, 4s)
   * - Logging detallado de cada intento
   * - Alertas críticas a Sentry si falla completamente
   * - Registro en DB para background job retry
   *
   * @param bookingId - ID de la reserva
   * @param reason - Razón del unlock
   */
  private async safeUnlockWallet(bookingId: string, reason: string): Promise<void> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Attempting wallet unlock (attempt ${attempt}/${maxRetries})`, {
          bookingId,
          reason,
          attempt,
        });

        await firstValueFrom(this.wallet.unlockFunds(bookingId, reason));

        this.logger.info('Wallet unlocked successfully', {
          bookingId,
          reason,
          attempt,
          totalAttempts: attempt,
        });

        return; // ✅ Success - exit
      } catch (error) {
        lastError = error;

        this.logger.warn(`Wallet unlock failed (attempt ${attempt}/${maxRetries})`, {
          bookingId,
          reason,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        // Si no es el último intento, esperar con exponential backoff
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await this.delay(delayMs);
        }
      }
    }

    // ❌ Si llegamos aquí, fallaron todos los reintentos
    await this.handleUnlockFailure(bookingId, reason, lastError);
  }

  /**
   * Handle critical wallet unlock failure after all retries exhausted
   *
   * Actions:
   * 1. Log critical error to Sentry
   * 2. Create payment issue record in DB for manual review
   * 3. Attempt to schedule background retry job
   *
   * @param bookingId - ID de la reserva
   * @param reason - Razón del unlock
   * @param error - Error que causó el fallo
   */
  private async handleUnlockFailure(
    bookingId: string,
    reason: string,
    error: unknown,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 1. ❌ CRITICAL LOG - Alerta a Sentry con máxima prioridad
    this.logger.critical(
      'CRITICAL: Wallet unlock failed completely after all retries',
      error instanceof Error ? error : new Error(`Wallet unlock failed: ${errorMessage}`),
    );

    // 2. Log detallado para debugging
    this.logger.error('Wallet unlock failure details', {
      bookingId,
      reason,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      impact: 'FUNDS_LOCKED',
      userImpact: 'User funds may be permanently locked',
      actionRequired: 'IMMEDIATE_MANUAL_INTERVENTION',
    });

    // 3. Guardar en tabla payment_issues para background retry
    try {
      await this.bookings.createPaymentIssue({
        booking_id: bookingId,
        issue_type: 'wallet_unlock_failed',
        severity: 'critical',
        description: `Failed to unlock wallet funds after ${3} retry attempts`,
        metadata: {
          reason,
          error: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString(),
          retry_count: 3,
        },
        status: 'pending_review',
      });

      this.logger.info('Payment issue created for manual review', {
        bookingId,
        issueType: 'wallet_unlock_failed',
      });
    } catch (issueError) {
      // Si falla la creación de issue, al menos logueamos
      this.logger.error('Failed to create payment issue record', {
        bookingId,
        originalError: errorMessage,
        issueCreationError: issueError instanceof Error ? issueError.message : String(issueError),
      });
    }

    // ⚠️ NO lanzamos error porque no queremos bloquear el flujo principal
    // El usuario ya vio el error del pago/cancelación
    // El equipo de soporte recibirá la alerta de Sentry
  }

  /**
   * Utility: Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatUsd(amount: number): string {
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }
}
