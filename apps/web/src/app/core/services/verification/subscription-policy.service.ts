import { Injectable, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { firstValueFrom, from, Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface SubscriptionPolicy {
  tier_id: string;
  price_monthly_usd: number;
  base_guarantee_usd: number;
  reduced_guarantee_usd: number;
  telemetry_required: boolean;
  min_clean_trips_required: number;
  max_gap_coverage_annual_usd: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionPolicyService {
  private readonly supabaseService = injectSupabase();

  // Cache policies in memory to avoid repeated DB calls
  private policiesCache = signal<Map<string, SubscriptionPolicy>>(new Map());
  private initialized = false;

  /**
   * Loads all subscription policies from DB
   */
  loadPolicies(): Observable<Map<string, SubscriptionPolicy>> {
    if (this.initialized) {
      return of(this.policiesCache());
    }

    return from(
      this.supabaseService.from('subscription_policies').select('*')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;

        const map = new Map<string, SubscriptionPolicy>();
        // Safe cast
        const rows = (data || []) as unknown as SubscriptionPolicy[];
        rows.forEach(row => map.set(row.tier_id, row));

        this.policiesCache.set(map);
        this.initialized = true;
        return map;
      }),
      shareReplay(1)
    );
  }

  /**
   * Get specific policy for a tier (sync if loaded, async if not)
   */
  async getPolicy(tierId: string): Promise<SubscriptionPolicy | undefined> {
    if (!this.initialized) {
      await firstValueFrom(this.loadPolicies());
    }
    return this.policiesCache().get(tierId);
  }

  /**
   * Check if a user is eligible for reduced guarantee based on policy
   */
  async checkEligibility(
    userId: string,
    policy: SubscriptionPolicy,
    carHasTelemetry: boolean
  ): Promise<{ eligible: boolean; reason?: string }> {

    // 1. Telemetry Check (The "Smart Car" Gate)
    if (policy.telemetry_required && !carHasTelemetry) {
      return { eligible: false, reason: 'El vehículo no cuenta con telemetría certificada.' };
    }

    // 2. Clean Trips Check (The "Reputation" Gate)
    if (policy.min_clean_trips_required > 0) {
      const { data: stats } = await this.supabaseService
        .from('user_risk_stats')
        .select('clean_trips_count, strikes_count')
        .eq('user_id', userId)
        .single();

      if (!stats) {
        // No stats yet = New User
        return { eligible: false, reason: `Requiere ${policy.min_clean_trips_required} viajes completados sin incidentes.` };
      }

      if (stats.strikes_count > 0) {
        return { eligible: false, reason: 'Beneficio suspendido por incidente previo ("Strike One").' };
      }

      if ((stats.clean_trips_count || 0) < policy.min_clean_trips_required) {
        return {
          eligible: false,
          reason: `Faltan ${policy.min_clean_trips_required - (stats.clean_trips_count || 0)} viajes para desbloquear beneficio.`
        };
      }
    }

    // 3. Aggregate Limit Check (The "Solvency" Gate)
    // TODO: Check user_risk_stats.gap_coverage_used_usd vs policy.max_gap_coverage_annual_usd

    return { eligible: true };
  }
}
