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
import { environment } from '../../../../environments/environment';

type MapboxGL = typeof import('mapbox-gl').default;
type MapboxMap = import('mapbox-gl').Map;
type MapboxMarker = import('mapbox-gl').Marker;
type MapboxPopup = import('mapbox-gl').Popup;

@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Input() userLocation: { lat: number; lng: number } | null = null;

  @Output() readonly carSelected = new EventEmitter<string>();
  @Output() readonly userLocationChange = new EventEmitter<{ lat: number; lng: number }>();
  @Output() readonly quickBook = new EventEmitter<string>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly applicationRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Expose map instance for external components
  get mapInstance(): MapboxMap | null {
    return this.map;
  }

  private mapboxgl: MapboxGL | null = null;
  private map: MapboxMap | null = null;
  private carMarkers = new Map<string, MapboxMarker>();
  private userLocationMarker: MapboxMarker | null = null;
  private tooltipPopups = new Map<string, MapboxPopup>();
  private tooltipComponents = new Map<string, ComponentRef<EnhancedMapTooltipComponent>>();
  private hoverTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private useClustering = true; // Enable clustering by default
  private clusterSourceId = 'cars-cluster-source';
  private clusterLayerId = 'cars-cluster-layer';
  private clusterCountLayerId = 'cars-cluster-count';

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.loading.set(false);
      return;
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
        if (this.useClustering && this.cars.length > 10) {
          this.setupClustering();
        } else {
          this.renderCarMarkers();
        }
        this.addUserLocationMarker();
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
            '#3A6D7C',
            10,
            '#4F7C72',
            30,
            '#5A8A7F',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            25,
            30,
            30,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
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
          'circle-color': '#3A6D7C',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
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
          center: (e.lngLat as any),
          zoom,
        });
      });
    });

    // Handle individual car clicks
    this.map.on('click', 'cars-unclustered', (e) => {
      const carId = (e.features?.[0]?.properties as any)?.carId;
      if (carId) {
        this.carSelected.emit(carId);
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
      const marker = this.createCarMarker(car);
      if (marker) {
        this.carMarkers.set(car.carId, marker);
      }
    });

    // Highlight selected car
    if (this.selectedCarId) {
      this.highlightSelectedCar(this.selectedCarId);
    }
  }

  /**
   * Group cars by availability (immediate vs scheduled)
   */
  private groupCarsByAvailability(): CarMapLocation[] {
    // For now, return cars as-is
    // TODO: Implement grouping logic based on availability
    return [...this.cars];
  }

  /**
   * Create a car marker with custom tooltip
   */
  private createCarMarker(car: CarMapLocation): MapboxMarker | null {
    if (!this.map || !this.mapboxgl) return null;

    // Create marker element
    const markerElement = this.createMarkerElement(car);

    // Create marker
    const marker = new this.mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom',
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
    });

    return marker;
  }

  /**
   * Create marker DOM element
   */
  private createMarkerElement(car: CarMapLocation): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'car-marker-simple';
    el.setAttribute('data-car-id', car.carId);
    el.setAttribute('data-title', car.title);
    el.style.cursor = 'pointer';

    // Marker content - simple circular marker with price
    el.innerHTML = `
      <div class="marker-circle">
        <div class="marker-price-simple">${this.formatPriceShort(car.pricePerDay, car.currency)}</div>
      </div>
    `;

    return el;
  }

  /**
   * Format price for marker (short version)
   */
  private formatPriceShort(price: number, currency: string): string {
    if (currency === 'ARS') {
      // Show price in thousands if > 1000
      if (price >= 1000) {
        return `$${Math.round(price / 1000)}k`;
      }
      return `$${Math.round(price)}`;
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
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
   * Add user location marker with custom styling
   */
  private addUserLocationMarker(): void {
    if (!this.map || !this.mapboxgl || !this.userLocation) return;

    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'user-location-marker';
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

    // Create popup with contextual message
    const popup = new this.mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div class="user-location-popup">
          <p class="font-semibold text-smoke-black">Estás aquí</p>
          <p class="text-xs text-charcoal-medium">Verifica autos cerca</p>
        </div>
      `);

    this.userLocationMarker.setPopup(popup);

    // Show popup initially
    setTimeout(() => {
      this.userLocationMarker?.togglePopup();
    }, 1000);
  }

  /**
   * Highlight selected car marker
   */
  private highlightSelectedCar(carId: string): void {
    const marker = this.carMarkers.get(carId);
    if (!marker) return;

    const element = marker.getElement();
    element.classList.add('car-marker--selected');

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

    // Remove markers
    this.carMarkers.forEach((marker) => {
      marker.remove();
    });
    this.carMarkers.clear();
  }

  /**
   * Cleanup on destroy
   */
  private cleanup(): void {
    this.clearMarkers();

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
        const prevMarker = this.carMarkers.get(previousId);
        if (prevMarker) {
          prevMarker.getElement().classList.remove('car-marker--selected');
        }
        const prevComponent = this.tooltipComponents.get(previousId);
        if (prevComponent) {
          prevComponent.setInput('selected', false);
        }
      }
      
      // Highlight current
      if (currentId) {
        this.highlightSelectedCar(currentId);
      }
    }
    if (changes['userLocation'] && !changes['userLocation'].firstChange && this.map) {
      this.addUserLocationMarker();
    }
  }
}
