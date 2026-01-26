import { Component, Input, AfterViewInit } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'ar-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.less']
})
export class CarCarouselComponent implements AfterViewInit {

  @Input() cars: any[] = [];
  @Input() title: string = '';
  @Input() subtitle: string = '';

  swiperParams = {
    slidesPerView: 'auto',
    spaceBetween: 16,
  };

  ngAfterViewInit(): void {
  }

}