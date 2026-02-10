/**
 * @file google-maps-provider.service.ts
 * @description Google Maps adapter implementing IMapProvider interface
 * Provides fallback when Mapbox fails (WebGL issues, network, token expired)
 */

import { Injectable } from '@angular/core';
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

// Google Maps types - declared globally since loaded dynamically at runtime
// Minimal interfaces for runtime-loaded Google Maps API (no @types/google.maps installed)
interface GoogleMapsNamespace {
  maps: {
    importLibrary(name: string): Promise<Record<string, unknown>>;
    LatLngBounds: new () => GoogleLatLngBounds;
    InfoWindow: new (opts?: Record<string, unknown>) => GoogleInfoWindow;
    ControlPosition: Record<string, unknown>;
    event: {
      clearInstanceListeners(instance: unknown): void;
      trigger(instance: unknown, event: string): void;
    };
    marker: {
      AdvancedMarkerElement: new (opts?: Record<string, unknown>) => GoogleMarker;
    };
  };
}
interface GoogleLatLngBounds {
  extend(point: { lat: number; lng: number }): void;
  getSouthWest(): { lat(): number; lng(): number };
  getNorthEast(): { lat(): number; lng(): number };
}
declare const google: GoogleMapsNamespace;

// Lightweight type aliases for internal use (runtime Google Maps objects)
type GoogleMap = Record<string, unknown> & {
  setCenter(pos: { lat: number; lng: number }): void;
  getCenter(): { lat(): number; lng(): number } | null;
  setZoom(z: number): void;
  getZoom(): number | undefined;
  panTo(pos: { lat: number; lng: number }): void;
  fitBounds(bounds: GoogleLatLngBounds, padding?: number): void;
  getBounds(): GoogleLatLngBounds | null;
  setOptions(opts: Record<string, unknown>): void;
  addListener(event: string, cb: (e?: unknown) => void): { remove(): void };
};
type GoogleMarker = Record<string, unknown> & {
  map: GoogleMap | null;
  position: { lat: number; lng: number } | null;
  element?: HTMLElement;
  addListener(event: string, cb: () => void): { remove(): void };
};
type GoogleInfoWindow = Record<string, unknown> & {
  open(opts: { map: GoogleMap; anchor?: GoogleMarker } | GoogleMap): void;
  close(): void;
  setContent(content: string | HTMLElement): void;
  setPosition(pos: { lat: number; lng: number }): void;
  get(key: string): unknown;
};

/**
 * Wrapper around google.maps.Map to implement IMapInstance
 */
class GoogleMapInstance implements IMapInstance {
  constructor(private map: GoogleMap) {}

  setCenter(coords: MapCoordinates): void {
    this.map.setCenter({ lat: coords.lat, lng: coords.lng });
  }

  getCenter(): MapCoordinates {
    const center = this.map.getCenter();
    if (!center) return { lat: 0, lng: 0 };
    return { lat: center.lat(), lng: center.lng() };
  }

  setZoom(zoom: number): void {
    this.map.setZoom(zoom);
  }

  getZoom(): number {
    return this.map.getZoom() ?? 10;
  }

  getBounds(): MapBounds | null {
    const bounds = this.map.getBounds();
    if (!bounds) return null;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    return {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    };
  }

  flyTo(coords: MapCoordinates, zoom?: number): void {
    // Google Maps doesn't have flyTo, use panTo + setZoom
    this.map.panTo({ lat: coords.lat, lng: coords.lng });
    if (zoom !== undefined) {
      this.map.setZoom(zoom);
    }
  }

  resize(): void {
    google.maps.event.trigger(this.map, 'resize');
  }

  remove(): void {
    // Google Maps doesn't have explicit remove, just clear listeners
    google.maps.event.clearInstanceListeners(this.map);
  }

  on(event: string, handler: (e: unknown) => void): void {
    // Map common events
    const googleEvent = this.mapEventName(event);
    this.map.addListener(googleEvent, handler);
  }

  off(_event: string, _handler: (e: unknown) => void): void {
    // Google Maps doesn't support removing specific handlers easily
    // This is a limitation - would need to track listeners manually
    console.warn('[GoogleMapsProvider] off() not fully supported, use clearInstanceListeners');
  }

  addMarker(coords: MapCoordinates, options?: MapMarkerOptions): IMapMarker {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: coords.lat, lng: coords.lng },
      map: this.map,
      content: options?.element,
    });

    return new GoogleMapMarker(marker);
  }

  addNavigationControl(): void {
    // Google Maps has built-in zoom control, just ensure it's enabled
    this.map.setOptions({
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition['RIGHT_TOP'],
      },
    });
  }

  getNativeInstance(): GoogleMap {
    return this.map;
  }

  private mapEventName(event: string): string {
    // Map Mapbox event names to Google Maps equivalents
    const eventMap: Record<string, string> = {
      load: 'tilesloaded',
      moveend: 'idle',
      zoomend: 'zoom_changed',
      click: 'click',
      error: 'error',
    };
    return eventMap[event] || event;
  }
}

/**
 * Wrapper around google.maps.marker.AdvancedMarkerElement
 */
class GoogleMapMarker implements IMapMarker {
  private popup?: GoogleMapPopup;

  constructor(private marker: GoogleMarker) {}

  setLngLat(coords: MapCoordinates): IMapMarker {
    this.marker.position = { lat: coords.lat, lng: coords.lng };
    return this;
  }

  setPopup(popup: IMapPopup): IMapMarker {
    this.popup = popup as GoogleMapPopup;

    // Add click listener to open popup
    this.marker.addListener('click', () => {
      this.popup?.addTo({ getNativeInstance: () => this.marker.map } as IMapInstance);
    });

    return this;
  }

  addTo(map: IMapInstance): IMapMarker {
    this.marker.map = map.getNativeInstance() as GoogleMap;
    return this;
  }

  remove(): void {
    this.marker.map = null;
  }

  getElement(): HTMLElement {
    return this.marker.element as HTMLElement;
  }

  togglePopup(): IMapMarker {
    if (this.popup?.isOpen()) {
      this.popup.remove();
    } else {
      this.popup?.addTo({ getNativeInstance: () => this.marker.map } as IMapInstance);
    }
    return this;
  }
}

/**
 * Wrapper around google.maps.InfoWindow
 */
class GoogleMapPopup implements IMapPopup {
  private infoWindow: GoogleInfoWindow;
  private coords?: MapCoordinates;
  private map?: GoogleMap;

  constructor(options?: MapPopupOptions) {
    this.infoWindow = new google.maps.InfoWindow({
      disableAutoPan: false,
      maxWidth: options?.maxWidth ? parseInt(options.maxWidth) : undefined,
    });
  }

  setLngLat(coords: MapCoordinates): IMapPopup {
    this.coords = coords;
    return this;
  }

  setHTML(html: string): IMapPopup {
    this.infoWindow.setContent(html);
    return this;
  }

  setDOMContent(node: HTMLElement): IMapPopup {
    this.infoWindow.setContent(node);
    return this;
  }

  addTo(map: IMapInstance): IMapPopup {
    this.map = map.getNativeInstance() as GoogleMap;

    if (this.coords) {
      this.infoWindow.setPosition({ lat: this.coords.lat, lng: this.coords.lng });
    }

    this.infoWindow.open(this.map);
    return this;
  }

  remove(): void {
    this.infoWindow.close();
  }

  isOpen(): boolean {
    return this.infoWindow.get('map') !== null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsProviderService implements IMapProvider {
  readonly type = 'google' as const;
  private loadPromise?: Promise<boolean>;

  /**
   * Check if Google Maps is available
   * Loads the library if needed
   */
  async isAvailable(): Promise<boolean> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.loadGoogleMaps();
    return this.loadPromise;
  }

  /**
   * Create Google Maps instance
   */
  async createMap(container: HTMLElement, options: MapProviderOptions): Promise<IMapInstance> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('Google Maps failed to load');
    }

    const { Map } = (await google.maps.importLibrary('maps')) as {
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
    };

    const mapOptions: Record<string, unknown> = {
      center: { lat: options.center.lat, lng: options.center.lng },
      zoom: options.zoom,
      mapId: options.style || 'DEMO_MAP_ID', // Use style as mapId
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    // Add bounds restriction if provided
    if (options.maxBounds) {
      const [sw, ne] = options.maxBounds;
      mapOptions['restriction'] = {
        latLngBounds: {
          north: ne.lat,
          south: sw.lat,
          east: ne.lng,
          west: sw.lng,
        },
        strictBounds: false,
      };
    }

    const map = new Map(container, mapOptions);

    return new GoogleMapInstance(map);
  }

  /**
   * Create marker
   */
  createMarker(options?: MapMarkerOptions): IMapMarker {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      content: options?.element,
    });

    return new GoogleMapMarker(marker);
  }

  /**
   * Create popup (InfoWindow)
   */
  createPopup(options?: MapPopupOptions): IMapPopup {
    return new GoogleMapPopup(options);
  }

  /**
   * Load Google Maps JavaScript API
   */
  private async loadGoogleMaps(): Promise<boolean> {
    try {
      // Check if already loaded
      if (typeof google !== 'undefined' && google.maps) {
        return true;
      }

      const apiKey = environment.googleMapsApiKey;
      if (!apiKey || apiKey.trim() === '') {
        console.warn('[GoogleMapsProvider] No API key configured (NG_APP_GOOGLE_MAPS_API_KEY)');
        return false;
      }

      // Load Google Maps dynamically
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
      script.async = true;
      script.defer = true;

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
      });

      // Wait for google.maps to be defined
      await this.waitForGoogleMaps();

      console.info('[GoogleMapsProvider] Loaded successfully');
      return true;
    } catch (err) {
      console.error('[GoogleMapsProvider] Load failed:', err);
      return false;
    }
  }

  /**
   * Wait for google.maps global to be available
   */
  private waitForGoogleMaps(maxWait = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        if (typeof google !== 'undefined' && google.maps) {
          resolve();
        } else if (Date.now() - start > maxWait) {
          reject(new Error('Google Maps timeout'));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }
}
