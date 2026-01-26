import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements OnInit {
  @Input() cars: any[];

  ngOnInit(): void {
    // Initialization logic here, if needed.
    // If no initialization is needed, you can remove the ngOnInit method.
  }
}
