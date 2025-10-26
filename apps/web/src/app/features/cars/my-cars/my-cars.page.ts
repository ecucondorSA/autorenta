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
    try {
      // ✅ NUEVO: Verificar reservas activas
      const { hasActive, count, bookings } = await this.carsService.hasActiveBookings(carId);
      
      if (hasActive) {
        const nextBooking = bookings?.[0];
        const startDate = nextBooking ? new Date(nextBooking.start_date).toLocaleDateString() : '';
        
        alert(
          `❌ No puedes eliminar este auto\n\n` +
          `Tiene ${count} reserva${count > 1 ? 's' : ''} activa${count > 1 ? 's' : ''}.\n` +
          `Próxima reserva: ${startDate}\n\n` +
          `Esperá a que finalicen las reservas o contactá a los locatarios para cancelarlas.`
        );
        return;
      }

      // ✅ MEJORADO: Confirmación más clara
      const car = this.cars().find(c => c.id === carId);
      const carName = car ? `${car.brand} ${car.model} ${car.year}` : 'este auto';
      
      const confirmed = confirm(
        `¿Estás seguro de que querés eliminar ${carName}?\n\n` +
        `Esta acción no se puede deshacer.`
      );
      
      if (!confirmed) return;

      await this.carsService.deleteCar(carId);
      await this.loadCars();
      alert('✅ Auto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting car:', error);
      alert('❌ Error al eliminar el auto. Por favor intenta nuevamente.');
    }
  }
}
