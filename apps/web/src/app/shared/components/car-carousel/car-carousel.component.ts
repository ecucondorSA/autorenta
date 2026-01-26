import { Component, Input } from '@angular/core';
import { Car } from '@core/models/car.model';

@Component({
  selector: 'ar-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] = [];
}
