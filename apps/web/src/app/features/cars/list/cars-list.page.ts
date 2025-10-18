import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarsService } from '../../../core/services/cars.service';
import { CarsCompareService } from '../../../core/services/cars-compare.service';
import { Car } from '../../../core/models';
import { CitySelectComponent } from '../../../shared/components/city-select/city-select.component';
import {
  DateRangePickerComponent,
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';

@Component({
  standalone: true,
  selector: 'app-cars-list-page',
  imports: [
    CommonModule,
    CitySelectComponent,
    DateRangePickerComponent,
    CarCardComponent,
    CarsMapComponent,
  ],
  templateUrl: './cars-list.page.html',
  styleUrls: ['./cars-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListPage implements OnInit {

  private readonly carsService = inject(CarsService);
  private readonly compareService = inject(CarsCompareService);

  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);
  readonly selectedCarId = signal<string | null>(null);

  // Comparación
  readonly compareCount = this.compareService.count;
  readonly maxCompareReached = computed(() => this.compareCount() >= 3);

  ngOnInit(): void {
    void this.loadCars();
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.carsService.listActiveCars({
        city: this.city() ?? undefined,
        from: this.dateRange().from ?? undefined,
        to: this.dateRange().to ?? undefined,
      });
      this.cars.set(items);
    } catch (err) {
      console.error('listActiveCars error', err);
    } finally {
      this.loading.set(false);
    }
  }

  onCityChange(value: string): void {
    this.city.set(value || null);
    void this.loadCars();
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
  }


  onCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
  }

  onMapCarSelected(carId: string): void {
    this.selectedCarId.set(carId);

    // Hacer scroll automático al card seleccionado
    // Usar setTimeout para asegurar que Angular haya actualizado el DOM
    setTimeout(() => {
      const cardElement = document.getElementById(`car-card-${carId}`);
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest', // 'nearest' evita scroll innecesario si ya está visible
          inline: 'nearest',
        });
        console.log(`[CarsListPage] Scrolled to card ${carId}`);
      } else {
        console.warn(`[CarsListPage] Card element not found for ID: car-card-${carId}`);
      }
    }, 100);
  }

  // Comparación
  isCarComparing(carId: string): boolean {
    return this.compareService.isComparing(carId);
  }

  onCompareToggle(carId: string): void {
    if (this.compareService.isComparing(carId)) {
      this.compareService.removeCar(carId);
    } else {
      const added = this.compareService.addCar(carId);
      if (!added) {
        // Máximo alcanzado, se podría mostrar un mensaje
        console.log('Máximo de 3 autos alcanzado');
      }
    }
  }
}
