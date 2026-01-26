import { Component, Input } from '@angular/core';
import { Car } from '@core/models/car.model';
import { environment } from 'src/environments/environment';
import { register } from 'swiper/element/bundle';
register();

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {

  @Input() cars: Car[] | null = [];
  @Input() title: string = '';
  @Input() skeletonCount: number = 3;
  @Input() slidePerView: number = 1.1;
  @Input() showTitle: boolean = true;

  readonly imageBaseUrl = environment.imageBaseUrl;

  swiperParams = {
    slidesPerView: this.slidesPerView,
    spaceBetween: 10,
  };

  constructor() { }

  // REMOVED EMPTY LIFECYCLE METHOD

}
