import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { format, addDays, startOfMonth, endOfMonth, addMonths, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ToastService } from '../../../../core/services/toast.service';
import { CarsService } from '../../../../core/services/cars.service';
import {
  CarAvailabilityService,
  DetailedBlockedRange,
} from '../../../../core/services/car-availability.service';
import { CarBlockingService } from '../../../../core/services/car-blocking.service';
import {
  BlockDateModalComponent,
  BlockDateRequest,
} from '../../../../shared/components/block-date-modal/block-date-modal.component';

interface CarCalendarData {
  carId: string;
  carTitle: string;
  imageUrl?: string;
  blockedRanges: DetailedBlockedRange[];
  selected: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-multi-car-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, BlockDateModalComponent],
  templateUrl: './multi-car-calendar.component.html',
  styleUrls: ['./multi-car-calendar.component.css'],
})
export class MultiCarCalendarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly blockingService = inject(CarBlockingService);
  private readonly toastService = inject(ToastService);

  readonly cars = signal<CarCalendarData[]>([]);
  readonly loading = signal(true);
  readonly currentMonth = signal(new Date());
  readonly showBlockModal = signal(false);

  readonly monthDays = computed(() => {
    const month = this.currentMonth();
    return eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  });

  readonly monthName = computed(() => {
    return format(this.currentMonth(), 'MMMM yyyy', { locale: es });
  });

  readonly selectedCars = computed(() => {
    return this.cars().filter((car) => car.selected);
  });

  readonly stats = computed(() => {
    const allCars = this.cars();
    const total = allCars.length;
    const withBookings = allCars.filter((car) =>
      car.blockedRanges.some((r) => r.type === 'booking'),
    ).length;
    const withBlocks = allCars.filter((car) =>
      car.blockedRanges.some((r) => r.type === 'manual_block'),
    ).length;

    return {
      total,
      withBookings,
      withBlocks,
      fullyAvailable: total - withBookings - withBlocks,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadOwnerCars();
  }

  private async loadOwnerCars(): Promise<void> {
    this.loading.set(true);

    try {
      // Get owner's active cars
      const ownerCars = await this.carsService.listMyCars();
      const activeCars = ownerCars.filter((car: any) => car.status === 'active');

      if (activeCars.length === 0) {
        this.toastService.info('Sin autos', 'No tienes autos activos para mostrar');
        this.loading.set(false);
        return;
      }

      // Initialize car calendar data
      const carData: CarCalendarData[] = activeCars.map((car: any) => ({
        carId: car.id,
        carTitle: `${car.brand} ${car.model} (${car.year})`,
        imageUrl: car.thumbnail_url || car.image_urls?.[0],
        blockedRanges: [],
        selected: false,
        loading: true,
      }));

      this.cars.set(carData);

      // Load blocked dates for each car
      await this.loadAllCalendarData();
    } catch (error) {
      console.error('Error loading owner cars:', error);
      this.toastService.error('Error', 'No se pudieron cargar tus autos');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAllCalendarData(): Promise<void> {
    const cars = this.cars();
    const startDate = format(startOfMonth(this.currentMonth()), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(addMonths(this.currentMonth(), 2)), 'yyyy-MM-dd');

    // Load in parallel
    await Promise.all(
      cars.map(async (car) => {
        try {
          const ranges = await this.availabilityService.getBlockedRangesWithDetails(
            car.carId,
            startDate,
            endDate,
          );

          this.updateCarData(car.carId, { blockedRanges: ranges, loading: false });
        } catch (error) {
          console.error(`Error loading calendar for car ${car.carId}:`, error);
          this.updateCarData(car.carId, { loading: false });
        }
      }),
    );
  }

  private updateCarData(carId: string, updates: Partial<CarCalendarData>): void {
    const currentCars = this.cars();
    const updatedCars = currentCars.map((car) =>
      car.carId === carId ? { ...car, ...updates } : car,
    );

    this.cars.set(updatedCars);
  }

  toggleCarSelection(carId: string): void {
    const currentCars = this.cars();
    const updatedCars = currentCars.map((car) =>
      car.carId === carId ? { ...car, selected: !car.selected } : car,
    );

    this.cars.set(updatedCars);
  }

  selectAllCars(): void {
    const updatedCars = this.cars().map((car) => ({ ...car, selected: true }));
    this.cars.set(updatedCars);
  }

  deselectAllCars(): void {
    const updatedCars = this.cars().map((car) => ({ ...car, selected: false }));
    this.cars.set(updatedCars);
  }

  async handleBulkBlockDates(request: BlockDateRequest): Promise<void> {
    const selectedCars = this.selectedCars();

    if (selectedCars.length === 0) {
      this.toastService.error('Error', 'Selecciona al menos un auto');
      return;
    }

    this.showBlockModal.set(false);
    this.loading.set(true);

    try {
      const carIds = selectedCars.map((car) => car.carId);

      const result = await this.blockingService.bulkBlockDates(
        carIds,
        request.startDate,
        request.endDate,
        request.reason,
        request.notes,
      );

      if (result.success > 0) {
        this.toastService.success(
          'Éxito',
          `Fechas bloqueadas en ${result.success} auto(s)${result.failed > 0 ? `, ${result.failed} falló(s)` : ''}`,
        );
        await this.loadAllCalendarData();
      } else {
        this.toastService.error(
          'Error',
          `No se pudieron bloquear las fechas: ${result.errors.join(', ')}`,
        );
      }
    } catch (error) {
      console.error('Error bulk blocking dates:', error);
      this.toastService.error('Error', 'Ocurrió un error al bloquear las fechas');
    } finally {
      this.loading.set(false);
    }
  }

  previousMonth(): void {
    this.currentMonth.set(
      new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth() - 1, 1),
    );
    void this.loadAllCalendarData();
  }

  nextMonth(): void {
    this.currentMonth.set(
      new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth() + 1, 1),
    );
    void this.loadAllCalendarData();
  }

  goToToday(): void {
    this.currentMonth.set(new Date());
    void this.loadAllCalendarData();
  }

  getDayStatus(car: CarCalendarData, day: Date): 'available' | 'booked' | 'blocked' | 'past' {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (day < today) {
      return 'past';
    }

    const dayStr = format(day, 'yyyy-MM-dd');

    const hasBooking = car.blockedRanges.some(
      (range) => range.type === 'booking' && dayStr >= range.from && dayStr <= range.to,
    );

    if (hasBooking) {
      return 'booked';
    }

    const hasBlock = car.blockedRanges.some(
      (range) => range.type === 'manual_block' && dayStr >= range.from && dayStr <= range.to,
    );

    if (hasBlock) {
      return 'blocked';
    }

    return 'available';
  }

  goToCarCalendar(carId: string): void {
    void this.router.navigate(['/cars', carId, 'availability']);
  }
  getBookingCount(car: any): number {
    return car.blockedRanges?.filter((r: any) => r.type === 'booking').length || 0;
  }

  getManualBlockCount(car: any): number {
    return car.blockedRanges?.filter((r: any) => r.type === 'manual_block').length || 0;
  }
}
