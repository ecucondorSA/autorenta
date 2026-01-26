import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { BehaviorSubject, debounceTime, distinctUntilChanged, fromEvent, map, Subscription } from 'rxjs';

import { SoundService } from '@core/services/ui/sound.service';
import { ApiService } from '@core/services/api/api.service';
import { environment } from '@env/environment';
import { Car } from '@shared/models/car';
import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer: ElementRef | undefined;
  @Input() cars: Car[] = [];
  map: google.maps.Map | undefined;
  markers: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];
  locationSearchSubject = new BehaviorSubject<string>('');
  locationSearchResults: google.maps.places.AutocompleteResult[] = [];
  locationService: google.maps.places.AutocompleteService | undefined;
  placesService: google.maps.places.PlacesService | undefined;
  selectedPlace: google.maps.places.PlaceResult | null = null;
  mapClickListener: google.maps.MapsEventListener | undefined;
  searchSubscription: Subscription | undefined;
  mapIdleSubscription: Subscription | undefined;
  currentPositionMarker: google.maps.Marker | undefined;
  currentPositionInfoWindow: google.maps.InfoWindow | undefined;
  geocoder = new google.maps.Geocoder();
  userLocation: { lat: number; lng: number } | null = null;
  isMapIdle = true;
  mapTypeControl = false;
  streetViewControl = false;
  fullscreenControl = false;
  zoomControl = false;
  rotateControl = false;
  mapId = environment.googleMaps.mapId;
  mapStyle = [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ];
  mapOptions: google.maps.MapOptions = {
    mapId: this.mapId,
    styles: this.mapStyle,
    center: { lat: 52.520008, lng: 13.404954 },
    zoom: 12,
    disableDefaultUI: true,
    mapTypeControl: this.mapTypeControl,
    streetViewControl: this.streetViewControl,
    fullscreenControl: this.fullscreenControl,
    zoomControl: this.zoomControl,
    rotateControl: this.rotateControl,
  };

  constructor(
    private router: Router,
    private modalController: ModalController,
    private soundService: SoundService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.locationService = new google.maps.places.AutocompleteService();
    this.placesService = new google.maps.places.PlacesService(document.createElement('div'));

    this.searchSubscription = this.locationSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map((searchTerm) => {
          if (searchTerm.length > 0) {
            this.searchLocations(searchTerm);
          } else {
            this.locationSearchResults = [];
            this.selectedPlace = null;
          }
        })
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.mapIdleSubscription?.unsubscribe();
    this.mapClickListener?.remove();
  }

  async openTooltipModal(car: Car) {
    this.soundService.play('tap');
    const modal = await this.modalController.create({
      component: EnhancedMapTooltipComponent,
      componentProps: {
        car: car,
      },
      cssClass: 'enhanced-map-tooltip-modal',
    });
    return await modal.present();
  }

  async goToCarDetails(car: Car) {
    this.soundService.play('tap');
    this.router.navigate(['/scout/car', car.id]);
  }

  onLocationSearch(event: Event) {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.locationSearchSubject.next(searchTerm);
  }

  onLocationSelect(place: google.maps.places.AutocompleteResult) {
    this.locationSearchResults = [];
    this.placesService?.getDetails({ placeId: place.place_id! }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result) {
        this.selectedPlace = result;
        this.map?.setCenter(result.geometry!.location!);
        this.map?.setZoom(14);
      }
    });
  }

  clearLocationSearch() {
    this.locationSearchSubject.next('');
    this.locationSearchResults = [];
    this.selectedPlace = null;
  }

  async getCurrentPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          this.userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          this.map?.setCenter(this.userLocation);
          if (this.currentPositionMarker) {
            this.currentPositionMarker.setPosition(this.userLocation);
            this.currentPositionInfoWindow?.open(this.map, this.currentPositionMarker);
          } else {
            this.currentPositionMarker = new google.maps.Marker({
              position: this.userLocation,
              map: this.map,
              title: 'Your Location',
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              },
            });
            this.currentPositionInfoWindow = new google.maps.InfoWindow({
              content: 'You are here!',
            });
            this.currentPositionInfoWindow.open(this.map, this.currentPositionMarker);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting current position:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  private initializeMap() {
    if (this.mapContainer?.nativeElement) {
      this.map = new google.maps.Map(this.mapContainer.nativeElement, this.mapOptions);

      this.mapClickListener = this.map.addListener('click', () => {
        this.soundService.play('tap');
        this.clearLocationSearch();
      });

      this.mapIdleSubscription = fromEvent(this.map, 'idle').subscribe(() => {
        this.isMapIdle = true;
      });

      this.addMarkers(this.cars);
    }
  }

  private addMarkers(cars: Car[]) {
    cars.forEach((car) => {
      const marker = new google.maps.Marker({
        position: { lat: car.location.latitude, lng: car.location.longitude },
        map: this.map,
        title: `${car.brand} ${car.model}`,
        icon: {
          url: 'assets/img/marker.svg',
          scaledSize: new google.maps.Size(32, 32),
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div><b>${car.brand} ${car.model}</b></div>`,
      });

      marker.addListener('click', () => {
        this.soundService.play('tap');
        this.infoWindows.forEach((iw) => iw.close());
        infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
      this.infoWindows.push(infoWindow);
    });
  }

  private searchLocations(searchTerm: string) {
    if (this.locationService) {
      this.locationService.getPlacePredictions(
        {
          input: searchTerm,
          types: ['geocode'],
        },
        (predictions) => {
          this.locationSearchResults = predictions || [];
        }
      );
    }
  }

  performGeocoding(address: string) {
    this.geocoder
      .geocode({ address: address })
      .then((result) => {
        const results = result.results;

        this.map?.setCenter(results[0].geometry.location);
      })
      .catch((e) => {
        console.error('Geocode was not successful for the following reason: ' + e);
      });
  }
}
