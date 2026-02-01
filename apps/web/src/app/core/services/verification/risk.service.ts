import { Injectable, inject } from '@angular/core';
import {
  BookingDetailRiskSnapshotDb,
  CalculateRiskSnapshotParams,
  CountryCode,
  CoverageUpgrade,
  PaymentMode,
  PricingBucketType,
  RiskSnapshot,
} from '@core/models/booking-detail-payment.model';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RiskCalculatorService } from './risk-calculator.service';

@Injectable({
  providedIn: 'root',
})
export class RiskService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly riskCalculator = inject(RiskCalculatorService);

  /**
   * Calculates a risk snapshot based on vehicle and market parameters
   */
  async calculateRiskSnapshot(params: CalculateRiskSnapshotParams): Promise<RiskSnapshot> {
    // We assume hasCard=true for the baseline snapshot calculation
    const calc = await this.riskCalculator.calculateRisk(
      params.vehicleValueUsd,
      params.fxRate,
      true,
    );

    const baseSnapshot: RiskSnapshot = {
      deductibleUsd: calc.standardFranchiseUsd,
      rolloverDeductibleUsd: calc.rolloverFranchiseUsd,
      holdEstimatedArs: calc.guaranteeAmountArs,
      holdEstimatedUsd: calc.guaranteeAmountUsd,
      creditSecurityUsd: calc.baseGuaranteeAmountUsd || 600,
      bucket: calc.bucket,
      vehicleValueUsd: params.vehicleValueUsd,
      country: params.country,
      fxRate: params.fxRate,
      calculatedAt: new Date(),
      coverageUpgrade: params.coverageUpgrade || 'standard',
    };

    // Apply coverage upgrade logic if needed
    if (params.coverageUpgrade && params.coverageUpgrade !== 'standard') {
      return this.recalculateWithUpgrade(baseSnapshot, params.coverageUpgrade);
    }

    return baseSnapshot;
  }

  /**
   * Persists the risk snapshot to the database
   */
  persistRiskSnapshot(
    bookingId: string,
    snapshot: RiskSnapshot,
    paymentMode: PaymentMode,
  ): Observable<{ ok: boolean; snapshotId?: string; error?: string }> {
    const dbRow: Partial<BookingDetailRiskSnapshotDb> = {
      booking_id: bookingId,
      country_code: snapshot.country,
      bucket: snapshot.bucket,
      fx_snapshot: snapshot.fxRate,
      currency: 'ARS', // Assuming ARS based on context
      estimated_hold_amount_ars: snapshot.holdEstimatedArs,
      estimated_credit_security_usd: snapshot.creditSecurityUsd,
      deductible_usd: snapshot.deductibleUsd,
      rollover_deductible_usd: snapshot.rolloverDeductibleUsd,
      payment_mode: paymentMode,
      coverage_upgrade: snapshot.coverageUpgrade,
      meta: {
        vehicle_value_usd: snapshot.vehicleValueUsd,
        rollover_deductible_usd: snapshot.rolloverDeductibleUsd,
      },
    };

    return from(
      this.supabase.from('booking_risk_snapshots').insert(dbRow).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        // Explicit cast to known DB shape to avoid 'any'
        const inserted = data as BookingDetailRiskSnapshotDb;
        return { ok: true, snapshotId: inserted?.id || bookingId };
      }),
      catchError((err: Error) => of({ ok: false, error: err.message })),
    );
  }

  /**
   * Retrieves a risk snapshot by booking ID
   */
  getRiskSnapshotByBookingId(
    bookingId: string,
  ): Observable<{ snapshot: RiskSnapshot | null; error?: string }> {
    return from(
      this.supabase.from('booking_risk_snapshots').select('*').eq('booking_id', bookingId).single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          // If not found, return null without error string usually, but spec says check error
          if (error.code === 'PGRST116') return { snapshot: null };
          throw error;
        }

        const row = data as BookingDetailRiskSnapshotDb;
        const snapshot: RiskSnapshot = {
          deductibleUsd: row.deductible_usd,
          rolloverDeductibleUsd: row.rollover_deductible_usd,
          holdEstimatedArs: row.estimated_hold_amount_ars || 0,
          holdEstimatedUsd: 0, // Calculated field, not in DB explicitly usually
          creditSecurityUsd: row.estimated_credit_security_usd || 600,
          bucket: this.isValidBucket(row.bucket) ? row.bucket : 'standard',
          vehicleValueUsd: (row.meta as { vehicle_value_usd?: number })?.vehicle_value_usd || 0,
          country: this.isValidCountry(row.country_code) ? row.country_code : 'AR',
          fxRate: row.fx_snapshot,
          calculatedAt: new Date(row.created_at),
          coverageUpgrade: (row.coverage_upgrade as CoverageUpgrade) || 'standard',
        };

        // Recalculate derived fields if needed
        snapshot.holdEstimatedUsd =
          snapshot.fxRate > 0 ? snapshot.holdEstimatedArs / snapshot.fxRate : 0;

        return { snapshot };
      }),
      catchError((err: Error) => of({ snapshot: null, error: err.message })),
    );
  }

  /**
   * Recalculates risk with a new coverage upgrade
   */
  async recalculateWithUpgrade(
    currentSnapshot: RiskSnapshot,
    newUpgrade: CoverageUpgrade,
  ): Promise<RiskSnapshot> {
    // We recalculate from scratch to ensure consistency
    return this.calculateRiskSnapshot({
      vehicleValueUsd: currentSnapshot.vehicleValueUsd,
      bucket: currentSnapshot.bucket,
      country: currentSnapshot.country,
      fxRate: currentSnapshot.fxRate,
      coverageUpgrade: newUpgrade,
    });
  }

  /**
   * Recalculates risk with a new FX rate
   */
  async recalculateWithNewFxRate(
    currentSnapshot: RiskSnapshot,
    newFxRate: number,
  ): Promise<RiskSnapshot> {
    return this.calculateRiskSnapshot({
      vehicleValueUsd: currentSnapshot.vehicleValueUsd,
      bucket: currentSnapshot.bucket,
      country: currentSnapshot.country,
      fxRate: newFxRate,
      coverageUpgrade: currentSnapshot.coverageUpgrade,
    });
  }

  /**
   * Validates a risk snapshot
   */
  validateRiskSnapshot(snapshot: RiskSnapshot): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (snapshot.coverageUpgrade !== 'zero' && snapshot.deductibleUsd <= 0) {
      errors.push('La franquicia debe ser mayor a 0');
    }

    if (snapshot.creditSecurityUsd !== 600 && snapshot.creditSecurityUsd !== 300) {
      // allowing 300 just in case logic changes
      if (snapshot.creditSecurityUsd !== 600) {
        errors.push('Crédito de seguridad debe ser 600 USD');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Type Guards helpers
  private isValidBucket(bucket: string): bucket is PricingBucketType {
    return ['economy', 'standard', 'premium', 'luxury'].includes(bucket);
  }

  private isValidCountry(country: string): country is CountryCode {
    return ['AR', 'CO', 'MX'].includes(country);
  }
}
