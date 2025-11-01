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

// Type-only imports to avoid static bundling
// Mapbox GL is loaded dynamically to prevent Vite bundling issues
type LngLatLike = [number, number] | { lng: number; lat: number };
type MapboxMap = any;
type MapboxMarker = any;
type MapboxPopup = any;

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

  private map: MapboxMap | null = null;
  private userMarker: MapboxMarker | null = null;
  private selectedPopup: MapboxPopup | null = null;
  private mapboxgl: any = null;
  private carMarkersMap: Map<string, MapboxMarker> = new Map();

  constructor() {
    effect(() => {
      if (this.selectedCarId) {
        this.flyToCarLocation(this.selectedCarId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.map) {
      this.updateMarkers(this.cars);
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadMapboxLibrary();
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

  private async loadMapboxLibrary(): Promise<void> {
    try {
      // Use stable path and grab default export
      const mapboxModule = await import('mapbox-gl/dist/mapbox-gl.js');
      this.mapboxgl = mapboxModule.default;
      
      // Try to load CSP-compatible version if needed
      try {
        // @ts-ignore - CSP version is optional
        await import('mapbox-gl/dist/mapbox-gl-csp.js');
      } catch {
        // CSP version not needed or not available
      }
      
      // Set the access token on the mapboxgl object
      if (this.mapboxgl && environment.mapboxAccessToken) {
        this.mapboxgl.accessToken = environment.mapboxAccessToken;
        console.log('✅ Mapbox GL cargado, token asignado:', environment.mapboxAccessToken?.substring(0, 20) + '...');
      } else {
        console.error('❌ Token de Mapbox no configurado. Configure NG_APP_MAPBOX_ACCESS_TOKEN en las variables de entorno.');
        this.error.set(
          'El mapa requiere configuración. Por favor, contacte al administrador para configurar el token de Mapbox (NG_APP_MAPBOX_ACCESS_TOKEN).'
        );
      }
    } catch (err) {
      console.error('❌ Error cargando Mapbox:', err);
      this.error.set('Error al cargar la biblioteca de mapas');
    }
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapboxgl || !this.mapContainer) {
      console.error('❌ Mapbox o container no disponible');
      return;
    }

    if (!environment.mapboxAccessToken) {
      console.error('❌ Token de Mapbox no encontrado en environment');
      this.error.set('Token de Mapbox no configurado');
      this.loading.set(false);
      return;
    }

    try {
      console.log('🗺️ Inicializando mapa con token:', environment.mapboxAccessToken.substring(0, 20) + '...');
      
      this.map = new this.mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-56.1645, -34.9011],
        zoom: 12,
        accessToken: environment.mapboxAccessToken, // Token también en el constructor
      });

      if (this.map) {
        this.map.on('load', () => {
          console.log('✅ Mapa cargado correctamente');
          this.loading.set(false);
          this.updateMarkers(this.cars);
          this.requestUserLocation();
        });

        this.map.on('error', (e: any) => {
          console.error('❌ Error en el mapa:', e);
          this.error.set('Error al cargar el mapa: ' + (e.error?.message || 'Error desconocido'));
          this.loading.set(false);
        });
      }
    } catch (err: any) {
      console.error('❌ Error inicializando mapa:', err);
      this.error.set('Error al inicializar el mapa: ' + err.message);
      this.loading.set(false);
    }
  }

  private updateMarkers(locations: CarMapLocation[]): void {
    if (!this.map || !this.mapboxgl) {
      console.warn('⚠️ Mapa no disponible para actualizar markers');
      return;
    }

    // Clean up existing markers before creating new ones
    this.carMarkersMap.forEach(marker => marker.remove());
    this.carMarkersMap.clear();

    console.log('📍 Actualizando markers:', locations.length, 'autos');
    console.log('📍 Locations data:', locations);
    this.carCount.set(locations.length);

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

      // Create custom photo marker
      const el = this.createPhotoMarker(location);
      
      console.log('✅ Marker creado para:', location.carId);
      
      // Add staggered entrance animation
      setTimeout(() => {
        el.classList.add('marker-burst');
      }, index * 50);

      el.addEventListener('click', () => {
        this.carSelected.emit(location.carId);
        this.animateMarkerBounce(el);
      });

      const marker = new this.mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat] as LngLatLike)
        .addTo(this.map);
      
      console.log('✅ Marker agregado al mapa:', location.carId);
      
      // Keep reference for cleanup using carId as key
      this.carMarkersMap.set(location.carId, marker);
    });
    
    console.log('📍 Total markers en mapa:', this.carMarkersMap.size);
  }

  private createPhotoMarker(location: CarMapLocation): HTMLElement {
    const el = document.createElement('div');
    el.className = 'car-marker-simple';
    el.setAttribute('data-car-id', location.carId);
    
    // Formatear precio
    const formattedPrice = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: location.currency || 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(location.pricePerDay);

    // Marker simple circular con precio
    el.innerHTML = `
      <div class="marker-circle">
        <span class="marker-price-simple">${formattedPrice}</span>
      </div>
    `;
    
    return el;
  }

  private animateMarkerBounce(element: HTMLElement): void {
    element.classList.remove('marker-bounce');
    // Force reflow
    void element.offsetWidth;
    element.classList.add('marker-bounce');
    setTimeout(() => element.classList.remove('marker-bounce'), 600);
  }

  private requestUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation.set({ lat: latitude, lng: longitude });
          this.userLocationChange.emit({ lat: latitude, lng: longitude });
          this.addUserMarker(latitude, longitude);
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
    if (!this.map || !this.mapboxgl) {
      return;
    }

    if (this.userMarker) {
      this.userMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'user-location-marker';

    this.userMarker = new this.mapboxgl.Marker(el)
      .setLngLat([lng, lat] as LngLatLike)
      .addTo(this.map);
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
