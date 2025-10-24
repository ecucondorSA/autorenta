import { Injectable, inject } from '@angular/core';
import { FranchiseTableService } from './franchise-table.service';

/**
 * Tipos de pago soportados
 */
export type PaymentMethodType = 'credit_card' | 'wallet' | 'partial_wallet';

/**
 * Resultado del cálculo de risk
 */
export interface RiskCalculation {
  // Franquicias
  standardFranchiseUsd: number;
  rolloverFranchiseUsd: number;

  // Garantía (hold o crédito de seguridad)
  guaranteeType: 'hold' | 'security_credit';
  guaranteeAmountArs: number;
  guaranteeAmountUsd: number;

  // FX snapshot
  fxRate: number;
  fxSnapshotDate: Date;

  // Bucket
  bucket: 'economy' | 'standard' | 'premium' | 'luxury' | 'ultra-luxury';

  // Flags
  hasCard: boolean;
  requiresRevalidation: boolean;
}

/**
 * Servicio de Cálculo de Risk (Argentina)
 *
 * Calcula holds, créditos de seguridad, franquicias y snapshots de riesgo
 * para bookings según las reglas AR.
 *
 * Flujo:
 * 1. Determina si el usuario tiene tarjeta registrada
 * 2. Calcula franquicias estándar y rollover según valor del auto
 * 3. Si tiene tarjeta: calcula hold en ARS (preautorización)
 * 4. Si NO tiene tarjeta: calcula Crédito de Seguridad en USD (wallet)
 * 5. Snapshoteando FX rate para revalidación
 */
@Injectable({
  providedIn: 'root',
})
export class RiskCalculatorService {
  private readonly franchiseService = inject(FranchiseTableService);

  /**
   * Determina el bucket del auto según su valor
   */
  private determineBucket(
    carValueUsd: number
  ): 'economy' | 'standard' | 'premium' | 'luxury' | 'ultra-luxury' {
    if (carValueUsd <= 10000) return 'economy';
    if (carValueUsd <= 20000) return 'standard';
    if (carValueUsd <= 40000) return 'premium';
    if (carValueUsd <= 80000) return 'luxury';
    return 'ultra-luxury';
  }

  /**
   * Calcula el risk completo para un booking
   *
   * @param carValueUsd - Valor del auto en USD
   * @param fxRate - Tasa de cambio USD → ARS
   * @param hasCard - Si el usuario tiene tarjeta registrada
   * @param existingSnapshot - Snapshot previo (para revalidación)
   * @returns Cálculo de risk completo
   */
  calculateRisk(
    carValueUsd: number,
    fxRate: number,
    hasCard: boolean,
    existingSnapshot?: {
      fxRate: number;
      snapshotDate: Date;
    }
  ): RiskCalculation {
    const bucket = this.determineBucket(carValueUsd);
    const franchiseInfo = this.franchiseService.getFranchiseInfo(carValueUsd, bucket, fxRate);

    // Determinar tipo de garantía
    const guaranteeType: 'hold' | 'security_credit' = hasCard ? 'hold' : 'security_credit';

    let guaranteeAmountArs = 0;
    let guaranteeAmountUsd = 0;

    if (hasCard) {
      // Hold en ARS (preautorización)
      guaranteeAmountArs = franchiseInfo.holdArs;
      guaranteeAmountUsd = Math.round((guaranteeAmountArs / fxRate) * 100) / 100;
    } else {
      // Crédito de Seguridad en USD (wallet)
      guaranteeAmountUsd = franchiseInfo.securityCreditUsd;
      guaranteeAmountArs = Math.round(guaranteeAmountUsd * fxRate);
    }

    // Revalidación
    let requiresRevalidation = false;
    if (existingSnapshot) {
      const daysSince = Math.floor(
        (new Date().getTime() - existingSnapshot.snapshotDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      requiresRevalidation = this.franchiseService.shouldRevalidate(
        existingSnapshot.fxRate,
        fxRate,
        daysSince
      );
    }

    return {
      standardFranchiseUsd: franchiseInfo.standardUsd,
      rolloverFranchiseUsd: franchiseInfo.rolloverUsd,
      guaranteeType,
      guaranteeAmountArs,
      guaranteeAmountUsd,
      fxRate,
      fxSnapshotDate: new Date(),
      bucket,
      hasCard,
      requiresRevalidation,
    };
  }

  /**
   * Calcula el depósito requerido según el método de pago
   *
   * @param totalBookingCents - Total de la reserva en centavos
   * @param paymentMethod - Método de pago seleccionado
   * @param guaranteeAmountUsd - Monto de garantía en USD
   * @returns Depósito requerido en centavos
   */
  calculateDepositCents(
    totalBookingCents: number,
    paymentMethod: PaymentMethodType,
    guaranteeAmountUsd: number
  ): number {
    switch (paymentMethod) {
      case 'wallet':
        // Wallet: total + crédito de seguridad (si aplica, convertido a cents)
        return totalBookingCents + Math.round(guaranteeAmountUsd * 100);

      case 'credit_card':
        // Tarjeta: solo total (hold se hace aparte)
        return totalBookingCents;

      case 'partial_wallet':
        // Parcial: 30% del total + crédito de seguridad (si aplica)
        const partialCents = Math.round(totalBookingCents * 0.3);
        const securityCents = Math.round(guaranteeAmountUsd * 100);
        return partialCents + securityCents;

      default:
        return totalBookingCents;
    }
  }

  /**
   * Valida si un usuario puede usar un método de pago dado su balance
   *
   * @param walletBalanceCents - Balance actual en wallet (centavos)
   * @param requiredDepositCents - Depósito requerido (centavos)
   * @param paymentMethod - Método de pago a validar
   * @returns true si tiene fondos suficientes
   */
  canAffordPaymentMethod(
    walletBalanceCents: number,
    requiredDepositCents: number,
    paymentMethod: PaymentMethodType
  ): boolean {
    if (paymentMethod === 'credit_card') {
      // Tarjeta no requiere fondos en wallet
      return true;
    }

    return walletBalanceCents >= requiredDepositCents;
  }

  /**
   * Genera el copy de garantía para mostrar en checkout
   */
  getGuaranteeCopy(risk: RiskCalculation): {
    title: string;
    description: string;
    amountArs: string;
    amountUsd: string;
  } {
    if (risk.guaranteeType === 'hold') {
      return {
        title: 'Garantía (preautorización reembolsable)',
        description:
          'Se preautoriza en tu tarjeta. Si está todo ok, se libera automáticamente. ' +
          'Si hay gastos o daños, capturamos solo lo necesario (hasta tu franquicia).',
        amountArs: this.franchiseService.formatArs(risk.guaranteeAmountArs),
        amountUsd: this.franchiseService.formatUsd(risk.guaranteeAmountUsd),
      };
    } else {
      return {
        title: 'Crédito de Seguridad (no reembolsable)',
        description:
          `Pagas ${this.franchiseService.formatUsd(risk.guaranteeAmountUsd)}. ` +
          'Queda en tu wallet (no retirable). Se usa primero para gastos/daños. ' +
          'Si no se usa, queda disponible para próximas reservas.',
        amountArs: this.franchiseService.formatArs(risk.guaranteeAmountArs),
        amountUsd: this.franchiseService.formatUsd(risk.guaranteeAmountUsd),
      };
    }
  }

  /**
   * Genera tabla comparativa de franquicias para mostrar en voucher
   */
  getFranchiseTable(risk: RiskCalculation): {
    rows: Array<{ label: string; amountUsd: string; amountArs: string }>;
  } {
    return {
      rows: [
        {
          label: 'Franquicia Daño/Robo',
          amountUsd: this.franchiseService.formatUsd(risk.standardFranchiseUsd),
          amountArs: this.franchiseService.formatArs(
            Math.round(risk.standardFranchiseUsd * risk.fxRate)
          ),
        },
        {
          label: 'Franquicia por Vuelco',
          amountUsd: this.franchiseService.formatUsd(risk.rolloverFranchiseUsd),
          amountArs: this.franchiseService.formatArs(
            Math.round(risk.rolloverFranchiseUsd * risk.fxRate)
          ),
        },
        {
          label: risk.guaranteeType === 'hold' ? 'Garantía (hold)' : 'Crédito de Seguridad',
          amountUsd: this.franchiseService.formatUsd(risk.guaranteeAmountUsd),
          amountArs: this.franchiseService.formatArs(risk.guaranteeAmountArs),
        },
      ],
    };
  }
}
