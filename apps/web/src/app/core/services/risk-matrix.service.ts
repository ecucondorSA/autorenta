
import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({
  providedIn: 'root'
})
export class RiskMatrixService {

  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = inject(SupabaseClientService).getClient();
  }

  async getRiskPolicy(carValue: number): Promise<any> {
    const { data, error } = await this.supabase
      .from('risk_policy_AR')
      .select('*')
      .lte('car_value_min', carValue)
      .gte('car_value_max', carValue)
      .single();

    if (error) {
      console.error('Error fetching risk policy:', error);
      console.error('Table: risk_policy_AR, carValue:', carValue);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    return data;
  }

  calculateFranchise(policy: any): { standard: number; rollover: number } {
    const standard = policy.standard_franchise_usd;
    const rollover = standard * policy.rollover_franchise_multiplier;
    return { standard, rollover };
  }

  calculateGuarantee(policy: any, fxRate: number, hasCard: boolean): { hold?: number; securityCredit?: number } {
    if (hasCard) {
      const rolloverDeductible = this.calculateFranchise(policy).rollover;
      const hold = Math.max(policy.hold_min_ars, rolloverDeductible * policy.hold_rollover_multiplier * fxRate);
      return { hold };
    } else {
      return { securityCredit: policy.security_credit_usd };
    }
  }


}
