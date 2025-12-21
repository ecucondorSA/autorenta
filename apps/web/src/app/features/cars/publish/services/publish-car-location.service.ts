import { LoggerService } from '@core/services/infrastructure/logger.service';
import {Injectable, signal, inject} from '@angular/core';
import { environment } from '@environment';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  streetNumber: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Service for managing car location
 *
 * Responsibilities:
 * - GPS location capture
 * - Reverse geocoding (coordinates → address)
 * - Geocoding (address → coordinates)
 * - Coordinate validation
 */
@Injectable()
export class PublishCarLocationService {
  private readonly logger = inject(LoggerService);
  // State
  readonly manualCoordinates = signal<GeoLocation | null>(null);
  readonly isLoadingLocation = signal(false);

  private readonly MAPBOX_TOKEN = environment.mapboxAccessToken;
  private readonly GOOGLE_GEOLOCATION_API_KEY = environment.googleGeolocationApiKey;

  /**
   * Use current GPS location
   */
  async useCurrentLocation(): Promise<GeoLocation | null> {
    this.isLoadingLocation.set(true);

    try {
      if (!navigator.geolocation) {
        throw new Error('Tu navegador no soporta geolocalización.');
      }

      // Check permissions if available (optional but good for UX)
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (result.state === 'denied') {
            throw new Error('Permiso de ubicación denegado. Habilítalo en la barra de dirección.');
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Ignore permission query errors (some browsers don't support it well)
      }

      const position = await this.getCurrentPosition();
      const location: GeoLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      this.manualCoordinates.set(location);

      return location;
    } catch (error) {
      // GPS failure is common in dev/headless environments
      // Use Google Geolocation API as fallback (more accurate than IP-based)
      this.logger.debug('GPS signal not available, using Google Geolocation API fallback.');

      // Fallback: Google Geolocation API
      if (this.GOOGLE_GEOLOCATION_API_KEY) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.GOOGLE_GEOLOCATION_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            },
          );
          if (response.ok) {
            const data = await response.json();
            if (data.location?.lat && data.location?.lng) {
              const location: GeoLocation = {
                latitude: data.location.lat,
                longitude: data.location.lng,
              };
              this.logger.debug('Google Geolocation API success:', location);
              this.manualCoordinates.set(location);
              return location;
            }
          } else {
            console.warn('Google Geolocation API error:', await response.text());
          }
        } catch (googleError) {
          console.error('Google Geolocation API fallback failed:', googleError);
        }
      }

      console.error('Location error:', error);
      let msg = 'No pudimos obtener tu ubicación.';

      // Handle GeolocationPositionError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).code !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        switch ((error as any).code) {
          case 1: // PERMISSION_DENIED
            msg = 'Permiso denegado. Habilita la ubicación en tu navegador para continuar.';
            break;
          case 2: // POSITION_UNAVAILABLE
            msg = 'Tu ubicación no está disponible en este momento.';
            break;
          case 3: // TIMEOUT
            msg = 'Se agotó el tiempo de espera. Intenta de nuevo en un lugar abierto.';
            break;
        }
      } else if (error instanceof Error) {
        msg = error.message;
      }

      alert(msg);
      return null;
    } finally {
      this.isLoadingLocation.set(false);
    }
  }

  /**
   * Get current GPS position with high accuracy
   * Uses watchPosition to wait for GPS to acquire satellites and improve accuracy
   * Target: ≤10 meters accuracy or best result within timeout
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      const desiredAccuracy = 10; // meters
      const maxWait = 15000; // 15 seconds max wait
      let bestPosition: GeolocationPosition | null = null;
      let watchId: number;

      const cleanup = () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      };

      // Timeout - return best position we have or reject
      const timeoutId = setTimeout(() => {
        cleanup();
        if (bestPosition) {
          this.logger.debug(
            `[Geolocation] Timeout reached. Best accuracy: ${bestPosition.coords.accuracy}m`,
          );
          resolve(bestPosition);
        } else {
          reject(
            new Error('No pudimos obtener tu ubicación. Intenta en un lugar con mejor señal.'),
          );
        }
      }, maxWait);

      // Watch position and wait for good accuracy
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.logger.debug(`[Geolocation] Got position with accuracy: ${position.coords.accuracy}m`);

          // Keep the best (most accurate) position
          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          // If we achieved desired accuracy, stop and return
          if (position.coords.accuracy <= desiredAccuracy) {
            clearTimeout(timeoutId);
            cleanup();
            this.logger.debug(`[Geolocation] ✅ Achieved target accuracy: ${position.coords.accuracy}m`);
            resolve(position);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          cleanup();
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: maxWait,
          maximumAge: 0,
        },
      );
    });
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<Address | null> {
    if (!this.MAPBOX_TOKEN) {
      // console.warn('Mapbox token not configured');
      return null;
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${this.MAPBOX_TOKEN}&language=es`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error en reverse geocoding');
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return null;
      }

      const feature = data.features[0];
      const context = feature.context || [];

      // Parse address components
      const address: Address = {
        street: feature.text || '',
        streetNumber: feature.address || '',
        city: this.findContextValue(context, 'place') || '',
        state: this.findContextValue(context, 'region') || '',
        country: this.findContextValue(context, 'country') || 'AR',
      };

      return address;
    } catch {
      // console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address: Address): Promise<GeoLocation | null> {
    if (!this.MAPBOX_TOKEN) {
      // console.warn('Mapbox token not configured');
      return null;
    }

    try {
      const query = `${address.street} ${address.streetNumber}, ${address.city}, ${address.state}, ${address.country}`;
      const encodedQuery = encodeURIComponent(query);

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${this.MAPBOX_TOKEN}&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error en geocoding');
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return null;
      }

      const [longitude, latitude] = data.features[0].center;

      const location: GeoLocation = { latitude, longitude };
      this.manualCoordinates.set(location);

      return location;
    } catch {
      // console.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Find value in Mapbox context array
   */
  private findContextValue(context: unknown[], type: string): string | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = context.find((ctx: any) => ctx.id?.startsWith(type));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return item ? (item as any).text : null;
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Get manual coordinates
   */
  getCoordinates(): GeoLocation | null {
    return this.manualCoordinates();
  }

  /**
   * Set manual coordinates
   */
  setCoordinates(location: GeoLocation): void {
    if (!this.validateCoordinates(location.latitude, location.longitude)) {
      throw new Error('Coordenadas inválidas');
    }
    this.manualCoordinates.set(location);
  }

  /**
   * Clear coordinates
   */
  clearCoordinates(): void {
    this.manualCoordinates.set(null);
  }

  /**
   * Check if coordinates are set
   */
  hasCoordinates(): boolean {
    return this.manualCoordinates() !== null;
  }
}
