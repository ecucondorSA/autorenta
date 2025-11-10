import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  EligibilityResult,
  WaterfallResult,
  WaterfallBreakdown,
  InspectionStage,
  CurrencyCode,
  centsToUsd,
  usdToCents,
  calculateWaterfallTotal,
  isInspectionComplete,
} from '../models/fgo-v1-1.model';
import { SupabaseClientService } from './supabase-client.service';
import { FgoV1_1Service } from './fgo-v1-1.service';
import { RiskMatrixService } from './risk-matrix.service';
import { FgoService } from './fgo.service';

/**
 * Tipo de daño reportado
 */
export type DamageType =
  | 'scratch' // Rayón
  | 'dent' // Abolladura
  | 'broken_glass' // Vidrio roto
  | 'tire_damage' // Daño en neumático
  | 'mechanical' // Falla mecánica
  | 'interior' // Daño interior
  | 'missing_item' // Artículo faltante
  | 'other'; // Otro

/**
 * Daño individual reportado
 */
export interface DamageItem {
  type: DamageType;
  description: string;
  estimatedCostUsd: number;
  photos: string[]; // URLs de evidencia
  severity: 'minor' | 'moderate' | 'severe';
}

/**
 * Claim (reclamo) de siniestro
 */
export interface Claim {
  id: string;
  bookingId: string;
  reportedBy: string; // locador_id
  damages: DamageItem[];
  totalEstimatedCostUsd: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resultado de procesamiento de claim
 */
export interface ClaimProcessingResult {
  ok: boolean;
  claim: Claim;
  eligibility?: EligibilityResult | null;
  waterfall?: WaterfallResult;
  error?: string;
}

/**
 * Servicio de Settlement (Liquidación de Siniestros)
 *
 * Orquesta el flujo completo:
 * 1. Validar evidencias (inspecciones check-in/out)
 * 2. Crear claim con daños reportados
 * 3. Evaluar elegibilidad FGO
 * 4. Ejecutar waterfall de cobros
 * 5. Actualizar estado del booking
 */
@Injectable({
  providedIn: 'root',
})
export class SettlementService {
  private readonly supabaseClient: SupabaseClient;

  // Estado reactivo
  readonly processing = signal(false);
  readonly currentClaim = signal<Claim | null>(null);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly supabaseService: SupabaseClientService,
    private readonly fgoV1_1Service: FgoV1_1Service,
    private readonly riskMatrixService: RiskMatrixService,
    private readonly fgoService: FgoService,
  ) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // VALIDACIÓN DE EVIDENCIAS
  // ============================================================================

  /**
   * Valida que un booking tenga inspecciones completas (check-in y check-out)
   */
  async validateInspections(
    bookingId: string,
  ): Promise<{ valid: boolean; missing: InspectionStage[] }> {
    try {
      const inspections = await firstValueFrom(this.fgoV1_1Service.getInspections(bookingId));

      const hasCheckIn = inspections.some((i) => i.stage === 'check_in' && isInspectionComplete(i));
      const hasCheckOut = inspections.some(
        (i) => i.stage === 'check_out' && isInspectionComplete(i),
      );

      const missing: InspectionStage[] = [];
      if (!hasCheckIn) missing.push('check_in');
      if (!hasCheckOut) missing.push('check_out');

      return {
        valid: missing.length === 0,
        missing,
      };
    } catch {
      return { valid: false, missing: ['check_in', 'check_out'] };
    }
  }

  /**
   * Compara check-in vs check-out para detectar daños nuevos
   */
  async compareDamages(bookingId: string): Promise<DamageItem[]> {
    try {
      const inspections = await firstValueFrom(this.fgoV1_1Service.getInspections(bookingId));

      const checkIn = inspections.find((i) => i.stage === 'check_in');
      const checkOut = inspections.find((i) => i.stage === 'check_out');

      if (!checkIn || !checkOut) {
        return [];
      }

      // TODO: Implementar detección automática de daños comparando fotos
      // Por ahora retornamos array vacío - requiere análisis de imágenes
      // En producción, se podría usar ML/CV para detectar diferencias

      return [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // GESTIÓN DE CLAIMS
  // ============================================================================

  /**
   * Crea un claim de siniestro
   * NOTA: Los claims no están en la DB todavía, se implementarán en futura migración
   */
  async createClaim(
    bookingId: string,
    damages: DamageItem[],
    notes?: string,
  ): Promise<Claim | null> {
    try {
      this.processing.set(true);
      this.error.set(null);

      // Validar evidencias
      const validation = await this.validateInspections(bookingId);
      if (!validation.valid) {
        this.error.set(`Faltan inspecciones: ${validation.missing.join(', ')}`);
        return null;
      }

      // Calcular total
      const totalEstimatedCostUsd = damages.reduce((sum, d) => sum + d.estimatedCostUsd, 0);

      // Obtener usuario actual
      const {
        data: { user },
      } = await this.supabaseClient.auth.getUser();
      if (!user) {
        this.error.set('Usuario no autenticado');
        return null;
      }

      // Crear claim (mock - en producción se guardaría en DB)
      const claim: Claim = {
        id: crypto.randomUUID(),
        bookingId,
        reportedBy: user.id,
        damages,
        totalEstimatedCostUsd,
        status: 'draft',
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.currentClaim.set(claim);
      return claim;
    } catch {
      this.error.set('Error al crear el claim');
      return null;
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Evalúa elegibilidad de un claim sin ejecutar cobros
   */
  async evaluateClaim(claim: Claim): Promise<EligibilityResult | null> {
    try {
      this.processing.set(true);
      this.error.set(null);

      // Obtener snapshot de riesgo
      const snapshot = await firstValueFrom(this.fgoV1_1Service.getRiskSnapshot(claim.bookingId));
      if (!snapshot) {
        this.error.set('No se encontró snapshot de riesgo para el booking');
        return null;
      }

      // Convertir total a centavos (moneda local)
      const claimAmountCents = usdToCents(claim.totalEstimatedCostUsd * snapshot.fxSnapshot);

      // Evaluar elegibilidad
      const eligibility = await firstValueFrom(
        this.fgoV1_1Service.assessEligibility({
          bookingId: claim.bookingId,
          claimAmountCents,
        }),
      );

      return eligibility;
    } catch {
      this.error.set('Error al evaluar elegibilidad');
      return null;
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Procesa un claim completo: evalúa y ejecuta waterfall
   * IMPORTANTE: Solo ejecutable por admins o sistema
   */
  async processClaim(claim: Claim): Promise<ClaimProcessingResult> {
    try {
      this.processing.set(true);
      this.error.set(null);

      // 1. Get risk policy and snapshot
      const snapshot = await firstValueFrom(this.fgoV1_1Service.getRiskSnapshot(claim.bookingId));
      if (!snapshot) {
        return {
          ok: false,
          claim,
          error: 'No se encontró snapshot de riesgo',
        };
      }

      const { data: booking } = await this.supabaseClient
        .from('bookings')
        .select('car_id')
        .eq('id', claim.bookingId)
        .single();
      if (!booking) {
        return {
          ok: false,
          claim,
          error: 'No se encontró la reserva',
        };
      }

      const { data: car } = await this.supabaseClient
        .from('cars')
        .select('price_per_day')
        .eq('id', booking.car_id)
        .single();
      if (!car) {
        return {
          ok: false,
          claim,
          error: 'No se encontró el auto',
        };
      }

      const policy = await this.riskMatrixService.getRiskPolicy(car.price_per_day);
      if (!policy) {
        return {
          ok: false,
          claim,
          error: 'No se encontró política de riesgo',
        };
      }

      // 2. Evaluate eligibility
      const eligibility = await this.evaluateClaim(claim);
      if (!eligibility || !eligibility.eligible) {
        return {
          ok: false,
          claim: { ...claim, status: 'rejected', updatedAt: new Date() },
          eligibility,
          error: `Claim no elegible: ${eligibility?.reasons.join(', ')}`,
        };
      }

      // 3. Execute waterfall
      const claimAmountCents = usdToCents(claim.totalEstimatedCostUsd * snapshot.fxSnapshot);
      let remainingCents = claimAmountCents;
      const breakdown: WaterfallBreakdown = {
        holdCaptured: 0,
        walletDebited: 0,
        extraCharged: 0,
        fgoPaid: 0,
        remainingUncovered: 0,
      };

      if (snapshot.hasCard) {
        // With credit card
        const holdAmount = snapshot.estimatedHoldAmount ?? 0;
        const captureAmount = Math.min(remainingCents, holdAmount);
        // TODO: Implement partial capture logic with payment provider
        breakdown.holdCaptured = captureAmount;
        remainingCents -= captureAmount;
      } else {
        // Without credit card
        const securityCredit = snapshot.estimatedDeposit ?? 0;
        const debitAmount = Math.min(remainingCents, securityCredit);
        // TODO: Implement wallet debit logic
        breakdown.walletDebited = debitAmount;
        remainingCents -= debitAmount;

        if (remainingCents > 0) {
          // TODO: Implement top-up/transfer logic
        }
      }

      if (remainingCents > 0) {
        // FGO
        const fgoCoverage = Math.min(remainingCents, eligibility.maxCoverCents);
        // TODO: Implement FGO payout logic
        breakdown.fgoPaid = fgoCoverage;
        remainingCents -= fgoCoverage;
      }

      breakdown.remainingUncovered = remainingCents;

      const waterfallResult: WaterfallResult = {
        ok: true,
        bookingId: claim.bookingId,
        totalClaimCents: claimAmountCents,
        breakdown,
        executedAt: new Date(),
        eligibility: eligibility,
      };

      // 4. Update claim as paid
      const updatedClaim: Claim = {
        ...claim,
        status: 'paid',
        updatedAt: new Date(),
      };

      this.currentClaim.set(updatedClaim);

      return {
        ok: true,
        claim: updatedClaim,
        eligibility,
        waterfall: waterfallResult,
      };
    } catch (_error) {
      this.error.set('Error al procesar claim');
      return {
        ok: false,
        claim,
        error: String(_error),
      };
    } finally {
      this.processing.set(false);
    }
  }

  // ============================================================================
  // SIMULADORES Y HELPERS
  // ============================================================================

  /**
   * Simula el resultado de un waterfall sin ejecutarlo (dry-run)
   */
  async simulateWaterfall(
    bookingId: string,
    claimAmountUsd: number,
  ): Promise<{
    eligibility: EligibilityResult | null;
    estimatedBreakdown: Partial<WaterfallBreakdown> | null;
  }> {
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

  /**
   * Calcula el costo estimado de daños según severidad y tipo
   */
  estimateDamageCost(type: DamageType, severity: 'minor' | 'moderate' | 'severe'): number {
    // Costos base en USD
    const baseCosts: Record<DamageType, number> = {
      scratch: 50,
      dent: 150,
      broken_glass: 300,
      tire_damage: 200,
      mechanical: 500,
      interior: 100,
      missing_item: 80,
      other: 100,
    };

    const multipliers = {
      minor: 1.0,
      moderate: 2.0,
      severe: 4.0,
    };

    return baseCosts[type] * multipliers[severity];
  }

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
  // ESTADO Y UTILIDADES
  // ============================================================================

  /**
   * Limpia el estado del servicio
   */
  clearState(): void {
    this.processing.set(false);
    this.currentClaim.set(null);
    this.error.set(null);
  }

  /**
   * Obtiene el estado actual
   */
  getState(): { processing: boolean; currentClaim: Claim | null; error: string | null } {
    return {
      processing: this.processing(),
      currentClaim: this.currentClaim(),
      error: this.error(),
    };
  }
}
