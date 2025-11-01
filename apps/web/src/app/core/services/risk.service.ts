import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import {
  RiskSnapshot,
  CalculateRiskSnapshotParams,
  BucketType,
  CoverageUpgrade,
  calculateDeductibleUsd,
  applyUpgradeToDeductible,
  calculateHoldEstimatedArs,
  calculateCreditSecurityUsd,
} from '../models/booking-detail-payment.model';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Servicio para cálculo de riesgos y garantías
 * Calcula franquicias, holds y créditos de seguridad según reglas AR
 */
@Injectable({
  providedIn: 'root',
})
export class RiskService {
  private supabaseClient = inject(SupabaseClientService).getClient();

  /**
   * Calcula el risk snapshot completo para una reserva
   */
  calculateRiskSnapshot(params: CalculateRiskSnapshotParams): RiskSnapshot {
    const { vehicleValueUsd, bucket, country, fxRate, coverageUpgrade = 'standard' } = params;

    // 1. Calcular franquicia base según valor del vehículo
    const baseDeductible = calculateDeductibleUsd(vehicleValueUsd);

    // 2. Aplicar upgrade de cobertura
    const deductibleUsd = applyUpgradeToDeductible(baseDeductible, coverageUpgrade);

    // 3. Franquicia por vuelco = 1.5× franquicia estándar
    const rolloverDeductibleUsd = deductibleUsd * 1.5;

    // 4. Hold estimado en ARS (modalidad con tarjeta)
    const holdEstimatedArs = calculateHoldEstimatedArs(rolloverDeductibleUsd, fxRate, bucket);

    const holdEstimatedUsd = holdEstimatedArs / fxRate;

    // 5. Crédito de Seguridad (modalidad sin tarjeta)
    const creditSecurityUsd = calculateCreditSecurityUsd(vehicleValueUsd);

    return {
      deductibleUsd,
      rolloverDeductibleUsd,
      holdEstimatedArs,
      holdEstimatedUsd,
      creditSecurityUsd,
      bucket,
      vehicleValueUsd,
      country,
      fxRate,
      calculatedAt: new Date(),
      coverageUpgrade,
    };
  }

  /**
   * Persiste el risk snapshot en la base de datos
   */
  persistRiskSnapshot(
    bookingId: string,
    riskSnapshot: RiskSnapshot,
    paymentMode: 'card' | 'wallet',
  ): Observable<{ ok: boolean; snapshotId?: string; error?: string }> {
    const snapshotData = {
      booking_id: bookingId,
      country_code: riskSnapshot.country,
      bucket: riskSnapshot.bucket,
      fx_snapshot: riskSnapshot.fxRate,
      currency: 'ARS',
      estimated_hold_amount: paymentMode === 'card' ? riskSnapshot.holdEstimatedArs : null,
      estimated_deposit: paymentMode === 'wallet' ? riskSnapshot.creditSecurityUsd : null,
      franchise_usd: riskSnapshot.deductibleUsd,
      has_card: paymentMode === 'card',
      has_wallet_security: paymentMode === 'wallet',
      meta: {
        vehicle_value_usd: riskSnapshot.vehicleValueUsd,
        calculated_at: riskSnapshot.calculatedAt.toISOString(),
        coverage_upgrade: riskSnapshot.coverageUpgrade,
        rollover_deductible_usd: riskSnapshot.rolloverDeductibleUsd,
      },
    };

    return from(
      this.supabaseClient
        .from('booking_risk_snapshot')
        .insert(snapshotData)
        .select('booking_id')
        .single(),
    ).pipe(
      map((response) => {
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, snapshotId: response.data.booking_id };
      }),
      catchError((error) => {
        return of({ ok: false, error: error.message || 'Error desconocido' });
      }),
    );
  }

  /**
   * Obtiene un risk snapshot por booking ID
   */
  getRiskSnapshotByBookingId(
    bookingId: string,
  ): Observable<{ snapshot: RiskSnapshot | null; error?: string }> {
    return from(
      this.supabaseClient
        .from('booking_risk_snapshot')
        .select('*')
        .eq('booking_id', bookingId)
        .single(),
    ).pipe(
      map((response) => {
        if (response.error || !response.data) {
          return { snapshot: null, error: response.error?.message };
        }

        const data = response.data;
        const snapshot: RiskSnapshot = {
          deductibleUsd: data.deductible_usd,
          rolloverDeductibleUsd: data.rollover_deductible_usd,
          holdEstimatedArs: data.estimated_hold_amount || 0,
          holdEstimatedUsd: (data.estimated_hold_amount || 0) / data.fx_snapshot,
          creditSecurityUsd: data.estimated_deposit || 0,
          bucket: data.bucket as BucketType,
          vehicleValueUsd: data.meta?.vehicle_value_usd || 0,
          country: data.country_code,
          fxRate: data.fx_snapshot,
          calculatedAt: new Date(data.created_at),
          coverageUpgrade: (data.coverage_upgrade as CoverageUpgrade) || 'standard',
        };

        return { snapshot };
      }),
      catchError((error) => {
        return of({ snapshot: null, error: error.message });
      }),
    );
  }

  /**
   * Recalcula el risk snapshot cuando cambia el upgrade de cobertura
   */
  recalculateWithUpgrade(currentSnapshot: RiskSnapshot, newUpgrade: CoverageUpgrade): RiskSnapshot {
    return this.calculateRiskSnapshot({
      vehicleValueUsd: currentSnapshot.vehicleValueUsd,
      bucket: currentSnapshot.bucket,
      country: currentSnapshot.country,
      fxRate: currentSnapshot.fxRate,
      coverageUpgrade: newUpgrade,
    });
  }

  /**
   * Recalcula el risk snapshot cuando cambia el FX rate
   */
  recalculateWithNewFxRate(currentSnapshot: RiskSnapshot, newFxRate: number): RiskSnapshot {
    return this.calculateRiskSnapshot({
      vehicleValueUsd: currentSnapshot.vehicleValueUsd,
      bucket: currentSnapshot.bucket,
      country: currentSnapshot.country,
      fxRate: newFxRate,
      coverageUpgrade: currentSnapshot.coverageUpgrade,
    });
  }

  /**
   * Valida que el risk snapshot sea coherente con las reglas de negocio
   */
  validateRiskSnapshot(snapshot: RiskSnapshot): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Franquicia debe ser positiva (excepto para upgrade 'zero')
    if (snapshot.coverageUpgrade !== 'zero' && snapshot.deductibleUsd <= 0) {
      errors.push('La franquicia debe ser mayor a 0');
    }

    // 2. Franquicia por vuelco debe ser 1.5× la estándar (si no es zero)
    if (
      snapshot.coverageUpgrade !== 'zero' &&
      Math.abs(snapshot.rolloverDeductibleUsd - snapshot.deductibleUsd * 1.5) > 0.01
    ) {
      errors.push('La franquicia por vuelco debe ser 1.5× la franquicia estándar');
    }

    // 3. Hold debe ser razonable (entre USD 150 y USD 2000)
    const holdUsd = snapshot.holdEstimatedArs / snapshot.fxRate;
    if (holdUsd < 150 || holdUsd > 2000) {
      errors.push(`Hold fuera de rango: ${holdUsd.toFixed(2)} USD (esperado: 150-2000)`);
    }

    // 4. Crédito de seguridad debe ser 300 o 500
    if (![300, 500].includes(snapshot.creditSecurityUsd)) {
      errors.push('Crédito de seguridad debe ser 300 o 500 USD');
    }

    // 5. FX rate debe ser razonable para ARS (>= 100, <= 10000)
    if (snapshot.country === 'AR' && (snapshot.fxRate < 100 || snapshot.fxRate > 10000)) {
      errors.push(`Tasa FX fuera de rango: ${snapshot.fxRate} (esperado: 100-10000 ARS/USD)`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
