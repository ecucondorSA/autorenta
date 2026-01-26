import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, filter, firstValueFrom, fromEvent, interval, map, Observable, of, pairwise, shareReplay, startWith, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { FeatureCollection, Geometry, Point } from 'geojson';
import { Map, LngLat, LngLatBounds, Marker } from 'mapbox-gl';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';

import { selectFilters } from '@app/features/home/store/home.selectors';
import { Car } from '@app/interfaces/car.interface';
import { Filter } from '@app/interfaces/filter.interface';
import { selectCars } from '@app/store/car/car.selectors';
import { selectIsMobile } from '@app/store/app/app.selectors';
import { environment } from '@env/environment';
import { SoundService } from '@core/services/ui/sound.service';

import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

interface LngLatLike {
  lng: number;
  lat: number;
}

interface Cluster {
  id: number;
  count: number;
  geometry: Point;
  properties: any; // TODO: Define properties type
}

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer: ElementRef<HTMLDivElement> | undefined;
  @ViewChild('popup') popup: EnhancedMapTooltipComponent | undefined;
  @ViewChild('miniCard') miniCard: CarMiniCardComponent | undefined;

  @Input() cars: Car[] | null = null;
  @Input() selectedCar: Car | null = null;
  @Input() isLoading = false;
  @Input() isError = false;
  @Output() readonly carClicked = new EventEmitter<Car>();

  map: Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v12';
  lat = 37.75;
  lng = -122.41;
  zoom = 10;
  maxZoom = 18;
  minZoom = 8;
  clusterRadius = 50;
  clusterMaxZoom = 14;
  isMobile$ = this.store.select(selectIsMobile);
  filters$ = this.store.select(selectFilters);
  isMapLoaded$ = new BehaviorSubject(false);
  isDataLoaded$ = new BehaviorSubject(false);
  isFirstLoad = true;
  isFiltersInitialized = false;
  isMobile = false;
  markers: Record<string, Marker> = {};
  currentFilters: Filter | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly updateMarkers$ = new Subject<void>();
  private readonly flyToCar$ = new Subject<Car>();
  private readonly filtersInitialized$ = new BehaviorSubject<boolean>(false);
  private readonly mapPadding: { top: number; bottom: number; left: number; right: number } = {
    top: 100,
    bottom: 100,
    left: 100,
    right: 100
  };

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly store: Store,
    private readonly translate: TranslateService,
    private readonly ngZone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly soundService: SoundService
  ) {}

  ngAfterViewInit(): void {
    this.isMobile$.pipe(takeUntil(this.destroy$)).subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.initializeMap();

    combineLatest([this.isMapLoaded$, this.filters$])
      .pipe(
        takeUntil(this.destroy$),
        tap(([, filters]) => {
          if (filters && !this.isFiltersInitialized) {
            this.currentFilters = filters;
            this.isFiltersInitialized = true;
            this.filtersInitialized$.next(true);
          }
        }),
        filter(([isMapLoaded, filters]) => isMapLoaded && this.isFiltersInitialized),
        take(1)
      )
      .subscribe(() => {
        this.loadData();
      });

    this.updateMarkers$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateCarMarkers();
    });

    this.flyToCar$.pipe(takeUntil(this.destroy$)).subscribe((car) => {
      this.flyToCar(car);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedCar'] && changes['selectedCar'].currentValue) {
      this.flyToCar$.next(changes['selectedCar'].currentValue);
    }

    if (changes['cars'] && changes['cars'].currentValue) {
      this.isDataLoaded$.next(true);
      if (!this.isFirstLoad) {
        this.updateMarkers$.next();
      }
      this.isFirstLoad = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.remove();
  }

  flyToCar(car: Car): void {
    if (!this.map) {
      return;
    }

    const target = new LngLat(car.location.coordinates[0], car.location.coordinates[1]);
    this.map.flyTo({
      center: target,
      zoom: 15,
      essential: true
    });
  }

  onCarClicked(car: Car): void {
    this.carClicked.emit(car);
  }

  private initializeMap(): void {
    if (!this.mapContainer) {
      return;
    }

    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style: this.style,
      center: [this.lng, this.lat],
      zoom: this.zoom,
      accessToken: environment.mapbox.accessToken
    });

    this.map.addControl(new mapboxgl.NavigationControl());

    this.map.on('load', () => {
      this.isMapLoaded$.next(true);
      this.map?.resize();
    });

    this.map.on('style.load', () => {
      this.addSources();
      this.addLayers();
      this.map?.resize();
    });

    this.map.on('click', 'clusters', (e) => {
      if (!this.map) {
        return;
      }

      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;

      this.map
        .getSource('cars')
        .getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) {
            return;
          }

          this.map?.easeTo({
            center: (features[0].geometry as Point).coordinates as LngLatLike,
            zoom: zoom + 1,
            duration: 500
          });
        });
    });

    // When a click event occurs on a feature in
    // the unclustered-point layer, open a popup at
    // the location of the feature, with
    // description HTML from its properties.
    this.map.on('click', 'unclustered-point', (e) => {
      if (!this.map || !this.popup || !this.miniCard) {
        return;
      }

      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point']
      });

      if (!features.length) {
        return;
      }

      const feature = features[0];

      if (!feature.properties || !feature.geometry) {
        return;
      }

      const carId = feature.properties.carId;
      const car = this.cars?.find((car) => car.id === carId);

      if (!car) {
        return;
      }

      const coordinates = (feature.geometry as Point).coordinates.slice() as LngLatLike;

      // Ensure that if the map is zoomed out such that
      // multiple copies of the feature are visible,
      // the popup appears over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates.lng) > 180) {
        coordinates.lng += e.lngLat.lng > coordinates.lng ? 360 : -360;
      }

      this.miniCard.car = car;
      this.popup.car = car;
      this.cdr.detectChanges();

      new mapboxgl.Popup({ offset: [0, -15] })
        .setLngLat(coordinates)
        .setDOMContent(this.popup.element.nativeElement)
        .addTo(this.map);
    });

    this.map.on('mouseenter', 'clusters', () => {
      if (!this.map) {
        return;
      }
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'clusters', () => {
      if (!this.map) {
        return;
      }
      this.map.getCanvas().style.cursor = '';
    });

    this.map.on('mouseenter', 'unclustered-point', () => {
      if (!this.map) {
        return;
      }
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'unclustered-point', () => {
      if (!this.map) {
        return;
      }
      this.map.getCanvas().style.cursor = '';
    });
  }

  private loadData(): void {
    if (this.map) {
      this.map.on('idle', () => {
        this.updateCarMarkers();
      });
    }
  }

  private addSources(): void {
    this.map?.addSource('cars', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: this.clusterMaxZoom,
      clusterRadius: this.clusterRadius
    });
  }

  private addLayers(): void {
    this.map?.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cars',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
      }
    });

    this.map?.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'cars',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    this.map?.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'cars',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 7,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
  }

  private updateCarMarkers(): void {
    if (!this.map || !this.cars) {
      return;
    }

    const geoJsonData: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: this.cars.map((car) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [car.location.coordinates[0], car.location.coordinates[1]]
        },
        properties: {
          carId: car.id
        }
      }))
    };

    (this.map.getSource('cars') as mapboxgl.GeoJSONSource).setData(geoJsonData);
  }
}
