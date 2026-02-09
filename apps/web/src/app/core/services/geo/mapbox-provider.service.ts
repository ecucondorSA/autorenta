/**
 * @file mapbox-provider.service.ts
 * @description Mapbox GL adapter implementing IMapProvider interface
 * Primary map provider with best performance and features
 */

import { Injectable, inject } from '@angular/core';
import { environment } from '@environment';
import type {
  IMapInstance,
  IMapMarker,
  IMapPopup,
  IMapProvider,
  MapBounds,
  MapCoordinates,
  MapMarkerOptions,
  MapPopupOptions,
  MapProviderOptions,
} from './map-provider.interface';
import { MapboxPreloaderService } from './mapbox-preloader.service';

// Mapbox types (loaded dynamically)
type MapboxGL = typeof import('mapbox-gl').default;
type MapboxMap = import('mapbox-gl').Map;
type MapboxMarker = import('mapbox-gl').Marker;
type MapboxPopup = import('mapbox-gl').Popup;
type MapboxMapWithLib = MapboxMap & { _mapboxgl?: MapboxGL };

/**
 * Wrapper around mapboxgl.Map to implement IMapInstance
 */
class MapboxMapInstance implements IMapInstance {
  constructor(private map: MapboxMapWithLib) {}

  setCenter(coords: MapCoordinates): void {
    this.map.setCenter([coords.lng, coords.lat]);
  }

  getCenter(): MapCoordinates {
    const center = this.map.getCenter();
    return { lng: center.lng, lat: center.lat };
  }

  setZoom(zoom: number): void {
    this.map.setZoom(zoom);
  }

  getZoom(): number {
    return this.map.getZoom();
  }

  getBounds(): MapBounds | null {
    const bounds = this.map.getBounds();
    if (!bounds) return null;

    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }

  flyTo(coords: MapCoordinates, zoom?: number): void {
    this.map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: zoom,
    });
  }

  resize(): void {
    this.map.resize();
  }

  remove(): void {
    this.map.remove();
  }

  on(event: string, handler: (e: unknown) => void): void {
    const eventTarget = this.map as unknown as {
      on: (event: string, handler: (e: unknown) => void) => void;
    };
    eventTarget.on(event, handler);
  }

  off(event: string, handler: (e: unknown) => void): void {
    const eventTarget = this.map as unknown as {
      off: (event: string, handler: (e: unknown) => void) => void;
    };
    eventTarget.off(event, handler);
  }

  addMarker(coords: MapCoordinates, options?: MapMarkerOptions): IMapMarker {
    const mapboxgl = this.map._mapboxgl;
    if (!mapboxgl) {
      throw new Error('Mapbox GL instance missing on map');
    }
    const marker = new mapboxgl.Marker(options).setLngLat([coords.lng, coords.lat]).addTo(this.map);

    return new MapboxMapMarker(marker);
  }

  addSource(id: string, data: unknown): void {
    const map = this.map as unknown as {
      addSource: (id: string, data: unknown) => void;
    };
    map.addSource(id, data);
  }

  addLayer(config: unknown): void {
    const map = this.map as unknown as {
      addLayer: (config: unknown) => void;
    };
    map.addLayer(config);
  }

  removeLayer(id: string): void {
    if (this.map.getLayer(id)) {
      this.map.removeLayer(id);
    }
  }

  removeSource(id: string): void {
    if (this.map.getSource(id)) {
      this.map.removeSource(id);
    }
  }

  addNavigationControl(): void {
    const mapboxgl = this.map._mapboxgl;
    if (!mapboxgl) {
      throw new Error('Mapbox GL instance missing on map');
    }
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }

  getNativeInstance(): MapboxMap {
    return this.map;
  }
}

/**
 * Wrapper around mapboxgl.Marker
 */
class MapboxMapMarker implements IMapMarker {
  constructor(private marker: MapboxMarker) {}

  setLngLat(coords: MapCoordinates): IMapMarker {
    this.marker.setLngLat([coords.lng, coords.lat]);
    return this;
  }

  setPopup(popup: IMapPopup): IMapMarker {
    this.marker.setPopup((popup as MapboxMapPopup).getNative());
    return this;
  }

  addTo(map: IMapInstance): IMapMarker {
    this.marker.addTo(map.getNativeInstance() as MapboxMap);
    return this;
  }

  remove(): void {
    this.marker.remove();
  }

  getElement(): HTMLElement {
    return this.marker.getElement();
  }

  togglePopup(): IMapMarker {
    this.marker.togglePopup();
    return this;
  }
}

/**
 * Wrapper around mapboxgl.Popup
 */
class MapboxMapPopup implements IMapPopup {
  constructor(private popup: MapboxPopup) {}

  setLngLat(coords: MapCoordinates): IMapPopup {
    this.popup.setLngLat([coords.lng, coords.lat]);
    return this;
  }

  setHTML(html: string): IMapPopup {
    this.popup.setHTML(html);
    return this;
  }

  setDOMContent(node: HTMLElement): IMapPopup {
    this.popup.setDOMContent(node);
    return this;
  }

  addTo(map: IMapInstance): IMapPopup {
    this.popup.addTo(map.getNativeInstance() as MapboxMap);
    return this;
  }

  remove(): void {
    this.popup.remove();
  }

  isOpen(): boolean {
    return this.popup.isOpen();
  }

  getNative(): MapboxPopup {
    return this.popup;
  }
}

@Injectable({
  providedIn: 'root',
})
export class MapboxProviderService implements IMapProvider {
  readonly type = 'mapbox' as const;
  private mapboxPreloader = inject(MapboxPreloaderService);
  private mapboxgl?: MapboxGL;

  /**
   * Check if Mapbox is available
   * Validates WebGL support and access token
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check WebGL support
      if (!this.hasWebGL()) {
        console.warn('[MapboxProvider] WebGL not supported');
        return false;
      }

      // Validate access token
      if (!environment.mapboxAccessToken || !environment.mapboxAccessToken.startsWith('pk.')) {
        console.warn('[MapboxProvider] Invalid or missing Mapbox token');
        return false;
      }

      // Try loading library
      await this.loadMapbox();
      return true;
    } catch (err) {
      console.error('[MapboxProvider] Not available:', err);
      return false;
    }
  }

  /**
   * Create Mapbox map instance
   */
  async createMap(container: HTMLElement, options: MapProviderOptions): Promise<IMapInstance> {
    await this.loadMapbox();

    if (!this.mapboxgl) {
      throw new Error('Mapbox GL failed to load');
    }

    this.mapboxgl.accessToken = environment.mapboxAccessToken;

    const map = new this.mapboxgl.Map({
      container,
      style: options.style || 'mapbox://styles/mapbox/dark-v11',
      center: [options.center.lng, options.center.lat],
      zoom: options.zoom,
      maxBounds: options.maxBounds
        ? [
            [options.maxBounds[0].lng, options.maxBounds[0].lat],
            [options.maxBounds[1].lng, options.maxBounds[1].lat],
          ]
        : undefined,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      antialias: false, // Better performance
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    // Store mapboxgl reference for later use
    const mapWithLib = map as MapboxMapWithLib;
    mapWithLib._mapboxgl = this.mapboxgl;

    return new MapboxMapInstance(mapWithLib);
  }

  /**
   * Create Mapbox marker
   */
  createMarker(options?: MapMarkerOptions): IMapMarker {
    if (!this.mapboxgl) {
      throw new Error('Mapbox not loaded yet');
    }

    const marker = new this.mapboxgl.Marker(options);
    return new MapboxMapMarker(marker);
  }

  /**
   * Create Mapbox popup
   */
  createPopup(options?: MapPopupOptions): IMapPopup {
    if (!this.mapboxgl) {
      throw new Error('Mapbox not loaded yet');
    }

    const popup = new this.mapboxgl.Popup(options);
    return new MapboxMapPopup(popup);
  }

  /**
   * Load Mapbox GL library
   */
  private async loadMapbox(): Promise<void> {
    if (this.mapboxgl) return;

    // Try preloaded version first
    const preloaded = this.mapboxPreloader.getMapboxGL();
    if (preloaded) {
      this.mapboxgl = preloaded;
      return;
    }

    // Lazy load
    const module = await import('mapbox-gl');
    this.mapboxgl = module.default;
  }

  /**
   * Check WebGL support
   */
  private hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }
}
