import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
  effect,
  inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  CarLocationsService,
  type CarMapLocation,
} from '../../../core/services/car-locations.service';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import { environment } from '../../../../environments/environment';

// Dynamic import types for Mapbox GL
interface MapboxGL {
  accessToken: string | null | undefined;
  Map: new (options: MapboxMapOptions) => MapboxMap;
  Marker: new (options?: MarkerOptions | HTMLElement) => Marker;
  Popup: new (options?: PopupOptions) => Popup;
  LngLatBounds: new () => LngLatBounds;
}

interface LngLatBounds {
  extend(lngLat: LngLatLike): LngLatBounds;
}

interface MapboxMapOptions {
  container: HTMLElement | string;
  style: string;
  center: LngLatLike;
  zoom: number;
  cooperativeGestures?: boolean;
  trackResize?: boolean;
  maxBounds?: [[number, number], [number, number]];
  attributionControl?: boolean;
  minZoom?: number;
  maxZoom?: number;
  renderWorldCopies?: boolean;
  preserveDrawingBuffer?: boolean;
  refreshExpiredTiles?: boolean;
  fadeDuration?: number;
}

interface MapboxMap {
  on(event: string, callback: (e: MapEvent) => void): void;
  on(event: string, layerId: string, callback: (e: MapEvent) => void): void;
  off(event: string, callback: (e: MapEvent) => void): void;
  getCanvas(): HTMLCanvasElement;
  resize(): void;
  remove(): void;
  flyTo(options: FlyToOptions): void;
  fitBounds(bounds: LngLatBounds, options?: FitBoundsOptions): void;
  addSource(id: string, source: GeoJSONSource): void;
  getSource(id: string): MapSource;
  addLayer(layer: MapLayer): void;
  removeLayer(id: string): void;
  getLayer(id: string): MapLayer | undefined;
  removeSource(id: string): void;
  setPaintProperty(layerId: string, property: string, value: unknown): void;
  setLayoutProperty(layerId: string, property: string, value: unknown): void;
  queryRenderedFeatures(point: Point, options?: QueryOptions): MapFeature[];
  getZoom(): number;
}

interface FitBoundsOptions {
  padding?: number | { top: number; bottom: number; left: number; right: number };
  duration?: number;
  maxZoom?: number;
  minZoom?: number;
}

interface MapSource {
  setData(data: GeoJSONFeatureCollection): void;
  getClusterExpansionZoom(
    clusterId: number,
    callback: (err: Error | null, zoom: number) => void,
  ): void;
}

interface MapEvent {
  type: string;
  point: Point;
  lngLat: LngLat;
  features?: MapFeature[];
}

interface Point {
  x: number;
  y: number;
}

interface LngLat {
  lng: number;
  lat: number;
}

interface Marker {
  setLngLat(lngLat: LngLatLike): Marker;
  addTo(map: MapboxMap): Marker;
  remove(): void;
}

interface Popup {
  setLngLat(lngLat: LngLatLike): Popup;
  setHTML(html: string): Popup;
  addTo(map: MapboxMap): Popup;
  isOpen(): boolean;
  remove(): void;
  on(event: string, callback: () => void): void;
}

interface MapFeature {
  type: string;
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: MapFeature[];
}

interface GeoJSONSource {
  type: 'geojson';
  data: GeoJSONFeatureCollection;
  cluster?: boolean;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterProperties?: Record<string, unknown>;
}

interface MapLayer {
  id: string;
  type: string;
  source: string;
  filter?: unknown[];
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

interface FlyToOptions {
  center: LngLatLike;
  zoom?: number;
  speed?: number;
  curve?: number;
  duration?: number;
  essential?: boolean;
}

interface QueryOptions {
  layers: string[];
}

interface MarkerOptions {
  element?: HTMLElement;
  color?: string;
}

interface PopupOptions {
  closeButton?: boolean;
  closeOnClick?: boolean;
  maxWidth?: string;
  offset?: number;
}

type LngLatLike = [number, number];

@Component({
  standalone: true,
  selector: 'app-cars-map',
  imports: [CommonModule, TranslateModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Output() carSelected = new EventEmitter<string>();
  @Output() userLocationChange = new EventEmitter<{ lat: number; lng: number }>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly carLocationsService = inject(CarLocationsService);
  private readonly pricingService = inject(DynamicPricingService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly carCount = signal(0);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);

  private map: MapboxMap | null = null;
  private userMarker: Marker | null = null;
  private realtimeUnsubscribe: (() => void) | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private mapboxgl: MapboxGL | null = null;
  private geolocationWatchId: number | null = null;
  private currentLocations: CarMapLocation[] = []; // Para tracking de locations
  private selectedPopup: Popup | null = null; // Popup actual abierto
  private resizeObserver: ResizeObserver | null = null; // Observer para cambios de tamaño
  private themeChangeListener: ((event: CustomEvent<{ dark: boolean }>) => void) | null = null;

  // Performance optimizations
  private moveEndDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastLocationUpdate: { lat: number; lng: number; timestamp: number } | null = null;
  private readonly MIN_LOCATION_CHANGE_THRESHOLD = 0.0001; // ~10 metros
  private readonly MIN_LOCATION_TIME_THRESHOLD = 5000; // 5 segundos
  private pricingCache: Map<
    string,
    { price: number; pricePerHour: number | null; timestamp: number; surgeActive: boolean }
  > = new Map();
  private readonly PRICING_CACHE_TTL = 30000; // 30 segundos
  private cachedSortedLocations: CarMapLocation[] | null = null;
  private lastSortLocation: { lat: number; lng: number } | null = null;
  private layersCreated = false; // Track if layers have been created

  constructor() {
    // Efecto para limpiar recursos cuando el componente se destruye
    effect(() => {
      return () => {
        this.cleanup();
      };
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en cars y actualizar marcadores
    if (changes['cars'] && this.map) {
      const currentCars = changes['cars'].currentValue as CarMapLocation[];
      if (currentCars && currentCars.length > 0) {
        console.log('[CarsMapComponent] Cars changed, updating markers:', currentCars.length);
        void this.updateMarkersWithDynamicPricing(currentCars);
      }
    }

    // Detectar cambios en selectedCarId y mover el mapa
    if (changes['selectedCarId'] && !changes['selectedCarId'].firstChange) {
      const carId = changes['selectedCarId'].currentValue;
      if (carId) {
        this.flyToCarLocation(carId);
      }
    }

    // Optimized: Single resize call - trackResize: true and ResizeObserver handle most cases
    if (this.map) {
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          console.log('[CarsMapComponent] Map resized on change');
        }
      }, 200);
    }
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Cargar Mapbox GL JS dinámicamente
    void this.loadMapboxLibrary();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Esperar a que la librería esté cargada
    const checkInterval = setInterval(() => {
      if (this.mapboxgl) {
        clearInterval(checkInterval);
        void this.initializeMap();
        // Resize is now handled by trackResize: true and ResizeObserver
      }
    }, 100);

    // Timeout de seguridad
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.map) {
        this.error.set('No se pudo cargar el mapa. Por favor, recarga la página.');
        this.loading.set(false);
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async loadMapboxLibrary(): Promise<void> {
    try {
      // Importar dinámicamente MapLibre GL JS (ESM replacement for Mapbox GL)
      const maplibreModule = await import('maplibre-gl');
      this.mapboxgl = (maplibreModule.default || maplibreModule) as unknown as MapboxGL;

      if (!this.mapboxgl) {
        throw new Error('MapLibre GL JS no se cargó correctamente');
      }

      // MapLibre doesn't require access token for open styles
      // but we can still use Mapbox styles with token if needed
      if (environment.mapboxAccessToken && this.mapboxgl) {
        this.mapboxgl.accessToken = environment.mapboxAccessToken;
      }
    } catch (err) {
      console.error('[CarsMapComponent] Error loading MapLibre GL', err);
      this.error.set('Error al cargar la biblioteca de mapas');
      this.loading.set(false);
    }
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapboxgl || !this.mapContainer) {
      return;
    }

    try {
      // CRITICAL: Esperar a que el contenedor tenga dimensiones reales
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar que el contenedor tenga altura
      const containerEl = this.mapContainer.nativeElement;
      const containerHeight = containerEl.offsetHeight;
      const containerWidth = containerEl.offsetWidth;
      const parentEl = containerEl.parentElement;

      console.log('[CarsMapComponent] Container dimensions:', {
        width: containerWidth,
        height: containerHeight
      });

      if (containerHeight === 0) {
        console.error(
          '[CarsMapComponent] ⚠️ ERROR: Container height is 0!',
          '\nThis indicates a layout problem in the parent component.',
          '\nThe parent container must have explicit height (%, vh, or px).',
          '\nCheck that the parent uses: height: 100% or min-height: XXXpx'
        );
        this.error.set('Error de layout: El contenedor del mapa no tiene altura. Verifica el CSS del componente padre.');
        this.loading.set(false);
        return;
      }

      // Crear mapa centrado en Uruguay por defecto
      const defaultCenter: [number, number] = [-56.0, -32.5]; // Centro de Uruguay
      const defaultZoom = 11; // Aumentado de 6.5 a 11 - sensación de proximidad

      // Límites de Uruguay para evitar mostrar océano innecesario
      const uruguayBounds: [[number, number], [number, number]] = [
        [-58.5, -35.0], // Southwest
        [-53.0, -30.0], // Northeast
      ];

      this.map = new this.mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        // MapLibre GL compatible style - OSM Bright with full street labels
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: defaultCenter,
        zoom: defaultZoom,
        maxBounds: uruguayBounds,
        attributionControl: true,
        cooperativeGestures: false,
        minZoom: 10, // Aumentado de 8 a 10 - siempre cerca
        maxZoom: 17, // Aumentado de 16 a 17 - permite más acercamiento
        // Performance optimizations for faster tile loading
        renderWorldCopies: false, // Don't render multiple world copies (improves performance)
        trackResize: true, // Automatically resize when container changes
        preserveDrawingBuffer: false, // Better performance, disable if screenshots needed
        refreshExpiredTiles: false, // Don't auto-refresh expired tiles (reduces network)
        fadeDuration: 150, // Faster tile fade-in (default: 300ms)
      });

      // CRITICAL: Forzar resize inmediatamente después de crear el mapa
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          console.log('[CarsMapComponent] Initial map resize');
        }
      }, 0);

      // Esperar a que el mapa cargue
      this.map.on('load', () => {
        // CLEANUP: Ocultar capas innecesarias para un mapa más limpio
        this.cleanupMapLayers();

        // Optimized: Reduced resize calls - trackResize: true handles most cases
        // Only resize once after a short delay to ensure container has final dimensions
        setTimeout(() => {
          if (this.map) {
            this.map.resize();
            console.log('[CarsMapComponent] Initial map resize complete');
          }
        }, 300);

        // Setup ResizeObserver para detectar cambios de tamaño del contenedor
        this.setupResizeObserver();

        void this.loadCarLocations();
        this.setupRealtimeUpdates();
        this.setupPeriodicRefresh();
        this.requestUserLocation();
      });

      // Actualizar precios cuando el usuario mueve el mapa (con debounce)
      this.map.on('moveend', () => {
        // Cancelar timeout anterior
        if (this.moveEndDebounceTimeout) {
          clearTimeout(this.moveEndDebounceTimeout);
        }

        // Ejecutar solo después de 500ms de inactividad
        this.moveEndDebounceTimeout = setTimeout(() => {
          console.log('[CarsMapComponent] Map stable, refreshing prices...');
          void this.loadCarLocations(true);
        }, 500);
      });

      // Manejo de errores
      this.map.on('error', (e: MapEvent) => {
        console.error('[CarsMapComponent] Map error', e);
      });
    } catch (err) {
      console.error('[CarsMapComponent] Error initializing map', err);
      this.error.set('Error al inicializar el mapa');
      this.loading.set(false);
    }
  }

  private cleanupMapLayers(): void {
    if (!this.map) return;

    // Lista de capas a ocultar para un mapa más limpio
    const layersToHide = [
      // POI (puntos de interés) - restaurantes, tiendas, etc.
      'poi-label',

      // Labels de lugares innecesarios
      'settlement-subdivision-label',
      'airport-label',
      'transit-label',

      // Símbolos de tránsito
      'ferry-aerialway-label',
      'waterway-label',

      // Edificios 3D y detalles
      'building',
      'building-outline',

      // Labels de carreteras menores
      'road-label-simple',

      // Natural labels (montañas, parques pequeños, etc.)
      'natural-point-label',
      'natural-line-label',

      // Símbolos de estado
      'state-label',
    ];

    layersToHide.forEach((layerId) => {
      if (this.map?.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', 'none');
      }
    });

    console.log('[CarsMapComponent] Map layers cleaned up - minimalist mode enabled');
  }

  private setupResizeObserver(): void {
    if (!this.mapContainer || !isPlatformBrowser(this.platformId)) {
      return;
    }

    // Crear ResizeObserver para detectar cambios de tamaño del contenedor
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.mapContainer.nativeElement && this.map) {
          console.log('[CarsMapComponent] Container resized, updating map...');
          // Usar requestAnimationFrame para asegurar que el resize se ejecute después del repaint
          requestAnimationFrame(() => {
            if (this.map) {
              this.map.resize();
            }
          });
        }
      }
    });

    // Observar el contenedor del mapa
    this.resizeObserver.observe(this.mapContainer.nativeElement);
    console.log('[CarsMapComponent] ResizeObserver setup complete');
  }

  private async loadCarLocations(force = false): Promise<void> {
    try {
      // Priorizar el input cars si está disponible, sino fetch del servicio
      let locations: CarMapLocation[];

      if (this.cars && this.cars.length > 0) {
        console.log('[CarsMapComponent] Using cars from input:', this.cars.length);
        locations = this.cars;
      } else {
        console.log('[CarsMapComponent] Fetching locations from service');
        locations = await this.carLocationsService.fetchActiveLocations(force);
      }

      // Ordenar por distancia si tenemos ubicación del usuario
      // NO filtramos por distancia para mostrar TODOS los autos disponibles en Uruguay
      const userLoc = this.userLocation();
      if (userLoc) {
        locations = this.sortLocationsByDistance(locations, userLoc);
        console.log('[CarsMapComponent] Locations sorted by distance from user');
        console.log(`[CarsMapComponent] Showing all ${locations.length} active cars on map`);
      }

      // Update markers with dynamic pricing
      await this.updateMarkersWithDynamicPricing(locations);

      this.carCount.set(locations.length);
      this.loading.set(false);
      this.error.set(null);

      // Ajustar vista del mapa a los marcadores (solo si no tenemos ubicación de usuario)
      if (locations.length > 0 && this.map && !userLoc) {
        this.fitMapToBounds(locations);
      }
    } catch (err) {
      console.error('[CarsMapComponent] Error loading locations', err);
      this.error.set('Error al cargar las ubicaciones de los autos');
      this.loading.set(false);
    }
  }

  private sortLocationsByDistance(
    locations: CarMapLocation[],
    userLoc: { lat: number; lng: number },
  ): CarMapLocation[] {
    return [...locations].sort((a, b) => {
      const distA = this.calculateDistance(userLoc.lat, userLoc.lng, a.lat, a.lng);
      const distB = this.calculateDistance(userLoc.lat, userLoc.lng, b.lat, b.lng);
      return distA - distB;
    });
  }

  /**
   * Update markers with dynamic pricing from pricing service
   * Fetches batch prices and updates location data before rendering
   * OPTIMIZED: Uses cache to reduce API calls
   */
  private async updateMarkersWithDynamicPricing(locations: CarMapLocation[]): Promise<void> {
    // Filter locations that have regionId
    const carsWithRegion = locations
      .filter((loc) => loc.regionId)
      .map((loc) => ({ id: loc.carId, region_id: loc.regionId! }));

    // If no cars have regionId, use static pricing
    if (carsWithRegion.length === 0) {
      console.log('[CarsMapComponent] No cars with region_id, using static pricing');
      this.updateMarkers(locations);
      return;
    }

    try {
      const now = Date.now();
      const prices = new Map<
        string,
        {
          price_per_day: number;
          price_per_hour: number;
          surge_active: boolean;
          currency: string;
          price_usd_hour?: number;
        }
      >();
      const carsNeedingFetch: Array<{ id: string; region_id: string }> = [];

      // OPTIMIZACIÓN: Verificar caché primero
      for (const car of carsWithRegion) {
        const cached = this.pricingCache.get(car.id);

        // Si hay caché válido (no expirado), usarlo
        if (cached && now - cached.timestamp < this.PRICING_CACHE_TTL) {
          prices.set(car.id, {
            price_per_day: cached.price,
            price_per_hour: cached.pricePerHour ?? 0,
            surge_active: cached.surgeActive,
            currency: 'ARS',
          });
        } else {
          // Necesita fetch
          carsNeedingFetch.push(car);
        }
      }

      // Si hay autos que necesitan fetch, hacerlo
      if (carsNeedingFetch.length > 0) {
        console.log(
          `[CarsMapComponent] Fetching prices for ${carsNeedingFetch.length} cars (${prices.size} from cache)`,
        );

        const fetchedPrices = await this.pricingService.getBatchPrices(carsNeedingFetch);

        // Actualizar caché y agregar a prices map
        fetchedPrices.forEach((price, carId) => {
          // Guardar en caché
          this.pricingCache.set(carId, {
            price: price.price_per_day,
            pricePerHour: price.price_per_hour,
            timestamp: now,
            surgeActive: price.surge_active,
          });

          // Agregar a prices para uso inmediato
          prices.set(carId, price);
        });
      } else {
        console.log(`[CarsMapComponent] Using cached prices for all ${prices.size} cars`);
      }

      // Update locations with dynamic pricing data (cached + fetched)
      const updatedLocations = locations.map((loc) => {
        const dynamicPrice = prices.get(loc.carId);
        if (dynamicPrice) {
          return {
            ...loc,
            pricePerDay: dynamicPrice.price_per_day,
            pricePerHour: dynamicPrice.price_per_hour,
            surgeActive: dynamicPrice.surge_active,
          };
        }
        return loc;
      });

      // Render markers with updated pricing
      this.updateMarkers(updatedLocations);
    } catch (error) {
      console.error('[CarsMapComponent] Error fetching dynamic prices:', error);
      // Fallback to static pricing on error
      this.updateMarkers(locations);
    }
  }

  private updateMarkers(locations: CarMapLocation[]): void {
    if (!this.map || !this.mapboxgl) {
      return;
    }

    // Guardar locations para uso posterior
    this.currentLocations = locations;

    // Crear GeoJSON source con los datos de los autos
    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: locations.map((loc) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.lng, loc.lat],
        },
        properties: {
          carId: loc.carId,
          price: Math.round(loc.pricePerDay),
          pricePerHour: loc.pricePerHour ? Math.round(loc.pricePerHour) : null,
          surgeActive: loc.surgeActive || false,
          title: loc.title,
          currency: loc.currency,
          photoUrl: loc.photoUrl || '',
          locationLabel: loc.locationLabel,
          formattedAddress: loc.formattedAddress || '',
          description: loc.description || '',
        },
      })),
    };

    // OPTIMIZACIÓN: Si layers ya están creados, solo actualizar data
    if (this.layersCreated && this.map.getSource('cars')) {
      console.log('[CarsMapComponent] Updating existing source data (no layer recreation)');
      (this.map.getSource('cars') as MapSource).setData(geojsonData);
      return; // No recrear layers
    }

    // Primera vez: Crear source y layers
    console.log('[CarsMapComponent] Creating source and layers for first time');

    // Remover layers existentes si existen (solo en caso de reinicialización)
    this.removeCarLayers();

    // Agregar source
    if (this.map.getSource('cars')) {
      (this.map.getSource('cars') as MapSource).setData(geojsonData);
    } else {
      this.map.addSource('cars', {
        type: 'geojson',
        data: geojsonData,
        cluster: true, // Habilitar clustering nativo de Mapbox
        clusterMaxZoom: 13, // Optimized: Cluster until zoom 13 (was 14) - reduces marker count
        clusterRadius: 60, // Optimized: Larger radius (was 50) - fewer clusters, better mobile performance
        clusterProperties: {
          // Optional: Pre-calculate cluster properties for faster rendering
          minPrice: ['min', ['get', 'price']],
        },
      });
    }

    // Layer 1: Círculos para clusters - Autorentar theme
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cars',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#2c4a52', // accent-petrol
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 30, 30],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#8B7355', // accent-warm
      },
    });

    // Layer 2: Texto de conteo para clusters
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'cars',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Layer 3: Círculos de fondo para autos individuales (Autorentar style)
    this.map.addLayer({
      id: 'car-markers-bg',
      type: 'circle',
      source: 'cars',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#ffffff',
        'circle-radius': 22,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(44, 74, 82, 0.3)',
        'circle-opacity': 0.96,
        'circle-blur': 0.15,
      },
    });

    // Layer 4: Texto de precio para autos individuales (muestra precio por hora si está disponible)
    this.map.addLayer({
      id: 'car-prices',
      type: 'symbol',
      source: 'cars',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': [
          'case',
          ['!=', ['get', 'pricePerHour'], null],
          ['concat', '$', ['get', 'pricePerHour'], '/h'],
          ['concat', '$', ['get', 'price']],
        ],
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1f2d35',
        'text-halo-color': 'rgba(255, 255, 255, 0.92)',
        'text-halo-width': 1.2,
        'text-halo-blur': 0.6,
      },
    });

    // Agregar interactividad
    this.setupLayerInteractions();

    // Marcar layers como creados (optimization flag)
    this.layersCreated = true;
    console.log('[CarsMapComponent] Layers created and marked as initialized');

    if (isPlatformBrowser(this.platformId)) {
      const isDark = document.documentElement.classList.contains('dark');
      this.applyThemeToMap(isDark);
    }
  }

  /**
   * Configura eventos de click y hover para los layers
   */
  private setupLayerInteractions(): void {
    if (!this.map) return;

    // Cambiar cursor al pasar sobre autos o clusters
    this.map.on('mouseenter', 'car-markers-bg', () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'car-markers-bg', () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });

    this.map.on('mouseenter', 'clusters', () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'clusters', () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });

    // Click en auto individual
    this.map.on('click', 'car-markers-bg', (e: MapEvent) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const carId = feature.properties.carId;
      const coords = feature.geometry.coordinates as [number, number];

      // Emitir evento de selección para que el componente padre maneje la interacción
      this.carSelected.emit(carId as string);

      // Hacer zoom suave al auto (opcional pero mejora la UX)
      this.map?.flyTo({
        center: coords,
        zoom: Math.max(this.map.getZoom(), 14), // Aumentado de 13 a 14 - muy cerca del marcador
        speed: 1.2,
        curve: 1,
      });

      // NO mostrar popup aquí - el popup solo aparece cuando se selecciona desde el card
      // El comportamiento de selección + scroll al card se maneja en cars-list.page.ts
    });

    // Click en cluster - hacer zoom
    this.map.on('click', 'clusters', (e: MapEvent) => {
      if (!this.map || !e.features || e.features.length === 0) return;

      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });

      if (features.length === 0) return;

      const clusterId = features[0].properties.cluster_id as number;
      const source = this.map.getSource('cars') as MapSource;

      source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
        if (err || !this.map) return;

        this.map.flyTo({
          center: features[0].geometry.coordinates as [number, number],
          zoom: zoom,
          speed: 1.2,
        });
      });
    });
  }

  /**
   * Remueve los layers de autos del mapa
   */
  private removeCarLayers(): void {
    if (!this.map) return;

    const layers = ['car-prices', 'car-markers-bg', 'cluster-count', 'clusters'];

    layers.forEach((layerId) => {
      if (this.map?.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });
  }

  /**
   * Muestra un popup para un auto específico
   */
  private showCarPopup(feature: MapFeature): void {
    if (!this.map || !this.mapboxgl) return;

    // Cerrar popup anterior si existe
    if (this.selectedPopup) {
      this.selectedPopup.remove();
      this.selectedPopup = null;
    }

    const props = feature.properties;
    const coords = feature.geometry.coordinates as [number, number];

    // Crear HTML del popup usando el mismo método existente
    const location: CarMapLocation = {
      carId: props.carId as string,
      title: props.title as string,
      pricePerDay: props.price as number,
      currency: props.currency as string,
      photoUrl: props.photoUrl as string,
      locationLabel: props.locationLabel as string,
      formattedAddress: props.formattedAddress as string,
      description: props.description as string,
      lat: coords[1],
      lng: coords[0],
      updatedAt: new Date().toISOString(),
    };

    const popupHTML = this.createPopupHTML(location);

    // Crear y mostrar popup
    this.selectedPopup = new this.mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '320px',
    })
      .setLngLat(coords)
      .setHTML(popupHTML)
      .addTo(this.map);

    // Limpiar referencia cuando se cierra
    this.selectedPopup.on('close', () => {
      this.selectedPopup = null;
    });
  }

  private createPopupHTML(location: CarMapLocation): string {
    const priceFormatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: location.currency,
      minimumFractionDigits: 0,
    }).format(location.pricePerDay);

    const photoHTML = location.photoUrl
      ? `<img src="${location.photoUrl}" alt="${location.title}" class="popup-image" />`
      : '<div class="popup-no-image">Sin foto</div>';

    // Calcular distancia para el popup
    const userLoc = this.userLocation();
    let distanceHTML = '';
    if (userLoc) {
      const distanceKm = this.calculateDistance(
        userLoc.lat,
        userLoc.lng,
        location.lat,
        location.lng,
      );
      let distanceText = '';
      if (distanceKm < 1) {
        distanceText = `${Math.round(distanceKm * 10) * 100}m de tu ubicación`;
      } else if (distanceKm < 10) {
        distanceText = `${distanceKm.toFixed(1)}km de tu ubicación`;
      } else {
        distanceText = `${Math.round(distanceKm)}km de tu ubicación`;
      }
      distanceHTML = `<p class="popup-distance">📍 ${distanceText}</p>`;
    }

    // Usar dirección formateada si está disponible, sino usar locationLabel
    const locationText = location.formattedAddress || location.locationLabel;

    return `
      <div class="car-popup">
        ${photoHTML}
        <div class="popup-content">
          <h3 class="popup-title">${this.escapeHtml(location.title)}</h3>
          <p class="popup-location">📍 ${this.escapeHtml(locationText)}</p>
          ${distanceHTML}
          ${location.description ? `<p class="popup-description">${this.escapeHtml(location.description)}</p>` : ''}
          <div class="popup-footer">
            <span class="popup-price">${priceFormatted}/día</span>
            <a href="/cars/${location.carId}" class="popup-link">Ver detalles</a>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private fitMapToBounds(locations: CarMapLocation[]): void {
    if (!this.map || !this.mapboxgl || locations.length === 0) {
      return;
    }

    if (locations.length === 1) {
      // Si solo hay un auto, centrar en él con zoom cercano
      this.map.flyTo({
        center: [locations[0].lng, locations[0].lat],
        zoom: 14, // Aumentado de 12 a 14 - muy cerca
      });
      return;
    }

    // Calcular bounds para múltiples ubicaciones
    const bounds = new this.mapboxgl.LngLatBounds();
    locations.forEach((location) => {
      bounds.extend([location.lng, location.lat] as LngLatLike);
    });

    this.map.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 }, // Más padding para zoom más cercano
      maxZoom: 14, // Aumentado de 12 a 14 - sensación de proximidad
      minZoom: 12, // Mínimo zoom 12 para mantener cercanía
    });
  }

  private clearMarkers(): void {
    // Ya no usamos HTML markers, los layers se actualizan automáticamente
    // Este método se mantiene para compatibilidad con el user marker
    if (this.selectedPopup) {
      this.selectedPopup.remove();
      this.selectedPopup = null;
    }
  }

  private setupRealtimeUpdates(): void {
    this.realtimeUnsubscribe = this.carLocationsService.subscribeToRealtime(() => {
      console.log('[CarsMapComponent] Realtime update received');
      void this.loadCarLocations(true);
    });
  }

  private setupPeriodicRefresh(): void {
    const intervalMs = this.carLocationsService.getRefreshInterval();
    this.refreshInterval = setInterval(() => {
      console.log('[CarsMapComponent] Periodic refresh');
      void this.loadCarLocations(false);
    }, intervalMs);
  }

  private requestUserLocation(): void {
    if (!navigator.geolocation) {
      console.log('[CarsMapComponent] Geolocation not supported');
      return;
    }

    console.log('[CarsMapComponent] Starting continuous high-accuracy location tracking...');

    // Usar watchPosition para obtener actualizaciones continuas
    this.geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('[CarsMapComponent] Location update:', {
          lat: latitude,
          lng: longitude,
          accuracy: `${Math.round(accuracy)}m`,
          timestamp: new Date(position.timestamp).toLocaleTimeString(),
        });

        // Solo actualizar si la precisión es razonable (< 100m)
        if (accuracy > 100) {
          console.warn('[CarsMapComponent] Low accuracy, waiting for better signal...', accuracy);
          return;
        }

        // OPTIMIZACIÓN: Rate limiting de GPS updates
        // Solo actualizar si el cambio es significativo o ha pasado suficiente tiempo
        if (this.lastLocationUpdate) {
          const latDiff = Math.abs(latitude - this.lastLocationUpdate.lat);
          const lngDiff = Math.abs(longitude - this.lastLocationUpdate.lng);
          const timeDiff = Date.now() - this.lastLocationUpdate.timestamp;

          // Ignorar updates menores a ~10 metros o dentro de 5 segundos
          if (
            latDiff < this.MIN_LOCATION_CHANGE_THRESHOLD &&
            lngDiff < this.MIN_LOCATION_CHANGE_THRESHOLD &&
            timeDiff < this.MIN_LOCATION_TIME_THRESHOLD
          ) {
            console.log('[CarsMapComponent] GPS update ignored (too small or too soon):', {
              latDiff,
              lngDiff,
              timeDiff: `${timeDiff}ms`,
            });
            return;
          }
        }

        // Actualizar timestamp de última ubicación
        this.lastLocationUpdate = { lat: latitude, lng: longitude, timestamp: Date.now() };
        console.log('[CarsMapComponent] GPS update accepted, reloading locations...');

        // Validar que la ubicación esté dentro de Uruguay
        const isInUruguay = this.isLocationInUruguay(latitude, longitude);
        if (!isInUruguay) {
          console.warn('[CarsMapComponent] Location outside Uruguay bounds:', {
            latitude,
            longitude,
          });
          // Usar Montevideo como fallback
          this.userLocation.set({ lat: -34.9011, lng: -56.1645 });
          this.addUserMarker(-34.9011, -56.1645);
          this.zoomToUserLocation(-34.9011, -56.1645);
        } else {
          const newLocation = { lat: latitude, lng: longitude };
          this.userLocation.set(newLocation);
          this.addUserMarker(latitude, longitude);

          // Emitir cambio de ubicación al componente padre
          console.log('[CarsMapComponent] Emitting userLocationChange:', newLocation);
          this.userLocationChange.emit(newLocation);

          // Solo hacer zoom la primera vez
          const isFirstUpdate = this.currentLocations.length === 0 || !this.userLocation();
          if (isFirstUpdate) {
            this.zoomToUserLocation(latitude, longitude);
          }
        }

        // Recargar marcadores con distancias
        void this.loadCarLocations(true);
      },
      (error) => {
        console.error('[CarsMapComponent] Geolocation error:', {
          code: error.code,
          message: error.message,
          details: this.getGeolocationErrorMessage(error.code),
        });

        // Usar Montevideo como ubicación predeterminada
        console.log('[CarsMapComponent] Using Montevideo as fallback location');
        this.userLocation.set({ lat: -34.9011, lng: -56.1645 });
        this.addUserMarker(-34.9011, -56.1645);
        this.zoomToUserLocation(-34.9011, -56.1645);
        void this.loadCarLocations(true);
      },
      {
        enableHighAccuracy: true, // CRÍTICO: Máxima precisión GPS
        timeout: 15000, // 15 segundos timeout
        maximumAge: 0, // Sin cache, ubicación en tiempo real
      },
    );
  }

  private getGeolocationErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Permiso denegado por el usuario';
      case 2:
        return 'Posición no disponible (sin señal GPS)';
      case 3:
        return 'Timeout - tardó demasiado';
      default:
        return 'Error desconocido';
    }
  }

  private isLocationInUruguay(lat: number, lng: number): boolean {
    // Bounds de Uruguay
    const minLat = -35.0;
    const maxLat = -30.0;
    const minLng = -58.5;
    const maxLng = -53.0;

    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  private zoomToUserLocation(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    console.log('[CarsMapComponent] Zooming to user location');

    // Hacer zoom suave a la ubicación del usuario
    this.map.flyTo({
      center: [lng, lat],
      zoom: 13, // Aumentado de 11 a 13 - marcadores se ven muy cerca
      duration: 2000, // 2 segundos de animación
      essential: true,
    });
  }

  private addUserMarker(lat: number, lng: number): void {
    if (!this.map || !this.mapboxgl) {
      return;
    }

    // Remover marcador anterior si existe
    if (this.userMarker) {
      this.userMarker.remove();
    }

    // Crear elemento HTML para ubicación del usuario
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = `
      <div class="user-marker-pulse"></div>
      <div class="user-marker-dot"></div>
    `;

    // Crear marcador del usuario
    this.userMarker = new this.mapboxgl.Marker(el)
      .setLngLat([lng, lat] as LngLatLike)
      .addTo(this.map);
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @returns Distancia en kilómetros
   */
  private setupThemeListener(): void {
    if (!isPlatformBrowser(this.platformId) || this.themeChangeListener) {
      return;
    }

    this.themeChangeListener = (event: CustomEvent<{ dark: boolean }>) => {
      this.applyThemeToMap(
        event.detail?.dark ?? document.documentElement.classList.contains('dark'),
      );
    };

    window.addEventListener('autorenta:theme-change', this.themeChangeListener as EventListener);
  }

  private applyThemeToMap(isDark: boolean): void {
    if (!this.map) {
      return;
    }

    const markerBgColor = isDark ? '#1c2427' : '#ffffff';
    const markerStroke = isDark ? 'rgba(134, 186, 196, 0.35)' : 'rgba(44, 74, 82, 0.3)';
    const markerText = isDark ? '#f5f0e3' : '#1f2d35';
    const markerHalo = isDark ? 'rgba(12, 19, 23, 0.92)' : 'rgba(255, 255, 255, 0.92)';

    if (this.map.getLayer('car-markers-bg')) {
      this.map.setPaintProperty('car-markers-bg', 'circle-color', markerBgColor);
      this.map.setPaintProperty('car-markers-bg', 'circle-stroke-color', markerStroke);
    }

    if (this.map.getLayer('car-prices')) {
      this.map.setPaintProperty('car-prices', 'text-color', markerText);
      this.map.setPaintProperty('car-prices', 'text-halo-color', markerHalo);
      this.map.setPaintProperty('car-prices', 'text-halo-width', 1.2);
      this.map.setPaintProperty('car-prices', 'text-halo-blur', 0.6);
    }

    if (this.map.getLayer('clusters')) {
      this.map.setPaintProperty('clusters', 'circle-color', isDark ? '#20353b' : '#2c4a52');
      this.map.setPaintProperty(
        'clusters',
        'circle-stroke-color',
        isDark ? 'rgba(139, 115, 85, 0.55)' : '#8B7355',
      );
    }

    if (this.map.getLayer('cluster-count')) {
      this.map.setPaintProperty('cluster-count', 'text-color', isDark ? '#f6f0e6' : '#ffffff');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private cleanup(): void {
    // Limpiar popup seleccionado
    this.clearMarkers();

    // Limpiar layers de autos
    this.removeCarLayers();

    // Limpiar source de autos
    if (this.map && this.map.getSource('cars')) {
      this.map.removeSource('cars');
    }

    // Limpiar marcador de usuario
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }

    // Detener tracking de geolocalización
    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
      console.log('[CarsMapComponent] Geolocation tracking stopped');
    }

    // Limpiar ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
      console.log('[CarsMapComponent] ResizeObserver disconnected');
    }

    // Limpiar realtime
    if (this.realtimeUnsubscribe) {
      this.realtimeUnsubscribe();
      this.realtimeUnsubscribe = null;
    }

    // Limpiar interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.themeChangeListener) {
      window.removeEventListener(
        'autorenta:theme-change',
        this.themeChangeListener as EventListener,
      );
      this.themeChangeListener = null;
    }

    // Limpiar mapa
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  async refreshMap(): Promise<void> {
    this.loading.set(true);
    await this.loadCarLocations(true);
  }

  /**
   * Vuela a la ubicación de un auto específico (desplazamiento rápido)
   * Ya NO muestra popup - la información se ve en el card seleccionado del sidebar
   */
  flyToCarLocation(carId: string): void {
    if (!this.map) {
      return;
    }

    // Buscar el auto en currentLocations
    const location = this.currentLocations.find((loc) => loc.carId === carId);
    if (!location) {
      console.warn(`[CarsMapComponent] No location found for car ID: ${carId}`);
      return;
    }

    // Volar a la ubicación con animación rápida
    this.map.flyTo({
      center: [location.lng, location.lat],
      zoom: 15, // Aumentado de 14 a 15 - súper cerca del auto
      duration: 400, // 400ms = animación rápida y suave
      essential: true,
    });

    // Ya NO mostramos popup aquí - la información del auto se muestra en el card seleccionado del sidebar
    // Esto evita duplicación de información y mantiene la UX limpia

    console.log(`[CarsMapComponent] Flying to car ${carId} at [${location.lng}, ${location.lat}]`);
  }

  /**
   * Centra el mapa en la ubicación del usuario
   */
  centerOnUserLocation(): void {
    const userLoc = this.userLocation();

    if (userLoc && this.map) {
      this.zoomToUserLocation(userLoc.lat, userLoc.lng);
    } else if (!userLoc) {
      // Si no hay ubicación guardada, solicitar una nueva
      this.requestUserLocation();
    }
  }
}
