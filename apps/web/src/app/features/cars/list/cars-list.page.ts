import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  computed,
  signal,
  inject,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CarsService } from '../../../core/services/cars.service';
import { CarsCompareService } from '../../../core/services/cars-compare.service';
import { MetaService } from '../../../core/services/meta.service';
import { TourService } from '../../../core/services/tour.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';
import { Car } from '../../../core/models';
import {
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';
import { MapFiltersComponent, MapFilters } from '../../../shared/components/map-filters/map-filters.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

// Interface para auto con distancia
export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
  body_type?: string | null;
}

interface PremiumSegmentation {
  threshold: number;
  scores: Map<string, number>;
}

const SORT_STORAGE_KEY = 'autorenta:list-sort';
const ANALYTICS_EVENT = 'autorenta:analytics';
const ECONOMY_RADIUS_KM = 50;
const PREMIUM_SCORE_PRICE_WEIGHT = 0.7;
const PREMIUM_SCORE_RATING_WEIGHT = 0.3;

@Component({
  standalone: true,
  selector: 'app-cars-list-page',
  imports: [
    CommonModule,
    RouterLink,
    CarsMapComponent,
    MapFiltersComponent,
    MoneyPipe,
    TranslateModule,
  ],
  templateUrl: './cars-list.page.html',
  styleUrls: ['./cars-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListPage implements OnInit, OnDestroy {
  @ViewChild(CarsMapComponent) carsMapComponent!: CarsMapComponent;

  private readonly carsService = inject(CarsService);
  private readonly compareService = inject(CarsCompareService);
  private readonly metaService = inject(MetaService);
  private readonly tourService = inject(TourService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly economyRadiusKm = ECONOMY_RADIUS_KM;
  private sortInitialized = false;
  private analyticsLastKey: string | null = null;
  private realtimeChannel?: RealtimeChannel;

  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);
  readonly selectedCarId = signal<string | null>(null);
  readonly searchExpanded = signal(false);
  readonly inventoryReady = signal(false);

  // Filtros y ordenamiento
  readonly mapFilters = signal<MapFilters | null>(null);
  readonly sortBy = signal<'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('price_desc');
  readonly sortLabel = computed(() => this.getSortLabel(this.sortBy()));

  private readonly persistSortEffect = effect(() => {
    if (!this.isBrowser || !this.sortInitialized) {
      return;
    }
    const sort = this.sortBy();
    localStorage.setItem(SORT_STORAGE_KEY, sort);
  });

  private readonly analyticsEffect = effect(() => {
    if (!this.isBrowser) {
      return;
    }
    const premiumCount = this.premiumCars().length;
    const economyCount = this.economyCars().length;
    const sort = this.sortBy();
    const key = `${premiumCount}:${economyCount}:${sort}`;
    if (key === this.analyticsLastKey) {
      return;
    }
    this.analyticsLastKey = key;
    this.trackAnalytics('inventory_segments_updated', {
      premiumCount,
      economyCount,
      sort,
    });
  });

  // Autos ordenados por distancia con información de distancia
  private readonly filteredCarsWithDistance = computed<CarWithDistance[]>(() => {
    let carsList = this.cars();
    const userLoc = this.userLocation();
    const filters = this.mapFilters();

    // Aplicar filtros
    if (filters) {
      carsList = carsList.filter(car => {
        // Filtro de precio
        if (car.price_per_day < filters.minPrice || car.price_per_day > filters.maxPrice) {
          return false;
        }

        // Filtro de transmisión
        if (filters.transmission !== 'all' && car.transmission !== filters.transmission) {
          return false;
        }

        // Filtro de combustible
        if (filters.fuelType !== 'all' && car.fuel_type !== filters.fuelType) {
          return false;
        }

        // Filtro de asientos
        if (car.seats < filters.minSeats) {
          return false;
        }

        // Filtro de características
        if (filters.features.ac && !car.features?.['ac']) return false;
        if (filters.features.gps && !car.features?.['gps']) return false;
        if (filters.features.bluetooth && !car.features?.['bluetooth']) return false;
        if (filters.features.backup_camera && !car.features?.['backup_camera']) return false;

        return true;
      });
    }

    if (!carsList.length) {
      return [] as CarWithDistance[];
    }

    return carsList.map((car) => {
      if (!userLoc || !car.location_lat || !car.location_lng) {
        return { ...car, distance: undefined, distanceText: undefined };
      }

      const distanceKm = this.calculateDistance(
        userLoc.lat,
        userLoc.lng,
        car.location_lat,
        car.location_lng
      );

      // Formatear texto de distancia
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

  private readonly premiumSegmentation = computed<PremiumSegmentation | null>(() => {
    const cars = this.filteredCarsWithDistance();
    if (!cars.length) {
      return null;
    }

    const prices = cars
      .map(car => car.price_per_day)
      .filter(price => typeof price === 'number' && !Number.isNaN(price));

    if (!prices.length) {
      return null;
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = Math.max(maxPrice - minPrice, 1);

    const entries = cars.map(car => {
      const priceNormalized = (car.price_per_day - minPrice) / priceRange;
      const ratingNormalized = Math.min((car.owner?.rating_avg ?? 0) / 5, 1);
      const score = priceNormalized * PREMIUM_SCORE_PRICE_WEIGHT + ratingNormalized * PREMIUM_SCORE_RATING_WEIGHT;
      return { id: car.id, score };
    });

    const sortedScores = entries
      .map(entry => entry.score)
      .sort((a, b) => a - b);

    const thresholdIndex = Math.max(0, Math.floor(sortedScores.length * 0.6));
    const threshold = sortedScores[Math.min(thresholdIndex, sortedScores.length - 1)];

    return {
      threshold,
      scores: new Map(entries.map(entry => [entry.id, entry.score])),
    };
  });

  readonly premiumCars = computed<CarWithDistance[]>(() => {
    const segmentation = this.premiumSegmentation();
    const cars = this.filteredCarsWithDistance();

    if (!cars.length) {
      return [];
    }

    const list = !segmentation
      ? cars
      : cars.filter(car => {
          const score = segmentation.scores.get(car.id) ?? 0;
          return score >= segmentation.threshold;
        });

    const sorted = list.slice();

    switch (this.sortBy()) {
      case 'price_asc':
        sorted.sort((a, b) => a.price_per_day - b.price_per_day);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price_per_day - a.price_per_day);
        break;
      case 'rating':
        sorted.sort((a, b) => {
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return b.price_per_day - a.price_per_day;
        });
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          return b.price_per_day - a.price_per_day;
        });
        break;
      case 'distance':
      default:
        sorted.sort((a, b) => {
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;
          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }
          return b.price_per_day - a.price_per_day;
        });
        break;
    }

    return sorted;
  });

  readonly economyCars = computed<CarWithDistance[]>(() => {
    const segmentation = this.premiumSegmentation();
    const cars = this.filteredCarsWithDistance();

    if (!cars.length) {
      return [];
    }

    const premiumSet = segmentation
      ? new Set(
          cars
            .filter(car => (segmentation.scores.get(car.id) ?? 0) >= segmentation.threshold)
            .map(car => car.id)
        )
      : new Set<string>();

    let list = cars.filter(car => {
      const withinRadius = car.distance === undefined || car.distance <= this.economyRadiusKm;
      if (!withinRadius) {
        return false;
      }

      if (!segmentation) {
        return true;
      }

      const score = segmentation.scores.get(car.id) ?? 0;
      return score < segmentation.threshold;
    });

    if (!list.length) {
      const nonPremium = cars.filter(car => !premiumSet.has(car.id));
      const source = nonPremium.length ? nonPremium : cars;

      list = source
        .slice()
        .sort((a, b) => {
          const priceDiff = a.price_per_day - b.price_per_day;
          if (priceDiff !== 0) {
            return priceDiff;
          }
          const distA = a.distance ?? Number.POSITIVE_INFINITY;
          const distB = b.distance ?? Number.POSITIVE_INFINITY;
          return distA - distB;
        })
        .slice(0, 12);
    }

    return list
      .sort((a, b) => {
        const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
        const distanceB = b.distance ?? Number.POSITIVE_INFINITY;

        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }
        if (a.price_per_day !== b.price_per_day) {
          return a.price_per_day - b.price_per_day;
        }
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 12);
  });

  readonly showEconomyCarousel = computed(() => {
    const economy = this.economyCars();
    if (!economy.length) {
      return false;
    }

    const premiumSet = new Set(this.premiumCars().map(car => car.id));

    if (premiumSet.size === 0) {
      const allCount = this.filteredCarsWithDistance().length;
      return economy.length < allCount;
    }

    return economy.some(car => !premiumSet.has(car.id));
  });

  // Comparación
  readonly compareCount = this.compareService.count;
  readonly maxCompareReached = computed(() => this.compareCount() >= 3);

  ngOnInit(): void {
    if (this.isBrowser) {
      const storedSort = localStorage.getItem(SORT_STORAGE_KEY);
      if (storedSort && this.isValidSort(storedSort)) {
        this.sortBy.set(storedSort);
      }
    }

    this.sortInitialized = true;
    if (this.isBrowser) {
      localStorage.setItem(SORT_STORAGE_KEY, this.sortBy());
    }

    // Update SEO meta tags
    this.metaService.updateCarsListMeta({
      city: this.city() || undefined,
    });

    void this.loadCars();
  }

  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
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
      // Collapse search form on mobile after search
      this.searchExpanded.set(false);
      
      // Notificar que el inventario está listo y esperar a que el DOM se actualice
      if (this.isBrowser && !this.inventoryReady()) {
        this.inventoryReady.set(true);
        setTimeout(() => {
          this.tourService.startGuidedBookingTour();
        }, 500);
      }

      // Setup real-time subscription on first load
      if (this.isBrowser && !this.realtimeChannel) {
        this.setupRealtimeSubscription();
      }
    } catch (err) {
      console.error('listActiveCars error', err);
    } finally {
      this.loading.set(false);
    }
  }

  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabase
      .channel('cars-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        (payload) => {
          this.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
  }

  private async handleRealtimeUpdate(payload: { eventType: string; [key: string]: unknown }): Promise<void> {
    const eventType = payload.eventType;
    
    if (eventType === 'INSERT') {
      await this.showNewCarToast();
    } else if (eventType === 'UPDATE' || eventType === 'DELETE') {
      // Silent refresh for updates/deletions
      await this.loadCars();
    }
  }

  private async showNewCarToast(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Show simple notification banner
    const banner = document.createElement('div');
    banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down';
    banner.innerHTML = `
      <span>¡Nuevos vehículos disponibles!</span>
      <button class="underline font-medium" onclick="this.parentElement.dispatchEvent(new CustomEvent('refresh'))">Ver ahora</button>
      <button class="ml-2" onclick="this.parentElement.remove()">✕</button>
    `;
    
    banner.addEventListener('refresh', () => {
      void this.loadCars();
      banner.remove();
    });
    
    document.body.appendChild(banner);
    
    // Auto-remove after 5 seconds
    setTimeout(() => banner.remove(), 5000);
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }

  toggleSearch(): void {
    this.searchExpanded.update((expanded) => !expanded);
  }

  onCityChange(value: string): void {
    this.city.set(value || null);
    void this.loadCars();
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
  }


  onCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
    if (this.carsMapComponent) {
      this.carsMapComponent.flyToCarLocation(carId);
    }
  }

  onMapCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
    if (this.carsMapComponent) {
      this.carsMapComponent.flyToCarLocation(carId);
    }
    this.scrollToCarCard(carId);
  }

  isCarSelected(carId: string): boolean {
    return this.selectedCarId() === carId;
  }

  // Comparación
  isCarComparing(carId: string): boolean {
    return this.compareService.isComparing(carId);
  }

  onCompareToggle(carId: string): void {
    if (this.compareService.isComparing(carId)) {
      this.compareService.removeCar(carId);
    } else {
      const added = this.compareService.addCar(carId);
      if (!added) {
        // Máximo alcanzado, se podría mostrar un mensaje
        // TODO: surface feedback to user (toast/snackbar)
      }
    }
  }

  // Cálculo de distancia usando Haversine Formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Filtros y ordenamiento
  onFiltersChange(filters: MapFilters): void {
    this.mapFilters.set(filters);
  }

  onFiltersReset(): void {
    this.mapFilters.set(null);
  }

  onSortChange(sortBy: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'): void {
    this.sortBy.set(sortBy);
  }

  trackByCarId(_index: number, car: CarWithDistance): string {
    return car.id;
  }

  private getSortLabel(sort: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'): string {
    switch (sort) {
      case 'distance':
        return 'distancia';
      case 'price_asc':
        return 'precio ascendente';
      case 'price_desc':
        return 'precio descendente';
      case 'rating':
        return 'mejor valoración';
      case 'newest':
        return 'más nuevos';
      default:
        return 'distancia';
    }
  }

  private scrollToCarCard(carId: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const card = document.getElementById(`car-card-${carId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private isValidSort(value: string): value is 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' {
    return ['distance', 'price_asc', 'price_desc', 'rating', 'newest'].includes(value);
  }

  private trackAnalytics(event: string, payload: Record<string, unknown>): void {
    if (!this.isBrowser) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(ANALYTICS_EVENT, {
        detail: {
          event,
          timestamp: Date.now(),
          source: 'cars-list-page',
          ...payload,
        },
      })
    );
  }

}
