import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgmCoreModule, MapsAPILoader } from '@agm/core';
import { Subject, debounceTime, fromEvent, takeUntil } from 'rxjs';
import { Car } from '@shared/models/car.model';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from '@store/app.state';
import { selectMapCenter, selectMapZoom } from '@store/map/map.selectors';
import { updateMapCenter, updateMapZoom } from '@store/map/map.actions';
import { Marker } from '@shared/models/marker.model';
import { MarkerService } from '@core/services/marker.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { CarDetailBottomSheetComponent } from '../car-detail-bottom-sheet/car-detail-bottom-sheet.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { environment } from 'src/environments/environment';
import { ApiService } from '@core/services/api/api.service';
import { SoundService } from '@core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';


@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [
    CommonModule,
    AgmCoreModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    CarMiniCardComponent,
    EnhancedMapTooltipComponent
  ],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cars: Car[] = [];
  @Input() showTooltips = true;
  @Output() carClick = new EventEmitter<Car>();
  @ViewChild('search', { static: false }) public searchElementRef!: ElementRef;

  mapCenter$ = this.store.select(selectMapCenter);
  mapZoom$ = this.store.select(selectMapZoom);
  markers: Marker[] = [];
  zoomControl = true;
  streetViewControl = false;
  mapTypeControl = false;
  searchControl: FormControl = new FormControl('');
  private destroy$ = new Subject<void>();
  currentLat: number = 0;
  currentLong: number = 0;
  isCurrentLocationAvailable = false;
  mapTypeId: string = 'roadmap';
  mapStyle = [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [
        { visibility: 'off' }
      ]
    }
  ];
  isMobile = false;
  isTooltipOpen = false;
  activeCarId: number | null = null;
  infoWindowTimeout: any;
  isInitialLoad = true;
  isMapIdle = true;
  mapIdleTimeout: any;
  @Output() mapIdle = new EventEmitter<boolean>();
  @ViewChild('carsMap') carsMap!: ElementRef;

  constructor(
    private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
    private router: Router,
    private store: Store<AppState>,
    private markerService: MarkerService,
    private bottomSheet: MatBottomSheet,
    private apiService: ApiService,
    private soundService: SoundService
  ) {
    this.isMobile = window.innerWidth <= 768; // Adjust the breakpoint as needed
  }

  ngAfterViewInit(): void {
    this.loadMap().then(() => {
      this.setCurrentLocation();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && changes['cars'].currentValue) {
      this.updateMarkers();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateMapState(lat: number, lng: number, zoom: number): void {
    this.store.dispatch(updateMapCenter({ lat, lng }));
    this.store.dispatch(updateMapZoom({ zoom }));
  }

  loadMap(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.mapsAPILoader.load().then(() => {
        const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);

        autocomplete.addListener('place_changed', () => {
          this.ngZone.run(() => {
            const place: google.maps.places.PlaceResult = autocomplete.getPlace();

            if (place.geometry === undefined || place.geometry === null) {
              return;
            }

            this.currentLat = place.geometry.location.lat();
            this.currentLong = place.geometry.location.lng();
            this.updateMapState(this.currentLat, this.currentLong, 12);
          });
        });

        fromEvent(window, 'resize')
          .pipe(debounceTime(100), takeUntil(this.destroy$))
          .subscribe(() => {
            this.isMobile = window.innerWidth <= 768;
          });

        resolve();
      });
    });
  }

  setCurrentLocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.currentLat = position.coords.latitude;
        this.currentLong = position.coords.longitude;
        this.isCurrentLocationAvailable = true;
        if (this.isInitialLoad) {
          this.updateMapState(this.currentLat, this.currentLong, 12);
          this.isInitialLoad = false;
        }
      });
    }
  }

  updateMarkers(): void {
    this.markers = this.cars.map(car => this.markerService.getMarker(car));
  }

  onCarClick(car: Car): void {
    this.carClick.emit(car);
    this.soundService.play('click');
  }

  openBottomSheet(car: Car): void {
    this.bottomSheet.open(CarDetailBottomSheetComponent, {
      data: { car }
    });
  }

  onMapReady(): void {
    // console.log('map ready');
  }

  onIdle(): void {
    this.isMapIdle = true;
    clearTimeout(this.mapIdleTimeout);
    this.mapIdleTimeout = setTimeout(() => {
      this.mapIdle.emit(true);
    }, 500);
  }

  onMove(): void {
    this.isMapIdle = false;
    clearTimeout(this.mapIdleTimeout);
    this.mapIdle.emit(false);
  }

  mapClick(event: google.maps.MapMouseEvent): void {
    if (event.latLng) {
      this.updateMapState(event.latLng.lat(), event.latLng.lng(), 12);
    }
  }

  markerClick(marker: Marker): void {
    this.activeCarId = marker.id;
    this.soundService.play('click');
  }

  closeTooltip(): void {
    this.activeCarId = null;
  }

  // Unused variables removed
}
