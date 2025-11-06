import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  computed,
  signal,
  inject,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CarsService } from '../../../core/services/cars.service';
import { CarsCompareService } from '../../../core/services/cars-compare.service';
import { MetaService } from '../../../core/services/meta.service';
import { TourService } from '../../../core/services/tour.service';
import { LoggerService } from '../../../core/services/logger.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';
import { DistanceCalculatorService } from '../../../core/services/distance-calculator.service';
import { LocationService } from '../../../core/services/location.service';
import { Car } from '../../../core/models';
import { DateRange, DateRangePickerComponent } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';
import {
  MapFiltersComponent,
  MapFilters,
} from '../../../shared/components/map-filters/map-filters.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { PullToRefreshComponent } from '../../../shared/components/pull-to-refresh/pull-to-refresh.component';

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
    CarsMapComponent,
    MapFiltersComponent,
    DateRangePickerComponent,
    CarCardComponent,
    SkeletonLoaderComponent,
    TranslateModule,
  ],
  templateUrl: './cars-list.page.html',
  styleUrls: ['./cars-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListPage implements OnInit, OnDestroy {
  @ViewChild(CarsMapComponent) carsMapComponent!: CarsMapComponent;
  @ViewChild('unifiedCarousel', { read: ElementRef }) unifiedCarousel?: ElementRef<HTMLDivElement>;
  @ViewChild(PullToRefreshComponent) pullToRefresh!: PullToRefreshComponent;

  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly compareService = inject(CarsCompareService);
  private readonly metaService = inject(MetaService);
  private readonly tourService = inject(TourService);
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly locationService = inject(LocationService);
  private readonly economyRadiusKm = ECONOMY_RADIUS_KM;
  private sortInitialized = false;
  private analyticsLastKey: string | null = null;
  private realtimeChannel?: RealtimeChannel;
  private carouselAutoScrollInterval?: ReturnType<typeof setInterval>;
  private autoScrollKickoffTimeout?: ReturnType<typeof setTimeout>;
  private carouselAutoScrollTimeout?: ReturnType<typeof setTimeout>;
  private carouselAutoScrollResumeTimeout?: ReturnType<typeof setTimeout>;

  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly carMapLocations = computed(() =>
    this.cars().map((car) => ({
      carId: car.id,
      title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`.trim(),
      pricePerDay: car.price_per_day,
      currency: car.currency || 'ARS',
      lat: car.location_lat || 0,
      lng: car.location_lng || 0,
      updatedAt: car.updated_at || new Date().toISOString(),
      city: car.location_city,
      state: car.location_state,
      country: car.location_country,
      locationLabel: car.location_city || 'Sin ubicación',
      photoUrl:
        car.photos && car.photos[0]
          ? typeof car.photos[0] === 'string'
            ? car.photos[0]
            : car.photos[0].url
          : null,
      description: car.description,
    })),
  );
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);
  readonly selectedCarId = signal<string | null>(null);
  readonly searchExpanded = signal(false);
  readonly inventoryReady = signal(false);
  readonly isMobile = computed(() => {
    if (!this.isBrowser) return false;
    return window.innerWidth < 1024;
  });

  // Filtros y ordenamiento
  readonly mapFilters = signal<MapFilters | null>(null);
  readonly sortBy = signal<'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('rating');
  readonly sortLabel = computed(() => this.getSortLabel(this.sortBy()));

  // Contadores para badge de resultados
  readonly filteredCount = computed(() => this.filteredCarsWithDistance().length);
  readonly totalCount = computed(() => this.cars().length);
  readonly hasActiveFilters = computed(() => {
    const f = this.mapFilters();
    if (!f) return false;
    if (f.minPrice > 5000 || f.maxPrice < 50000) return true;
    if (f.transmission !== 'all' || f.fuelType !== 'all') return true;
    if (f.minSeats > 2) return true;
    return Object.values(f.features).some((v) => v === true);
  });

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
    const recommendedCount = this.recommendedCars().length;
    const sort = this.sortBy();
    const key = `${premiumCount}:${recommendedCount}:${sort}`;
    if (key === this.analyticsLastKey) {
      return;
    }
    this.analyticsLastKey = key;
    this.trackAnalytics('inventory_segments_updated', {
      premiumCount,
      recommendedCount,
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
      carsList = carsList.filter((car) => {
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
        car.location_lng,
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
      .map((car) => car.price_per_day)
      .filter((price) => typeof price === 'number' && !Number.isNaN(price));

    if (!prices.length) {
      return null;
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = Math.max(maxPrice - minPrice, 1);

    const entries = cars.map((car) => {
      const priceNormalized = (car.price_per_day - minPrice) / priceRange;
      const ratingNormalized = Math.min((car.owner?.rating_avg ?? 0) / 5, 1);
      const score =
        priceNormalized * PREMIUM_SCORE_PRICE_WEIGHT +
        ratingNormalized * PREMIUM_SCORE_RATING_WEIGHT;
      return { id: car.id, score };
    });

    const sortedScores = entries.map((entry) => entry.score).sort((a, b) => a - b);

    const thresholdIndex = Math.max(0, Math.floor(sortedScores.length * 0.6));
    const threshold = sortedScores[Math.min(thresholdIndex, sortedScores.length - 1)];

    return {
      threshold,
      scores: new Map(entries.map((entry) => [entry.id, entry.score])),
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
      : cars.filter((car) => {
          const score = segmentation.scores.get(car.id) ?? 0;
          return score >= segmentation.threshold;
        });

    const sorted = list.slice();

    switch (this.sortBy()) {
      case 'price_asc':
        sorted.sort((a, b) => {
          // 1. Por precio bajo → alto
          if (a.price_per_day !== b.price_per_day) {
            return a.price_per_day - b.price_per_day;
          }
          // 2. Desempate por rating
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          // 3. Desempate por distancia
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;
          return distanceA - distanceB;
        });
        break;
      case 'price_desc':
        sorted.sort((a, b) => {
          // 1. Por precio alto → bajo
          if (b.price_per_day !== a.price_per_day) {
            return b.price_per_day - a.price_per_day;
          }
          // 2. Desempate por rating
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          return ratingB - ratingA;
        });
        break;
      case 'rating':
        sorted.sort((a, b) => {
          // 1. Por rating (mejor → peor)
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          // 2. Desempate por distancia
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;
          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }
          // 3. Desempate por precio (más barato primero)
          if (a.price_per_day !== b.price_per_day) {
            return a.price_per_day - b.price_per_day;
          }
          // 4. Desempate por más nuevo
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;
      case 'newest':
        sorted.sort((a, b) => {
          // 1. Por fecha (más nuevo → antiguo)
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          // 2. Desempate por rating
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          // 3. Desempate por precio
          return a.price_per_day - b.price_per_day;
        });
        break;
      case 'distance':
      default:
        sorted.sort((a, b) => {
          // 1. Por distancia (cerca → lejos)
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;
          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }
          // 2. Desempate por rating
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          // 3. Desempate por precio
          return a.price_per_day - b.price_per_day;
        });
        break;
    }

    return sorted;
  });

  readonly recommendedCars = computed<CarWithDistance[]>(() => {
    const cars = this.filteredCarsWithDistance();
    if (!cars.length) {
      return [];
    }

    // Filtrar solo autos activos con al menos una reseña (o rating_avg > 0)
    const eligibleCars = cars.filter(car =>
      car.status === 'active' &&
      (car.rating_avg > 0 || car.rating_count > 0)
    );

    if (!eligibleCars.length) {
      // Si no hay autos con reseñas, mostrar todos los activos
      return cars
        .filter(car => car.status === 'active')
        .sort((a, b) => {
          // Primero por distancia (si hay ubicación del usuario)
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;

          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }

          // Luego por precio (más barato primero)
          if (a.price_per_day !== b.price_per_day) {
            return a.price_per_day - b.price_per_day;
          }

          // Finalmente por nombre
          return (a.title || '').localeCompare(b.title || '');
        })
        .slice(0, 15);
    }

    // Ordenar por rating primero, luego distancia
    return eligibleCars
      .sort((a, b) => {
        // Primero: Rating promedio (mayor mejor)
        const ratingA = a.rating_avg || 0;
        const ratingB = b.rating_avg || 0;

        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Mayor rating primero
        }

        // Segundo: Cantidad de reseñas (más reseñas = más confiable)
        const reviewsA = a.rating_count || 0;
        const reviewsB = b.rating_count || 0;

        if (reviewsA !== reviewsB) {
          return reviewsB - reviewsA; // Más reseñas primero
        }

        // Tercero: Distancia (más cerca mejor, si hay ubicación)
        const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
        const distanceB = b.distance ?? Number.POSITIVE_INFINITY;

        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }

        // Cuarto: Precio (más barato primero)
        if (a.price_per_day !== b.price_per_day) {
          return a.price_per_day - b.price_per_day;
        }

        // Finalmente: Nombre alfabético
        return (a.title || '').localeCompare(b.title || '');
      })
      .slice(0, 15);
  });

  readonly showRecommendedCarousel = computed(() => {
    const recommended = this.recommendedCars();
    if (!recommended.length) {
      return false;
    }

    // Mostrar siempre si hay autos recomendados
    // Esto asegura que el carousel aparezca cuando haya autos con reseñas
    return recommended.length >= 3; // Mostrar mínimo 3 autos
  });

  // Helper para determinar si un auto es "Top Rated"
  isTopRated(car: CarWithDistance): boolean {
    return (car.rating_avg || 0) >= 4.5 && (car.rating_count || 0) >= 5;
  }

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

    // Initialize user location for distance-based pricing
    void this.initializeUserLocation();

    void this.loadCars();
  }

  /**
   * Initialize user location from profile or GPS
   */
  private async initializeUserLocation(): Promise<void> {
    try {
      const locationData = await this.locationService.getUserLocation();
      if (locationData) {
        this.userLocation.set({
          lat: locationData.lat,
          lng: locationData.lng,
        });
      }
    } catch (error) {
      // Silently fail - user location is optional
      console.warn('Could not get user location:', error);
    }
  }

  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    try {
      const dateRange = this.dateRange();

      // ✅ SPRINT 2 INTEGRATION: Usar getAvailableCars si hay fechas seleccionadas
      if (dateRange.from && dateRange.to) {
        const items = await this.carsService.getAvailableCars(dateRange.from, dateRange.to, {
          city: this.city() ?? undefined,
          limit: 100,
        });
        this.cars.set(items);
      } else {
        // Si no hay fechas, usar método tradicional
        const items = await this.carsService.listActiveCars({
          city: this.city() ?? undefined,
          from: dateRange.from ?? undefined,
          to: dateRange.to ?? undefined,
        });
        this.cars.set(items);
      }

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
      this.logger.error('Error loading cars', err);
      // Mostrar mensaje al usuario en caso de error crítico
      if (err instanceof Error) {
        console.error('Error al cargar autos:', err.message);
      }
    } finally {
      this.loading.set(false);

      // Iniciar auto-scroll del carousel después de cargar los autos
      if (this.autoScrollKickoffTimeout) {
        clearTimeout(this.autoScrollKickoffTimeout);
        this.autoScrollKickoffTimeout = undefined;
      }

      if (this.recommendedCars().length >= 3) {
        this.autoScrollKickoffTimeout = setTimeout(() => this.startCarouselAutoScroll(), 1000);
      } else {
        this.stopCarouselAutoScroll();
      }
    }
  }

  /**
   * 🔄 Handle pull-to-refresh
   * Método para actualizar la lista de autos
   */
  async handleRefresh(): Promise<void> {
    try {
      await this.loadCars();
      
      // Completar el refresh
      if (this.pullToRefresh) {
        this.pullToRefresh.completeRefresh();
      }
    } catch (error) {
      this.logger.error('Error al refrescar autos', error);
      if (this.pullToRefresh) {
        this.pullToRefresh.completeRefresh();
      }
    }
  }

  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabase
      .channel('cars-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars' }, (payload) => {
        this.handleRealtimeUpdate(payload);
      })
      .subscribe();
  }

  private async handleRealtimeUpdate(payload: {
    eventType: string;
    [key: string]: unknown;
  }): Promise<void> {
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

    // Show simple notification banner (usando createElement para evitar XSS)
    const banner = document.createElement('div');
    banner.className =
      'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down';

    // Crear elementos de forma segura (sin innerHTML)
    const messageSpan = document.createElement('span');
    messageSpan.textContent = '¡Nuevos vehículos disponibles!';

    const refreshButton = document.createElement('button');
    refreshButton.className = 'underline font-medium';
    refreshButton.textContent = 'Ver ahora';
    refreshButton.addEventListener('click', () => {
      void this.loadCars();
      banner.remove();
    });

    const closeButton = document.createElement('button');
    closeButton.className = 'ml-2';
    closeButton.textContent = '✕';
    closeButton.setAttribute('aria-label', 'Cerrar');
    closeButton.addEventListener('click', () => {
      banner.remove();
    });

    banner.appendChild(messageSpan);
    banner.appendChild(refreshButton);
    banner.appendChild(closeButton);

    document.body.appendChild(banner);

    // Auto-remove after 5 seconds
    setTimeout(() => banner.remove(), 5000);
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
    if (this.autoScrollKickoffTimeout) {
      clearTimeout(this.autoScrollKickoffTimeout);
      this.autoScrollKickoffTimeout = undefined;
    }
    this.stopCarouselAutoScroll();
  }

  /**
   * Inicia el auto-scroll del carousel
   * Se mueve automáticamente cada 3 segundos
   */
  startCarouselAutoScroll(): void {
    if (!this.isBrowser) return;

    // Limpiar interval existente
    this.stopCarouselAutoScroll();

    // Iniciar auto-scroll después de 2 segundos (dar tiempo a que cargue)
    if (this.carouselAutoScrollTimeout) {
      clearTimeout(this.carouselAutoScrollTimeout);
    }

    this.carouselAutoScrollTimeout = setTimeout(() => {
      this.carouselAutoScrollInterval = setInterval(() => {
        this.scrollCarouselNext();
      }, 3000); // Cada 3 segundos
    }, 2000);
  }

  /**
   * Detiene el auto-scroll del carousel
   */
  stopCarouselAutoScroll(): void {
    if (this.carouselAutoScrollTimeout) {
      clearTimeout(this.carouselAutoScrollTimeout);
      this.carouselAutoScrollTimeout = undefined;
    }
    if (this.carouselAutoScrollInterval) {
      clearInterval(this.carouselAutoScrollInterval);
      this.carouselAutoScrollInterval = undefined;
    }
    // Limpiar también el timeout de reanudación si existe
    if (this.carouselAutoScrollResumeTimeout) {
      clearTimeout(this.carouselAutoScrollResumeTimeout);
      this.carouselAutoScrollResumeTimeout = undefined;
    }
  }

  /**
   * Scroll al siguiente item del carousel
   */
  private scrollCarouselNext(): void {
    const carousel = this.unifiedCarousel?.nativeElement;
    if (!carousel) return;

    const cardWidth = 340 + 12; // min-width + gap
    const currentScroll = carousel.scrollLeft;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    // Si llegó al final, volver al inicio
    if (currentScroll >= maxScroll - 10) {
      carousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      // Scroll al siguiente item
      carousel.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  }

  /**
   * Pausar auto-scroll cuando el usuario interactúa
   */
  onCarouselMouseEnter(): void {
    this.stopCarouselAutoScroll();
  }

  /**
   * Reanudar auto-scroll cuando el usuario deja de interactuar
   */
  onCarouselMouseLeave(): void {
    // Si hay un timeout de reanudación programado, cancelarlo
    // porque el usuario está interactuando activamente
    if (this.carouselAutoScrollResumeTimeout) {
      clearTimeout(this.carouselAutoScrollResumeTimeout);
      this.carouselAutoScrollResumeTimeout = undefined;
    }
    // Reanudar inmediatamente
    this.startCarouselAutoScroll();
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
    void this.loadCars();
  }

  onCarSelected(carId: string): void {
    const previousCarId = this.selectedCarId();
    this.selectedCarId.set(carId);
    
    // Pausar auto-scroll del carousel por 8 segundos
    this.stopCarouselAutoScroll();
    
    // Programar reanudación después de 8 segundos
    this.carouselAutoScrollResumeTimeout = setTimeout(() => {
      if (this.recommendedCars().length >= 3) {
        this.startCarouselAutoScroll();
      }
      this.carouselAutoScrollResumeTimeout = undefined;
    }, 8000);
    
    // Si es el mismo auto (doble click), navegar al detalle
    if (previousCarId === carId) {
      this.router.navigate(['/cars/detail', carId]);
      return;
    }
    
    // Primera selección: fly to location en el mapa
    if (this.carsMapComponent) {
      this.carsMapComponent.flyToCarLocation(carId);
    }
  }

  onMapCarSelected(carId: string): void {
    const previousCarId = this.selectedCarId();
    this.selectedCarId.set(carId);
    
    // Pausar auto-scroll del carousel por 8 segundos
    this.stopCarouselAutoScroll();
    
    // Programar reanudación después de 8 segundos
    this.carouselAutoScrollResumeTimeout = setTimeout(() => {
      if (this.recommendedCars().length >= 3) {
        this.startCarouselAutoScroll();
      }
      this.carouselAutoScrollResumeTimeout = undefined;
    }, 8000);
    
    // Si es el mismo auto, navegar al detalle
    if (previousCarId === carId) {
      this.router.navigate(['/cars/detail', carId]);
      return;
    }
    
    // Primera selección: scroll + highlight
    this.scrollToCarInCarousel(carId);
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

  // Cálculo de distancia usando DistanceCalculatorService
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.distanceCalculator.calculateDistance(lat1, lon1, lat2, lon2);
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

  private getSortLabel(
    sort: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest',
  ): string {
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

  private scrollToCarInCarousel(carId: string): void {
    if (!this.isBrowser || !this.unifiedCarousel) {
      return;
    }

    const carousel = this.unifiedCarousel.nativeElement;
    const card = carousel.querySelector(`[data-car-id="${carId}"]`) as HTMLElement;
    
    if (!card) {
      this.logger.warn('Car card not found in carousel', { carId });
      return;
    }

    // Scroll horizontal suave al card
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const carouselWidth = carousel.offsetWidth;
    const scrollPosition = cardLeft - (carouselWidth / 2) + (cardWidth / 2);

    carousel.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });

    // Highlight temporal
    card.classList.add('pulse-highlight');
    setTimeout(() => {
      card.classList.remove('pulse-highlight');
    }, 1500);
  }

  private isValidSort(
    value: string,
  ): value is 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' {
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
      }),
    );
  }
}
