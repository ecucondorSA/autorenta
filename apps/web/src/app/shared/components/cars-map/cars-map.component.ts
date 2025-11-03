import {
  Component,
  OnChanges,
  OnDestroy,
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
import { toSignal } from '@angular/core/rxjs-interop';
import { CarLocationsService, CarMapLocation } from '../../../core/services/car-locations.service';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import { environment } from '../../../../environments/environment';
import mapboxgl from 'mapbox-gl';

// Type aliases for Mapbox
type LngLatLike = [number, number] | { lng: number; lat: number };

/**
 * CarsMapComponent - Displays cars on an interactive map using Mapbox GL
 * 
 * IMPORTANT: Mapbox Token Configuration
 * =====================================
 * This component requires a Mapbox access token to function properly.
 * 
 * Development:
 * - Add to .env.local: NG_APP_MAPBOX_ACCESS_TOKEN=pk.ey...
 * 
 * Production:
 * - Set environment variable: NG_APP_MAPBOX_ACCESS_TOKEN=pk.ey...
 * - Or configure in your deployment platform (Cloudflare Pages, Vercel, etc.)
 * 
 * Without a valid token, the map will display an error message instructing
 * the administrator to configure it.
 */

@Component({
  standalone: true,
  selector: 'app-cars-map',
  imports: [CommonModule, TranslateModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

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

  private map: mapboxgl.Map | null = null;
  private userMarker: mapboxgl.Marker | null = null;
  private selectedPopup: mapboxgl.Popup | null = null;
  private carMarkersMap: Map<string, mapboxgl.Marker> = new Map();
  private lastCarsJson: string = ''; // Para evitar updates redundantes

  // Clustering & pricing cache
  private clusteringEnabled = false;
  private readonly CLUSTER_THRESHOLD = 30; // activar clustering a partir de 30 autos
  private pricingCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // Distance calculation
  private readonly EARTH_RADIUS_KM = 6371;
  private userLocationForDistance: { lat: number; lng: number } | null = null;

  constructor() {
    effect(() => {
      if (this.selectedCarId) {
        this.flyToCarLocation(this.selectedCarId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.map) {
      // Solo actualizar si realmente cambió el contenido
      const currentJson = JSON.stringify(this.cars);
      if (currentJson !== this.lastCarsJson) {
        console.log('🔄 Cars changed, updating markers');
        this.lastCarsJson = currentJson;
        this.updateMarkers(this.cars);
      } else {
        console.log('⏭️ Cars unchanged, skipping update');
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.initializeMap();
    }
  }

  ngOnDestroy(): void {
    // Clean up all car markers
    this.carMarkersMap.forEach(marker => marker.remove());
    this.carMarkersMap.clear();
    
    // Clean up user marker
    this.userMarker?.remove();
    this.userMarker = null;
    
    // Clean up popup
    this.selectedPopup?.remove();
    this.selectedPopup = null;
    
    // Clean up map
    this.map?.remove();
    this.map = null;
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer) {
      console.error('❌ Map container no disponible');
      return;
    }

    if (!environment.mapboxAccessToken) {
      console.error('❌ Token de Mapbox no encontrado en environment');
      this.error.set('Token de Mapbox no configurado');
      this.loading.set(false);
      return;
    }

    try {
      console.log('🗺️ Inicializando mapa con import estático...');
      
      mapboxgl.accessToken = environment.mapboxAccessToken;
      
      // Argentina bounds to prevent showing too much ocean
      const argentinaBounds: mapboxgl.LngLatBoundsLike = [
        [-73.5, -55.0], // Southwest (Tierra del Fuego west)
        [-53.5, -21.8], // Northeast (Misiones northeast)
      ];

      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-56.1645, -34.9011],
        zoom: 12,
        pitch: 45,
        bearing: -17.6,
        maxBounds: argentinaBounds,
        minZoom: 5,
        maxZoom: 18,
      });

      this.map.on('load', () => {
        console.log('✅ Mapa cargado exitosamente');
        this.loading.set(false);
        this.updateMarkers(this.cars);
        this.requestUserLocation();
        this.addGeolocateButton();
      });

      this.map.on('error', (e: any) => {
        console.error('❌ Error en el mapa:', e);
        this.error.set('Error al cargar el mapa: ' + (e.error?.message || 'Error desconocido'));
        this.loading.set(false);
      });
    } catch (err: any) {
      console.error('❌ Error inicializando mapa:', err);
      this.error.set('Error al inicializar el mapa: ' + err.message);
      this.loading.set(false);
    }
  }

  private updateMarkers(locations: CarMapLocation[]): void {
    if (!this.map) {
      console.warn('⚠️ Mapa no disponible para actualizar markers');
      return;
    }

    console.log('📍 Actualizando markers:', locations.length, 'autos');
    console.log('📍 Locations data:', locations);
    this.carCount.set(locations.length);

    // Crear Set de IDs actuales para comparar
    const currentCarIds = new Set(locations.map(loc => loc.carId));
    
    // Eliminar markers que ya no existen
    this.carMarkersMap.forEach((marker, carId) => {
      if (!currentCarIds.has(carId)) {
        console.log('🗑️ Eliminando marker:', carId);
        marker.remove();
        this.carMarkersMap.delete(carId);
      }
    });

    // Si hay muchos autos, usar clustering con layers (mejor performance)
    if (locations.length >= this.CLUSTER_THRESHOLD) {
      this.clusteringEnabled = true;
      // Limpiar markers HTML existentes
      this.carMarkersMap.forEach((m) => m.remove());
      this.carMarkersMap.clear();
      this.addOrUpdateClusterLayers(locations);
      console.log('🧩 Clustering activado:', locations.length, 'autos');
      return;
    }

    // Si no, usar markers HTML (estilo con foto + precio)
    this.removeClusterLayers();
    this.clusteringEnabled = false;

    // Agregar o actualizar markers HTML
    locations.forEach((location, index) => {
      console.log(`🚗 Procesando auto ${index + 1}:`, {
        carId: location.carId,
        lat: location.lat,
        lng: location.lng,
        photoUrl: location.photoUrl,
        price: location.pricePerDay
      });

      if (!location.lat || !location.lng) {
        console.warn('⚠️ Auto sin coordenadas:', location);
        return;
      }

      // Si el marker ya existe, no recrearlo
      if (this.carMarkersMap.has(location.carId)) {
        console.log('✓ Marker ya existe:', location.carId);
        return;
      }

      // Create custom photo marker
      const el = this.createPhotoMarker(location);
      
      console.log('✅ Marker creado para:', location.carId);
      
      // Add click handler
      el.addEventListener('click', () => {
        this.carSelected.emit(location.carId);
        this.animateMarkerBounce(el);
      });

      const map = this.map;
      if (!map) return;
      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat] as LngLatLike)
        .setPopup(this.buildPopup(location))
        .addTo(map);
      
      console.log('✅ Marker agregado al mapa:', location.carId);
      
      // Keep reference for cleanup using carId as key
      this.carMarkersMap.set(location.carId, marker);
    });
    
    console.log('📍 Total markers en mapa:', this.carMarkersMap.size);
  }

  private addOrUpdateClusterLayers(locations: CarMapLocation[]): void {
    if (!this.map) return;

    const geojsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: locations.map((loc) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [loc.lng, loc.lat],
        },
        properties: {
          carId: loc.carId,
          title: loc.title,
          price: Math.round(loc.pricePerDay),
          photoUrl: loc.photoUrl || '',
          currency: loc.currency || 'ARS',
        },
      })) as any,
    };

    const source = this.map.getSource('cars') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojsonData as any);
    } else {
      this.map.addSource('cars', {
        type: 'geojson',
        data: geojsonData as any,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      } as any);

      this.map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'cars',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2c4a52', 10, '#8b7355', 50, '#ffb400'],
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
        },
      } as any);

      this.map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'cars',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
        },
      } as any);

      this.map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'cars',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#2c4a52',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      } as any);

      // Click en cluster para expandir
      this.map.on('click', 'clusters', (e: any) => {
        const map = this.map;
        if (!map) return;
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features || features.length === 0) return;
        const clickedFeature = features[0];
        const properties = clickedFeature.properties;
        if (!properties || !properties.cluster_id) return;
        const clusterId = properties.cluster_id;
        const source = map.getSource('cars') as any;
        if (!source) return;
        source.getClusterExpansionZoom(
          clusterId,
          (err: unknown, zoom: number) => {
            if (err) return;
            const coords = (clickedFeature.geometry as GeoJSON.Point).coordinates;
            if (coords && coords.length >= 2) {
              map.easeTo({ center: coords as [number, number], zoom });
            }
          },
        );
      });

      // Popup para puntos individuales
      this.map.on('click', 'unclustered-point', (e: any) => {
        const map = this.map;
        if (!map || !e.features || !e.features[0]) return;
        const f = e.features[0];
        const coords = f.geometry.coordinates.slice();
        const props = f.properties;
        const popup = this.buildPopup({
          carId: props.carId,
          title: props.title,
          pricePerDay: Number(props.price),
          currency: props.currency,
          lat: coords[1],
          lng: coords[0],
          updatedAt: new Date().toISOString(),
          locationLabel: '',
          photoUrl: props.photoUrl,
          description: '',
        } as any);
        popup.setLngLat(coords).addTo(map);
      });
    }
  }

  private removeClusterLayers(): void {
    const map = this.map;
    if (!map) return;
    const layers = ['unclustered-point', 'cluster-count', 'clusters'];
    layers.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('cars')) map.removeSource('cars');
  }

  private buildPopup(location: CarMapLocation): mapboxgl.Popup {
    const formattedPrice = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: location.currency || 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(location.pricePerDay);

    const html = `
      <div class="car-popup-content">
        <img class="car-popup-image" src="${location.photoUrl || ''}" alt="${
      location.title
    }" />
        <div class="car-popup-info">
          <h4>${location.title}</h4>
          <p class="car-popup-price">${formattedPrice}/día</p>
          ${location.locationLabel ? `<p>${location.locationLabel}</p>` : ''}
        </div>
      </div>
    `;

    return new mapboxgl.Popup({ closeButton: false, className: 'car-popup' }).setHTML(html);
  }

  private addGeolocateButton(): void {
    if (!this.map || !this.mapContainer) return;
    const button = document.createElement('button');
    button.className = 'mapbox-ctrl-geolocate';
    button.setAttribute('aria-label', 'Centrar en mi ubicación');
    button.style.position = 'absolute';
    button.style.right = '10px';
    button.style.bottom = '10px';
    button.style.zIndex = '10';
    button.style.width = '36px';
    button.style.height = '36px';
    button.style.borderRadius = '6px';
    button.style.border = '1px solid rgba(0,0,0,0.1)';
    button.style.background = '#fff';
    button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="margin:8px"><circle cx="10" cy="10" r="2"/><path d="M10 2v6m0 4v6M2 10h6m4 0h6" stroke="currentColor" stroke-width="2"/></svg>';
    button.addEventListener('click', () => {
      const map = this.map;
      if (!map) return;
      const loc = this.userLocation();
      if (loc) {
        map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 1000 });
      } else {
        this.requestUserLocation();
      }
    });
    if (this.mapContainer?.nativeElement) {
      this.mapContainer.nativeElement.appendChild(button);
    }
  }

  private createPhotoMarker(location: CarMapLocation): HTMLElement {
    const el = document.createElement('div');
    el.className = 'car-marker';
    el.setAttribute('data-car-id', location.carId);

    // Determinar si mostrar distancia o precio
    const distanceText = this.getDistanceText(location.lat, location.lng);
    const showDistance = distanceText && parseFloat(distanceText.replace(/[^\d.]/g, '')) <= 10; // Mostrar distancia si <= 10km

    let displayText: string;
    let displayClass: string;

    if (showDistance && distanceText) {
      displayText = distanceText;
      displayClass = 'car-marker-distance';
      el.classList.add('nearby');
    } else {
      // Formatear precio
      const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: location.currency || 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(location.pricePerDay);
      displayText = formattedPrice;
      displayClass = 'car-marker-price';
    }

    // Marker estilo Airbnb con foto y distancia/precio
    el.innerHTML = `
      <div class="car-marker-content">
        <img class="car-marker-photo" src="${location.photoUrl}" alt="Car" loading="lazy" />
        <span class="${displayClass}">${displayText}</span>
      </div>
    `;

    return el;
  }

  private animateMarkerBounce(element: HTMLElement): void {
    element.classList.remove('bounce');
    // Force reflow
    void element.offsetWidth;
    element.classList.add('bounce');
    setTimeout(() => element.classList.remove('bounce'), 600);
  }

  private requestUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation.set({ lat: latitude, lng: longitude });
          this.userLocationForDistance = { lat: latitude, lng: longitude };
          this.userLocationChange.emit({ lat: latitude, lng: longitude });
          this.addUserMarker(latitude, longitude);
          // Actualizar markers con distancias después de obtener ubicación
          this.updateMarkers(this.cars);
          // NO hacer zoom automático - dejar que el usuario explore libremente
          // this.zoomToUserLocation(latitude, longitude);
        },
        (error) => {
          // Geolocation error - NO bloquear el mapa, solo loguear
          console.warn('⚠️ No se pudo obtener ubicación del usuario:', error.message);
          // No seteamos this.error para que el mapa siga funcionando
        },
      );
    } else {
      console.warn('⚠️ Geolocalización no disponible en este navegador');
    }
  }

  private addUserMarker(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    if (this.userMarker) {
      this.userMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'user-location-marker';

    const map = this.map;
    if (!map) return;
    this.userMarker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat] as LngLatLike)
      .addTo(map);
  }

  private zoomToUserLocation(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    this.map.flyTo({
      center: [lng, lat],
      zoom: 14,
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  private formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    } else if (km < 10) {
      return `${km.toFixed(1)}km`;
    } else {
      return `${Math.round(km)}km`;
    }
  }

  /**
   * Get distance text for a car location
   */
  private getDistanceText(carLat: number, carLng: number): string | null {
    if (!this.userLocationForDistance) return null;

    const distance = this.calculateDistance(
      this.userLocationForDistance.lat,
      this.userLocationForDistance.lng,
      carLat,
      carLng
    );

    return this.formatDistance(distance);
  }

  flyToCarLocation(carId: string): void {
    if (!this.map) {
      return;
    }

    const location = this.cars.find((loc) => loc.carId === carId);
    if (location) {
      this.map.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
      });
    }
  }

  /**
   * Public method to fly to a specific location
   * Used by parent components to center the map
   */
  flyToLocation(lat: number, lng: number, zoom: number = 14): void {
    if (!this.map) {
      console.warn('⚠️ Map not initialized');
      return;
    }

    this.map.flyTo({
      center: [lng, lat],
      zoom,
      essential: true,
    });
  }
}
