import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, fromEvent, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { CarWithDistance } from '@core/interfaces/car-with-distance';
import { DEFAULT_LOCATION, DEFAULT_ZOOM } from '@core/constants/google-maps';
import { GoogleMap } from '@angular/google-maps';
import { Cluster } from '@googlemaps/markerclusterer';
import { Router } from '@angular/router';
import { SoundService } from '@core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';


interface CustomCluster extends Cluster {
  cars: CarWithDistance[];
}

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild(GoogleMap) map!: GoogleMap;
  @ViewChild('search') searchInput!: ElementRef;
  @Output() carClick = new EventEmitter<string>();
  @Output() mapIdle = new EventEmitter<void>();
  @Input() cars: CarWithDistance[] = [];
  @Input() showTooltips = true;
  @Input() showSearch = false;
  @Input() mapHeight = '500px';
  @Input() mapWidth = '100%';
  @Input() defaultLocation: { lat: number, lng: number } = DEFAULT_LOCATION;
  @Input() defaultZoom = DEFAULT_ZOOM;
  @Input() enableClusters = true;
  @Input() clusterStyles: any[] = [
    {
      textColor: 'white',
      url: '/assets/images/cluster-icon.svg',
      height: 53,
      width: 52
    }
  ];

  apiLoaded: Observable<boolean>;
  mapOptions: google.maps.MapOptions = {
    backgroundColor: '#D4D4D4',
    mapId: 'bca8544e9004179d',
    gestureHandling: 'greedy',
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };
  locationOptions = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 10000
  };
  markers = new BehaviorSubject<CarWithDistance[]>([]);
  center: google.maps.LatLngLiteral = DEFAULT_LOCATION;
  zoom = DEFAULT_ZOOM;
  destroy$ = new Subject<void>();
  geocoder = new google.maps.Geocoder();
  infoWindow: google.maps.InfoWindow | null = null;
  currentCarId: string | null = null;
  isTooltipOpen = false;
  clusterOptions = {
    algorithm: 'grid',
    maxZoom: 15,
  };

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private soundService: SoundService
  ) {
    this.apiLoaded = of(true);
  }

  ngOnInit() {
    this.center = this.defaultLocation;
    this.zoom = this.defaultZoom;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.zoom = 12;
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        this.locationOptions
      );
    }

    this.markers.next(this.cars);
  }

  ngAfterViewInit(): void {
    if (this.showSearch) {
      this.initSearchListener();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && changes['cars'].currentValue !== changes['cars'].previousValue) {
      this.markers.next(this.cars);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initSearchListener(): void {
    fromEvent(this.searchInput.nativeElement, 'keyup')
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map(() => this.searchInput.nativeElement.value),
        switchMap(searchTerm => this.geocodeAddress(searchTerm)),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        if (result) {
          this.center = result.latLng;
          this.zoom = result.zoom;
          this.map.panTo(result.latLng);
          this.map.zoom = result.zoom;
        }
      });
  }

  geocodeAddress(address: string): Observable<{ latLng: google.maps.LatLngLiteral, zoom: number } | null> {
    return new Observable(observer => {
      this.geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          this.ngZone.run(() => {
            const location = results[0].geometry.location;
            observer.next({
              latLng: { lat: location.lat(), lng: location.lng() },
              zoom: 15
            });
            observer.complete();
          });
        } else {
          console.error('Geocode was not successful for the following reason:', status);
          this.ngZone.run(() => {
            observer.next(null);
            observer.complete();
          });
        }
      });
    });
  }

  onClusterClick(cluster: CustomCluster) {
    this.soundService.play('click');
    const car = cluster.cars[0];
    this.router.navigate(['/dashboard/car', car.id]);
  }

  markerClick(car: CarWithDistance) {
    this.soundService.play('click');
    this.carClick.emit(car.id);
  }

  zoomIn() {
    if (this.map.getZoom()! < this.map.maxZoom!) this.map.zoomIn();
  }

  zoomOut() {
    if (this.map.getZoom()! > this.map.minZoom!) this.map.zoomOut();
  }

  mapReady(m: google.maps.Map) {
    //console.log('map ready', m);
  }

  mapClusterClick(cluster: any) {
    console.log('mapClusterClick', cluster);
  }

  onMapIdle() {
    this.mapIdle.emit();
  }

  closeTooltip() {
    this.isTooltipOpen = false;
    this.currentCarId = null;
  }

  openTooltip(id: string) {
    this.currentCarId = id;
    this.isTooltipOpen = true;
  }

  getCarById(id: string): CarWithDistance | undefined {
    return this.cars.find(car => car.id === id);
  }

  clusterCount(count: number): string {
    if (count > 1000) {
      return Math.floor(count / 1000) + 'k';
    }
    return count.toString();
  }

  getTooltipComponent(): typeof EnhancedMapTooltipComponent {
    return EnhancedMapTooltipComponent;
  }

  getMarkers(): CarWithDistance[] {
    return this.markers.value;
  }

  // Unused variables, keeping them commented out for now in case they are needed later
  // colorAvailable = '#4CAF50';
  // colorSoon = '#FF9800';
  // colorInUse = '#F44336';
  // colorUnavailable = '#9E9E9E';

  getMarkerOptions(car: CarWithDistance): google.maps.MarkerOptions {
    let icon;
    switch (car.status) {
      case 'available':
        icon = { url: '/assets/images/map-icons/available.svg', scaledSize: new google.maps.Size(30, 48) };
        break;
      case 'soon':
        icon = { url: '/assets/images/map-icons/soon.svg', scaledSize: new google.maps.Size(30, 48) };
        break;
      case 'in_use':
        icon = { url: '/assets/images/map-icons/in_use.svg', scaledSize: new google.maps.Size(30, 48) };
        break;
      default:
        icon = { url: '/assets/images/map-icons/unavailable.svg', scaledSize: new google.maps.Size(30, 48) };
        break;
    }

    return {
      icon: icon,
      optimized: false, // required for custom icons
    };
  }

  clusterRender(cluster: any, zoom: any): google.maps.MarkerOptions {
    const count = cluster.count;
    let icon;
    if (zoom < 12) {
      icon = {
        url: '/assets/images/cluster-icon.svg',
        scaledSize: new google.maps.Size(53, 52),
      };
    } else {
      if (count > 10) {
        icon = {
          url: '/assets/images/cluster-icon.svg',
          scaledSize: new google.maps.Size(53, 52),
        };
      } else {
        icon = {
          url: '/assets/images/cluster-icon.svg',
          scaledSize: new google.maps.Size(53, 52),
        };
      }
    }

    return {
      icon: icon,
      title: `Cluster of ${count} cars`,
      optimized: false,
    };
  }
}
