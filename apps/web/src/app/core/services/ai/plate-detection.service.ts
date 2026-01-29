import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// TYPES
// ============================================================================

export interface DetectedPlate {
  text_masked: string;
  confidence: number;
  bounding_box: {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    width: number; // Percentage 0-100
    height: number; // Percentage 0-100
  };
  country?: 'AR' | 'EC' | 'BR' | 'CL' | 'CO' | 'unknown';
}

export interface PlateDetectionResult {
  success: boolean;
  plates_detected: number;
  plates: DetectedPlate[];
  blurred_image_url?: string;
  warning: boolean;
  error?: string;
}

export interface ProcessedPhoto {
  originalUrl: string;
  processedUrl: string;
  hadPlates: boolean;
  platesCount: number;
  plates: DetectedPlate[];
}

// Country labels
export const COUNTRY_LABELS: Record<string, string> = {
  AR: 'Argentina',
  EC: 'Ecuador',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  unknown: 'Desconocido',
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Plate Detection Service
 *
 * Detects license plates in vehicle photos and provides blur coordinates
 * for privacy protection.
 */
@Injectable({
  providedIn: 'root',
})
export class PlateDetectionService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  private readonly EDGE_FUNCTION_URL = 'detect-license-plates';

  // Signals
  readonly isDetecting = signal(false);
  readonly lastResult = signal<PlateDetectionResult | null>(null);
  readonly lastError = signal<string | null>(null);

  // ============================================================================
  // DETECTION METHODS
  // ============================================================================

  /**
   * Detects license plates in an image
   */
  async detectPlates(imageUrl: string): Promise<PlateDetectionResult> {
    this.isDetecting.set(true);
    this.lastError.set(null);

    try {
      this.logger.info('Detecting license plates...', 'PlateDetection');

      const { data, error } = await this.supabaseClient.functions.invoke<PlateDetectionResult>(
        this.EDGE_FUNCTION_URL,
        {
          body: {
            image_url: imageUrl,
            auto_blur: true,
          },
        },
      );

      if (error) {
        this.logger.error('Edge function error', 'PlateDetection', error);
        throw new Error(error.message || 'Error al detectar placas');
      }

      if (!data) {
        throw new Error('No data returned from detection');
      }

      this.lastResult.set(data);
      this.logger.info(`Detected ${data.plates_detected} plates`, 'PlateDetection');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this.lastError.set(message);
      this.logger.error('Detection failed', 'PlateDetection', err);

      return {
        success: false,
        plates_detected: 0,
        plates: [],
        warning: false,
        error: message,
      };
    } finally {
      this.isDetecting.set(false);
    }
  }

  /**
   * Detects plates and returns processed photo info
   */
  async processPhoto(imageUrl: string): Promise<ProcessedPhoto> {
    const result = await this.detectPlates(imageUrl);

    if (!result.success || result.plates_detected === 0) {
      return {
        originalUrl: imageUrl,
        processedUrl: imageUrl,
        hadPlates: false,
        platesCount: 0,
        plates: [],
      };
    }

    // If blurred image URL is provided by server, use it
    // Otherwise, client will need to blur using the plate coordinates
    return {
      originalUrl: imageUrl,
      processedUrl: result.blurred_image_url || imageUrl,
      hadPlates: true,
      platesCount: result.plates_detected,
      plates: result.plates,
    };
  }

  // ============================================================================
  // CLIENT-SIDE BLUR (Canvas-based)
  // ============================================================================

  /**
   * Blurs detected plates in an image using Canvas
   * Returns a new Blob with plates blurred
   */
  async blurPlatesInImage(imageUrl: string, plates: DetectedPlate[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Apply blur to each plate region
        for (const plate of plates) {
          const x = (plate.bounding_box.x / 100) * img.width;
          const y = (plate.bounding_box.y / 100) * img.height;
          const w = (plate.bounding_box.width / 100) * img.width;
          const h = (plate.bounding_box.height / 100) * img.height;

          // Add some padding
          const padding = Math.max(w, h) * 0.1;
          const px = Math.max(0, x - padding);
          const py = Math.max(0, y - padding);
          const pw = Math.min(img.width - px, w + padding * 2);
          const ph = Math.min(img.height - py, h + padding * 2);

          // Get image data for the plate region
          const imageData = ctx.getImageData(px, py, pw, ph);

          // Apply pixelation blur
          const pixelSize = Math.max(8, Math.floor(Math.min(pw, ph) / 8));
          this.pixelateImageData(imageData, pixelSize);

          // Put blurred data back
          ctx.putImageData(imageData, px, py);
        }

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.9,
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Applies pixelation effect to ImageData
   */
  private pixelateImageData(imageData: ImageData, pixelSize: number): void {
    const { data, width, height } = imageData;

    for (let y = 0; y < height; y += pixelSize) {
      for (let x = 0; x < width; x += pixelSize) {
        // Get average color for this block
        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let py = 0; py < pixelSize && y + py < height; py++) {
          for (let px = 0; px < pixelSize && x + px < width; px++) {
            const i = ((y + py) * width + (x + px)) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Apply average color to all pixels in block
        for (let py = 0; py < pixelSize && y + py < height; py++) {
          for (let px = 0; px < pixelSize && x + px < width; px++) {
            const i = ((y + py) * width + (x + px)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
        }
      }
    }
  }

  /**
   * Processes photo: detects plates and blurs them client-side
   */
  async detectAndBlur(imageUrl: string): Promise<{
    hasPlates: boolean;
    originalUrl: string;
    blurredBlob?: Blob;
    platesCount: number;
  }> {
    const result = await this.detectPlates(imageUrl);

    if (!result.success || result.plates_detected === 0) {
      return {
        hasPlates: false,
        originalUrl: imageUrl,
        platesCount: 0,
      };
    }

    try {
      const blurredBlob = await this.blurPlatesInImage(imageUrl, result.plates);

      return {
        hasPlates: true,
        originalUrl: imageUrl,
        blurredBlob,
        platesCount: result.plates_detected,
      };
    } catch (err) {
      this.logger.warn('Client-side blur failed, returning original', 'PlateDetection', err);
      return {
        hasPlates: true,
        originalUrl: imageUrl,
        platesCount: result.plates_detected,
      };
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Gets country label
   */
  getCountryLabel(country?: string): string {
    return COUNTRY_LABELS[country || 'unknown'] || 'Desconocido';
  }

  /**
   * Checks if any plates were detected in last result
   */
  hasPlatesDetected(): boolean {
    return (this.lastResult()?.plates_detected ?? 0) > 0;
  }

  /**
   * Clears last result
   */
  clearResult(): void {
    this.lastResult.set(null);
    this.lastError.set(null);
  }
}
