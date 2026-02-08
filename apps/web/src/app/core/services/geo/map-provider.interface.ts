/**
 * @file map-provider.interface.ts
 * @description Abstraction layer for map providers (Mapbox, Google Maps, etc.)
 * This allows switching providers without changing consuming components.
 */

export type MapProviderType = 'mapbox' | 'google';

export interface MapCoordinates {
  lng: number;
  lat: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarkerOptions {
  element?: HTMLElement;
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface MapPopupOptions {
  closeButton?: boolean;
  closeOnClick?: boolean;
  maxWidth?: string;
  className?: string;
}

/**
 * Unified map instance interface
 * Both Mapbox and Google Maps adapters implement this
 */
export interface IMapInstance {
  // Core map operations
  setCenter(coords: MapCoordinates): void;
  getCenter(): MapCoordinates;
  setZoom(zoom: number): void;
  getZoom(): number;
  getBounds(): MapBounds | null;
  flyTo(coords: MapCoordinates, zoom?: number): void;
  resize(): void;
  remove(): void;

  // Event handling
  on(event: string, handler: (e: unknown) => void): void;
  off(event: string, handler: (e: unknown) => void): void;

  // Marker management
  addMarker(coords: MapCoordinates, options?: MapMarkerOptions): IMapMarker;

  // Layer management (if supported)
  addSource?(id: string, data: unknown): void;
  addLayer?(config: unknown): void;
  removeLayer?(id: string): void;
  removeSource?(id: string): void;

  // Navigation controls
  addNavigationControl?(): void;

  // Provider-specific access (escape hatch)
  getNativeInstance(): unknown;
}

/**
 * Unified marker interface
 */
export interface IMapMarker {
  setLngLat(coords: MapCoordinates): IMapMarker;
  setPopup(popup: IMapPopup): IMapMarker;
  addTo(map: IMapInstance): IMapMarker;
  remove(): void;
  getElement(): HTMLElement;
  togglePopup(): IMapMarker;
}

/**
 * Unified popup interface
 */
export interface IMapPopup {
  setLngLat(coords: MapCoordinates): IMapPopup;
  setHTML(html: string): IMapPopup;
  setDOMContent(node: HTMLElement): IMapPopup;
  addTo(map: IMapInstance): IMapPopup;
  remove(): void;
  isOpen(): boolean;
}

/**
 * Map provider factory interface
 */
export interface IMapProvider {
  readonly type: MapProviderType;

  /**
   * Check if provider is available in current environment
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize map instance
   */
  createMap(container: HTMLElement, options: MapProviderOptions): Promise<IMapInstance>;

  /**
   * Create marker
   */
  createMarker(options?: MapMarkerOptions): IMapMarker;

  /**
   * Create popup
   */
  createPopup(options?: MapPopupOptions): IMapPopup;
}

/**
 * Options for map initialization
 */
export interface MapProviderOptions {
  center: MapCoordinates;
  zoom: number;
  style?: string; // Mapbox style or Google mapId
  maxBounds?: [MapCoordinates, MapCoordinates];
  minZoom?: number;
  maxZoom?: number;
}
