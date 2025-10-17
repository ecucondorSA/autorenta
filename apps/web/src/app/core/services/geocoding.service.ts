import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface AddressComponents {
  street?: string;
  streetNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  neighborhood?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private readonly mapboxToken = environment.mapboxAccessToken;
  private readonly geocodingEndpoint = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  /**
   * Geocodifica una dirección completa a coordenadas
   */
  async geocodeAddress(address: string, country = 'UY'): Promise<GeocodeResult | null> {
    if (!this.mapboxToken) {
      console.error('[GeocodingService] Mapbox access token not configured');
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.geocodingEndpoint}/${encodedAddress}.json?access_token=${this.mapboxToken}&country=${country}&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;

        return {
          latitude,
          longitude,
          formattedAddress: feature.place_name,
        };
      }

      return null;
    } catch (error) {
      console.error('[GeocodingService] Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Geocodifica dirección construida desde componentes
   */
  async geocodeFromComponents(components: AddressComponents): Promise<GeocodeResult | null> {
    const parts: string[] = [];

    if (components.street && components.streetNumber) {
      parts.push(`${components.street} ${components.streetNumber}`);
    } else if (components.street) {
      parts.push(components.street);
    }

    if (components.neighborhood) {
      parts.push(components.neighborhood);
    }

    if (components.city) {
      parts.push(components.city);
    }

    if (components.state) {
      parts.push(components.state);
    }

    if (components.country) {
      parts.push(components.country);
    }

    if (parts.length === 0) {
      console.warn('[GeocodingService] No address components provided');
      return null;
    }

    const fullAddress = parts.join(', ');
    const countryCode = this.getCountryCode(components.country || 'Uruguay');

    return this.geocodeAddress(fullAddress, countryCode);
  }

  /**
   * Reverse geocoding: convertir coordenadas a dirección
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{
    formattedAddress: string;
    components: AddressComponents;
  } | null> {
    if (!this.mapboxToken) {
      console.error('[GeocodingService] Mapbox access token not configured');
      return null;
    }

    try {
      const url = `${this.geocodingEndpoint}/${longitude},${latitude}.json?access_token=${this.mapboxToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const components: AddressComponents = {};

        // Extraer componentes de la respuesta de Mapbox
        if (feature.context) {
          feature.context.forEach((ctx: any) => {
            if (ctx.id.startsWith('postcode')) {
              components.postalCode = ctx.text;
            } else if (ctx.id.startsWith('place')) {
              components.city = ctx.text;
            } else if (ctx.id.startsWith('region')) {
              components.state = ctx.text;
            } else if (ctx.id.startsWith('country')) {
              components.country = ctx.text;
            } else if (ctx.id.startsWith('neighborhood')) {
              components.neighborhood = ctx.text;
            }
          });
        }

        // Extraer calle y número del texto principal
        if (feature.text) {
          const addressParts = feature.text.split(' ');
          // Intentar detectar número de calle
          const numberMatch = addressParts.find((part: string) => /^\d+/.test(part));
          if (numberMatch) {
            components.streetNumber = numberMatch;
            components.street = addressParts.filter((p: string) => p !== numberMatch).join(' ');
          } else {
            components.street = feature.text;
          }
        }

        return {
          formattedAddress: feature.place_name,
          components,
        };
      }

      return null;
    } catch (error) {
      console.error('[GeocodingService] Error reverse geocoding:', error);
      return null;
    }
  }

  private getCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
      'Uruguay': 'UY',
      'Argentina': 'AR',
      'Brasil': 'BR',
      'Chile': 'CL',
      'Paraguay': 'PY',
    };

    return countryMap[country] || 'UY';
  }
}
