import { computed, inject, Injectable, signal } from '@angular/core';
import { Car } from '@core/models';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

export type BrowseViewMode = 'map' | 'list';
export type InteractionSource = 'map' | 'carousel' | 'idle';

export interface BrowseSearchParams {
  lat?: number;
  lng?: number;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class BrowseStore {
  private readonly logger = inject(LoggerService).createChildLogger('BrowseStore');

  // --- Core State ---
  readonly cars = signal<Car[]>([]);
  readonly loading = signal<boolean>(true);
  readonly viewMode = signal<BrowseViewMode>('map');
  
  // --- Filter & Search State ---
  readonly filterQuery = signal<string>('');
  readonly searchParams = signal<BrowseSearchParams>({});

  // --- Interaction State ---
  readonly activeCarId = signal<string | null>(null);
  readonly interactionSource = signal<InteractionSource>('idle');

  // --- Computed Logic ---
  
  /**
   * Filter cars based on "Group of Words" logic.
   * If query is "SUV Toyota", it finds cars that have BOTH "suv" AND "toyota" in their data.
   */
  readonly filteredCars = computed(() => {
    const allCars = this.cars();
    const query = this.filterQuery().trim().toLowerCase();

    if (!query) return allCars;

    const queryWords = query.split(/\s+/).filter(w => w.length > 0);

    return allCars.filter(car => {
      // Create a massive searchable string for the car
      const searchableText = [
        car.brand_text_backup,
        car.model_text_backup,
        car.year,
        car.description,
        car.transmission,
        car.fuel_type,
        car.location_city
      ].join(' ').toLowerCase();

      // "Group of Words" AND logic: Car must contain ALL words from query
      return queryWords.every(word => searchableText.includes(word));
    });
  });

  readonly activeCar = computed(() => this.cars().find((c) => c.id === this.activeCarId()) || null);

  readonly activeCarMapLocation = computed<CarMapLocation | null>(() => {
    const car = this.activeCar();
    if (!car) return null;
    
    return {
      carId: car.id,
      lat: car.location_lat || 0,
      lng: car.location_lng || 0,
      pricePerDay: car.price_per_day,
      title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`.trim() || 'Auto disponible',
      currency: car.currency || 'USD',
      photoUrl:
        car.photos?.[0]?.url || car.car_photos?.[0]?.url || '/assets/images/car-placeholder.svg',
      city: car.location_city,
      updatedAt: car.updated_at || new Date().toISOString(),
      locationLabel: car.location_city || 'Ubicación desconocida',
      photoGallery: car.photos?.map((p) => p.url) || car.car_photos?.map((p) => p.url) || [],
      description: car.description || '',
      availabilityStatus: car.status === 'active' ? 'available' : 'unavailable',
    };
  });

  readonly carCount = computed(() => this.filteredCars().length);

  // --- Actions ---

  setCars(cars: Car[]) {
    this.logger.debug('Set cars', { count: cars.length });
    this.cars.set(cars);
    this.loading.set(false);
  }

  setLoading(isLoading: boolean) {
    this.loading.set(isLoading);
  }

  setFilterQuery(query: string) {
    this.filterQuery.set(query);
  }

  setSearchParams(params: BrowseSearchParams) {
    this.searchParams.set(params);
  }

  setActiveCar(id: string | null, source: InteractionSource = 'idle') {
    this.interactionSource.set(source);
    this.activeCarId.set(id);

    if (source !== 'idle') {
      setTimeout(() => this.interactionSource.set('idle'), 800);
    }
  }

  toggleViewMode() {
    this.viewMode.update((mode) => (mode === 'map' ? 'list' : 'map'));
  }

  setInteractionSource(source: InteractionSource) {
    this.interactionSource.set(source);
  }
}