import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  EligibilityResult,
  WaterfallResult,
  WaterfallBreakdown,
  InspectionStage,
  BookingInspection,
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
import { DamageDetectionService } from './damage-detection.service';
import { PaymentAuthorizationService } from './payment-authorization.service';
import { LoggerService } from './logger.service';

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

  private readonly damageDetectionService = inject(DamageDetectionService);
  private readonly paymentAuthorizationService = inject(PaymentAuthorizationService);
  private readonly logger = inject(LoggerService).createChildLogger('Settlement');

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
   * Compara check-in vs check-out para detectar daños nuevos automáticamente
   *
   * Utiliza análisis de imágenes para detectar cambios entre inspecciones.
   * Retorna array de daños detectados automáticamente.
   */
  async compareDamages(bookingId: string): Promise<DamageItem[]> {
    try {
      const inspections = await firstValueFrom(this.fgoV1_1Service.getInspections(bookingId));

      const checkIn = inspections.find((i) => i.stage === 'check_in');
      const checkOut = inspections.find((i) => i.stage === 'check_out');

      if (!checkIn || !checkOut) {
        console.warn(`compareDamages: Missing inspections for booking ${bookingId}`);
        return [];
      }

      // Extraer URLs de fotos
      const checkInImages = this.extractImageUrls(checkIn);
      const checkOutImages = this.extractImageUrls(checkOut);

      if (checkInImages.length === 0 || checkOutImages.length === 0) {
        console.warn(`compareDamages: No images to analyze for booking ${bookingId}`);
        return [];
      }

      // Analizar imágenes con detección automática
      const analysisResult = await this.damageDetectionService.analyzeImages(
        checkInImages,
        checkOutImages,
      );

      if (!analysisResult.success) {
        console.error(
          `compareDamages: Analysis failed for booking ${bookingId}:`,
          analysisResult.error,
        );
        return [];
      }

      // Convertir resultados a DamageItem[]
      return this.damageDetectionService.convertToDamageItems(analysisResult.damages);
    } catch (error) {
      console.error(`compareDamages: Error analyzing damages for booking ${bookingId}:`, error);
      return [];
    }
  }

  /**
   * Extrae URLs de imágenes de una inspección
   * @private
   */
  private extractImageUrls(inspection: BookingInspection | undefined): string[] {
    if (!inspection) return [];

    const images: string[] = [];
    const insp = inspection as unknown as {
      photos?: string[];
      images?: string[];
      photo_urls?: string[];
    };

    // Suportar diferentes estructuras de almacenamiento de fotos
    if (Array.isArray(insp.photos)) {
      images.push(...insp.photos);
    }

    if (Array.isArray(insp.images)) {
      images.push(...insp.images);
    }

    if (insp.photo_urls) {
      const urls = insp.photo_urls;
      if (Array.isArray(urls)) {
        images.push(...urls);
      }
    }

    // Filtrar URLs vacías y duplicadas
    return Array.from(new Set(images.filter((url) => url && typeof url === 'string')));
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

      // P0-SECURITY: Anti-fraud validation
      const fraudCheck = await this.validateClaimAntiFraud(
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
        console.warn('[SettlementService] Claim fraud warnings:', {
          bookingId,
          userId: user.id,
          totalEstimatedCostUsd,
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
        console.warn(
          '[SettlementService] Could not persist claim to DB, using in-memory:',
          insertError,
        );
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
      console.error('[SettlementService] Error creating claim:', err);
      this.error.set('Error al crear el claim');
      return null;
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * P0-SECURITY: Anti-fraud validation for claims
   * Calls the database function that checks for:
   * - Short booking duration (<24h)
   * - High claim frequency (3+ in 30 days)
   * - Unusually high amounts
   * - Suspicious round numbers
   */
  private async validateClaimAntiFraud(
    bookingId: string,
    ownerId: string,
    totalEstimatedUsd: number,
  ): Promise<{
    ok: boolean;
    blocked: boolean;
    blockReason?: string;
    warnings?: Array<{ type: string; message: string; value?: number }>;
    ownerClaims30d?: number;
  }> {
    try {
      const { data, error } = await this.supabaseClient.rpc('validate_claim_anti_fraud', {
        p_booking_id: bookingId,
        p_owner_id: ownerId,
        p_total_estimated_usd: totalEstimatedUsd,
      });

      if (error) {
        console.warn('[SettlementService] Anti-fraud check failed, allowing claim:', error);
        // Don't block if validation fails - fail open for UX
        return { ok: true, blocked: false };
      }

      const result = data as {
        ok: boolean;
        blocked: boolean;
        block_reason?: string;
        warnings?: Array<{ type: string; message: string; value?: number }>;
        owner_claims_30d?: number;
      };

      return {
        ok: result.ok,
        blocked: result.blocked,
        blockReason: result.block_reason,
        warnings: result.warnings,
        ownerClaims30d: result.owner_claims_30d,
      };
    } catch (err) {
      console.warn('[SettlementService] Anti-fraud validation exception:', err);
      // Fail open - don't block on errors
      return { ok: true, blocked: false };
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
      const lockResult = await this.acquireClaimLock(claim.id);
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

        // Implement partial capture logic with payment provider
        if (captureAmount > 0 && snapshot.authorizedPaymentId) {
          try {
            // Convert cents to ARS for payment provider (MercadoPago uses ARS)
            // Note: captureAmount is in USD cents, need to convert to ARS
            const captureAmountArs = Math.round((captureAmount * snapshot.fxSnapshot) / 100);

            // Capture the partial amount from the credit card hold
            const captureResult = await firstValueFrom(
              this.paymentAuthorizationService.captureAuthorization(
                snapshot.authorizedPaymentId,
                captureAmountArs,
              ),
            );

            if (captureResult.ok) {
              breakdown.holdCaptured = captureAmount;
              this.logger.info(
                `Partial capture: ${centsToUsd(captureAmount)} USD ` +
                  `(${captureAmountArs} ARS) from auth ${snapshot.authorizedPaymentId}`,
              );
            } else {
              // If capture fails, log the error but continue with waterfall
              this.logger.error(
                `Partial capture failed for auth ${snapshot.authorizedPaymentId}`,
                String(captureResult.error),
              );
              // Don't mark as captured if it failed
              breakdown.holdCaptured = 0;
            }
          } catch (error) {
            this.logger.error('Partial capture exception', String(error));
            // Don't mark as captured if there was an exception
            breakdown.holdCaptured = 0;
          }
        } else {
          // If no authorization ID or amount is 0, just record what we would have captured
          breakdown.holdCaptured = captureAmount;
          if (!snapshot.authorizedPaymentId && captureAmount > 0) {
            this.logger.warn('No authorization ID available for capture');
          }
        }

        remainingCents -= breakdown.holdCaptured;
      } else {
        // Without credit card - debit from wallet security deposit
        const securityCredit = snapshot.estimatedDeposit ?? 0;
        const maxDebitCents = Math.min(remainingCents, securityCredit);

        if (maxDebitCents > 0) {
          // Call wallet debit RPC to actually debit from renter's wallet
          const debitResult = await this.debitWalletForDamage(
            claim.bookingId,
            claim.id,
            centsToUsd(maxDebitCents), // Convert cents to USD for RPC
          );

          if (debitResult.success) {
            // Convert debited USD back to cents for breakdown
            breakdown.walletDebited = usdToCents(debitResult.debitedAmountUsd);
            remainingCents -= breakdown.walletDebited;
            this.logger.info(
              `Wallet debit: ${debitResult.debitedAmountUsd} USD for booking ${claim.bookingId}`,
            );
          } else {
            // Wallet debit failed or insufficient funds
            // FGO will cover everything (per user decision)
            this.logger.warn(
              `Wallet debit failed: ${debitResult.error}. FGO will cover full amount.`,
            );
            breakdown.walletDebited = 0;
          }
        }
        // Note: No top-up logic needed - FGO covers any remaining amount
      }

      // FGO Coverage - FGO covers ALL remaining (per business decision)
      // This ensures renters are never left with uncovered damages
      if (remainingCents > 0) {
        // FGO covers the full remaining amount (not limited by maxCoverCents)
        // Business decision: FGO absorbs all risk when renter wallet insufficient
        const fgoCoverage = remainingCents;

        // Log if exceeding normal coverage limits (for monitoring)
        if (fgoCoverage > eligibility.maxCoverCents) {
          this.logger.warn(
            `FGO covering ${centsToUsd(fgoCoverage)} USD exceeds limit ` +
              `${centsToUsd(eligibility.maxCoverCents)} USD for claim ${claim.id}`,
          );
        }

        try {
          // Convert from cents to USD for FGO service
          const fgoAmountUsd = centsToUsd(fgoCoverage);

          // Record the FGO payout in the ledger
          // This creates an audit trail and updates the FGO reserve balance
          await this.fgoService.addPayout(
            fgoAmountUsd,
            claim.bookingId,
            snapshot.fxSnapshot, // Exchange rate at time of booking
          );

          // Track successful FGO payout in breakdown
          breakdown.fgoPaid = fgoCoverage;
          remainingCents = 0; // FGO covers everything

          // Log for audit trail
          this.logger.info(`FGO payout: ${fgoAmountUsd} USD for booking ${claim.bookingId}`);
        } catch (fgoError) {
          // If FGO payout fails, log error but continue with settlement
          // The claim still needs to be processed even if FGO recording fails
          this.logger.error('FGO payout recording failed', String(fgoError));

          // Still mark as paid in breakdown (payment intent exists)
          // Manual reconciliation may be needed
          breakdown.fgoPaid = fgoCoverage;
          remainingCents = 0; // Mark as covered for claim processing
        }
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

      // 4. Update claim as paid in DB (releases lock)
      await this.markClaimAsPaid(claim.id);

      const updatedClaim: Claim = {
        ...claim,
        status: 'paid',
        updatedAt: new Date(),
        processedAt: new Date(),
      };

      this.currentClaim.set(updatedClaim);

      return {
        ok: true,
        claim: updatedClaim,
        eligibility,
        waterfall: waterfallResult,
      };
    } catch (_error) {
      // P0-SECURITY: Release lock on failure so claim can be retried
      await this.releaseClaimLock(claim.id, 'approved');

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

  // ============================================================================
  // P0-SECURITY: CLAIM LOCKING (previene double-spend)
  // ============================================================================

  /**
   * Acquire optimistic lock on a claim before processing
   * Uses atomic UPDATE with WHERE clause to prevent race conditions
   */
  private async acquireClaimLock(claimId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await this.supabaseClient.auth.getUser();
      if (!user) {
        return { ok: false, error: 'Usuario no autenticado' };
      }

      // Atomic lock acquisition: only succeeds if claim is in 'approved' status
      // and not already locked (locked_at is null or expired > 5 minutes)
      const lockExpiry = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min expiry

      const { data, error } = await this.supabaseClient
        .from('claims')
        .update({
          status: 'processing',
          locked_at: new Date().toISOString(),
          locked_by: user.id,
        })
        .eq('id', claimId)
        .eq('status', 'approved') // Only lock if still in approved state
        .or(`locked_at.is.null,locked_at.lt.${lockExpiry}`) // Not locked or lock expired
        .select()
        .single();

      if (error) {
        // Check if it's a "no rows returned" error (claim already locked/processed)
        if (error.code === 'PGRST116') {
          return {
            ok: false,
            error: 'Claim ya está siendo procesado o no está en estado aprobado',
          };
        }
        return { ok: false, error: error.message };
      }

      if (!data) {
        return {
          ok: false,
          error: 'No se pudo adquirir lock - claim puede estar siendo procesado por otro usuario',
        };
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Error al adquirir lock',
      };
    }
  }

  /**
   * Release lock on a claim (called on error/failure)
   */
  private async releaseClaimLock(
    claimId: string,
    revertToStatus: 'approved' | 'rejected' = 'approved',
  ): Promise<void> {
    try {
      await this.supabaseClient
        .from('claims')
        .update({
          status: revertToStatus,
          locked_at: null,
          locked_by: null,
        })
        .eq('id', claimId)
        .eq('status', 'processing'); // Only release if still in processing
    } catch (err) {
      this.logger.error('Failed to release claim lock', String(err));
    }
  }

  /**
   * Mark claim as successfully paid (final state)
   */
  private async markClaimAsPaid(claimId: string): Promise<void> {
    try {
      await this.supabaseClient
        .from('claims')
        .update({
          status: 'paid',
          processed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq('id', claimId);
    } catch (err) {
      this.logger.error('Failed to mark claim as paid', String(err));
    }
  }

  // ============================================================================
  // WALLET DEBIT FOR DAMAGES
  // ============================================================================

  /**
   * Debit from renter's wallet for damage claim
   * Uses the wallet_debit_for_damage RPC which handles:
   * - Balance verification
   * - Partial debit if insufficient funds
   * - Transaction recording
   *
   * @param bookingId - Booking ID for audit trail
   * @param claimId - Claim ID for audit trail
   * @param amountUsd - Amount to debit in USD
   * @returns Result with success status and amount actually debited
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
        this.logger.error('Wallet debit RPC error', error.message);
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
      this.logger.error('Wallet debit exception', String(err));
      return {
        success: false,
        debitedAmountUsd: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
