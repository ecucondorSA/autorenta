import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, fromEvent, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { AgmMap } from '@agm/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

import { AppState } from '../../../../core/store/app.state';
import { selectIsMobile } from '../../../../core/store/ui/selectors';
import { environment } from '../../../../../environments/environment';
import { Car } from '@core/models/car.model';
import { LatLngLiteral } from '@agm/core/services/google-maps-types';
import { UiService } from '@core/services/ui/ui.service';
import { SoundService } from '@core/services/ui/sound.service';

import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() cars: Car[] | null = [];
  @Input() selectedCarId: string | null = null;
  @Input() mapCenter: LatLngLiteral = { lat: 40.730610, lng: -73.935242 };
  @Input() mapZoom = 12;
  @Output() carClicked = new EventEmitter<string>();
  @Output() mapReady = new EventEmitter<void>();
  @ViewChild('searchBox') searchBox!: ElementRef;
  @ViewChild(AgmMap) agmMap!: AgmMap;

  isMobile$: Observable<boolean> = this.store.select(selectIsMobile);
  isMapReady = false;
  isSearchBoxReady = false;
  mapProvider = environment.mapProvider;
  searchControl: any;
  autocomplete: any;
  geocoder: any;
  markers: google.maps.Marker[] = [];
  markerClusterer: any;
  mapOptions: google.maps.MapOptions = {
    mapTypeControl: false,
    streetViewControl: false,
  };

  private destroy$ = new Subject<void>();
  private cars$ = new BehaviorSubject<Car[]>([]);

  constructor(
    private router: Router,
    private store: Store<AppState>,
    private translate: TranslateService,
    private uiService: UiService,
    private soundService: SoundService,
  ) { }

  ngAfterViewInit(): void {
    this.initMap().then(() => {
      this.mapReady.emit();
    });
    this.initSearchBox();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.cars) {
      this.cars$.next(this.cars);
      if (this.isMapReady) {
        this.updateMarkers(this.cars);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initMap(): Promise<void> {
    return new Promise((resolve) => {
      this.agmMap.mapReady.pipe(
        takeUntil(this.destroy$)
      ).subscribe((map) => {
        this.geocoder = new google.maps.Geocoder();
        this.markerClusterer = new MarkerClusterer({
          map: map,
          algorithm: new MarkerClusterer.NoneAlgorithm(),
        });
        this.isMapReady = true;
        this.cars$.pipe(
          takeUntil(this.destroy$)
        ).subscribe((cars) => {
          this.updateMarkers(cars);
        });
        resolve();
      });
    });
  }

  initSearchBox(): void {
    fromEvent(this.searchBox.nativeElement, 'keyup').pipe(
      debounceTime(200),
      map((event: any) => event.target.value),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (searchTerm) {
          return this.uiService.getGoogleAutocomplete(searchTerm);
        }
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe((results: any) => {
      if (results) {
        this.autocomplete = results;
      } else {
        this.autocomplete = null;
      }
    });
  }

  onMapClick(event: any): void {
    // console.log(event.coords);
  }

  onCarClick(carId: string): void {
    this.carClicked.emit(carId);
  }

  onSearchBoxFocus(): void {
    this.soundService.play('menu-open');
  }

  onSearchBoxBlur(): void {
    this.soundService.play('menu-close');
  }

  flyTo(lat: number, lng: number): void {
    this.mapCenter = { lat: lat, lng: lng };
  }

  codeAddress(address: string): void {
    this.geocoder.geocode({ 'address': address }, (results: any, status: any) => {
      if (status == 'OK') {
        this.mapCenter = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        this.mapZoom = 12;
      } else {
        console.error('Geocode was not successful for the following reason: ' + status);
      }
    });
  }

  private updateMarkers(cars: Car[]): void {
    this.clearMarkers();

    cars.forEach(car => {
      if (car.latitude && car.longitude) {
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(car.latitude, car.longitude),
          title: car.name,
        });

        marker.addListener('click', () => {
          this.router.navigate(['/cars', car.id]);
        });

        const tooltip = new google.maps.InfoWindow({
          content: `<app-enhanced-map-tooltip></app-enhanced-map-tooltip>`
        });

        this.markers.push(marker);
        this.markerClusterer.addMarker(marker);
      }
    });
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
    this.markerClusterer.clearMarkers();
  }

  // Example usage (currently not used in the template)
  // These variables are assigned values but never used.
  // Leaving them here as a reference for potential future use.
  // colorAvailable = 'green';
  // colorSoon = 'yellow';
  // colorInUse = 'orange';
  // colorUnavailable = 'red';

  // Example usage (currently not used in the template)
  // This function is not used, but kept as a reference for potential future use.
  // It demonstrates how to create a custom marker.
  // private createCustomMarker(car: Car): void {
  //   if (car.latitude && car.longitude) {
  //     const markerElement = document.createElement('div');
  //     markerElement.className = 'custom-marker';
  //     markerElement.innerHTML = `<span class="marker-text">${car.name}</span>`;
  //
  //     const marker = new google.maps.Marker({
  //       position: new google.maps.LatLng(car.latitude, car.longitude),
  //       map: this.agmMap.map,
  //       title: car.name,
  //       icon: {
  //         url: 'data:image/svg+xml;utf8,' + encodeURIComponent(markerElement.outerHTML),
  //         scaledSize: new google.maps.Size(40, 40),
  //       }
  //     });
  //
  //     marker.addListener('click', () => {
  //       this.router.navigate(['/cars', car.id]);
  //     });
  //
  //     this.markers.push(marker);
  //   }
  // }
}
