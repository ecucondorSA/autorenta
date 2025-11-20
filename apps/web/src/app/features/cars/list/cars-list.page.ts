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
import { LoggerService } from '../../../core/services/logger.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';
import { DistanceCalculatorService } from '../../../core/services/distance-calculator.service';
import { LocationService } from '../../../core/services/location.service';
import { UrgentRentalService } from '../../../core/services/urgent-rental.service';
import { BreakpointService } from '../../../core/services/breakpoint.service';
import { Car } from '../../../core/models';
import { DateRange } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';
import { PullToRefreshComponent } from '../../../shared/components/pull-to-refresh/pull-to-refresh.component';
import {
  MapFiltersComponent,
  FilterState,
} from '../../../shared/components/map-filters/map-filters.component';
import { StickyCtaMobileComponent } from '../../../shared/components/sticky-cta-mobile/sticky-cta-mobile.component';
import { UrgentRentalBannerComponent } from '../../../shared/components/urgent-rental-banner/urgent-rental-banner.component';
import { WhatsappFabComponent } from '../../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { PwaTitlebarComponent } from '../../../shared/components/pwa-titlebar/pwa-titlebar.component';
// import { CarCardV3Component } from '../../../shared/components/marketplace/car-card-v3/car-card-v3.component';
// import { FiltersDrawerComponent } from '../../../shared/components/marketplace/filters-drawer/filters-drawer.component';
// import { BreadcrumbsComponent, BreadcrumbItem } from '../../../shared/components/breadcrumbs/breadcrumbs.component';
import { getErrorMessage } from '../../../core/utils/type-guards';

// Temporary BreadcrumbItem interface
interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
}

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
    StickyCtaMobileComponent,
    UrgentRentalBannerComponent,
    WhatsappFabComponent,
    PwaTitlebarComponent,
    // CarCardV3Component,
    // FiltersDrawerComponent,
    // BreadcrumbsComponent,
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
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly locationService = inject(LocationService);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly breakpoint = inject(BreakpointService);
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
    this.cars().map((car) => {
      const gallery = this.extractPhotoGallery(car);
      return {
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
        photoUrl: gallery[0] ?? null,
        photoGallery: gallery,
        description: car.description,
      };
    }),
  );
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);
  readonly selectedCarId = signal<string | null>(null);
  readonly searchExpanded = signal(false);
  readonly inventoryReady = signal(false);
  readonly drawerOpen = signal(false);
  readonly mapFilters = signal<FilterState>({
    dateRange: null,
    priceRange: null,
    vehicleTypes: null,
    immediateOnly: false,
    transmission: null,
  });
  readonly urgentAvailability = signal<{
    available: boolean;
    distance?: number;
    eta?: number;
  } | null>(null);
  readonly expressModeSignal = signal(true);
  readonly isMobile = this.breakpoint.isMobile;
  readonly isDesktop = this.breakpoint.isDesktop;

  // Filtros y ordenamiento
  readonly sortBy = signal<'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('rating');
  readonly sortLabel = computed(() => this.getSortLabel(this.sortBy()));

  // Contadores para badge de resultados
  readonly totalCount = computed(() => this.cars().length);

  // Breadcrumbs navigation
  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Inicio', url: '/', icon: '🏠' },
    { label: 'Explorar Autos', url: '/cars', icon: '🚗' },
    { label: `${this.premiumCars().length} Autos Disponibles` },
  ]);

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
    const eligibleCars = cars.filter(
      (car) => car.status === 'active' && (car.rating_avg > 0 || car.rating_count > 0),
    );

    if (!eligibleCars.length) {
      // Si no hay autos con reseñas, mostrar todos los activos
      return cars
        .filter((car) => car.status === 'active')
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
    } catch (_error) {
      // Silently fail - user location is optional
      console.warn('Could not get user location:', _error);
    }
  }

  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
    // Open drawer when user location is set and there are cars
    if (this.cars().length > 0 && !this.drawerOpen()) {
      this.drawerOpen.set(true);
    }
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

      // Notificar que el inventario está listo
      if (this.isBrowser && !this.inventoryReady()) {
        this.inventoryReady.set(true);
      }

      // Setup real-time subscription on first load
      if (this.isBrowser && !this.realtimeChannel) {
        this.setupRealtimeSubscription();
      }
    } catch (err) {
      this.logger.error(
        'Error loading cars',
        'CarsListPage',
        err instanceof Error ? err : new Error(getErrorMessage(err)),
      );
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
    } catch (_error) {
      this.logger.error(
        'Error al refrescar autos',
        'CarsListPage',
        _error instanceof Error ? _error : new Error(getErrorMessage(_error)),
      );
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
      'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success-light text-text-primary px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down';

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

    // Open drawer when car is selected
    if (!this.drawerOpen()) {
      this.drawerOpen.set(true);
    }

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

    // Check urgent availability for selected car
    void this.checkUrgentAvailability(carId);
  }

  /**
   * Handle map filters change
   */
  onFiltersChange(filters: FilterState): void {
    this.mapFilters.set(filters);
    // Update date range if changed
    if (filters.dateRange) {
      const from = filters.dateRange.start.toISOString().split('T')[0];
      const to = filters.dateRange.end.toISOString().split('T')[0];
      this.dateRange.set({ from, to });
    }
    // Reload cars with new filters
    void this.loadCars();
  }

  /**
   * Handle drawer close
   */
  onDrawerClose(): void {
    this.drawerOpen.set(false);
  }

  /**
   * Handle reserve click from drawer
   */
  onReserveClick(carId: string): void {
    // Navigate to car detail page or open booking modal
    this.router.navigate(['/cars', carId]);
  }

  /**
   * Get selected car for CTA
   */
  readonly selectedCar = computed(() => {
    const carId = this.selectedCarId();
    if (!carId) return null;
    return this.cars().find((c) => c.id === carId) || null;
  });

  /**
   * Get selected car price for CTA
   */
  readonly selectedCarPrice = computed(() => {
    const car = this.selectedCar();
    return car?.price_per_day ?? null;
  });

  /**
   * Check urgent availability for a car
   */
  private async checkUrgentAvailability(carId: string): Promise<void> {
    const car = this.cars().find((c) => c.id === carId);
    if (!car || !car.region_id) return;

    try {
      const availability = await this.urgentRentalService.checkImmediateAvailability(carId);
      this.urgentAvailability.set({
        available: availability.available,
        distance: availability.distance,
        eta: availability.eta,
      });
    } catch (_error) {
      console.warn('Could not check urgent availability:', _error);
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

  // Filters drawer management (mobile)
  openFiltersDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeFiltersDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleFiltersDrawer(): void {
    this.drawerOpen.update(open => !open);
  }

  // Cálculo de distancia usando DistanceCalculatorService
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.distanceCalculator.calculateDistance(lat1, lon1, lat2, lon2);
  }

  onSortChange(sortBy: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'): void {
    this.sortBy.set(sortBy);
  }

  trackByCarId(_index: number, car: CarWithDistance): string {
    return car.id;
  }

  /**
   * TrackBy function for ngFor with proper naming
   * Returns unique identifier for each car in the list
   */
  trackByCar(_index: number, car: CarWithDistance): string {
    return car.id;
  }

  /**
   * Convierte CarWithDistance al formato esperado por CarCardV3Component
   * Mapea los campos del modelo Car al formato simplificado de la card
   */
  carToCardFormat(car: CarWithDistance): {
    id: string;
    title: string;
    brand: string;
    model: string;
    images: string[];
    pricePerDay: number;
    rating: number;
    ratingCount: number;
    location: string;
    distanceKm?: number;
    instantBook?: boolean;
  } {
    // Extraer brand y model del title si no están disponibles
    const titleParts = car.title.split(' ');
    const brand = titleParts[0] || '';
    const model = titleParts.slice(1).join(' ') || '';

    return {
      id: car.id,
      title: car.title,
      brand,
      model,
      images: car.photos?.map(photo => photo.url) || [],
      pricePerDay: car.price_per_day,
      rating: car.rating_avg || 0,
      ratingCount: car.rating_count || 0,
      location: `${car.location_city}, ${car.location_state}`,
      distanceKm: car.distance,
      instantBook: false, // TODO: Add instant_booking field to Car model
    };
  }

  /**
   * Extract feature tags from car features object
   * Converts feature flags to display-friendly strings
   * @param features Feature flags object (e.g., { ac: true, gps: true })
   * @returns Array of feature tag strings
   */
  getFeatureTags(features: Record<string, boolean> | undefined): string[] {
    if (!features || typeof features !== 'object') {
      return [];
    }

    // Map feature keys to display labels
    const featureLabels: Record<string, string> = {
      ac: '❄️ AC',
      air_conditioning: '❄️ AC',
      gps: '🗺️ GPS',
      navigation: '🗺️ GPS',
      bluetooth: '🔵 Bluetooth',
      leather_seats: '🪑 Cuero',
      sunroof: '☀️ Techo',
      roof: '☀️ Techo',
      backup_camera: '📷 Cámara',
      camera: '📷 Cámara',
      usb_charging: '🔌 USB',
      usb: '🔌 USB',
      apple_carplay: '🍎 CarPlay',
      android_auto: '🤖 Android',
      cruise_control: '⚙️ Cruise',
      automatic_transmission: '⚙️ Automático',
      transmission: '⚙️ Automático',
      wifi: '📡 WiFi',
      heated_seats: '🔥 Calefacción',
      parking_sensors: '📡 Sensores',
      sensors: '📡 Sensores',
      all_wheel_drive: '🏔️ AWD',
      four_wheel_drive: '🏔️ 4WD',
      traction_control: '🛡️ Control',
      lane_departure: '⚠️ LDW',
      adaptive_cruise: '🎯 Adaptive',
    };

    return Object.entries(features)
      .filter(([, value]) => value === true)
      .map(([key]) => featureLabels[key.toLowerCase()] || key)
      .filter((label, index, array) => array.indexOf(label) === index); // Remove duplicates
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
      this.logger.warn(`Car card not found in carousel: ${carId}`, 'CarsListPage');
      return;
    }

    // Scroll horizontal suave al card
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const carouselWidth = carousel.offsetWidth;
    const scrollPosition = cardLeft - carouselWidth / 2 + cardWidth / 2;

    carousel.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth',
    });

    // Highlight temporal
    card.classList.add('pulse-highlight');
    setTimeout(() => {
      card.classList.remove('pulse-highlight');
    }, 1500);
  }

  private extractPhotoGallery(car: Car): string[] {
    const rawPhotos = car.photos ?? car.car_photos ?? [];
    if (!Array.isArray(rawPhotos)) {
      return [];
    }
    return rawPhotos
      .map((photo) => (typeof photo === 'string' ? photo : (photo?.url ?? null)))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
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
