import { Injectable } from '@angular/core';

/**
 * Servicio de Tabla de Franquicias (Argentina)
 *
 * Maneja las franquicias estándar y por vuelco (rollover) según el valor del auto.
 *
 * Bandas de valor (USD):
 * - ≤10,000: USD 500 estándar
 * - 10,001-20,000: USD 800 estándar
 * - 20,001-40,000: USD 1,200 estándar
 * - >40,000: USD 1,800 estándar
 *
 * Rollover: 2.0× de la franquicia estándar
 *
 * Hold con tarjeta: max(min_bucket_ars, 0.35 × rollover_deductible_usd × FX)
 */
@Injectable({
  providedIn: 'root',
})
export class FranchiseTableService {
  /**
   * Bandas de franquicias estándar (USD)
   */
  private readonly FRANCHISE_BANDS = [
    { maxValue: 10000, standardUsd: 500 },
    { maxValue: 20000, standardUsd: 800 },
    { maxValue: 40000, standardUsd: 1200 },
    { maxValue: Infinity, standardUsd: 1800 },
  ];

  /**
   * Multiplicador de franquicia por vuelco (rollover)
   */
  private readonly ROLLOVER_MULTIPLIER = 2.0;

  /**
   * Mínimos de hold por bucket (ARS) - Argentina
   * Ajustables según inflación/política comercial
   */
  private readonly MIN_HOLD_ARS = {
    economy: 600_000, // ~USD 343 @ FX 1748
    standard: 800_000, // ~USD 458 @ FX 1748
    premium: 1_200_000, // ~USD 686 @ FX 1748
    luxury: 1_500_000, // ~USD 858 @ FX 1748
    'ultra-luxury': 2_000_000, // ~USD 1144 @ FX 1748
  };

  /**
   * Porcentaje del rollover deductible para calcular hold con tarjeta
   */
  private readonly HOLD_PERCENTAGE = 0.35;

  /**
   * Obtiene la franquicia estándar en USD según el valor del auto
   */
  getStandardFranchiseUsd(carValueUsd: number): number {
    const band = this.FRANCHISE_BANDS.find((b) => carValueUsd <= b.maxValue);
    return band?.standardUsd ?? this.FRANCHISE_BANDS[this.FRANCHISE_BANDS.length - 1].standardUsd;
  }

  /**
   * Obtiene la franquicia por vuelco (rollover) en USD
   */
  getRolloverFranchiseUsd(carValueUsd: number): number {
    const standard = this.getStandardFranchiseUsd(carValueUsd);
    return standard * this.ROLLOVER_MULTIPLIER;
  }

  /**
   * Calcula el hold estimado en ARS para una reserva con tarjeta
   *
   * @param carValueUsd - Valor del auto en USD
   * @param bucket - Bucket del auto (economy, standard, premium, luxury, ultra-luxury)
   * @param fxRate - Tasa de cambio USD → ARS
   * @returns Hold estimado en ARS
   */
  calculateHoldArs(
    carValueUsd: number,
    bucket: 'economy' | 'standard' | 'premium' | 'luxury' | 'ultra-luxury',
    fxRate: number,
  ): number {
    const rolloverUsd = this.getRolloverFranchiseUsd(carValueUsd);
    const calculatedHold = this.HOLD_PERCENTAGE * rolloverUsd * fxRate;
    const minHold = this.MIN_HOLD_ARS[bucket] ?? this.MIN_HOLD_ARS.standard;

    return Math.max(minHold, Math.round(calculatedHold));
  }

  /**
   * Obtiene el monto de Crédito de Seguridad en USD para reservas sin tarjeta
   *
   * @param carValueUsd - Valor del auto en USD
   * @returns Crédito de Seguridad en USD
   */
  getSecurityCreditUsd(carValueUsd: number): number {
    if (carValueUsd <= 20000) {
      return 300;
    }
    // Opcional recomendado para autos >USD 20k
    return 500;
  }

  /**
   * Obtiene información completa de franquicias para un auto
   */
  getFranchiseInfo(
    carValueUsd: number,
    bucket: 'economy' | 'standard' | 'premium' | 'luxury' | 'ultra-luxury',
    fxRate: number,
  ): {
    standardUsd: number;
    rolloverUsd: number;
    holdArs: number;
    securityCreditUsd: number;
    minHoldArs: number;
  } {
    return {
      standardUsd: this.getStandardFranchiseUsd(carValueUsd),
      rolloverUsd: this.getRolloverFranchiseUsd(carValueUsd),
      holdArs: this.calculateHoldArs(carValueUsd, bucket, fxRate),
      securityCreditUsd: this.getSecurityCreditUsd(carValueUsd),
      minHoldArs: this.MIN_HOLD_ARS[bucket] ?? this.MIN_HOLD_ARS.standard,
    };
  }

  /**
   * Revalida si el hold debe recalcularse por variación de FX o tiempo transcurrido
   *
   * @param oldFx - FX snapshot original
   * @param newFx - FX actual
   * @param daysSinceSnapshot - Días desde el snapshot original
   * @returns true si debe revalidarse
   */
  shouldRevalidate(oldFx: number, newFx: number, daysSinceSnapshot: number): boolean {
    const fxVariation = Math.abs((newFx - oldFx) / oldFx);
    const FX_THRESHOLD = 0.1; // 10%
    const TIME_THRESHOLD = 7; // 7 días

    return fxVariation >= FX_THRESHOLD || daysSinceSnapshot >= TIME_THRESHOLD;
  }

  /**
   * Formatea un monto en ARS para mostrar en UI
   */
  formatArs(amountArs: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountArs);
  }

  /**
   * Formatea un monto en USD para mostrar en UI
   */
  formatUsd(amountUsd: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountUsd);
  }
}
