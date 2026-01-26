import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SoundService } from '@core/services/ui/sound.service';
import { environment } from '../../../../environments/environment';

import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Router, RouterModule } from '@angular/router';
import { MapService } from '@shared/services/map.service';
import { Car } from '@shared/models/car.model';

@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() cars: Car[] | null = [];
  @Input() showDistance = false;
  @Input() showRouteButton = false;
  @Input() showCarDetailsButton = true;
  @Input() mapHeight = '400px';
  @Input() mapWidth = '100%';
  @Input() center: L.LatLngExpression = [46.8182, 8.2275];
  @Input() zoom = 8;

  private map: any;
  private markers = L.markerClusterGroup();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly soundService: SoundService,
    private readonly router: Router,
    private readonly mapService: MapService
  ) {}

  ngOnInit(): void {
    this.mapService.mapDefaults.next({
      center: this.center,
      zoom: this.zoom,
    });
  }

  ngAfterViewInit(): void {
    this.initMap();

    this.mapService.mapDefaults.pipe(takeUntil(this.destroy$)).subscribe((defaults) => {
      this.map.setView(defaults.center, defaults.zoom);
    });

    if (this.cars) {
      this.addMarkers(this.cars);
    }

    this.map.on('click', (e: any) => {
      if (environment.debug) {
        const lat = Math.round(e.latlng.lat * 100000) / 100000;
        const lng = Math.round(e.latlng.lng * 100000) / 100000;
        console.log('You clicked the map at latitude: ' + lat + ' and longitude: ' + lng);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: this.center,
      zoom: this.zoom,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    tiles.addTo(this.map);
  }

  addMarkers(cars: Car[]): void {
    this.markers.clearLayers();

    cars.forEach((car) => {
      if (car.location?.lat && car.location?.lng) {
        const icon = L.icon({
          iconUrl: 'assets/images/svg/marker.svg',
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([car.location.lat, car.location.lng], { icon });

        marker.bindPopup(
          `<div style="text-align: center;"><img src="${car.images[0].url}" alt="${car.model}" width="200px" /><br><b>${car.brand} ${car.model}</b><br><a href="/cars/${car.id}">Details</a></div>`
        );

        this.markers.addLayer(marker);
      }
    });

    this.map.addLayer(this.markers);
  }

  flyTo(car: Car): void {
    if (car.location?.lat && car.location?.lng) {
      this.map.flyTo([car.location.lat, car.location.lng], 12);
    }
  }

  calculateRoute(car: Car): void {
    this.soundService.playClick();
    if (car.location?.lat && car.location?.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${car.location.lat},${car.location.lng}`, '_blank');
    }
  }

  openCarDetails(car: Car): void {
    this.soundService.playClick();
    this.router.navigate(['/cars', car.id]);
  }

  centerView(): void {
    this.map.setView(this.center, this.zoom);
  }

  setCenter(lat: number, lng: number): void {
    this.center = [lat, lng];
    this.map.setView(this.center, this.zoom);
  }

  onMapReady(map: any) {
    this.map = map;
  }
}
