import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { GeocodingResult, GeocodingService } from './geocoding.service';
import { ProfileService } from './profile.service';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Location coordinates
 */
export interface LocationCoordinates {
  lat: number;
  lng: number;
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
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly profileService = inject(ProfileService);
  private readonly geocodingService = inject(GeocodingService);

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
   * Get current GPS position from browser
   * @returns Current position or null if geolocation not available/denied
   */
  async getCurrentPosition(): Promise<LocationCoordinates | null> {
    return new Promise((resolve) => {
      if (!this.isBrowser || !navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error: GeolocationPositionError) => {
          console.warn('Error getting current position:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds
          maximumAge: 300000, // 5 minutes cache
        },
      );
    });
  }

  /**
   * Watch user's position for real-time updates
   * @param callback Function to call with new location
   * @returns Watch ID to clear later
   */
  watchPosition(callback: (location: LocationCoordinates) => void): number | null {
    if (!this.isBrowser || !navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
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
        console.warn('Error watching position:', error.message);
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
  clearWatch(watchId: number): void {
    if (this.isBrowser && navigator.geolocation) {
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
