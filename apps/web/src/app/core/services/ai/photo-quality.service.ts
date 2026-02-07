import { Injectable, computed, inject, signal } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

// ============================================================================
// TYPES
// ============================================================================

export interface PhotoIssue {
  type:
    | 'blur'
    | 'dark'
    | 'overexposed'
    | 'cropped'
    | 'wrong_subject'
    | 'obstruction'
    | 'reflection'
    | 'low_resolution';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PhotoQualityResult {
  success: boolean;
  quality: {
    score: number;
    is_acceptable: boolean;
    issues: PhotoIssue[];
  };
  content: {
    matches_subject: boolean;
    detected_subject: string;
    area_coverage: number;
    position_detected?: string;
  };
  recommendations: string[];
  error?: string;
}

export type ExpectedSubject = 'vehicle_exterior' | 'vehicle_interior' | 'document' | 'damage';
export type VehiclePosition =
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'interior'
  | 'dashboard'
  | 'trunk';

export interface PhotoValidation {
  photoIndex: number;
  url: string;
  result: PhotoQualityResult;
}

// Labels for display
export const ISSUE_TYPE_LABELS: Record<PhotoIssue['type'], string> = {
  blur: 'Imagen borrosa',
  dark: 'Muy oscura',
  overexposed: 'Sobreexpuesta',
  cropped: 'Mal encuadrada',
  wrong_subject: 'Contenido incorrecto',
  obstruction: 'Obstrucción visible',
  reflection: 'Reflejos',
  low_resolution: 'Baja resolución',
};

export const PHOTO_SEVERITY_LABELS: Record<PhotoIssue['severity'], string> = {
  low: 'Menor',
  medium: 'Moderado',
  high: 'Crítico',
};

export const POSITION_LABELS: Record<VehiclePosition, string> = {
  front: 'Frente',
  rear: 'Trasera',
  left: 'Lateral Izquierdo',
  right: 'Lateral Derecho',
  interior: 'Interior',
  dashboard: 'Tablero',
  trunk: 'Maletero',
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Photo Quality Service
 *
 * Validates photo quality for vehicle listings using AI.
 * Detects blur, poor lighting, wrong framing, and validates content.
 */
@Injectable({
  providedIn: 'root',
})
export class PhotoQualityService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  private readonly EDGE_FUNCTION_URL = 'ai-vision-service/validate-quality';

  // Signals for reactive state
  readonly isValidating = signal(false);
  readonly currentPhotoIndex = signal<number | null>(null);
  readonly results = signal<Map<number, PhotoQualityResult>>(new Map());
  readonly lastError = signal<string | null>(null);

  // Computed values
  readonly hasBlockingIssues = computed(() => {
    const resultsMap = this.results();
    for (const result of resultsMap.values()) {
      if (!result.quality.is_acceptable) {
        return true;
      }
    }
    return false;
  });

  readonly averageScore = computed(() => {
    const resultsMap = this.results();
    if (resultsMap.size === 0) return 0;

    let total = 0;
    for (const result of resultsMap.values()) {
      total += result.quality.score;
    }
    return Math.round(total / resultsMap.size);
  });

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validates a single photo's quality
   */
  async validatePhoto(
    imageUrl: string,
    subject: ExpectedSubject,
    position?: VehiclePosition,
  ): Promise<PhotoQualityResult> {
    this.isValidating.set(true);
    this.lastError.set(null);

    try {
      this.logger.info(`Validating photo quality for ${subject}`, 'PhotoQuality');

      const { data, error } = await this.supabaseClient.functions.invoke<PhotoQualityResult>(
        this.EDGE_FUNCTION_URL,
        {
          body: {
            image_url: imageUrl,
            expected_subject: subject,
            position,
          },
        },
      );

      if (error) {
        this.logger.error('Edge function error', 'PhotoQuality', error);
        throw new Error(error.message || 'Error al validar foto');
      }

      if (!data) {
        throw new Error('No data returned from validation');
      }

      this.logger.info(`Photo quality score: ${data.quality.score}`, 'PhotoQuality');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.lastError.set(message);
      this.logger.error('Validation failed', 'PhotoQuality', err);

      return {
        success: false,
        quality: { score: 0, is_acceptable: false, issues: [] },
        content: { matches_subject: false, detected_subject: '', area_coverage: 0 },
        recommendations: [],
        error: message,
      };
    } finally {
      this.isValidating.set(false);
    }
  }

  /**
   * Validates a photo and stores result by index
   */
  async validatePhotoAtIndex(
    index: number,
    imageUrl: string,
    subject: ExpectedSubject,
    position?: VehiclePosition,
  ): Promise<PhotoQualityResult> {
    this.currentPhotoIndex.set(index);

    const result = await this.validatePhoto(imageUrl, subject, position);

    // Store result
    this.results.update((map) => {
      const newMap = new Map(map);
      newMap.set(index, result);
      return newMap;
    });

    this.currentPhotoIndex.set(null);
    return result;
  }

  /**
   * Validates multiple photos in parallel
   */
  async validateAllPhotos(
    photos: Array<{ url: string; position?: VehiclePosition }>,
    subject: ExpectedSubject = 'vehicle_exterior',
  ): Promise<{
    allValid: boolean;
    results: PhotoValidation[];
    blocking: PhotoValidation[];
    warnings: PhotoValidation[];
  }> {
    this.isValidating.set(true);
    this.results.set(new Map());

    try {
      const validations = await Promise.all(
        photos.map(async (photo, index) => {
          const result = await this.validatePhoto(photo.url, subject, photo.position);

          // Store result
          this.results.update((map) => {
            const newMap = new Map(map);
            newMap.set(index, result);
            return newMap;
          });

          return {
            photoIndex: index,
            url: photo.url,
            result,
          };
        }),
      );

      const blocking = validations.filter((v) => !v.result.quality.is_acceptable);
      const warnings = validations.filter(
        (v) => v.result.quality.is_acceptable && v.result.quality.issues.length > 0,
      );

      return {
        allValid: blocking.length === 0,
        results: validations,
        blocking,
        warnings,
      };
    } finally {
      this.isValidating.set(false);
    }
  }

  // ============================================================================
  // RESULT HELPERS
  // ============================================================================

  /**
   * Gets the result for a specific photo index
   */
  getResultForPhoto(index: number): PhotoQualityResult | undefined {
    return this.results().get(index);
  }

  /**
   * Checks if a photo has blocking issues
   */
  hasBlockingIssuesForPhoto(index: number): boolean {
    const result = this.results().get(index);
    return result ? !result.quality.is_acceptable : false;
  }

  /**
   * Gets issues for a specific photo
   */
  getIssuesForPhoto(index: number): PhotoIssue[] {
    return this.results().get(index)?.quality.issues ?? [];
  }

  /**
   * Gets high severity issues
   */
  getHighSeverityIssues(issues: PhotoIssue[]): PhotoIssue[] {
    return issues.filter((i) => i.severity === 'high');
  }

  /**
   * Clears all stored results
   */
  clearResults(): void {
    this.results.set(new Map());
    this.lastError.set(null);
  }

  /**
   * Removes result for a specific photo
   */
  removeResult(index: number): void {
    this.results.update((map) => {
      const newMap = new Map(map);
      newMap.delete(index);
      return newMap;
    });
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Gets human-readable label for issue type
   */
  getIssueTypeLabel(type: PhotoIssue['type']): string {
    return ISSUE_TYPE_LABELS[type] || type;
  }

  /**
   * Gets human-readable label for severity
   */
  getSeverityLabel(severity: PhotoIssue['severity']): string {
    return PHOTO_SEVERITY_LABELS[severity] || severity;
  }

  /**
   * Gets CSS class for severity
   */
  getSeverityClass(severity: PhotoIssue['severity']): string {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Gets score color class
   */
  getScoreColorClass(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * Gets position label
   */
  getPositionLabel(position: VehiclePosition): string {
    return POSITION_LABELS[position] || position;
  }
}
