import { LoggerService } from './logger.service';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type NavigationApp = 'waze' | 'google-maps' | 'apple-maps';

export interface NavigationOptions {
  lat: number;
  lng: number;
  destinationName?: string; // Optional destination name for better UX
}

/**
 * Navigation Service
 *
 * Provides deep link integration with popular navigation apps:
 * - Waze (Free, best for real-time traffic in Argentina)
 * - Google Maps (Free, most popular)
 * - Apple Maps (iOS default)
 *
 * Usage:
 * ```typescript
 * navigationService.navigateWithWaze({ lat: -34.6037, lng: -58.3816 });
 * navigationService.navigateWithGoogleMaps({ lat: -34.6037, lng: -58.3816, destinationName: 'Auto en Puerto Madero' });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Navigate to location using Waze app
   * Opens Waze with turn-by-turn navigation to the specified coordinates
   *
   * Benefits:
   * - Real-time traffic data from Waze community
   * - Police/accident alerts
   * - More accurate ETAs
   * - Popular in Argentina
   *
   * @param options Navigation coordinates
   */
  navigateWithWaze(options: NavigationOptions): void {
    if (!this.isBrowser) {
      console.warn('[NavigationService] Cannot navigate in SSR mode');
      return;
    }

    const { lat, lng } = options;

    // Waze deep link format: https://waze.com/ul?ll=LAT,LNG&navigate=yes
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

    this.openExternalLink(wazeUrl, 'Waze');
  }

  /**
   * Navigate to location using Google Maps
   * Opens Google Maps with directions to the specified coordinates
   *
   * @param options Navigation coordinates and optional destination name
   */
  navigateWithGoogleMaps(options: NavigationOptions): void {
    if (!this.isBrowser) {
      console.warn('[NavigationService] Cannot navigate in SSR mode');
      return;
    }

    const { lat, lng, destinationName } = options;

    // Google Maps URL format: https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Add destination name if provided for better UX
    if (destinationName) {
      googleMapsUrl += `&destination_place_id=${encodeURIComponent(destinationName)}`;
    }

    this.openExternalLink(googleMapsUrl, 'Google Maps');
  }

  /**
   * Navigate to location using Apple Maps (iOS only)
   * Opens Apple Maps with directions to the specified coordinates
   *
   * @param options Navigation coordinates and optional destination name
   */
  navigateWithAppleMaps(options: NavigationOptions): void {
    if (!this.isBrowser) {
      console.warn('[NavigationService] Cannot navigate in SSR mode');
      return;
    }

    const { lat, lng, destinationName } = options;

    // Apple Maps URL format: https://maps.apple.com/?daddr=LAT,LNG
    let appleMapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}`;

    // Add destination name if provided
    if (destinationName) {
      appleMapsUrl += `&q=${encodeURIComponent(destinationName)}`;
    }

    this.openExternalLink(appleMapsUrl, 'Apple Maps');
  }

  /**
   * Auto-detect best navigation app based on platform
   * - iOS: Apple Maps
   * - Android/Others: Waze (best for Argentina)
   *
   * @param options Navigation coordinates
   */
  navigateAuto(options: NavigationOptions): void {
    if (!this.isBrowser) {
      console.warn('[NavigationService] Cannot navigate in SSR mode');
      return;
    }

    const isIOS = this.detectIOS();

    if (isIOS) {
      this.navigateWithAppleMaps(options);
    } else {
      // Default to Waze for best traffic data in Argentina
      this.navigateWithWaze(options);
    }
  }

  /**
   * Get available navigation apps based on platform
   * Returns list of recommended apps for the current device
   */
  getAvailableApps(): NavigationApp[] {
    if (!this.isBrowser) {
      return ['waze', 'google-maps'];
    }

    const isIOS = this.detectIOS();

    if (isIOS) {
      return ['apple-maps', 'waze', 'google-maps'];
    } else {
      return ['waze', 'google-maps'];
    }
  }

  /**
   * Get recommended navigation app for current platform
   */
  getRecommendedApp(): NavigationApp {
    if (!this.isBrowser) {
      return 'waze';
    }

    const isIOS = this.detectIOS();
    return isIOS ? 'apple-maps' : 'waze';
  }

  /**
   * Open external link in new tab
   * @private
   */
  private openExternalLink(url: string, appName: string): void {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      this.logger.debug(`[NavigationService] Opened ${appName}:`, url);
    } catch (error) {
      console.error(`[NavigationService] Error opening ${appName}:`, error);
    }
  }

  /**
   * Detect if running on iOS
   * @private
   */
  private detectIOS(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  }

  /**
   * Detect if running on Android
   * @private
   */
  private detectAndroid(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    return /android/.test(userAgent);
  }
}
