import { Injectable, inject } from '@angular/core';
import { getRequiredTierByVehicleValue, SubscriptionTier } from '@core/models/subscription.model';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FranchiseTableService } from '@core/services/payments/franchise-table.service';
import { SubscriptionPolicyService } from './subscription-policy.service';

export interface DynamicRiskCalculation {
  // Guarantee
  guaranteeAmountUsd: number;
  guaranteeAmountArs: number;
  guaranteeType: 'hold' | 'security_credit';

  // Logic Traceability (Why?)
  appliedTier: SubscriptionTier;
  isSubscriber: boolean;
  discountApplied: boolean;
  eligibilityReason?: string; // If discount denied, why?

  // Car Specs
  carValueUsd: number;
  hasTelemetry: boolean;

  fxRate: number;
}

@Injectable({
  providedIn: 'root',
})
export class DynamicRiskCalculatorService {
  private readonly franchiseService = inject(FranchiseTableService);
  private readonly logger = inject(LoggerService);
  private readonly policyService = inject(SubscriptionPolicyService);
  private readonly supabase = inject(SupabaseClientService);

  /**
   * Calculates risk using the Dynamic Policy Engine (DB-driven)
   */
  async calculateRisk(
    carValueUsd: number,
    hasTelemetry: boolean,
    fxRate: number,
    userId?: string,
    userTier?: SubscriptionTier | null,
  ): Promise<DynamicRiskCalculation> {
    // 1. Determine Required Tier (e.g. 'club_luxury' for $50k car)
    const requiredTier = getRequiredTierByVehicleValue(carValueUsd);

    // 2. Load Policy for that Tier (from DB)
    const policy = await this.policyService.getPolicy(requiredTier);

    // Fallback if policy not found in DB yet (Safety net)
    if (!policy) {
      this.logger.warn(`Policy not found for ${requiredTier}, using fallback.`, 'DynamicRiskCalculatorService');
      return this.calculateFallback(carValueUsd, fxRate);
    }

    let guaranteeAmountUsd = policy.base_guarantee_usd; // Default: Full Price
    let discountApplied = false;
    let eligibilityReason = 'Usuario no suscrito o nivel insuficiente.';

    // 3. Check Eligibility for Discount
    if (userId && userTier) {
      // Logic: Does user have ENOUGH tier?
      // Simplified: We assume user must have at least the requiredTier or higher.
      // (Hierarchy logic is in model utils, we can reuse or simplify here)
      // For MVP V2, let's say if you are 'club_standard' you only get discounts on 'club_standard' cars.

      const eligibility = await this.policyService.checkEligibility(userId, policy, hasTelemetry);

      if (eligibility.eligible) {
        guaranteeAmountUsd = policy.reduced_guarantee_usd;
        discountApplied = true;
        eligibilityReason = 'Beneficio activo.';
      } else {
        eligibilityReason = eligibility.reason || 'No cumple criterios de riesgo.';
      }
    } else if (userId && !userTier) {
      eligibilityReason = 'Usuario sin suscripción activa.';
    }

    return {
      guaranteeAmountUsd,
      guaranteeAmountArs: Math.round(guaranteeAmountUsd * fxRate),
      guaranteeType: 'security_credit', // We standardized on "Liquid Guarantee" model
      appliedTier: requiredTier,
      isSubscriber: !!userTier,
      discountApplied,
      eligibilityReason,
      carValueUsd,
      hasTelemetry,
      fxRate,
    };
  }

  private calculateFallback(value: number, fx: number): DynamicRiskCalculation {
    // Conservative fallback
    const amount = value * 0.05; // 5% classic rule
    return {
      guaranteeAmountUsd: amount,
      guaranteeAmountArs: amount * fx,
      guaranteeType: 'security_credit',
      appliedTier: 'club_standard',
      isSubscriber: false,
      discountApplied: false,
      carValueUsd: value,
      hasTelemetry: false,
      fxRate: fx,
      eligibilityReason: 'System Offline Fallback',
    };
  }
}
