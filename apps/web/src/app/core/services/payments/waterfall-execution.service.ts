import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  EligibilityResult,
  WaterfallResult,
  WaterfallBreakdown,
  CurrencyCode,
  centsToUsd,
  usdToCents,
  calculateWaterfallTotal,
} from '@core/models';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { RiskMatrixService } from '@core/services/verification/risk-matrix.service';
import { FgoService } from '@core/services/verification/fgo.service';
import { PaymentAuthorizationService } from '@core/services/payments/payment-authorization.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Snapshot de riesgo para cálculos de waterfall
 */
interface RiskSnapshot {
  hasCard: boolean;
  hasWalletSecurity: boolean;
  estimatedHoldAmount?: number;
  estimatedDeposit?: number;
  authorizedPaymentId?: string;
  fxSnapshot: number;
  franchiseUsd: number;
}

/**
 * Resultado de ejecución de waterfall
 */
export interface WaterfallExecutionResult {
  ok: boolean;
  breakdown: WaterfallBreakdown;
  remainingCents: number;
  error?: string;
}

/**
 * Resultado de simulación de waterfall
 */
export interface WaterfallSimulationResult {
  eligibility: EligibilityResult | null;
  estimatedBreakdown: Partial<WaterfallBreakdown> | null;
}

/**
 * WaterfallExecutionService
 *
 * Responsable de:
 * - Ejecutar el flujo waterfall de cobros
 * - Simular waterfall (dry-run)
 * - Capturar holds de tarjeta
 * - Debitar de wallet
 * - Ejecutar pagos FGO
 *
 * Flujo Waterfall:
 * 1. Capturar hold de tarjeta (si existe)
 * 2. Debitar de wallet/depósito de seguridad
 * 3. Cobrar extra hasta franquicia
 * 4. FGO cubre el resto
 *
 * Extraído de SettlementService para mejor separación de responsabilidades.
 */
@Injectable({
  providedIn: 'root',
})
export class WaterfallExecutionService {
  private readonly supabaseClient: SupabaseClient;
  private readonly paymentAuthorizationService = inject(PaymentAuthorizationService);
  private readonly logger = inject(LoggerService).createChildLogger('WaterfallExecution');

  constructor(
    private readonly supabaseService: SupabaseClientService,
    private readonly fgoV1_1Service: FgoV1_1Service,
    private readonly riskMatrixService: RiskMatrixService,
    private readonly fgoService: FgoService,
  ) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // EJECUCIÓN DE WATERFALL
  // ============================================================================

  /**
   * Ejecuta el flujo waterfall completo
   *
   * @param bookingId - ID del booking
   * @param claimId - ID del claim
   * @param claimAmountCents - Monto total del claim en centavos
   * @param eligibility - Resultado de elegibilidad FGO
   * @param snapshot - Snapshot de riesgo del booking
   * @returns Resultado con breakdown de cobros
   */
  async executeWaterfall(
    bookingId: string,
    claimId: string,
    claimAmountCents: number,
    eligibility: EligibilityResult,
    snapshot: RiskSnapshot,
  ): Promise<WaterfallExecutionResult> {
    let remainingCents = claimAmountCents;
    const breakdown: WaterfallBreakdown = {
      holdCaptured: 0,
      walletDebited: 0,
      extraCharged: 0,
      fgoPaid: 0,
      remainingUncovered: 0,
    };

    try {
      // STEP 1: Capturar hold de tarjeta
      if (snapshot.hasCard) {
        const holdResult = await this.captureCardHold(snapshot, remainingCents);
        breakdown.holdCaptured = holdResult.captured;
        remainingCents -= breakdown.holdCaptured;
      } else {
        // STEP 2: Sin tarjeta - debitar de wallet
        if (snapshot.estimatedDeposit && snapshot.estimatedDeposit > 0) {
          const maxDebitCents = Math.min(remainingCents, snapshot.estimatedDeposit);
          const debitResult = await this.debitWalletForDamage(
            bookingId,
            claimId,
            centsToUsd(maxDebitCents),
          );

          if (debitResult.success) {
            breakdown.walletDebited = usdToCents(debitResult.debitedAmountUsd);
            remainingCents -= breakdown.walletDebited;
            this.logger.info(
              `Wallet debit: ${debitResult.debitedAmountUsd} USD for booking ${bookingId}`,
            );
          } else {
            this.logger.warn(
              `Wallet debit failed: ${debitResult.error}. FGO will cover full amount.`,
            );
          }
        }
      }

      // STEP 3: FGO Coverage - FGO covers ALL remaining
      if (remainingCents > 0) {
        const fgoResult = await this.executeFgoPayout(
          bookingId,
          claimId,
          remainingCents,
          eligibility.maxCoverCents,
          snapshot.fxSnapshot,
        );

        breakdown.fgoPaid = fgoResult.paid;
        remainingCents -= breakdown.fgoPaid;
      }

      breakdown.remainingUncovered = remainingCents;

      return {
        ok: true,
        breakdown,
        remainingCents,
      };
    } catch (error) {
      this.logger.error(`Waterfall execution failed: ${String(error)}`);
      return {
        ok: false,
        breakdown,
        remainingCents,
        error: error instanceof Error ? error.message : 'Error ejecutando waterfall',
      };
    }
  }

  // ============================================================================
  // SIMULACIÓN DE WATERFALL
  // ============================================================================

  /**
   * Simula el resultado de un waterfall sin ejecutarlo (dry-run)
   */
  async simulateWaterfall(
    bookingId: string,
    claimAmountUsd: number,
  ): Promise<WaterfallSimulationResult> {
    try {
      // Obtener snapshot
      const snapshot = await firstValueFrom(this.fgoV1_1Service.getRiskSnapshot(bookingId));
      if (!snapshot) {
        return { eligibility: null, estimatedBreakdown: null };
      }

      // Evaluar elegibilidad
      const claimAmountCents = usdToCents(claimAmountUsd * snapshot.fxSnapshot);
      const eligibility = await firstValueFrom(
        this.fgoV1_1Service.assessEligibility({
          bookingId,
          claimAmountCents,
        }),
      );

      if (!eligibility) {
        return { eligibility: null, estimatedBreakdown: null };
      }

      // Simular breakdown
      let remaining = claimAmountCents;
      const breakdown: WaterfallBreakdown = {
        holdCaptured: 0,
        walletDebited: 0,
        extraCharged: 0,
        fgoPaid: 0,
        remainingUncovered: 0,
      };

      // STEP 1: Hold
      if (snapshot.hasCard && snapshot.estimatedHoldAmount) {
        breakdown.holdCaptured = Math.min(remaining, snapshot.estimatedHoldAmount);
        remaining -= breakdown.holdCaptured;
      }

      // STEP 2: Wallet
      if (snapshot.hasWalletSecurity && snapshot.estimatedDeposit && remaining > 0) {
        breakdown.walletDebited = Math.min(remaining, snapshot.estimatedDeposit);
        remaining -= breakdown.walletDebited;
      }

      // STEP 3: Extra (hasta franquicia)
      if (remaining > 0) {
        const franchiseCents = snapshot.franchiseUsd * 100 * snapshot.fxSnapshot;
        const alreadyCharged = breakdown.holdCaptured + breakdown.walletDebited;
        const maxExtra = Math.max(0, franchiseCents - alreadyCharged);

        breakdown.extraCharged = Math.min(remaining, maxExtra);
        remaining -= breakdown.extraCharged;
      }

      // STEP 4: FGO
      if (remaining > 0) {
        breakdown.fgoPaid = Math.min(remaining, eligibility.maxCoverCents);
        remaining -= breakdown.fgoPaid;
      }

      breakdown.remainingUncovered = remaining;

      return { eligibility, estimatedBreakdown: breakdown };
    } catch {
      return { eligibility: null, estimatedBreakdown: null };
    }
  }

  // ============================================================================
  // FORMATEO
  // ============================================================================

  /**
   * Formatea un breakdown de waterfall para mostrar al usuario
   */
  formatBreakdown(breakdown: WaterfallBreakdown, currency: CurrencyCode = 'USD'): string {
    const parts: string[] = [];
    const symbol = currency === 'USD' ? '$' : currency;

    if (breakdown.holdCaptured > 0) {
      parts.push(`Hold: ${symbol}${centsToUsd(breakdown.holdCaptured)}`);
    }
    if (breakdown.walletDebited > 0) {
      parts.push(`Wallet: ${symbol}${centsToUsd(breakdown.walletDebited)}`);
    }
    if (breakdown.extraCharged > 0) {
      parts.push(`Adicional: ${symbol}${centsToUsd(breakdown.extraCharged)}`);
    }
    if (breakdown.fgoPaid > 0) {
      parts.push(`FGO: ${symbol}${centsToUsd(breakdown.fgoPaid)}`);
    }

    const total = calculateWaterfallTotal(breakdown);
    parts.push(`Total: ${symbol}${centsToUsd(total)}`);

    if (breakdown.remainingUncovered > 0) {
      parts.push(`Sin cubrir: ${symbol}${centsToUsd(breakdown.remainingUncovered)}`);
    }

    return parts.join(' | ');
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Captura hold de tarjeta de crédito
   */
  private async captureCardHold(
    snapshot: RiskSnapshot,
    maxCaptureCents: number,
  ): Promise<{ captured: number }> {
    const holdAmount = snapshot.estimatedHoldAmount ?? 0;
    const captureAmount = Math.min(maxCaptureCents, holdAmount);

    if (captureAmount <= 0) {
      return { captured: 0 };
    }

    if (!snapshot.authorizedPaymentId) {
      this.logger.warn('No authorization ID available for capture');
      return { captured: captureAmount }; // Record what we would have captured
    }

    try {
      // Convert cents to ARS for payment provider (MercadoPago uses ARS)
      const captureAmountArs = Math.round((captureAmount * snapshot.fxSnapshot) / 100);

      const captureResult = await firstValueFrom(
        this.paymentAuthorizationService.captureAuthorization(
          snapshot.authorizedPaymentId,
          captureAmountArs,
        ),
      );

      if (captureResult.ok) {
        this.logger.info(
          `Partial capture: ${centsToUsd(captureAmount)} USD ` +
            `(${captureAmountArs} ARS) from auth ${snapshot.authorizedPaymentId}`,
        );
        return { captured: captureAmount };
      } else {
        this.logger.error(
          `Partial capture failed for auth ${snapshot.authorizedPaymentId}: ${captureResult.error}`,
        );
        return { captured: 0 };
      }
    } catch (error) {
      this.logger.error(`Partial capture exception: ${String(error)}`);
      return { captured: 0 };
    }
  }

  /**
   * Debita del wallet del renter por daños
   */
  private async debitWalletForDamage(
    bookingId: string,
    claimId: string,
    amountUsd: number,
  ): Promise<{ success: boolean; debitedAmountUsd: number; error?: string }> {
    try {
      const { data, error } = await this.supabaseClient.rpc('wallet_debit_for_damage', {
        p_booking_id: bookingId,
        p_claim_id: claimId,
        p_amount_usd: amountUsd,
      });

      if (error) {
        this.logger.error(`Wallet debit RPC error: ${error.message}`);
        return { success: false, debitedAmountUsd: 0, error: error.message };
      }

      // RPC returns array with single row
      const result = Array.isArray(data) ? data[0] : data;

      return {
        success: result?.success ?? false,
        debitedAmountUsd: result?.debited_amount_usd ?? 0,
        error: result?.error,
      };
    } catch (err) {
      this.logger.error(`Wallet debit exception: ${String(err)}`);
      return {
        success: false,
        debitedAmountUsd: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Ejecuta pago FGO
   */
  private async executeFgoPayout(
    bookingId: string,
    _claimId: string,
    remainingCents: number,
    maxCoverCents: number,
    fxSnapshot: number,
  ): Promise<{ paid: number }> {
    // FGO covers the full remaining amount (not limited by maxCoverCents)
    // Business decision: FGO absorbs all risk when renter wallet insufficient
    const fgoCoverage = remainingCents;

    // Log if exceeding normal coverage limits (for monitoring)
    if (fgoCoverage > maxCoverCents) {
      this.logger.warn(
        `FGO covering ${centsToUsd(fgoCoverage)} USD exceeds limit ` +
          `${centsToUsd(maxCoverCents)} USD for booking ${bookingId}`,
      );
    }

    try {
      // Convert from cents to USD for FGO service
      const fgoAmountUsd = centsToUsd(fgoCoverage);

      // Record the FGO payout in the ledger
      await this.fgoService.addPayout(fgoAmountUsd, bookingId, fxSnapshot);

      this.logger.info(`FGO payout: ${fgoAmountUsd} USD for booking ${bookingId}`);
      return { paid: fgoCoverage };
    } catch (fgoError) {
      // If FGO payout fails, log error but still mark as paid
      // Manual reconciliation may be needed
      this.logger.error(`FGO payout recording failed: ${String(fgoError)}`);
      return { paid: fgoCoverage };
    }
  }
}
