import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, fromEvent, map, Observable, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { FormControl } from '@angular/forms';
import { MapsAPILoader } from '@angular/maps';
import { Store } from '@ngrx/store';

import { environment } from 'src/environments/environment';
import { SoundService } from '@core/services/ui/sound.service';

import { Car } from '@core/models/car.model';
import { AppState } from '@core/store';
import { selectMapZoom } from '@core/store/settings';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

import { Marker } from './models/marker.model';
import { MapStyle } from './models/map-style.model';

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {

  @Input() cars: Car[] = [];
  @Input() showTooltip = true;
  @Input() mapStyle: MapStyle = 'default';
  @Input() mapHeight = '400px';
  @Input() mapWidth = '100%';
  @Input() fitBounds = true;
  @Input() showSearch = false;
  @Input() showTraffic = false;
  @Input() showBicycling = false;
  @Input() showTransit = false;
  @Input() showStreetViewControl = true;
  @Input() showFullscreenControl = true;
  @Input() showMapTypeControl = true;
  @Input() mapTypeControlStyle: google.maps.MapTypeControlStyle = google.maps.MapTypeControlStyle.DEFAULT;
  @Input() customMapStyles: google.maps.MapTypeStyle[] | null = null;
  @Input() zoom: number = 12;
  @Input() center: google.maps.LatLngLiteral = { lat: 46.8182, lng: 8.2275 };
  @Output() markerClick = new EventEmitter<Car>();
  @Output() mapReady = new EventEmitter<google.maps.Map>();

  @ViewChild('search')
  public searchElementRef: ElementRef;

  @ViewChild(EnhancedMapTooltipComponent)
  public mapTooltip: EnhancedMapTooltipComponent;

  map: google.maps.Map;
  markers: Marker[] = [];
  locationSearchControl: FormControl = new FormControl('');
  mapZoom$: Observable<number>;
  mapZoom: number;
  geocoder = new google.maps.Geocoder();
  trafficLayer = new google.maps.TrafficLayer();
  bicyclingLayer = new google.maps.BicyclingLayer();
  transitLayer = new google.maps.TransitLayer();
  destroy$ = new Subject<void>();
  mapTypeIds: string[] = ['roadmap', 'satellite', 'hybrid', 'terrain'];
  currentMapTypeIndex = 0;
  mapTypeId = this.mapTypeIds[this.currentMapTypeIndex];
  infoWindow: google.maps.InfoWindow;
  isTooltipOpen = false;
  mapBounds: google.maps.LatLngBounds;
  mapOptions: google.maps.MapOptions = {};
  mapIdle$ = new BehaviorSubject<boolean>(false);

  constructor(
    private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
    private store: Store<AppState>,
    private soundService: SoundService
  ) { }

  ngOnInit(): void {
    this.mapZoom$ = this.store.select(selectMapZoom);

    this.mapZoom$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(zoom => {
        this.zoom = zoom;
      });

    this.locationSearchControl.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(value => value.length > 2),
        switchMap(value => this.geocodeAddress(value)),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        if (result && result.geometry) {
          this.map.fitBounds(result.geometry.viewport || result.geometry.bounds);
        }
      });
  }

  ngAfterViewInit(): void {
    this.mapsAPILoader.load().then(() => {
      this.mapOptions = {
        zoom: this.zoom,
        center: this.center,
        mapTypeId: this.mapTypeId,
        disableDefaultUI: true,
        zoomControl: true,
        scrollwheel: false,
        streetViewControl: this.showStreetViewControl,
        fullscreenControl: this.showFullscreenControl,
        mapTypeControl: this.showMapTypeControl,
        mapTypeControlOptions: {
          style: this.mapTypeControlStyle,
          mapTypeIds: this.mapTypeIds
        },
        styles: this.customMapStyles
      };

      this.map = new google.maps.Map(document.getElementById('map'), this.mapOptions);
      this.mapReady.emit(this.map);

      this.map.addListener('idle', () => {
        this.ngZone.run(() => {
          this.mapIdle$.next(true);
        });
      });

      this.map.addListener('tilesloaded', () => {
        this.ngZone.run(() => {
          this.mapIdle$.next(true);
        });
      });

      this.map.addListener('click', () => {
        this.closeTooltip();
      });

      this.mapBounds = new google.maps.LatLngBounds();

      this.setMarkers(this.cars);

      if (this.showTraffic) {
        this.trafficLayer.setMap(this.map);
      }

      if (this.showBicycling) {
        this.bicyclingLayer.setMap(this.map);
      }

      if (this.showTransit) {
        this.transitLayer.setMap(this.map);
      }

      if (this.searchElementRef) {
        const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);

        autocomplete.addListener('place_changed', () => {
          this.ngZone.run(() => {
            const place: google.maps.places.PlaceResult = autocomplete.getPlace();

            if (place.geometry === undefined || place.geometry === null) {
              return;
            }

            this.map.fitBounds(place.geometry.viewport || place.geometry.bounds);
          });
        });
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.map) {
      this.setMarkers(this.cars);
    }

    if (changes['mapStyle'] && this.map) {
      this.setMapStyle(this.mapStyle);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setMapStyle(mapStyle: MapStyle): void {
    switch (mapStyle) {
      case 'dark':
        this.map.setOptions({ styles: this.getDarkMapStyle() });
        break;
      case 'aubergine':
        this.map.setOptions({ styles: this.getAubergineMapStyle() });
        break;
      case 'night':
        this.map.setOptions({ styles: this.getNightMapStyle() });
        break;
      case 'retro':
        this.map.setOptions({ styles: this.getRetroMapStyle() });
        break;
      case 'silver':
        this.map.setOptions({ styles: this.getSilverMapStyle() });
        break;
      case 'default':
      default:
        this.map.setOptions({ styles: this.customMapStyles });
        break;
    }
  }

  setMarkers(cars: Car[]): void {
    this.clearMarkers();
    this.mapBounds = new google.maps.LatLngBounds();

    cars.forEach(car => {
      if (car.latitude && car.longitude) {
        const position = new google.maps.LatLng(car.latitude, car.longitude);
        const icon = {
          url: '/assets/img/svg/marker.svg',
          scaledSize: new google.maps.Size(24, 34),
          anchor: new google.maps.Point(12, 34)
        };

        const marker = new google.maps.Marker({
          position,
          map: this.map,
          title: car.name,
          icon,
          optimized: false
        });

        marker.addListener('click', () => {
          this.ngZone.run(() => {
            this.onMarkerClick(car, marker);
          });
        });

        this.markers.push({
          car,
          marker
        });

        this.mapBounds.extend(position);
      }
    });

    if (this.fitBounds && cars.length > 0) {
      this.map.fitBounds(this.mapBounds);
    }
  }

  clearMarkers(): void {
    this.markers.forEach(marker => {
      marker.marker.setMap(null);
    });

    this.markers = [];
  }

  onMarkerClick(car: Car, marker: google.maps.Marker): void {
    if (this.showTooltip) {
      this.openTooltip(car, marker);
    }

    this.markerClick.emit(car);
    this.soundService.play('select');
  }

  openTooltip(car: Car, marker: google.maps.Marker): void {
    this.mapTooltip.car = car;
    this.mapTooltip.position = marker.getPosition();
    this.mapTooltip.open();
    this.isTooltipOpen = true;
  }

  closeTooltip(): void {
    if (this.isTooltipOpen) {
      this.mapTooltip.close();
      this.isTooltipOpen = false;
    }
  }

  geocodeAddress(address: string): Observable<google.maps.GeocoderResult[]> {
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

  // Map Styles
  getDarkMapStyle(): google.maps.MapTypeStyle[] {
    return [
      {
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#212121'
          }
        ]
      },
      {
        'elementType': 'labels.icon',
        'stylers': [
          {
            'visibility': 'off'
          }
        ]
      },
      {
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#757575'
          }
        ]
      },
      {
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#212121'
          }
        ]
      },
      {
        'featureType': 'administrative',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#757575'
          }
        ]
      },
      {
        'featureType': 'administrative.country',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9e9e9e'
          }
        ]
      },
      {
        'featureType': 'administrative.land_parcel',
        'stylers': [
          {
            'visibility': 'off'
          }
        ]
      },
      {
        'featureType': 'administrative.locality',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#bdbdbd'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#757575'
          }
        ]
      },
      {
        'featureType': 'poi.park',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#181818'
          }
        ]
      },
      {
        'featureType': 'poi.park',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#616161'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'geometry.fill',
        'stylers': [
          {
            'color': '#373737'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9ca5b3'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry.fill',
        'stylers': [
          {
            'color': '#3c3c3c'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#d0d0d0'
          }
        ]
      },
      {
        'featureType': 'transit',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#757575'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#000000'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#3d3d3d'
          }
        ]
      }
    ];
  }

  getAubergineMapStyle(): google.maps.MapTypeStyle[] {
    return [
      {
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#1d2c4d'
          }
        ]
      },
      {
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#8ec3b9'
          }
        ]
      },
      {
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#1a3646'
          }
        ]
      },
      {
        'featureType': 'administrative.country',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#4b6878'
          }
        ]
      },
      {
        'featureType': 'administrative.land_parcel',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#64779e'
          }
        ]
      },
      {
        'featureType': 'administrative.province',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#4b6878'
          }
        ]
      },
      {
        'featureType': 'landscape.man_made',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#334750'
          }
        ]
      },
      {
        'featureType': 'landscape.natural',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#023e58'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#283d6a'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#6f9ba5'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#1d2c4d'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#304a7d'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#98a5be'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#1d2c4d'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#2c669a'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#255763'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#b0d8d4'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#023e58'
          }
        ]
      },
      {
        'featureType': 'transit',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#98a5be'
          }
        ]
      },
      {
        'featureType': 'transit',
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#1d2c4d'
          }
        ]
      },
      {
        'featureType': 'transit.line',
        'elementType': 'geometry.fill',
        'stylers': [
          {
            'color': '#283d6a'
          }
        ]
      },
      {
        'featureType': 'transit.station',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#3a4762'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#0e1626'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#4e6d70'
          }
        ]
      }
    ];
  }

  getNightMapStyle(): google.maps.MapTypeStyle[] {
    return [
      {
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#242f3e'
          }
        ]
      },
      {
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#746855'
          }
        ]
      },
      {
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#242f3e'
          }
        ]
      },
      {
        'featureType': 'administrative.locality',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#d59563'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#d59563'
          }
        ]
      },
      {
        'featureType': 'poi.park',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#263c3f'
          }
        ]
      },
      {
        'featureType': 'poi.park',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#6b9a76'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#38414e'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#212a37'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9ca5b3'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#746855'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#1f2835'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#f3d19c'
          }
        ]
      },
      {
        'featureType': 'transit',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#2f3948'
          }
        ]
      },
      {
        'featureType': 'transit.station',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#d59563'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#17263c'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#515c6d'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#17263c'
          }
        ]
      }
    ];
  }

  getRetroMapStyle(): google.maps.MapTypeStyle[] {
    return [
      {
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#ebe3cd'
          }
        ]
      },
      {
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#523735'
          }
        ]
      },
      {
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#f5f1e6'
          }
        ]
      },
      {
        'featureType': 'administrative',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#c9b2a6'
          }
        ]
      },
      {
        'featureType': 'administrative.land_parcel',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#dcd2be'
          }
        ]
      },
      {
        'featureType': 'administrative.land_parcel',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#ae9e90'
          }
        ]
      },
      {
        'featureType': 'landscape.natural',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#dfd2ae'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#c6ab79'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#766914'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#f5f1e6'
          }
        ]
      },
      {
        'featureType': 'road.arterial',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#fdfcf8'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#f8c967'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry.stroke',
        'stylers': [
          {
            'color': '#e9bc62'
          }
        ]
      },
      {
        'featureType': 'road.local',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#fbfaf7'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#a4c4df'
          }
        ]
      }
    ];
  }

  getSilverMapStyle(): google.maps.MapTypeStyle[] {
    return [
      {
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#f5f5f5'
          }
        ]
      },
      {
        'elementType': 'labels.icon',
        'stylers': [
          {
            'visibility': 'off'
          }
        ]
      },
      {
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#616161'
          }
        ]
      },
      {
        'elementType': 'labels.text.stroke',
        'stylers': [
          {
            'color': '#f5f5f5'
          }
        ]
      },
      {
        'featureType': 'administrative',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#c9c9c9'
          }
        ]
      },
      {
        'featureType': 'administrative.country',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9e9e9e'
          }
        ]
      },
      {
        'featureType': 'administrative.land_parcel',
        'stylers': [
          {
            'visibility': 'off'
          }
        ]
      },
      {
        'featureType': 'administrative.locality',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#bdbdbd'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#eeeeee'
          }
        ]
      },
      {
        'featureType': 'poi',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#757575'
          }
        ]
      },
      {
        'featureType': 'poi.park',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#e5e5e5'
          }
        ]
      },
      {
        'featureType': 'poi.park',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9e9e9e'
          }
        ]
      },
      {
        'featureType': 'road',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#ffffff'
          }
        ]
      },
      {
        'featureType': 'road.arterial',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#757575'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#dadada'
          }
        ]
      },
      {
        'featureType': 'road.highway',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#616161'
          }
        ]
      },
      {
        'featureType': 'road.local',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9e9e9e'
          }
        ]
      },
      {
        'featureType': 'transit.line',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#e5e5e5'
          }
        ]
      },
      {
        'featureType': 'transit.station',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#eeeeee'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [
          {
            'color': '#c9c9c9'
          }
        ]
      },
      {
        'featureType': 'water',
        'elementType': 'labels.text.fill',
        'stylers': [
          {
            'color': '#9e9e9e'
          }
        ]
      }
    ];
  }
}