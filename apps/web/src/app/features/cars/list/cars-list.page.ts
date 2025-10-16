import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarsService } from '../../../core/services/cars.service';
import { Car } from '../../../core/models';
import { CitySelectComponent } from '../../../shared/components/city-select/city-select.component';
import { DateRangePickerComponent, DateRange } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';

@Component({
  standalone: true,
  selector: 'app-cars-list-page',
  imports: [CommonModule, CitySelectComponent, DateRangePickerComponent, CarCardComponent],
  templateUrl: './cars-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListPage implements OnInit {
  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);

  constructor(private readonly carsService: CarsService) {}

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
}
