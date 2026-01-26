import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent, CommonModule],
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
  }

}