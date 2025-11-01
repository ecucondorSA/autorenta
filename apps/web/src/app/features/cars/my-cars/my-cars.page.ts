import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CarsService } from '../../../core/services/cars.service';
import { Car, CarStatus } from '../../../core/models';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-my-cars-page',
  imports: [CommonModule, RouterLink, CarCardComponent, TranslateModule],
  templateUrl: './my-cars.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCarsPage {
  private readonly carsService = inject(CarsService);
  private readonly router = inject(Router);

  readonly cars = signal<Car[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.loading.set(true);
    this.carsService.listMyCars().then(cars => {
      this.cars.set(cars);
      this.loading.set(false);
    });
  }

  readonly countActive = computed(
    () => this.cars().filter((car) => car.status === 'active').length,
  );
  readonly countDraft = computed(() => this.cars().filter((car) => car.status === 'draft').length);

  async onEditCar(carId: string): Promise<void> {
    await this.router.navigate(['/cars/publish'], { queryParams: { edit: carId } });
  }

  async onDeleteCar(carId: string): Promise<void> {
    this.loading.set(true);
    try {
      const hasBookings = await this.carsService.hasActiveBookings(carId);
      if (hasBookings.hasActive) {
        return;
      }

      await this.carsService.deleteCar(carId);
      this.cars.set(this.cars().filter((car) => car.id !== carId));
    } catch (error) {
      // Handle error
    } finally {
      this.loading.set(false);
    }
  }

  async onToggleAvailability(carId: string, currentStatus: string): Promise<void> {
    this.loading.set(true);
    try {
      const newStatus: CarStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await this.carsService.updateCarStatus(carId, newStatus);
      this.cars.update((cars) =>
        cars.map((car) => (car.id === carId ? { ...car, status: newStatus } : car)),
      );
    } catch (error) {
      // Handle error
    } finally {
      this.loading.set(false);
    }
  }
}
