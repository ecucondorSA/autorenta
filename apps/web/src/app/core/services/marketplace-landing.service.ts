import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type {
  CarWithDistance,
  DateRange,
  FilterState,
  LocationCoords,
  SortOption,
  ViewMode,
} from '../models/marketplace.model';
import type { Car } from '../models';
import { DistanceCalculatorService } from './distance-calculator.service';

/**
 * MarketplaceLandingService - State management for landing page
 *
 * Manages:
 * - Search state (query, location, date range)
 * - Filter state (price, transmission, vehicle type, quick filters)
 * - View preferences (grid/list/map, sort order)
 * - User location
 */
@Injectable({
  providedIn: 'root',
})
export class MarketplaceLandingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly distanceCalculator = inject(DistanceCalculatorService);

  // ─── Search State ───────────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly selectedLocation = signal<string>('');
  readonly dateRange = signal<DateRange>({ from: null, to: null });

  // ─── Filter State ───────────────────────────────────────────────────────
  readonly filters = signal<FilterState>({
    dateRange: null,
    priceRange: null,
    vehicleTypes: null,
    immediateOnly: false,
    transmission: null,
  });

  readonly activeQuickFilters = signal<Set<string>>(new Set());

  // ─── View State ─────────────────────────────────────────────────────────
  readonly viewMode = signal<ViewMode>(this.loadViewMode());
  readonly sortOrder = signal<SortOption>('distance');

  // ─── Location State ─────────────────────────────────────────────────────
  readonly userLocation = signal<LocationCoords | null>(null);
  readonly locationAccuracy = signal<number | null>(null);
  readonly lastLocationUpdate = signal<Date | null>(null);

  // ─── Cars Data ──────────────────────────────────────────────────────────
  readonly cars = signal<Car[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ─── Computed: Active Filter Count ──────────────────────────────────────
  readonly activeFilterCount = computed(() => {
    let count = 0;
    const f = this.filters();

    if (f.priceRange) count++;
    if (f.vehicleTypes && f.vehicleTypes.length > 0) count++;
    if (f.immediateOnly) count++;
    if (f.transmission && f.transmission.length > 0) count++;
    count += this.activeQuickFilters().size;

    return count;
  });

  // ─── Computed: Has Active Filters ───────────────────────────────────────
  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  // ─── Computed: Cars with Distance ───────────────────────────────────────
  readonly carsWithDistance = computed<CarWithDistance[]>(() => {
    const carsList = this.cars();
    const userLoc = this.userLocation();

    if (!carsList.length || !userLoc) {
      return carsList.map((car) => ({ ...car }));
    }

    return carsList.map((car) => {
      if (!car.location_lat || !car.location_lng) {
        return { ...car };
      }

      const distanceKm = this.distanceCalculator.calculateDistance(
        userLoc.lat,
        userLoc.lng,
        car.location_lat,
        car.location_lng,
      );

      let distanceText: string;
      if (distanceKm < 1) {
        distanceText = `${Math.round(distanceKm * 10) * 100}m`;
      } else if (distanceKm < 10) {
        distanceText = `${distanceKm.toFixed(1)}km`;
      } else {
        distanceText = `${Math.round(distanceKm)}km`;
      }

      return {
        ...car,
        distance: distanceKm,
        distanceText,
      };
    });
  });

  // ─── Computed: Filtered & Sorted Cars ───────────────────────────────────
  readonly visibleCars = computed(() => {
    let cars = [...this.carsWithDistance()];
    const filters = this.filters();
    const quickFilters = this.activeQuickFilters();

    // Apply filters
    if (filters.priceRange) {
      cars = cars.filter(
        (c) =>
          c.price_per_day >= filters.priceRange!.min && c.price_per_day <= filters.priceRange!.max,
      );
    }

    if (filters.transmission && filters.transmission.length > 0) {
      cars = cars.filter((c) => filters.transmission!.includes(c.transmission));
    }

    if (filters.immediateOnly) {
      cars = cars.filter((c) => c.auto_approval);
    }

    // Apply quick filters
    if (quickFilters.has('verified')) {
      cars = cars.filter((c) => c.owner?.email_verified && c.owner?.phone_verified);
    }

    if (quickFilters.has('electric')) {
      cars = cars.filter((c) => c.fuel_type === 'electric' || c.fuel === 'electric');
    }

    if (quickFilters.has('no-card')) {
      cars = cars.filter(
        (c) =>
          c.payment_methods?.some((pm) =>
            ['debit_card', 'cash', 'transfer', 'wallet'].includes(pm),
          ) || !c.payment_methods?.includes('credit_card'),
      );
    }

    // Apply sorting
    const sort = this.sortOrder();
    switch (sort) {
      case 'distance':
        cars = cars.sort((a, b) => {
          const distA = a.distance ?? Number.MAX_VALUE;
          const distB = b.distance ?? Number.MAX_VALUE;
          return distA - distB;
        });
        break;

      case 'price_asc':
        cars = cars.sort((a, b) => a.price_per_day - b.price_per_day);
        break;

      case 'price_desc':
        cars = cars.sort((a, b) => b.price_per_day - a.price_per_day);
        break;

      case 'rating':
        cars = cars.sort((a, b) => {
          const ratingA = a.rating_avg ?? 0;
          const ratingB = b.rating_avg ?? 0;
          return ratingB - ratingA;
        });
        break;

      default:
        // Keep default order
        break;
    }

    return cars;
  });

  // ─── Computed: Stats ────────────────────────────────────────────────────
  readonly statsData = computed(() => {
    const cars = this.carsWithDistance();
    const nearbyCars = cars.filter((c) => c.distance && c.distance < 5).length;
    const avgPrice = this.calculateAveragePrice(cars);

    return {
      totalCars: cars.length,
      nearbyCars,
      avgPrice,
      minPrice: cars.length > 0 ? Math.min(...cars.map((c) => c.price_per_day)) : 0,
    };
  });

  // ─── Methods: Search ────────────────────────────────────────────────────
  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setLocation(location: string): void {
    this.selectedLocation.set(location);
  }

  setDateRange(range: DateRange): void {
    this.dateRange.set(range);
  }

  // ─── Methods: Filters ───────────────────────────────────────────────────
  updateFilters(filters: Partial<FilterState>): void {
    this.filters.update((current) => ({ ...current, ...filters }));
  }

  toggleQuickFilter(filterId: string): void {
    this.activeQuickFilters.update((current) => {
      const newSet = new Set(current);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      return newSet;
    });

    // Sync with main filters if needed
    if (filterId === 'immediate') {
      this.filters.update((f) => ({
        ...f,
        immediateOnly: this.activeQuickFilters().has('immediate'),
      }));
    }
  }

  isQuickFilterActive(filterId: string): boolean {
    return this.activeQuickFilters().has(filterId);
  }

  clearAllFilters(): void {
    this.filters.set({
      dateRange: null,
      priceRange: null,
      vehicleTypes: null,
      immediateOnly: false,
      transmission: null,
    });
    this.activeQuickFilters.set(new Set());
  }

  // ─── Methods: View ──────────────────────────────────────────────────────
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.saveViewMode(mode);
  }

  setSortOrder(order: SortOption): void {
    this.sortOrder.set(order);
  }

  // ─── Methods: Location ──────────────────────────────────────────────────
  setUserLocation(coords: LocationCoords): void {
    this.userLocation.set(coords);
    this.lastLocationUpdate.set(new Date());
  }

  // ─── Methods: Cars Data ─────────────────────────────────────────────────
  setCars(cars: Car[]): void {
    this.cars.set(cars);
  }

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  setError(error: string | null): void {
    this.error.set(error);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────
  private calculateAveragePrice(cars: CarWithDistance[]): number {
    if (cars.length === 0) return 0;
    const sum = cars.reduce((acc, car) => acc + car.price_per_day, 0);
    return Math.round(sum / cars.length);
  }

  private loadViewMode(): ViewMode {
    if (!this.isBrowser) return 'list';
    const stored = localStorage.getItem('autorenta-view-mode');
    if (stored === 'grid' || stored === 'list' || stored === 'map') {
      return stored;
    }
    return 'list';
  }

  private saveViewMode(mode: ViewMode): void {
    if (!this.isBrowser) return;
    localStorage.setItem('autorenta-view-mode', mode);
  }
}
