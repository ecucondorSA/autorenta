import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ApplicationRef,
  Component,
  ComponentRef,
  computed,
  createComponent,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { environment } from '../../../../environments/environment';
import type { CarMapLocation } from '../../../core/services/car-locations.service';
import { MapboxDirectionsService } from '../../../core/services/mapbox-directions.service';
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
  imports: [
    CommonModule,
    MapBookingPanelComponent,
    MapDetailsPanelComponent,
    MapLayersControlComponent,
  ],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

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

  @Output() readonly carSelected = new EventEmitter<string>();
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

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly applicationRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly directionsService = inject(MapboxDirectionsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly bookingPanelOpen = signal(false);
  readonly selectedCarForBooking = signal<CarMapLocation | null>(null);
  readonly selectedCar = signal<CarMapLocation | null>(null);

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
   * Fly to a specific location
   */
  flyTo(location: { lat: number; lng: number }, zoom = 15): void {
    if (this.map) {
      this.map.flyTo({
        center: [location.lng, location.lat],
        zoom,
        essential: true,
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
  public useClustering = true; // Enable clustering by default - public for template access
  private clusterSourceId = 'cars-cluster-source';
  private clusterLayerId = 'cars-cluster-layer';
  private clusterCountLayerId = 'cars-cluster-count';
  // Mapbox optimization: Clustering is efficient for 10K+ cars (Supercluster handles 400K)
  public clusteringThreshold = 50; // Activate clustering at 50+ cars - public for template access
  private virtualizationThreshold = 1000; // Only virtualize if NOT clustering (10K+ without clustering)
  private viewportBuffer = 0.1; // 10% buffer around viewport for smoother experience
  private maxVisibleMarkers = 500; // Increased for better 10K+ experience when not clustering
  private visibleCarIds = new Set<string>(); // Track currently visible cars
  private pendingUpdate: number | null = null; // For debounced updates
  private spatialIndex: QuadTree | null = null; // Spatial index for efficient queries

  // Component pools for memory management
  private markerComponentPool: ComponentRef<MapMarkerComponent>[] = [];
  private tooltipComponentPool: ComponentRef<EnhancedMapTooltipComponent>[] = [];
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
      this.loading.set(false);
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

  /**
   * Get light preset based on current time of day
   * Returns: 'dawn', 'day', 'dusk', or 'night'
   */
  private getTimeBasedLightPreset(): 'dawn' | 'day' | 'dusk' | 'night' {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 11) return 'dawn'; // 6am - 11am: Amanecer
    if (hour >= 11 && hour < 18) return 'day'; // 11am - 6pm: Día
    if (hour >= 18 && hour < 21) return 'dusk'; // 6pm - 9pm: Atardecer
    return 'night'; // 9pm - 6am: Noche
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
   */
  private async initializeMap(): Promise<void> {
    try {
      this.loading.set(true);

      // Lazy load Mapbox GL
      const mapboxModule = await import('mapbox-gl');
      this.mapboxgl = mapboxModule.default;

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
        style: 'mapbox://styles/mapbox/standard', // Modern Standard style with theme support
        center: [-58.3816, -34.6037], // Buenos Aires center
        zoom: 15.5, // Higher zoom to show 3D buildings immediately
        maxBounds: [
          [-58.8, -34.9], // Southwest
          [-57.9, -34.3], // Northeast
        ],
        // Mapbox Standard configuration - OPTIMIZED for car marketplace
        config: {
          basemap: {
            lightPreset: initialLightPreset, // Auto-detect based on time: 'day', 'dusk', 'dawn', 'night'
            showPointOfInterestLabels: false, // Hide restaurants, hotels, shops (performance + cleaner)
            showTransitLabels: false, // Hide transit for cleaner car-focused map
            showPlaceLabels: true, // Keep neighborhood/area names
            showRoadLabels: true, // Keep street names (essential for car location)
            show3dObjects: true, // Enable 3D buildings for immersive marketplace view
          },
        },
        // 3D View Configuration - User controlled
        pitch: 60, // Deep 3D perspective view (60° angle for immersive effect)
        bearing: 0, // North-up orientation (user can rotate)
        antialias: true, // Enable antialiasing for smooth 3D buildings
        // Enable 3D interactions - full user control
        dragRotate: true, // Enable rotation drag
        pitchWithRotate: true, // Enable pitch on rotate
        touchPitch: true, // Enable touch pitch gestures
      });

      // Add navigation controls (zoom + compass for full 3D control)
      this.map.addControl(new this.mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load
      this.map.on('load', () => {
        this.loading.set(false);
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
        this.map.on('moveend', () => {
          this.emitBounds();
        });

        // Pre-warm component pool during idle time for better performance
        this.preWarmComponentPoolDuringIdle();
      });

      // Handle map errors
      this.map.on('error', (event: MapboxErrorDetails) => {
        console.error('[CarsMap] Map error:', event);

        const errorStatus =
          (event.error && 'status' in event.error ? event.error.status : undefined) ?? event.status;
        const errorMessage =
          (event.error && event.error.message) || ('message' in event ? event.message : '');

        if (
          errorStatus === 401 ||
          (typeof errorMessage === 'string' && errorMessage.includes('401'))
        ) {
          this.error.set(
            'Token de Mapbox inválido o expirado. Por favor, verifica tu NG_APP_MAPBOX_ACCESS_TOKEN en .env.local',
          );
        } else if (event.error?.message) {
          this.error.set(`Error al cargar el mapa: ${event.error.message}`);
        } else {
          this.error.set(
            'Error al cargar el mapa. Por favor, verifica tu conexión e intenta nuevamente.',
          );
        }

        this.loading.set(false);
      });
    } catch (err) {
      console.error('[CarsMap] Initialization error:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al inicializar el mapa');
      this.loading.set(false);
    }
  }

  /**
   * Setup clustering for car markers
   * Optimized for 10,000+ cars following Mapbox recommendations
   */
  private setupClustering(): void {
    if (!this.map || !this.mapboxgl) return;

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
        carId: car.carId,
        title: car.title,
        pricePerDay: car.pricePerDay,
        currency: car.currency || 'ARS',
        photoUrl: car.photoUrl,
        availabilityStatus: car.availabilityStatus || 'available',
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
        // Mapbox recommendation for 10K+ points
        clusterMaxZoom: 14, // Don't cluster beyond zoom 14
        clusterRadius: 50, // 50px radius for optimal clustering
        clusterProperties: {
          sum: ['+', ['get', 'pricePerDay']],
          count: ['+', 1],
        },
        // GeoJSON optimization for points (Mapbox recommendation)
        maxzoom: 12, // Limit tile generation to zoom 12 for points
        buffer: 0, // No buffer needed for simple points
        tolerance: 0.375, // Balance precision vs performance
        generateId: true, // Enable efficient feature-state updates
      });
    }

    // Add cluster circles layer
    if (!this.map.getLayer(this.clusterLayerId)) {
      this.map.addLayer({
        id: this.clusterLayerId,
        type: 'circle',
        source: this.clusterSourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#10b981', // Green for available
            5,
            '#f59e0b', // Amber for medium clusters
            20,
            '#6366f1', // Indigo for large clusters
          ],
          'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 20, 40, 50, 50],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.8,
        },
      });
    }

    // Add cluster count labels
    if (!this.map.getLayer(this.clusterCountLayerId)) {
      this.map.addLayer({
        id: this.clusterCountLayerId,
        type: 'symbol',
        source: this.clusterSourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#fff',
        },
      });
    }

    // Add unclustered points (individual cars)
    if (!this.map.getLayer('cars-unclustered')) {
      this.map.addLayer({
        id: 'cars-unclustered',
        type: 'circle',
        source: this.clusterSourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'availabilityStatus'], 'available'],
            '#10b981',
            ['==', ['get', 'availabilityStatus'], 'soon_available'],
            '#f59e0b',
            ['==', ['get', 'availabilityStatus'], 'in_use'],
            '#6366f1',
            '#ef4444', // unavailable
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': ['case', ['==', ['get', 'availabilityStatus'], 'unavailable'], 0.5, 1],
        },
      });
    }

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
        typeof properties.cluster_id === 'number' ? (properties.cluster_id as number) : undefined;

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

    // Handle individual car clicks
    this.map.on('click', 'cars-unclustered', (event: MapLayerMouseEvent) => {
      const carFeature = event.features?.[0] as MapboxGeoJSONFeature | undefined;
      const properties = (carFeature?.properties || {}) as Record<string, unknown>;
      const carId = typeof properties.carId === 'string' ? (properties.carId as string) : undefined;
      if (carId) {
        this.carSelected.emit(carId);
        const car = this.cars.find((c) => c.carId === carId);
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
   * Creates 50 components progressively to avoid blocking main thread
   */
  private preWarmComponentPoolDuringIdle(): void {
    // Only pre-warm if pool is small
    if (this.markerComponentPool.length > 50) {
      return;
    }

    const targetPoolSize = 100;
    const componentsPerBatch = 5; // Create 5 at a time

    const createBatch = () => {
      if (this.markerComponentPool.length >= targetPoolSize) {
        return; // Done warming
      }

      // Create a batch during idle time
      for (
        let i = 0;
        i < componentsPerBatch && this.markerComponentPool.length < targetPoolSize;
        i++
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
      }

      // Schedule next batch if needed
      if (this.markerComponentPool.length < targetPoolSize) {
        if ('requestIdleCallback' in window) {
          // Modern browsers with requestIdleCallback
          requestIdleCallback(() => createBatch(), { timeout: 2000 });
        } else {
          // Fallback for older browsers
          setTimeout(() => createBatch(), 100);
        }
      }
    };

    // Start warming with requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => createBatch(), { timeout: 1000 });
    } else {
      // Fallback for older browsers
      setTimeout(() => createBatch(), 500);
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
    this.visibleCarIds = new Set(carsToRender.map((car) => car.carId));

    // Render markers for visible cars
    carsToRender.forEach((car) => {
      const markerData = this.createCarMarker(car);
      if (markerData) {
        this.carMarkers.set(car.carId, markerData);
      }
    });

    // Highlight selected car if it's visible
    if (this.selectedCarId && this.visibleCarIds.has(this.selectedCarId)) {
      this.highlightSelectedCar(this.selectedCarId);
    }
  }

  /**
   * Update virtualized markers when viewport changes
   */
  private updateVirtualizedMarkers(): void {
    if (!this.map) return;

    const newVisibleCars = this.getVisibleCarsInViewport();
    const newVisibleCarIds = new Set(newVisibleCars.map((car) => car.carId));

    // Find cars that are no longer visible (need to be removed)
    const carsToRemove = Array.from(this.visibleCarIds).filter((id) => !newVisibleCarIds.has(id));

    // Find cars that are newly visible (need to be added)
    const carsToAdd = newVisibleCars.filter((car) => !this.visibleCarIds.has(car.carId));

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
        this.carMarkers.set(car.carId, markerData);
      }
    });

    // Update visible car IDs
    this.visibleCarIds = new Set([
      ...Array.from(this.visibleCarIds).filter((id) => !carsToRemove.includes(id)),
      ...carsToAddLimited.map((car) => car.carId),
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
        this.carMarkers.set(car.carId, markerData);
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
    componentRef.setInput('isSelected', this.selectedCarId === car.carId);

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
      const timeout = setTimeout(() => {
        this.showTooltipForCar(marker, car);
      }, 150);
      this.hoverTimeouts.set(car.carId, timeout);
    });

    markerElement.addEventListener('mouseleave', () => {
      const timeout = this.hoverTimeouts.get(car.carId);
      if (timeout) {
        clearTimeout(timeout);
        this.hoverTimeouts.delete(car.carId);
      }
      this.hideTooltipForCar(car.carId);
    });

    // Handle click
    markerElement.addEventListener('click', () => {
      this.carSelected.emit(car.carId);
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

    // Get component from pool or create new one
    const componentRef = this.getTooltipComponentFromPool();

    // Set inputs
    componentRef.setInput('car', car);
    componentRef.setInput('selected', this.selectedCarId === car.carId);
    componentRef.setInput('userLocation', this.userLocation || undefined);

    // Subscribe to output events
    componentRef.instance.viewDetails.subscribe((carId: string) => {
      this.carSelected.emit(carId);
    });

    componentRef.instance.quickBook.subscribe((carId: string) => {
      this.quickBook.emit(carId);
    });

    // Show the element (it might have been hidden in pool)
    const element = componentRef.location.nativeElement as HTMLElement;
    element.style.display = 'block';

    // Append the component's native element to the container
    container.appendChild(element);

    // Store component reference
    this.tooltipComponents.set(car.carId, componentRef);

    // Create popup with larger maxWidth for enhanced tooltip
    const popup = new this.mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      closeOnClick: false,
      maxWidth: '320px',
    }).setDOMContent(container);

    // Store popup reference
    this.tooltipPopups.set(car.carId, popup);

    return popup;
  }

  /**
   * Show tooltip for a car on-demand
   */
  private showTooltipForCar(marker: MapboxMarker, car: CarMapLocation): void {
    // Check if tooltip already exists
    let popup = this.tooltipPopups.get(car.carId);

    if (!popup) {
      // Create tooltip on-demand
      popup = this.createTooltipPopup(car);
      this.tooltipPopups.set(car.carId, popup);
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
    imgElement.src = this.userAvatarUrl || 'assets/images/default-avatar.svg';
    imgElement.className = 'user-marker-avatar';
    imgElement.alt = 'Tu ubicación';
    imgElement.addEventListener('error', function handleImageError(this: HTMLImageElement) {
      this.src = 'assets/images/default-avatar.svg';
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

    // Create enhanced popup with contextual information
    const popup = this.createUserLocationPopup();
    this.userLocationMarker.setPopup(popup);

    // Show popup initially with pulse animation (only if it's the first time)
    if (!previousLocation) {
      setTimeout(() => {
        this.userLocationMarker?.togglePopup();
        this.triggerLocationPulse();
      }, 1000);
    }
  }

  /**
   * Create enhanced popup with contextual information
   */
  private createUserLocationPopup(): MapboxPopup {
    if (!this.mapboxgl) {
      throw new Error('Mapbox GL not initialized');
    }

    const accuracyText = this.locationAccuracy
      ? `Precisión: ±${Math.round(this.locationAccuracy)}m`
      : 'Precisión: Desconocida';

    const updateTime = this.lastLocationUpdate
      ? this.formatUpdateTime(this.lastLocationUpdate)
      : 'Actualizado ahora';

    const modeText =
      this.locationMode === 'searching'
        ? 'Buscando autos cerca'
        : this.locationMode === 'booking-confirmed'
          ? 'Reserva confirmada'
          : 'Tu ubicación';

    const popupHTML = `
      <div class="user-location-popup">
        <p class="font-semibold text-text-primary">${modeText}</p>
        <p class="text-xs text-text-secondary">${accuracyText}</p>
        <p class="text-xs text-text-tertiary">${updateTime}</p>
        <div class="user-location-popup-actions">
          <button class="user-location-cta" data-action="search-nearby">
            Buscar autos cerca
          </button>
          <button class="user-location-cta" data-action="view-routes">
            Ver rutas
          </button>
        </div>
      </div>
    `;

    const popup = new this.mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
    }).setHTML(popupHTML);

    // Attach event listeners after popup is created
    popup.on('open', () => {
      const searchBtn = popup.getElement()?.querySelector('[data-action="search-nearby"]');
      const routesBtn = popup.getElement()?.querySelector('[data-action="view-routes"]');

      searchBtn?.addEventListener('click', () => {
        this.carSelected.emit('nearby-search');
      });

      routesBtn?.addEventListener('click', () => {
        // Emit event for routes view
        console.log('View routes clicked');
      });
    });

    return popup;
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
    const car = this.cars.find((c) => c.carId === carId);
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
   * Clear all markers and related resources
   */
  private clearMarkers(): void {
    // Clear hover timeouts
    this.hoverTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.hoverTimeouts.clear();

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

      console.log(
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

      // Add outline layer (casing) - THICK 3D styling to occupy street
      if (!this.map.getLayer(this.routeOutlineLayerId)) {
        this.map.addLayer({
          id: this.routeOutlineLayerId,
          type: 'line',
          source: this.routeSourceId,
          paint: {
            'line-color': '#ffffff',
            'line-width': 20, // THICK outline to occupy whole street
            'line-opacity': 0.8, // High visibility for 3D effect
          },
          layout: {
            'line-cap': 'round', // Rounded ends for smooth appearance
            'line-join': 'round', // Rounded corners for smooth turns
          },
        });
      }

      // Add main route layer - THICK 3D styling to occupy street
      const routeColor = '#805ad5'; // AutoRenta brand color
      if (!this.map.getLayer(this.routeLayerId)) {
        this.map.addLayer({
          id: this.routeLayerId,
          type: 'line',
          source: this.routeSourceId,
          paint: {
            'line-color': routeColor,
            'line-width': 16, // THICK main line to occupy whole street
            'line-opacity': 0.9, // High visibility for 3D effect
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
        pitch: 60, // Maintain 3D perspective while showing route
      });

      console.log('[CarsMap] Directions route added:', {
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

    // Clear component pools
    this.clearComponentPools();
  }

  /**
   * Public method to fly to car location
   */
  flyToCarLocation(carId: string): void {
    const car = this.cars.find((c) => c.carId === carId);
    if (car && this.map && car.lat && car.lng) {
      this.map.flyTo({
        center: [car.lng, car.lat],
        zoom: 14,
        duration: 1000,
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

  /**
   * Handle booking confirmed
   */
  onBookingConfirmed(bookingData: BookingFormData): void {
    const carId = this.selectedCarForBooking()?.carId;
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
    if (changes['cars'] && !changes['cars'].firstChange && this.map) {
      // Update spatial index first, then markers
      this.updateSpatialIndex();
      this.scheduleDebouncedUpdate(() => this.updateMarkersBasedOnCount());
    }
    if (changes['selectedCarId'] && !changes['selectedCarId'].firstChange && this.map) {
      const previousId = changes['selectedCarId'].previousValue;
      const currentId = changes['selectedCarId'].currentValue;

      // Remove highlight from previous
      if (previousId) {
        this.removeHighlightFromCar(previousId);
      }

      // Highlight current
      if (currentId) {
        this.highlightSelectedCar(currentId);
        const car = this.cars.find((c) => c.carId === currentId);
        if (car) {
          this.selectedCar.set(car);
        }
      } else {
        this.selectedCar.set(null);
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
  onLayerToggle(event: { layerId: string; visible: boolean }): void {
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
