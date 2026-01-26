import { Component, Input } from '@angular/core';
import { Car } from '@core/models/car.model';
import Swiper from 'swiper';
import { register } from 'swiper/element/bundle';
import { environment } from 'src/environments/environment';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
register();

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] = [];
  imageCdn = environment.imageCdn;

  swiperParams: any = {
    slidesPerView: 'auto',
    spaceBetween: 10,
    freeMode: true,
    modules: [ ],
  };

  constructor() {}

  ngAfterViewInit(): void {
    const swiperEl = document.querySelector('swiper-container') as any;

    const swiperParams = {
      slidesPerView: 'auto',
      spaceBetween: 10,
      freeMode: true,
      modules: [ ],
    };

    Object.assign(swiperEl, swiperParams);

    swiperEl.initialize();
  }
}
