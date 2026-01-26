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
  @Input() cars: any[] = []; // Ideally, replace 'any[]' with a more specific type like 'Car[]'

  @ViewChild('swiperEl', { static: false }) swiperElRef: ElementRef | undefined;

  ngAfterViewInit(): void {
    if (this.swiperElRef) {
      const swiperEl = this.swiperElRef.nativeElement as any; // Consider a more specific type if possible
      const swiperParams = {
        slidesPerView: 1.1,
        spaceBetween: 10,
        breakpoints: {
          768: {
            slidesPerView: 2.1,
          },
          1200: {
            slidesPerView: 3.1,
          },
        },
      };

      Object.assign(swiperEl, swiperParams);

      swiperEl.initialize();
    }
  }
}
