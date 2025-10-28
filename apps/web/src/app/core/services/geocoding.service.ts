import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  fullAddress: string;
  placeName: string;
}

export interface ReverseGeocodingResult {
  street?: string;
  streetNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  fullAddress: string;
  postalCode?: string;
}

interface MapboxContextItem {
  id: string;
  text: string;
  short_code?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  private readonly MAPBOX_BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  constructor() {}

  /**
   * Geocode an address string to latitude/longitude coordinates using Mapbox API
   * @param address Full address string (e.g., "Av. 18 de Julio 1234, Montevideo, Uruguay")
   * @param countryCode Optional ISO 3166-1 alpha-2 country code to bias results (e.g., 'AR', 'UY')
   * @returns Promise with geocoding result containing lat/lng
   */
  async geocodeAddress(address: string, countryCode?: string): Promise<GeocodingResult> {
    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }

    const encodedAddress = encodeURIComponent(address);

    // Build URL with Mapbox best practices
    let url = `${this.MAPBOX_BASE_URL}/${encodedAddress}.json?access_token=${environment.mapboxAccessToken}&limit=1`;

    // Add country parameter to limit results (Mapbox best practice)
    if (countryCode) {
      url += `&country=${countryCode.toUpperCase()}`;
    }

    // Add language parameter for Spanish results
    url += '&language=es';

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error('No se encontraron resultados para la dirección proporcionada');
      }

      const feature = data.features[0];
      const [longitude, latitude] = feature.center; // Mapbox returns [lng, lat]

      return {
        latitude,
        longitude,
        fullAddress: feature.place_name,
        placeName: feature.text,
      };
    } catch (error) {

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Error al geocodificar la dirección. Por favor intenta nuevamente.');
    }
  }

  /**
   * Geocode a structured address to coordinates
   * Following Mapbox best practices: pass country as parameter, not in search text
   * @param street Street name
   * @param streetNumber Street number
   * @param city City name
   * @param state State/Province
   * @param country Country code (ISO 3166-1 alpha-2: 'AR', 'UY', 'BR', etc.)
   * @returns Promise with geocoding result
   */
  async geocodeStructuredAddress(
    street: string,
    streetNumber: string,
    city: string,
    state: string,
    country: string,
  ): Promise<GeocodingResult> {
    // Build address string WITHOUT country (Mapbox best practice)
    // Format: {street number} {street}, {city}
    const addressParts: string[] = [];

    if (streetNumber && streetNumber.trim()) {
      addressParts.push(streetNumber.trim());
    }

    if (street && street.trim()) {
      addressParts.push(street.trim());
    }

    if (city && city.trim()) {
      addressParts.push(city.trim());
    }

    const fullAddress = addressParts.join(' ');

    // Pass country as separate parameter for better accuracy
    return this.geocodeAddress(fullAddress, country);
  }

  /**
   * Get fallback coordinates for a city when exact address geocoding fails
   * Useful for handling geocoding errors gracefully
   * @param city City name
   * @param country Country code (ISO 3166-1 alpha-2: 'AR', 'UY', 'BR', etc.)
   * @returns Promise with geocoding result
   */
  async getCityCoordinates(city: string, country: string): Promise<GeocodingResult> {
    // Pass country as parameter, not in search text (Mapbox best practice)
    return this.geocodeAddress(city, country);
  }

  /**
   * Reverse geocode coordinates to address using Mapbox API
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Promise with reverse geocoding result containing address components
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodingResult> {
    // Mapbox reverse geocoding: {longitude},{latitude}.json
    const url = `${this.MAPBOX_BASE_URL}/${longitude},${latitude}.json?access_token=${environment.mapboxAccessToken}&language=es&types=address,place`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error('No se encontró dirección para estas coordenadas');
      }

      const feature = data.features[0];
      const context = feature.context || [];

      // Parse address components from Mapbox response
      const result: ReverseGeocodingResult = {
        fullAddress: feature.place_name,
      };

      // Extract street number from address (if available)
      if (feature.address) {
        result.streetNumber = feature.address;
      }

      // Extract street name
      if (feature.text) {
        result.street = feature.text;
      }

      // Parse context array for city, state, country, postal code
      context.forEach((item: MapboxContextItem) => {
        const id = item.id || '';

        if (id.startsWith('place.')) {
          result.city = item.text;
        } else if (id.startsWith('region.')) {
          result.state = item.text;
        } else if (id.startsWith('country.')) {
          result.country = item.text;
          result.countryCode = item.short_code?.toUpperCase();
        } else if (id.startsWith('postcode.')) {
          result.postalCode = item.text;
        }
      });

      return result;
    } catch (error) {

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        'Error al obtener la dirección desde las coordenadas. Por favor intenta nuevamente.',
      );
    }
  }
}
