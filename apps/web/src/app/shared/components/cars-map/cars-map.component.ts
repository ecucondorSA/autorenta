import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  effect,
  inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CarLocationsService, type CarMapLocation } from '../../../core/services/car-locations.service';
import { environment } from '../../../../environments/environment';

// Dynamic import types
type MapboxMap = any;
type Marker = any;
type LngLatLike = [number, number];

interface MapMarkerData {
  marker: Marker;
  carId: string;
}

@Component({
  standalone: true,
  selector: 'app-cars-map',
  imports: [CommonModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly carLocationsService = inject(CarLocationsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly carCount = signal(0);

  private map: MapboxMap | null = null;
  private markers: MapMarkerData[] = [];
  private realtimeUnsubscribe: (() => void) | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private mapboxgl: any | null = null;

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
      // Crear mapa centrado en Argentina por defecto
      const defaultCenter: [number, number] = [-58.3816, -34.6037]; // Buenos Aires
      const defaultZoom = 5;

      this.map = new this.mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/standard',
        center: defaultCenter,
        zoom: defaultZoom,
        attributionControl: true,
      });

      // Esperar a que el mapa cargue
      this.map.on('load', () => {
        void this.loadCarLocations();
        this.setupRealtimeUpdates();
        this.setupPeriodicRefresh();
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
      const locations = await this.carLocationsService.fetchActiveLocations(force);
      this.updateMarkers(locations);
      this.carCount.set(locations.length);
      this.loading.set(false);
      this.error.set(null);

      // Ajustar vista del mapa a los marcadores
      if (locations.length > 0 && this.map) {
        this.fitMapToBounds(locations);
      }
    } catch (err) {
      console.error('[CarsMapComponent] Error loading locations', err);
      this.error.set('Error al cargar las ubicaciones de los autos');
      this.loading.set(false);
    }
  }

  private updateMarkers(locations: CarMapLocation[]): void {
    if (!this.map || !this.mapboxgl) {
      return;
    }

    // Eliminar marcadores existentes
    this.clearMarkers();

    // Crear nuevos marcadores
    locations.forEach((location) => {
      if (!this.map || !this.mapboxgl) {
        return;
      }

      // Crear elemento HTML personalizado para el marcador
      const el = document.createElement('div');
      el.className = 'car-marker';
      el.innerHTML = this.createMarkerHTML(location);

      // Crear popup
      const popup = new this.mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(this.createPopupHTML(location));

      // Crear marcador
      const marker = new this.mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat] as LngLatLike)
        .setPopup(popup)
        .addTo(this.map);

      // Agregar evento de click
      el.addEventListener('click', () => {
        if (marker.getPopup().isOpen()) {
          marker.togglePopup();
        } else {
          // Cerrar otros popups
          this.markers.forEach((m) => {
            if (m.marker.getPopup().isOpen()) {
              m.marker.togglePopup();
            }
          });
          marker.togglePopup();
        }
      });

      this.markers.push({
        marker,
        carId: location.carId,
      });
    });
  }

  private createMarkerHTML(location: CarMapLocation): string {
    const priceFormatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: location.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(location.pricePerDay);

    return `
      <div class="marker-content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
        </svg>
        <span class="marker-price">${priceFormatted}</span>
      </div>
    `;
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

    return `
      <div class="car-popup">
        ${photoHTML}
        <div class="popup-content">
          <h3 class="popup-title">${this.escapeHtml(location.title)}</h3>
          <p class="popup-location">${this.escapeHtml(location.locationLabel)}</p>
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
    this.markers.forEach(({ marker }) => {
      marker.remove();
    });
    this.markers = [];
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

  private cleanup(): void {
    // Limpiar marcadores
    this.clearMarkers();

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
}
