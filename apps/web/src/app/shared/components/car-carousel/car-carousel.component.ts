import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import SwiperCore, { SwiperOptions, Navigation, Pagination, Scrollbar, A11y } from 'swiper';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

SwiperCore.use([Navigation, Pagination, Scrollbar, A11y]);

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CarMiniCardComponent],
})
export class CarCarouselComponent implements OnInit {
  @Input() cars: any[] = [];
  config: SwiperOptions = {
    slidesPerView: 3,
    spaceBetween: 20,
    navigation: true,
    pagination: { clickable: true },
    scrollbar: { draggable: true },
  };

  constructor() {}

  ngOnInit(): void {}
}
