import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { CarMapLocation } from '../../../core/services/car-locations.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';
import { MapBookingPanelComponent } from '../map-booking-panel/map-booking-panel.component';
import { environment } from '../../../../environments/environment';
import { MapDetailsPanelComponent } from '../map-details-panel/map-details-panel.component';
import { MapMarkerComponent } from '../map-marker/map-marker.component';
import type { BookingFormData } from '../map-booking-panel/map-booking-panel.component';

type MapboxGL = typeof import('mapbox-gl').default;
type MapboxMap = import('mapbox-gl').Map;
type MapboxMarker = import('mapbox-gl').Marker;
type MapboxPopup = import('mapbox-gl').Popup;

@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [CommonModule, MapBookingPanelComponent, MapDetailsPanelComponent],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Input() userLocation: { lat: number; lng: number } | null = null;
  @Input() locationMode: 'searching' | 'booking-confirmed' | 'default' = 'default';
  @Input() searchRadiusKm: number = 5;
  @Input() showSearchRadius: boolean = true;
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

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly applicationRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly bookingPanelOpen = signal(false);
  readonly selectedCarForBooking = signal<CarMapLocation | null>(null);
  readonly selectedCar = signal<CarMapLocation | null>(null);

  // Expose map instance for external components
  get mapInstance(): MapboxMap | null {
    return this.map;
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
  private useClustering = true; // Enable clustering by default
  private clusterSourceId = 'cars-cluster-source';
  private clusterLayerId = 'cars-cluster-layer';
  private clusterCountLayerId = 'cars-cluster-count';

  // User location tracking
  private searchRadiusSourceId = 'search-radius-source';
  private searchRadiusLayerId = 'search-radius-layer';
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
   * Update map theme based on dark mode and marker variant
   * Synchronizes CSS tokens with prefers-color-scheme and markerVariant
   */
  private updateMapTheme(): void {
    if (!this.isBrowser) return;

    const isDark = this.isDarkMode();
    const variant = this.markerVariant;

    // Apply theme class to map container (already handled in template with [class] binding)
    // But we also need to update the map canvas filter if map is initialized
    if (this.map) {
      const canvas = this.map.getCanvas();
      if (canvas) {
        // Update canvas filter based on dark mode tokens
        const brightness = isDark ? '0.95' : '1';
        const contrast = isDark ? '1.1' : '1';
        const saturate = isDark ? '0.95' : '1';
        canvas.style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
      }
    }

    // Ensure container has correct classes (template binding handles this, but we verify)
    const container = this.mapContainer?.nativeElement?.parentElement;
    if (container) {
      // Remove old variant classes
      container.classList.remove('map-variant-photo', 'map-variant-price');
      // Add current variant class
      container.classList.add(`map-variant-${variant}`);

      // Apply dark mode class if needed
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

      if (!this.mapboxgl || !environment.mapboxAccessToken) {
        throw new Error('Mapbox GL or access token not available');
      }

      this.mapboxgl.accessToken = environment.mapboxAccessToken;

      // Initialize map with neutral light style
      this.map = new this.mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/light-v11', // Neutral light style
        center: [-58.3816, -34.6037], // Buenos Aires center
        zoom: 11,
        maxBounds: [
          [-58.8, -34.9], // Southwest
          [-57.9, -34.3], // Northeast
        ],
      });

      // Add navigation controls
      this.map.addControl(new this.mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load
      this.map.on('load', () => {
        this.loading.set(false);
        this.updateMapTheme(); // Apply theme on load
        if (this.useClustering && this.cars.length > 10) {
          this.setupClustering();
        } else {
          this.renderCarMarkers();
        }
        this.addUserLocationMarker();
        if (this.showSearchRadius) {
          this.addSearchRadiusLayer();
        }
        this.setupFollowLocation();
        this.setupLockControls();
      });

      // Handle map errors
      this.map.on('error', (e) => {
        console.error('[CarsMap] Map error:', e);
        this.error.set('Error al cargar el mapa');
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
   */
  private setupClustering(): void {
    if (!this.map || !this.mapboxgl) return;

    // Remove existing markers
    this.clearMarkers();

    // Create GeoJSON source from cars
    const features = this.cars.map((car) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [car.lng, car.lat],
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

    // Add source
    if (this.map.getSource(this.clusterSourceId)) {
      (this.map.getSource(this.clusterSourceId) as any).setData({
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
        clusterMaxZoom: 14,
        clusterRadius: 50,
        clusterProperties: {
          sum: ['+', ['get', 'pricePerDay']],
          count: ['+', 1],
        },
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
    this.map.on('click', this.clusterLayerId, (e) => {
      const features = this.map!.queryRenderedFeatures(e.point, {
        layers: [this.clusterLayerId],
      });
      const clusterId = features[0].properties?.cluster_id;
      const source = this.map!.getSource(this.clusterSourceId) as any;
      source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
        if (err) return;
        this.map!.easeTo({
          center: e.lngLat as any,
          zoom,
        });
      });
    });

    // Handle individual car clicks
    this.map.on('click', 'cars-unclustered', (e) => {
      const carId = (e.features?.[0]?.properties as any)?.carId;
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
   * Render car markers with custom tooltips
   */
  private renderCarMarkers(): void {
    if (!this.map || !this.mapboxgl) return;

    // Clear existing markers
    this.clearMarkers();

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
    const now = new Date();
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

    // Create Angular component for the marker
    const componentRef = createComponent(MapMarkerComponent, {
      environmentInjector: this.injector,
    });

    // Set inputs
    componentRef.setInput('car', car);
    componentRef.setInput('isSelected', this.selectedCarId === car.carId);

    // Attach component to application to enable change detection
    this.applicationRef.attachView(componentRef.hostView);
    const markerElement = componentRef.location.nativeElement;

    // Create marker
    const marker = new this.mapboxgl.Marker({
      element: markerElement,
      anchor: 'center',
    })
      .setLngLat([car.lng, car.lat])
      .addTo(this.map);

    // Create tooltip popup with delay
    const popup = this.createTooltipPopup(car);
    marker.setPopup(popup);

    // Handle hover with delay (150ms)
    markerElement.addEventListener('mouseenter', () => {
      const timeout = setTimeout(() => {
        if (marker.getPopup() && !marker.getPopup()!.isOpen()) {
          marker.togglePopup();
        }
      }, 150);
      this.hoverTimeouts.set(car.carId, timeout);
    });

    markerElement.addEventListener('mouseleave', () => {
      const timeout = this.hoverTimeouts.get(car.carId);
      if (timeout) {
        clearTimeout(timeout);
        this.hoverTimeouts.delete(car.carId);
      }
      const popup = marker.getPopup();
      if (popup && popup.isOpen()) {
        marker.togglePopup();
      }
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

    // Create Angular component using EnhancedMapTooltipComponent
    const componentRef = createComponent(EnhancedMapTooltipComponent, {
      environmentInjector: this.injector,
    });

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

    // Attach component to application
    this.applicationRef.attachView(componentRef.hostView);

    // Append the component's native element to the container
    container.appendChild(componentRef.location.nativeElement);

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
   * Add user location marker with custom styling and animations
   */
  private addUserLocationMarker(): void {
    if (!this.map || !this.mapboxgl || !this.userLocation) return;

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

    el.innerHTML = `
      <div class="user-marker-halo"></div>
      <div class="user-marker-circle"></div>
    `;

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

    if (this.map.getSource(this.searchRadiusSourceId)) {
      (this.map.getSource(this.searchRadiusSourceId) as any).setData(feature);
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

    // Fly to user location initially
    this.map.flyTo({
      center: [this.userLocation.lng, this.userLocation.lat],
      zoom: 14,
      duration: 1000,
    });

    // Update position periodically
    this.followLocationInterval = setInterval(() => {
      if (this.userLocation && this.map) {
        this.map.easeTo({
          center: [this.userLocation.lng, this.userLocation.lat],
          duration: 500,
        });
      }
    }, 2000); // Update every 2 seconds
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
   * Clear all markers
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

    // Remove markers and destroy their components
    this.carMarkers.forEach((markerData) => {
      markerData.marker.remove();
      this.applicationRef.detachView(markerData.componentRef.hostView);
      markerData.componentRef.destroy();
    });
    this.carMarkers.clear();
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
   * Cleanup on destroy
   */
  private cleanup(): void {
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
      if (this.useClustering && this.cars.length > 10) {
        this.setupClustering();
      } else {
        this.renderCarMarkers();
      }
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
        if (this.useClustering && this.cars.length > 10) {
          this.setupClustering();
        } else {
          this.renderCarMarkers();
        }
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
  }
}
