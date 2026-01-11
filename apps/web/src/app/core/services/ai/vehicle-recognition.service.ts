import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// TYPES
// ============================================================================

export interface VehicleRecognition {
  brand: string;
  model: string;
  year_range: [number, number];
  color: string;
  body_type: 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'convertible' | 'wagon' | 'unknown';
  confidence: number;
}

export interface VehicleSuggestion {
  brand: string;
  model: string;
  confidence: number;
}

export interface VehicleValidation {
  matches: boolean;
  brand_match: boolean;
  model_match: boolean;
  color_match: boolean;
  year_match: boolean;
  discrepancies: string[];
}

export interface VehicleRecognitionResult {
  success: boolean;
  vehicle: VehicleRecognition;
  validation?: VehicleValidation;
  suggestions: VehicleSuggestion[];
  error?: string;
}

export interface ExpectedVehicle {
  brand: string;
  model: string;
  year?: number;
  color?: string;
}

// Body type labels
export const BODY_TYPE_LABELS: Record<VehicleRecognition['body_type'], string> = {
  sedan: 'Sedán',
  suv: 'SUV',
  hatchback: 'Hatchback',
  pickup: 'Pickup',
  van: 'Van/Furgoneta',
  coupe: 'Coupé',
  convertible: 'Convertible',
  wagon: 'Station Wagon',
  unknown: 'Desconocido',
};

// Common brands in LATAM for autocomplete
export const COMMON_BRANDS = [
  'Toyota', 'Volkswagen', 'Ford', 'Chevrolet', 'Fiat', 'Renault',
  'Honda', 'Hyundai', 'Kia', 'Nissan', 'Peugeot', 'Citroën',
  'Mazda', 'Mitsubishi', 'Jeep', 'Suzuki', 'Mercedes-Benz', 'BMW',
  'Audi', 'Volvo', 'Subaru', 'Dodge', 'RAM', 'Chrysler',
];

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Vehicle Recognition Service
 *
 * Identifies vehicle make, model, year, and color from photos using AI.
 * Can also validate if photos match expected vehicle information.
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleRecognitionService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  private readonly EDGE_FUNCTION_URL = 'recognize-vehicle';

  // Signals
  readonly isProcessing = signal(false);
  readonly lastResult = signal<VehicleRecognitionResult | null>(null);
  readonly lastError = signal<string | null>(null);

  // Computed
  readonly recognizedVehicle = computed(() => this.lastResult()?.vehicle);
  readonly suggestions = computed(() => this.lastResult()?.suggestions ?? []);
  readonly isHighConfidence = computed(() => (this.lastResult()?.vehicle.confidence ?? 0) >= 80);

  // ============================================================================
  // RECOGNITION METHODS
  // ============================================================================

  /**
   * Recognizes vehicle from image URL
   */
  async recognizeFromUrl(imageUrl: string): Promise<VehicleRecognitionResult> {
    this.isProcessing.set(true);
    this.lastError.set(null);

    try {
      this.logger.info('Recognizing vehicle from URL...', 'VehicleRecognition');

      const { data, error } = await this.supabaseClient.functions.invoke<VehicleRecognitionResult>(
        this.EDGE_FUNCTION_URL,
        {
          body: { image_url: imageUrl },
        }
      );

      if (error) {
        this.logger.error('Edge function error', 'VehicleRecognition', error);
        throw new Error(error.message || 'Error al reconocer vehículo');
      }

      if (!data) {
        throw new Error('No data returned from recognition');
      }

      this.lastResult.set(data);
      this.logger.info(
        `Recognized: ${data.vehicle.brand} ${data.vehicle.model} (${data.vehicle.confidence}%)`,
        'VehicleRecognition'
      );

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.lastError.set(message);
      this.logger.error('Recognition failed', 'VehicleRecognition', err);

      return {
        success: false,
        vehicle: {
          brand: 'Desconocido',
          model: 'Desconocido',
          year_range: [2000, new Date().getFullYear()],
          color: 'desconocido',
          body_type: 'unknown',
          confidence: 0,
        },
        suggestions: [],
        error: message,
      };
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Recognizes vehicle from base64 image data
   */
  async recognizeFromBase64(base64Data: string): Promise<VehicleRecognitionResult> {
    this.isProcessing.set(true);
    this.lastError.set(null);

    try {
      this.logger.info('Recognizing vehicle from base64...', 'VehicleRecognition');

      const { data, error } = await this.supabaseClient.functions.invoke<VehicleRecognitionResult>(
        this.EDGE_FUNCTION_URL,
        {
          body: { image_base64: base64Data },
        }
      );

      if (error) {
        throw new Error(error.message || 'Error al reconocer vehículo');
      }

      if (!data) {
        throw new Error('No data returned from recognition');
      }

      this.lastResult.set(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.lastError.set(message);

      return {
        success: false,
        vehicle: {
          brand: 'Desconocido',
          model: 'Desconocido',
          year_range: [2000, new Date().getFullYear()],
          color: 'desconocido',
          body_type: 'unknown',
          confidence: 0,
        },
        suggestions: [],
        error: message,
      };
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Validates if photo matches expected vehicle
   */
  async validateVehicle(
    imageUrl: string,
    expected: ExpectedVehicle
  ): Promise<{
    matches: boolean;
    discrepancies: string[];
    result: VehicleRecognitionResult;
  }> {
    this.isProcessing.set(true);
    this.lastError.set(null);

    try {
      this.logger.info(
        `Validating vehicle: expected ${expected.brand} ${expected.model}`,
        'VehicleRecognition'
      );

      const { data, error } = await this.supabaseClient.functions.invoke<VehicleRecognitionResult>(
        this.EDGE_FUNCTION_URL,
        {
          body: {
            image_url: imageUrl,
            validate_against: expected,
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Error al validar vehículo');
      }

      if (!data) {
        throw new Error('No data returned from validation');
      }

      this.lastResult.set(data);

      return {
        matches: data.validation?.matches ?? false,
        discrepancies: data.validation?.discrepancies ?? [],
        result: data,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.lastError.set(message);

      return {
        matches: false,
        discrepancies: [message],
        result: {
          success: false,
          vehicle: {
            brand: 'Desconocido',
            model: 'Desconocido',
            year_range: [2000, new Date().getFullYear()],
            color: 'desconocido',
            body_type: 'unknown',
            confidence: 0,
          },
          suggestions: [],
          error: message,
        },
      };
    } finally {
      this.isProcessing.set(false);
    }
  }

  // ============================================================================
  // AUTO-COMPLETE HELPERS
  // ============================================================================

  /**
   * Gets auto-complete values for form fields based on recognition
   */
  getAutoCompleteValues(): {
    brand?: string;
    model?: string;
    yearSuggestion?: [number, number];
    color?: string;
    bodyType?: string;
  } | null {
    const result = this.lastResult();
    if (!result?.success || result.vehicle.confidence < 60) {
      return null;
    }

    return {
      brand: result.vehicle.brand !== 'Desconocido' ? result.vehicle.brand : undefined,
      model: result.vehicle.model !== 'Desconocido' ? result.vehicle.model : undefined,
      yearSuggestion: result.vehicle.year_range,
      color: result.vehicle.color !== 'desconocido' ? result.vehicle.color : undefined,
      bodyType: result.vehicle.body_type !== 'unknown' ? result.vehicle.body_type : undefined,
    };
  }

  /**
   * Checks if recognition is confident enough for auto-complete
   */
  isConfidentForAutoComplete(): boolean {
    return (this.lastResult()?.vehicle.confidence ?? 0) >= 70;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Gets body type label
   */
  getBodyTypeLabel(bodyType: VehicleRecognition['body_type']): string {
    return BODY_TYPE_LABELS[bodyType] || 'Desconocido';
  }

  /**
   * Gets confidence level description
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * Gets confidence color class
   */
  getConfidenceColorClass(confidence: number): string {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * Formats year range for display
   */
  formatYearRange(range: [number, number]): string {
    if (range[0] === range[1]) {
      return range[0].toString();
    }
    return `${range[0]}-${range[1]}`;
  }

  /**
   * Clears last result
   */
  clearResult(): void {
    this.lastResult.set(null);
    this.lastError.set(null);
  }

  /**
   * Gets common brands for autocomplete
   */
  getCommonBrands(): string[] {
    return COMMON_BRANDS;
  }

  /**
   * Filters brands by search term
   */
  filterBrands(searchTerm: string): string[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return COMMON_BRANDS.slice(0, 10);

    return COMMON_BRANDS.filter(brand =>
      brand.toLowerCase().includes(term)
    );
  }
}
