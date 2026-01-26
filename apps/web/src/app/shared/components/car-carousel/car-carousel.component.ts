import { Component, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

register();

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() cars: any[] = [];
  @Input() title: string = '';

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
  }
}
