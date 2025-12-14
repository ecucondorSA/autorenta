import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarAvailabilityService } from '../../../core/services/car-availability.service';
import type { CarMapLocation } from '../../../core/services/car-locations.service';
import type { FilterState } from '../../../core/models/marketplace.model';
import {
  BlockedDateRange,
  DateRangePickerComponent,
} from '../date-range-picker/date-range-picker.component';
import { IconComponent } from '../icon/icon.component';

// Re-export FilterState for backwards compatibility with existing imports
export type { FilterState } from '../../../core/models/marketplace.model';

/**
 * Map Filters Component
 *
 * Floating filters panel for map view with:
 * - Date range picker
 * - Price range slider
 * - Vehicle type selector
 * - Immediate availability toggle
 *
 * Desktop: Top-left chips with popover
 * Mobile: Under searchbar with inline content
 */
@Component({
  selector: 'app-map-filters',
  standalone: true,
  imports: [FormsModule, DateRangePickerComponent, IconComponent],
  templateUrl: './map-filters.component.html',
  styleUrls: ['./map-filters.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFiltersComponent implements OnInit, OnDestroy {
  private readonly availabilityService = inject(CarAvailabilityService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly availableCarsSignal = signal<CarMapLocation[]>([]);
  private occupancyLoadTimeout: ReturnType<typeof setTimeout> | null = null;
  private occupancyRefreshPromise: Promise<void> | null = null;

  // Expose Math for template
  readonly Math = Math;

  @Input()
  set availableCars(value: CarMapLocation[]) {
    this.availableCarsSignal.set(value ?? []);
    if (!this.priceRange() && value?.length) {
      this.priceRange.set({
        min: this.priceMin(),
        max: this.priceMax(),
      });
    }
    this.scheduleOccupancyRefresh();
  }

  get availableCars(): CarMapLocation[] {
    return this.availableCarsSignal();
  }
  @Input() userLocation?: { lat: number; lng: number };

  @Output() readonly filterChange = new EventEmitter<FilterState>();

  // Filter state signals
  readonly dateRange = signal<{ start: Date; end: Date } | null>(null);
  readonly priceRange = signal<{ min: number; max: number } | null>(null);
  readonly vehicleTypes = signal<string[]>([]);
  readonly immediateOnly = signal(false);
  readonly transmission = signal<string[]>([]);

  // UI state
  readonly openPanel = signal<'dates' | 'price' | 'type' | 'transmission' | null>(null);
  readonly isMobile = signal(false);
  readonly occupancyLoading = signal(false);
  readonly fleetOccupancyDays = signal<FleetOccupancyDay[]>([]);
  readonly occupancySampleSize = signal(0);

  // Computed values
  readonly priceMin = computed(() => {
    const prices = this.availableCarsSignal()
      .map((c) => c.pricePerDay)
      .filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  });

  readonly priceMax = computed(() => {
    const prices = this.availableCarsSignal()
      .map((c) => c.pricePerDay)
      .filter((p) => p > 0);
    return prices.length > 0 ? Math.max(...prices) : 1000;
  });

  readonly availableTransmissions = computed(() => {
    const types = new Set<string>();
    this.availableCarsSignal().forEach((_car) => {
      // Placeholder: agregar transmisión desde car object cuando esté disponible
      // Por ahora retorna set vacío
    });
    return Array.from(types).sort();
  });

  readonly vehicleTypeOptions = [
    { id: 'sedan', label: 'Sedán' },
    { id: 'suv', label: 'SUV' },
    { id: 'hatchback', label: 'Hatchback' },
    { id: 'pickup', label: 'Pick-up' },
    { id: 'van', label: 'Van' },
  ];

  readonly transmissionOptions = [
    { id: 'manual', label: 'Manual' },
    { id: 'automatic', label: 'Automático' },
  ];

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.dateRange()) count++;
    if (this.priceRange()) count++;
    if (this.vehicleTypes().length > 0) count++;
    if (this.immediateOnly()) count++;
    if (this.transmission().length > 0) count++;
    return count;
  });

  readonly currentFilter = computed<FilterState>(() => ({
    dateRange: this.dateRange(),
    priceRange: this.priceRange(),
    vehicleTypes: this.vehicleTypes().length > 0 ? this.vehicleTypes() : null,
    immediateOnly: this.immediateOnly(),
    transmission: this.transmission().length > 0 ? this.transmission() : null,
  }));

  readonly priceRangeVisual = computed(() => {
    const min = this.priceMin();
    const max = this.priceMax();
    const span = Math.max(max - min, 1);
    const current = this.priceRange() ?? { min, max };
    const left = ((current.min - min) / span) * 100;
    const width = ((current.max - current.min) / span) * 100;
    return {
      left: Number.isFinite(left) ? Math.max(0, Math.min(left, 100)) : 0,
      width: Number.isFinite(width) ? Math.max(0, Math.min(width, 100)) : 100,
    };
  });

  readonly priceHistogram = computed(() => {
    const cars = this.availableCarsSignal();
    const min = this.priceMin();
    const max = this.priceMax();
    if (cars.length === 0 || max <= min) {
      return [];
    }

    const bins = Math.min(30, Math.max(10, Math.round(cars.length / 4)));
    const binSize = (max - min) / bins;
    if (binSize <= 0) {
      return [];
    }

    const counts = new Array(bins).fill(0);
    for (const car of cars) {
      const price = Math.max(min, Math.min(car.pricePerDay, max));
      const index = Math.min(bins - 1, Math.floor((price - min) / binSize));
      counts[index] += 1;
    }

    const maxCount = Math.max(...counts, 1);
    const currentRange = this.priceRange() ?? { min, max };

    return counts.map((count, index) => {
      const start = min + index * binSize;
      const end = start + binSize;
      const active = currentRange.min <= end && currentRange.max >= start;
      return {
        count,
        start,
        end,
        height: Math.max(6, (count / maxCount) * 100),
        active,
      };
    });
  });

  readonly hasHighDemand = computed(() =>
    this.fleetOccupancyDays().some((day) => day.ratio >= 0.75),
  );

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.detectMobile();
      window.addEventListener('resize', this.resizeHandler);
    }

    // Initialize price range with available cars' min/max
    if (this.availableCarsSignal().length > 0) {
      this.priceRange.set({
        min: this.priceMin(),
        max: this.priceMax(),
      });
    }

    // Load filters from sessionStorage if available
    this.loadFiltersFromStorage();
  }

  private readonly resizeHandler = (): void => {
    this.detectMobile();
  };

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.occupancyLoadTimeout) {
      clearTimeout(this.occupancyLoadTimeout);
    }
  }

  /**
   * Detect mobile screen size
   */
  private detectMobile(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth < 640);
    }
  }

  /**
   * Toggle filter panel
   */
  togglePanel(panel: 'dates' | 'price' | 'type' | 'transmission'): void {
    const current = this.openPanel();
    this.openPanel.set(current === panel ? null : panel);
  }

  /**
   * Close all panels
   */
  closePanel(): void {
    this.openPanel.set(null);
  }

  /**
   * Update date range filter (from DateRangePickerComponent)
   * DateRangePickerComponent emits DateRange { from, to } which are ISO strings
   */
  onDateRangePickerChange(range: { from: string | null; to: string | null }): void {
    if (range.from && range.to) {
      this.dateRange.set({
        start: new Date(range.from),
        end: new Date(range.to),
      });
    } else {
      this.dateRange.set(null);
    }
    this.emitFilterChange();
  }

  /**
   * Legacy: Update date range filter (for backwards compatibility)
   */
  onDateRangeChange(dates: { start: Date; end: Date } | null): void {
    this.dateRange.set(dates);
    this.emitFilterChange();
  }

  /**
   * Update price range
   */
  onPriceRangeChange(range: { min: number; max: number }): void {
    this.priceRange.set(range);
    this.emitFilterChange();
  }

  /**
   * Toggle vehicle type selection
   */
  toggleVehicleType(typeId: string): void {
    const current = this.vehicleTypes();
    const updated = current.includes(typeId)
      ? current.filter((t) => t !== typeId)
      : [...current, typeId];
    this.vehicleTypes.set(updated);
    this.emitFilterChange();
  }

  /**
   * Toggle transmission selection
   */
  toggleTransmission(transmissionId: string): void {
    const current = this.transmission();
    const updated = current.includes(transmissionId)
      ? current.filter((t) => t !== transmissionId)
      : [...current, transmissionId];
    this.transmission.set(updated);
    this.emitFilterChange();
  }

  /**
   * Toggle immediate availability filter
   */
  toggleImmediate(): void {
    this.immediateOnly.set(!this.immediateOnly());
    this.emitFilterChange();
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.dateRange.set(null);
    this.vehicleTypes.set([]);
    this.immediateOnly.set(false);
    this.transmission.set([]);
    if (this.availableCars.length > 0) {
      this.priceRange.set({
        min: this.priceMin(),
        max: this.priceMax(),
      });
    }
    this.emitFilterChange();
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('mapFilters');
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  /**
   * Handle slider input for price range values
   */
  onPriceSliderInput(handle: 'min' | 'max', rawValue: number): void {
    const min = this.priceMin();
    const max = this.priceMax();
    const step = this.getPriceStep();
    const current = this.priceRange() ?? { min, max };

    if (handle === 'min') {
      const nextMin = Math.min(Math.max(rawValue, min), current.max - step);
      this.priceRange.set({
        min: Number.isFinite(nextMin) ? nextMin : min,
        max: current.max,
      });
    } else {
      const nextMax = Math.max(Math.min(rawValue, max), current.min + step);
      this.priceRange.set({
        min: current.min,
        max: Number.isFinite(nextMax) ? nextMax : max,
      });
    }

    this.emitFilterChange();
  }

  getOccupancyClass(ratio: number): string {
    if (ratio >= 0.85) return 'occupancy-day occupancy-day--critical';
    if (ratio >= 0.65) return 'occupancy-day occupancy-day--high';
    if (ratio >= 0.35) return 'occupancy-day occupancy-day--medium';
    if (ratio > 0) return 'occupancy-day occupancy-day--low';
    return 'occupancy-day occupancy-day--free';
  }

  getOccupancyTooltip(day: FleetOccupancyDay): string {
    const percent = Math.round(day.ratio * 100);
    return `${this.formatDate(day.date)} • ${percent}% de la flota reservada`;
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(date));
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByDate(_index: number, day: FleetOccupancyDay): string {
    return day.date;
  }

  /**
   * Emit filter change event and save to storage
   */
  private emitFilterChange(): void {
    const filter = this.currentFilter();
    this.filterChange.emit(filter);
    this.saveFiltersToStorage(filter);
  }

  /**
   * Save filter state to sessionStorage
   */
  private saveFiltersToStorage(filter: FilterState): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const serialized = {
        ...filter,
        dateRange: filter.dateRange
          ? {
              start: filter.dateRange.start.toISOString(),
              end: filter.dateRange.end.toISOString(),
            }
          : null,
      };
      sessionStorage.setItem('mapFilters', JSON.stringify(serialized));
    } catch (e) {
      console.warn('Failed to save filters to storage:', e);
    }
  }

  /**
   * Load filter state from sessionStorage
   */
  private loadFiltersFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const stored = sessionStorage.getItem('mapFilters');
      if (stored) {
        const filter = JSON.parse(stored);
        if (filter.dateRange) {
          this.dateRange.set({
            start: new Date(filter.dateRange.start),
            end: new Date(filter.dateRange.end),
          });
        }
        if (filter.vehicleTypes) {
          this.vehicleTypes.set(filter.vehicleTypes);
        }
        if (filter.transmission) {
          this.transmission.set(filter.transmission);
        }
        if (filter.immediateOnly) {
          this.immediateOnly.set(filter.immediateOnly);
        }
        if (filter.priceRange) {
          this.priceRange.set(filter.priceRange);
        }
      }
    } catch (e) {
      console.warn('Failed to load filters from storage:', e);
    }
  }

  private scheduleOccupancyRefresh(): void {
    if (this.occupancyLoadTimeout) {
      clearTimeout(this.occupancyLoadTimeout);
    }
    this.occupancyLoadTimeout = setTimeout(() => {
      void this.refreshFleetOccupancy();
    }, 300);
  }

  private async refreshFleetOccupancy(): Promise<void> {
    if (this.occupancyRefreshPromise) {
      return;
    }

    const cars = this.availableCarsSignal();
    if (cars.length === 0) {
      this.fleetOccupancyDays.set([]);
      this.occupancySampleSize.set(0);
      return;
    }

    const limitedCars = cars.slice(0, 24);
    const sampleSize = limitedCars.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 35);

    const startIso = today.toISOString().split('T')[0];
    const endIso = end.toISOString().split('T')[0];

    this.occupancyLoading.set(true);
    this.occupancySampleSize.set(sampleSize);

    const dayMap = new Map<string, number>();

    this.occupancyRefreshPromise = (async () => {
      try {
        await Promise.all(
          limitedCars.map(async (car) => {
            try {
              const blocked = await this.availabilityService.getBlockedDates(
                car.carId,
                startIso,
                endIso,
              );
              this.incrementBlockedRanges(dayMap, blocked);
            } catch (error) {
              console.warn('[MapFilters] Failed to load blocked dates for car', car.carId, error);
            }
          }),
        );

        const result: FleetOccupancyDay[] = [];
        const cursor = new Date(today);
        while (cursor <= end) {
          const key = cursor.toISOString().split('T')[0];
          const occupied = dayMap.get(key) ?? 0;
          result.push({
            date: key,
            occupied,
            total: sampleSize,
            ratio: sampleSize > 0 ? occupied / sampleSize : 0,
          });
          cursor.setDate(cursor.getDate() + 1);
        }

        this.fleetOccupancyDays.set(result);
      } finally {
        this.occupancyLoading.set(false);
        this.occupancyRefreshPromise = null;
      }
    })();
  }

  private incrementBlockedRanges(
    accumulator: Map<string, number>,
    ranges: BlockedDateRange[],
  ): void {
    for (const range of ranges) {
      const start = new Date(range.from);
      const end = new Date(range.to);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().split('T')[0];
        accumulator.set(key, (accumulator.get(key) ?? 0) + 1);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  getPriceStep(): number {
    const span = this.priceMax() - this.priceMin();
    if (span > 20000) return 250;
    if (span > 10000) return 200;
    if (span > 5000) return 100;
    if (span > 2000) return 50;
    return 10;
  }
}

interface FleetOccupancyDay {
  date: string;
  occupied: number;
  total: number;
  ratio: number;
}
