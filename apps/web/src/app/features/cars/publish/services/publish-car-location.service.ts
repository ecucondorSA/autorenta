import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../../environments/environment';

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
  // State
  readonly manualCoordinates = signal<GeoLocation | null>(null);
  readonly isLoadingLocation = signal(false);

  private readonly MAPBOX_TOKEN = environment.mapboxAccessToken;

  /**
   * Use current GPS location
   */
  async useCurrentLocation(): Promise<GeoLocation | null> {
    this.isLoadingLocation.set(true);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocalización no disponible en este navegador');
      }

      const position = await this.getCurrentPosition();
      const location: GeoLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      this.manualCoordinates.set(location);

      return location;
    } catch (error) {
      // console.error('Error getting location:', error);
      if (error instanceof Error) {
        alert(`Error al obtener ubicación: ${error.message}`);
      }
      return null;
    } finally {
      this.isLoadingLocation.set(false);
    }
  }

  /**
   * Get current GPS position
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
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
