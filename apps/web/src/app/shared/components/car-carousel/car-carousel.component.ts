import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Car } from '@core/models/car.model';
import { SoundService } from '@core/services/ui/sound.service';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { SwiperOptions } from 'swiper/types';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CarMiniCardComponent],
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss'],
})
export class CarCarouselComponent implements OnInit, OnDestroy {
  @Input() cars: Car[] = [];
  @Input() title: string = '';
  @Input() showViewAll: boolean = true;
  @Input() link: string = '';

  private destroy$ = new Subject<void>();

  swiperParams: SwiperOptions = {
    slidesPerView: 'auto',
    spaceBetween: 10,
  };

  constructor(private router: Router, private soundService: SoundService) {}

  ngOnInit(): void {}

  viewAll() {
    this.soundService
      .pressSound()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.router.navigate([this.link]);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
