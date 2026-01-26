import { Component, Input } from '@angular/core';
import { Car } from '@shared/interfaces/car.interface';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() routerLink: any;

  constructor() { }

  // ngOnInit(): void {
  // }

}