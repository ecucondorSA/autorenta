import { LoggerService } from './logger.service';
import {Injectable, signal, inject} from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Mapbox Preloader Service
 *
 * Pre-initializes Mapbox map in a hidden container after the 3D model loads.
 * When user navigates to /cars/list, the map is already ready - just needs to be moved to the visible container.
 *
 * STRATEGY:
 * 1. After 3D model loads on Marketplace, call preloadMap()
 * 2. Creates a hidden div with a fully initialized Mapbox map
 * 3. Map loads tiles for Buenos Aires (default center)
 * 4. When CarsMapComponent mounts, it can use getPreloadedMap() to get the ready instance
 * 5. Result: Map appears INSTANTLY instead of 3-5 second load
 */

type MapboxGL = typeof import('mapbox-gl').default;
type MapboxMap = import('mapbox-gl').Map;

@Injectable({
  providedIn: 'root',
})
export class MapboxPreloaderService {
  private readonly logger = inject(LoggerService);
  private mapboxgl: MapboxGL | null = null;
  private preloadedMap: MapboxMap | null = null;
  private hiddenContainer: HTMLDivElement | null = null;
  private isPreloading = false;
  private preloadPromise: Promise<void> | null = null;

  // Signals for reactive state
  private readonly _isReady = signal(false);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isReady = this._isReady.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Default center: Buenos Aires
  private readonly DEFAULT_CENTER: [number, number] = [-58.3816, -34.6037];
  private readonly DEFAULT_ZOOM = 11;

  /**
   * Start preloading the map
   * Call this after the 3D model finishes loading
   * Safe to call multiple times - returns existing promise if in progress
   */
  preloadMap(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    if (this._isReady()) {
      return Promise.resolve();
    }

    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    this.logger.debug('[MapboxPreloader] Starting map preload...');
    this._isLoading.set(true);
    this.isPreloading = true;

    this.preloadPromise = this.initializeMap();
    return this.preloadPromise;
  }

  private async initializeMap(): Promise<void> {
    try {
      // 1. Dynamically import Mapbox GL JS
      const mapboxModule = await import('mapbox-gl');
      this.mapboxgl = mapboxModule.default;

      // Check for WebGL support
      if (!this.mapboxgl.supported()) {
        throw new Error('Mapbox GL requires WebGL support');
      }

      // 2. Set access token
      this.mapboxgl.accessToken = environment.mapboxAccessToken;

      // 3. Create hidden container
      this.hiddenContainer = document.createElement('div');
      this.hiddenContainer.id = 'mapbox-preload-container';
      this.hiddenContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        height: 600px;
        visibility: hidden;
        pointer-events: none;
      `;
      document.body.appendChild(this.hiddenContainer);

      // 4. Initialize map
      this.preloadedMap = new this.mapboxgl.Map({
        container: this.hiddenContainer,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: this.DEFAULT_CENTER,
        zoom: this.DEFAULT_ZOOM,
        attributionControl: false,
        trackResize: false,
      });

      // 5. Wait for map to fully load (tiles, style, etc.)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Map load timeout (slow connection or headless env)'));
        }, 30000); // Increased to 30s for headless environments

        this.preloadedMap!.on('load', () => {
          clearTimeout(timeout);
          this.logger.debug('[MapboxPreloader] Map fully loaded and ready');
          resolve();
        });

        this.preloadedMap!.on('error', (e) => {
          clearTimeout(timeout);
          console.error('[MapboxPreloader] Map error:', e);
          // Don't reject - map might still be usable
        });
      });

      // 6. Preload additional zoom levels by briefly zooming
      // This caches tiles at different zoom levels
      await this.preloadZoomLevels();

      this._isReady.set(true);
      this._isLoading.set(false);
      this.isPreloading = false;

      this.logger.debug('[MapboxPreloader] Map preload complete');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('timeout')) {
        console.warn('[MapboxPreloader] Skipping map preload due to timeout (non-critical)');
      } else {
        console.error('[MapboxPreloader] Failed to preload map:', error);
      }
      this._error.set(error instanceof Error ? error.message : 'Unknown error');
      this._isLoading.set(false);
      this.isPreloading = false;
      // Don't throw - allow app to continue without preloaded map
    }
  }

  /**
   * Preload tiles at different zoom levels
   */
  private async preloadZoomLevels(): Promise<void> {
    if (!this.preloadedMap) return;

    const zoomLevels = [9, 11, 13]; // City, district, neighborhood

    for (const zoom of zoomLevels) {
      this.preloadedMap.setZoom(zoom);
      // Wait for tiles to load
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Reset to default zoom
    this.preloadedMap.setZoom(this.DEFAULT_ZOOM);
  }

  /**
   * Get the preloaded map instance
   * Returns null if not ready
   */
  getPreloadedMap(): MapboxMap | null {
    return this.preloadedMap;
  }

  /**
   * Get the Mapbox GL module
   */
  getMapboxGL(): MapboxGL | null {
    return this.mapboxgl;
  }

  /**
   * Transfer the preloaded map to a new container
   * This moves the map from the hidden container to the visible one
   */
  transferMapToContainer(targetContainer: HTMLElement): MapboxMap | null {
    if (!this.preloadedMap || !this.hiddenContainer) {
      console.warn('[MapboxPreloader] No preloaded map available');
      return null;
    }

    try {

      const mapContainer = this.preloadedMap.getContainer();

      // Move the map container to the target
      if (mapContainer.parentElement === this.hiddenContainer) {
        targetContainer.appendChild(mapContainer);
      }

      // Resize to fit new container
      this.preloadedMap.resize();

      this.logger.debug('[MapboxPreloader] Map transferred to target container');

      // Return the map instance for the component to use
      const map = this.preloadedMap;

      // Clear references so we don't accidentally reuse
      this.preloadedMap = null;
      this._isReady.set(false);
      this.preloadPromise = null;

      return map;
    } catch (error) {
      console.error('[MapboxPreloader] Failed to transfer map:', error);
      return null;
    }
  }

  /**
   * Create a new map in the target container using the preloaded Mapbox GL module
   * Use this if transfer doesn't work well
   */
  createMapInContainer(container: HTMLElement, options?: Partial<{
    center: [number, number];
    zoom: number;
  }>): MapboxMap | null {
    if (!this.mapboxgl) {
      console.warn('[MapboxPreloader] Mapbox GL not loaded');
      return null;
    }

    const map = new this.mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: options?.center || this.DEFAULT_CENTER,
      zoom: options?.zoom || this.DEFAULT_ZOOM,
      attributionControl: true,
    });

    this.logger.debug('[MapboxPreloader] Created new map with preloaded module');
    return map;
  }

  /**
   * Check if the preloaded map is ready
   */
  isMapReady(): boolean {
    return this._isReady();
  }

  /**
   * Cleanup - call on app destroy
   */
  destroy(): void {
    if (this.preloadedMap) {
      this.preloadedMap.remove();
      this.preloadedMap = null;
    }

    if (this.hiddenContainer) {
      this.hiddenContainer.remove();
      this.hiddenContainer = null;
    }

    this._isReady.set(false);
    this._isLoading.set(false);
    this.preloadPromise = null;
  }
}
