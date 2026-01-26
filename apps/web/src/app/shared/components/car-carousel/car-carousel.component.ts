import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Swiper } from 'swiper';
import { register } from 'swiper/element/bundle';
register();

import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';

@Component({
  selector: 'app-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // You can configure Swiper here if needed
  }

  ngOnDestroy(): void {
  }

}
