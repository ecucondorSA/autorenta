import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, fromEvent, map, Observable, Subscription, switchMap } from 'rxjs';
import { Car } from '@shared/models/car';
import { environment } from '../../../../environments/environment';
import { Cluster } from 'ol/source/Cluster';
import { Vector as VectorSource } from 'ol/source';
import { Style, Fill, Stroke, Circle, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Vector as VectorLayer } from 'ol/layer';
import { transform } from 'ol/proj';
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SoundService } from '@core/services/ui/sound.service';

import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';


@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('popup') popupElement!: ElementRef;
  @Input() cars: Car[] | null = null;
  @Input() selectedCarId: string | null = null;
  @Output() selectedCarChange = new EventEmitter<string>();
  @Output() mapReady = new EventEmitter<void>();
  @Output() carsInViewport = new EventEmitter<Car[]>();
  @Output() mapMoved = new EventEmitter<void>();

  map!: Map;
  vectorSource!: VectorSource;
  clusterSource!: Cluster;
  clusterLayer!: VectorLayer;
  popup!: Overlay;
  tooltipComponent!: EnhancedMapTooltipComponent;
  currentZoom: number = 12;
  currentCenter: [number, number] = [-8479414.503751166, 1351744.4444433424]; // Default to a reasonable location
  mapInitialized = false;
  carsSubject = new BehaviorSubject<Car[]>([]);
  cars$ = this.carsSubject.asObservable();
  private carsSubscription: Subscription | undefined;
  private searchSubscription: Subscription | undefined;
  private mapMoveSubscription: Subscription | undefined;
  private readonly apiKey = environment.hereApiKey;
  private readonly geocodingApiUrl = 'https://geocode.search.hereapi.com/v1/geocode';

  // Define color variables
  colorAvailable = '#34A853';
  colorSoon = '#FBBC05';
  colorInUse = '#4285F4';
  colorUnavailable = '#EA4335';

  constructor(
    private http: HttpClient,
    private router: Router,
    private soundService: SoundService
  ) { }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.mapReady.emit();

    // Subscribe to map move events
    this.mapMoveSubscription = fromEvent(this.map, 'moveend')
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map(() => {
          return this.getCarsInViewport();
        })
      ).subscribe((carsInView: Car[]) => {
        this.carsInViewport.emit(carsInView);
        this.mapMoved.emit();
      });

    // Subscribe to search input changes
    const searchInput = document.getElementById('location-search');
    if (searchInput) {
      this.searchSubscription = fromEvent(searchInput, 'input')
        .pipe(
          debounceTime(300),
          map((event: Event) => (event.target as HTMLInputElement).value),
          distinctUntilChanged(),
          switchMap(searchTerm => this.geocodeLocation(searchTerm))
        )
        .subscribe(coordinates => {
          if (coordinates) {
            this.flyTo(coordinates, 14);
          }
        });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.cars && this.mapInitialized) {
      this.carsSubject.next(this.cars);
      this.updateMapFeatures(this.cars);
    }

    if (changes['selectedCarId'] && this.selectedCarId && this.mapInitialized) {
      this.selectCarOnMap(this.selectedCarId);
    }
  }

  ngOnDestroy(): void {
    if (this.carsSubscription) {
      this.carsSubscription.unsubscribe();
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.mapMoveSubscription) {
      this.mapMoveSubscription.unsubscribe();
    }

    this.map.dispose();
  }

  initializeMap(): void {
    this.vectorSource = new VectorSource({ features: [] });

    this.clusterSource = new Cluster({
      distance: 40,
      source: this.vectorSource,
    });

    this.clusterLayer = new VectorLayer({
      source: this.clusterSource,
      style: (feature) => {
        const size = feature.get('features').length;
        let style = this.clusterStyles[size];
        if (!style) {
          style = new Style({
            image: new Circle({
              radius: 12,
              stroke: new Stroke({
                color: '#fff',
              }),
              fill: new Fill({
                color: '#3399CC',
              }),
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({
                color: '#fff',
              }),
            }),
          });
          this.clusterStyles[size] = style;
        }
        return style;
      },
    });

    this.popup = new Overlay({
      element: this.popupElement.nativeElement,
      autoPan: {},
    });

    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new ol.maps.OpenStreetMap(),
        this.clusterLayer,
      ],
      view: new View({
        center: this.currentCenter,
        zoom: this.currentZoom,
      }),
      overlays: [this.popup],
    });

    this.map.on('singleclick', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel,
        (feature) => {
          return feature;
        });

      if (feature) {
        let clickedFeatures = feature.get('features');

        if (!clickedFeatures && feature.getGeometry().getType() === 'Point') {
          // Handle the case where a single car (non-clustered) is clicked
          clickedFeatures = [feature];
        }

        if (clickedFeatures && clickedFeatures.length > 0) {
          if (clickedFeatures.length === 1) {
            // If it's a single car, navigate to its detail page
            const car = clickedFeatures[0].getProperties().car;
            this.onCarSelected(car.id);
          } else {
            // If it's a cluster, zoom in to separate the cars
            const extent = feature.getGeometry().getExtent();
            this.map.getView().fit(extent, { duration: 1000, padding: [50, 50, 50, 50] });
          }
        }
      }
    });

    this.map.on('pointermove', (evt) => {
      if (evt.dragging) {
        return;
      }
      const pixel = this.map.getEventPixel(evt.originalEvent);
      const hit = this.map.hasFeatureAtPixel(pixel);
      (this.map.getTarget() as HTMLElement).style.cursor = hit ? 'pointer' : '';
    });

    this.carsSubscription = this.cars$.subscribe(cars => {
      if (cars) {
        this.updateMapFeatures(cars);
      }
    });

    this.mapInitialized = true;
  }

  updateMapFeatures(cars: Car[]): void {
    if (!cars || cars.length === 0) {
      this.vectorSource.clear();
      return;
    }

    const features = cars.map(car => {
      const coordinates = transform([car.location.lng, car.location.lat], 'EPSG:4326', 'EPSG:3857');
      const feature = new Feature({
        geometry: new Point(coordinates),
        car: car // Store the car object in the feature
      });
      feature.setId(car.id);
      return feature;
    });

    this.vectorSource.clear();
    this.vectorSource.addFeatures(features);

    if (this.selectedCarId) {
      this.selectCarOnMap(this.selectedCarId);
    }
  }

  selectCarOnMap(carId: string): void {
    // Deselect previously selected car
    this.vectorSource.getFeatures().forEach(feature => {
      if (feature.get('selected')) {
        feature.set('selected', false);
      }
    });

    const feature = this.vectorSource.getFeatureById(carId);
    if (feature) {
      feature.set('selected', true);

      // Fly to the selected car
      const coordinates = feature.getGeometry().getCoordinates();
      this.flyTo(coordinates, 16);
    }
  }

  flyTo(location: [number, number], zoom: number = 14): void {
    const view = this.map.getView();
    view.animate({
      center: location,
      duration: 2000,
    });
    view.animate({
      zoom: zoom,
      duration: 2000, // Animation duration in milliseconds
    });
    this.currentZoom = zoom;
    this.currentCenter = location;
  }

  onCarSelected(carId: string): void {
    this.selectedCarChange.emit(carId);
    this.router.navigate(['/scout/mission-detail', carId]);
    this.soundService.playClickSound();
  }

  geocodeLocation(searchTerm: string): Observable<[number, number] | null> {
    if (!searchTerm) {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }

    const url = `${this.geocodingApiUrl}?q=${encodeURIComponent(searchTerm)}&apiKey=${this.apiKey}`;
    return this.http.get<any>(url).pipe(
      map(data => {
        if (data.items && data.items.length > 0) {
          const location = data.items[0].position;
          const coordinates: [number, number] = transform([location.lng, location.lat], 'EPSG:4326', 'EPSG:3857');
          return coordinates;
        } else {
          return null;
        }
      })
    );
  }

  getCarsInViewport(): Car[] {
    const extent = this.map.getView().calculateExtent(this.map.getSize());
    const carsInView: Car[] = [];

    this.vectorSource.getFeatures().forEach(feature => {
      const car = feature.getProperties().car as Car;
      if (car) {
        const coordinates = transform([car.location.lng, car.location.lat], 'EPSG:4326', 'EPSG:3857');
        const point = new Point(coordinates);
        if (ol.extent.containsCoordinate(extent, point.getCoordinates())) {
          carsInView.push(car);
        }
      }
    });

    return carsInView;
  }

  clusterStyles: { [key: number]: Style } = {};
}
