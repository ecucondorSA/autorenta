import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  computed,
  createComponent,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Input,
  isDevMode,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { CarMapLocation } from '@core/services/cars/car-locations.service';
import { MapboxDirectionsService } from '@core/services/geo/mapbox-directions.service';
import { MapboxPreloaderService } from '@core/services/geo/mapbox-preloader.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SoundService } from '@core/services/ui/sound.service';
import { environment } from '@environment';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';
import type { BookingFormData } from '../map-booking-panel/map-booking-panel.component';
import { MapBookingPanelComponent } from '../map-booking-panel/map-booking-panel.component';
import { MapDetailsPanelComponent } from '../map-details-panel/map-details-panel.component';
import {
  MapLayersControlComponent,
  type MapLayer,
} from '../map-layers-control/map-layers-control.component';
import { MapMarkerComponent } from '../map-marker/map-marker.component';

type MapboxGL = typeof import('mapbox-gl').default;
type MapboxMap = import('mapbox-gl').Map;
type MapboxMarker = import('mapbox-gl').Marker;
type MapboxPopup = import('mapbox-gl').Popup;
type MapboxGeoJSONSource = import('mapbox-gl').GeoJSONSource;
type MapLayerMouseEvent = import('mapbox-gl').MapLayerMouseEvent;
type MapboxErrorEvent = import('mapbox-gl').ErrorEvent;
type MapboxGeoJSONFeature = import('mapbox-gl').MapboxGeoJSONFeature;

type MapboxErrorDetails = MapboxErrorEvent & {
  status?: number;
  error?: (Error & { status?: number }) | undefined;
};

/**
 * MAPBOX 10K+ CARS OPTIMIZATION
 * ===============================
 * This component is optimized to handle 10,000+ cars efficiently following Mapbox recommendations.
 *
 * Key optimizations implemented:
 * - Clustering: clusterMaxZoom=14, clusterRadius=50 (Mapbox recommended)
 * - GeoJSON: maxzoom=12, buffer=0, tolerance=0.375 (optimal for points)
 * - Coordinate precision: 6 decimals (~11cm accuracy) for smaller payload
 * - Feature-state: generateId=true for efficient hover/selection updates
 * - Performance: Supercluster handles 400K points at these settings
 *
 * Expected performance with 10K cars:
 * - Initial load: < 2s
 * - Cluster render: < 100ms
 * - 60fps panning/zooming
 * - Memory usage: < 150MB
 *
 * See: docs/guides/performance/MAPBOX_10K_CARS_OPTIMIZATION.md
 */

/**
 * Simple QuadTree implementation for spatial indexing
 */
class QuadTree {
  private bounds: { x: number; y: number; width: number; height: number };
  private capacity: number;
  private points: CarMapLocation[] = [];
  private divided = false;
  private northeast?: QuadTree;
  private northwest?: QuadTree;
  private southeast?: QuadTree;
  private southwest?: QuadTree;

  constructor(bounds: { x: number; y: number; width: number; height: number }, capacity = 4) {
    this.bounds = bounds;
    this.capacity = capacity;
  }

  insert(point: CarMapLocation): boolean {
    if (!this.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(point) ||
      this.northwest!.insert(point) ||
      this.southeast!.insert(point) ||
      this.southwest!.insert(point)
    );
  }

  query(range: { x: number; y: number; width: number; height: number }): CarMapLocation[] {
    const found: CarMapLocation[] = [];

    if (!this.intersects(range)) {
      return found;
    }

    for (const point of this.points) {
      if (this.pointInRange(point, range)) {
        found.push(point);
      }
    }

    if (this.divided) {
      found.push(...this.northeast!.query(range));
      found.push(...this.northwest!.query(range));
      found.push(...this.southeast!.query(range));
      found.push(...this.southwest!.query(range));
    }

    return found;
  }

  private contains(point: CarMapLocation): boolean {
    return (
      point.lng >= this.bounds.x &&
      point.lng <= this.bounds.x + this.bounds.width &&
      point.lat >= this.bounds.y &&
      point.lat <= this.bounds.y + this.bounds.height
    );
  }

  private intersects(range: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      range.x > this.bounds.x + this.bounds.width ||
      range.x + range.width < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.height ||
      range.y + range.height < this.bounds.y
    );
  }

  private pointInRange(
    point: CarMapLocation,
    range: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      point.lng >= range.x &&
      point.lng <= range.x + range.width &&
      point.lat >= range.y &&
      point.lat <= range.y + range.height
    );
  }

  private subdivide(): void {
    const x = this.bounds.x;
    const y = this.bounds.y;
    const w = this.bounds.width / 2;
    const h = this.bounds.height / 2;

    this.northeast = new QuadTree({ x: x + w, y: y, width: w, height: h }, this.capacity);
    this.northwest = new QuadTree({ x, y, width: w, height: h }, this.capacity);
    this.southeast = new QuadTree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);
    this.southwest = new QuadTree({ x, y: y + h, width: w, height: h }, this.capacity);

    this.divided = true;
  }
}

@Component({
  selector: 'app-cars-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapBookingPanelComponent, MapDetailsPanelComponent, MapLayersControlComponent],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  private readonly logger = inject(LoggerService);
  private readonly sound = inject(SoundService);
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private resizeObserver: ResizeObserver | null = null;

  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Input() userLocation: { lat: number; lng: number } | null = null;
  @Input() userAvatarUrl: string | null = null; // URL del avatar del usuario para el marcador de ubicación
  @Input() locationMode: 'searching' | 'booking-confirmed' | 'default' = 'default';
  @Input() searchRadiusKm: number = 5;
  @Input() showSearchRadius: boolean = true;
  @Input() showDeliveryIsochrone: boolean = false; // Show isochrone for selected car delivery area
  @Input() deliveryTimeMinutes: number = 30; // Default delivery time for isochrone
  @Input() showDirectionsRoute: boolean = false; // Show turn-by-turn route to selected car
  @Input() followUserLocation: boolean = false;
  @Input() lockZoomRotation: boolean = false;
  @Input() locationAccuracy?: number; // Precisión GPS en metros
  @Input() lastLocationUpdate?: Date; // Última actualización de ubicación
  @Input() markerVariant: 'photo' | 'price' = 'photo'; // Change default to 'photo'
  @Input() highlightedCarId: string | null = null; // Car to highlight on map (from carousel preview)

  @Output() readonly carSelected = new EventEmitter<string>();
  /** Emits car selection with native event for validation (isTrusted check) */
  @Output() readonly carClickedWithEvent = new EventEmitter<{ carId: string; event: MouseEvent | null }>();
  @Output() readonly userLocationChange = new EventEmitter<{ lat: number; lng: number }>();
  @Output() readonly quickBook = new EventEmitter<string>();
  @Output() readonly searchRadiusChange = new EventEmitter<number>();
  @Output() readonly followLocationToggle = new EventEmitter<boolean>();
  @Output() readonly lockToggle = new EventEmitter<boolean>();
  @Output() readonly bookingConfirmed = new EventEmitter<{
    carId: string;
    bookingData: BookingFormData;
  }>();
  @Output() readonly boundsChange = new EventEmitter<{
    north: number;
    south: number;
    east: number;
    west: number;
  }>();
  /** Emitted when WebGL is not available - parent should switch to list view */
  @Output() readonly webGLError = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly applicationRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly directionsService = inject(MapboxDirectionsService);
  private readonly mapboxPreloader = inject(MapboxPreloaderService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly bookingPanelOpen = signal(false);
  readonly selectedCarForBooking = signal<CarMapLocation | null>(null);
  readonly selectedCar = signal<CarMapLocation | null>(null);
  readonly viewMode = signal<'map' | 'list'>('map');

  // Debug mode - only show debug controls in development
  // P1 FIX: Use Angular's isDevMode() which is more reliable than environment.production
  // Angular's isDevMode() checks the runtime mode set during bootstrap
  readonly devModeEnabled = isDevMode();

  // Map Layers Control
  readonly showBaseMap = signal(true);
  readonly showUserLocation = signal(true);
  readonly showMarketplaceCars = signal(true);

  readonly mapLayers = computed<MapLayer[]>(() => [
    {
      id: 'base-map',
      label: 'Mapa Base',
      icon: '🗺️',
      visible: this.showBaseMap(),
      enabled: true,
    },
    {
      id: 'user-location',
      label: 'Ubicación Central',
      icon: '📍',
      visible: this.showUserLocation(),
      enabled: !!this.userLocation,
    },
    {
      id: 'marketplace-cars',
      label: 'Autos del Marketplace',
      icon: '🚗',
      visible: this.showMarketplaceCars(),
      enabled: this.cars.length > 0,
    },
  ]);

  // Expose map instance for external components
  get mapInstance(): MapboxMap | null {
    return this.map;
  }

  /**
   * Fly to a specific location with smooth animation
   */
  flyTo(
    location: { lat: number; lng: number },
    zoom = 15,
    options?: { bearing?: number; pitch?: number; duration?: number },
  ): void {
    if (this.map) {
      this.map.flyTo({
        center: [location.lng, location.lat],
        zoom,
        bearing: options?.bearing ?? 0,
        pitch: options?.pitch ?? 0,
        duration: options?.duration ?? 1500, // Smooth 1.5s animation
        essential: true,
        curve: 1.42, // Optimal curve for smooth animation
        speed: 1.2, // Slightly faster than default
        easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, // Ease in-out quad
      });
    }
  }

  private mapboxgl: MapboxGL | null = null;
  private map: MapboxMap | null = null;
  private carMarkers = new Map<
    string,
    { marker: MapboxMarker; componentRef: ComponentRef<MapMarkerComponent> }
  >();
  private userLocationMarker: MapboxMarker | null = null;
  private tooltipPopups = new Map<string, MapboxPopup>();
  private tooltipComponents = new Map<string, ComponentRef<EnhancedMapTooltipComponent>>();
  private hoverTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private hideTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  public useClustering = true; // Enable clustering by default - public for template access
  private clusterSourceId = 'cars-cluster-source';
  private clusterLayerId = 'cars-cluster-layer';
  private clusterCountLayerId = 'cars-cluster-count';
  // Mapbox optimization: Clustering is efficient for 10K+ cars (Supercluster handles 400K)
  public clusteringThreshold = 1; // Activate clustering at 2+ cars - public for template access
  private clusterMaxZoom = 12; // Zoom level where clusters stop and individual markers show (synced with source clusterMaxZoom)
  private isShowingPhotoMarkers = false; // Track if we're showing HTML markers with photos
  private hasInitializedHybridMode = false; // Track first-run of hybrid mode
  private clusterEventsRegistered = false; // Prevent duplicate event listener registration
  private virtualizationThreshold = 1000; // Only virtualize if NOT clustering (10K+ without clustering)
  private viewportBuffer = 0.1; // 10% buffer around viewport for smoother experience
  private maxVisibleMarkers = 500; // Increased for better 10K+ experience when not clustering
  private visibleCarIds = new Set<string>(); // Track currently visible cars
  private pendingUpdate: number | null = null; // For debounced updates
  private spatialIndex: QuadTree | null = null; // Spatial index for efficient queries

  // Component pools for memory management
  private markerComponentPool: ComponentRef<MapMarkerComponent>[] = [];
  private tooltipComponentPool: ComponentRef<EnhancedMapTooltipComponent>[] = [];
  private hasWarmedMarkerPool = false;
  private maxPoolSize = 100; // Maximum components to keep in pool

  // User location tracking
  private searchRadiusSourceId = 'search-radius-source';
  private searchRadiusLayerId = 'search-radius-layer';
  private isochroneSourceId = 'delivery-isochrone-source';
  private isochroneLayerId = 'delivery-isochrone-layer';
  private isochroneOutlineLayerId = 'delivery-isochrone-outline-layer';
  private routeSourceId = 'directions-route-source';
  private routeLayerId = 'directions-route-layer';
  private routeOutlineLayerId = 'directions-route-outline-layer';
  private followLocationInterval: ReturnType<typeof setInterval> | null = null;
  private isDarkMode = signal(false);
  private circleSizeMultiplier = signal(1.0); // Para ajustar tamaño del círculo

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.markMapLoaded();
      return;
    }

    // Detectar modo oscuro
    this.detectDarkMode();

    // Escuchar cambios de tema
    if (this.isBrowser) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => this.detectDarkMode());
    }
  }

  private detectDarkMode(): void {
    if (!this.isBrowser) return;
    const isDark =
      window.matchMedia('(prefers-color-scheme: dark)').matches ||
      document.documentElement.classList.contains('dark');
    this.isDarkMode.set(isDark);
    this.updateMarkerStyles();
    this.updateMapTheme();
  }

  private markMapLoaded(): void {
    this.logger.debug('Map loaded', {
      cars: this.cars.length,
      mapboxConfigured: Boolean(environment.mapboxAccessToken),
    });
    this.loading.set(false);
  }

  /**
   * Helper to get CSS variable value
   */
  private getCssVariableValue(variableName: string, defaultValue: string): string {
    if (!this.isBrowser) return defaultValue;
    return (
      getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() ||
      defaultValue
    );
  }

  /**
   * Get light preset based on current time of day
   * Returns: 'dawn', 'day', 'dusk', or 'night'
   */
  private getTimeBasedLightPreset(): 'dawn' | 'day' | 'dusk' | 'night' {
    // Cyberpunk/Radioactive Theme = Always Night
    return 'night';
  }

  /**
   * Update map theme based on time of day and marker variant
   * Uses Mapbox Standard style configuration for native theme support
   */
  private updateMapTheme(): void {
    if (!this.isBrowser) return;

    const lightPreset = this.getTimeBasedLightPreset();
    const variant = this.markerVariant;

    // Update Mapbox Standard style theme
    if (this.map && this.map.isStyleLoaded()) {
      try {
        this.map.setConfigProperty('basemap', 'lightPreset', lightPreset);

        // No need for canvas filters with Standard style - it handles theming natively
      } catch (error) {
        console.warn('[CarsMap] Could not update theme, falling back to canvas filter', error);
        // Fallback for older Mapbox versions or non-Standard styles
        const canvas = this.map.getCanvas();
        if (canvas) {
          const isDark = lightPreset === 'night' || lightPreset === 'dusk';
          const brightness = isDark ? '0.95' : '1';
          const contrast = isDark ? '1.1' : '1';
          const saturate = isDark ? '0.95' : '1';
          canvas.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
        }
      }
    }

    // Ensure container has correct classes (template binding handles this, but we verify)
    const container = this.mapContainer?.nativeElement?.parentElement;
    if (container) {
      // Remove old variant classes
      container.classList.remove('map-variant-photo', 'map-variant-price');
      // Add current variant class
      container.classList.add(`map-variant-${variant}`);

      // Apply dark mode class for night/dusk themes
      const isDark = lightPreset === 'night' || lightPreset === 'dusk';
      if (isDark) {
        container.classList.add('dark');
      } else {
        container.classList.remove('dark');
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || !this.mapContainer) {
      return;
    }

    await this.initializeMap();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Initialize Mapbox map with neutral light style
   * Uses preloaded Mapbox GL module if available for faster initialization
   */
  private async initializeMap(): Promise<void> {
    try {
      this.loading.set(true);

      // Check if we have a preloaded Mapbox GL module (from MapboxPreloaderService)
      const preloadedMapboxGL = this.mapboxPreloader.getMapboxGL();

      if (preloadedMapboxGL) {
        this.logger.debug('[CarsMap] Using preloaded Mapbox GL module - faster initialization!');
        this.mapboxgl = preloadedMapboxGL;
      } else {
        // Fallback: Lazy load Mapbox GL if not preloaded
        this.logger.debug('[CarsMap] Mapbox GL not preloaded, loading dynamically...');
        const mapboxModule = await import('mapbox-gl');
        this.mapboxgl = mapboxModule.default;
      }

      if (!this.mapboxgl) {
        throw new Error('Mapbox GL library failed to load');
      }

      // Validate Mapbox access token
      if (!environment.mapboxAccessToken || environment.mapboxAccessToken.trim() === '') {
        throw new Error(
          'Mapbox access token no configurado. Por favor, configura NG_APP_MAPBOX_ACCESS_TOKEN en .env.local',
        );
      }

      // Validate token format (should start with 'pk.')
      if (!environment.mapboxAccessToken.startsWith('pk.')) {
        throw new Error(
          'Token de Mapbox inválido. El token debe comenzar con "pk." y ser un Public Access Token válido.',
        );
      }

      this.mapboxgl.accessToken = environment.mapboxAccessToken;

      // Get initial light preset based on current time
      const initialLightPreset = this.getTimeBasedLightPreset();

      // Initialize map with Mapbox Standard style (v12+ with theme support)
      this.map = new this.mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/dark-v11', // Force Dark Mode for Cyberpunk look
        center: [-56.164532, -34.901112], // Uruguay defaulth theme support
        zoom: 4, // Zoom amplio para ver los 3 países
        maxBounds: [
          [-75, -56], // Southwest: Sur de Argentina
          [-34, -5], // Northeast: Norte de Brasil
        ],
        // Mapbox Standard configuration - OPTIMIZED for car marketplace
        config: {
          basemap: {
            lightPreset: initialLightPreset, // Auto-detect based on time: 'day', 'dusk', 'dawn', 'night'
            showPointOfInterestLabels: false, // Hide restaurants, hotels, shops (performance + cleaner)
            showTransitLabels: false, // Hide transit for cleaner car-focused map
            showPlaceLabels: true, // Keep neighborhood/area names
            showRoadLabels: true, // Keep street names (essential for car location)
            show3dObjects: false, // Disabled for better performance
          },
        },
        // 2D View Configuration - Optimized for performance
        pitch: 0, // Flat 2D view (no 3D angle)
        bearing: 0, // North-up orientation
        antialias: false, // Disabled for better performance
        // Disable 3D interactions for faster rendering
        dragRotate: false, // Disable rotation drag
        pitchWithRotate: false, // Disable pitch on rotate
        touchPitch: false, // Disable touch pitch gestures
      });

      this.setupResizeObserver();

      // Add navigation controls (zoom + compass)
      this.map.addControl(new this.mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load
      this.map.on('load', () => {
        try {
          this.markMapLoaded();
          this.safeResizeMap();
          this.updateMapTheme(); // Apply theme on load
          this.updateMarkersBasedOnCount();
          this.setupViewportChangeListener();
          this.addUserLocationMarker();
          if (this.showSearchRadius) {
            this.addSearchRadiusLayer();
          }
          this.setupFollowLocation();
          this.setupLockControls();

          // Emit initial bounds
          this.emitBounds();

          // Listen for move end to emit bounds
          if (this.map) {
            this.map.on('moveend', () => {
              this.emitBounds();
            });
          }

          // Pre-warm component pool during idle time for better performance
          this.preWarmComponentPoolDuringIdle();
        } catch (err) {
          console.error('[CarsMap] Error during post-load setup:', err);
          const message = err instanceof Error ? err['message'] : String(err);
          this['error'].set(message || 'Error al inicializar el mapa');
          this.markMapLoaded();
        }
      });

      // Handle map errors
      this.map.on('error', (event: MapboxErrorDetails) => {
        console.error('[CarsMap] Map error:', event);

        const errorStatus =
          (event['error'] && 'status' in event['error'] ? event['error']['status'] : undefined) ??
          event['status'];
        const errorMessage =
          (event['error'] && event['error']['message']) ||
          ('message' in event ? event['message'] : '');

        if (
          errorStatus === 401 ||
          (typeof errorMessage === 'string' && errorMessage.includes('401'))
        ) {
          this['error'].set(
            'Token de Mapbox inválido o expirado. Por favor, verifica tu NG_APP_MAPBOX_ACCESS_TOKEN en .env.local',
          );
        } else if (event['error']?.['message']) {
          this['error'].set(`Error al cargar el mapa: ${event['error']['message']}`);
        } else {
          this['error'].set(
            'Error al cargar el mapa. Por favor, verifica tu conexión e intenta nuevamente.',
          );
        }

        this.markMapLoaded();
      });
    } catch (err) {
      console.error('[CarsMap] Initialization error:', err);
      const errorMessage = err instanceof Error ? err['message'] : String(err);

      if (errorMessage.includes('WebGL')) {
        this['error'].set(
          'El mapa requiere aceleración de hardware (WebGL). Por favor, actívala en tu navegador.',
        );
        // Notify parent to switch to list view as fallback
        this.webGLError.emit();
      } else {
        this['error'].set(errorMessage || 'Error al inicializar el mapa');
      }
      this.markMapLoaded();
    }
  }

  private setupResizeObserver(): void {
    if (!this.isBrowser || !this.mapContainer?.nativeElement) return;
    if (this.resizeObserver) return;
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.safeResizeMap();
    });

    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  private teardownResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private safeResizeMap(): void {
    if (!this.map) return;
    try {
      this.map.resize();
    } catch {
      // ignore resize errors during initialization/teardown
    }
  }

  /**
   * Setup clustering for car markers
   * Optimized for 10,000+ cars following Mapbox recommendations
   */
  private setupClustering(): void {
    if (!this.map || !this.mapboxgl) return;

    // Check if style is ready for adding sources/layers
    // Note: isStyleLoaded() can return false with Mapbox Standard (imported style)
    // even when the map is functionally ready
    if (!this.map.isStyleLoaded()) {
      this.map.once('style.load', () => this.setupClustering());
      return;
    }

    // Remove existing markers
    this.clearMarkers();

    // Create GeoJSON source from cars with optimized coordinate precision
    const features = this.cars.map((car) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        // Limit to 6 decimal places (~11cm accuracy) for smaller payload
        coordinates: [parseFloat(car.lng.toFixed(6)), parseFloat(car.lat.toFixed(6))],
      },
      properties: {
        carId: car['carId'],
        title: car['title'],
        pricePerDay: car.pricePerDay,
        currency: car['currency'] || 'USD',
        photoUrl: car.photoUrl,
        availabilityStatus: car.availabilityStatus || 'available',
        ownerVerified: car.ownerVerified ?? true,
      },
    }));

    // Add source with Mapbox-recommended optimizations
    const existingClusterSource = this.map.getSource(this.clusterSourceId) as
      | MapboxGeoJSONSource
      | undefined;

    if (existingClusterSource) {
      existingClusterSource.setData({
        type: 'FeatureCollection',
        features,
      });
    } else {
      this.map.addSource(this.clusterSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
        cluster: true,
        // Airbnb-style clustering: more aggressive at low zoom
        clusterMaxZoom: 12, // Cluster up to zoom 12 for regional view
        clusterRadius: 80, // Larger radius for better grouping at country level
        clusterProperties: {
          sum: ['+', ['get', 'pricePerDay']],
          count: ['+', 1],
          minPrice: ['min', ['get', 'pricePerDay']],
          maxPrice: ['max', ['get', 'pricePerDay']],
        },
        // GeoJSON optimization for points (Mapbox recommendation)
        maxzoom: 12, // Limit tile generation to zoom 12 for points
        buffer: 0, // No buffer needed for simple points
        tolerance: 0.375, // Balance precision vs performance
        generateId: true, // Enable efficient feature-state updates
      });
    }

    // Resolve colors from CSS variables
    // Removed unused color variables (colorAvailable, colorSoon, colorInUse, colorUnavailable)

    // Add cluster circles layer - Neon radioactive style with shadow effect
    if (!this.map.getLayer(this.clusterLayerId + '-shadow')) {
      // Background shadow circle for depth (neon glow effect)
      this.map.addLayer({
        id: this.clusterLayerId + '-shadow',
        type: 'circle',
        source: this.clusterSourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(57, 255, 20, 0.6)', // Verde radioactivo neón glow
          'circle-radius': ['step', ['get', 'point_count'], 40, 5, 50, 15, 60, 30, 70],
          'circle-blur': 0.2,
          'circle-translate': [0, 0],
        },
      });
    }

    // Main cluster circle - Neon radioactive style (yellow/green)
    if (!this.map.getLayer(this.clusterLayerId)) {
      this.map.addLayer({
        id: this.clusterLayerId,
        type: 'circle',
        source: this.clusterSourceId,
        filter: ['has', 'point_count'],
        paint: {
          // Colores de marca: verde neón con variaciones por tamaño
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#00D95F', // Verde neón de marca para clusters pequeños (2-4)
            5,
            '#00BF54', // Verde neón hover para medianos (5-14)
            15,
            '#00A648', // Verde neón active para grandes (15-29)
            30,
            '#10B981', // Verde success para enormes (30+)
          ],
          'circle-radius': ['step', ['get', 'point_count'], 28, 5, 35, 15, 42, 30, 50],
          'circle-stroke-width': 4,
          'circle-stroke-color': '#ffffff', // White border for contrast
          'circle-opacity': 1,
        },
      });
    }

    // Add cluster labels - Dark text for contrast on neon background
    if (!this.map.getLayer(this.clusterCountLayerId)) {
      this.map.addLayer({
        id: this.clusterCountLayerId,
        type: 'symbol',
        source: this.clusterSourceId,
        filter: ['has', 'point_count'],
        layout: {
          // Show average price with count: "$45 (5)"
          'text-field': [
            'concat',
            '$',
            ['to-string', ['round', ['/', ['get', 'sum'], ['get', 'point_count']]]],
            '\n',
            ['to-string', ['get', 'point_count']],
            ' autos',
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-line-height': 1.2,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#000000', // Black for contrast on neon
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });
    }

    // Add unclustered points (individual cars) - HIDDEN (Opacity 0)
    // We make them invisible but queryable so we can overlay HTML markers
    if (!this.map.getLayer('cars-unclustered')) {
      this.map.addLayer({
        id: 'cars-unclustered',
        type: 'circle',
        source: this.clusterSourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#FF0000',
          'circle-radius': 20,
          'circle-stroke-width': 0,
          'circle-opacity': 1.0,
        },
      });
    }

    // Register event listeners ONCE — guard prevents duplicate registration
    // on subsequent setupClustering() calls from ngOnChanges → updateMarkersBasedOnCount()
    if (!this.clusterEventsRegistered) {
      this.clusterEventsRegistered = true;

      // Listen for render changes to update hybrid markers
      this.map.on('render', () => {
        if (!this.map || !this.useClustering) return;
        // Only update if we are not moving (performance) or if needed
        if (!this.map.isMoving()) {
          this.updateHybridMarkers();
        }
      });

      this.map.on('moveend', () => {
        if (this.useClustering) {
          this.updateHybridMarkers();
        }
      });

      // Handle cluster clicks
      this.map.on('click', this.clusterLayerId, (event: MapLayerMouseEvent) => {
        if (!this.map) return;

        const features = this.map.queryRenderedFeatures(event.point, {
          layers: [this.clusterLayerId],
        }) as MapboxGeoJSONFeature[];

        if (!features.length) {
          return;
        }

        const properties = (features[0].properties || {}) as Record<string, unknown>;
        const clusterId =
          typeof properties['cluster_id'] === 'number'
            ? (properties['cluster_id'] as number)
            : undefined;

        if (clusterId === undefined) {
          return;
        }

        const source = this.map.getSource(this.clusterSourceId) as MapboxGeoJSONSource | undefined;
        if (!source) {
          return;
        }

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom === null || zoom === undefined) return;
          this.map?.easeTo({
            center: event.lngLat,
            zoom,
          });
        });
      });

      // Handle individual car clicks - emit with native event for isTrusted validation
      this.map.on('click', 'cars-unclustered', (event: MapLayerMouseEvent) => {
        const carFeature = event.features?.[0] as MapboxGeoJSONFeature | undefined;
        const properties = (carFeature?.properties || {}) as Record<string, unknown>;
        const carId =
          typeof properties['carId'] === 'string' ? (properties['carId'] as string) : undefined;
        if (carId) {
          this.carSelected.emit(carId);
          // Extract native event for validation (MapLayerMouseEvent has originalEvent)
          const nativeEvent = (event as unknown as { originalEvent?: MouseEvent }).originalEvent || null;
          this.carClickedWithEvent.emit({ carId, event: nativeEvent });
          const car = this.cars.find((c) => c['carId'] === carId);
          if (car) {
            this.selectedCar.set(car);
          }
        }
      });

      // Change cursor on hover
      this.map.on('mouseenter', this.clusterLayerId, () => {
        if (this.map) {
          this.map.getCanvas().style.cursor = 'pointer';
        }
      });
      this.map.on('mouseleave', this.clusterLayerId, () => {
        if (this.map) {
          this.map.getCanvas().style.cursor = '';
        }
      });

      // Add zoom listener for hybrid mode (clusters vs photo markers)
      this.map.on('zoomend', () => this.handleZoomForHybridMode());

      // Add move listener to update photo markers when panning at high zoom
      this.map.on('moveend', () => {
        if (this.isShowingPhotoMarkers) {
          this.updatePhotoMarkersInViewport();
        }
      });
    }

    // Initial check for current zoom level
    this.handleZoomForHybridMode();
  }

  /**
   * Handle zoom changes to switch between native circles and HTML photo markers
   * - Zoom <= clusterMaxZoom: Show clusters + native unclustered circles
   * - Zoom > clusterMaxZoom: Hide native unclustered layer, show HTML markers with photos
   */
  private handleZoomForHybridMode(): void {
    if (!this.map || !this.useClustering) return;

    const currentZoom = this.map.getZoom();
    const shouldShowPhotoMarkers = currentZoom > this.clusterMaxZoom;

    // Always apply on first run OR when state changes
    const isFirstRun = this.isShowingPhotoMarkers === false && !this.hasInitializedHybridMode;
    if (!isFirstRun && shouldShowPhotoMarkers === this.isShowingPhotoMarkers) return;

    this.hasInitializedHybridMode = true;
    this.isShowingPhotoMarkers = shouldShowPhotoMarkers;

    if (shouldShowPhotoMarkers) {
      // Hide native unclustered layer, show HTML photo markers
      this.hideNativeUnclusteredLayer();
      this.renderPhotoMarkersInViewport();
    } else {
      // Show native unclustered layer, remove HTML photo markers
      this.showNativeUnclusteredLayer();
      this.clearMarkers();
    }
  }

  /**
   * Hide the native Mapbox unclustered circle layer
   */
  private hideNativeUnclusteredLayer(): void {
    if (!this.map) return;

    if (this.map.getLayer('cars-unclustered')) {
      this.map.setLayoutProperty('cars-unclustered', 'visibility', 'none');
    }
  }

  /**
   * Show the native Mapbox unclustered circle layer
   */
  private showNativeUnclusteredLayer(): void {
    if (!this.map) return;

    if (this.map.getLayer('cars-unclustered')) {
      this.map.setLayoutProperty('cars-unclustered', 'visibility', 'visible');
    }
  }

  /**
   * Render HTML markers with car photos for cars in viewport
   */
  private renderPhotoMarkersInViewport(): void {
    if (!this.map) return;

    // Clear existing HTML markers
    this.clearMarkers();

    // Get cars visible in current viewport
    const visibleCars = this.getVisibleCarsInViewport();

    // Limit markers for performance
    const carsToRender = visibleCars.slice(0, this.maxVisibleMarkers);

    // Update visible car IDs
    this.visibleCarIds = new Set(carsToRender.map((car) => car['carId']));

    // Create HTML markers with photos
    carsToRender.forEach((car) => {
      const markerData = this.createCarMarker(car);
      if (markerData) {
        this.carMarkers.set(car['carId'], markerData);
      }
    });

    // Highlight selected car if visible
    if (this.selectedCarId) {
      this.highlightSelectedCar(this.selectedCarId);
    }
  }

  /**
   * Update photo markers when panning - incremental update for better performance
   */
  private updatePhotoMarkersInViewport(): void {
    if (!this.map) return;

    const newVisibleCars = this.getVisibleCarsInViewport();
    const newVisibleCarIds = new Set(newVisibleCars.map((car) => car['carId']));

    // Remove markers for cars no longer visible
    const carsToRemove = Array.from(this.visibleCarIds).filter((id) => !newVisibleCarIds.has(id));
    carsToRemove.forEach((carId) => {
      const markerData = this.carMarkers.get(carId);
      if (markerData) {
        markerData.marker.remove();
        this.returnMarkerComponentToPool(markerData.componentRef);
        this.carMarkers.delete(carId);
      }
    });

    // Add markers for newly visible cars
    const carsToAdd = newVisibleCars.filter((car) => !this.visibleCarIds.has(car['carId']));
    const slotsAvailable = this.maxVisibleMarkers - this.carMarkers.size;
    const carsToRender = carsToAdd.slice(0, Math.max(0, slotsAvailable));

    carsToRender.forEach((car) => {
      const markerData = this.createCarMarker(car);
      if (markerData) {
        this.carMarkers.set(car['carId'], markerData);
      }
    });

    // Update visible car IDs
    this.visibleCarIds = new Set(Array.from(this.carMarkers.keys()));
  }

  /**
   * Get adaptive cluster max zoom based on car count
   * Optimized for 10K+ cars following Mapbox benchmarks
   * Mapbox recommendation: clusterMaxZoom: 14 is optimal for most datasets
   * Note: We use fixed value of 14 as recommended, keeping this method for backward compatibility
   */
  private getAdaptiveClusterMaxZoom(): number {
    // Mapbox recommendation: Always use 14 for points datasets
    // Supercluster can handle 400K points efficiently at this setting
    return 14;
  }

  /**
   * Get adaptive cluster radius based on car count
   * Mapbox recommendation: clusterRadius: 50 is optimal balance
   * Note: We use fixed value of 50 as recommended, keeping this method for backward compatibility
   */
  private getAdaptiveClusterRadius(): number {
    // Mapbox recommendation: 50px radius provides optimal clustering
    // This works well from 100 to 400,000 points
    return 50;
  }

  /**
   * Update markers based on car count - clustering, virtualization, or normal render
   */
  private updateMarkersBasedOnCount(): void {
    if (!this.map) return;

    // Wait for style to be loaded before updating markers
    // This prevents "Style is not done loading" errors when data arrives before map is ready
    if (!this.map.isStyleLoaded()) {
      this.map.once('style.load', () => this.updateMarkersBasedOnCount());
      return;
    }

    const carCount = this.cars.length;

    // Ensure spatial index is built for large datasets
    if (carCount >= this.virtualizationThreshold && !this.spatialIndex) {
      this.buildSpatialIndex();
    }

    if (this.useClustering && carCount > this.clusteringThreshold) {
      this.setupClustering();
    } else if (carCount > this.virtualizationThreshold) {
      this.renderVirtualizedMarkers();
    } else {
      this.renderCarMarkers();
    }
  }

  /**
   * Schedule a debounced update using requestAnimationFrame
   */
  private scheduleDebouncedUpdate(callback: () => void): void {
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
    }

    this.pendingUpdate = requestAnimationFrame(() => {
      callback();
      this.pendingUpdate = null;
    });
  }

  /**
   * Build spatial index for efficient queries
   */
  private buildSpatialIndex(): void {
    if (this.cars.length < this.virtualizationThreshold) {
      this.spatialIndex = null;
      return;
    }

    // Calculate bounds for the QuadTree (covering all cars with padding)
    let minLng = Infinity,
      maxLng = -Infinity;
    let minLat = Infinity,
      maxLat = -Infinity;

    for (const car of this.cars) {
      minLng = Math.min(minLng, car.lng);
      maxLng = Math.max(maxLng, car.lng);
      minLat = Math.min(minLat, car.lat);
      maxLat = Math.max(maxLat, car.lat);
    }

    // Add padding
    const padding = 0.01; // ~1km padding
    minLng -= padding;
    maxLng += padding;
    minLat -= padding;
    maxLat += padding;

    this.spatialIndex = new QuadTree(
      {
        x: minLng,
        y: minLat,
        width: maxLng - minLng,
        height: maxLat - minLat,
      },
      8,
    );

    for (const car of this.cars) {
      this.spatialIndex.insert(car);
    }
  }

  /**
   * Emit current map bounds
   */
  private emitBounds(): void {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    if (!bounds) return;

    this.boundsChange.emit({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }

  /**
   * Update spatial index when cars change
   */
  private updateSpatialIndex(): void {
    this.buildSpatialIndex();
  }

  /**
   * Pre-warm component pool during idle time using requestIdleCallback
   * Creates a small number of components progressively to avoid blocking main thread.
   * NOTE: Pre-warming is only helpful for medium/large marker counts; for small datasets it can
   * cause unnecessary main-thread work and make the page appear unresponsive.
   */
  private preWarmComponentPoolDuringIdle(): void {
    if (this.hasWarmedMarkerPool) {
      return;
    }

    // Skip for small datasets; on-demand creation is fast enough.
    if (this.cars.length < 25) {
      return;
    }

    // Only pre-warm if pool is small
    if (this.markerComponentPool.length > 50) {
      return;
    }

    this.hasWarmedMarkerPool = true;

    const targetPoolSize = Math.min(60, Math.max(20, this.cars.length * 2));
    const maxPerTick = 2; // Keep batches tiny to avoid long tasks

    const createBatch = (deadline?: IdleDeadline) => {
      if (this.markerComponentPool.length >= targetPoolSize) {
        return; // Done warming
      }

      let created = 0;

      // Create a tiny batch during idle time
      while (
        created < maxPerTick &&
        this.markerComponentPool.length < targetPoolSize &&
        (!deadline || deadline.timeRemaining() > 8)
      ) {
        const newComponentRef = createComponent(MapMarkerComponent, {
          environmentInjector: this.injector,
        });

        this.applicationRef.attachView(newComponentRef.hostView);

        // Hide the element
        const element = newComponentRef.location.nativeElement as HTMLElement;
        if (element) {
          element.style.display = 'none';
        }

        this.markerComponentPool.push(newComponentRef);

        created++;
      }

      // Schedule next batch if needed
      if (this.markerComponentPool.length < targetPoolSize) {
        if ('requestIdleCallback' in window) {
          // Modern browsers with requestIdleCallback
          requestIdleCallback((d) => createBatch(d), { timeout: 2000 });
        } else {
          // Fallback for older browsers
          setTimeout(() => createBatch(undefined), 150);
        }
      }
    };

    // Start warming with requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      requestIdleCallback((d) => createBatch(d), { timeout: 1000 });
    } else {
      // Fallback for older browsers
      setTimeout(() => createBatch(undefined), 500);
    }
  }

  /**
   * Get a marker component from pool or create new one
   */
  private getMarkerComponentFromPool(): ComponentRef<MapMarkerComponent> {
    const componentRef = this.markerComponentPool.pop();
    if (componentRef) {
      return componentRef;
    }

    // Create new component if pool is empty
    const newComponentRef = createComponent(MapMarkerComponent, {
      environmentInjector: this.injector,
    });

    // Attach to application
    this.applicationRef.attachView(newComponentRef.hostView);

    return newComponentRef;
  }

  /**
   * Return marker component to pool for reuse
   */
  private returnMarkerComponentToPool(componentRef: ComponentRef<MapMarkerComponent>): void {
    if (this.markerComponentPool.length < this.maxPoolSize) {
      // Reset component state before pooling
      componentRef.setInput('car', null);
      componentRef.setInput('isSelected', false);

      // Hide the element
      const element = componentRef.location.nativeElement as HTMLElement;
      if (element) {
        element.style.display = 'none';
      }

      this.markerComponentPool.push(componentRef);
    } else {
      // Pool is full, destroy component
      this.applicationRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }
  }

  /**
   * Get a tooltip component from pool or create new one
   */
  private getTooltipComponentFromPool(): ComponentRef<EnhancedMapTooltipComponent> {
    const componentRef = this.tooltipComponentPool.pop();
    if (componentRef) {
      return componentRef;
    }

    // Create new component if pool is empty
    const newComponentRef = createComponent(EnhancedMapTooltipComponent, {
      environmentInjector: this.injector,
    });

    // Attach to application
    this.applicationRef.attachView(newComponentRef.hostView);

    return newComponentRef;
  }

  /**
   * Return tooltip component to pool for reuse
   */
  private returnTooltipComponentToPool(
    componentRef: ComponentRef<EnhancedMapTooltipComponent>,
  ): void {
    if (this.tooltipComponentPool.length < this.maxPoolSize) {
      // Reset component state before pooling
      componentRef.setInput('car', null);
      componentRef.setInput('selected', false);
      componentRef.setInput('userLocation', undefined);

      // Clear event subscriptions
      if (componentRef.instance.viewDetails) {
        componentRef.instance.viewDetails.unsubscribe();
      }
      if (componentRef.instance.quickBook) {
        componentRef.instance.quickBook.unsubscribe();
      }

      // Hide the element
      const element = componentRef.location.nativeElement as HTMLElement;
      if (element) {
        element.style.display = 'none';
      }

      this.tooltipComponentPool.push(componentRef);
    } else {
      // Pool is full, destroy component
      this.applicationRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }
  }

  /**
   * Clear component pools (called during cleanup)
   */
  private clearComponentPools(): void {
    // Destroy all pooled marker components
    this.markerComponentPool.forEach((componentRef) => {
      this.applicationRef.detachView(componentRef.hostView);
      componentRef.destroy();
    });
    this.markerComponentPool = [];

    // Destroy all pooled tooltip components
    this.tooltipComponentPool.forEach((componentRef) => {
      this.applicationRef.detachView(componentRef.hostView);
      componentRef.destroy();
    });
    this.tooltipComponentPool = [];
  }

  /**
   * Setup listener for viewport changes to update virtualized markers
   */
  private setupViewportChangeListener(): void {
    if (!this.map) return;

    // Use requestAnimationFrame with cooldown to prevent excessive updates
    let animationFrameId: number;
    let lastUpdateTime = 0;
    const cooldownMs = 300; // Wait at least 300ms between updates
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdateTime < cooldownMs) {
        // Skip if within cooldown period
        return;
      }

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        if (this.cars.length > this.virtualizationThreshold && !this.useClustering) {
          lastUpdateTime = Date.now();
          this.updateVirtualizedMarkers();
        }
        animationFrameId = 0;
      });
    };

    this.map.on('moveend', throttledUpdate);
    this.map.on('zoomend', throttledUpdate);
  }

  /**
   * Render only visible markers within viewport + buffer
   */
  private renderVirtualizedMarkers(): void {
    if (!this.map) return;

    // Clear existing markers
    this.clearMarkers();

    // Get visible cars in current viewport
    const visibleCars = this.getVisibleCarsInViewport();

    // Limit to max visible markers
    const carsToRender = visibleCars.slice(0, this.maxVisibleMarkers);

    // Update visible car IDs
    this.visibleCarIds = new Set(carsToRender.map((car) => car['carId']));

    // Render markers for visible cars
    carsToRender.forEach((car) => {
      const markerData = this.createCarMarker(car);
      if (markerData) {
        this.carMarkers.set(car['carId'], markerData);
      }
    });

    // Highlight selected car if it's visible
    if (this.selectedCarId && this.visibleCarIds.has(this.selectedCarId)) {
      this.highlightSelectedCar(this.selectedCarId);
    }
  }

  /**
   * Hybrid Clustering: Update HTML markers properties of unclustered Mapbox points
   * Queries the invisible 'cars-unclustered' layer and places HTML markers on top.
   */
  private updateHybridMarkers(): void {
    if (!this.map) return;

    // 1. Query Mapbox for currently rendered unclustered points
    const features = this.map.queryRenderedFeatures({ layers: ['cars-unclustered'] });

    // 2. Extract car IDs that should be visible as HTML markers
    const visibleCarIdsInMapbox = new Set<string>();
    const featuresMap = new Map<string, MapboxGeoJSONFeature>();

    features.forEach(f => {
      const carId = f.properties?.['carId'];
      if (carId) {
        visibleCarIdsInMapbox.add(carId);
        featuresMap.set(carId, f);
      }
    });

    // 3. Remove markers that are no longer visible (clustered or out of view)
    const markersToRemove: string[] = [];
    this.carMarkers.forEach((_, carId) => {
      if (!visibleCarIdsInMapbox.has(carId)) {
        markersToRemove.push(carId);
      }
    });

    markersToRemove.forEach(carId => {
      const markerData = this.carMarkers.get(carId);
      if (markerData) {
        markerData.marker.remove();
        this.returnMarkerComponentToPool(markerData.componentRef);
        this.carMarkers.delete(carId);
      }
    });

    // 4. Add markers for new unclustered points
    // Limit to maxVisibleMarkers to maintain performance (though Mapbox clustering usually limits this naturally)
    let addedCount = 0;
    const maxToAdd = this.maxVisibleMarkers; // Safety limit

    for (const carId of visibleCarIdsInMapbox) {
      if (this.carMarkers.has(carId)) continue; // Already has marker
      if (addedCount >= maxToAdd) break;

      // Reconstruct car data from feature properties or look it up
      // Looking up from source is safer for complex objects
      const fullCarData = this.cars.find(c => c['carId'] === carId);

      if (fullCarData) {
        const markerData = this.createCarMarker(fullCarData);
        if (markerData) {
          this.carMarkers.set(carId, markerData);
          addedCount++;
        }
      } else {
        // Fallback if lookup fails (shouldn't happen)
        const feature = featuresMap.get(carId);
        if (feature && feature.geometry && 'coordinates' in feature.geometry) {
          // Safe access to coordinates after type guard
          const geometry = feature.geometry as { coordinates: unknown };
          const rawCoords = geometry.coordinates;
          if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
            const coords: [number, number] = [Number(rawCoords[0]), Number(rawCoords[1])];
            // Minimal data from properties
            const minimalCar: CarMapLocation = {
              carId: carId,
              lat: coords[1],
              lng: coords[0],
              pricePerDay: feature.properties?.['pricePerDay'],
              title: feature.properties?.['title'] || '',
              currency: feature.properties?.['currency'] || 'USD',
              photoUrl: feature.properties?.['photoUrl'] || '',
              availabilityStatus: feature.properties?.['availabilityStatus'],
              ownerVerified: feature.properties?.['ownerVerified'] ?? true,
            } as CarMapLocation;

            const markerData = this.createCarMarker(minimalCar);
            if (markerData) {
              this.carMarkers.set(carId, markerData);
              addedCount++;
            }
          }
        }
      }
    }

    // Update visible set
    this.visibleCarIds = new Set(this.carMarkers.keys());
  }

  /*
   * Update virtualized markers when viewport changes
   */
  private updateVirtualizedMarkers(): void {
    if (!this.map) return;

    // Use hybrid method if clustering is on
    if (this.useClustering) {
      this.updateHybridMarkers();
      return;
    }

    // Old logic for non-clustering mode...
    const newVisibleCars = this.getVisibleCarsInViewport();
    const newVisibleCarIds = new Set(newVisibleCars.map((car) => car['carId']));

    // Find cars that are no longer visible (need to be removed)
    const carsToRemove = Array.from(this.visibleCarIds).filter((id) => !newVisibleCarIds.has(id));

    // Find cars that are newly visible (need to be added)
    const carsToAdd = newVisibleCars.filter((car) => !this.visibleCarIds.has(car['carId']));

    // Remove markers for cars that are no longer visible
    carsToRemove.forEach((carId) => {
      const markerData = this.carMarkers.get(carId);
      if (markerData) {
        markerData.marker.remove();
        this.returnMarkerComponentToPool(markerData.componentRef);
        this.carMarkers.delete(carId);
      }
    });

    // Add markers for newly visible cars (limited by maxVisibleMarkers)
    const currentVisibleCount = this.carMarkers.size;
    const availableSlots = Math.max(0, this.maxVisibleMarkers - currentVisibleCount);
    const carsToAddLimited = carsToAdd.slice(0, availableSlots);

    carsToAddLimited.forEach((car) => {
      const markerData = this.createCarMarker(car);
      if (markerData) {
        this.carMarkers.set(car['carId'], markerData);
      }
    });

    // Update visible car IDs
    this.visibleCarIds = new Set([
      ...Array.from(this.visibleCarIds).filter((id) => !carsToRemove.includes(id)),
      ...carsToAddLimited.map((car) => car['carId']),
    ]);

    // Update selected car highlight if needed
    if (this.selectedCarId) {
      if (this.visibleCarIds.has(this.selectedCarId)) {
        this.highlightSelectedCar(this.selectedCarId);
      } else {
        this.removeHighlightFromCar(this.selectedCarId);
      }
    }
  }

  /**
   * Get cars visible in current viewport with buffer
   */
  private getVisibleCarsInViewport(): CarMapLocation[] {
    if (!this.map) return [];

    const bounds = this.map.getBounds();
    if (!bounds) return [];

    const zoom = this.map.getZoom();

    // Expand bounds with buffer for smoother experience
    const latDiff = (bounds.getNorth() - bounds.getSouth()) * this.viewportBuffer;
    const lngDiff = (bounds.getEast() - bounds.getWest()) * this.viewportBuffer;

    const expandedBounds = {
      north: bounds.getNorth() + latDiff,
      south: bounds.getSouth() - latDiff,
      east: bounds.getEast() + lngDiff,
      west: bounds.getWest() - lngDiff,
    };

    let visibleCars: CarMapLocation[];

    // Use spatial index for large datasets, fallback to linear search
    if (this.spatialIndex && this.cars.length >= this.virtualizationThreshold) {
      const queryBounds = {
        x: expandedBounds.west,
        y: expandedBounds.south,
        width: expandedBounds.east - expandedBounds.west,
        height: expandedBounds.north - expandedBounds.south,
      };

      visibleCars = this.spatialIndex.query(queryBounds);
    } else {
      // Fallback to linear search for smaller datasets
      visibleCars = this.cars.filter((car) => {
        return (
          car.lat >= expandedBounds.south &&
          car.lat <= expandedBounds.north &&
          car.lng >= expandedBounds.west &&
          car.lng <= expandedBounds.east
        );
      });
    }

    // Sort by priority (distance from center for higher zoom levels)
    if (zoom > 12) {
      const center = this.map.getCenter();
      visibleCars.sort((a, b) => {
        const distA = this.calculateDistance(center.lat, center.lng, a.lat, a.lng);
        const distB = this.calculateDistance(center.lat, center.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return visibleCars;
  }

  /**
   * Render car markers with custom tooltips
   */
  private renderCarMarkers(): void {
    if (!this.map || !this.mapboxgl) return;

    // Clear existing markers
    this.clearMarkers();

    // Si la capa de autos está oculta, no renderizar
    if (!this.showMarketplaceCars()) {
      return;
    }

    // Group cars by availability and price for visual organization
    const groupedCars = this.groupCarsByAvailability();

    // Create markers for each car
    groupedCars.forEach((car) => {
      const markerData = this.createCarMarker(car);
      if (markerData) {
        this.carMarkers.set(car['carId'], markerData);
      }
    });

    // Highlight selected car
    if (this.selectedCarId) {
      this.highlightSelectedCar(this.selectedCarId);
    }
  }

  /**
   * Group cars by availability (immediate vs scheduled)
   * Prioritizes cars available today with instant booking
   */
  private groupCarsByAvailability(): CarMapLocation[] {
    const cars = [...this.cars];

    // Group cars by priority:
    // 1. Available today + instant booking (highest priority)
    // 2. Available today (no instant booking)
    // 3. Available tomorrow + instant booking
    // 4. Available tomorrow
    // 5. Soon available (within 7 days)
    // 6. Unavailable or unknown status

    const groups = {
      immediateInstant: [] as CarMapLocation[],
      immediate: [] as CarMapLocation[],
      tomorrowInstant: [] as CarMapLocation[],
      tomorrow: [] as CarMapLocation[],
      soonAvailable: [] as CarMapLocation[],
      unavailable: [] as CarMapLocation[],
    };

    cars.forEach((car) => {
      const status = car.availabilityStatus || 'unavailable';
      const isInstant = car.instantBooking === true;
      const availableToday = car.availableToday === true;
      const availableTomorrow = car.availableTomorrow === true;

      if (status === 'available' && availableToday && isInstant) {
        groups.immediateInstant.push(car);
      } else if (status === 'available' && availableToday) {
        groups.immediate.push(car);
      } else if (status === 'available' && availableTomorrow && isInstant) {
        groups.tomorrowInstant.push(car);
      } else if (status === 'available' && availableTomorrow) {
        groups.tomorrow.push(car);
      } else if (status === 'soon_available') {
        groups.soonAvailable.push(car);
      } else {
        groups.unavailable.push(car);
      }
    });

    // Return prioritized list
    return [
      ...groups.immediateInstant,
      ...groups.immediate,
      ...groups.tomorrowInstant,
      ...groups.tomorrow,
      ...groups.soonAvailable,
      ...groups.unavailable,
    ];
  }

  /**
   * Create a car marker with custom tooltip
   */
  private createCarMarker(
    car: CarMapLocation,
  ): { marker: MapboxMarker; componentRef: ComponentRef<MapMarkerComponent> } | null {
    if (!this.map || !this.mapboxgl) return null;

    // Get component from pool or create new one
    const componentRef = this.getMarkerComponentFromPool();

    // Set inputs
    componentRef.setInput('car', car);
    componentRef.setInput('isSelected', this.selectedCarId === car['carId']);

    // Show the element (it might have been hidden in pool)
    const markerElement = componentRef.location.nativeElement as HTMLElement;
    markerElement.style.display = 'block';

    // Create marker
    const marker = new this.mapboxgl.Marker({
      element: markerElement,
      anchor: 'center',
    })
      .setLngLat([car.lng, car.lat])
      .addTo(this.map);

    // Handle hover with delay (150ms) - create tooltip on-demand
    markerElement.addEventListener('mouseenter', () => {
      const hideTimeout = this.hideTimeouts.get(car['carId']);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        this.hideTimeouts.delete(car['carId']);
      }

      const timeout = setTimeout(() => {
        this.showTooltipForCar(marker, car);
      }, 150);
      this.hoverTimeouts.set(car['carId'], timeout);
    });

    markerElement.addEventListener('mouseleave', () => {
      const timeout = this.hoverTimeouts.get(car['carId']);
      if (timeout) {
        clearTimeout(timeout);
        this.hoverTimeouts.delete(car['carId']);
      }

      const existingHideTimeout = this.hideTimeouts.get(car['carId']);
      if (existingHideTimeout) {
        clearTimeout(existingHideTimeout);
      }

      // Delay hide so the user can move from marker to popup
      const hideTimeout = setTimeout(() => {
        this.hideTooltipForCar(car['carId']);
      }, 250);
      this.hideTimeouts.set(car['carId'], hideTimeout);
    });

    // Handle click - emit with native event for isTrusted validation
    markerElement.addEventListener('click', (event: MouseEvent) => {
      this.carSelected.emit(car['carId']);
      this.carClickedWithEvent.emit({ carId: car['carId'], event });
      this.selectedCar.set(car);
    });

    return { marker, componentRef };
  }

  /**
   * Create tooltip popup with Angular component (using EnhancedMapTooltipComponent)
   */
  private createTooltipPopup(car: CarMapLocation): MapboxPopup {
    if (!this.mapboxgl) {
      throw new Error('Mapbox GL not initialized');
    }

    // Create container wrapper for the popup
    const container = document.createElement('div');
    container.className = 'map-tooltip-container';

    // Keep popup open while hovering it
    container.addEventListener('mouseenter', () => {
      const hideTimeout = this.hideTimeouts.get(car['carId']);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        this.hideTimeouts.delete(car['carId']);
      }
    });

    container.addEventListener('mouseleave', () => {
      this.hideTooltipForCar(car['carId']);
    });

    // Get component from pool or create new one
    const componentRef = this.getTooltipComponentFromPool();

    // Set inputs
    componentRef.setInput('car', car);
    componentRef.setInput('selected', this.selectedCarId === car['carId']);
    componentRef.setInput('userLocation', this.userLocation || undefined);

    // Subscribe to output events (with safety check for closed subjects)
    try {
      if (!componentRef.instance.viewDetails.closed) {
        componentRef.instance.viewDetails.subscribe((carId: string) => {
          this.carSelected.emit(carId);
        });
      }
    } catch {
      // EventEmitter might be closed from pool reuse, ignore
    }

    try {
      if (!componentRef.instance.quickBook.closed) {
        componentRef.instance.quickBook.subscribe((carId: string) => {
          this.openBookingPanelForCarId(carId);
          this.quickBook.emit(carId);
        });
      }
    } catch {
      // EventEmitter might be closed from pool reuse, ignore
    }

    // Show the element (it might have been hidden in pool)
    const element = componentRef.location.nativeElement as HTMLElement;
    element.style.display = 'block';

    // Append the component's native element to the container
    container.appendChild(element);

    // Store component reference
    this.tooltipComponents.set(car['carId'], componentRef);

    // Create popup with larger maxWidth for enhanced tooltip
    const popup = new this.mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      closeOnClick: false,
      maxWidth: '320px',
    }).setDOMContent(container);

    // Store popup reference
    this.tooltipPopups.set(car['carId'], popup);

    return popup;
  }

  /**
   * Show tooltip for a car on-demand
   */
  private showTooltipForCar(marker: MapboxMarker, car: CarMapLocation): void {
    const hideTimeout = this.hideTimeouts.get(car['carId']);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      this.hideTimeouts.delete(car['carId']);
    }

    // Check if tooltip already exists
    let popup = this.tooltipPopups.get(car['carId']);

    if (!popup) {
      // Create tooltip on-demand
      popup = this.createTooltipPopup(car);
      this.tooltipPopups.set(car['carId'], popup);
      marker.setPopup(popup);
    }

    // Show the popup if not already open
    if (!popup.isOpen()) {
      marker.togglePopup();
    }
  }

  /**
   * Hide tooltip for a car
   */
  private hideTooltipForCar(carId: string): void {
    const hideTimeout = this.hideTimeouts.get(carId);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      this.hideTimeouts.delete(carId);
    }

    const popup = this.tooltipPopups.get(carId);
    if (popup && popup.isOpen()) {
      // Find the marker and toggle popup
      const markerData = this.carMarkers.get(carId);
      if (markerData && markerData.marker.getPopup() === popup) {
        markerData.marker.togglePopup();
      }
    }

    // Return tooltip component to pool after a delay to allow animations
    const componentRef = this.tooltipComponents.get(carId);
    if (componentRef) {
      setTimeout(() => {
        this.returnTooltipComponentToPool(componentRef);
        this.tooltipComponents.delete(carId);
        this.tooltipPopups.delete(carId);
      }, 300); // Allow time for fade out animation
    }
  }

  /**
   * Add user location marker with custom styling and animations
   */
  private addUserLocationMarker(): void {
    if (!this.map || !this.mapboxgl || !this.userLocation) return;

    // Si la capa de ubicación está oculta, remover el marcador si existe
    if (!this.showUserLocation()) {
      if (this.userLocationMarker) {
        this.userLocationMarker.remove();
        this.userLocationMarker = null;
      }
      return;
    }

    // Save previous location before removing marker
    let previousLocation: { lat: number; lng: number } | null = null;
    if (this.userLocationMarker) {
      const prevLngLat = this.userLocationMarker.getLngLat();
      previousLocation = { lat: prevLngLat.lat, lng: prevLngLat.lng };
      this.userLocationMarker.remove();
    }

    // Create custom marker element with contextual classes
    const el = document.createElement('div');
    el.className = `user-location-marker user-location-marker--${this.locationMode}`;
    if (this.isDarkMode()) {
      el.classList.add('user-location-marker--dark');
    }

    const circleSize = 20 * this.circleSizeMultiplier();
    el.style.setProperty('--circle-size', `${circleSize}px`);

    // ✅ P0-005 FIX: Use safe DOM methods instead of innerHTML
    const haloDiv = document.createElement('div');
    haloDiv.className = 'user-marker-halo';

    const imgElement = document.createElement('img');
    imgElement.src = this.userAvatarUrl || '/assets/images/default-avatar.svg';
    imgElement.className = 'user-marker-avatar';
    imgElement.alt = 'Tu ubicación';
    imgElement.addEventListener('error', function handleImageError(this: HTMLImageElement) {
      if (!this.src.endsWith('default-avatar.svg')) {
        this.src = '/assets/images/default-avatar.svg';
      } else {
        // If even the default avatar fails, hide the image to prevent infinite loop
        this.style.display = 'none';
      }
    });

    el.appendChild(haloDiv);
    el.appendChild(imgElement);

    // Create marker
    this.userLocationMarker = new this.mapboxgl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([this.userLocation.lng, this.userLocation.lat])
      .addTo(this.map);

    // Animate marker movement if location changed
    if (previousLocation) {
      const distance = this.calculateDistance(
        previousLocation.lat,
        previousLocation.lng,
        this.userLocation.lat,
        this.userLocation.lng,
      );

      if (distance > 10) {
        // Solo animar si se movió más de 10 metros
        this.animateMarkerUpdate();
      } else {
        // Trigger pulse even for small movements
        this.triggerLocationPulse();
      }
    }

    // Trigger visual pulse on initial load
    if (!previousLocation) {
      setTimeout(() => {
        this.triggerLocationPulse();
      }, 1000);
    }
  }

  /**
   * Calculate distance between two points in km
   */
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
      Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get count of cars near user location
   */
  /**
   * Get count of cars near user location
   */
  private getNearbyCarsCount(): number {
    const userLoc = this.userLocation;
    if (!userLoc) return 0;

    const radius = this.searchRadiusKm || 5; // Default 5km if not set

    return this.cars.filter((car) => {
      if (!car.lat || !car.lng) return false;

      const dist = this.calculateDistanceKm(userLoc.lat, userLoc.lng, car.lat, car.lng);

      return dist <= radius;
    }).length;
  }

  /**
   * Format update time for display
   */
  private formatUpdateTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 10) return 'Actualizado ahora';
    if (diffSec < 60) return `Actualizado hace ${diffSec}s`;
    if (diffMin < 60) return `Actualizado hace ${diffMin}min`;
    return `Actualizado ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /**
   * Get location update text for info layer
   */
  public getLocationUpdateText(): string {
    if (!this.lastLocationUpdate) return 'Desconocido';
    return this.formatUpdateTime(this.lastLocationUpdate);
  }

  /**
   * Get count of available cars
   */
  public getAvailableCarsCount(): number {
    return this.cars.filter((car) => car.availabilityStatus === 'available').length;
  }

  /**
   * Get count of cars in use
   */
  public getInUseCarsCount(): number {
    return this.cars.filter((car) => car.availabilityStatus === 'in_use').length;
  }

  /**
   * Get count of soon available cars
   */
  public getSoonAvailableCarsCount(): number {
    return this.cars.filter((car) => car.availabilityStatus === 'soon_available').length;
  }

  /**
   * Get count of unavailable cars
   */
  public getUnavailableCarsCount(): number {
    return this.cars.filter((car) => car.availabilityStatus === 'unavailable').length;
  }

  /**
   * Animate marker update with smooth transitions
   */
  private animateMarkerUpdate(): void {
    if (!this.map || !this.userLocation) return;

    // Smooth camera transition
    this.map.easeTo({
      center: [this.userLocation.lng, this.userLocation.lat],
      duration: 800,
      easing: (t: number) => t * (2 - t), // ease-out
    });

    // Add pulse animation to marker
    this.triggerLocationPulse();
  }

  /**
   * Trigger pulse animation on location update
   */
  private triggerLocationPulse(): void {
    if (!this.userLocationMarker) return;

    const element = this.userLocationMarker.getElement();
    if (element) {
      element.classList.add('user-location-marker--pulse');
      setTimeout(() => {
        element.classList.remove('user-location-marker--pulse');
      }, 1000);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Update marker styles based on mode and theme
   */
  private updateMarkerStyles(): void {
    if (!this.userLocationMarker) return;

    const element = this.userLocationMarker.getElement();
    if (element) {
      element.className = `user-location-marker user-location-marker--${this.locationMode}`;
      if (this.isDarkMode()) {
        element.classList.add('user-location-marker--dark');
      } else {
        element.classList.remove('user-location-marker--dark');
      }
    }
  }

  /**
   * Add search radius layer (circle around user location)
   */
  private addSearchRadiusLayer(): void {
    if (!this.map || !this.mapboxgl || !this.userLocation) return;

    // Check if style is loaded before adding layers
    if (!this.map.isStyleLoaded()) {
      // Wait for style to load, then add layer
      this.map.once('styledata', () => {
        this.addSearchRadiusLayer();
      });
      return;
    }

    // Convert radius from km to meters
    const radiusMeters = this.searchRadiusKm * 1000;

    // Create circle geometry
    const circle = this.createCircleGeometry(
      this.userLocation.lat,
      this.userLocation.lng,
      radiusMeters,
    );

    // Add or update source
    const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: circle,
      properties: {},
    };

    const source = this.map.getSource(this.searchRadiusSourceId) as MapboxGeoJSONSource | undefined;
    if (source) {
      source.setData(feature);
    } else {
      this.map.addSource(this.searchRadiusSourceId, {
        type: 'geojson',
        data: feature,
      });
    }

    // Add or update layer
    const fillColor = this.isDarkMode() ? 'rgba(167, 216, 244, 0.1)' : 'rgba(167, 216, 244, 0.15)';
    const outlineColor = this.isDarkMode()
      ? 'rgba(167, 216, 244, 0.4)'
      : 'rgba(167, 216, 244, 0.5)';

    if (!this.map.getLayer(this.searchRadiusLayerId)) {
      this.map.addLayer({
        id: this.searchRadiusLayerId,
        type: 'fill',
        source: this.searchRadiusSourceId,
        paint: {
          'fill-color': fillColor,
          'fill-outline-color': outlineColor,
        },
      });
    } else {
      // Update paint properties with smooth transitions
      // Mapbox GL JS handles transitions automatically when properties change
      this.map.setPaintProperty(this.searchRadiusLayerId, 'fill-color', fillColor);
      this.map.setPaintProperty(this.searchRadiusLayerId, 'fill-outline-color', outlineColor);
    }
  }

  /**
   * Create circle geometry for search radius
   */
  private createCircleGeometry(lat: number, lng: number, radiusMeters: number): GeoJSON.Polygon {
    const points = 64;
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const point = this.destinationPoint(lat, lng, radiusMeters, angle);
      coordinates.push([point.lng, point.lat]);
    }

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }

  /**
   * Calculate destination point given start point, distance and bearing
   */
  private destinationPoint(
    lat: number,
    lng: number,
    distanceMeters: number,
    bearingDegrees: number,
  ): { lat: number; lng: number } {
    const R = 6371e3; // Earth radius in meters
    const bearing = (bearingDegrees * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearing),
    );

    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(lat1),
        Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2),
      );

    return {
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI,
    };
  }

  /**
   * Setup follow user location functionality
   */
  private setupFollowLocation(): void {
    if (this.followUserLocation) {
      this.startFollowingLocation();
    }
  }

  /**
   * Start following user location
   */
  startFollowingLocation(): void {
    if (!this.map || !this.userLocation || this.followLocationInterval) return;

    this.followUserLocation = true;
    this.followLocationToggle.emit(true);

    // Fly to user location initially with reduced zoom and padding
    this.map.flyTo({
      center: [this.userLocation.lng, this.userLocation.lat],
      zoom: 13, // Reduced from 14 to prevent marker overlap/duplication
      duration: 1000,
      padding: { top: 50, bottom: 50, left: 50, right: 50 }, // Add padding for better positioning
    });

    // Update position periodically with debounce to prevent animation overlap
    let lastEaseToTime = 0;
    const easeToDebounceMs = 1000; // Prevent animations from stacking
    this.followLocationInterval = setInterval(() => {
      // Pause updates if page is hidden to save battery
      if (typeof document !== 'undefined' && document.hidden) return;

      if (this.userLocation && this.map) {
        const now = Date.now();
        // Only execute if enough time has passed since last animation
        if (now - lastEaseToTime > easeToDebounceMs) {
          lastEaseToTime = now;
          this.map.easeTo({
            center: [this.userLocation.lng, this.userLocation.lat],
            duration: 500,
          });
        }
      }
    }, 3000); // Update every 3 seconds (increased from 2s to reduce animation frequency)
  }

  /**
   * Stop following user location
   */
  stopFollowingLocation(): void {
    if (this.followLocationInterval) {
      clearInterval(this.followLocationInterval);
      this.followLocationInterval = null;
    }
    this.followUserLocation = false;
    this.followLocationToggle.emit(false);
  }

  /**
   * Setup lock controls for zoom and rotation
   */
  private setupLockControls(): void {
    if (!this.map) return;

    if (this.lockZoomRotation) {
      // Disable zoom and rotation
      this.map.boxZoom.disable();
      this.map.scrollZoom.disable();
      this.map.dragRotate.disable();
      this.map.touchZoomRotate.disable();
    } else {
      // Enable zoom and rotation
      this.map.boxZoom.enable();
      this.map.scrollZoom.enable();
      this.map.dragRotate.enable();
      this.map.touchZoomRotate.enable();
    }
  }

  /**
   * Toggle lock state
   */
  public toggleLock(): void {
    this.lockZoomRotation = !this.lockZoomRotation;
    this.lockToggle.emit(this.lockZoomRotation);
    this.setupLockControls();
  }

  /**
   * Toggle follow location
   */
  public toggleFollowLocation(): void {
    if (this.followUserLocation) {
      this.stopFollowingLocation();
    } else {
      this.startFollowingLocation();
    }
  }

  /**
   * Toggle delivery zone (isochrone)
   */
  public toggleDeliveryZone(): void {
    this.showDeliveryIsochrone = !this.showDeliveryIsochrone;
    if (this.showDeliveryIsochrone) {
      this.addDeliveryIsochrone();
    } else {
      this.removeDeliveryIsochrone();
    }
  }

  /**
   * Toggle directions route
   */
  public toggleDirections(): void {
    this.showDirectionsRoute = !this.showDirectionsRoute;
    if (this.showDirectionsRoute) {
      this.addDirectionsRoute();
    } else {
      this.removeDirectionsRoute();
    }
  }

  /**
   * Handle search radius slider change
   */
  public onSearchRadiusChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    this.searchRadiusKm = value;
    this.searchRadiusChange.emit(value);

    // Update radius layer with animation
    if (this.showSearchRadius && this.map) {
      this.addSearchRadiusLayer();
    }

    // Note: The parent component (marketplace.page.ts) should handle
    // refetching cars with the new radius filter via searchRadiusChange output
  }

  /**
   * Highlight selected car marker
   */
  private highlightSelectedCar(carId: string): void {
    const markerData = this.carMarkers.get(carId);
    if (!markerData) return;

    markerData.componentRef.instance.isSelected = true;

    // Fly to selected car
    const car = this.cars.find((c) => c['carId'] === carId);
    if (car && this.map) {
      this.map.flyTo({
        center: [car.lng, car.lat],
        zoom: 14,
        duration: 1000,
      });
    }

    // Update tooltip component
    const componentRef = this.tooltipComponents.get(carId);
    if (componentRef) {
      componentRef.setInput('selected', true);
    }
  }

  /**
   * Remove highlight from car marker
   */
  private removeHighlightFromCar(carId: string): void {
    const markerData = this.carMarkers.get(carId);
    if (!markerData) return;

    markerData.componentRef.instance.isSelected = false;

    // Update tooltip component
    const componentRef = this.tooltipComponents.get(carId);
    if (componentRef) {
      componentRef.setInput('selected', false);
    }
  }

  /**
   * Highlight preview car from carousel scroll (lighter than selection)
   * Pans the map to show the car and adds a visual highlight
   */
  private highlightPreviewCar(carId: string): void {
    const car = this.cars.find((c) => c['carId'] === carId);
    if (!car || !this.map) return;

    // Get current zoom - only zoom in if too far out to see markers
    const currentZoom = this.map.getZoom();
    const minZoomForMarkers = 12;
    const needsZoom = currentZoom < minZoomForMarkers;

    // Smooth pan to car location (less dramatic than selection flyTo)
    this.map.easeTo({
      center: [car.lng, car.lat],
      zoom: needsZoom ? minZoomForMarkers : currentZoom,
      duration: needsZoom ? 600 : 300,
      essential: true,
    });

    // Wait for map to settle, then render markers in viewport and highlight
    const animationDuration = needsZoom ? 600 : 300;
    setTimeout(() => {
      // Ensure markers are rendered in the new viewport
      this.handleZoomForHybridMode();

      // Add CSS class for visual highlight
      const markerData = this.carMarkers.get(carId);
      if (markerData) {
        const el = markerData.marker.getElement();
        el.classList.add('map-marker-preview');
      }
    }, animationDuration + 100);
  }

  /**
   * Remove preview highlight from car marker
   */
  private removePreviewHighlight(carId: string): void {
    const markerData = this.carMarkers.get(carId);
    if (!markerData) return;

    const el = markerData.marker.getElement();
    el.classList.remove('map-marker-preview');
  }

  /**
   * Clear all markers and related resources
   */
  private clearMarkers(): void {
    // Clear hover timeouts
    this.hoverTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.hoverTimeouts.clear();

    // Clear hide timeouts
    this.hideTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.hideTimeouts.clear();

    // Detach Angular components
    this.tooltipComponents.forEach((componentRef) => {
      this.applicationRef.detachView(componentRef.hostView);
      componentRef.destroy();
    });
    this.tooltipComponents.clear();

    // Remove popups
    this.tooltipPopups.forEach((popup) => {
      popup.remove();
    });
    this.tooltipPopups.clear();

    // Remove markers and return components to pool
    this.carMarkers.forEach((markerData) => {
      markerData.marker.remove();
      this.returnMarkerComponentToPool(markerData.componentRef);
    });
    this.carMarkers.clear();
    this.visibleCarIds.clear();
  }

  /**
   * Remove search radius layer
   */
  private removeSearchRadiusLayer(): void {
    if (!this.map) return;

    try {
      if (this.map.getLayer(this.searchRadiusLayerId)) {
        this.map.removeLayer(this.searchRadiusLayerId);
      }
      if (this.map.getSource(this.searchRadiusSourceId)) {
        this.map.removeSource(this.searchRadiusSourceId);
      }
    } catch {
      // Layers may not exist
    }
  }

  /**
   * Add delivery isochrone layer for selected car
   * Shows the area reachable from the car's location within deliveryTimeMinutes
   */
  private async addDeliveryIsochrone(): Promise<void> {
    if (!this.map || !this.mapboxgl) return;

    const selectedCar = this.selectedCar();
    if (!selectedCar) return;

    // Check if style is loaded
    if (!this.map.isStyleLoaded()) {
      this.map.once('styledata', () => {
        this.addDeliveryIsochrone();
      });
      return;
    }

    try {
      // Fetch isochrone from Mapbox API
      const lng = selectedCar.lng;
      const lat = selectedCar.lat;
      const profile = 'driving'; // Options: driving, walking, cycling
      const minutes = this.deliveryTimeMinutes;

      const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}?contours_minutes=${minutes}&polygons=true&access_token=${environment.mapboxAccessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[CarsMap] Failed to fetch isochrone:', response.statusText);
        return;
      }

      const data = (await response.json()) as GeoJSON.FeatureCollection;

      // Add or update source
      const source = this.map.getSource(this.isochroneSourceId) as MapboxGeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      } else {
        this.map.addSource(this.isochroneSourceId, {
          type: 'geojson',
          data: data,
        });
      }

      // Add fill layer
      const fillColor = this.isDarkMode() ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.25)';
      if (!this.map.getLayer(this.isochroneLayerId)) {
        this.map.addLayer({
          id: this.isochroneLayerId,
          type: 'fill',
          source: this.isochroneSourceId,
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.8,
          },
        });
      } else {
        this.map.setPaintProperty(this.isochroneLayerId, 'fill-color', fillColor);
      }

      // Add outline layer for better visibility
      const outlineColor = this.isDarkMode()
        ? 'rgba(16, 185, 129, 0.8)'
        : 'rgba(16, 185, 129, 0.9)';
      if (!this.map.getLayer(this.isochroneOutlineLayerId)) {
        this.map.addLayer({
          id: this.isochroneOutlineLayerId,
          type: 'line',
          source: this.isochroneSourceId,
          paint: {
            'line-color': outlineColor,
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });
      } else {
        this.map.setPaintProperty(this.isochroneOutlineLayerId, 'line-color', outlineColor);
      }

      this.logger.debug(
        `[CarsMap] Added delivery isochrone: ${minutes} min driving radius from car location`,
      );
    } catch (error) {
      console.error('[CarsMap] Error adding delivery isochrone:', error);
    }
  }

  /**
   * Remove delivery isochrone layer
   */
  private removeDeliveryIsochrone(): void {
    if (!this.map) return;

    try {
      if (this.map.getLayer(this.isochroneOutlineLayerId)) {
        this.map.removeLayer(this.isochroneOutlineLayerId);
      }
      if (this.map.getLayer(this.isochroneLayerId)) {
        this.map.removeLayer(this.isochroneLayerId);
      }
      if (this.map.getSource(this.isochroneSourceId)) {
        this.map.removeSource(this.isochroneSourceId);
      }
    } catch {
      // Layers may not exist
    }
  }

  /**
   * Add directions route layer from user location to selected car
   * Shows turn-by-turn directions with estimated time and distance
   */
  private async addDirectionsRoute(): Promise<void> {
    if (!this.map || !this.mapboxgl || !this.userLocation) {
      console.warn('[CarsMap] Cannot show directions: missing map or user location');
      return;
    }

    const selectedCar = this.selectedCar();
    if (!selectedCar) {
      console.warn('[CarsMap] Cannot show directions: no selected car');
      return;
    }

    // Check if style is loaded
    if (!this.map.isStyleLoaded()) {
      this.map.once('styledata', () => {
        this.addDirectionsRoute();
      });
      return;
    }

    try {
      const origin: [number, number] = [this.userLocation.lng, this.userLocation.lat];
      const destination: [number, number] = [selectedCar.lng, selectedCar.lat];

      // Fetch directions from API
      const directions = await this.directionsService.getDirections(origin, destination, 'driving');

      if (!directions || !directions.routes || directions.routes.length === 0) {
        console.warn('[CarsMap] No route found');
        return;
      }

      const route = directions.routes[0];
      const routeGeometry = route.geometry;

      // Create GeoJSON for the route
      const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        geometry: routeGeometry,
        properties: {
          duration: route.duration,
          distance: route.distance,
        },
      };

      // Add or update source
      const source = this.map.getSource(this.routeSourceId) as MapboxGeoJSONSource | undefined;
      if (source) {
        source.setData(routeGeoJSON);
      } else {
        this.map.addSource(this.routeSourceId, {
          type: 'geojson',
          data: routeGeoJSON,
        });
      }

      // Add outline layer (casing) - visible route styling
      if (!this.map.getLayer(this.routeOutlineLayerId)) {
        this.map.addLayer({
          id: this.routeOutlineLayerId,
          type: 'line',
          source: this.routeSourceId,
          paint: {
            'line-color': '#ffffff',
            'line-width': 20, // THICK outline to occupy whole street
            'line-opacity': 0.8, // High visibility
          },
          layout: {
            'line-cap': 'round', // Rounded ends for smooth appearance
            'line-join': 'round', // Rounded corners for smooth turns
          },
        });
      }

      // Add main route layer - visible route styling
      const routeColor = this.getCssVariableValue('--cta-default', '#A7D8F4'); // AutoRenta brand color
      if (!this.map.getLayer(this.routeLayerId)) {
        this.map.addLayer({
          id: this.routeLayerId,
          type: 'line',
          source: this.routeSourceId,
          paint: {
            'line-color': routeColor,
            'line-width': 16, // THICK main line to occupy whole street
            'line-opacity': 0.9, // High visibility
          },
          layout: {
            'line-cap': 'round', // Rounded ends for smooth appearance
            'line-join': 'round', // Rounded corners for smooth turns
          },
        });
      } else {
        this.map.setPaintProperty(this.routeLayerId, 'line-color', routeColor);
      }

      // Fit map to show entire route
      const coordinates = routeGeometry.coordinates as [number, number][];
      const bounds = coordinates.reduce(
        (bounds, coord) => {
          return bounds.extend(coord as [number, number]);
        },
        new this.mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
      );

      this.map.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 15,
        duration: 1000,
        pitch: 0, // Flat 2D view
      });

      this.logger.debug('[CarsMap] Directions route added:', {
        duration: this.directionsService.formatDuration(route.duration),
        distance: this.directionsService.formatDistance(route.distance),
      });
    } catch (error) {
      console.error('[CarsMap] Error adding directions route:', error);
    }
  }

  /**
   * Remove directions route layer
   */
  private removeDirectionsRoute(): void {
    if (!this.map) return;

    try {
      if (this.map.getLayer(this.routeLayerId)) {
        this.map.removeLayer(this.routeLayerId);
      }
      if (this.map.getLayer(this.routeOutlineLayerId)) {
        this.map.removeLayer(this.routeOutlineLayerId);
      }
      if (this.map.getSource(this.routeSourceId)) {
        this.map.removeSource(this.routeSourceId);
      }
    } catch {
      // Layers may not exist
    }
  }

  /**
   * Cleanup on destroy
   */
  private cleanup(): void {
    this.teardownResizeObserver();
    // Cancel any pending updates
    if (this.pendingUpdate) {
      cancelAnimationFrame(this.pendingUpdate);
      this.pendingUpdate = null;
    }

    this.clearMarkers();
    this.stopFollowingLocation();

    // Remove clustering layers
    if (this.map) {
      try {
        if (this.map.getLayer(this.clusterLayerId + '-shadow')) {
          this.map.removeLayer(this.clusterLayerId + '-shadow');
        }
        if (this.map.getLayer(this.clusterLayerId)) {
          this.map.removeLayer(this.clusterLayerId);
        }
        if (this.map.getLayer(this.clusterCountLayerId)) {
          this.map.removeLayer(this.clusterCountLayerId);
        }
        if (this.map.getLayer('cars-unclustered')) {
          this.map.removeLayer('cars-unclustered');
        }
        if (this.map.getSource(this.clusterSourceId)) {
          this.map.removeSource(this.clusterSourceId);
        }
        this.removeSearchRadiusLayer();
        this.removeDeliveryIsochrone();
        this.removeDirectionsRoute();
      } catch {
        // Layers may not exist
      }
    }

    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Reset event registration flag so listeners are re-added if map is re-created
    this.clusterEventsRegistered = false;

    // Clear component pools
    this.clearComponentPools();
  }

  /**
   * Public method to fly to car location with smooth animation
   */
  flyToCarLocation(carId: string): void {
    const car = this.cars.find((c) => c['carId'] === carId);
    if (car && this.map && car.lat && car.lng) {
      this.map.flyTo({
        center: [car.lng, car.lat],
        zoom: 16, // Closer zoom for better focus
        pitch: 0, // Flat 2D view
        bearing: 0, // North-up orientation
        duration: 1500, // Smooth animation
        essential: true,
      });
      this.highlightSelectedCar(carId);
    }
  }

  /**
   * Public method to fly to a specific location (lat/lng)
   */
  flyToLocation(lat: number, lng: number, zoom = 14): void {
    if (this.map) {
      this.map.flyTo({
        center: [lng, lat],
        zoom,
        essential: true,
        duration: 1200,
      });
    }
  }

  /**
   * Handle booking panel close
   */
  onBookingPanelClose(): void {
    this.bookingPanelOpen.set(false);
    this.selectedCarForBooking.set(null);
  }

  onDetailsPanelClose(): void {
    this.selectedCar.set(null);
    if (this.selectedCarId) {
      this.removeHighlightFromCar(this.selectedCarId);
    }
  }

  onQuickBookFromDetails(carId: string): void {
    this.openBookingPanelForCarId(carId);
  }

  private openBookingPanelForCarId(carId: string): void {
    const car = this.cars.find((c) => c['carId'] === carId) ?? null;
    if (!car) {
      return;
    }

    this.selectedCarForBooking.set(car);
    this.bookingPanelOpen.set(true);
  }

  /**
   * Handle booking confirmed
   */
  onBookingConfirmed(bookingData: BookingFormData): void {
    const carId = this.selectedCarForBooking()?.['carId'];
    if (carId) {
      this.bookingConfirmed.emit({ carId, bookingData });
    }
    this.bookingPanelOpen.set(false);
    this.selectedCarForBooking.set(null);
  }

  /**
   * Update markers when cars input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.map) {
      // Update spatial index first, then markers (handle first data arrival)
      this.updateSpatialIndex();
      this.updateMarkersBasedOnCount();
    }
    if (changes['selectedCarId'] && !changes['selectedCarId'].firstChange && this.map) {
      const previousId = changes['selectedCarId'].previousValue;
      const currentId = changes['selectedCarId'].currentValue;

      // Remove highlight from previous
      if (previousId) {
        this.removeHighlightFromCar(previousId);
      }

      // Highlight current & Animate Camera
      if (currentId) {
        this.sound.play('click');
        this.highlightSelectedCar(currentId);
        const car = this.cars.find((c) => c['carId'] === currentId);
        if (car) {
          this.selectedCar.set(car);
          // CINEMA MODE: Dramatic FlyTo Transition
          this.logger.debug('[CarsMap] Cinema Mode: Flying to car ' + currentId);
          this.map.flyTo({
            center: [car.lng, car.lat],
            zoom: 16,        // Close up
            pitch: 60,       // Street View tilt
            bearing: -20,    // Cinematic angle
            duration: 1500,  // Slow dramatic pan
            essential: true, // Animation respecting reduce-motion
            curve: 1.2,  // Smooth easing
            padding: { bottom: 200 } // Offset for carousel
          });
        }
      } else {
        this.selectedCar.set(null);
        // Reset to standard view if deselected
        this.map.easeTo({
          pitch: 0,
          bearing: 0,
          zoom: 12,
          duration: 1200
        });
      }
    }
    if (changes['userLocation'] && !changes['userLocation'].firstChange && this.map) {
      this.addUserLocationMarker();
      if (this.showSearchRadius) {
        this.addSearchRadiusLayer();
      }
    }
    if (changes['locationMode'] && !changes['locationMode'].firstChange) {
      this.updateMarkerStyles();
    }
    if (changes['markerVariant'] && !changes['markerVariant'].firstChange) {
      this.updateMapTheme();
      // Re-render markers with new variant
      if (this.map) {
        this.scheduleDebouncedUpdate(() => this.updateMarkersBasedOnCount());
      }
    }
    // Handle carousel preview highlight (separate from selection)
    if (changes['highlightedCarId'] && !changes['highlightedCarId'].firstChange && this.map) {
      const previousId = changes['highlightedCarId'].previousValue;
      const currentId = changes['highlightedCarId'].currentValue;

      // Remove preview highlight from previous
      if (previousId && previousId !== this.selectedCarId) {
        this.removePreviewHighlight(previousId);
      }

      // Apply preview highlight to current (only if not already selected)
      if (currentId && currentId !== this.selectedCarId) {
        this.highlightPreviewCar(currentId);
      }
    }
    if (changes['searchRadiusKm'] && !changes['searchRadiusKm'].firstChange && this.map) {
      if (this.showSearchRadius) {
        this.addSearchRadiusLayer();
      }
      this.searchRadiusChange.emit(this.searchRadiusKm);
    }
    if (changes['showSearchRadius'] && !changes['showSearchRadius'].firstChange && this.map) {
      if (this.showSearchRadius) {
        this.addSearchRadiusLayer();
      } else {
        this.removeSearchRadiusLayer();
      }
    }
    if (changes['followUserLocation'] && !changes['followUserLocation'].firstChange) {
      if (this.followUserLocation) {
        this.startFollowingLocation();
      } else {
        this.stopFollowingLocation();
      }
    }
    if (changes['lockZoomRotation'] && !changes['lockZoomRotation'].firstChange) {
      this.setupLockControls();
    }
    if (
      changes['showDeliveryIsochrone'] ||
      changes['selectedCarId'] ||
      changes['deliveryTimeMinutes']
    ) {
      if (this.showDeliveryIsochrone && this.selectedCarId && this.map) {
        this.addDeliveryIsochrone();
      } else {
        this.removeDeliveryIsochrone();
      }
    }
    if (changes['showDirectionsRoute'] || changes['selectedCarId'] || changes['userLocation']) {
      if (this.showDirectionsRoute && this.selectedCarId && this.userLocation && this.map) {
        this.addDirectionsRoute();
      } else {
        this.removeDirectionsRoute();
      }
    }
  }

  /**
   * Maneja el toggle de capas del mapa
   */
  onLayerToggle(event: any): void {
    if (!event || typeof event.layerId !== 'string') {
      console.warn('[CarsMap] Invalid layer toggle event:', event);
      return;
    }
    switch (event.layerId) {
      case 'base-map':
        this.showBaseMap.set(event.visible);
        // Ocultar/mostrar el mapa base (si es necesario)
        if (this.map) {
          const container = this.map.getContainer();
          container.style.opacity = event.visible ? '1' : '0.3';
        }
        break;
      case 'user-location':
        this.showUserLocation.set(event.visible);
        if (event.visible) {
          this.addUserLocationMarker();
        } else {
          if (this.userLocationMarker) {
            this.userLocationMarker.remove();
            this.userLocationMarker = null;
          }
        }
        break;
      case 'marketplace-cars':
        this.showMarketplaceCars.set(event.visible);
        if (event.visible) {
          this.renderCarMarkers();
        } else {
          this.clearMarkers();
        }
        break;
      default:
        console.warn(`[CarsMap] Unhandled layer toggle: ${event.layerId}`);
        break;
    }
  }
}
