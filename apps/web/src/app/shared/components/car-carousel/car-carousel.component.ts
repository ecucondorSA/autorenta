import { Component, Input } from '@angular/core';
import { Car } from '@shared/models/car.model';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] = [];
  @Input() title: string = '';
  @Input() slidesPerView: number = 1;
  @Input() spaceBetween: number = 16;
  @Input() centeredSlides: boolean = false;
  @Input() loop: boolean = false;

  constructor() {}

  ngOnInit(): void {
    // Add initialization logic here if needed
  }
}
