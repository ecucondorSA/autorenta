import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, fromEvent, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AgmMap } from '@agm/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { getStyleForMap } from '@shared/utils/map-style';
import { environment } from 'src/environments/environment';
import { Car } from '@core/models/car.model';
import { AppState } from '@store';
import { CarService } from '@core/services/car.service';
import { SoundService } from '@core/services/ui/sound.service';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

declare var google: any;

interface LatLng {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cars: Car[] = [];
  @Input() showSearchControl = false;
  @Input() showUserLocation = false;
  @Input() showCarInfo = true;
  @Input() showClusters = true;
  @Input() mapHeight = '500px';
  @Input() mapWidth = '100%';
  @Input() initialLatitude = 40.73061;
  @Input() initialLongitude = -73.935242;
  @Input() initialZoom = 10;
  @Input() showTrafficLayer = false;
  @Input() fitBounds = true;
  @Input() showStreetViewControl = false;
  @Input() showFullscreenControl = false;
  @Input() showMapTypeControl = false;
  @Input() showRotateControl = false;
  @Input() showScaleControl = false;
  @Input() showTiltControl = false;
  @Input() isDraggable = true;
  @Input() isScrollwheel = true;
  @Input() isDoubleClickZoom = true;
  @Input() minZoom = 2;
  @Input() maxZoom = 20;
  @Input() styles: any;
  @Output() carClicked = new EventEmitter<string>();
  @ViewChild('searchBox') searchBoxElement: ElementRef;
  @ViewChild('agmMap') agmMap: AgmMap;

  public searchControl: FormControl = new FormControl('');
  public latitude: number = this.initialLatitude;
  public longitude: number = this.initialLongitude;
  public zoom: number = this.initialZoom;
  public mapStyles: any;
  public carIcon = {
    url: '/assets/img/car-marker.png',
    scaledSize: new google.maps.Size(40, 60),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(20, 60)
  };
  public userLocationIcon = {
    url: '/assets/img/user-location-marker.png',
    scaledSize: new google.maps.Size(30, 30),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(15, 15)
  };
  public trafficLayer: any;
  public userLocation: LatLng | null = null;
  public showTooltip = true;
  public mapReady = false;
  public markerClusterer: MarkerClusterer;
  public clusterStyles = [
    {
      textColor: 'white',
      url: '/assets/img/cluster-icon.png',
      height: 53,
      width: 52
    }
  ];
  public infoWindow;
  public openInfoWindowCarId: string | null = null;
  public map;
  private readonly destroy$ = new Subject<void>();
  private readonly geocoder = new google.maps.Geocoder();
  private readonly defaultBounds = {
    north: 85,
    south: -85,
    east: 180,
    west: -180
  };
  private readonly bounds$ = new BehaviorSubject(this.defaultBounds);

  constructor(
    private readonly router: Router,
    private readonly store: Store<AppState>,
    private readonly translate: TranslateService,
    private readonly carService: CarService,
    private readonly soundService: SoundService
  ) {
  }

  ngAfterViewInit(): void {
    this.mapStyles = this.styles || getStyleForMap();

    if (this.showSearchControl && this.searchBoxElement) {
      this.initSearchBox();
    }

    if (this.showUserLocation) {
      this.getUserLocation();
    }

    this.bounds$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(bounds => {
        this.carService.setBounds(bounds);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.mapReady) {
      this.updateMarkerClusterer();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMapReady(map) {
    this.map = map;
    this.mapReady = true;

    if (this.showTrafficLayer) {
      this.trafficLayer = new google.maps.TrafficLayer();
      this.trafficLayer.setMap(map);
    }

    if (this.showClusters) {
      this.initMarkerClusterer(map);
    }

    this.updateMarkerClusterer();

    if (this.fitBounds && this.cars.length > 0) {
      this.fitMapBounds(map);
    }
  }

  onIdle() {
    if (!this.map) {
      return;
    }

    const bounds = this.map.getBounds();

    if (!bounds) {
      return;
    }

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    this.bounds$.next({
      north: northEast.lat(),
      south: southWest.lat(),
      east: northEast.lng(),
      west: southWest.lng()
    });
  }

  openCarDetails(carId: string) {
    this.carClicked.emit(carId);
    this.router.navigate(['/cars', carId]);
  }

  closeInfoWindow() {
    this.openInfoWindowCarId = null;
  }

  onMarkerClick(car: Car, infoWindow: EnhancedMapTooltipComponent) {
    this.soundService.playClickSound();
    this.infoWindow = infoWindow;
    this.openInfoWindowCarId = car.id;
  }

  private initSearchBox() {
    const input = this.searchBoxElement.nativeElement;
    const searchBox = new google.maps.places.SearchBox(input);

    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    this.map.addListener('bounds_changed', () => {
      searchBox.setBounds(this.map.getBounds());
    });

    searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces();

      if (places.length === 0) {
        return;
      }

      this.latitude = places[0].geometry.location.lat();
      this.longitude = places[0].geometry.location.lng();
      this.zoom = 12;

      this.map.setCenter({
        lat: this.latitude,
        lng: this.longitude
      });
    });

    fromEvent(input, 'keyup')
      .pipe(
        map((event: any) => event.target.value),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap(query => this.geocodeAddress(query)),
        takeUntil(this.destroy$)
      )
      .subscribe((result: any) => {
        if (result && result.length > 0) {
          this.latitude = result[0].geometry.location.lat();
          this.longitude = result[0].geometry.location.lng();
          this.zoom = 12;

          this.map.setCenter({
            lat: this.latitude,
            lng: this.longitude
          });
        }
      });
  }

  private initMarkerClusterer(map) {
    const imagePath = '/assets/img/cluster-icon.png';

    this.markerClusterer = new MarkerClusterer({
      map,
      algorithm: new google.maps.MarkerClusterer.DistanceBasedAlgorithm({
        maxDistance: 40,
        gridSize: 60
      }),
      renderer: {
        render: ({ count, position }) => new google.maps.Marker({
          position,
          icon: {
            url: imagePath,
            size: new google.maps.Size(52, 53),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(26, 27)
          },
          label: {
            text: String(count),
            color: 'white',
            fontSize: '12px'
          },
          title: String(count),
          // adjust zIndex to be above other markers
          zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
        })
      }
    });
  }

  private updateMarkerClusterer() {
    if (!this.markerClusterer) {
      return;
    }

    this.markerClusterer.clearMarkers();

    const markers = this.cars.map(car => {
      const marker = new google.maps.Marker({
        position: new google.maps.LatLng(car.latitude, car.longitude),
        icon: this.carIcon,
        optimized: false
      });

      marker.addListener('click', () => {
        this.openCarDetails(car.id);
      });

      return marker;
    });

    this.markerClusterer.addMarkers(markers);
  }

  private fitMapBounds(map) {
    const bounds = new google.maps.LatLngBounds();

    this.cars.forEach(car => {
      bounds.extend(new google.maps.LatLng(car.latitude, car.longitude));
    });

    map.fitBounds(bounds);
  }

  private geocodeAddress(address: string): Observable<any> {
    return new Observable(observer => {
      this.geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
          observer.next(results);
        } else {
          observer.next(null);
        }
        observer.complete();
      });
    });
  }
}
