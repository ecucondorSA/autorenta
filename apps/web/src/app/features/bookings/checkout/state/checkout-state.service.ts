import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BookingPaymentMethod } from '@core/models/wallet.model';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { ExchangeRateService } from '@core/services/payments/exchange-rate.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { BucketType, FgoParameters } from '@core/models/fgo-v1-1.model';
import { Booking } from '../../../../core/models';
import {
  FranchiseInfo,
  BookingFranchiseService,
  DepositWithSubscriptionResult,
} from '../support/booking-franchise.service';
import { GuaranteeCopySummary, GuaranteeCopyBuilder } from '../support/guarantee-copy.builder';
import { CheckoutRiskCalculator, GuaranteeBreakdown } from '../support/risk-calculator';

@Injectable()
export class CheckoutStateService {
  private readonly subscriptionService = inject(SubscriptionService);

  private readonly bookingId = signal<string | null>(null);
  private readonly booking = signal<Booking | null>(null);
  private readonly fgoParams = signal<FgoParameters | null>(null);
  private readonly exchangeRate = signal<number | null>(null);
  private readonly paymentMethod = signal<BookingPaymentMethod>('credit_card');
  private readonly walletSplit = signal<{ wallet: number; card: number }>({ wallet: 0, card: 0 });

  // Subscription coverage state
  private readonly subscriptionCoverage = signal<DepositWithSubscriptionResult | null>(null);

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly status = signal<string>('requires_payment_method');
  readonly fgoLoading = signal(false);
  readonly fxLoading = signal(false);
  readonly subscriptionLoading = signal(false);

  readonly bookingSignal = this.booking.asReadonly();
  readonly statusSignal = this.status.asReadonly();
  readonly messageSignal = this.message.asReadonly();
  readonly paymentMethodSignal = this.paymentMethod.asReadonly();
  readonly walletSplitSignal = this.walletSplit.asReadonly();
  readonly loadingSignal = this.loading.asReadonly();
  readonly subscriptionCoverageSignal = this.subscriptionCoverage.asReadonly();

  // Computed signals for subscription coverage
  readonly hasSubscriptionCoverage = computed(() => {
    const coverage = this.subscriptionCoverage();
    return coverage !== null && coverage.coverageType !== 'none';
  });

  readonly isFullyCoveredBySubscription = computed(() => {
    const coverage = this.subscriptionCoverage();
    return coverage?.coverageType === 'full_subscription';
  });

  readonly subscriptionCoverageUsd = computed(() => {
    return this.subscriptionCoverage()?.coveredBySubscriptionUsd ?? 0;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly bookings: BookingsService,
    private readonly exchangeRates: ExchangeRateService,
    private readonly fgoService: FgoV1_1Service,
    private readonly franchiseTable: BookingFranchiseService,
    private readonly copyBuilder: GuaranteeCopyBuilder,
    private readonly riskCalculator: CheckoutRiskCalculator,
  ) {
    effect(() => {
      const booking = this.booking();
      if (!booking) {
        return;
      }

      // Sync selección con método real de la reserva si aún no hay override manual.
      if (
        this.paymentMethod() === 'credit_card' &&
        booking.payment_method &&
        booking.payment_method !== 'credit_card'
      ) {
        this.paymentMethod.set(booking.payment_method);
      }
    });
  }

  readonly bucket = computed<BucketType | null>(() => {
    const booking = this.booking();
    if (!booking) return null;
    return this.franchiseTable.determineBucket(booking);
  });

  readonly fxSnapshot = computed(() => this.exchangeRate() ?? 1);

  readonly franchise = computed(() => {
    const booking = this.booking();
    if (!booking) return null;
    return this.franchiseTable.getFranchiseForBooking(booking);
  });

  readonly guarantee = computed(() => {
    const booking = this.booking();
    const franchise = this.franchise();
    if (!booking || !franchise) return null;
    return this.riskCalculator.calculateGuarantee({
      booking,
      franchise,
      fxSnapshot: this.fxSnapshot(),
      paymentMethod: this.paymentMethod(),
      walletSplit: this.walletSplit(),
    });
  });

  readonly guaranteeCopy = computed(() => {
    const booking = this.booking();
    const guarantee = this.guarantee();
    if (!booking || !guarantee) return null;
    return this.copyBuilder.buildGuaranteeCopy(booking, guarantee);
  });

  readonly depositUsd = computed(() => {
    const booking = this.booking();
    if (!booking) return 0;

    // Check subscription coverage first
    const coverage = this.subscriptionCoverage();
    if (coverage) {
      // Return the deposit required after subscription coverage
      return coverage.depositRequiredUsd;
    }

    // Fallback to legacy calculation if subscription not loaded yet
    const depositFromBooking = this.getDepositFromBooking(booking);
    const recommended = this.recommendByNightlyRate(booking);
    const franchise = this.franchise();

    const walletFloor = (() => {
      if (!franchise) return 0;
      const method = this.paymentMethod();
      if (method === 'wallet' || method === 'partial_wallet') {
        return franchise.walletCreditUsd;
      }
      return 0;
    })();

    return Math.max(depositFromBooking, recommended, walletFloor);
  });

  readonly depositArs = computed(() => this.depositUsd() * this.fxSnapshot());

  getBooking(): Booking | null {
    return this.booking();
  }

  getBookingId(): string | null {
    return this.bookingId();
  }

  getPaymentMethod(): BookingPaymentMethod {
    return this.paymentMethod();
  }

  getDepositUsd(): number {
    return this.depositUsd();
  }

  getDepositArs(): number {
    return this.depositArs();
  }

  getBucket(): BucketType | null {
    return this.bucket();
  }

  getFgoParameters(): FgoParameters | null {
    return this.fgoParams();
  }

  getFxSnapshot(): number {
    return this.fxSnapshot();
  }

  getFranchiseInfo(): FranchiseInfo | null {
    return this.franchise();
  }

  getGuarantee(): GuaranteeBreakdown | null {
    return this.guarantee();
  }

  getGuaranteeCopy(): GuaranteeCopySummary | null {
    return this.guaranteeCopy();
  }

  getWalletSplit(): { wallet: number; card: number } {
    return this.walletSplit();
  }

  getSubscriptionCoverage(): DepositWithSubscriptionResult | null {
    return this.subscriptionCoverage();
  }

  setMessage(message: string | null): void {
    this.message.set(message);
  }

  setStatus(status: string): void {
    this.status.set(status);
  }

  setPaymentSelection(
    method: BookingPaymentMethod,
    walletAmount: number,
    cardAmount: number,
  ): void {
    this.paymentMethod.set(method);
    this.walletSplit.set({ wallet: walletAmount, card: cardAmount });
  }

  async initialize(): Promise<void> {
    const routeBookingId = this.route.snapshot.paramMap.get('bookingId');
    if (!routeBookingId) {
      this.message.set('Reserva no encontrada');
      return;
    }

    this.bookingId.set(routeBookingId);
    await this.loadBooking(routeBookingId);
    await Promise.all([
      this.loadFgoParameters(),
      this.loadExchangeRate(),
      this.loadSubscriptionCoverage(),
    ]);
  }

  private async loadBooking(bookingId: string): Promise<void> {
    try {
      this.loading.set(true);
      const booking = await this.bookings.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Reserva no encontrada');
      }

      this.booking.set(booking);
      if (booking.payment_method) {
        this.paymentMethod.set(booking.payment_method);
      }
    } catch {
      this.message.set('No pudimos cargar la reserva.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFgoParameters(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      this.fgoLoading.set(true);
      const bucket = this.franchiseTable.determineBucket(booking);
      const params = await firstValueFrom(this.fgoService.getParameters('AR', bucket));
      this.fgoParams.set(params);
    } catch {
      this.fgoParams.set(null);
    } finally {
      this.fgoLoading.set(false);
    }
  }

  private async loadExchangeRate(): Promise<void> {
    const booking = this.booking();
    if (!booking || booking.currency === 'USD') {
      this.exchangeRate.set(1);
      return;
    }

    try {
      this.fxLoading.set(true);
      const rate = await this.exchangeRates.getPlatformRate();
      this.exchangeRate.set(rate);
    } catch {
      this.exchangeRate.set(1);
    } finally {
      this.fxLoading.set(false);
    }
  }

  /**
   * Load subscription coverage for deposit calculation.
   * This determines how much of the deposit is covered by Autorentar Club.
   */
  private async loadSubscriptionCoverage(): Promise<void> {
    const booking = this.booking();
    if (!booking) {
      this.subscriptionCoverage.set(null);
      return;
    }

    try {
      this.subscriptionLoading.set(true);
      const coverage = await this.franchiseTable.calculateDepositWithSubscription(booking);
      this.subscriptionCoverage.set(coverage);
    } catch {
      // On error, fallback to no coverage (user pays full deposit)
      this.subscriptionCoverage.set(null);
    } finally {
      this.subscriptionLoading.set(false);
    }
  }

  private getDepositFromBooking(booking: Booking): number {
    const depositCents = booking.deposit_amount_cents ?? booking.breakdown?.deposit_cents ?? null;
    return depositCents ? depositCents / 100 : 0;
  }

  private recommendByNightlyRate(booking: Booking): number {
    const nightlyRateCents =
      booking.breakdown?.nightly_rate_cents ?? booking.nightly_rate_cents ?? null;
    if (!nightlyRateCents) {
      return 300;
    }
    const nightlyRate = nightlyRateCents / 100;

    if (nightlyRate < 80) return 300;
    if (nightlyRate < 120) return 400;
    if (nightlyRate < 180) return 600;
    return 900;
  }
}
