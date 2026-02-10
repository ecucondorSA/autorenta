import {
  Component,
  DestroyRef,
  inject,
  computed,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { CarsService } from '@core/services/cars/cars.service';
import { LocationService, type LocationData } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { MetaService } from '@core/services/ui/meta.service';
import { Car } from '@core/models';
import { CarCardComponent } from '@shared/components/car-card/car-card.component';
import { CarsMapComponent } from '@shared/components/cars-map/cars-map.component';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { CarCarouselComponent } from '@shared/components/car-carousel/car-carousel.component';
import { BookingSheetComponent } from '@shared/components/booking-sheet/booking-sheet.component';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';
import { BrowseStore } from './browse.store';

@Component({
  selector: 'app-browse-cars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    CarCardComponent,
    CarsMapComponent,
    CarCarouselComponent,
    BookingSheetComponent,
    SkeletonLoaderComponent,
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
  @ViewChild(CarsMapComponent) carsMap!: CarsMapComponent;

  private carsService = inject(CarsService);
  private locationService = inject(LocationService);
  private readonly logger = inject(LoggerService).createChildLogger('BrowseCarsPage');
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly metaService = inject(MetaService);
  readonly store = inject(BrowseStore);

  readonly cars = this.store.filteredCars;
  readonly loading = this.store.loading;
  readonly selectedCarId = this.store.activeCarId;
  readonly viewMode = this.store.viewMode;
  readonly searchFrom = signal<string>(new Date().toISOString());
  readonly searchTo = signal<string>(new Date(Date.now() + 86400000).toISOString());
  /** Car currently being previewed in the carousel (scroll, not click) */
  readonly carouselPreviewId = signal<string | null>(null);
  /** Car being hovered in the carousel */
  readonly carouselHoveredId = signal<string | null>(null);
  /** The car to highlight on the map: hovered takes priority, then selected, then preview */
  readonly mapHighlightedCarId = computed(
    () => this.carouselHoveredId() ?? this.selectedCarId() ?? this.carouselPreviewId(),
  );
  private readonly pollIntervalMs = 30000;
  private lastLocation: LocationData | null = null;
  private lastLocationAt = 0;
  private isFetching = false;
  readonly isLocating = signal(false);

  readonly mapLocations = computed<CarMapLocation[]>(() => {
    // Use filteredCars so map updates with search query
    const list = this.store.filteredCars();
    this.logger.debug('Transforming cars for map', { count: list.length });
    return list.map((car) => {
      const ownerVerified = car.status !== 'pending' && car.owner?.id_verified !== false;
      return {
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
        availabilityStatus: car.status === 'active' ? 'available' : 'unavailable',
        instantBooking: car.auto_approval === true,
        transmission: car.transmission,
        seats: car.seats,
        fuelType: car.fuel_type,
        ownerVerified,
      };
    });
  });

  /** Format car title: Brand + Model (1st word only) + Year. Example: "Fiat Toro 2016" */
  private formatCarTitle(brand?: string, model?: string, year?: number): string {
    const brandWord = (brand || '').trim().split(' ')[0] || '';
    const modelWord = (model || '').trim().split(' ')[0] || '';
    const yearStr = year ? String(year) : '';
    return [brandWord, modelWord, yearStr].filter(Boolean).join(' ');
  }

  constructor() {
    this.metaService.updateCarsListMeta();
    this.initializeSearchRange();
    this.loadCars();
    interval(this.pollIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadCars({ silent: true });
      });
  }

  private initializeSearchRange(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const startParam = queryParams.get('startDate');
    const endParam = queryParams.get('endDate');

    if (startParam && endParam) {
      const start = new Date(startParam);
      const end = new Date(endParam);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
        this.searchFrom.set(start.toISOString());
        this.searchTo.set(end.toISOString());
      }
    }
  }

  async loadCars(options: { silent?: boolean } = {}) {
    if (this.isFetching) return;
    this.isFetching = true;
    if (!options.silent) {
      this.store.setLoading(true);
    }
    try {
      // Use cached location if available, otherwise resolve (but don't force new fetch if not needed)
      const location = await this.resolveLocation();
      this.logger.debug('User location', location ?? {});

      const searchFrom = this.searchFrom();
      const searchTo = this.searchTo();

      // Sync params with store
      this.store.setSearchParams({
        lat: location?.lat,
        lng: location?.lng,
        startDate: searchFrom,
        endDate: searchTo,
      });

      // Fallback: if we can't resolve user location (permissions denied, device limitations),
      // still show cars. We keep semantics: active cars should be "available" for the date range,
      // pending cars are visible but not bookable (greyed out).
      if (location?.lat == null || location?.lng == null) {
        const availableCars = await this.carsService.listActiveCars({
          from: searchFrom,
          to: searchTo,
        });
        const marketplaceCars = await this.carsService.listMarketplaceCars({});
        const pendingCars = marketplaceCars.filter((c) => c.status === 'pending');

        const availableIds = new Set(availableCars.map((c) => c.id));
        const merged = [...availableCars, ...pendingCars.filter((c) => !availableIds.has(c.id))];

        this.logger.warn(
          'Location unavailable. Cars loaded without distance (available + pending).',
          {
            available: availableCars.length,
            pending: pendingCars.length,
            merged: merged.length,
          },
        );

        this.store.setCars(merged);
        return;
      }

      const results = await this.carsService.getAvailableCarsWithDistance(searchFrom, searchTo, {
        lat: location?.lat,
        lng: location?.lng,
      });

      // Also fetch "visible but not bookable" cars (pending verification) so they appear greyed out.
      // We keep the RPC for "available" cars (distance/scoring + availability) and merge pending cars client-side.
      let pendingCars: Car[] = [];
      if (location?.lat != null && location?.lng != null) {
        const radiusKm = 30;
        const deltaLat = radiusKm / 111;
        const deltaLng = radiusKm / (111 * Math.max(0.2, Math.cos((location.lat * Math.PI) / 180)));

        const marketplaceCars = await this.carsService.listMarketplaceCars({
          bounds: {
            north: location.lat + deltaLat,
            south: location.lat - deltaLat,
            east: location.lng + deltaLng,
            west: location.lng - deltaLng,
          },
        });

        pendingCars = marketplaceCars.filter((c) => c.status === 'pending');
      }

      const availableCars = results as unknown as Car[];
      const availableIds = new Set(availableCars.map((c) => c.id));
      const merged = [...availableCars, ...pendingCars.filter((c) => !availableIds.has(c.id))];

      this.logger.debug('Cars loaded (available + pending)', {
        available: availableCars.length,
        pending: pendingCars.length,
        merged: merged.length,
      });

      this.store.setCars(merged);
    } catch (e) {
      this.logger.error('Error loading cars', e);
      this.store.setLoading(false);
    } finally {
      this.isFetching = false;
    }
  }

  async locateUser() {
    this.isLocating.set(true);
    try {
      const location = await this.locationService.getUserLocation();
      if (location) {
        this.lastLocation = location;
        this.lastLocationAt = Date.now();

        // 1. Center Map
        if (this.carsMap) {
          this.carsMap.flyTo({ lat: location.lat, lng: location.lng }, 14);
        }

        // 2. Refresh Cars with new center
        await this.loadCars({ silent: false });
      }
    } catch (e) {
      this.logger.error('Error locating user', e);
    } finally {
      this.isLocating.set(false);
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

  /**
   * Handle marker hover/selection from map (for carousel sync only, NOT modal)
   */
  onMarkerHover(carId: string | null) {
    if (carId === null) {
      this.store.setHoveredCar(null);
      return;
    }
    this.store.setHoveredCar(carId);
    // Scroll carousel to show the hovered car
    const element = document.getElementById('car-' + carId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Handle marker click with native event validation (opens modal only on genuine user click)
   */
  onMarkerClickWithEvent(data: { carId: string; event: MouseEvent | null }) {
    const { carId, event } = data;
    this.logger.debug('Marker click with event', { carId, isTrusted: event?.isTrusted });

    // Validate that this is a genuine user interaction
    if (!event || !event.isTrusted) {
      this.logger.debug('Modal blocked - event not trusted');
      return;
    }

    // Open modal via validated path
    this.store.openModalWithValidation(carId, event, 'map');

    // Scroll carousel to show the clicked car
    const element = document.getElementById('car-' + carId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /** @deprecated Use onMarkerClickWithEvent instead */
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
        : ((carId as { detail?: { carId?: string }; carId?: string })?.detail?.carId ??
          (carId as { detail?: { carId?: string }; carId?: string })?.carId ??
          String(carId));
    this.logger.debug('Marker click (legacy)', { id });
    this.store.setActiveCar(id, 'map');
    const element = document.getElementById('car-' + id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  onBookingConfirm() {
    const carId = this.selectedCarId();
    if (carId) {
      const startDate = this.searchFrom();
      const endDate = this.searchTo();
      void this.router.navigate(['/bookings/request'], {
        queryParams: { carId, startDate, endDate },
      });
    }
  }

  toggleView() {
    this.store.toggleViewMode();
  }

  /**
   * Handle WebGL error from map component - auto-switch to list view as fallback
   */
  onWebGLError() {
    this.logger.warn('WebGL not available, switching to list view');
    this.store.setViewMode('list');
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

  onSearchQueryChange(query: string) {
    this.store.setFilterQuery(query);
  }

  /** Handle hover change from carousel */
  onCarouselHoverChange(carId: string | null) {
    this.carouselHoveredId.set(carId);
    this.store.setHoveredCar(carId);
  }
}
