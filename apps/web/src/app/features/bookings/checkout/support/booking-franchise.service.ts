import { inject, Injectable } from '@angular/core';
import { BucketType } from '@core/models/fgo-v1-1.model';
import { Booking } from '../../../../core/models';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';

export interface FranchiseInfo {
  bucket: BucketType;
  estimatedCarValueUsd: number;
  standardDeductibleUsd: number;
  rolloverDeductibleUsd: number;
  walletCreditUsd: number;
  holdMinimumArs: number;
}

/**
 * Result of deposit calculation with subscription coverage
 */
export interface DepositWithSubscriptionResult {
  depositRequiredUsd: number;           // Amount user must pay
  coveredBySubscriptionUsd: number;     // Amount covered by subscription
  franchiseUsd: number;                 // Original franchise amount
  coverageType: 'full_subscription' | 'partial_subscription' | 'none';
  subscriptionId?: string;
  subscriptionBalanceUsd?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookingFranchiseService {
  private readonly subscriptionService = inject(SubscriptionService);

  private readonly bucketThresholds: Array<{ maxValue: number; bucket: BucketType }> = [
    { maxValue: 10_000, bucket: 'economy' },
    { maxValue: 20_000, bucket: 'default' },
    { maxValue: 40_000, bucket: 'premium' },
    { maxValue: Number.POSITIVE_INFINITY, bucket: 'luxury' },
  ];

  private readonly standardFranchiseUsd: Record<BucketType, number> = {
    economy: 500,
    default: 800,
    premium: 1200,
    luxury: 1800,
  };

  private readonly holdMinimumArs: Record<BucketType, number> = {
    economy: 600_000,
    default: 800_000,
    premium: 1_200_000,
    luxury: 1_700_000, // tomar punto medio sugerido
  };

  determineBucket(booking: Booking): BucketType {
    const nightlyRateCents =
      booking.breakdown?.nightly_rate_cents ??
      booking.nightly_rate_cents ??
      booking.rental_amount_cents ??
      0;

    const nightlyRateUsd = nightlyRateCents / 100;
    const estimatedValueUsd = this.estimateCarValueUsd(nightlyRateUsd);

    const match = this.bucketThresholds.find(
      (threshold) => estimatedValueUsd <= threshold.maxValue,
    );
    return match?.bucket ?? 'default';
  }

  getFranchiseForBooking(booking: Booking): FranchiseInfo {
    const bucket = this.determineBucket(booking);
    const nightlyRateCents =
      booking.breakdown?.nightly_rate_cents ??
      booking.nightly_rate_cents ??
      booking.rental_amount_cents ??
      0;

    const nightlyRateUsd = nightlyRateCents / 100;
    const estimatedValueUsd = this.estimateCarValueUsd(nightlyRateUsd);
    const standard = this.standardFranchiseUsd[bucket];
    const rollover = standard * 2;

    const walletCredit = estimatedValueUsd <= 20_000 ? 300 : 500;

    return {
      bucket,
      estimatedCarValueUsd: estimatedValueUsd,
      standardDeductibleUsd: standard,
      rolloverDeductibleUsd: rollover,
      walletCreditUsd: walletCredit,
      holdMinimumArs: this.holdMinimumArs[bucket],
    };
  }

  private estimateCarValueUsd(nightlyRateUsd: number): number {
    if (!nightlyRateUsd || nightlyRateUsd <= 0) {
      return 12_500; // fallback autos económicos
    }

    const multiplier = 125;
    return Math.round(nightlyRateUsd * multiplier);
  }

  /**
   * Calculate deposit amount considering Autorentar Club subscription coverage.
   *
   * Implements hybrid coverage model:
   * - Full coverage: saldo >= franquicia -> deposit = $0
   * - Partial coverage: saldo < franquicia -> deposit = franquicia - saldo
   * - No coverage: sin suscripción -> deposit = franquicia completa
   *
   * @param booking - The booking to calculate deposit for
   * @returns Promise with deposit calculation including subscription coverage
   */
  async calculateDepositWithSubscription(booking: Booking): Promise<DepositWithSubscriptionResult> {
    const franchise = this.getFranchiseForBooking(booking);
    const franchiseCents = franchise.standardDeductibleUsd * 100;

    // Check subscription coverage
    const coverage = await this.subscriptionService.checkCoverage(franchiseCents);

    // No coverage: full deposit required
    if (!coverage.has_coverage || coverage.coverage_type === 'none') {
      return {
        depositRequiredUsd: franchise.standardDeductibleUsd,
        coveredBySubscriptionUsd: 0,
        franchiseUsd: franchise.standardDeductibleUsd,
        coverageType: 'none'
      };
    }

    const coveredUsd = coverage.covered_cents / 100;
    const uncoveredUsd = coverage.uncovered_cents / 100;

    // Full coverage: no deposit needed
    if (coverage.coverage_type === 'full') {
      return {
        depositRequiredUsd: 0,
        coveredBySubscriptionUsd: franchise.standardDeductibleUsd,
        franchiseUsd: franchise.standardDeductibleUsd,
        coverageType: 'full_subscription',
        subscriptionId: coverage.subscription_id ?? undefined,
        subscriptionBalanceUsd: coverage.available_cents / 100
      };
    }

    // Partial coverage: user pays the difference
    return {
      depositRequiredUsd: uncoveredUsd,
      coveredBySubscriptionUsd: coveredUsd,
      franchiseUsd: franchise.standardDeductibleUsd,
      coverageType: 'partial_subscription',
      subscriptionId: coverage.subscription_id ?? undefined,
      subscriptionBalanceUsd: coverage.available_cents / 100
    };
  }

  /**
   * Get franchise info with subscription coverage for display in UI
   */
  async getFranchiseWithCoverage(booking: Booking): Promise<FranchiseInfo & DepositWithSubscriptionResult> {
    const franchise = this.getFranchiseForBooking(booking);
    const depositResult = await this.calculateDepositWithSubscription(booking);

    return {
      ...franchise,
      ...depositResult
    };
  }
}
