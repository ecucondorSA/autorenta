import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { InspectionStage, BookingInspection, isInspectionComplete } from '@core/models';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { DamageDetectionService } from '@core/services/verification/damage-detection.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

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
 * Resultado de validación de inspecciones
 */
export interface InspectionValidationResult {
  valid: boolean;
  missing: InspectionStage[];
}

/**
 * Resultado de validación anti-fraude
 */
export interface AntiFraudResult {
  ok: boolean;
  blocked: boolean;
  blockReason?: string;
  warnings?: Array<{ type: string; message: string; value?: number }>;
  ownerClaims30d?: number;
}

/**
 * ClaimValidationService
 *
 * Responsable de:
 * - Validar inspecciones (check-in/check-out)
 * - Comparar daños entre inspecciones
 * - Validación anti-fraude de claims
 * - Estimación de costos de daños
 *
 * Extraído de SettlementService para mejor separación de responsabilidades.
 */
@Injectable({
  providedIn: 'root',
})
export class ClaimValidationService {
  private readonly supabaseClient: SupabaseClient;
  private readonly damageDetectionService = inject(DamageDetectionService);
  private readonly logger = inject(LoggerService).createChildLogger('ClaimValidation');

  constructor(
    private readonly supabaseService: SupabaseClientService,
    private readonly fgoV1_1Service: FgoV1_1Service,
  ) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  // ============================================================================
  // VALIDACIÓN DE INSPECCIONES
  // ============================================================================

  /**
   * Valida que un booking tenga inspecciones completas (check-in y check-out)
   */
  async validateInspections(bookingId: string): Promise<InspectionValidationResult> {
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
        this.logger.warn(`compareDamages: Missing inspections for booking ${bookingId}`);
        return [];
      }

      // Extraer URLs de fotos
      const checkInImages = this.extractImageUrls(checkIn);
      const checkOutImages = this.extractImageUrls(checkOut);

      if (checkInImages.length === 0 || checkOutImages.length === 0) {
        this.logger.warn(`compareDamages: No images to analyze for booking ${bookingId}`);
        return [];
      }

      // Analizar imágenes con detección automática
      const analysisResult = await this.damageDetectionService.analyzeImages(
        checkInImages,
        checkOutImages,
      );

      if (!analysisResult.success) {
        this.logger.error(
          `compareDamages: Analysis failed for booking ${bookingId}: ${analysisResult.error}`,
        );
        return [];
      }

      // Convertir resultados a DamageItem[]
      return this.damageDetectionService.convertToDamageItems(analysisResult.damages);
    } catch (error) {
      this.logger.error(`compareDamages: Error analyzing damages for booking ${bookingId}`, String(error));
      return [];
    }
  }

  // ============================================================================
  // VALIDACIÓN ANTI-FRAUDE
  // ============================================================================

  /**
   * P0-SECURITY: Anti-fraud validation for claims
   * Calls the database function that checks for:
   * - Short booking duration (<24h)
   * - High claim frequency (3+ in 30 days)
   * - Unusually high amounts
   * - Suspicious round numbers
   */
  async validateClaimAntiFraud(
    bookingId: string,
    ownerId: string,
    totalEstimatedUsd: number,
  ): Promise<AntiFraudResult> {
    try {
      const { data, error } = await this.supabaseClient.rpc('validate_claim_anti_fraud', {
        p_booking_id: bookingId,
        p_owner_id: ownerId,
        p_total_estimated_usd: totalEstimatedUsd,
      });

      if (error) {
        this.logger.warn(`Anti-fraud check failed, allowing claim: ${error.message}`);
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
      this.logger.warn(`Anti-fraud validation exception: ${String(err)}`);
      // Fail open - don't block on errors
      return { ok: true, blocked: false };
    }
  }

  // ============================================================================
  // ESTIMACIÓN DE COSTOS
  // ============================================================================

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

  // ============================================================================
  // HELPERS PRIVADOS
  // ============================================================================

  /**
   * Extrae URLs de imágenes de una inspección
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
}
