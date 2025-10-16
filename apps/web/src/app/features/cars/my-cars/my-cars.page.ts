import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarsService } from '../../../core/services/cars.service';
import { Car } from '../../../core/models';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';

@Component({
  standalone: true,
  selector: 'app-my-cars-page',
  imports: [CommonModule, RouterLink, CarCardComponent],
  templateUrl: './my-cars.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCarsPage implements OnInit {
  readonly cars = signal<Car[]>([]);
  readonly loading = signal(false);

  constructor(private readonly carsService: CarsService) {}

  ngOnInit(): void {
    void this.loadCars();
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    try {
      const cars = await this.carsService.listMyCars();
      this.cars.set(cars);
    } catch (err) {
      console.error('loadMyCars error', err);
    } finally {
      this.loading.set(false);
    }
  }
}
