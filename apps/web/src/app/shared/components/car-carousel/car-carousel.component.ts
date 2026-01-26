import { Component, Input, OnInit } from '@angular/core';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent implements OnInit {
  @Input() carIds: string[] = [];

  swiperConfig: SwiperOptions = {
    slidesPerView: 1.2,
    spaceBetween: 10,
  };

  ngOnInit(): void {
    // Initialize Swiper after the view is initialized
    setTimeout(() => {
      new Swiper('.swiper-container', this.swiperConfig);
    });
  }
}
