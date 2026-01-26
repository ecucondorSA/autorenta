import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, fromEvent, map, Observable, of, pairwise, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { CarWithMetadata } from '@core/interfaces/car-with-metadata';
import { environment } from '@env/environment';
import { MapService } from '@core/services/map.service';
import { Router } from '@angular/router';
import { UiService } from '@core/services/ui/ui.service';
import { SoundService } from '@core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

// import '@types/googlemaps';

interface MarkerData {
  marker: google.maps.Marker;
  car: CarWithMetadata;
}

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @Input() cars: CarWithMetadata[] | null = null;
  @Input() selectedCarId: number | null = null;
  @Output() selectedCarChange = new EventEmitter<number>();
  @Output() mapIdle = new EventEmitter<void>();
  map: google.maps.Map | null = null;
  markersData: MarkerData[] = [];
  private readonly destroy$ = new Subject<void>();
  private readonly mapReady$ = new BehaviorSubject<boolean>(false);
  private readonly cars$ = new BehaviorSubject<CarWithMetadata[]>([]);
  private readonly selectedCarId$ = new BehaviorSubject<number | null>(null);
  private infoWindow: google.maps.InfoWindow | null = null;
  private mapInitialized = false;
  private defaultZoom = 12;
  private readonly localStorageKey = 'map_position';
  private initialPositionLoaded = false;
  private readonly initialLat = 52.52;
  private readonly initialLng = 13.41;
  private readonly initialZoom = 6;
  private currentZoom: number | undefined;
  private currentLat: number | undefined;
  private currentLng: number | undefined;
  private mapTooltipComponent: any;
  private mapTooltip: any;

  constructor(
    private readonly mapService: MapService,
    private readonly router: Router,
    private readonly uiService: UiService,
    private readonly soundService: SoundService,
    private readonly zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    this.mapService
      .loadMap()
      .pipe(
        take(1),
        tap(() => {
          this.initMap();
          this.mapReady$.next(true);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();

    fromEvent(window, 'resize')
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.resizeMap();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && changes['cars'].currentValue !== changes['cars'].previousValue) {
      this.cars$.next(this.cars || []);
    }

    if (changes['selectedCarId'] && changes['selectedCarId'].currentValue !== changes['selectedCarId'].previousValue) {
      this.selectedCarId$.next(this.selectedCarId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initMap(): void {
    if (!this.mapContainer) {
      console.error('Map container not found');

      return;
    }

    const storedPosition = this.getStoredMapPosition();

    let initialMapConfig;

    if (storedPosition) {
      initialMapConfig = {
        center: new google.maps.LatLng(storedPosition.lat, storedPosition.lng),
        zoom: storedPosition.zoom,
      };
      this.initialPositionLoaded = true;
    } else {
      initialMapConfig = {
        center: new google.maps.LatLng(this.initialLat, this.initialLng),
        zoom: this.initialZoom,
      };
    }

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      ...initialMapConfig,
      mapId: environment.googleMapsMapId,
      disableDefaultUI: true,
      zoomControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });

    this.mapInitialized = true;

    this.setupMapListeners();
    this.setupCarsSubscription();
    this.setupSelectedCarIdSubscription();
    this.initMapTooltip();
  }

  private setupMapListeners(): void {
    if (!this.map) {
      return;
    }

    this.map.addListener('idle', () => {
      this.currentZoom = this.map?.getZoom();
      this.currentLat = this.map?.getCenter().lat();
      this.currentLng = this.map?.getCenter().lng();

      if (this.currentZoom && this.currentLat && this.currentLng) {
        this.storeMapPosition(this.currentLat, this.currentLng, this.currentZoom);
      }

      this.zone.run(() => {
        this.mapIdle.emit();
      });
    });
  }

  private setupCarsSubscription(): void {
    combineLatest([this.mapReady$, this.cars$])
      .pipe(
        filter(([mapReady, cars]) => mapReady && !!cars),
        takeUntil(this.destroy$),
      )
      .subscribe(([_, cars]) => {
        this.clearMarkers();
        this.addMarkers(cars);
      });
  }

  private setupSelectedCarIdSubscription(): void {
    combineLatest([this.mapReady$, this.selectedCarId$])
      .pipe(
        filter(([mapReady, selectedCarId]) => mapReady && selectedCarId !== null),
        distinctUntilChanged((a, b) => a[1] === b[1]),
        takeUntil(this.destroy$),
      )
      .subscribe(([_, selectedCarId]) => {
        this.panToCar(selectedCarId as number);
      });
  }

  private addMarkers(cars: CarWithMetadata[]): void {
    if (!this.map) {
      return;
    }

    cars.forEach((car) => {
      if (car.latitude && car.longitude) {
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(car.latitude, car.longitude),
          map: this.map,
          title: car.name,
          icon: {
            url: '/assets/images/map-marker.svg',
            scaledSize: new google.maps.Size(40, 57),
          },
        });

        marker.addListener('click', () => {
          this.onMarkerClick(car);
        });

        this.markersData.push({
          marker,
          car,
        });
      }
    });
  }

  private clearMarkers(): void {
    this.markersData.forEach((markerData) => {
      markerData.marker.setMap(null);
    });
    this.markersData = [];
  }

  private panToCar(carId: number): void {
    const car = this.cars$.value.find((car) => car.id === carId);

    if (!car || !this.map) {
      return;
    }

    this.map.panTo(new google.maps.LatLng(car.latitude, car.longitude));

    if (this.map.getZoom() < this.defaultZoom) {
      this.map.setZoom(this.defaultZoom);
    }
  }

  private storeMapPosition(lat: number, lng: number, zoom: number): void {
    localStorage.setItem(this.localStorageKey, JSON.stringify({ lat, lng, zoom }));
  }

  private getStoredMapPosition(): { lat: number; lng: number; zoom: number } | null {
    const storedPosition = localStorage.getItem(this.localStorageKey);

    if (storedPosition) {
      try {
        return JSON.parse(storedPosition);
      } catch (e) {
        return null;
      }
    }

    return null;
  }

  private resizeMap(): void {
    if (this.map) {
      google.maps.event.trigger(this.map, 'resize');
      // Restore the last known center after the resize event.
      if (this.currentLat && this.currentLng) {
        this.map.setCenter(new google.maps.LatLng(this.currentLat, this.currentLng));
      }
    }
  }

  private onMarkerClick(car: CarWithMetadata): void {
    this.soundService.play('click');
    this.zone.run(() => {
      this.selectedCarChange.emit(car.id);
      this.router.navigate(['/rent-car', car.id]);
    });
  }

  private initMapTooltip() {
    if (!this.map) {
      return;
    }

    this.mapTooltipComponent = this.uiService.createComponent(EnhancedMapTooltipComponent);
    this.mapTooltip = new google.maps.OverlayView();
    this.mapTooltip.setMap(this.map);
    this.mapTooltip.draw = () => {};
  }

  showTooltip(car: CarWithMetadata, point: google.maps.Point) {
    if (!this.mapTooltipComponent || !this.map) {
      return;
    }

    this.mapTooltipComponent.instance.car = car;
    this.mapTooltipComponent.changeDetectorRef.detectChanges();

    const panes = this.mapTooltip.getPanes();

    if (!panes) {
      return;
    }

    panes.floatPane.appendChild(this.mapTooltipComponent.location.nativeElement);

    const div = this.mapTooltipComponent.location.nativeElement;

    div.style.position = 'absolute';
    div.style.top = point.y - 100 + 'px';
    div.style.left = point.x - 50 + 'px';
  }

  hideTooltip() {
    if (!this.mapTooltipComponent) {
      return;
    }

    const div = this.mapTooltipComponent.location.nativeElement;

    if (div && div.parentNode) {
      div.parentNode.removeChild(div);
    }
  }

  getPixelPosition(lat: number, lng: number): google.maps.Point | null {
    if (!this.map) {
      return null;
    }

    const latLng = new google.maps.LatLng(lat, lng);
    const overlayProjection = this.mapTooltip.getProjection(); // as google.maps.MapCanvasProjection;

    return overlayProjection?.fromLatLngToContainerPixel(latLng) || null;
  }

  // TODO: use theme colors
  // private colorAvailable = '#34c759';
  // private colorSoon = '#007aff';
  // private colorInUse = '#ff9500';
  // private colorUnavailable = '#ff3b30';

  // private readonly defaultIcon = {
  //   path: google.maps.SymbolPath.CIRCLE,
  //   scale: 7,
  //   fillColor: this.colorAvailable,
  //   fillOpacity: 0.9,
  //   strokeWeight: 0.5,
  //   strokeColor: '#fff',
  // };

  // private readonly soonIcon = {
  //   path: google.maps.SymbolPath.CIRCLE,
  //   scale: 7,
  //   fillColor: this.colorSoon,
  //   fillOpacity: 0.9,
  //   strokeWeight: 0.5,
  //   strokeColor: '#fff',
  // };

  // private readonly inUseIcon = {
  //   path: google.maps.SymbolPath.CIRCLE,
  //   scale: 7,
  //   fillColor: this.colorInUse,
  //   fillOpacity: 0.9,
  //   strokeWeight: 0.5,
  //   strokeColor: '#fff',
  // };

  // private readonly unavailableIcon = {
  //   path: google.maps.SymbolPath.CIRCLE,
  //   scale: 7,
  //   fillColor: this.colorUnavailable,
  //   fillOpacity: 0.9,
  //   strokeWeight: 0.5,
  //   strokeColor: '#fff',
  // };
}
