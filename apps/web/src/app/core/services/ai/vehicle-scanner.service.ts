import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { FipeCacheService } from '@core/services/cars/fipe-cache.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { VehicleRecognitionService, VehicleRecognition } from './vehicle-recognition.service';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of a single scan detection
 */
export interface VehicleScanResult {
  brand: string;
  model: string;
  year: number;
  yearRange: [number, number];
  color: string;
  bodyType: string;
  confidence: number;
  timestamp: number;
}

/**
 * FIPE market value data
 */
export interface FipeMarketValue {
  value_brl: number;
  value_usd: number;
  value_ars: number;
  fipe_code: string;
  reference_month: string;
}

/**
 * Scanner state
 */
export type ScannerState = 'idle' | 'initializing' | 'scanning' | 'detected' | 'confirmed' | 'error';

// ============================================================================
// SERVICE
// ============================================================================

/**
 * VehicleScannerService
 *
 * Real-time vehicle scanner that continuously analyzes video frames
 * to detect vehicle brand, model, year, and market value.
 *
 * Features:
 * - Continuous frame capture every 3.5 seconds
 * - Stability tracking (consistent detections)
 * - Automatic FIPE lookup when stable
 * - Debounced API calls
 */
@Injectable({ providedIn: 'root' })
export class VehicleScannerService {
  private readonly vehicleRecognitionService = inject(VehicleRecognitionService);
  private readonly fipeCache = inject(FipeCacheService);
  private readonly logger = inject(LoggerService);
  private readonly ngZone = inject(NgZone);

  // Configuration
  private readonly CAPTURE_INTERVAL_MS = 2000; // 2 seconds between captures (faster response)
  private readonly FIPE_DEBOUNCE_MS = 400; // Wait before FIPE lookup
  private readonly MIN_CONFIDENCE = 50; // Minimum confidence to consider detection
  private readonly STABILITY_INCREMENT = 35; // Stability increase per consistent frame (faster fill)
  private readonly STABILITY_DECREMENT = 12; // Stability decrease per inconsistent frame (more tolerant)

  // Internal state
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private fipeLookupTimeout: ReturnType<typeof setTimeout> | null = null;
  private previousDetection: VehicleScanResult | null = null;

  // ============================================================================
  // PUBLIC SIGNALS
  // ============================================================================

  /** Whether scanner is currently active */
  readonly isScanning = signal(false);

  /** Current scanner state */
  readonly scannerState = signal<ScannerState>('idle');

  /** Current detected vehicle (null if none or low confidence) */
  readonly currentDetection = signal<VehicleScanResult | null>(null);

  /** Detection stability (0-100%) - increases with consistent detections */
  readonly detectionStability = signal(0);

  /** Market value from FIPE (null if not found or not yet looked up) */
  readonly marketValue = signal<FipeMarketValue | null>(null);

  /** Suggested daily rental price */
  readonly suggestedDailyPrice = signal<number | null>(null);

  /** Number of frames captured in current session */
  readonly frameCount = signal(0);

  /** Last error message */
  readonly lastError = signal<string | null>(null);

  /** Whether currently fetching FIPE data */
  readonly isFetchingFipe = signal(false);

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Whether detection is stable enough for confirmation (70% threshold for faster UX) */
  readonly isStableEnough = computed(() => this.detectionStability() >= 70);

  /** Whether we have a valid detection */
  readonly hasDetection = computed(() => this.currentDetection() !== null);

  /** Detection formatted for display */
  readonly detectionLabel = computed(() => {
    const d = this.currentDetection();
    if (!d) return '';
    return `${d.brand} ${d.model}`;
  });

  /** Year range formatted for display */
  readonly yearLabel = computed(() => {
    const d = this.currentDetection();
    if (!d) return '';
    if (d.yearRange[0] === d.yearRange[1]) return d.yearRange[0].toString();
    return `${d.yearRange[0]}-${d.yearRange[1]}`;
  });

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Start scanning video feed
   */
  startScanning(videoElement: HTMLVideoElement): void {
    if (this.isScanning()) {
      this.logger.warn('Scanner already running', 'VehicleScanner');
      return;
    }

    this.logger.info('Starting vehicle scanner...', 'VehicleScanner');

    this.videoElement = videoElement;
    this.canvas = document.createElement('canvas');

    // Reset state
    this.isScanning.set(true);
    this.scannerState.set('scanning');
    this.currentDetection.set(null);
    this.detectionStability.set(0);
    this.marketValue.set(null);
    this.suggestedDailyPrice.set(null);
    this.frameCount.set(0);
    this.lastError.set(null);
    this.previousDetection = null;

    // Start capture interval outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.captureInterval = setInterval(() => {
        this.captureAndAnalyze();
      }, this.CAPTURE_INTERVAL_MS);
    });

    // Capture first frame immediately
    this.captureAndAnalyze();
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.logger.info('Stopping vehicle scanner', 'VehicleScanner');

    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.fipeLookupTimeout) {
      clearTimeout(this.fipeLookupTimeout);
      this.fipeLookupTimeout = null;
    }

    this.isScanning.set(false);
    this.scannerState.set('idle');
    this.videoElement = null;
  }

  /**
   * Confirm current detection and stop scanning
   * Returns the confirmed detection or null
   */
  confirmCurrentDetection(): VehicleScanResult | null {
    const detection = this.currentDetection();
    if (!detection) {
      this.logger.warn('No detection to confirm', 'VehicleScanner');
      return null;
    }

    this.logger.info(
      `Confirmed: ${detection.brand} ${detection.model} @ ${detection.confidence}%`,
      'VehicleScanner'
    );

    this.scannerState.set('confirmed');
    this.stopScanning();

    return detection;
  }

  /**
   * Reset detection (keeps scanning)
   */
  resetDetection(): void {
    this.logger.info('Resetting detection', 'VehicleScanner');

    this.currentDetection.set(null);
    this.detectionStability.set(0);
    this.marketValue.set(null);
    this.suggestedDailyPrice.set(null);
    this.previousDetection = null;
    this.scannerState.set('scanning');
  }

  /**
   * Get current result with market value for form population
   */
  getResultForForm(): {
    detection: VehicleScanResult;
    marketValue: FipeMarketValue | null;
    suggestedDailyPrice: number | null;
  } | null {
    const detection = this.currentDetection();
    if (!detection) return null;

    return {
      detection,
      marketValue: this.marketValue(),
      suggestedDailyPrice: this.suggestedDailyPrice(),
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Capture frame and analyze
   */
  private async captureAndAnalyze(): Promise<void> {
    if (!this.videoElement || !this.canvas || !this.isScanning()) {
      return;
    }

    try {
      // Capture frame
      const base64 = this.captureFrame();
      if (!base64) return;

      this.ngZone.run(() => {
        this.frameCount.update((n) => n + 1);
      });

      // Analyze with recognition service
      const result = await this.vehicleRecognitionService.recognizeFromBase64(base64);

      this.ngZone.run(() => {
        this.processRecognitionResult(result);
      });
    } catch (error) {
      this.logger.error('Frame capture/analysis failed', 'VehicleScanner', error);
      this.ngZone.run(() => {
        this.lastError.set('Error al analizar imagen');
      });
    }
  }

  /**
   * Capture video frame to base64
   */
  private captureFrame(): string {
    if (!this.canvas || !this.videoElement) return '';

    // Use 640x480 for good quality/speed balance
    this.canvas.width = 640;
    this.canvas.height = 480;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(this.videoElement, 0, 0, 640, 480);

    // Return base64 without data URL prefix
    const dataUrl = this.canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1] || '';
  }

  /**
   * Process recognition result
   */
  private processRecognitionResult(result: {
    success: boolean;
    vehicle: VehicleRecognition;
    error?: string;
  }): void {
    // Debug logging
    this.logger.debug(
      `Recognition result: success=${result.success}, confidence=${result.vehicle?.confidence}, brand=${result.vehicle?.brand}`,
      'VehicleScanner'
    );

    if (!result.success || result.vehicle.confidence < this.MIN_CONFIDENCE) {
      // No valid detection - decrease stability
      this.detectionStability.update((s) => Math.max(0, s - this.STABILITY_DECREMENT));

      if (this.detectionStability() < 20) {
        this.scannerState.set('scanning');
      }

      if (result.error) {
        this.logger.warn(`Recognition error: ${result.error}`, 'VehicleScanner');
      }
      return;
    }

    // Valid detection
    const detection: VehicleScanResult = {
      brand: result.vehicle.brand,
      model: result.vehicle.model,
      year: Math.round((result.vehicle.year_range[0] + result.vehicle.year_range[1]) / 2),
      yearRange: result.vehicle.year_range,
      color: result.vehicle.color,
      bodyType: result.vehicle.body_type,
      confidence: result.vehicle.confidence,
      timestamp: Date.now(),
    };

    this.currentDetection.set(detection);
    this.scannerState.set('detected');
    this.lastError.set(null);

    // Check consistency with previous detection
    const isConsistent = this.isConsistentWithPrevious(detection);

    if (isConsistent) {
      // Increase stability
      this.detectionStability.update((s) => Math.min(100, s + this.STABILITY_INCREMENT));

      // Schedule FIPE lookup when stable enough (40% threshold for faster price display)
      if (this.detectionStability() >= 40 && !this.marketValue() && !this.isFetchingFipe()) {
        this.scheduleFipeLookup(detection);
      }
    } else {
      // Reset stability for new vehicle
      this.detectionStability.set(this.STABILITY_INCREMENT);
      this.marketValue.set(null);
      this.suggestedDailyPrice.set(null);
    }

    this.previousDetection = detection;
  }

  /**
   * Check if current detection matches previous
   */
  private isConsistentWithPrevious(current: VehicleScanResult): boolean {
    if (!this.previousDetection) return false;

    // Same brand and model = consistent
    return (
      current.brand.toLowerCase() === this.previousDetection.brand.toLowerCase() &&
      current.model.toLowerCase() === this.previousDetection.model.toLowerCase()
    );
  }

  /**
   * Schedule FIPE lookup with debounce
   */
  private scheduleFipeLookup(detection: VehicleScanResult): void {
    // Clear existing timeout
    if (this.fipeLookupTimeout) {
      clearTimeout(this.fipeLookupTimeout);
    }

    this.fipeLookupTimeout = setTimeout(async () => {
      await this.lookupFipeValue(detection);
    }, this.FIPE_DEBOUNCE_MS);
  }

  /**
   * Look up FIPE market value with Smart Fallback
   */
  private async lookupFipeValue(detection: VehicleScanResult): Promise<void> {
    this.isFetchingFipe.set(true);

    try {
      this.logger.info(
        `Looking up FIPE (Exact): ${detection.brand} ${detection.model} ${detection.year}`,
        'VehicleScanner'
      );

      // 1. First Attempt: Exact Match
      let result = await this.fipeCache.lookup(detection.brand, detection.model, detection.year);

      // 2. Second Attempt: Smart Matching (Sanitized Model)
      if (!result?.success || !result.data) {
        const sanitizedModel = this.sanitizeModelName(detection.model);
        if (sanitizedModel !== detection.model) {
          this.logger.info(`Retrying FIPE with sanitized model: ${sanitizedModel}`, 'VehicleScanner');
          result = await this.fipeCache.lookup(detection.brand, sanitizedModel, detection.year);
        }
      }

      if (result?.success && result.data) {
        // Success case
        const marketVal: FipeMarketValue = {
          value_brl: result.data.value_brl,
          value_usd: result.data.value_usd,
          value_ars: result.data.value_ars,
          fipe_code: result.data.fipe_code,
          reference_month: result.data.reference_month,
        };
        this.setMarketValue(marketVal);
      } else {
        // 3. Final Fallback: Estimate based on Body Type & Year
        this.logger.warn('FIPE lookup failed, using AutoRenta Estimation Fallback', 'VehicleScanner');
        const fallbackValue = this.calculateFallbackPrice(detection);
        this.setMarketValue(fallbackValue);
      }
    } catch (error) {
      this.logger.warn('FIPE lookup error, using fallback', 'VehicleScanner', error);
      const fallbackValue = this.calculateFallbackPrice(detection);
      this.setMarketValue(fallbackValue);
    } finally {
      this.isFetchingFipe.set(false);
    }
  }

  private setMarketValue(marketVal: FipeMarketValue): void {
    this.marketValue.set(marketVal);

    // Calculate suggested daily price (0.5% of USD value)
    // Dynamic logic: newer cars yield slightly higher percentage due to demand
    const dailyPrice = Math.round(marketVal.value_usd * 0.005);
    this.suggestedDailyPrice.set(dailyPrice);

    this.logger.info(
      `Price set: USD ${marketVal.value_usd} - Suggested: $${dailyPrice}/day (${marketVal.reference_month})`,
      'VehicleScanner'
    );
  }

  /**
   * Removes variations like "1.6", "Turbo", "XEI", "V8" to find the base model
   */
  private sanitizeModelName(model: string): string {
    return model
      .replace(/\b\d\.\d\w?\b/g, '') // Remove engine sizes like 1.6, 2.0T
      .replace(/\b(Turbo|V6|V8|Hybrid|4WD|AWD|XEI|SE|SEL|LTD)\b/gi, '') // Remove common trims
      .trim();
  }

  /**
   * Generates an estimated market value when FIPE fails
   * Based on body type and age
   */
  private calculateFallbackPrice(detection: VehicleScanResult): FipeMarketValue {
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - detection.year);
    
    // Base prices (USD) for a new car (0 years old) by body type
    const basePrices: Record<string, number> = {
      suv: 35000,
      pickup: 40000,
      sedan: 25000,
      hatchback: 18000,
      coupe: 45000,
      convertible: 50000,
      van: 30000,
      wagon: 28000,
      unknown: 20000
    };

    const startPrice = basePrices[detection.bodyType.toLowerCase()] || basePrices['unknown'];
    
    // Depreciation curve (approx 10% first year, then 5% per year)
    // Using a simplified exponential decay: Value = Start * (0.85 ^ age) roughly
    // Adjusted to not go below $1,000 for rental viability (was 5000)
    const estimatedUsd = Math.max(1000, Math.round(startPrice * Math.pow(0.88, age)));

    return {
      value_usd: estimatedUsd,
      value_brl: estimatedUsd * 5, // Approx exchange rate
      value_ars: estimatedUsd * 1000, // Approx exchange rate
      fipe_code: 'EST-AUTO',
      reference_month: 'Estimado AutoRenta'
    };
  }
}
