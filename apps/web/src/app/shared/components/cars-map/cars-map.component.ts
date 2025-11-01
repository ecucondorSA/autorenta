import {
  Component,
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
import { toSignal } from '@angular/core/rxjs-interop';
import { CarLocationsService, CarMapLocation } from '../../../core/services/car-locations.service';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import { environment } from '../../../../environments/environment';
import { LngLatLike, Map, Marker, Popup } from 'mapbox-gl';

@Component({
  standalone: true,
  selector: 'app-cars-map',
  imports: [CommonModule, TranslateModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements OnChanges, AfterViewInit {
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

  private map: Map | null = null;
  private userMarker: Marker | null = null;
  private selectedPopup: Popup | null = null;
  private mapboxgl: any = null;

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

  private async loadMapboxLibrary(): Promise<void> {
    try {
      const mapboxModule = await import('mapbox-gl');
      this.mapboxgl = mapboxModule.default || mapboxModule;
      
      // Set the access token on the mapboxgl object
      if (this.mapboxgl && environment.mapboxAccessToken) {
        (this.mapboxgl as any).accessToken = environment.mapboxAccessToken;
        console.log('✅ Mapbox GL cargado, token asignado:', environment.mapboxAccessToken?.substring(0, 20) + '...');
      } else {
        console.error('❌ Token no disponible:', environment.mapboxAccessToken);
        this.error.set('Token de Mapbox no configurado');
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

    console.log('📍 Actualizando markers:', locations.length, 'autos');
    this.carCount.set(locations.length);

    locations.forEach((location) => {
      if (!location.lat || !location.lng) {
        console.warn('⚠️ Auto sin coordenadas:', location);
        return;
      }

      const el = document.createElement('div');
      el.className = 'marker';
      el.addEventListener('click', () => {
        this.carSelected.emit(location.carId);
      });

      new this.mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat] as LngLatLike)
        .addTo(this.map as Map);
    });
  }

  private requestUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation.set({ lat: latitude, lng: longitude });
          this.userLocationChange.emit({ lat: latitude, lng: longitude });
          this.addUserMarker(latitude, longitude);
          this.zoomToUserLocation(latitude, longitude);
        },
        () => {
          this.error.set('No se pudo obtener la ubicación del usuario');
        },
      );
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
      .addTo(this.map as Map);
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
}
