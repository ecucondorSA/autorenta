import { Component, Input } from '@angular/core';
import Swiper from 'swiper/element/bundle';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'ar-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrl: './car-carousel.component.scss'
})
export class CarCarouselComponent {
  @Input() cars: any[] = [];

  swiperEl: any

  ngAfterViewInit() {
    this.swiperEl = document.querySelector('swiper-container')
    const swiperParams = {
      slidesPerView: 'auto',
      spaceBetween: 8,
      injectStyles: [`
        .swiper-slide {
          width: auto !important;
        }
      `]
    };

    Object.assign(this.swiperEl, swiperParams);

    this.swiperEl.initialize();
  }

  // Removing the empty lifecycle method
  // ngOnInit() {}
}
