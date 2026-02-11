import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ProfileService } from '@core/services/auth/profile.service';
import { GeocodingResult, GeocodingService } from '@core/services/geo/geocoding.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { environment } from '@environment';

/**
 * Location coordinates
 */
export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Location choice type
 */
export type LocationChoice = 'home' | 'current' | null;

/**
 * Location with metadata
 */
export interface LocationData extends LocationCoordinates {
  source: 'home' | 'gps' | 'address';
  address?: string;
  verified?: boolean;
}

/**
 * Service for managing user location (home location and current GPS)
 */
@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabase = injectSupabase();
  private readonly profileService = inject(ProfileService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly logger = inject(LoggerService);
  private readonly googleGeolocationApiKey = environment.googleGeolocationApiKey;

  /**
   * Get user location with priority:
   * 1. Home location from profile (if verified)
   * 2. Current GPS location
   * 3. null if both fail
   * @returns Location coordinates or null
   */
  async getUserLocation(): Promise<LocationData | null> {
    // Try to get home location from profile
    const homeLocation = await this.getHomeLocation();
    if (homeLocation) {
      return homeLocation;
    }

    // Fallback to current GPS location
    const gpsLocation = await this.getCurrentPosition();
    if (gpsLocation) {
      return {
        ...gpsLocation,
        source: 'gps',
      };
    }

    return null;
  }

  /**
   * Get user's saved home location from profile
   * @returns Home location or null if not set or user not authenticated
   */
  async getHomeLocation(): Promise<LocationData | null> {
    try {
      const profile = await this.profileService.getCurrentProfile();

      if (
        profile &&
        profile.home_latitude !== null &&
        profile.home_latitude !== undefined &&
        profile.home_longitude !== null &&
        profile.home_longitude !== undefined
      ) {
        return {
          lat: profile.home_latitude,
          lng: profile.home_longitude,
          source: 'home',
          address: profile.address_line1 ?? undefined,
          verified: profile.location_verified_at !== null,
        };
      }

      return null;
    } catch (error) {
      // Silently handle authentication errors - user is not logged in
      if (error instanceof Error && error.message.includes('Usuario no autenticado')) {
        return null;
      }
      // Log other errors but don't throw
      console.error('Error getting home location:', error);
      return null;
    }
  }

  /**
   * Get current GPS position from browser or native platform
   * Uses Capacitor Geolocation on native platforms for better accuracy
   * @returns Current position or null if geolocation not available/denied
   */
  async getCurrentPosition(): Promise<LocationCoordinates | null> {
    if (!this.isBrowser || !navigator.geolocation) {
      this.logger.warn('Geolocation is not supported', 'LocationService');
      return null;
    }

    // Some browsers require a secure context for geolocation.
    // We don't hard-fail here, but it's useful to log for debugging.
    try {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        this.logger.warn('window.isSecureContext=false (geolocation may be blocked)', 'LocationService');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // ignore
    }

    // Fast permission pre-check (optional). If denied, don't keep retrying.
    try {
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'denied') {
          return null;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Some browsers throw on permissions query; continue.
    }

    // 1) Best-effort high-accuracy (keeps the best reading within a time window)
    try {
      const best = await this.getBestPositionViaWatch({
        desiredAccuracyMeters: 25,
        maxWaitMs: 15000,
      });
      return {
        lat: best.coords.latitude,
        lng: best.coords.longitude,
        accuracy: best.coords.accuracy,
        timestamp: best.timestamp,
      };
    } catch {
      // continue to fallback
    }

    // 2) Fallback: single low-accuracy reading (often succeeds when GPS is flaky)
    try {
      const pos = await this.getSinglePosition({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };
    } catch {
      // continue
    }

    // 3) Final fallback: Google Geolocation API (approximate, IP-based if no signals)
    const googleFallback = await this.getGoogleFallbackPosition();
    if (googleFallback) {
      return googleFallback;
    }

    return null;
  }

  private getSinglePosition(options: {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
  }): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  private getBestPositionViaWatch(options: {
    desiredAccuracyMeters: number;
    maxWaitMs: number;
  }): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      let bestPosition: GeolocationPosition | null = null;
      let watchId: number | null = null;

      const cleanup = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        if (bestPosition) {
          resolve(bestPosition);
        } else {
          reject(new Error('Geolocation timeout'));
        }
      }, options.maxWaitMs);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          if (position.coords.accuracy <= options.desiredAccuracyMeters) {
            window.clearTimeout(timeoutId);
            cleanup();
            resolve(position);
          }
        },
        (error) => {
          window.clearTimeout(timeoutId);
          cleanup();
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: options.maxWaitMs,
          maximumAge: 0,
        },
      );
    });
  }

  private async getGoogleFallbackPosition(): Promise<LocationCoordinates | null> {
    if (!this.googleGeolocationApiKey) return null;
    try {
      const response = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.googleGeolocationApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      if (!response.ok) return null;

      const data = (await response.json()) as {
        location?: { lat?: number; lng?: number };
        accuracy?: number;
      };

      const lat = data.location?.lat;
      const lng = data.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      return {
        lat,
        lng,
        accuracy: typeof data.accuracy === 'number' ? data.accuracy : undefined,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Watch user's position for real-time updates
   * @param callback Function to call with new location
   * @returns Watch ID to clear later
   */
  watchPosition(callback: (location: LocationCoordinates) => void): number | null {
    if (!this.isBrowser || !navigator.geolocation) {
      this.logger.warn('Geolocation is not supported by this browser', 'LocationService');
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        this.logger.warn('Error watching position: ' + error.message, 'LocationService');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // No cache for real-time
      },
    );
  }

  /**
   * Clear position watch
   * @param watchId ID returned by watchPosition
   */
  clearWatch(watchId: number | null): void {
    if (this.isBrowser && navigator.geolocation && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Save home location to user profile
   * @param lat Latitude
   * @param lng Longitude
   * @param address Optional address string for display
   */
  async saveHomeLocation(lat: number, lng: number, address?: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Update profile with home location
    const updates: Record<string, unknown> = {
      home_latitude: lat,
      home_longitude: lng,
      location_verified_at: new Date().toISOString(),
    };

    // Optionally update address if provided
    if (address) {
      updates['address_line1'] = address;
    }

    await this.supabase.from('profiles').update(updates).eq('id', user.id);
  }

  /**
   * Clear home location from profile
   */
  async clearHomeLocation(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    await this.supabase
      .from('profiles')
      .update({
        home_latitude: null,
        home_longitude: null,
        location_verified_at: null,
      })
      .eq('id', user.id);
  }

  /**
   * Geocode an address and save as home location
   * @param address Address string to geocode
   * @param countryCode Optional country code (default 'AR')
   * @returns Geocoding result with coordinates
   */
  async geocodeAndSaveHomeLocation(
    address: string,
    countryCode: string = 'AR',
  ): Promise<GeocodingResult> {
    const result = await this.geocodingService.geocodeAddress(address, countryCode);

    if (result) {
      await this.saveHomeLocation(result.latitude, result.longitude, result.fullAddress);
    }

    return result;
  }

  /**
   * Request location permission from browser
   * @returns True if permission granted, false otherwise
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const position = await this.getCurrentPosition();
      return position !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if user has saved home location
   * @returns True if home location is set
   */
  async hasHomeLocation(): Promise<boolean> {
    const homeLocation = await this.getHomeLocation();
    return homeLocation !== null;
  }

  /**
   * Check if browser supports geolocation
   * @returns True if geolocation API is available
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get location by choice (home or current GPS)
   * Used when user explicitly selects location source
   * @param choice Location choice ('home' or 'current')
   * @returns Location data or null
   */
  async getLocationByChoice(choice: LocationChoice): Promise<LocationData | null> {
    if (choice === 'home') {
      return await this.getHomeLocation();
    } else if (choice === 'current') {
      const gpsLocation = await this.getCurrentPosition();
      if (gpsLocation) {
        // Optionally reverse geocode to get address
        try {
          const result = await this.geocodingService.reverseGeocode(
            gpsLocation.lat,
            gpsLocation.lng,
          );
          return {
            ...gpsLocation,
            source: 'gps',
            address: result.fullAddress,
          };
        } catch {
          return {
            ...gpsLocation,
            source: 'gps',
          };
        }
      }
    }

    return null;
  }

  /**
   * Validate coordinates are within valid ranges
   * @param lat Latitude
   * @param lng Longitude
   * @returns True if coordinates are valid
   */
  validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
