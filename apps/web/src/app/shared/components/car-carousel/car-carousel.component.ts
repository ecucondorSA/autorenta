import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('swiperEl') swiperEl: ElementRef | undefined;

  swiperParams = {
    slidesPerView: 'auto',
    spaceBetween: 10,
    freeMode: true,
  };

  ngAfterViewInit(): void {
    // This lifecycle hook is intentionally left empty.
    // It might be used in the future for specific initialization logic related to the carousel.
  }

  ngOnDestroy(): void {
      
  }

}
