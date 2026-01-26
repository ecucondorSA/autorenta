import { Component, Input } from '@angular/core';
import { Car } from '@core/models/car.model';
import { SwiperOptions } from 'swiper/types';
import { register } from 'swiper/element/bundle';
register();
import '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent {
  @Input() cars: Car[] = [];
  @Input() title: string = '';

  swiperConfig: SwiperOptions = {
    slidesPerView: 'auto',
    spaceBetween: 10,
  };

  constructor() {}

  // Removing empty ngOnInit lifecycle method to fix linting error
}
