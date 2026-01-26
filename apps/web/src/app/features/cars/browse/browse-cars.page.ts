import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CarsService } from '@core/services/cars/cars.service';
import { LocationService } from '@core/services/geo/location.service';
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
  private router = inject(Router);
  readonly store = inject(BrowseStore);

  readonly cars = this.store.cars;
  readonly loading = this.store.loading;
  readonly selectedCarId = this.store.activeCarId;
  readonly viewMode = this.store.viewMode;

  readonly mapLocations = computed<CarMapLocation[]>(() => {
    const list = this.store.cars();
    console.log('[BrowsePage] Transforming cars for map:', list.length);
    return list.map((car) => ({
      carId: car.id,
      lat: Number(car.location_lat) || 0,
      lng: Number(car.location_lng) || 0,
      pricePerDay: Number(car.price_per_day) || 0,
      title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`,
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

  constructor() {
    this.loadCars();
  }

  async loadCars() {
    this.store.setLoading(true);
    try {
      const location = await this.locationService.getUserLocation();
      console.log('[BrowsePage] User Location:', location);

      const searchFrom = new Date().toISOString();
      const searchTo = new Date(Date.now() + 86400000).toISOString();

      const results = await this.carsService.getAvailableCarsWithDistance(searchFrom, searchTo, {
        lat: location?.lat,
        lng: location?.lng,
      });

      console.log('[BrowsePage] RPC Results:', results.length);
      this.store.setCars(results as unknown as Car[]);
    } catch (e) {
      console.error('[BrowsePage] Error loading cars:', e);
      this.store.setLoading(false);
    }
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
    console.log('[BrowsePage] Marker Click:', id);
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
}
