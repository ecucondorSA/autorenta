import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, Subject, combineLatest, debounceTime, distinctUntilChanged, fromEvent, map, of, switchMap, takeUntil } from 'rxjs';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgmCoreModule, MapsAPILoader } from '@agm/core';
import { AgmMarkerClusterModule } from '@agm/markerclusterer';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Car, CarAvailabilityStatus, CarLocation } from '@shared/models/car.model';
import { selectCars } from '@store/car/car.selectors';
import { environment } from '@env/environment';
import { AppState } from '@store/app.state';
import { MarkerIconService } from '@core/services/ui/marker-icon.service';
import { SoundService } from '@core/services/ui/sound.service';

import { CarService } from '@shared/services/car.service';
import { ToastService } from '@shared/services/toast.service';
import { PhotoService } from '@shared/services/photo.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';


@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [
    CommonModule,
    AgmCoreModule,
    AgmMarkerClusterModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    EnhancedMapTooltipComponent
  ],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cars: Car[] | null = [];
  @Input() showTooltips = true;
  @Input() showSearchControl = false;
  @Input() initialLatitude = 52.520008;
  @Input() initialLongitude = 13.404954;
  @Input() initialZoom = 12;
  @Input() mapHeight = '500px';
  @Input() mapWidth = '100%';
  @Output() carClick = new EventEmitter<Car>();
  @ViewChild('search') public searchElementRef: ElementRef | undefined;

  public latitude: number = this.initialLatitude;
  public longitude: number = this.initialLongitude;
  public zoom: number = this.initialZoom;
  public searchControl: FormControl = new FormControl('');
  public carLocations$: Observable<CarLocation[]> | undefined;
  public mapReady$ = new BehaviorSubject(false);
  public showMap = false;
  public carDetailsOpen = false;
  public activeCar: Car | null = null;
  public map: any;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
    private router: Router,
    private store: Store<AppState>,
    private translate: TranslateService,
    private markerIconService: MarkerIconService,
    private carService: CarService
  ) { }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.cars) {
      this.updateCarLocations();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMapReady(map: any) {
    this.map = map;
    this.mapReady$.next(true);
  }

  onCarClick(car: Car) {
    this.carClick.emit(car);
  }

  closeCarDetails() {
    this.carDetailsOpen = false;
    this.activeCar = null;
  }

  openCarDetails(car: Car) {
    this.activeCar = car;
    this.carDetailsOpen = true;
  }

  getMarkerIcon(car: Car): string {
    return this.markerIconService.getMarkerIcon(car);
  }

  private initMap() {
    this.mapsAPILoader.load().then(() => {
      const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef?.nativeElement, {
        types: ["address"]
      });

      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          let place: google.maps.places.PlaceResult = autocomplete.getPlace();

          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }

          //set latitude, longitude and zoom
          this.latitude = place.geometry.location.lat();
          this.longitude = place.geometry.location.lng();
          this.zoom = 12;
        });
      });
    });

    this.store.select(selectCars).pipe(
      takeUntil(this.destroy$)
    ).subscribe(cars => {
      this.cars = cars;
      this.updateCarLocations();
    });

    combineLatest([
      this.mapReady$,
      fromEvent(window, 'resize').pipe(debounceTime(200), distinctUntilChanged(), map(() => this.map))
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([, map]) => {
      if (map) {
        google.maps.event.trigger(map, 'resize');
        map.setCenter(new google.maps.LatLng(this.latitude, this.longitude));
      }
    });
  }

  private updateCarLocations() {
    if (!this.cars) {
      return;
    }

    this.carLocations$ = of(this.cars).pipe(
      map(cars => cars.map(car => ({
        latitude: car.location.latitude,
        longitude: car.location.longitude,
        car: car
      })))      
    );

    this.showMap = true;
  }

  // Unused variables removed
  // colorAvailable = '#00FF00';
  // colorSoon = '#FFFF00';
  // colorInUse = '#FF0000';
  // colorUnavailable = '#808080';

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // private yourFunction(event: google.maps.MouseEvent) {
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // openTooltip(car: Car, event: google.maps.MouseEvent) {
  //   this.activeCar = car;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // closeTooltip(event: google.maps.MouseEvent) {
  //   this.activeCar = null;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // mapClicked(event: google.maps.MouseEvent) {
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // markerClicked(label: string, index: number, event: google.maps.MouseEvent) {
  //   console.log('marker clicked', label, index);
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onMouseover(car: Car, event: google.maps.MouseEvent) {
  //   this.activeCar = car;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onMouseout(event: google.maps.MouseEvent) {
  //   this.activeCar = null;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onMarkerClick(car: Car, event: google.maps.MouseEvent) {
  //   this.activeCar = car;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onMarkerMouseover(car: Car, event: google.maps.MouseEvent) {
  //   this.activeCar = car;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onMarkerMouseout(event: google.maps.MouseEvent) {
  //   this.activeCar = null;
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onClusterClick(cluster: any, event: google.maps.MouseEvent) {
  //   console.log('cluster clicked', cluster);
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onClusterMouseover(cluster: any, event: google.maps.MouseEvent) {
  //   console.log('cluster mouseover', cluster);
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }

  // Example of how to avoid 'any' if possible.  If the type of event is known, use it.
  // If not, you can use 'Event' or 'unknown' depending on the situation.
  // In this case, since it's a google maps event, we'll use the google maps event type.
  // onClusterMouseout(event: google.maps.MouseEvent) {
  //   console.log('cluster mouseout');
  //   console.log(event.latLng.lat(), event.latLng.lng());
  // }
}
