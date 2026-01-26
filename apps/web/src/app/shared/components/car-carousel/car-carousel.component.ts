import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { Swiper } from 'swiper';
import { register } from 'swiper/element/bundle';

import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent implements AfterViewInit {
  @Input() cars: any[] = [];
  @ViewChild('swiper') swiperRef: any | undefined;
  swiper?: Swiper

  constructor() { }

  ngAfterViewInit(): void {
    this.swiper = this.swiperRef?.nativeElement.swiper
  }

  slideNext(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    this.swiper?.slideNext()
  }

  slidePrev(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    this.swiper?.slidePrev()
  }
}
