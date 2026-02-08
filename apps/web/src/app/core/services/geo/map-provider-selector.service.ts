/**
 * @file map-provider-selector.service.ts
 * @description Selects best available map provider with automatic fallback
 * Priority: Mapbox (premium) → Google Maps (fallback)
 */

import { Injectable, inject } from '@angular/core';
import { LoggerService } from '../infrastructure/logger.service';
import { GoogleMapsProviderService } from './google-maps-provider.service';
import type { IMapProvider, MapProviderType } from './map-provider.interface';
import { MapboxProviderService } from './mapbox-provider.service';

export interface MapProviderSelectionResult {
  provider: IMapProvider;
  type: MapProviderType;
  reason: string;
}

@Injectable({
  providedIn: 'root',
})
export class MapProviderSelectorService {
  private mapboxProvider = inject(MapboxProviderService);
  private googleProvider = inject(GoogleMapsProviderService);
  private logger = inject(LoggerService);

  /**
   * Select best available map provider
   * Returns Mapbox if available, falls back to Google Maps
   */
  async selectProvider(
    forceProvider?: MapProviderType,
  ): Promise<MapProviderSelectionResult> {
    // If specific provider forced, try it first
    if (forceProvider === 'google') {
      return this.tryGoogleMaps('forced by configuration');
    }

    if (forceProvider === 'mapbox') {
      return this.tryMapbox('forced by configuration');
    }

    // Auto-selection: try Mapbox first (premium experience)
    const mapboxResult = await this.tryMapbox('auto-selection (Mapbox is primary)');
    if (mapboxResult) return mapboxResult;

    // Fallback to Google Maps
    const googleResult = await this.tryGoogleMaps('fallback (Mapbox unavailable)');
    if (googleResult) return googleResult;

    // Both failed - throw error
    throw new Error(
      'No map provider available. Please check WebGL support and API keys.',
    );
  }

  /**
   * Try Mapbox provider
   */
  private async tryMapbox(reason: string): Promise<MapProviderSelectionResult | null> {
    try {
      const available = await this.mapboxProvider.isAvailable();

      if (available) {
        this.logger.info('[MapProvider] Using Mapbox GL', { reason });
        return {
          provider: this.mapboxProvider,
          type: 'mapbox',
          reason,
        };
      }

      this.logger.warn('[MapProvider] Mapbox not available, will try fallback');
      return null;
    } catch (err) {
      this.logger.error('[MapProvider] Mapbox check failed', err);
      return null;
    }
  }

  /**
   * Try Google Maps provider
   */
  private async tryGoogleMaps(reason: string): Promise<MapProviderSelectionResult | null> {
    try {
      const available = await this.googleProvider.isAvailable();

      if (available) {
        this.logger.info('[MapProvider] Using Google Maps', { reason });
        return {
          provider: this.googleProvider,
          type: 'google',
          reason,
        };
      }

      this.logger.warn('[MapProvider] Google Maps not available');
      return null;
    } catch (err) {
      this.logger.error('[MapProvider] Google Maps check failed', err);
      return null;
    }
  }

  /**
   * Get diagnostic info about provider availability
   */
  async getDiagnostics(): Promise<{
    mapbox: { available: boolean; reason?: string };
    google: { available: boolean; reason?: string };
  }> {
    const mapboxAvailable = await this.mapboxProvider.isAvailable();
    const googleAvailable = await this.googleProvider.isAvailable();

    return {
      mapbox: {
        available: mapboxAvailable,
        reason: mapboxAvailable
          ? 'WebGL + valid token'
          : 'WebGL not supported or invalid token',
      },
      google: {
        available: googleAvailable,
        reason: googleAvailable ? 'API key valid' : 'API key missing or invalid',
      },
    };
  }
}
