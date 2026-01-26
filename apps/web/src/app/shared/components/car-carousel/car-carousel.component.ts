import { Component, Input } from '@angular/core';
import { Car } from '@core/models/car.model';
import { SwiperOptions } from 'swiper/types';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] = [];

  config: SwiperOptions = {
    slidesPerView: 1.2,
    spaceBetween: 10,
    breakpoints: {
      768: {
        slidesPerView: 2.2,
      },
      1200: {
        slidesPerView: 3.5,
      }
    }
  };

}
