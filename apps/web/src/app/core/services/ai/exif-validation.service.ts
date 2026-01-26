import { Injectable, computed, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * EXIF Validation Service
 *
 * Extracts and validates EXIF metadata from photos to detect manipulation,
 * verify recency, and extract location data for fraud prevention.
 */

export interface ExifData {
  date_taken?: string;
  date_modified?: string;
  camera_make?: string;
  camera_model?: string;
  software?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  image_width?: number;
  image_height?: number;
  orientation?: number;
  has_thumbnail?: boolean;
}

export interface ExifValidation {
  is_original: boolean;
  is_recent: boolean;
  location_match: boolean;
  manipulation_score: number;
}

export interface ExifValidationResult {
  success: boolean;
  has_exif: boolean;
  exif_data: ExifData;
  validation: ExifValidation;
  warnings: string[];
  error?: string;
}

export interface ExpectedLocation {
  latitude: number;
  longitude: number;
  radius_km?: number;
}

@Injectable({ providedIn: 'root' })
export class ExifValidationService {
  private readonly supabase = injectSupabase();

  // State
  readonly isValidating = signal(false);
  readonly lastResult = signal<ExifValidationResult | null>(null);
  readonly error = signal<string | null>(null);

  // Computed
  readonly hasExif = computed(() => this.lastResult()?.has_exif ?? false);
  readonly isOriginal = computed(() => this.lastResult()?.validation.is_original ?? false);
  readonly isRecent = computed(() => this.lastResult()?.validation.is_recent ?? false);
  readonly manipulationScore = computed(
    () => this.lastResult()?.validation.manipulation_score ?? 0,
  );
  readonly warnings = computed(() => this.lastResult()?.warnings ?? []);

  readonly riskLevel = computed<'low' | 'medium' | 'high'>(() => {
    const score = this.manipulationScore();
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  });

  /**
   * Validate EXIF data from an image URL
   */
  async validateExif(
    imageUrl: string,
    expectedDate?: string,
    expectedLocation?: ExpectedLocation,
  ): Promise<ExifValidationResult> {
    this.isValidating.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke<ExifValidationResult>(
        'validate-photo-exif',
        {
          body: {
            image_url: imageUrl,
            expected_date: expectedDate,
            expected_location: expectedLocation,
          },
        },
      );

      if (error) throw error;

      const result = data!;
      this.lastResult.set(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar EXIF';
      this.error.set(message);
      throw err;
    } finally {
      this.isValidating.set(false);
    }
  }

  /**
   * Quick validation - check if photo appears original and recent
   */
  async quickValidate(imageUrl: string): Promise<{
    isValid: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
  }> {
    const result = await this.validateExif(imageUrl);

    return {
      isValid: result.validation.is_original && result.validation.manipulation_score < 50,
      riskLevel: this.riskLevel(),
      warnings: result.warnings,
    };
  }

  /**
   * Validate photo was taken near expected location
   */
  async validateLocation(
    imageUrl: string,
    location: ExpectedLocation,
  ): Promise<{ match: boolean; distance_km?: number }> {
    const result = await this.validateExif(imageUrl, undefined, location);

    if (!result.exif_data.gps_latitude || !result.exif_data.gps_longitude) {
      return { match: false };
    }

    // Calculate actual distance
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      result.exif_data.gps_latitude,
      result.exif_data.gps_longitude,
    );

    const radius = location.radius_km || 50;

    return {
      match: distance <= radius,
      distance_km: Math.round(distance),
    };
  }

  /**
   * Validate photo was taken within expected date range
   */
  async validateRecency(
    imageUrl: string,
    maxAgeDays: number = 7,
  ): Promise<{ isRecent: boolean; ageDays?: number }> {
    const expectedDate = new Date().toISOString();
    const result = await this.validateExif(imageUrl, expectedDate);

    if (!result.exif_data.date_taken) {
      return { isRecent: false };
    }

    const takenDate = new Date(result.exif_data.date_taken.replace(/:/g, '-').replace(' ', 'T'));
    const now = new Date();
    const ageDays = Math.ceil((now.getTime() - takenDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isRecent: ageDays <= maxAgeDays,
      ageDays,
    };
  }

  /**
   * Get camera info from last validation
   */
  getCameraInfo(): { make?: string; model?: string } | null {
    const exif = this.lastResult()?.exif_data;
    if (!exif) return null;

    return {
      make: exif.camera_make,
      model: exif.camera_model,
    };
  }

  /**
   * Get GPS coordinates from last validation
   */
  getGpsCoordinates(): { latitude: number; longitude: number } | null {
    const exif = this.lastResult()?.exif_data;
    if (!exif?.gps_latitude || !exif?.gps_longitude) return null;

    return {
      latitude: exif.gps_latitude,
      longitude: exif.gps_longitude,
    };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get risk level color for UI
   */
  getRiskColor(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
    }
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.lastResult.set(null);
    this.error.set(null);
  }
}
