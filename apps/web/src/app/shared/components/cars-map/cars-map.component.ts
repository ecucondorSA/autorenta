import { AfterViewInit, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { icon } from 'leaflet';
import { Subject, takeUntil } from 'rxjs';

import { AppState } from '../../../../store/app.state';
import { Car } from '../../../core/models/car';
import { selectMapCenter } from '../../../../store/map/map.selectors';
import { MapActions } from '../../../../store/map/map.actions';
import { SoundService } from '@core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cars: Car[] = [];
  private map: L.Map | undefined;
  private destroy$ = new Subject<void>();
  private mapCenter$ = this.store.select(selectMapCenter);
  private mapCenter: L.LatLngExpression = [40.73061, -73.935242]; // Default to New York
  private carMarkers: { [carId: string]: L.Marker } = {};

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private translate: TranslateService,
    private soundService: SoundService
  ) {}

  ngAfterViewInit(): void {
    this.initMap();

    this.mapCenter$.pipe(takeUntil(this.destroy$)).subscribe((center) => {
      if (center) {
        this.mapCenter = [center.latitude, center.longitude];
        this.map?.setView(this.mapCenter, this.map.getZoom());
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.map) {
      this.updateCarMarkers();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: this.mapCenter,
      zoom: 12,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    tiles.addTo(this.map);

    this.map.on('moveend', () => {
      const center = this.map?.getCenter();
      if (center) {
        this.store.dispatch(MapActions.setMapCenter({ latitude: center.lat, longitude: center.lng }));
      }
    });

    this.updateCarMarkers();
  }

  private updateCarMarkers(): void {
    if (!this.map) return;

    // Remove existing car markers
    Object.values(this.carMarkers).forEach((marker) => {
      this.map?.removeLayer(marker);
    });
    this.carMarkers = {};

    this.cars.forEach((car) => {
      if (car.latitude && car.longitude) {
        this.addCarMarker(car);
      }
    });
  }

  private addCarMarker(car: Car): void {
    const iconUrl = this.getCarIconUrl(car);

    const customIcon = icon({
      iconUrl: iconUrl,
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -42],
    });

    const marker = L.marker([car.latitude, car.longitude], { icon: customIcon });

    marker.bindPopup(() => {
      const popupElement = document.createElement('app-enhanced-map-tooltip') as EnhancedMapTooltipComponent;
      popupElement.car = car;

      // Manually trigger change detection since the popup content is outside Angular's zone
      popupElement.changeDetectorRef.detectChanges();

      return popupElement;
    });

    marker.on('popupopen', () => {
      this.soundService.play('open-infobox');
    });

    marker.on('click', () => {
      this.router.navigate(['/rent', car.id]);
    });

    marker.addTo(this.map as L.Map);
    this.carMarkers[car.id] = marker;
  }

  private getCarIconUrl(car: Car): string {
    const baseUrl = '/assets/img/map-icons';
    const status = car.status ? car.status.toLowerCase() : 'unknown';

    switch (status) {
      case 'available':
        return `${baseUrl}/car-available.svg`;
      case 'in use':
        return `${baseUrl}/car-in-use.svg`;
      case 'soon available':
        return `${baseUrl}/car-soon.svg`;
      default:
        return `${baseUrl}/car-unavailable.svg`;
    }
  }
}
