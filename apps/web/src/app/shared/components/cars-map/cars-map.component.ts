import { Component, AfterViewInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { Car } from '@shared/models/car.model';
import { environment } from 'apps/web/src/environments/environment';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare let map: any;
declare let google: any;

@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapRef: ElementRef | undefined;
  @Input() cars: Car[] = [];
  @Output() carClicked = new EventEmitter<string>();
  map: any;
  markers: any[] = [];

  ngAfterViewInit(): void {
    this.initMap();
  }

  initMap = () => {
    const coordinates = new google.maps.LatLng(40.7128, -74.0060);

    const mapOptions = {
      center: coordinates,
      zoom: 12,
      disableDefaultUI: true,
      mapTypeId: 'roadmap',
    };
    this.map = new google.maps.Map(this.mapRef?.nativeElement, mapOptions);

    this.cars.forEach(car => {
      this.addMarker(car);
    });

    this.map.addListener("click", () => {
      this.closeAllInfoWindows();
    });
  }

  addMarker = (car: Car) => {
    const icon = {
      url: '../../../assets/images/map-marker.png',
      scaledSize: new google.maps.Size(40, 60),
      anchor: new google.maps.Point(20, 60)
    };

    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(car.location.coordinates[1], car.location.coordinates[0]),
      map: this.map,
      title: car.name,
      icon: icon
    });

    let infoWindow = new google.maps.InfoWindow({
      content: this.getInfoWindowData(car)
    });

    marker.addListener("click", (e: Event) => {
      this.closeAllInfoWindows();
      infoWindow.open(this.map, marker);
      e.stopPropagation();
    });

    this.markers.push(marker);
  }

  getInfoWindowData = (car: Car) => {
    return `<div id="iw-container">` +
      `<div class="iw-title">${car.name}</div>` +
      `<div class="iw-content">` +
      `<img src="${environment.baseUrl}/${car.images[0].url}" alt="${car.name}" height="115" width="100">` +
      `<div class="iw-subTitle">${car.make}</div>` +
      `<p>${car.description.substring(0, 50)}...</p>` +
      `</div>` +
      `<div class="iw-bottom-gradient"></div>` +
      `<a href=\"#\" id=\"car-link\" data-car-id=\"${car.id}\"></a>` +
      `</div>`;
  }

  closeAllInfoWindows = () => {
    this.markers.forEach(marker => {
      marker.infowindow?.close();
    });
  }

  handleCarClick(carId: string) {
    this.carClicked.emit(carId);
  }

  ngAfterViewChecked() {
    const carLinks = document.querySelectorAll('#car-link');

    carLinks.forEach((carLink: any) => {
      carLink.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const carId = carLink.getAttribute('data-car-id');
        if (carId) {
          this.handleCarClick(carId);
        }
      });
    });

    this.markers.forEach(marker => {
      const infoWindowElement = marker.infowindow?.content.querySelector('#iw-container');

      if (infoWindowElement) {
        google.maps.event.addDomListener(infoWindowElement, 'load', function() {

          // Adjusting marker infowindow
          const iwBackground = this.parentElement.parentElement.parentElement.parentElement.parentElement;

          iwBackground.children[0].style.display = 'none';
          iwBackground.children[2].style.display = 'none';

          let iwOuter = iwBackground.parentElement;
          iwOuter.classList.add('iw-outer');

          let iwWrapper = iwOuter.children[0];
          iwWrapper.classList.add('iw-wrapper');

          let iwInner = iwWrapper.children[0];
          iwInner.classList.add('iw-inner');
        });
      }
    });
  }
}
