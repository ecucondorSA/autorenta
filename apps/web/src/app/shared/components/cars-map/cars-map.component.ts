import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, debounceTime, fromEvent, Observable, tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Car } from '@core/api/models/car';
import { CarsService } from '@core/api/services/cars.service';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import * as L from 'leaflet';
import { environment } from 'src/environments/environment';
import { SoundService } from '@core/services/ui/sound.service';
import { ToastService } from '@core/services/ui/toast.service';
import { PhotoService } from '@core/services/utils/photo.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [CommonModule, LeafletModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss'],
})
export class CarsMapComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() cars: Car[] = [];
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private readonly defaultLatitude = 52.52;
  private readonly defaultLongitude = 13.4;
  private readonly defaultZoom = 10;

  map!: L.Map;
  markers: L.Marker[] = [];
  selectedCar$ = new BehaviorSubject<Car | null>(null);
  carImage$ = new BehaviorSubject<string | null>(null);

  constructor(private carsService: CarsService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
    this.addMarkers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && !changes['cars'].firstChange) {
      this.clearMarkers();
      this.addMarkers();
    }
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [this.defaultLatitude, this.defaultLongitude],
      zoom: this.defaultZoom,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    tiles.addTo(this.map);
  }

  private addMarkers(): void {
    this.cars.forEach((car) => {
      if (car.latitude && car.longitude) {
        const marker = L.marker([car.latitude, car.longitude])
          .addTo(this.map)
          .on('click', () => {
            this.selectedCar$.next(car);
            this.loadCarImage(car);
          });
        this.markers.push(marker);
      }
    });
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  private loadCarImage(car: Car) {
    this.carsService
      .getCarPhoto({
        id: car.id!,
      })
      .subscribe((response: unknown) => {
        const urlCreator = window.URL || window.webkitURL;
        const imageUrl = urlCreator.createObjectURL(response as Blob);
        this.carImage$.next(imageUrl);
      });
  }

  trackAction(actionName: string, car: unknown) {
    // eslint-disable-next-line no-console
    console.log('trackAction', actionName, car);
  }
}
