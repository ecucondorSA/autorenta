import { Component, Input } from '@angular/core';

@Component({
  selector: 'ar-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: any[] = [];

  // Removing the empty ngOnInit lifecycle method
  // ngOnInit(): void {
  // }
}
