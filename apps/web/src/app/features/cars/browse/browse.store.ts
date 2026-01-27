import { Injectable, signal, computed } from '@angular/core';
import { Car } from '@core/models';
import { CarMapLocation } from '@core/services/cars/car-locations.service';

export type BrowseViewMode = 'map' | 'list';
export type InteractionSource = 'map' | 'carousel' | 'idle';

@Injectable()
export class BrowseStore {
  // State Signals
  readonly cars = signal<Car[]>([]);
  readonly loading = signal<boolean>(true);
  readonly viewMode = signal<BrowseViewMode>('map');

  // Selection & Sync State
  readonly activeCarId = signal<string | null>(null);
  readonly interactionSource = signal<InteractionSource>('idle');

  // Computed
  readonly activeCar = computed(() => this.cars().find((c) => c.id === this.activeCarId()) || null);

  readonly activeCarMapLocation = computed<CarMapLocation | null>(() => {
    const car = this.activeCar();
    if (!car) return null;
    return {
      carId: car.id,
      lat: car.location_lat || 0,
      lng: car.location_lng || 0,
      pricePerDay: car.price_per_day,
      title: `${car.brand_text_backup} ${car.model_text_backup}`,
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

  readonly carCount = computed(() => this.cars().length);

  // Actions
  setCars(cars: Car[]) {
    console.log('[BrowseStore] 🚗 SET CARS:', cars.length);
    this.cars.set(cars);
    this.loading.set(false);
  }

  setLoading(isLoading: boolean) {
    this.loading.set(isLoading);
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
