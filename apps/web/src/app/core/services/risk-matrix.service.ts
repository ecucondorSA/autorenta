import { Injectable } from '@angular/core';

type RiskBucket = 'economy' | 'default' | 'premium' | 'luxury';

type RiskPolicy = {
  bucket: RiskBucket;
  car_value_min: number;
  car_value_max: number;
  standard_franchise_usd: number;
  rollover_franchise_multiplier: number;
  hold_min_ars: number;
  hold_rollover_multiplier: number;
  security_credit_usd: number;
};

type RiskPolicyBand = {
  bucket: RiskBucket;
  minValueUsd: number;
  maxValueUsd: number;
  standardFranchiseUsd: number;
  minHoldArs: number;
};

@Injectable({
  providedIn: 'root',
})
export class RiskMatrixService {
  private static readonly ROLLOVER_MULTIPLIER = 2;
  private static readonly HOLD_ROLLOVER_MULTIPLIER = 0.35;

  private static readonly BANDS: RiskPolicyBand[] = [
    {
      bucket: 'economy',
      minValueUsd: 0,
      maxValueUsd: 10_000,
      standardFranchiseUsd: 500,
      minHoldArs: 600_000,
    },
    {
      bucket: 'default',
      minValueUsd: 10_001,
      maxValueUsd: 20_000,
      standardFranchiseUsd: 800,
      minHoldArs: 800_000,
    },
    {
      bucket: 'premium',
      minValueUsd: 20_001,
      maxValueUsd: 40_000,
      standardFranchiseUsd: 1_200,
      minHoldArs: 1_200_000,
    },
    {
      bucket: 'luxury',
      minValueUsd: 40_001,
      maxValueUsd: Number.POSITIVE_INFINITY,
      standardFranchiseUsd: 1_800,
      minHoldArs: 1_500_000,
    },
  ];

  /**
   * Devuelve la política de riesgo para el valor estimado del vehículo.
   * Mantiene la firma async para no romper llamados existentes.
   */
  async getRiskPolicy(carValueUsd: number): Promise<RiskPolicy> {
    const band =
      RiskMatrixService.BANDS.find(b => carValueUsd >= b.minValueUsd && carValueUsd <= b.maxValueUsd) ??
      RiskMatrixService.BANDS[RiskMatrixService.BANDS.length - 1];

    const standard = band.standardFranchiseUsd;
    const securityCredit = carValueUsd <= 20_000 ? 300 : 500;

    return {
      bucket: band.bucket,
      car_value_min: band.minValueUsd,
      car_value_max: band.maxValueUsd === Number.POSITIVE_INFINITY ? carValueUsd : band.maxValueUsd,
      standard_franchise_usd: standard,
      rollover_franchise_multiplier: RiskMatrixService.ROLLOVER_MULTIPLIER,
      hold_min_ars: band.minHoldArs,
      hold_rollover_multiplier: RiskMatrixService.HOLD_ROLLOVER_MULTIPLIER,
      security_credit_usd: securityCredit,
    };
  }

  calculateFranchise(policy: RiskPolicy): { standard: number; rollover: number } {
    const standard = policy.standard_franchise_usd;
    const rollover = standard * policy.rollover_franchise_multiplier;
    return { standard, rollover };
  }

  calculateGuarantee(
    policy: RiskPolicy,
    fxRate: number,
    hasCard: boolean
  ): { hold?: number; securityCredit?: number } {
    if (hasCard) {
      const rolloverDeductible = this.calculateFranchise(policy).rollover;
      const hold = Math.max(
        policy.hold_min_ars,
        rolloverDeductible * policy.hold_rollover_multiplier * fxRate
      );
      return { hold };
    }

    return { securityCredit: policy.security_credit_usd };
  }
}
