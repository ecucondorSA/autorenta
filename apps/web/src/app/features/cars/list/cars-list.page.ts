import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarsService } from '../../../core/services/cars.service';
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
export class CarsListPage implements OnInit, OnDestroy {
  @ViewChild('carsContainer') carsContainer?: ElementRef<HTMLDivElement>;

  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);
  readonly searchCollapsed = signal(false);
  readonly selectedCarId = signal<string | null>(null);

  canScrollLeft = false;
  canScrollRight = false;
  private autoCollapseTimer?: ReturnType<typeof setTimeout>;
  private autoScrollInterval?: ReturnType<typeof setInterval>;

  constructor(private readonly carsService: CarsService) {}

  ngOnInit(): void {
    void this.loadCars();
    this.startAutoCollapseTimer();
  }

  ngOnDestroy(): void {
    if (this.autoCollapseTimer) {
      clearTimeout(this.autoCollapseTimer);
    }
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  private startAutoCollapseTimer(): void {
    this.autoCollapseTimer = setTimeout(() => {
      this.searchCollapsed.set(true);
    }, 3000);
  }

  toggleSearchCollapsed(): void {
    this.searchCollapsed.set(!this.searchCollapsed());

    // Si se expande, reiniciar el timer
    if (!this.searchCollapsed()) {
      if (this.autoCollapseTimer) {
        clearTimeout(this.autoCollapseTimer);
      }
      this.startAutoCollapseTimer();
    }
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

  scrollCars(direction: 'left' | 'right'): void {
    const container = this.carsContainer?.nativeElement;
    if (!container) return;

    const scrollAmount = 400; // pixels to scroll
    const targetScroll =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  }

  onCarsScroll(): void {
    const container = this.carsContainer?.nativeElement;
    if (!container) return;

    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 1;
  }

  onCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
    this.stopAutoScroll();
  }

  onMapCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
    this.scrollToSelectedCar(carId);
    this.stopAutoScroll();
  }

  private scrollToSelectedCar(carId: string): void {
    const container = this.carsContainer?.nativeElement;
    if (!container) return;

    const carIndex = this.cars().findIndex(car => car.id === carId);
    if (carIndex === -1) return;

    const cardWidth = 320; // Approximate card width + gap
    const targetScroll = carIndex * cardWidth;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  }

  startAutoScroll(): void {
    if (this.autoScrollInterval || this.cars().length === 0) return;

    let currentIndex = 0;
    this.autoScrollInterval = setInterval(() => {
      const container = this.carsContainer?.nativeElement;
      if (!container) return;

      currentIndex = (currentIndex + 1) % this.cars().length;
      const cardWidth = 320;
      const targetScroll = currentIndex * cardWidth;

      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });

      // Update selected car for map synchronization
      this.selectedCarId.set(this.cars()[currentIndex]?.id ?? null);
    }, 3000); // Change every 3 seconds
  }

  stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = undefined;
    }
  }

  toggleAutoScroll(): void {
    if (this.autoScrollInterval) {
      this.stopAutoScroll();
    } else {
      this.startAutoScroll();
    }
  }
}
