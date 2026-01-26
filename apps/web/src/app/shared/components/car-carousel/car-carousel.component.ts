import { Component, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements AfterViewInit {
  @Input() cars: any[] = [];
  @ViewChild('swiperEl', { static: false }) swiperElRef: ElementRef | undefined;

  swiperParams = {
    slidesPerView: 'auto',
    spaceBetween: 10,
    freeMode: true,
  };

  constructor() { }

  ngAfterViewInit(): void {
    if (this.swiperElRef) {
      Object.assign(this.swiperElRef.nativeElement, this.swiperParams);

      this.swiperElRef.nativeElement.initialize();
    }
  }

}
