import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, fromEvent, map, Observable, pairwise, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { AgmMap, LatLngBounds, LatLngBoundsLiteral } from '@agm/core';
import { Store } from '@ngrx/store';

import { Marker } from '@shared/models/marker.model';
import { Car } from '@shared/models/car.model';
import { AppState } from '../../../../core/store';
import { selectMapZoom } from '../../../../core/store/selectors/ui.selectors';
import { UpdateMapZoom } from '../../../../core/store/actions/ui.actions';
import { LocationService } from '../../../../core/services/location.service';
import { DEFAULT_MAP_CONFIG } from './cars-map.config';
import { MapConfig } from './cars-map.model';
import { environment } from '../../../../../environments/environment';
import { Router } from '@angular/router';
import { SoundService } from '@core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';
import { MapMarkerClusterer } from '@googlemaps/markerclusterer';



@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarsMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild(AgmMap) agmMap: AgmMap | undefined;
  @ViewChild('mapWrapper') mapWrapper: ElementRef | undefined;
  @Output() boundsChange: EventEmitter<LatLngBoundsLiteral> = new EventEmitter<LatLngBoundsLiteral>();
  @Input() cars: Car[] | null = null;
  @Input() selectedCar: Car | null = null;

  public mapConfig: MapConfig = DEFAULT_MAP_CONFIG;
  public mapZoom$: Observable<number>;
  public currentPosition: any;
  public showMapControls = environment.showMapControls;
  public mapReady = false;
  public markerClusterer?: MapMarkerClusterer;

  private readonly destroy$ = new Subject<void>();
  private readonly mapBounds$ = new BehaviorSubject<LatLngBoundsLiteral | null>(null);
  private readonly updateBounds$ = new Subject<void>();
  private readonly refreshMarkers$ = new Subject<void>();
  private readonly internalMarkers$ = new BehaviorSubject<Marker[]>([]);

  constructor(
    private store: Store<AppState>,
    private locationService: LocationService,
    private cdRef: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone,
    private soundService: SoundService
  ) {
    this.mapZoom$ = this.store.select(selectMapZoom);
  }

  ngAfterViewInit(): void {
    this.initMap().then(() => {
      this.mapReady = true;
      this.cdRef.detectChanges();
    });

    this.mapBounds$.pipe(
      pairwise(),
      filter(([prev, current]) => {
        if (!prev || !current) {
          return true;
        }

        const northEastLatDiff = Math.abs(prev.northEast.lat - current.northEast.lat);
        const northEastLngDiff = Math.abs(prev.northEast.lng - current.northEast.lng);
        const southWestLatDiff = Math.abs(prev.southWest.lat - current.southWest.lat);
        const southWestLngDiff = Math.abs(prev.southWest.lng - current.southWest.lng);

        return northEastLatDiff > 0.005 || northEastLngDiff > 0.005 || southWestLatDiff > 0.005 || southWestLngDiff > 0.005;
      }),
      debounceTime(200),
      tap(([, current]) => {
        if (current) {
          this.boundsChange.emit(current);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    this.updateBounds$.pipe(
      debounceTime(100),
      tap(() => {
        this.updateMapBounds();
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    this.refreshMarkers$.pipe(
      debounceTime(100),
      tap(() => {
        this.updateMarkers();
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    combineLatest([
      this.mapZoom$.pipe(distinctUntilChanged()),
      this.internalMarkers$
    ]).pipe(
      debounceTime(100),
      tap(() => {
        this.updateMarkersVisibility();
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    if (this.mapWrapper) {
      fromEvent(this.mapWrapper.nativeElement, 'wheel', { passive: true }).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.soundService.playScrollSound();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMapReady(): void {
    this.updateBounds$.next();
    this.refreshMarkers$.next();
  }

  onZoomChange(zoom: number): void {
    this.store.dispatch(new UpdateMapZoom(zoom));
  }

  onBoundsChange(bounds: LatLngBounds): void {
    this.mapBounds$.next(bounds.toJSON());
  }

  async initMap(): Promise<void> {
    try {
      this.currentPosition = await this.locationService.getCurrentPosition();
    } catch (error) {
      console.error('Error getting current position:', error);
    }
  }

  async updateMarkers(): Promise<void> {
    if (!this.agmMap || !this.cars) {
      return;
    }

    const map = await this.agmMap.map;

    if (!map) {
      return;
    }

    const markers = this.cars.map(car => {
      const marker = new google.maps.Marker({
        position: new google.maps.LatLng(car.latitude, car.longitude),
        optimized: true,
        clickable: true,
        title: car.name,
        zIndex: 1,
        icon: {
          url: '/assets/img/map-marker.svg',
          scaledSize: new google.maps.Size(40, 54)
        },
      });

      marker.addListener('click', () => {
        this.ngZone.run(() => {
          this.router.navigate(['/rent-car', car.id]);
        });
      });

      return marker;
    });

    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }

    this.markerClusterer = new MapMarkerClusterer({
      map,
      markers,
    });

    this.internalMarkers$.next(markers);
  }

  async updateMapBounds(): Promise<void> {
    if (!this.agmMap || !this.cars || !this.cars.length) {
      return;
    }

    const map = await this.agmMap.map;

    if (!map) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    this.cars.forEach(car => {
      bounds.extend(new google.maps.LatLng(car.latitude, car.longitude));
    });

    map.fitBounds(bounds);
  }

  private async updateMarkersVisibility(): Promise<void> {
    if (!this.agmMap) {
      return;
    }

    const map = await this.agmMap.map;

    if (!map) {
      return;
    }

    const zoom = await map.getZoom();

    this.internalMarkers$.value.forEach(marker => {
      if (zoom && zoom >= 12) {
        marker.setMap(map);
      } else {
        marker.setMap(null);
      }
    });
  }

  // private fitBoundsToVisibleMarkers(): void {
  //   if (!this.agmMap) {
  //     return;
  //   }

  //   this.agmMap.fitBounds(this.getBoundsForVisibleMarkers());
  // }

  // private getBoundsForVisibleMarkers(): LatLngBounds {
  //   const bounds: LatLngBounds = new google.maps.LatLngBounds();

  //   this.markers.forEach(m => {
  //     if (m.getVisible()) {
  //       bounds.extend(m.getPosition());
  //     }
  //   });

  //   return bounds;
  // }

  // private updateMap(): void {
  //   this.locationService.getCurrentPosition().then(position => {
  //     this.currentPosition = position;
  //     this.cdRef.detectChanges();
  //   });
  // }

  // private initMapListeners(): void {
  //   this.agmMap?.mapReady.subscribe(map => {
  //     map.addListener('dragend', () => {
  //       this.updateMap();
  //     });
  //   });
  // }

  // private updateMarkers(): void {
  //   this.cars?.forEach(car => {
  //     const marker = new google.maps.Marker({
  //       position: new google.maps.LatLng(car.latitude, car.longitude),
  //       map: this.map,
  //       title: car.name
  //     });

  //     marker.addListener('click', () => {
  //       this.router.navigate(['/rent-car', car.id]);
  //     });
  //   });
  // }

  // private updateMapBounds(): void {
  //   if (this.cars && this.map) {
  //     const bounds = new google.maps.LatLngBounds();

  //     this.cars.forEach(car => {
  //       bounds.extend(new google.maps.LatLng(car.latitude, car.longitude));
  //     });

  //     this.map.fitBounds(bounds);
  //   }
  // }

  // private updateMarkersVisibility(): void {
  //   if (this.map) {
  //     this.markers.forEach(marker => {
  //       marker.setVisible(this.map?.getZoom() >= 12);
  //     });
  //   }
  // }

  // private fitBoundsToVisibleMarkers(): void {
  //   if (this.map) {
  //     const bounds = new google.maps.LatLngBounds();

  //     this.markers.forEach(m => {
  //       if (m.getVisible()) {
  //         bounds.extend(m.getPosition());
  //       }
  //     });

  //     this.map.fitBounds(bounds);
  //   }
  // }
}