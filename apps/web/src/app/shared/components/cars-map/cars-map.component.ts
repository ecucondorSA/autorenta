import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, filter, fromEvent, map, Observable, Subject, takeUntil, tap } from 'rxjs';
import { Feature, Geometry, Point } from 'geojson';
import { LngLat, LngLatBounds, Map } from 'maplibre-gl';

import { AppState } from '@store/app.state';
import { Car } from '@models/car.model';
import { CarsSelectors } from '@store/cars/cars.selectors';
import { MapService } from '@core/services/map.service';
import { getFeatureColor } from '@utils/get-feature-color.util';
import { SoundService } from '@core/services/ui/sound.service';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [EnhancedMapTooltipComponent],
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() selectedCarId: string | null = null;
  @ViewChild('mapContainer') mapContainer: ElementRef | undefined;

  readonly cars$: Observable<Car[]> = this.store.select(CarsSelectors.selectAllCars);
  readonly selectedCar$: Observable<Car | undefined> = this.store.select(CarsSelectors.selectSelectedCar);

  private readonly destroy$ = new Subject<void>();
  private readonly features$ = new BehaviorSubject<Feature<Geometry, { [name: string]: any }>[]>([]);

  map: Map | undefined;
  style = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';
  center: LngLat = new LngLat(8.6821275, 49.3194134);
  zoom = 12;

  constructor(
    private readonly store: Store<AppState>,
    private readonly mapService: MapService,
    private readonly translateService: TranslateService,
    private readonly soundService: SoundService
  ) {}

  ngAfterViewInit() {
    if (!this.mapContainer) {
      return;
    }

    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style: this.style,
      center: this.center,
      zoom: this.zoom,
    });

    this.map.on('load', () => {
      fromEvent(this.map as Map, 'mousemove')
        .pipe(
          takeUntil(this.destroy$),
          tap(() => {
            // this.popup.remove();
          })
        )
        .subscribe();

      this.mapService.addImages(this.map as Map);

      combineLatest([this.cars$, this.selectedCar$])
        .pipe(
          takeUntil(this.destroy$),
          tap(([cars, selectedCar]) => {
            this.setMapData(cars, selectedCar);
          })
        )
        .subscribe();

      this.features$
        .pipe(
          filter((features) => !!features.length),
          takeUntil(this.destroy$),
          tap((features) => {
            this.mapService.addSource(this.map as Map, features);
          })
        )
        .subscribe();

      this.features$
        .pipe(
          filter((features) => !!features.length),
          takeUntil(this.destroy$),
          tap((features) => {
            this.mapService.addLayer(this.map as Map, features);
          })
        )
        .subscribe();

      this.map.on('click', (event) => {
        const features = this.map?.queryRenderedFeatures(event.point, {
          layers: ['cars'],
        });

        if (!features?.length) {
          return;
        }

        const feature = features[0];

        this.map?.flyTo({
          center: feature.geometry.coordinates as [number, number],
          zoom: 14,
          essential: true,
        });

        // this.popup
        //   .setLngLat(feature.geometry.coordinates as [number, number])
        //   .setDOMContent(this.mapService.generatePopupContent(feature, this.translateService))
        //   .addTo(this.map as Map);

        this.soundService.play('map-marker-click');
      });

      this.map.on('mouseenter', 'cars', () => {
        (this.map as Map).getCanvas().style.cursor = 'pointer';
      });

      this.map.on('mouseleave', 'cars', () => {
        (this.map as Map).getCanvas().style.cursor = '';
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedCarId']?.currentValue) {
      this.cars$
        .pipe(
          takeUntil(this.destroy$),
          takeUntil(this.destroy$),
          tap((cars) => {
            const selectedCar = cars.find((car) => car.id === this.selectedCarId);

            if (!selectedCar) {
              return;
            }

            this.map?.flyTo({
              center: [selectedCar.longitude, selectedCar.latitude],
              zoom: 14,
              essential: true,
            });
          })
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setMapData(cars: Car[], selectedCar: Car | undefined): void {
    if (!cars.length) {
      return;
    }

    const features: Feature<Geometry, { [name: string]: any }>[] = cars.map((car) => {
      const feature: Feature<Geometry, { [name: string]: any }> = {
        type: 'Feature',
        properties: {
          id: car.id,
          description: `<strong>${car.model}</strong><p>${car.licensePlate}</p>`,
          icon: 'car',
          available: car.isAvailable,
          soon: car.isSoonAvailable,
          inUse: !car.isAvailable && !car.isSoonAvailable,
          selected: car.id === selectedCar?.id,
        },
        geometry: {
          type: 'Point',
          coordinates: [car.longitude, car.latitude],
        },
      };

      return feature;
    });

    this.features$.next(features);

    if (this.map) {
      const bounds = new LngLatBounds();

      cars.forEach((car) => {
        bounds.extend(new LngLat(car.longitude, car.latitude));
      });

      try {
        this.map.fitBounds(bounds, {
          padding: 100,
          duration: 0,
        });
      } catch (error) {
        console.warn(error);
      }
    }
  }

  getFeatureColor(feature: Feature<Point, { [name: string]: any }>): string {
    return getFeatureColor(feature.properties);
  }

  // TODO: Remove this once design is implemented
  colorAvailable = 'green';
  colorSoon = 'orange';
  colorInUse = 'red';
  colorUnavailable = 'grey';
}
