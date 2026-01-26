import { Component, Input } from '@angular/core';
import { Car } from '@shared/models/car.model';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: Car[] | null = null;
  @Input() title: string = '';

  // Removing the empty ngOnInit method
  // ngOnInit(): void {}

  public identify(index: number, item: any): any {
    return item.id;
  }
}
