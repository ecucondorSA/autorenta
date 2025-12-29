import { Injectable } from '@angular/core';
import { Booking } from '../../../../core/models';
import { BucketType } from '@core/models/fgo-v1-1.model';

export interface FranchiseInfo {
  bucket: BucketType;
  estimatedCarValueUsd: number;
  standardDeductibleUsd: number;
  rolloverDeductibleUsd: number;
  walletCreditUsd: number;
  holdMinimumArs: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookingFranchiseService {
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
}
