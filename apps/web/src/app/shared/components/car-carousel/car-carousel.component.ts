import { Component, Input } from '@angular/core';
import { Car } from '@shared/interfaces/car.interface';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] | null = null;
  @Input() title: string = '';
  @Input() slidesPerView: number = 1;
  @Input() spaceBetween: number = 16;

  // Removing the empty ngOnInit method to resolve the linting error
  // ngOnInit(): void {
  // }

  public swiperConfig: any = {
    loop: false,
    spaceBetween: this.spaceBetween,
    slidesPerView: this.slidesPerView,
  }
}
