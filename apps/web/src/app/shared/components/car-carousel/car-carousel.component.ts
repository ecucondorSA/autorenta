import { Component, Input } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrl: './car-carousel.component.scss',
})
export class CarCarouselComponent {
  @Input() cars: any[] = [];

  constructor() {}

  // Removing the empty ngOnInit lifecycle method
  // ngOnInit(): void {}
}
