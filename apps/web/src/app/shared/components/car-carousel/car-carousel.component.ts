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
  @ViewChild('swiperEl') swiperEl: ElementRef | undefined;

  ngAfterViewInit(): void {
    // Optional: You can configure Swiper parameters here if needed
    if (this.swiperEl) {
      Object.assign(this.swiperEl.nativeElement, {
        slidesPerView: 1.2,
        spaceBetween: 10,
        breakpoints: {
          640: {
            slidesPerView: 2.2,
            spaceBetween: 10,
          },
          768: {
            slidesPerView: 3.2,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 4.2,
            spaceBetween: 30,
          },
        },
      });

      this.swiperEl.nativeElement.initialize();
    }
  }
}
