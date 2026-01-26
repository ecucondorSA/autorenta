import { Component, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
  standalone: true,
  imports: [CarMiniCardComponent],
})
export class CarCarouselComponent implements AfterViewInit {
  @Input() cars: any[] = [];
  @ViewChild('swiperEl', { static: false }) swiperEl!: ElementRef;

  swiperParams = {
    slidesPerView: 1.1,
    spaceBetween: 10,
    breakpoints: {
      640: {
        slidesPerView: 2.1,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 3.1,
        spaceBetween: 30,
      },
    },
  };

  constructor() {}

  ngAfterViewInit() {
    // Hack to fix swiper issue with shadow
    Object.assign(this.swiperEl.nativeElement, this.swiperParams);
    this.swiperEl.nativeElement.initialize();
  }
}
