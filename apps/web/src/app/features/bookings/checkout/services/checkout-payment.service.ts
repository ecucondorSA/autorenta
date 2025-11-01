import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CheckoutStateService } from '../state/checkout-state.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { PaymentsService } from '../../../../core/services/payments.service';
import { BookingsService } from '../../../../core/services/bookings.service';
import { BookingPaymentMethod } from '../../../../core/models/wallet.model';
import {
  MercadoPagoBookingGateway,
  type MercadoPagoPreferenceResponse,
} from '../support/mercadopago-booking.gateway';
import { CheckoutRiskCalculator } from '../support/risk-calculator';
import { FgoV1_1Service } from '../../../../core/services/fgo-v1-1.service';
import { Booking } from '../../../../core/models';

export type CheckoutPaymentOutcome =
  | { kind: 'wallet_success'; bookingId: string }
  | { kind: 'redirect_to_mercadopago'; initPoint: string; preferenceId: string; bookingId: string };

@Injectable()
export class CheckoutPaymentService {
  constructor(
    private readonly state: CheckoutStateService,
    private readonly wallet: WalletService,
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
    private readonly router: Router,
    private readonly mpGateway: MercadoPagoBookingGateway,
    private readonly riskCalculator: CheckoutRiskCalculator,
    private readonly fgoService: FgoV1_1Service,
  ) {}

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

    const lock = await firstValueFrom(this.wallet.lockRentalAndDeposit(
      bookingId,
      rentalAmount,
      depositUsd,
    ));

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

      this.scheduleRiskSnapshot(booking, 'wallet').catch((err) => {
        console.error('[CheckoutPaymentService] Failed to schedule risk snapshot (wallet):', err);
      });

      await this.router.navigate(['/bookings', bookingId]);

      return { kind: 'wallet_success', bookingId };
    } catch (error) {
      await this.safeUnlockWallet(bookingId, 'Reversión por error en checkout (wallet)');
      throw error instanceof Error
        ? error
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

    this.scheduleRiskSnapshot(booking, 'credit_card').catch((err) => {
      console.error('[CheckoutPaymentService] Failed to schedule risk snapshot (credit_card):', err);
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
      const lockResult = await firstValueFrom(this.wallet.lockFunds(
        bookingId,
        walletAmount,
        `Pago parcial Autorentar (${bookingId.slice(0, 8)})`,
      ));

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

      this.scheduleRiskSnapshot(booking, 'partial_wallet').catch((err) => {});

      return {
        kind: 'redirect_to_mercadopago',
        initPoint: preference.initPoint,
        preferenceId: preference.preferenceId,
        bookingId,
      };
    } catch (error) {
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
      } catch (rollbackError) {}

      throw error instanceof Error
        ? error
        : new Error('No pudimos completar el pago mixto. Intentá nuevamente.');
    }
  }

  private async requestPreferenceOrThrow(
    bookingId: string,
  ): Promise<MercadoPagoPreferenceResponse> {
    try {
      return await this.mpGateway.createPreference(bookingId);
    } catch (error) {
      if (this.isOwnerOnboardingError(error)) {
        this.handleOwnerOnboardingBlock(error);
      }

      throw error instanceof Error
        ? error
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

  private handleOwnerOnboardingBlock(error: Error & { code?: string; meta?: unknown }): never {
    const message =
      error.message ||
      'El propietario todavía no completó la vinculación de Mercado Pago. Tu reserva quedará pendiente y te avisaremos cuando pueda cobrar.';
    this.state.setStatus('owner_onboarding_blocked');
    this.state.setMessage(message);
    throw error;
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
        catchError((error) => {
          return of(null);
        }),
      );

    await firstValueFrom(request$);
  }

  private async safeUnlockWallet(bookingId: string, reason: string): Promise<void> {
    try {
      await firstValueFrom(this.wallet.unlockFunds(
        bookingId,
        reason,
      ));
    } catch (unlockError) {}
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
