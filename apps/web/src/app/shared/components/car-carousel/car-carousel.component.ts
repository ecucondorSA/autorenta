import { Component, Input } from '@angular/core';
import { Car } from '@shared/interfaces/car.interface';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] | null = null;

  // constructor() { }

  // ngOnInit(): void {
  // }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 3000
  };

}
