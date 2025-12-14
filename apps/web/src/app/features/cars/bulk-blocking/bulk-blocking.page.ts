
import {Component, inject, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Car } from '../../../core/models';
import { CarBlockingService } from '../../../core/services/car-blocking.service';
import { CarsService } from '../../../core/services/cars.service';

@Component({
  selector: 'app-bulk-blocking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonicModule],
  templateUrl: './bulk-blocking.page.html',
  styleUrls: ['./bulk-blocking.page.scss'],
})
export class BulkBlockingPage implements OnInit {
  private readonly blockingService = inject(CarBlockingService);
  private readonly carsService = inject(CarsService);

  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly selectedCarIds = signal<string[]>([]);
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly reason = signal<'maintenance' | 'personal_use' | 'vacation' | 'other'>('maintenance');
  readonly notes = signal<string>('');
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly result = signal<{ success: number; failed: number; errors: string[] } | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCars();
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    try {
      const myCars = await this.carsService.listMyCars();
      this.cars.set(myCars || []);
    } catch (err) {
      console.error('Error loading cars:', err);
      this.error.set('Error al cargar autos');
    } finally {
      this.loading.set(false);
    }
  }

  toggleCarSelection(carId: string): void {
    this.selectedCarIds.update((ids) => {
      if (ids.includes(carId)) {
        return ids.filter((id) => id !== carId);
      } else {
        return [...ids, carId];
      }
    });
  }

  isCarSelected(carId: string): boolean {
    return this.selectedCarIds().includes(carId);
  }

  selectAllCars(): void {
    this.selectedCarIds.set(this.cars().map((car) => car.id));
  }

  deselectAllCars(): void {
    this.selectedCarIds.set([]);
  }

  async bulkBlockDates(): Promise<void> {
    if (this.selectedCarIds().length === 0) {
      this.error.set('Debe seleccionar al menos un auto');
      return;
    }

    if (!this.startDate() || !this.endDate()) {
      this.error.set('Debe seleccionar fecha de inicio y fin');
      return;
    }

    const start = new Date(this.startDate());
    const end = new Date(this.endDate());

    if (start > end) {
      this.error.set('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.result.set(null);

    try {
      const result = await this.blockingService.bulkBlockDates(
        this.selectedCarIds(),
        start,
        end,
        this.reason(),
        this.notes() || undefined,
      );

      this.result.set(result);

      if (result.success > 0) {
        this.success.set(
          `Se bloquearon ${result.success} auto(s) exitosamente. ${result.failed > 0 ? `${result.failed} fallaron.` : ''}`,
        );
      }

      if (result.failed > 0 && result.errors.length > 0) {
        this.error.set(result.errors.join('\n'));
      }

      // Reset form if all succeeded
      if (result.failed === 0) {
        this.resetForm();
      }
    } catch (err) {
      console.error('Error blocking dates:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al bloquear fechas');
    } finally {
      this.loading.set(false);
    }
  }

  resetForm(): void {
    this.selectedCarIds.set([]);
    this.startDate.set('');
    this.endDate.set('');
    this.reason.set('maintenance');
    this.notes.set('');
    this.result.set(null);
  }

  getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      maintenance: 'Mantenimiento',
      personal_use: 'Uso Personal',
      vacation: 'Vacaciones',
      other: 'Otro',
    };
    return labels[reason] || reason;
  }

  getCarDisplayName(car: Car): string {
    return `${car.brand} ${car.model} ${car.year}`;
  }
}
