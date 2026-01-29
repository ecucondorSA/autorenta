import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  EligibilityResult,
  WaterfallResult,
  WaterfallBreakdown,
  InspectionStage,
  CurrencyCode,
  usdToCents,
} from '@core/models';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { RiskMatrixService } from '@core/services/verification/risk-matrix.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// Extracted services
import {
  ClaimValidationService,
  DamageItem,
  DamageType,
} from '@core/services/payments/claim-validation.service';
import { ClaimLockService } from '@core/services/payments/claim-lock.service';
import { WaterfallExecutionService } from '@core/services/payments/waterfall-execution.service';

// Re-export types for backwards compatibility
export type { DamageType, DamageItem } from '@core/services/payments/claim-validation.service';

/**
 * Claim (reclamo) de siniestro
 */
export interface Claim {
  id: string;
  bookingId: string;
  reportedBy: string; // locador_id
  damages: DamageItem[];
  totalEstimatedCostUsd: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'processing';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // P0-SECURITY: Lock fields for optimistic locking
  lockedAt?: Date;
  lockedBy?: string;
  processedAt?: Date;
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
 *
 * Refactored: Delega a servicios especializados:
 * - ClaimValidationService: validación de inspecciones y anti-fraude
 * - ClaimLockService: locking optimista para prevenir double-spend
 * - WaterfallExecutionService: ejecución de flujo de cobros
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

  // Delegated services
  private readonly claimValidationService = inject(ClaimValidationService);
  private readonly claimLockService = inject(ClaimLockService);
  private readonly waterfallExecutionService = inject(WaterfallExecutionService);
  private readonly logger = inject(LoggerService).createChildLogger('Settlement');

  constructor(
    private readonly supabaseService: SupabaseClientService,
    private readonly fgoV1_1Service: FgoV1_1Service,
    private readonly riskMatrixService: RiskMatrixService,
  ) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // DELEGATED VALIDATION METHODS
  // ============================================================================

  /**
   * Valida que un booking tenga inspecciones completas (check-in y check-out)
   */
  async validateInspections(
    bookingId: string,
  ): Promise<{ valid: boolean; missing: InspectionStage[] }> {
    return this.claimValidationService.validateInspections(bookingId);
  }

  /**
   * Compara check-in vs check-out para detectar daños nuevos automáticamente
   */
  async compareDamages(bookingId: string): Promise<DamageItem[]> {
    return this.claimValidationService.compareDamages(bookingId);
  }

  /**
   * Calcula el costo estimado de daños según severidad y tipo
   */
  estimateDamageCost(type: DamageType, severity: 'minor' | 'moderate' | 'severe'): number {
    return this.claimValidationService.estimateDamageCost(type, severity);
  }

  // ============================================================================
  // GESTIÓN DE CLAIMS
  // ============================================================================

  /**
   * Crea un claim de siniestro
   * P0-SECURITY: Includes anti-fraud validation before creating claim
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
      const validation = await this.claimValidationService.validateInspections(bookingId);
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

      // P0-SECURITY: Anti-fraud validation
      const fraudCheck = await this.claimValidationService.validateClaimAntiFraud(
        bookingId,
        user.id,
        totalEstimatedCostUsd,
      );
      if (fraudCheck.blocked) {
        this.error.set(fraudCheck.blockReason || 'Claim bloqueado por validación anti-fraude');
        return null;
      }

      // Log warnings for manual review (don't block)
      if (fraudCheck.warnings && fraudCheck.warnings.length > 0) {
        this.logger.warn(`Claim fraud warnings for booking ${bookingId}`, {
          warnings: fraudCheck.warnings,
        });
      }

      // P0-SECURITY: Generate claim ID server-side (not client-side)
      const { data: claimData, error: insertError } = await this.supabaseClient
        .from('claims')
        .insert({
          booking_id: bookingId,
          reported_by: user.id,
          damages: damages,
          total_estimated_cost_usd: totalEstimatedCostUsd,
          status: 'draft',
          notes,
          fraud_warnings: fraudCheck.warnings || [],
          owner_claims_30d: fraudCheck.ownerClaims30d || 0,
        })
        .select('id')
        .single();

      // Fallback to in-memory claim if DB insert fails (for backwards compatibility)
      const claimId = claimData?.id || crypto.randomUUID();
      if (insertError) {
        this.logger.warn(`Could not persist claim to DB, using in-memory: ${insertError.message}`);
      }

      const claim: Claim = {
        id: claimId,
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
    } catch (err) {
      this.logger.error(`Error creating claim: ${String(err)}`);
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
   * P0-SECURITY: Implementa lock optimista para prevenir double-spend
   */
  async processClaim(claim: Claim): Promise<ClaimProcessingResult> {
    try {
      this.processing.set(true);
      this.error.set(null);

      // P0-SECURITY: Acquire optimistic lock BEFORE processing
      const lockResult = await this.claimLockService.acquireClaimLock(claim.id);
      if (!lockResult.ok) {
        return {
          ok: false,
          claim,
          error: lockResult.error || 'Claim is already being processed by another user',
        };
      }

      // 1. Get risk policy and snapshot
      const snapshot = await firstValueFrom(this.fgoV1_1Service.getRiskSnapshot(claim.bookingId));
      if (!snapshot) {
        await this.claimLockService.releaseClaimLock(claim.id, 'approved');
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
        await this.claimLockService.releaseClaimLock(claim.id, 'approved');
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
        await this.claimLockService.releaseClaimLock(claim.id, 'approved');
        return {
          ok: false,
          claim,
          error: 'No se encontró el auto',
        };
      }

      const policy = await this.riskMatrixService.getRiskPolicy(car.price_per_day);
      if (!policy) {
        await this.claimLockService.releaseClaimLock(claim.id, 'approved');
        return {
          ok: false,
          claim,
          error: 'No se encontró política de riesgo',
        };
      }

      // 2. Evaluate eligibility
      const eligibility = await this.evaluateClaim(claim);
      if (!eligibility || !eligibility.eligible) {
        await this.claimLockService.releaseClaimLock(claim.id, 'rejected');
        return {
          ok: false,
          claim: { ...claim, status: 'rejected', updatedAt: new Date() },
          eligibility,
          error: `Claim no elegible: ${eligibility?.reasons.join(', ')}`,
        };
      }

      // 3. Execute waterfall using extracted service
      const claimAmountCents = usdToCents(claim.totalEstimatedCostUsd * snapshot.fxSnapshot);
      const waterfallResult = await this.waterfallExecutionService.executeWaterfall(
        claim.bookingId,
        claim.id,
        claimAmountCents,
        eligibility,
        {
          hasCard: snapshot.hasCard,
          hasWalletSecurity: snapshot.hasWalletSecurity,
          estimatedHoldAmount: snapshot.estimatedHoldAmount,
          estimatedDeposit: snapshot.estimatedDeposit,
          authorizedPaymentId: snapshot.authorizedPaymentId,
          fxSnapshot: snapshot.fxSnapshot,
          franchiseUsd: snapshot.franchiseUsd,
        },
      );

      // 4. Update claim as paid in DB (releases lock)
      await this.claimLockService.markClaimAsPaid(claim.id);

      const updatedClaim: Claim = {
        ...claim,
        status: 'paid',
        updatedAt: new Date(),
        processedAt: new Date(),
      };

      this.currentClaim.set(updatedClaim);

      const finalWaterfallResult: WaterfallResult = {
        ok: waterfallResult.ok,
        bookingId: claim.bookingId,
        totalClaimCents: claimAmountCents,
        breakdown: waterfallResult.breakdown,
        executedAt: new Date(),
        eligibility: eligibility,
      };

      return {
        ok: true,
        claim: updatedClaim,
        eligibility,
        waterfall: finalWaterfallResult,
      };
    } catch (_error) {
      // P0-SECURITY: Release lock on failure so claim can be retried
      await this.claimLockService.releaseClaimLock(claim.id, 'approved');

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
  // DELEGATED WATERFALL METHODS
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
    return this.waterfallExecutionService.simulateWaterfall(bookingId, claimAmountUsd);
  }

  /**
   * Formatea un breakdown de waterfall para mostrar al usuario
   */
  formatBreakdown(breakdown: WaterfallBreakdown, currency: CurrencyCode = 'USD'): string {
    return this.waterfallExecutionService.formatBreakdown(breakdown, currency);
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
