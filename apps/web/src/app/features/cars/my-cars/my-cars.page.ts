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

  readonly countActive = computed(
    () => this.cars().filter((car) => car.status === 'active').length,
  );

  readonly countDraft = computed(() => this.cars().filter((car) => car.status === 'draft').length);

  constructor(
    private readonly carsService: CarsService,
    private readonly router: Router,
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
      queryParams: { edit: carId },
    });
  }

  async onDeleteCar(carId: string): Promise<void> {
    try {
      // ✅ NUEVO: Verificar reservas (activas e históricas)
      let hasBookings = false;
      let bookingsCount = 0;
      let activeBookings: unknown[] = [];

      try {
        const result = await this.carsService.hasActiveBookings(carId);
        hasBookings = result.hasActive;
        bookingsCount = result.count;
        activeBookings = result.bookings || [];
      } catch (checkError) {
        console.error('Error checking bookings:', checkError);
        // Continuar con el intento de eliminación si falla la verificación
      }

      if (hasBookings) {
        const activeCount = activeBookings.length;
        const nextBooking = activeBookings[0] as { start_date?: string } | undefined;
        const startDate = nextBooking?.start_date ? new Date(nextBooking.start_date).toLocaleDateString() : '';

        let message = `❌ No puedes eliminar este auto\n\n`;

        if (activeCount > 0) {
          message += `Tiene ${activeCount} reserva${activeCount > 1 ? 's' : ''} activa${activeCount > 1 ? 's' : ''}.\n`;
          if (startDate) {
            message += `Próxima reserva: ${startDate}\n\n`;
          }
        } else {
          message += `Este auto tiene ${bookingsCount} reserva${bookingsCount > 1 ? 's' : ''} en el historial.\n\n`;
        }

        message += `Los autos con reservas no pueden eliminarse para mantener el historial.\n`;
        message += `Podés desactivar el auto en su lugar.`;

        alert(message);
        return;
      }

      // ✅ MEJORADO: Confirmación más clara
      const car = this.cars().find((c) => c.id === carId);
      const carName = car ? `${car.brand} ${car.model} ${car.year}` : 'este auto';

      const confirmed = confirm(
        `¿Estás seguro de que querés eliminar ${carName}?\n\n` +
          `Esta acción no se puede deshacer.`,
      );

      if (!confirmed) return;

      await this.carsService.deleteCar(carId);
      await this.loadCars();
      alert('✅ Auto eliminado exitosamente');
    } catch (error: unknown) {
      console.error('Error deleting car:', error);
      const errorObj = error as { code?: string; message?: string; details?: string; hint?: string };
      console.error('Error details:', {
        code: errorObj?.code,
        message: errorObj?.message,
        details: errorObj?.details,
        hint: errorObj?.hint,
      });

      // Mensaje específico para foreign key constraint
      if (errorObj?.code === '23503' || errorObj?.message?.includes('foreign key')) {
        alert(
          '❌ No se puede eliminar este auto\n\n' +
            'Este auto tiene reservas asociadas en el sistema.\n' +
            'Para mantener el historial, no es posible eliminarlo.\n\n' +
            'Podés desactivar el auto si no querés que aparezca en las búsquedas.',
        );
      } else {
        // Mostrar mensaje más detallado para debugging
        const errorObj = error as { message?: string };
        const errorMsg = errorObj?.message || 'Error desconocido';
        alert(
          '❌ Error al eliminar el auto\n\n' +
            `Detalles: ${errorMsg}\n\n` +
            'Por favor intenta nuevamente o contacta soporte.',
        );
      }
    }
  }

  /**
   * ✅ NUEVO: Toggle de disponibilidad del auto
   */
  async onToggleAvailability(carId: string, currentStatus: string): Promise<void> {
    try {
      const car = this.cars().find((c) => c.id === carId);
      const carName = car ? `${car.brand} ${car.model}` : 'este auto';

      // Si está activo, verificar que no tenga reservas pendientes antes de desactivar
      if (currentStatus === 'active') {
        const { hasActive, count } = await this.carsService.hasActiveBookings(carId);

        if (hasActive) {
          alert(
            `⚠️ No puedes desactivar ${carName}\n\n` +
              `Tiene ${count} reserva${count > 1 ? 's' : ''} activa${count > 1 ? 's' : ''}.\n` +
              `Esperá a que finalicen o cancelalas primero.`,
          );
          return;
        }

        const confirmed = confirm(
          `¿Desactivar ${carName}?\n\n` +
            `El auto dejará de aparecer en las búsquedas.\n` +
            `Podés reactivarlo cuando quieras.`,
        );

        if (!confirmed) return;
      } else {
        const confirmed = confirm(
          `¿Activar ${carName}?\n\n` + `El auto volverá a aparecer en las búsquedas.`,
        );

        if (!confirmed) return;
      }

      // Toggle: active <-> inactive
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await this.carsService.updateCarStatus(carId, newStatus);
      await this.loadCars();

      const statusText = newStatus === 'active' ? 'activado' : 'desactivado';
      alert(`✅ Auto ${statusText} exitosamente`);
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('❌ Error al cambiar disponibilidad. Por favor intenta nuevamente.');
    }
  }
}
