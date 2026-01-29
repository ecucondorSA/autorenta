import { Component, DestroyRef, inject, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { CarsService } from '@core/services/cars/cars.service';
import { LocationService, type LocationData } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Car } from '@core/models';
import { CarCardComponent } from '@shared/components/car-card/car-card.component';
import { CarsMapComponent } from '@shared/components/cars-map/cars-map.component';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { CarCarouselComponent } from '@shared/components/car-carousel/car-carousel.component';
import { BookingSheetComponent } from '@shared/components/booking-sheet/booking-sheet.component';
import { BrowseStore } from './browse.store';

@Component({
  selector: 'app-browse-cars',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CarCardComponent,
    CarsMapComponent,
    CarCarouselComponent,
    BookingSheetComponent,
  ],
  providers: [BrowseStore],
  templateUrl: './browse-cars.page.html',
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        position: relative;
        background: black;
      }
      .split-layout {
        display: flex;
        height: 100%;
        width: 100%;
      }
      .list-panel {
        width: 100%;
        max-width: 450px;
        overflow-y: auto;
        background: var(--surface-base);
        z-index: 10;
        border-right: 1px solid var(--border-default);
      }
      .map-panel {
        flex: 1;
        position: relative;
        height: 100%;
      }
      @media (max-width: 768px) {
        .split-layout {
          flex-direction: column-reverse;
        }
        .list-panel {
          height: 40%;
          width: 100%;
          max-width: none;
          border-right: none;
          border-top: 1px solid var(--border-default);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
          border-radius: 24px 24px 0 0;
        }
        .map-panel {
          height: 60%;
        }
      }
      .scrollbar-premium::-webkit-scrollbar {
        width: 6px;
      }
      .scrollbar-premium::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-premium::-webkit-scrollbar-thumb {
        background: rgba(57, 255, 20, 0.2);
        border-radius: 10px;
      }
      .scrollbar-premium::-webkit-scrollbar-thumb:hover {
        background: rgba(57, 255, 20, 0.5);
      }
    `,
  ],
})
export class BrowseCarsPage {
  private carsService = inject(CarsService);
  private locationService = inject(LocationService);
  private readonly logger = inject(LoggerService).createChildLogger('BrowseCarsPage');
  private router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(BrowseStore);

  readonly cars = this.store.cars;
  readonly loading = this.store.loading;
  readonly selectedCarId = this.store.activeCarId;
  readonly viewMode = this.store.viewMode;
  /** Car currently being previewed in the carousel (scroll, not click) */
  readonly carouselPreviewId = signal<string | null>(null);
  /** The car to highlight on the map: selected car takes priority, then preview */
  readonly mapHighlightedCarId = computed(() => this.selectedCarId() ?? this.carouselPreviewId());
  private readonly pollIntervalMs = 30000;
  private lastLocation: LocationData | null = null;
  private lastLocationAt = 0;
  private isFetching = false;

  readonly mapLocations = computed<CarMapLocation[]>(() => {
    const list = this.store.cars();
    this.logger.debug('Transforming cars for map', { count: list.length });
    return list.map((car) => ({
      carId: car.id,
      lat: Number(car.location_lat) || 0,
      lng: Number(car.location_lng) || 0,
      pricePerDay: Number(car.price_per_day) || 0,
      title: this.formatCarTitle(car.brand_text_backup, car.model_text_backup, car.year),
      currency: car.currency || 'USD',
      photoUrl:
        car.photos?.[0]?.url || car.car_photos?.[0]?.url || '/assets/images/car-placeholder.svg',
      city: car.location_city || '',
      updatedAt: car.updated_at || new Date().toISOString(),
      locationLabel: car.location_city || 'Ubicación desconocida',
      photoGallery: car.photos?.map((p) => p.url) || car.car_photos?.map((p) => p.url) || [],
      description: car.description || '',
      availabilityStatus: 'available',
    }));
  });

  /** Format car title: Brand + Model (1st word only) + Year. Example: "Fiat Toro 2016" */
  private formatCarTitle(brand?: string, model?: string, year?: number): string {
    const brandWord = (brand || '').trim().split(' ')[0] || '';
    const modelWord = (model || '').trim().split(' ')[0] || '';
    const yearStr = year ? String(year) : '';
    return [brandWord, modelWord, yearStr].filter(Boolean).join(' ');
  }

  constructor() {
    this.loadCars();
    interval(this.pollIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadCars({ silent: true });
      });
  }

  async loadCars(options: { silent?: boolean } = {}) {
    if (this.isFetching) return;
    this.isFetching = true;
    if (!options.silent) {
      this.store.setLoading(true);
    }
    try {
      const location = await this.resolveLocation();
      this.logger.debug('User location', location ?? {});

      const searchFrom = new Date().toISOString();
      const searchTo = new Date(Date.now() + 86400000).toISOString();

      const results = await this.carsService.getAvailableCarsWithDistance(searchFrom, searchTo, {
        lat: location?.lat,
        lng: location?.lng,
      });

      this.logger.debug('RPC results', { count: results.length });
      this.store.setCars(results as unknown as Car[]);
    } catch (e) {
      this.logger.error('Error loading cars', e);
      this.store.setLoading(false);
    } finally {
      this.isFetching = false;
    }
  }

  private async resolveLocation(): Promise<LocationData | null> {
    const now = Date.now();
    if (this.lastLocation && now - this.lastLocationAt < 5 * 60 * 1000) {
      return this.lastLocation;
    }
    const location = await this.locationService.getUserLocation();
    if (location) {
      this.lastLocation = location;
      this.lastLocationAt = now;
    }
    return location;
  }

  onMarkerClick(carId: string | Event | null) {
    if (carId === null) {
      this.store.setActiveCar(null);
      return;
    }
    // Handle both string and custom event from Mapbox
    // FIX: Added null checks for .detail which can be null (not just undefined)
    const id =
      typeof carId === 'string'
        ? carId
        : (carId as { detail?: { carId?: string }; carId?: string })?.detail?.carId ??
          (carId as { detail?: { carId?: string }; carId?: string })?.carId ??
          String(carId);
    this.logger.debug('Marker click', { id });
    this.store.setActiveCar(id, 'map');
    const element = document.getElementById('car-' + id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  onBookingConfirm() {
    const carId = this.selectedCarId();
    if (carId) {
      void this.router.navigate(['/bookings/request'], { queryParams: { carId } });
    }
  }

  /** Handle preview change from carousel scroll (not selection) */
  onCarouselPreviewChange(carId: string | null) {
    this.carouselPreviewId.set(carId);

    // If user is scrolling to explore other cars, close the booking sheet
    // to avoid showing details of a different car than what's visible
    const currentSelection = this.selectedCarId();
    if (currentSelection && carId && carId !== currentSelection) {
      this.store.setActiveCar(null);
    }
  }
}
