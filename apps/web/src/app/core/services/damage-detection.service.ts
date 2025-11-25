import { Injectable, inject } from '@angular/core';
import { DamageItem, DamageType } from './settlement.service';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Resultado de análisis de daño detectado
 */
export interface DetectedDamage {
  type: DamageType;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  confidence: number; // 0-1, confianza del algoritmo
  location?: string; // Ubicación en el auto (ej: "frente izquierdo")
  estimatedCostUsd: number;
}

/**
 * Resultado del análisis de imágenes
 */
export interface ImageAnalysisResult {
  success: boolean;
  damages: DetectedDamage[];
  totalEstimatedCostUsd: number;
  analysisNotes: string;
  error?: string;
}

/**
 * Damage Detection Service
 *
 * Analiza imágenes de check-in vs check-out para detectar daños automáticamente.
 * Utiliza análisis de imágenes para identificar cambios y clasificar daños.
 *
 * Características:
 * - Comparación de imágenes (check-in vs check-out)
 * - Detección de tipos de daño: rayones, abolladuras, vidrios rotos, etc.
 * - Clasificación por severidad
 * - Estimación de costo
 * - Nivel de confianza por daño detectado
 *
 * En producción se podría usar:
 * - Claude Vision API para análisis de imágenes
 * - TensorFlow/ML.js para detección local
 * - AWS Rekognition o similar
 */
@Injectable({
  providedIn: 'root',
})
export class DamageDetectionService {
  private readonly supabaseService = inject(SupabaseClientService);

  /**
   * Analiza y compara imágenes de check-in vs check-out
   *
   * @param checkInImages - URLs de imágenes de check-in
   * @param checkOutImages - URLs de imágenes de check-out
   * @returns Resultado del análisis con daños detectados
   */
  async analyzeImages(
    checkInImages: string[],
    checkOutImages: string[],
  ): Promise<ImageAnalysisResult> {
    try {
      // Validar entrada
      if (!checkInImages?.length || !checkOutImages?.length) {
        return {
          success: true,
          damages: [],
          totalEstimatedCostUsd: 0,
          analysisNotes: 'No hay imágenes para analizar',
        };
      }

      // Analizar cada par de imágenes
      const detectedDamages: DetectedDamage[] = [];

      for (let i = 0; i < Math.min(checkInImages.length, checkOutImages.length); i++) {
        const checkInImage = checkInImages[i];
        const checkOutImage = checkOutImages[i];

        const damages = await this.comparePair(checkInImage, checkOutImage, i + 1);
        detectedDamages.push(...damages);
      }

      // Consolidar daños duplicados (mismo tipo, ubicación similar)
      const consolidatedDamages = this.consolidateDamages(detectedDamages);

      // Calcular total
      const totalEstimatedCostUsd = consolidatedDamages.reduce(
        (sum, d) => sum + d.estimatedCostUsd,
        0,
      );

      return {
        success: true,
        damages: consolidatedDamages,
        totalEstimatedCostUsd,
        analysisNotes: `Análisis automático completado. Detectados ${consolidatedDamages.length} daño(s).`,
      };
    } catch (error) {
      return {
        success: false,
        damages: [],
        totalEstimatedCostUsd: 0,
        analysisNotes: 'Error durante el análisis de imágenes',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Compara un par de imágenes (check-in vs check-out)
   * @private
   */
  private async comparePair(
    checkInUrl: string,
    checkOutUrl: string,
    pairIndex: number,
  ): Promise<DetectedDamage[]> {
    try {
      // Obtener token de autenticación
      const supabase = this.supabaseService.getClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener URL base de Supabase
      const supabaseUrl = this.getSupabaseUrl();
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/analyze-damage-images`;

      // Llamar a Edge Function para análisis
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          check_in_image_url: checkInUrl,
          check_out_image_url: checkOutUrl,
          pair_index: pairIndex,
        }),
      });

      if (!response.ok) {
        console.error(`Error analyzing image pair ${pairIndex}:`, response.statusText);
        return [];
      }

      const data = await response.json();

      if (!data.success) {
        console.warn(`Image pair ${pairIndex} analysis returned no damages`);
        return [];
      }

      // Mapear resultados a DetectedDamage[]
      return (data.damages || []).map((damage: any) => ({
        type: this.mapDamageType(damage.type),
        description: damage.description || this.getDefaultDescription(damage.type),
        severity: this.mapSeverity(damage.severity),
        confidence: parseFloat(damage.confidence) || 0.5,
        location: damage.location || `Imagen ${pairIndex}`,
        estimatedCostUsd: this.estimateCost(damage.type, damage.severity),
      }));
    } catch (error) {
      console.error(`Error comparing image pair ${pairIndex}:`, error);
      return [];
    }
  }

  /**
   * Consolida daños duplicados (mismo tipo, similar ubicación)
   * @private
   */
  private consolidateDamages(damages: DetectedDamage[]): DetectedDamage[] {
    if (damages.length === 0) return [];

    // Agrupar por tipo de daño
    const grouped = damages.reduce(
      (acc, damage) => {
        const key = damage.type;
        if (!acc[key]) acc[key] = [];
        acc[key].push(damage);
        return acc;
      },
      {} as Record<DamageType, DetectedDamage[]>,
    );

    // Para cada grupo, mantener el de mayor confianza y severidad
    const consolidated: DetectedDamage[] = [];

    for (const [_type, items] of Object.entries(grouped)) {
      if (items.length === 0) continue;

      // Ordenar por confianza y severidad
      const sorted = items.sort((a, b) => {
        const severityScore = { minor: 1, moderate: 2, severe: 3 };
        const severityDiff =
          severityScore[b.severity] - severityScore[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.confidence - a.confidence;
      });

      // Tomar el primero (mejor) y actualizar estimación
      const best = sorted[0];
      best.description = `${best.description} (${sorted.length} instancia(s) detectada(s))`;

      consolidated.push(best);
    }

    // Ordenar por severidad
    return consolidated.sort((a, b) => {
      const severityScore = { minor: 1, moderate: 2, severe: 3 };
      return severityScore[b.severity] - severityScore[a.severity];
    });
  }

  /**
   * Mapea tipos de daño detectados a DamageType estándar
   * @private
   */
  private mapDamageType(detectedType: string): DamageType {
    const typeMap: Record<string, DamageType> = {
      scratch: 'scratch',
      scratches: 'scratch',
      rayón: 'scratch',
      rayones: 'scratch',
      dent: 'dent',
      dents: 'dent',
      abolladura: 'dent',
      abolladuras: 'dent',
      broken_glass: 'broken_glass',
      glass_break: 'broken_glass',
      vidrio_roto: 'broken_glass',
      tire: 'tire_damage',
      tire_damage: 'tire_damage',
      neumático: 'tire_damage',
      mechanical: 'mechanical',
      falla: 'mechanical',
      interior: 'interior',
      missing: 'missing_item',
      missing_item: 'missing_item',
      faltante: 'missing_item',
      other: 'other',
      otro: 'other',
    };

    return typeMap[detectedType.toLowerCase()] || 'other';
  }

  /**
   * Mapea nivel de severidad
   * @private
   */
  private mapSeverity(
    detectedSeverity: string,
  ): 'minor' | 'moderate' | 'severe' {
    const lower = detectedSeverity.toLowerCase();
    if (lower.includes('severe') || lower.includes('grave')) return 'severe';
    if (lower.includes('moderate') || lower.includes('moderate')) return 'moderate';
    return 'minor';
  }

  /**
   * Estima costo en USD basado en tipo y severidad
   * @private
   */
  private estimateCost(damageType: DamageType, severity: string): number {
    const baseCosts: Record<DamageType, number> = {
      scratch: 150, // Rayón: $150-500
      dent: 300, // Abolladura: $300-800
      broken_glass: 400, // Vidrio: $400-1500
      tire_damage: 200, // Neumático: $200-600
      mechanical: 500, // Mecánica: $500+
      interior: 250, // Interior: $250-1000
      missing_item: 100, // Faltante: $100-500
      other: 200, // Otro: $200-500
    };

    let cost = baseCosts[damageType] || 200;

    // Multiplicar por severidad
    if (severity.toLowerCase().includes('severe')) {
      cost *= 2;
    } else if (severity.toLowerCase().includes('moderate')) {
      cost *= 1.5;
    }

    return Math.round(cost);
  }

  /**
   * Retorna descripción por defecto según tipo
   * @private
   */
  private getDefaultDescription(damageType: string): string {
    const descriptions: Record<string, string> = {
      scratch: 'Rayón en la pintura',
      dent: 'Abolladura en la carrocería',
      broken_glass: 'Vidrio o espejo roto',
      tire_damage: 'Daño en neumático',
      mechanical: 'Problema mecánico detectado',
      interior: 'Daño en el interior',
      missing_item: 'Artículo faltante',
      other: 'Daño no especificado',
    };

    return descriptions[damageType.toLowerCase()] || 'Daño detectado automáticamente';
  }

  /**
   * Obtiene la URL base de Supabase
   * @private
   */
  private getSupabaseUrl(): string {
    const supabase = this.supabaseService.getClient();
    // @ts-expect-error - Acceso interno al URL
    return supabase.supabaseUrl || '';
  }

  /**
   * Convierte DetectedDamage a DamageItem para usar en Claims
   */
  convertToDamageItems(detected: DetectedDamage[]): DamageItem[] {
    return detected.map((d) => ({
      type: d.type,
      description: d.description,
      estimatedCostUsd: d.estimatedCostUsd,
      severity: d.severity,
      photos: [], // Las fotos se usan en el análisis, no se almacenan en DamageItem
    }));
  }
}
