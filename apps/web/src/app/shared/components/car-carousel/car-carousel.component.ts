import { Component, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { Car } from '@core/models/car.model';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements AfterViewInit {
  @Input() cars: Car[] = [];
  @ViewChild('swiperEl') swiperElRef: ElementRef | undefined;

  swiperParams = {
    slidesPerView: 'auto',
    spaceBetween: 10,
    breakpoints: {
      640: {
        slidesPerView: 'auto',
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 'auto',
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 'auto',
        spaceBetween: 30,
      }
    }
  };

  constructor() { }

  ngAfterViewInit(): void {
    if (this.swiperElRef) {
      Object.assign(this.swiperElRef.nativeElement, this.swiperParams);

      this.swiperElRef.nativeElement.initialize();
    }
  }
}
