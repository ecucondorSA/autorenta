import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, fromEvent, map, Observable, of, pairwise, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { isEqual } from 'lodash';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

import { environment } from '../../../../../environments/environment';
import { MapService } from '@core/services/map/map.service';
import { SoundService } from '@core/services/ui/sound.service';
import { AppState } from '../../../../store/app.state';
import { Car } from '../../../../store/car/car.model';
import { selectCars } from '../../../../store/car/car.selectors';
import { FilterParams } from '../../../../store/filter/filter.model';
import { selectFilterParams } from '../../../../store/filter/filter.selectors';
import { ICONS } from '@shared/consts/icons';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

@Component({
  selector: 'ar-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() mapId = 'carsMap';
  @Input() miniCardComponent = CarMiniCardComponent;
  @Input() tooltipComponent = EnhancedMapTooltipComponent;
  @Input() showTooltips = true;
  @Input() showMiniCard = true;
  @Input() fitBoundsOnCarsChange = true;
  @Input() enableClustering = true;
  @Input() clusterStyles: any[] = [
    {
      textColor: 'white',
      url: ICONS.CLUSTER_1,
      height: 53,
      width: 52
    },
    {
      textColor: 'white',
      url: ICONS.CLUSTER_2,
      height: 56,
      width: 55
    },
    {
      textColor: 'white',
      url: ICONS.CLUSTER_3,
      height: 66,
      width: 65
    },
    {
      textColor: 'white',
      url: ICONS.CLUSTER_4,
      height: 80,
      width: 79
    },
    {
      textColor: 'white',
      url: ICONS.CLUSTER_5,
      height: 90,
      width: 89
    }
  ];
  @Output() markerClick = new EventEmitter<Car>();
  @ViewChild('mapContainer', { static: false }) mapRef!: ElementRef;

  map: google.maps.Map | undefined;
  cars$ = this.store.select(selectCars);
  filterParams$ = this.store.select(selectFilterParams);
  carsMarkers: google.maps.Marker[] = [];
  infoWindow: google.maps.InfoWindow | null = null;
  activeCar: Car | null = null;
  mapReady = new BehaviorSubject(false);
  mapIsReady$ = this.mapReady.asObservable();
  mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    backgroundColor: '#f2f2f2',
    gestureHandling: 'greedy',
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [
          {
            visibility: 'off'
          }
        ]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [
          {
            visibility: 'off'
          }
        ]
      }
    ]
  };
  isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  isTooltipOpen = false;
  mapIdle$ = new Subject<void>();
  markerClusterer: MarkerClusterer | undefined;
  isDestroyed$ = new Subject<void>();
  isInitialLoad = true;
  currentFilterParams: FilterParams | null = null;
  currentCars: Car[] = [];
  mapStyleUrl: SafeResourceUrl;
  isDarkMode = document.body.classList.contains('dark');
  mapStyleType = this.isDarkMode ? 'night' : 'day';

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private mapService: MapService,
    private store: Store<AppState>,
    private sanitizer: DomSanitizer,
    private translate: TranslateService,
    private soundService: SoundService
  ) {
    this.mapStyleUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`assets/map-styles/${this.mapStyleType}.json`);
  }

  ngAfterViewInit(): void {
    this.initMap();

    fromEvent(window, 'resize')
      .pipe(
        debounceTime(300),
        takeUntil(this.isDestroyed$)
      )
      .subscribe(() => {
        this.ngZone.run(() => {
          if (this.map) {
            google.maps.event.trigger(this.map, 'resize');
            this.setMapToCurrentCars(this.currentCars);
          }
        });
      });

    this.mapIdle$.pipe(debounceTime(500), takeUntil(this.isDestroyed$)).subscribe(() => {
      this.mapService.saveMapPosition(this.mapId, this.map);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clusterStyles'] && this.markerClusterer) {
      this.markerClusterer.setStyles(this.clusterStyles);
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed$.next();
    this.isDestroyed$.complete();
    this.mapReady.complete();
  }

  async initMap(): Promise<void> {
    if (!this.mapRef?.nativeElement) {
      return;
    }

    const mapStyles = await fetch(this.mapStyleUrl.toString()).then((res) => res.json());

    this.mapOptions = {
      ...this.mapOptions,
      styles: mapStyles
    };

    this.map = new google.maps.Map(this.mapRef.nativeElement, this.mapOptions);

    this.map.addListener('idle', () => {
      this.mapIdle$.next();
    });

    this.mapReady.next(true);

    combineLatest([this.cars$, this.filterParams$, this.mapIsReady$])
      .pipe(
        filter(([cars, filterParams, mapIsReady]) => !!cars?.length && !!filterParams && mapIsReady),
        distinctUntilChanged((a, b) => {
          const [prevCars, prevFilterParams] = a;
          const [currCars, currFilterParams] = b;

          return isEqual(prevCars, currCars) && isEqual(prevFilterParams, currFilterParams);
        }),
        tap((data) => {
          const [cars] = data;
          this.currentCars = cars;
        }),
        takeUntil(this.isDestroyed$)
      )
      .subscribe((data) => {
        const [cars] = data;

        this.setMapToCurrentCars(cars);
      });

    this.mapService
      .getMapPosition(this.mapId)
      .pipe(
        take(1),
        takeUntil(this.isDestroyed$)
      )
      .subscribe((position) => {
        if (position) {
          this.map?.setCenter(position.center);
          this.map?.setZoom(position.zoom);
        }
      });
  }

  setMapToCurrentCars(cars: Car[]): void {
    this.clearMarkers();

    if (!cars?.length || !this.map) {
      return;
    }

    this.carsMarkers = cars.map((car) => {
      const marker = new google.maps.Marker({
        position: {
          lat: car.location.lat,
          lng: car.location.lng
        },
        icon: {
          url: ICONS.MAP_MARKER,
          scaledSize: new google.maps.Size(40, 57) // scaled size
        },
        optimized: false
      });

      marker.addListener('click', () => {
        this.markerClick.emit(car);
        this.openTooltip(car, marker);
        this.soundService.play('click');
      });

      return marker;
    });

    if (this.enableClustering) {
      this.initMarkerClusterer(this.map, this.carsMarkers);
    } else {
      this.carsMarkers.forEach((marker) => {
        marker.setMap(this.map);
      });
    }

    if (this.fitBoundsOnCarsChange && this.isInitialLoad) {
      this.isInitialLoad = false;
      this.setMapBounds(cars);
    }
  }

  initMarkerClusterer(map: google.maps.Map, markers: google.maps.Marker[]): void {
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }

    this.markerClusterer = new MarkerClusterer({
      map,
      markers,
      styles: this.clusterStyles
    });
  }

  setMapBounds(cars: Car[]): void {
    if (!this.map) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    cars.forEach((car) => {
      bounds.extend({
        lat: car.location.lat,
        lng: car.location.lng
      });
    });

    this.map.fitBounds(bounds, 100);
  }

  clearMarkers(): void {
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }

    this.carsMarkers.forEach((marker) => {
      marker.setMap(null);
    });

    this.carsMarkers = [];
  }

  openTooltip(car: Car, marker: google.maps.Marker): void {
    if (!this.showTooltips) {
      return;
    }

    if (this.infoWindow) {
      this.infoWindow.close();
    } else {
      this.infoWindow = new google.maps.InfoWindow();
    }

    this.activeCar = car;

    this.infoWindow.setContent(`<ar-enhanced-map-tooltip></ar-enhanced-map-tooltip>`);

    this.infoWindow.addListener('domready', () => {
      this.isTooltipOpen = true;
      this.cdr.detectChanges();
    });

    this.infoWindow.addListener('closeclick', () => {
      this.isTooltipOpen = false;
      this.cdr.detectChanges();
    });

    this.infoWindow.open({
      anchor: marker,
      map: this.map
    });
  }

  closeTooltip(): void {
    this.infoWindow?.close();
    this.isTooltipOpen = false;
    this.cdr.detectChanges();
  }
}
