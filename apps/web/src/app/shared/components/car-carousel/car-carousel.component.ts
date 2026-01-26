import { Component, Input } from '@angular/core';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { register } from 'swiper/element/bundle';
register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrl: './car-carousel.component.scss'
})
export class CarCarouselComponent {
  @Input() cars: any[] = [];

  // Removing the empty lifecycle method
  // constructor() { }

  // ngOnInit(): void {
  // }
}
