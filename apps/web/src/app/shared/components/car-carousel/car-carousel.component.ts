import { Component, Input } from '@angular/core';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { CommonModule } from '@angular/common';
import { SwiperContainer } from 'swiper/element';
import { register } from 'swiper/element/bundle';
register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent, CommonModule],
  template: `
    <swiper-container
      class="mySwiper"
      pagination="true"
      navigation="true"
      space-between="30"
      slides-per-view="1"
    >
      <swiper-slide *ngFor="let car of cars">
        <app-car-mini-card [car]="car"></app-car-mini-card>
      </swiper-slide>
    </swiper-container>
  `,
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent {
  @Input() cars: any[];

  constructor() {}
}
