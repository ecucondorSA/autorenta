import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { FeatureCollection, Geometry, Feature } from 'geojson';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { MapboxGeoJSONFeature } from 'mapbox-gl';

import { selectIsMobile } from '@app/core/store/ui/ui.selectors';
import { environment } from '@env/environment';
import { IRentalPoint } from '@app/core/services/rental-points/rental-point.interface';
import { RentalPointsService } from '@app/core/services/rental-points/rental-points.service';
import { IVehicle } from '@app/shared/interfaces/vehicle.interface';
import { VehiclesService } from '@app/core/services/vehicles/vehicles.service';
import { IFilter } from '@app/shared/components/cars-filter/cars-filter.component';
import { SoundService } from '@app/core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';


interface ICluster extends Feature {
  properties: {
    cluster: boolean;
    cluster_id: number;
    point_count: number;
  };
  geometry: Geometry;
}

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rentalPoints: IRentalPoint[] | null = null;
  @Input() filters: IFilter | null = null;
  @Input() selectedVehicleId: number | null = null;
  @Input() zoomToVehicle: boolean = false;
  @Input() vehicles: IVehicle[] | null = null;
  @Input() isLoading: boolean = false;
  @Input() mapStyle: string = 'mapbox://styles/mapbox/streets-v12';
  @Input() showTooltips: boolean = true;
  @Input() enableClustering: boolean = true;
  @Input() clusterRadius: number = 50;
  @Input() clusterMaxZoom: number = 14;

  readonly accessToken = environment.mapbox.accessToken;

  isMobile$: Observable<boolean>;
  vehicleFeatures$: Observable<FeatureCollection<Geometry, any>>;
  rentalPointFeatures$: Observable<FeatureCollection<Geometry, any>>;
  showRentalPoints$ = new BehaviorSubject(false);
  mapCenter$ = new BehaviorSubject<[number, number]>([-73.9857, 40.7589]);
  mapZoom$ = new BehaviorSubject<number>(10);
  selectedFeatureId$ = new BehaviorSubject<number | null>(null);
  isMapLoaded$ = new BehaviorSubject<boolean>(false);
  isTooltipEnabled = true;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private rentalPointsService: RentalPointsService,
    private vehiclesService: VehiclesService,
    private soundService: SoundService
  ) {
    this.isMobile$ = this.store.select(selectIsMobile);

    this.vehicleFeatures$ = combineLatest([
      this.vehiclesService.getVehiclesFeatures(),
      this.selectedFeatureId$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([featureCollection, selectedFeatureId]) => {
        if (selectedFeatureId) {
          featureCollection.features = featureCollection.features.map((feature: any) => {
            if (feature.properties.id === selectedFeatureId) {
              feature.properties.isSelected = true;
            } else {
              feature.properties.isSelected = false;
            }

            return feature;
          });
        }

        return featureCollection;
      })
    );

    this.rentalPointFeatures$ = this.rentalPointsService.getRentalPointsFeatures();
  }

  ngOnInit(): void {
    this.isMobile$.pipe(takeUntil(this.destroy$)).subscribe((isMobile) => {
      this.isTooltipEnabled = !isMobile;
    });

    this.selectedFeatureId$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe((vehicleId) => {
        if (vehicleId) {
          this.soundService.play('select-vehicle');
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['zoomToVehicle']?.currentValue === true && this.selectedVehicleId) {
      this.vehiclesService
        .getVehicle(this.selectedVehicleId)
        .pipe(
          filter((vehicle) => !!vehicle),
          takeUntil(this.destroy$)
        )
        .subscribe((vehicle) => {
          if (vehicle) {
            this.flyTo(vehicle);
          }
        });
    }

    if (changes['vehicles']?.currentValue) {
      if (this.vehicles && this.vehicles.length === 1) {
        this.flyTo(this.vehicles[0]);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMapLoaded(): void {
    this.isMapLoaded$.next(true);
  }

  onShowRentalPointsChange(): void {
    this.showRentalPoints$.next(!this.showRentalPoints$.value);
  }

  onFeatureClick(event: MapboxGeoJSONFeature):
    void {
    if (event.source === 'rental-points') {
      const rentalPointId = event.properties?.['id'];

      this.router.navigate(['/rent-a-car/location', rentalPointId]);
    }

    if (event.source === 'vehicles') {
      const vehicleId = event.properties?.['id'];

      this.router.navigate(['/rent-a-car/car-details', vehicleId]);
      this.selectedFeatureId$.next(vehicleId);
    }
  }

  onClusterClick(event: ICluster): void {
    const features = this.getClusterLeaves(event.properties.cluster_id);
    const lngLat = event.geometry.coordinates as [number, number];

    if (features.length) {
      this.flyToCoordinates(lngLat, 14);
    }
  }

  createPopup(feature: any): HTMLElement {
    const popupComponent = new EnhancedMapTooltipComponent();

    popupComponent.feature = feature;
    popupComponent.isMobile = !this.isTooltipEnabled;

    popupComponent.closeEvent.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const popup = document.querySelector('.mapboxgl-popup');

      if (popup) {
        popup.remove();
      }
    });

    popupComponent.ngOnInit();

    return popupComponent.elementRef.nativeElement;
  }

  private flyTo(vehicle: IVehicle): void {
    if (vehicle.longitude && vehicle.latitude) {
      this.flyToCoordinates([vehicle.longitude, vehicle.latitude], 14);
    }
  }

  private flyToCoordinates(coords: [number, number], zoom: number): void {
    this.mapCenter$.next(coords);
    this.mapZoom$.next(zoom);
  }

  private getClusterLeaves(clusterId: number, limit: number = 1000): any[] {
    return (window as any).map.getSource('vehicles-source').getClusterLeaves(clusterId, limit, 0);
  }

  // TODO: Remove this code once the design is finalized
  // The colors are not used anywhere
  private setColors(): void {
    const _colorAvailable = '#00FF00';
    const _colorSoon = '#FFFF00';
    const _colorInUse = '#FFA500';
    const _colorUnavailable = '#FF0000';
  }
}
