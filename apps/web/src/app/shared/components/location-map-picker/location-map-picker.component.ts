import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type mapboxgl from 'mapbox-gl';
import { environment } from '../../../../environments/environment';
import { GeocodingService } from '../../../core/services/geocoding.service';

// Type import (doesn't increase bundle size)

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
}

@Component({
  selector: 'app-location-map-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="location-map-picker">
      <!-- Map container -->
      <div #mapContainer class="map-container"></div>

      <!-- Info panel -->
      <div class="info-panel">
        <div class="flex items-start gap-2">
          <span class="text-cta-default text-lg">ℹ️</span>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-800">
              {{ isLoading() ? 'Cargando mapa...' : 'Ajusta la ubicación' }}
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {{
                isLoading()
                  ? 'Por favor espera...'
                  : 'Arrastra el marcador para ajustar la ubicación exacta de tu auto'
              }}
            </p>
            <div *ngIf="currentAddress()" class="mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded">
              📍 {{ currentAddress() }}
            </div>
            <div *ngIf="coordinates()" class="mt-1 text-xs text-gray-500 dark:text-gray-300">
              Lat: {{ coordinates()!.latitude.toFixed(6) }}, Lng:
              {{ coordinates()!.longitude.toFixed(6) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .location-map-picker {
        position: relative;
        width: 100%;
      }

      .map-container {
        width: 100%;
        height: 400px;
        border-radius: 0.5rem;
        overflow: hidden;
        border: 2px solid #e5e7eb;
      }

      .info-panel {
        margin-top: 1rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 0.5rem;
        padding: 0.75rem;
      }

      :host {
        display: block;
      }

      /* Ensure marker is visible */
      ::ng-deep .mapboxgl-marker {
        z-index: 10;
      }
    `,
  ],
})
export class LocationMapPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() initialLatitude?: number;
  @Input() initialLongitude?: number;
  @Input() initialAddress?: string;

  @Output() locationChange = new EventEmitter<LocationCoordinates>();

  private map?: mapboxgl.Map;
  private marker?: mapboxgl.Marker;
  private mapboxgl?: typeof mapboxgl;

  isLoading = signal(true);
  coordinates = signal<LocationCoordinates | null>(null);
  currentAddress = signal<string>('');

  constructor(private readonly geocodingService: GeocodingService) {}

  ngOnInit(): void {
    if (this.initialAddress) {
      this.currentAddress.set(this.initialAddress);
    }
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private async initializeMap(): Promise<void> {
    // Use initial coordinates or default to Buenos Aires center
    const initialLng = this.initialLongitude ?? -58.3816;
    const initialLat = this.initialLatitude ?? -34.6037;

    try {
      // Lazy load Mapbox GL (only imported at runtime, not in initial bundle)
      const mapboxModule = await import('mapbox-gl');
      const mapboxgl = mapboxModule.default;
      this.mapboxgl = mapboxgl;

      // Initialize Mapbox map
      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLng, initialLat],
        zoom: 15,
        accessToken: environment.mapboxAccessToken,
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load
      this.map.on('load', () => {
        this.isLoading.set(false);
        this.addDraggableMarker(initialLng, initialLat);

        // Set initial coordinates
        const initialCoords: LocationCoordinates = {
          latitude: initialLat,
          longitude: initialLng,
          address: this.initialAddress,
        };
        this.coordinates.set(initialCoords);
        this.locationChange.emit(initialCoords);
      });

      // Handle map errors
      this.map.on('error', (_e: unknown) => {
        this.isLoading.set(false);
      });
    } catch (__error) {
      this.isLoading.set(false);
    }
  }

  private addDraggableMarker(lng: number, lat: number): void {
    if (!this.map || !this.mapboxgl) return;

    // Create draggable marker
    this.marker = new this.mapboxgl.Marker({
      draggable: true,
      color: '#2563eb', // Blue color
    })
      .setLngLat([lng, lat])
      .addTo(this.map);

    // Handle marker drag end
    this.marker.on('dragend', () => {
      this.onMarkerDragEnd();
    });
  }

  private async onMarkerDragEnd(): Promise<void> {
    if (!this.marker) return;

    const lngLat = this.marker.getLngLat();
    const newCoordinates: LocationCoordinates = {
      latitude: lngLat.lat,
      longitude: lngLat.lng,
    };

    this.coordinates.set(newCoordinates);

    // Perform reverse geocoding to get address
    try {
      // Note: Mapbox reverse geocoding would require a different API endpoint
      // For now, we'll just emit the coordinates
      // In a full implementation, you could call a reverse geocoding service
      this.currentAddress.set('Ubicación ajustada manualmente');
      newCoordinates.address = 'Ubicación ajustada manualmente';
    } catch (__error) {
      console.warn('No se pudo actualizar la dirección durante el drag del marcador', __error);
    }

    // Emit the new coordinates
    this.locationChange.emit(newCoordinates);
  }

  /**
   * Fly to a new location on the map
   * This method can be called from parent components
   */
  public flyToLocation(latitude: number, longitude: number, address?: string): void {
    if (!this.map || !this.marker) return;

    this.map.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      essential: true,
      duration: 1500,
    });

    this.marker.setLngLat([longitude, latitude]);

    const newCoordinates: LocationCoordinates = {
      latitude,
      longitude,
      address,
    };

    this.coordinates.set(newCoordinates);
    if (address) {
      this.currentAddress.set(address);
    }
    this.locationChange.emit(newCoordinates);
  }

  private destroyMap(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = undefined;
    }

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}
