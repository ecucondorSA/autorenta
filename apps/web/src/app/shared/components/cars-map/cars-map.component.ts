import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import * as L from 'leaflet';
import { icon } from 'leaflet';
import { BehaviorSubject, Observable, Subject, combineLatest, debounceTime, distinctUntilChanged, fromEvent, map, takeUntil } from 'rxjs';

import { environment } from 'src/environments/environment';
import { AppState } from '../../../../store/app.state';
import { Car } from '../../../../core/models/car.model';
import { Filter } from '../../../../core/models/filter.model';
import { SoundService } from '@core/services/ui/sound.service';
import { selectFilters } from '../../../../store/filter/filter.selector';
import { selectMapStyle } from '../../../../store/settings/settings.selector';
import { CarService } from '../../../../core/services/car.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer: ElementRef;
  @Input() cars: Car[] | null = [];
  @Output() carClicked = new EventEmitter<string>();
  @Output() boundsChanged = new EventEmitter<L.LatLngBounds>();

  map: L.Map;
  markers: { [carId: string]: L.Marker } = {};
  private mapStyle$: Observable<string>;
  private filters$: Observable<Filter>;
  private destroy$ = new Subject<void>();
  private currentBounds: L.LatLngBounds;
  private mapReady = new BehaviorSubject(false);
  mapReady$ = this.mapReady.asObservable();
  colorAvailable = environment.colorAvailable;
  colorSoon = environment.colorSoon;
  colorInUse = environment.colorInUse;
  colorUnavailable = environment.colorUnavailable;
  private resize$ = new Subject<void>();

  constructor(
    private router: Router,
    private store: Store<AppState>,
    private translate: TranslateService,
    private carService: CarService,
    private soundService: SoundService
  ) {
    this.mapStyle$ = this.store.select(selectMapStyle);
    this.filters$ = this.store.select(selectFilters);
  }

  ngAfterViewInit(): void {
    this.initMap();

    fromEvent(window, 'resize')
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.resize$.next();
      });

    this.resize$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.map.invalidateSize();
      this.repositionMarkers();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.mapReady.value) {
      this.updateMarkers();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
    }
  }

  initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [46.879966, -121.726909],
      zoom: 11,
    });

    combineLatest([this.mapStyle$, this.filters$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([
        mapStyle,
        filters,
      ]) => {
        L.tileLayer(mapStyle, {
          maxZoom: 18,
          minZoom: 2,
          attribution: 'Open Street Map',
        }).addTo(this.map);

        if (filters.location) {
          this.carService
            .getCoordinates(filters.location)
            .pipe(takeUntil(this.destroy$))
            .subscribe((coordinates) => {
              if (coordinates) {
                this.map.setView([coordinates.lat, coordinates.lon], 11);
              }
            });
        }
      });

    this.map.on('moveend', () => {
      this.currentBounds = this.map.getBounds();
      this.boundsChanged.emit(this.currentBounds);
    });

    this.mapReady.next(true);
    this.updateMarkers();
  }

  private updateMarkers() {
    if (!this.cars) {
      return;
    }

    const carIds = this.cars.map((car) => car.id);

    // Remove markers for cars that are no longer in the list
    Object.keys(this.markers).forEach((carId) => {
      if (!carIds.includes(carId)) {
        this.map.removeLayer(this.markers[carId]);
        delete this.markers[carId];
      }
    });

    this.cars.forEach((car) => {
      if (this.markers[car.id]) {
        // Marker already exists, update its position if needed
        this.repositionMarker(car);
      } else {
        // Create a new marker
        this.createMarker(car);
      }
    });
  }

  private createMarker(car: Car) {
    const tooltip = this.createTooltip(car);
    const marker = L.marker([car.latitude, car.longitude])
      .bindTooltip(tooltip, { className: 'map-tooltip', permanent: true, direction: 'top', offset: [0, -20] })
      .on('click', () => this.onCarClicked(car.id));

    this.markers[car.id] = marker;
    marker.addTo(this.map);
  }

  private repositionMarker(car: Car) {
    const marker = this.markers[car.id];
    if (marker) {
      marker.setLatLng([car.latitude, car.longitude]);
    }
  }

  private repositionMarkers() {
    Object.values(this.markers).forEach((marker) => {
      marker.getElement().style.display = 'none';
      marker.getElement().style.display = '';
    });
  }

  private createTooltip(car: Car): string {
    const tooltipContainer = document.createElement('div');
    // Use a unique class name for the container
    tooltipContainer.className = 'custom-tooltip-container';

    // Render the EnhancedMapTooltipComponent to the container
    this.renderComponent(EnhancedMapTooltipComponent, {
      inputs: {
        car: car,
      },
      containerElement: tooltipContainer,
    });

    return tooltipContainer.innerHTML;
  }

  private renderComponent(component: any, config: { inputs: any; containerElement: any }): void {
    this.carService.renderComponent(component, config);
  }

  onCarClicked(carId: string) {
    this.soundService.playClickSound();
    this.carClicked.emit(carId);
    this.router.navigate(['/car', carId]);
  }
}
