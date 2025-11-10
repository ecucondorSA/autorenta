import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  WritableSignal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { Map } from 'mapbox-gl';

export interface LocationCircle {
  center: { lat: number; lng: number };
  radiusKm: number;
}

@Component({
  selector: 'app-personalized-location',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './personalized-location.component.html',
  styleUrls: ['./personalized-location.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalizedLocationComponent implements OnInit, OnDestroy {
  @Input() map?: Map;
  @Input() userLocation?: { lat: number; lng: number };
  @Input() radiusKm: WritableSignal<number> = signal(5); // Default radius in km
  @Input() showRadiusSlider = true;

  @Output() locationChange = new EventEmitter<LocationCircle>();
  @Output() permissionRequested = new EventEmitter<boolean>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly permissionGranted = signal(false);
  readonly permissionDenied = signal(false);
  readonly isDragging = signal(false);
  readonly showPermissionModal = signal(false);
  readonly showRadiusControl = signal(false);

  readonly radiusOptions = [2, 5, 10, 20];

  private circleSourceId = 'personalized-location-circle';
  private circleLayerId = 'personalized-location-circle-layer';
  private centerMarkerId = 'personalized-location-center';
  private pulsatingDotId = 'personalized-location-pulsating-dot';

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.checkPermission();
  }

  ngOnDestroy(): void {
    this.removeCircleFromMap();
  }

  private async checkPermission(): Promise<void> {
    if (!navigator.permissions) {
      // Fallback for browsers without Permissions API
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (result.state === 'granted') {
        this.permissionGranted.set(true);
        await this.requestPermission();
      } else if (result.state === 'prompt') {
        this.showPermissionModal.set(true);
      } else {
        this.permissionDenied.set(true);
      }
    } catch {
      // Permissions API not supported, show modal
      this.showPermissionModal.set(true);
    }
  }

  async requestPermission(): Promise<void> {
    this.showPermissionModal.set(false);
    this.permissionRequested.emit(true);

    if (!navigator.geolocation) {
      this.permissionDenied.set(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.permissionGranted.set(true);
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.userLocation = location;
        this.addCircleToMap(location, this.radiusKm());
        this.emitLocationChange();
      },
      () => {
        this.permissionDenied.set(true);
      },
    );
  }

  onRadiusChange(radius: number): void {
    this.radiusKm.set(radius);
    if (this.userLocation) {
      this.addCircleToMap(this.userLocation, radius);
      this.emitLocationChange();
    }
  }

  private addCircleToMap(center: { lat: number; lng: number }, radiusKm: number): void {
    if (!this.map) return;

    // Remove existing layers/sources
    this.removeCircleFromMap();

    // Calculate circle points (approximate)
    const radiusMeters = radiusKm * 1000;
    const points = 64;
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const lat = center.lat + (radiusMeters / 111320) * Math.cos(angle);
      const lng =
        center.lng +
        (radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
      coordinates.push([lng, lat]);
    }

    // Add circle source
    this.map.addSource(this.circleSourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      },
    });

    // Add circle layer with gradient fill
    this.map.addLayer({
      id: this.circleLayerId,
      type: 'fill',
      source: this.circleSourceId,
      paint: {
        'fill-color': '#A7D8F4', // cta-default (azul pastel)
        'fill-opacity': 0.1,
      },
    });

    // Add circle border
    this.map.addLayer({
      id: `${this.circleLayerId}-border`,
      type: 'line',
      source: this.circleSourceId,
      paint: {
        'line-color': '#A7D8F4', // cta-default (azul pastel)
        'line-width': 2,
        'line-opacity': 0.3,
      },
    });

    // Add center marker (draggable)
    this.addCenterMarker(center);
  }

  private addCenterMarker(center: { lat: number; lng: number }): void {
    if (!this.map) return;

    // Create marker element
    const el = document.createElement('div');
    el.className = 'personalized-location-center';
    el.innerHTML = `
      <div class="location-center-handle"></div>
    `;
    el.style.cursor = 'grab';

    // Add drag functionality
    let isDragging = false;
    el.addEventListener('mousedown', () => {
      isDragging = true;
      this.isDragging.set(true);
      el.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.map) return;
      const lngLat = this.map.unproject([e.clientX, e.clientY]);
      this.userLocation = { lat: lngLat.lat, lng: lngLat.lng };
      this.addCircleToMap(this.userLocation, this.radiusKm());
      this.emitLocationChange();
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.isDragging.set(false);
        el.style.cursor = 'grab';
      }
    });

    // Use Mapbox Marker (lazy import)
    import('mapbox-gl').then((mapboxgl) => {
      const Marker = mapboxgl.default.Marker;
      const marker = new Marker({ element: el, draggable: true })
        .setLngLat([center.lng, center.lat])
        .addTo(this.map!);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        this.userLocation = { lat: lngLat.lat, lng: lngLat.lng };
        this.addCircleToMap(this.userLocation, this.radiusKm());
        this.emitLocationChange();
      });
    });
  }

  private removeCircleFromMap(): void {
    if (!this.map) return;

    try {
      if (this.map.getLayer(this.circleLayerId)) {
        this.map.removeLayer(this.circleLayerId);
      }
      if (this.map.getLayer(`${this.circleLayerId}-border`)) {
        this.map.removeLayer(`${this.circleLayerId}-border`);
      }
      if (this.map.getSource(this.circleSourceId)) {
        this.map.removeSource(this.circleSourceId);
      }
    } catch {
      // Layers/sources may not exist
    }
  }

  private emitLocationChange(): void {
    if (!this.userLocation) return;
    this.locationChange.emit({
      center: this.userLocation,
      radiusKm: this.radiusKm(),
    });
  }

  toggleRadiusControl(): void {
    this.showRadiusControl.set(!this.showRadiusControl());
  }

  dismissPermissionModal(): void {
    this.showPermissionModal.set(false);
  }
}
