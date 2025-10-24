import { Injectable } from '@angular/core';

/**
 * Estado de solvencia del FGO
 */
export type FgoSolvencyStatus = 'healthy' | 'warning' | 'critical' | 'suspended';

/**
 * Resultado de evaluación de política FGO
 */
export interface FgoPolicyDecision {
  // Gates de solvencia
  canUseFgo: boolean;
  maxCoveragePerEventUsd: number;
  requiresCoPay: boolean;
  coPayPercentage: number;

  // Tasas de contribución
  contributionAlpha: number; // Porcentaje de aportes al FGO

  // Límites de usuario
  maxEventsPerQuarter: number;
  remainingEventsThisQuarter: number;

  // Estado general
  solvencyStatus: FgoSolvencyStatus;
  rc: number; // Coverage Ratio
  lr: number; // Loss Ratio (90 días)

  // Mensajes
  statusMessage: string;
  restrictions: string[];
}

/**
 * Servicio de Motor de Políticas FGO (Argentina)
 *
 * Implementa las reglas de solvencia, gates y límites del Fondo de Garantía Operativa:
 *
 * - **RC (Coverage Ratio)**: Ratio de cobertura
 *   - RC ≥ 1.2 (60 días): α = 10%, excedente a promos
 *   - RC ≥ 1.0: uso normal, α = 15%
 *   - 0.8 ≤ RC < 1.0: co-pago 20%, α = 20%
 *   - RC < 0.8: solo micro-pagos ≤USD 100, α = 20%
 *   - RC < 0.9: α = 20% hasta volver a RC ≥ 1.0
 *
 * - **Aportes (α)**: 15% de depósitos + 4% comisiones + 15% membresías
 *
 * - **Límites**:
 *   - Máx. 8% del FGO/mes en pagos
 *   - Máx. 2 eventos/usuario/trimestre (salvo comité)
 *   - Tope por evento: USD 800
 */
@Injectable({
  providedIn: 'root',
})
export class FgoPolicyEngineService {
  /**
   * Tope máximo de cobertura por evento (USD)
   */
  private readonly MAX_COVERAGE_PER_EVENT_USD = 800;

  /**
   * Máximo de eventos por usuario por trimestre
   */
  private readonly MAX_EVENTS_PER_QUARTER = 2;

  /**
   * Porcentaje máximo del FGO que puede usarse en pagos por mes
   */
  private readonly MAX_MONTHLY_PAYOUT_PERCENTAGE = 0.08; // 8%

  /**
   * Topes de contribución según solvencia
   */
  private readonly CONTRIBUTION_RATES = {
    healthy: 0.1, // 10% cuando RC > 1.2
    normal: 0.15, // 15% cuando RC ≥ 1.0
    stressed: 0.2, // 20% cuando RC < 1.0
  };

  /**
   * Evalúa la política FGO actual y retorna decisiones
   *
   * @param rc - Coverage Ratio (total_balance / PEM)
   * @param lr90d - Loss Ratio de los últimos 90 días
   * @param totalBalanceUsd - Balance total del FGO en USD
   * @param userEventCountThisQuarter - Eventos del usuario en el trimestre actual
   * @param monthlyPayoutsUsd - Pagos realizados este mes en USD
   * @returns Decisión de política completa
   */
  evaluatePolicy(
    rc: number,
    lr90d: number,
    totalBalanceUsd: number,
    userEventCountThisQuarter: number,
    monthlyPayoutsUsd: number
  ): FgoPolicyDecision {
    const solvencyStatus = this.determineSolvencyStatus(rc, lr90d);
    const contributionAlpha = this.calculateContributionAlpha(rc);
    const canUseFgo = this.canUseFgo(rc, userEventCountThisQuarter, monthlyPayoutsUsd, totalBalanceUsd);

    let maxCoveragePerEventUsd = this.MAX_COVERAGE_PER_EVENT_USD;
    let requiresCoPay = false;
    let coPayPercentage = 0;

    // Aplicar gates de solvencia
    if (rc < 0.8) {
      // Crítico: solo micro-pagos
      maxCoveragePerEventUsd = 100;
    } else if (rc >= 0.8 && rc < 1.0) {
      // Warning: co-pago 20%
      requiresCoPay = true;
      coPayPercentage = 0.2;
    }

    // Límites de eventos por usuario
    const remainingEventsThisQuarter = Math.max(
      0,
      this.MAX_EVENTS_PER_QUARTER - userEventCountThisQuarter
    );

    // Mensajes y restricciones
    const { statusMessage, restrictions } = this.buildMessages(
      solvencyStatus,
      rc,
      remainingEventsThisQuarter,
      canUseFgo
    );

    return {
      canUseFgo,
      maxCoveragePerEventUsd,
      requiresCoPay,
      coPayPercentage,
      contributionAlpha,
      maxEventsPerQuarter: this.MAX_EVENTS_PER_QUARTER,
      remainingEventsThisQuarter,
      solvencyStatus,
      rc,
      lr: lr90d,
      statusMessage,
      restrictions,
    };
  }

  /**
   * Determina el estado de solvencia del FGO
   */
  private determineSolvencyStatus(rc: number, lr90d: number): FgoSolvencyStatus {
    if (rc < 0.8) return 'critical';
    if (rc < 1.0) return 'warning';
    if (rc >= 1.2 && lr90d < 0.3) return 'healthy';
    return 'healthy';
  }

  /**
   * Calcula el alpha de contribución según RC
   */
  private calculateContributionAlpha(rc: number): number {
    if (rc >= 1.2) return this.CONTRIBUTION_RATES.healthy; // 10%
    if (rc >= 1.0) return this.CONTRIBUTION_RATES.normal; // 15%
    return this.CONTRIBUTION_RATES.stressed; // 20%
  }

  /**
   * Verifica si el FGO puede usarse en este momento
   */
  private canUseFgo(
    rc: number,
    userEventCountThisQuarter: number,
    monthlyPayoutsUsd: number,
    totalBalanceUsd: number
  ): boolean {
    // Gate 1: RC mínimo
    if (rc < 0.8) return false;

    // Gate 2: Límite de eventos por usuario
    if (userEventCountThisQuarter >= this.MAX_EVENTS_PER_QUARTER) return false;

    // Gate 3: Límite mensual de pagos (8% del FGO)
    const maxMonthlyPayout = totalBalanceUsd * this.MAX_MONTHLY_PAYOUT_PERCENTAGE;
    if (monthlyPayoutsUsd >= maxMonthlyPayout) return false;

    return true;
  }

  /**
   * Construye mensajes informativos para el usuario
   */
  private buildMessages(
    status: FgoSolvencyStatus,
    rc: number,
    remainingEvents: number,
    canUseFgo: boolean
  ): {
    statusMessage: string;
    restrictions: string[];
  } {
    const restrictions: string[] = [];
    let statusMessage = '';

    switch (status) {
      case 'healthy':
        statusMessage = 'FGO operando con normalidad. Cobertura disponible hasta USD 800 por evento.';
        break;

      case 'warning':
        statusMessage = `FGO en estado de alerta (RC: ${rc.toFixed(2)}). Cobertura con co-pago del 20%.`;
        restrictions.push('Se requiere co-pago del 20% en coberturas FGO');
        break;

      case 'critical':
        statusMessage = `FGO en estado crítico (RC: ${rc.toFixed(2)}). Solo micro-pagos ≤USD 100.`;
        restrictions.push('Cobertura limitada a USD 100 por evento');
        restrictions.push('Aumentando contribuciones al 20% para recuperar solvencia');
        break;

      case 'suspended':
        statusMessage = 'FGO suspendido temporalmente. Contacte soporte para más información.';
        restrictions.push('No se pueden procesar nuevos eventos');
        break;
    }

    if (remainingEvents === 0) {
      restrictions.push('Has alcanzado el límite de 2 eventos por trimestre');
    } else if (remainingEvents === 1) {
      restrictions.push('Te queda 1 evento disponible este trimestre');
    }

    if (!canUseFgo) {
      restrictions.push('FGO no disponible en este momento');
    }

    return { statusMessage, restrictions };
  }

  /**
   * Calcula el aporte al FGO para una transacción
   *
   * @param amountCents - Monto de la transacción en centavos
   * @param transactionType - Tipo de transacción
   * @param rc - Coverage Ratio actual
   * @returns Aporte en centavos
   */
  calculateContribution(
    amountCents: number,
    transactionType: 'deposit' | 'commission' | 'membership',
    rc: number
  ): number {
    const alpha = this.calculateContributionAlpha(rc);

    switch (transactionType) {
      case 'deposit':
        // 15% de depósitos/recargas (o 10%/20% según RC)
        return Math.round(amountCents * alpha);

      case 'commission':
        // 4% de comisiones (fijo, no varía con RC)
        return Math.round(amountCents * 0.04);

      case 'membership':
        // 15% de membresías (o 10%/20% según RC)
        return Math.round(amountCents * alpha);

      default:
        return 0;
    }
  }

  /**
   * Valida si un payout FGO es viable
   *
   * @param requestedAmountUsd - Monto solicitado en USD
   * @param policy - Política actual
   * @returns { approved: boolean, reason?: string, adjustedAmountUsd?: number }
   */
  validatePayout(
    requestedAmountUsd: number,
    policy: FgoPolicyDecision
  ): {
    approved: boolean;
    reason?: string;
    adjustedAmountUsd?: number;
  } {
    if (!policy.canUseFgo) {
      return {
        approved: false,
        reason: 'FGO no disponible. ' + policy.restrictions.join('. '),
      };
    }

    if (requestedAmountUsd > policy.maxCoveragePerEventUsd) {
      return {
        approved: true,
        reason: `Monto ajustado al tope de USD ${policy.maxCoveragePerEventUsd}`,
        adjustedAmountUsd: policy.maxCoveragePerEventUsd,
      };
    }

    if (policy.requiresCoPay) {
      return {
        approved: true,
        reason: `Cobertura aprobada con co-pago del ${policy.coPayPercentage * 100}%`,
        adjustedAmountUsd: requestedAmountUsd,
      };
    }

    return {
      approved: true,
      adjustedAmountUsd: requestedAmountUsd,
    };
  }
}
