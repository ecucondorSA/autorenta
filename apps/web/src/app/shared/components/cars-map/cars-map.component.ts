import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AgmMap, LatLngBounds, MapsAPILoader } from '@agm/core';
import { isEqual } from 'lodash';
import { BehaviorSubject, Observable, Subject, Subscription, combineLatest, debounceTime, distinctUntilChanged, filter, fromEvent, map, of, switchMap, take, takeUntil, tap } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { MapMarker } from '../../../../core/interfaces/map-marker';
import { MarkerType } from '../../../../core/enums/marker-type.enum';
import { Car } from '../../../../core/models/car.model';
import { DEFAULT_ZOOM } from '../../../../core/constants/cars-map.constants';
import { FilterService } from '../../../../core/services/filter.service';
import { LocationService } from '../../../../core/services/location.service';
import { SoundService } from '../../../../core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() cars: Car[] = [];
  @Input() selectedCar: Car | null = null;
  @Input() showTooltips = true;
  @Input() showClusters = true;
  @Input() showUserLocation = false;
  @Input() fitBounds = true;
  @Input() height = '400px';
  @Input() showSearchControl = false;
  @Input() searchControlPlaceholder = '';
  @Input() showLocateMe = false;
  @Input() locateMeText = '';
  @Input() showPoweredByGoogle = true;
  @Input() showStreetViewControl = false;
  @Input() mapTypeControl = false;
  @Input() styles: any[] = [];
  @Output() markerClicked = new EventEmitter<Car>();
  @Output() mapReady = new EventEmitter<void>();

  @ViewChild(AgmMap) agmMap!: AgmMap;
  @ViewChild('searchControl') searchControlElementRef!: ElementRef;

  public mapMarkers: MapMarker[] = [];
  public currentPosition: any;
  public zoom = DEFAULT_ZOOM;
  public defaultLocation = this.locationService.defaultMapLocation;
  public searchControl = new FormControl('');
  public markerType = MarkerType;
  public isMobile = this.locationService.isMobile;
  public mapReady$ = new BehaviorSubject<boolean>(false);
  public mapBounds$ = new BehaviorSubject<LatLngBounds | null>(null);
  public showNoResultsMessage = false;
  public noResultsMessage = '';
  public isTooltipOpen = false;
  public streetViewControlOptions: google.maps.StreetViewControlOptions = { position: google.maps.ControlPosition.RIGHT_BOTTOM };
  public mapTypeControlOptions: google.maps.MapTypeControlOptions = { position: google.maps.ControlPosition.LEFT_BOTTOM };
  public mapOptions: google.maps.MapOptions = {
    streetViewControl: this.showStreetViewControl,
    mapTypeControl: this.mapTypeControl,
    mapTypeControlOptions: this.mapTypeControlOptions
  };

  private destroy$ = new Subject<void>();
  private readonly geocoder = new google.maps.Geocoder();
  private userLocation: any;
  private readonly locateMeDebounceTime = 500;
  private readonly noResultsDebounceTime = 500;
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly mapsAPILoader: MapsAPILoader,
    private readonly ngZone: NgZone,
    private readonly locationService: LocationService,
    private readonly filterService: FilterService,
    private readonly router: Router,
    private readonly translateService: TranslateService,
    private readonly soundService: SoundService
  ) { }

  ngOnInit() {
    this.translateService.get('SHARED.COMPONENTS.CARS_MAP.NO_RESULTS').pipe(take(1)).subscribe(message => this.noResultsMessage = message);

    if (this.showSearchControl) {
      this.initSearchControl();
    }

    if (this.showLocateMe) {
      this.initLocateMe();
    }

    this.subscriptions.push(
      this.mapReady$.pipe(
        filter(ready => ready),
        take(1),
        tap(() => {
          if (this.fitBounds) {
            this.updateMapBounds();
          }
        })
      ).subscribe()
    );
  }

  ngAfterViewInit() {
    this.mapsAPILoader.load().then(() => {
      this.mapReady$.next(true);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cars'] && !isEqual(changes['cars'].currentValue, changes['cars'].previousValue)) {
      this.updateMapMarkers();
      if (this.fitBounds && this.mapReady$.value) {
        this.updateMapBounds();
      }
    }

    if (changes['selectedCar'] && changes['selectedCar'].currentValue) {
      this.zoomToCar(changes['selectedCar'].currentValue);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onMapReady() {
    this.mapReady.emit();
  }

  onMarkerClicked(car: Car) {
    this.markerClicked.emit(car);
  }

  onMapBoundsChange(bounds: LatLngBounds) {
    this.mapBounds$.next(bounds);
  }

  onZoomChange(zoom: number) {
    this.zoom = zoom;
  }

  locateMe() {
    this.soundService.playClick();
    this.locationService.getCurrentPosition().pipe(
      take(1),
      tap(position => {
        if (position) {
          this.userLocation = position;
          this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.zoom = 12;
        }
      })
    ).subscribe();
  }

  closeTooltip() {
    this.isTooltipOpen = false;
  }

  openTooltip() {
    this.isTooltipOpen = true;
  }

  private initLocateMe() {
    this.subscriptions.push(
      fromEvent(window, 'focus').pipe(
        debounceTime(this.locateMeDebounceTime),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.locationService.checkLocationPermissions().pipe(take(1)).subscribe();
      })
    );
  }

  private initSearchControl() {
    this.mapsAPILoader.load().then(() => {
      const autocomplete = new google.maps.places.Autocomplete(this.searchControlElementRef.nativeElement, {
        types: []
      });

      autocomplete.addListener('place_changed', () => {
        this.ngZone.run(() => {
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();

          if (place.geometry === undefined || place.geometry === null) {
            return;
          }

          this.currentPosition = {
            lat: place.geometry.location?.lat(),
            lng: place.geometry.location?.lng()
          };
          this.zoom = 12;
        });
      });
    });

    this.subscriptions.push(
      this.searchControl.valueChanges.pipe(
        debounceTime(this.noResultsDebounceTime),
        distinctUntilChanged(),
        switchMap(value => {
          if (!value) {
            return of(false);
          }

          return new Observable<boolean>(observer => {
            this.geocoder.geocode({ address: value }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                observer.next(false);
              } else {
                observer.next(true);
              }
              observer.complete();
            });
          });
        }),
        takeUntil(this.destroy$)
      ).subscribe(noResults => {
        this.showNoResultsMessage = noResults;
      })
    );
  }

  private updateMapMarkers() {
    this.mapMarkers = this.cars.map(car => {
      return {
        lat: car.location.coordinates[1],
        lng: car.location.coordinates[0],
        label: {},
        draggable: false,
        car,
        opacity: this.selectedCar?.id === car.id ? 0 : 1
      };
    });
  }

  private updateMapBounds() {
    if (this.cars.length === 0) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    this.cars.forEach(car => {
      bounds.extend(new google.maps.LatLng(car.location.coordinates[1], car.location.coordinates[0]));
    });

    this.mapBounds$.pipe(
      take(1),
      tap(() => {
        this.agmMap.fitBounds(bounds);
      })
    ).subscribe();
  }

  private zoomToCar(car: Car) {
    this.currentPosition = {
      lat: car.location.coordinates[1],
      lng: car.location.coordinates[0]
    };
    this.zoom = 12;
  }

  // Unused variables
  // private colorAvailable = '#4caf50';
  // private colorSoon = '#ff9800';
  // private colorInUse = '#f44336';
  // private colorUnavailable = '#9e9e9e';
}
