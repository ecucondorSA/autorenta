import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CarCarouselComponent implements OnInit {
  @Input() cars: any[] = [];

  ngOnInit(): void {
    //
  }
}
