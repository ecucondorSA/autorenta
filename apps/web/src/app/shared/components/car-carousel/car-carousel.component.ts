import { Component, Input } from '@angular/core';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { SwiperContainer } from 'swiper/element/bundle';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrl: './car-carousel.component.scss',
})
export class CarCarouselComponent {
  @Input() cars: any[] = [];

  swiperParams = {
    slidesPerView: 'auto',
    spaceBetween: 10,
  };

  constructor() {}

  ngAfterViewInit(): void {
    const swiperEl = document.querySelector('swiper-container') as SwiperContainer;
    Object.assign(swiperEl, this.swiperParams);

    swiperEl.initialize();
  }
}
