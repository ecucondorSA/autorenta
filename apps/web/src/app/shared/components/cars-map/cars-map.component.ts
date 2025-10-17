import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
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
import {
  CarLocationsService,
  type CarMapLocation,
} from '../../../core/services/car-locations.service';
import { environment } from '../../../../environments/environment';

// Dynamic import types
type MapboxMap = any;
type Marker = any;
type LngLatLike = [number, number];

@Component({
  standalone: true,
  selector: 'app-cars-map',
  imports: [CommonModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() cars: any[] = [];
  @Input() selectedCarId: string | null = null;
  @Output() carSelected = new EventEmitter<string>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly carLocationsService = inject(CarLocationsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly carCount = signal(0);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);

  private map: MapboxMap | null = null;
  private userMarker: Marker | null = null;
  private realtimeUnsubscribe: (() => void) | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private mapboxgl: any | null = null;
  private geolocationWatchId: number | null = null;
  private currentLocations: CarMapLocation[] = []; // Para tracking de locations
  private selectedPopup: any | null = null; // Popup actual abierto

  constructor() {
    // Efecto para limpiar recursos cuando el componente se destruye
    effect(
      () => {
        return () => {
          this.cleanup();
        };
      },
      { allowSignalWrites: false },
    );
  }

  ngOnChanges(changes: any): void {
    // Detectar cambios en selectedCarId y mover el mapa
    if (changes.selectedCarId && !changes.selectedCarId.firstChange) {
      const carId = changes.selectedCarId.currentValue;
      if (carId) {
        this.flyToCarLocation(carId);
      }
    }

    // Forzar resize del mapa si cambió el tamaño del contenedor
    if (this.map) {
      setTimeout(() => {
        this.map?.resize();
      }, 100);
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
      // Importar dinámicamente Mapbox GL JS
      const mapboxModule = await import('mapbox-gl');
      this.mapboxgl = mapboxModule.default || mapboxModule;

      if (!this.mapboxgl) {
        throw new Error('Mapbox GL JS no se cargó correctamente');
      }

      // Configurar access token
      if (environment.mapboxAccessToken) {
        (this.mapboxgl as any).accessToken = environment.mapboxAccessToken;
      }
    } catch (err) {
      console.error('[CarsMapComponent] Error loading Mapbox', err);
      this.error.set('Error al cargar la biblioteca de mapas');
      this.loading.set(false);
    }
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapboxgl || !this.mapContainer) {
      return;
    }

    try {
      // Crear mapa centrado en Uruguay por defecto
      const defaultCenter: [number, number] = [-56.0, -32.5]; // Centro de Uruguay
      const defaultZoom = 6.5;

      // Límites de Uruguay para evitar mostrar océano innecesario
      const uruguayBounds: [[number, number], [number, number]] = [
        [-58.5, -35.0], // Southwest
        [-53.0, -30.0], // Northeast
      ];

      this.map = new this.mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12', // Estilo con color (calles, parques, agua)
        center: defaultCenter,
        zoom: defaultZoom,
        maxBounds: uruguayBounds,
        attributionControl: true,
        cooperativeGestures: false,
      });

      // Esperar a que el mapa cargue
      this.map.on('load', () => {
        // Forzar resize para asegurar que el mapa tome el tamaño correcto
        setTimeout(() => {
          this.map?.resize();
        }, 300);

        void this.loadCarLocations();
        this.setupRealtimeUpdates();
        this.setupPeriodicRefresh();
        this.requestUserLocation();
      });

      // Manejo de errores
      this.map.on('error', (e: any) => {
        console.error('[CarsMapComponent] Map error', e);
      });
    } catch (err) {
      console.error('[CarsMapComponent] Error initializing map', err);
      this.error.set('Error al inicializar el mapa');
      this.loading.set(false);
    }
  }

  private async loadCarLocations(force = false): Promise<void> {
    try {
      let locations = await this.carLocationsService.fetchActiveLocations(force);
      const originalCount = locations.length;

      // Ordenar por distancia si tenemos ubicación del usuario
      const userLoc = this.userLocation();
      if (userLoc) {
        locations = this.sortLocationsByDistance(locations, userLoc);
        console.log('[CarsMapComponent] Sorted locations by distance:', locations.length);

        // FILTRO DE AUDITORÍA: Eliminar autos que están a más de 150km (Uruguay es pequeño pero largo)
        const maxDistanceKm = 150;
        const filteredLocations = locations.filter((loc) => {
          const distance = this.calculateDistance(userLoc.lat, userLoc.lng, loc.lat, loc.lng);
          return distance <= maxDistanceKm;
        });

        const filteredCount = originalCount - filteredLocations.length;
        if (filteredCount > 0) {
          console.log(
            `[CarsMapComponent] 🔍 AUDITORÍA: Filtrados ${filteredCount} autos que están a más de ${maxDistanceKm}km de distancia (Uruguay)`,
          );
        }
        console.log(
          `[CarsMapComponent] Mostrando ${filteredLocations.length} de ${originalCount} autos dentro de ${maxDistanceKm}km`,
        );

        locations = filteredLocations;
      }

      this.updateMarkers(locations);
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

  private updateMarkers(locations: CarMapLocation[]): void {
    if (!this.map || !this.mapboxgl) {
      return;
    }

    // Guardar locations para uso posterior
    this.currentLocations = locations;

    // Remover layers y source existentes si existen
    this.removeCarLayers();

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
          title: loc.title,
          currency: loc.currency,
          photoUrl: loc.photoUrl || '',
          locationLabel: loc.locationLabel,
          formattedAddress: loc.formattedAddress || '',
          description: loc.description || '',
        },
      })),
    };

    // Agregar source
    if (this.map.getSource('cars')) {
      (this.map.getSource('cars') as any).setData(geojsonData);
    } else {
      this.map.addSource('cars', {
        type: 'geojson',
        data: geojsonData,
        cluster: true, // Habilitar clustering nativo de Mapbox
        clusterMaxZoom: 14, // Max zoom para clusters
        clusterRadius: 50, // Radio del cluster en pixels
      });
    }

    // Layer 1: Círculos para clusters
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cars',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#222222',
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 30, 30],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
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

    // Layer 3: Círculos de fondo para autos individuales (estilo Airbnb)
    this.map.addLayer({
      id: 'car-markers-bg',
      type: 'circle',
      source: 'cars',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#ffffff',
        'circle-radius': 22,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(0, 0, 0, 0.08)',
        'circle-opacity': 1,
      },
    });

    // Layer 4: Texto de precio para autos individuales
    this.map.addLayer({
      id: 'car-prices',
      type: 'symbol',
      source: 'cars',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['concat', '$', ['get', 'price']],
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#222222',
      },
    });

    // Agregar interactividad
    this.setupLayerInteractions();
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
    this.map.on('click', 'car-markers-bg', (e: any) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const carId = feature.properties.carId;

      // Emitir evento de selección
      this.carSelected.emit(carId);

      // Mostrar popup
      this.showCarPopup(feature);
    });

    // Click en cluster - hacer zoom
    this.map.on('click', 'clusters', (e: any) => {
      if (!this.map || !e.features || e.features.length === 0) return;

      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });

      if (features.length === 0) return;

      const clusterId = features[0].properties.cluster_id;
      const source = this.map.getSource('cars') as any;

      source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err || !this.map) return;

        this.map.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom,
          duration: 500,
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
  private showCarPopup(feature: any): void {
    if (!this.map || !this.mapboxgl) return;

    // Cerrar popup anterior si existe
    if (this.selectedPopup) {
      this.selectedPopup.remove();
      this.selectedPopup = null;
    }

    const props = feature.properties;
    const coords = (feature.geometry as any).coordinates;

    // Crear HTML del popup usando el mismo método existente
    const location: CarMapLocation = {
      carId: props.carId,
      title: props.title,
      pricePerDay: props.price,
      currency: props.currency,
      photoUrl: props.photoUrl,
      locationLabel: props.locationLabel,
      formattedAddress: props.formattedAddress,
      description: props.description,
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
      // Si solo hay un auto, centrar en él
      this.map.flyTo({
        center: [locations[0].lng, locations[0].lat],
        zoom: 12,
      });
      return;
    }

    // Calcular bounds para múltiples ubicaciones
    const bounds = new this.mapboxgl.LngLatBounds();
    locations.forEach((location) => {
      bounds.extend([location.lng, location.lat] as LngLatLike);
    });

    this.map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 12,
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
          this.userLocation.set({ lat: latitude, lng: longitude });
          this.addUserMarker(latitude, longitude);

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
      zoom: 11, // Zoom nivel ciudad
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
      zoom: 14, // Zoom cercano para ver el auto
      duration: 400, // 400ms = animación rápida y suave
      essential: true,
    });

    // Abrir popup del auto después de un delay
    setTimeout(() => {
      if (!this.map) return;

      // Query features en esa ubicación
      const point = this.map.project([location.lng, location.lat]);
      const features = this.map.queryRenderedFeatures(point, {
        layers: ['car-markers-bg'],
      });

      if (features.length > 0) {
        const feature = features.find((f: any) => f.properties.carId === carId);
        if (feature) {
          this.showCarPopup(feature);
        }
      }
    }, 500);

    console.log(`[CarsMapComponent] Flying to car ${carId} at [${location.lng}, ${location.lat}]`);
  }
}
