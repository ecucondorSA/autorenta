import { Component, Input } from '@angular/core';

@Component({
  selector: 'ar-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent {
  @Input() cars: any[]; // Changed any to any[] as it's an array

  ngOnInit() {
    // You can add initialization logic here if needed
    // For example, you might want to fetch data or perform other setup tasks
    console.log('CarCarouselComponent initialized');
  }
}
