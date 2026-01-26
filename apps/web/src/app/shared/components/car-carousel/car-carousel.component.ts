import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { SoundService } from '@core/services/ui/sound.service';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { Car } from '@core/models/car.model';
import { SwiperModule } from 'swiper/angular';
import SwiperCore, { Navigation, Pagination, Scrollbar, A11y } from 'swiper';

SwiperCore.use([Navigation, Pagination, Scrollbar, A11y]);

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CarMiniCardComponent, SwiperModule],
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent {
  @Input() cars: Car[] | null = null;
  @Input() title: string | null = null;
  @Input() slideOptions: any = {
    slidesPerView: 1.1,
    spaceBetween: 10,
    breakpoints: {
      640: {
        slidesPerView: 2.1,
        spaceBetween: 10,
      },
      768: {
        slidesPerView: 3.1,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.1,
        spaceBetween: 30,
      },
    },
  };

  @Output() carClicked = new EventEmitter<Car>();

  constructor(private soundService: SoundService) {}

  onCarClicked(car: Car) {
    this.carClicked.emit(car);
    this.soundService.play('click');
  }
}
