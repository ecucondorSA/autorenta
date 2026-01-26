import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrl: './car-carousel.component.scss',
})
export class CarCarouselComponent implements AfterViewInit {
  @ViewChild('swiper') swiper: any;
  @Input() cars: any[] = [];

  ngAfterViewInit(): void {
    //Needed for SSR
    if (this.swiper) {
      Object.assign(this.swiper.nativeElement, {
        spaceBetween: 10,
        slidesPerView: 2.4,
      });
      this.swiper.nativeElement.initialize();
    }
  }
}
