import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarsService } from '../../../core/services/cars.service';
import { Car } from '../../../core/models';
import { DateRangePickerComponent, DateRange } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  standalone: true,
  selector: 'app-car-detail-page',
  imports: [CommonModule, RouterLink, DateRangePickerComponent, MoneyPipe],
  templateUrl: './car-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetailPage implements OnInit {
  readonly car = signal<Car | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });

  readonly firstPhoto = computed(() => {
    const car = this.car();
    return car?.photos?.[0] ?? null;
  });

  readonly totalPrice = computed(() => {
    const range = this.dateRange();
    const car = this.car();
    if (!range.from || !range.to || !car) return null;
    const start = new Date(range.from);
    const end = new Date(range.to);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff * car.price_per_day : null;
  });

  constructor(private readonly carsService: CarsService, private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    void this.loadCar();
  }

  async loadCar(): Promise<void> {
    this.loading.set(true);
    const carId = this.route.snapshot.paramMap.get('id');
    if (!carId) {
      this.error.set('Auto no encontrado');
      this.loading.set(false);
      return;
    }
    try {
      const car = await this.carsService.getCarById(carId);
      if (!car) {
        this.error.set('Auto no disponible');
      } else {
        this.car.set(car);
      }
    } catch (err) {
      console.error(err);
      this.error.set('Error al cargar el auto');
    } finally {
      this.loading.set(false);
    }
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
  }
}
