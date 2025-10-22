import { ChangeDetectionStrategy, Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CarsService } from '../../../core/services/cars.service';
import { Car } from '../../../core/models';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';

@Component({
  standalone: true,
  selector: 'app-my-cars-page',
  imports: [CommonModule, RouterLink, CarCardComponent, TranslateModule],
  templateUrl: './my-cars.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCarsPage implements OnInit {
  readonly cars = signal<Car[]>([]);
  readonly loading = signal(false);

  readonly countActive = computed(() =>
    this.cars().filter(car => car.status === 'active').length
  );

  readonly countDraft = computed(() =>
    this.cars().filter(car => car.status === 'draft').length
  );

  constructor(
    private readonly carsService: CarsService,
    private readonly router: Router
  ) {}

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

  async onEditCar(carId: string): Promise<void> {
    // Navigate to publish page with car ID for editing
    await this.router.navigate(['/cars/publish'], {
      queryParams: { edit: carId }
    });
  }

  async onDeleteCar(carId: string): Promise<void> {
    const confirmed = confirm('¿Estás seguro de que querés eliminar este auto? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      await this.carsService.deleteCar(carId);
      // Reload cars list after successful deletion
      await this.loadCars();
      alert('Auto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting car:', error);
      alert('Error al eliminar el auto. Por favor intenta nuevamente.');
    }
  }
}
