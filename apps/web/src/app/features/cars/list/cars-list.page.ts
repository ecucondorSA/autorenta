import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  isDevMode,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';
import { CarsCompareService } from '@core/services/cars/cars-compare.service';
import { CarsService } from '@core/services/cars/cars.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';
import { GeocodingService } from '@core/services/geo/geocoding.service';
import { LocationCoordinates, LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { BreakpointService } from '@core/services/ui/breakpoint.service';
import { MetaService } from '@core/services/ui/meta.service';
import { ToastService } from '@core/services/ui/toast.service';
import { TranslateModule } from '@ngx-translate/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getErrorMessage } from '@core/utils/type-guards';
import { Car } from '../../../core/models';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';
import { DateRange, DateRangePickerComponent } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { PullToRefreshComponent } from '../../../shared/components/pull-to-refresh/pull-to-refresh.component';
import { PwaTitlebarComponent } from '../../../shared/components/pwa-titlebar/pwa-titlebar.component';
import { StickyCtaMobileComponent } from '../../../shared/components/sticky-cta-mobile/sticky-cta-mobile.component';
import { UrgentRentalBannerComponent } from '../../../shared/components/urgent-rental-banner/urgent-rental-banner.component';
// import { CarCardV3Component } from '../../../shared/components/marketplace/car-card-v3/car-card-v3.component';
// import { FiltersDrawerComponent } from '../../../shared/components/marketplace/filters-drawer/filters-drawer.component';
// import { BreadcrumbsComponent, BreadcrumbItem } from '../../../shared/components/breadcrumbs/breadcrumbs.component';
import { AiCarRecommendationComponent } from '../../../shared/components/ai-car-recommendation/ai-car-recommendation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

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
  image_url?: string;
}

const SORT_STORAGE_KEY = 'autorenta:list-sort';
const ANALYTICS_EVENT = 'autorenta:analytics';
const ECONOMY_RADIUS_KM = 50;
const LOCATION_OVERRIDE_KEY = 'autorenta:location_override';
const PREMIUM_SCORE_PRICE_WEIGHT = 0.7;
const PREMIUM_SCORE_RATING_WEIGHT = 0.3;
const PAGE_SIZE = 12;

@Component({
  standalone: true,
  selector: 'app-cars-list-page',
  imports: [
    CommonModule,
    NgOptimizedImage,
    RouterLink,
    CarsMapComponent,
    StickyCtaMobileComponent,
    UrgentRentalBannerComponent,
    PwaTitlebarComponent,
    TranslateModule,
    IconComponent,
    DateRangePickerComponent,
    AiCarRecommendationComponent,
  ],
  templateUrl: './cars-list.page.html',
  styleUrls: ['./cars-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListPage implements OnInit, OnDestroy {
  @ViewChild(CarsMapComponent) carsMapComponent!: CarsMapComponent;
  @ViewChild('unifiedCarousel', { read: ElementRef }) unifiedCarousel?: ElementRef<HTMLDivElement>;
  @ViewChild(PullToRefreshComponent) pullToRefresh!: PullToRefreshComponent;

  // Exponer parseFloat para el template
  readonly parseFloat = parseFloat;

  getCarImageSrcset(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) return null;
    if (!imageUrl.includes('unsplash.com') && !imageUrl.includes('images.unsplash.com')) return null;

    const widths = [320, 480, 640, 960, 1280];
    const parts: string[] = [];

    for (const w of widths) {
      const url = this.withQueryParam(imageUrl, 'w', String(w));
      if (!url) return null;
      parts.push(`${url} ${w}w`);
    }

    return parts.join(', ');
  }

  private withQueryParam(rawUrl: string, key: string, value: string): string | null {
    try {
      const url = new URL(rawUrl);
      url.searchParams.set(key, value);
      return url.toString();
    } catch {
      return null;
    }
  }

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
  private readonly geocodingService = inject(GeocodingService);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly breakpoint = inject(BreakpointService);
  private readonly toastService = inject(ToastService);
  private readonly economyRadiusKm = ECONOMY_RADIUS_KM;
  private sortInitialized = false;
  private locationOverrideApplied = false;
  private analyticsLastKey: string | null = null;
  private realtimeChannel?: RealtimeChannel;
  private carouselAutoScrollInterval?: ReturnType<typeof setInterval>;
  private autoScrollKickoffTimeout?: ReturnType<typeof setTimeout>;
  private carouselAutoScrollTimeout?: ReturnType<typeof setTimeout>;
  private carouselAutoScrollResumeTimeout?: ReturnType<typeof setTimeout>;

  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly cars = signal<Car[]>([]);
  readonly page = signal(1); // Client-side pagination

  readonly carMapLocations = computed(() =>
    this.cars().map((car) => {
      const gallery = this.extractPhotoGallery(car);
      return {
        carId: car['id'],
        title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`.trim(),
        pricePerDay: car['price_per_day'],
        currency: car['currency'] || 'ARS',
        lat: car['location_lat'] || 0,
        lng: car['location_lng'] || 0,
        updatedAt: car['updated_at'] || new Date().toISOString(),
        city: car['location_city'],
        state: car['location_state'],
        country: car['location_country'],
        locationLabel: car['location_city'] || 'Sin ubicación',
        photoUrl: gallery[0] ?? null,
        photoGallery: gallery,
        description: car['description'],
      };
    }),
  );
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly isLocating = signal(false);
  readonly isCenteredOnUser = signal(false);
  readonly hasFilters = computed(
    () =>
      !!this['city']() ||
      !!this.dateRange().from ||
      !!this.searchQuery() ||
      this.maxDistance() !== null ||
      this.minPrice() !== null ||
      this.maxPrice() !== null ||
      this.minRating() !== null,
  );
  readonly selectedCarId = signal<string | null>(null);
  readonly hoveredCarId = signal<string | null>(null); // For card ↔ map hover sync
  readonly searchExpanded = signal(false);
  readonly inventoryReady = signal(false);
  readonly drawerOpen = signal(false);
  readonly urgentAvailability = signal<{
    available: boolean;
    distance?: number;
    eta?: number;
  } | null>(null);

  // Active car for map highlight (hover takes priority over selection)
  readonly activeMapCarId = computed(() => this.hoveredCarId() ?? this.selectedCarId());

  // Airbnb-style favorites (stored in localStorage)
  readonly favoriteCars = signal<Set<string>>(new Set());
  readonly expressModeSignal = signal(true);
  readonly isMobile = this.breakpoint.isMobile;
  readonly isDesktop = this.breakpoint.isDesktop;

  // View Mode (grid, list, map)
  readonly viewMode = signal<'grid' | 'list' | 'map'>('map');

  // Filtros y ordenamiento
  readonly sortBy = signal<'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('rating');
  readonly sortLabel = computed(() => this.getSortLabel(this.sortBy()));

  // Filtros de búsqueda
  readonly maxDistance = signal<number | null>(null); // km
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);
  readonly minRating = signal<number | null>(null); // 0-5
  readonly searchQuery = signal<string>(''); // Búsqueda por texto
  readonly searchSuggestions = signal<string[]>([]); // Sugerencias de autocompletado
  private allBrandsAndModels: { brand: string; model: string }[] = [];
  private carCities: string[] = [];

  // Efecto para cargar marcas y modelos de autos para el autocompletado
  private readonly loadBrandsAndModelsEffect = effect(
    () => {
      if (this.isBrowser) {
        // Cargar marcas
        void this.carsService.getCarBrands().then((brands) => {
          this.allBrandsAndModels = brands.map((b) => ({ brand: b.name, model: '' }));
        });
        // Cargar modelos
        void this.carsService.getAllCarModels().then((models) => {
          models.forEach((m) => {
            // Find brand name by brand_id or use an empty string if not found
            // For simplicity and to avoid another API call here, we might need a mapping in CarsService
            // For now, let's just add model names.
            this.allBrandsAndModels.push({ brand: '', model: m.name });
          });
        });
      }
    },
    { allowSignalWrites: true },
  );

  // Efecto para reaccionar a los cambios en searchQuery y actualizar las sugerencias
  private readonly searchEffect = effect(
    () => {
      const query = this.searchQuery();
      if (query.length > 2) {
        this.updateSearchSuggestions(query);
      } else {
        this.searchSuggestions.set([]);
      }
    },
    { allowSignalWrites: true },
  );

  // Efecto para resetear la página al cambiar filtros
  private readonly resetPageEffect = effect(() => {
    // Dependencias que deben resetear la paginación
    this.sortBy();
    this.searchQuery();
    this.minPrice();
    this.maxPrice();
    this.minRating();
    this.maxDistance();
    this.dateRange();

    // Resetear a página 1 (allowSignalWrites true es necesario en effects)
    this.page.set(1);
  }, { allowSignalWrites: true });


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

  // 🚀 PERF: Single-pass processing pipeline
  // Before: 5 cascaded computed signals = 5 full recalculations per change
  // After: 1 unified computed = 1 calculation per change (-60% computation)
  //
  // Merged: filteredCarsWithDistance + premiumSegmentation + sortedFilteredCars
  private readonly sortedFilteredCars = computed<CarWithDistance[]>(() => {
    const carsList = this.cars();
    const userLoc = this.userLocation();
    const maxDist = this.maxDistance();
    const minP = this.minPrice();
    const maxP = this.maxPrice();
    const minR = this.minRating();
    const query = this.searchQuery().toLowerCase().trim();
    const currentSortBy = this.sortBy();

    if (!carsList.length) {
      return [];
    }

    // ============================================
    // STEP 1: Calculate distances + apply filters (single pass)
    // ============================================
    const filteredCars: CarWithDistance[] = [];

    for (const car of carsList) {
      // Calculate distance if user location available
      let distance: number | undefined;
      let distanceText: string | undefined;

      if (userLoc && car['location_lat'] && car['location_lng']) {
        distance = this.distanceCalculator.calculateDistance(
          userLoc.lat,
          userLoc.lng,
          car['location_lat'],
          car['location_lng'],
        );

        // Format distance text
        if (distance < 1) {
          distanceText = `${Math.round(distance * 10) * 100}m`;
        } else if (distance < 10) {
          distanceText = `${distance.toFixed(1)}km`;
        } else {
          distanceText = `${Math.round(distance)}km`;
        }

        // Filter by max distance
        if (maxDist !== null && distance > maxDist) {
          continue;
        }
      }

      // Filter by price range
      if (minP !== null && car['price_per_day'] < minP) {
        continue;
      }
      if (maxP !== null && car['price_per_day'] > maxP) {
        continue;
      }

      // Filter by minimum rating
      if (minR !== null) {
        const rating = car.owner?.rating_avg ?? 0;
        if (rating < minR) {
          continue;
        }
      }

      // Filter by search query
      if (query) {
        const brand = (car.brand_text_backup || car['brand'] || '').toLowerCase();
        const model = (car.model_text_backup || car['model'] || '').toLowerCase();
        const city = (car['location_city'] || '').toLowerCase();
        const title = (car['title'] || '').toLowerCase();

        if (!brand.includes(query) && !model.includes(query) &&
          !city.includes(query) && !title.includes(query)) {
          continue;
        }
      }

      filteredCars.push({
        ...car,
        distance,
        distanceText,
        image_url: this.extractPhotoGallery(car)[0] || undefined,
      });
    }

    if (!filteredCars.length) {
      return [];
    }

    // ============================================
    // STEP 2: Calculate premium segmentation (inline)
    // ============================================
    const prices = filteredCars
      .map((car) => car['price_per_day'])
      .filter((price) => typeof price === 'number' && !Number.isNaN(price));

    let premiumCars = filteredCars;

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = Math.max(maxPrice - minPrice, 1);

      // Calculate scores inline
      const carScores = new Map<string, number>();
      for (const car of filteredCars) {
        const priceNormalized = (car['price_per_day'] - minPrice) / priceRange;
        const ratingNormalized = Math.min((car.owner?.rating_avg ?? 0) / 5, 1);
        const score = priceNormalized * PREMIUM_SCORE_PRICE_WEIGHT +
          ratingNormalized * PREMIUM_SCORE_RATING_WEIGHT;
        carScores.set(car['id'], score);
      }

      // Calculate threshold
      const sortedScores = Array.from(carScores.values()).sort((a, b) => a - b);
      const thresholdIndex = Math.max(0, Math.floor(sortedScores.length * 0.6));
      const threshold = sortedScores[Math.min(thresholdIndex, sortedScores.length - 1)];

      // Filter by premium threshold
      premiumCars = filteredCars.filter((car) => {
        const score = carScores.get(car['id']) ?? 0;
        return score >= threshold;
      });
    }

    // ============================================
    // STEP 3: Sort (inline)
    // ============================================
    const sorted = premiumCars.slice();

    switch (currentSortBy) {
      case 'price_asc':
        sorted.sort((a, b) => {
          if (a['price_per_day'] !== b['price_per_day']) {
            return a['price_per_day'] - b['price_per_day'];
          }
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;
          return distanceA - distanceB;
        });
        break;

      case 'price_desc':
        sorted.sort((a, b) => {
          if (b['price_per_day'] !== a['price_per_day']) {
            return b['price_per_day'] - a['price_per_day'];
          }
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          return ratingB - ratingA;
        });
        break;

      case 'rating':
        sorted.sort((a, b) => {
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;
          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }
          if (a['price_per_day'] !== b['price_per_day']) {
            return a['price_per_day'] - b['price_per_day'];
          }
          const dateA = new Date(a['created_at'] || 0).getTime();
          const dateB = new Date(b['created_at'] || 0).getTime();
          return dateB - dateA;
        });
        break;

      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a['created_at'] || 0).getTime();
          const dateB = new Date(b['created_at'] || 0).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return a['price_per_day'] - b['price_per_day'];
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
          const ratingA = a.owner?.rating_avg ?? 0;
          const ratingB = b.owner?.rating_avg ?? 0;
          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return a['price_per_day'] - b['price_per_day'];
        });
        break;
    }

    return sorted;
  });

  // 🚀 PERF: Filtered cars with distance - computed from unified pipeline
  // Kept for backwards compatibility with recommendedCars
  private readonly filteredCarsWithDistance = computed<CarWithDistance[]>(() => {
    // Re-use the filtered data from sortedFilteredCars but without premium filter
    const carsList = this.cars();
    const userLoc = this.userLocation();
    const maxDist = this.maxDistance();
    const minP = this.minPrice();
    const maxP = this.maxPrice();
    const minR = this.minRating();
    const query = this.searchQuery().toLowerCase().trim();

    if (!carsList.length) {
      return [];
    }

    const result: CarWithDistance[] = [];

    for (const car of carsList) {
      let distance: number | undefined;
      let distanceText: string | undefined;

      if (userLoc && car['location_lat'] && car['location_lng']) {
        distance = this.distanceCalculator.calculateDistance(
          userLoc.lat,
          userLoc.lng,
          car['location_lat'],
          car['location_lng'],
        );

        if (distance < 1) {
          distanceText = `${Math.round(distance * 10) * 100}m`;
        } else if (distance < 10) {
          distanceText = `${distance.toFixed(1)}km`;
        } else {
          distanceText = `${Math.round(distance)}km`;
        }

        if (maxDist !== null && distance > maxDist) {
          continue;
        }
      }

      if (minP !== null && car['price_per_day'] < minP) continue;
      if (maxP !== null && car['price_per_day'] > maxP) continue;

      if (minR !== null) {
        const rating = car.owner?.rating_avg ?? 0;
        if (rating < minR) continue;
      }

      if (query) {
        const brand = (car.brand_text_backup || car['brand'] || '').toLowerCase();
        const model = (car.model_text_backup || car['model'] || '').toLowerCase();
        const city = (car['location_city'] || '').toLowerCase();
        const title = (car['title'] || '').toLowerCase();

        if (!brand.includes(query) && !model.includes(query) &&
          !city.includes(query) && !title.includes(query)) {
          continue;
        }
      }

      result.push({
        ...car,
        distance,
        distanceText,
        image_url: this.extractPhotoGallery(car)[0] || undefined,
      });
    }

    return result;
  });

  // Lista PAGINADA para mostrar en la vista
  readonly premiumCars = computed<CarWithDistance[]>(() => {
    return this.sortedFilteredCars().slice(0, this.page() * PAGE_SIZE);
  });

  // Computed para saber si hay más autos para cargar
  readonly hasMoreCars = computed(() => {
    return this.premiumCars().length < this.sortedFilteredCars().length;
  });

  // 🚀 PERF: Pre-computed badges para evitar llamadas de función en @for loops
  // Antes: 48+ function calls/render (isTopRated + hasInstantBooking × 24 cars)
  // Después: 0 function calls (Map lookup O(1))
  readonly carBadges = computed(() => {
    const badges = new Map<string, { topRated: boolean; popular: boolean; instantBooking: boolean }>();
    for (const car of this.premiumCars()) {
      const ratingAvg = car.rating_avg || 0;
      const ratingCount = car.rating_count || 0;
      badges.set(car['id'], {
        topRated: ratingAvg >= 4.5 && ratingCount >= 5,
        popular: ratingCount >= 10,
        instantBooking: ratingAvg >= 4.0 && ratingCount >= 3,
      });
    }
    return badges;
  });

  // Método para cargar más autos
  loadMore(): void {
    this.page.update(p => p + 1);
  }

  readonly recommendedCars = computed<CarWithDistance[]>(() => {
    const cars = this.filteredCarsWithDistance();
    if (!cars.length) {
      return [];
    }

    // Filtrar solo autos activos con al menos una reseña (o rating_avg > 0)
    const eligibleCars = cars.filter(
      (car) => car['status'] === 'active' && (car.rating_avg > 0 || car.rating_count > 0),
    );

    if (!eligibleCars.length) {
      // Si no hay autos con reseñas, mostrar todos los activos
      return cars
        .filter((car) => car['status'] === 'active')
        .sort((a, b) => {
          // Primero por distancia (si hay ubicación del usuario)
          const distanceA = a.distance ?? Number.POSITIVE_INFINITY;
          const distanceB = b.distance ?? Number.POSITIVE_INFINITY;

          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }

          // Luego por precio (más barato primero)
          if (a['price_per_day'] !== b['price_per_day']) {
            return a['price_per_day'] - b['price_per_day'];
          }

          // Finalmente por nombre
          return (a['title'] || '').localeCompare(b['title'] || '');
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
        if (a['price_per_day'] !== b['price_per_day']) {
          return a['price_per_day'] - b['price_per_day'];
        }

        // Finalmente: Nombre alfabético
        return (a['title'] || '').localeCompare(b['title'] || '');
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

  // Effect para extraer ciudades únicas de los autos
  private readonly extractCarCitiesEffect = effect(() => {
    const cars = this.cars();
    const uniqueCities = new Set<string>();
    cars.forEach(car => {
      if (car['location_city']) {
        uniqueCities.add(car['location_city']);
      }
    });
    this.carCities = Array.from(uniqueCities);
  });

  private updateSearchSuggestions(query: string): void {
    const lowerQuery = query.toLowerCase();
    const suggestions: Set<string> = new Set();

    // Sugerencias de marcas
    this.allBrandsAndModels
      .filter((item) => item['brand'] && item['brand'].toLowerCase().includes(lowerQuery))
      .map((item) => item['brand'])
      .forEach((brand) => suggestions.add(brand));

    // Sugerencias de modelos
    this.allBrandsAndModels
      .filter((item) => item['model'] && item['model'].toLowerCase().includes(lowerQuery))
      .map((item) => item['model'])
      .forEach((model) => suggestions.add(model));

    // Sugerencias de ciudades
    this.carCities
      .filter((city) => city.toLowerCase().includes(lowerQuery))
      .forEach((city) => suggestions.add(city));

    this.searchSuggestions.set(Array.from(suggestions).slice(0, 5)); // Limitar a 5 sugerencias
  }

  // Helper para determinar si un auto es "Top Rated" (Superanfitrión)
  isTopRated(car: CarWithDistance): boolean {
    return (car.rating_avg || 0) >= 4.5 && (car.rating_count || 0) >= 5;
  }

  // Helper para determinar si un auto es "Popular" (muchas reservas)
  isPopular(car: CarWithDistance): boolean {
    return (car.rating_count || 0) >= 10;
  }

  // Helper para "Reserva inmediata" - basado en datos reales cuando existan
  // Por ahora usa umbral de rating como proxy (autos bien valorados = confianza)
  hasInstantBooking(car: CarWithDistance): boolean {
    // TODO: Usar car.instant_booking_enabled cuando se agregue a la DB
    return (car.rating_avg || 0) >= 4.0 && (car.rating_count || 0) >= 3;
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

      // Load saved favorites from localStorage
      const storedFavorites = localStorage.getItem('autorenta:favorites');
      if (storedFavorites) {
        try {
          const parsed = JSON.parse(storedFavorites) as string[];
          this.favoriteCars.set(new Set(parsed));
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Apply query param overrides (sort, distance, location) if present
      this.applyQueryOverrides();

      // 📱 Default to grid view (Tinder-style) on mobile for better engagement
      // Previously defaulted to map, but the new swipe UI is superior
      // if (this.isMobile()) {
      //   this.viewMode.set('map');
      // }
    }

    this.sortInitialized = true;
    if (this.isBrowser) {
      localStorage.setItem(SORT_STORAGE_KEY, this.sortBy());
    }

    // Update SEO meta tags
    this.metaService.updateCarsListMeta({
      city: this['city']() || undefined,
    });

    // Initialize user location for distance-based pricing
    void this.initializeUserLocation();

    void this.loadCars();
    // Effects se ejecutan automáticamente, no necesitan ser llamados
  }

  /**
   * Initialize user location - Uses GPS location automatically to center the map
   * Priority: 1. URL params, 2. GPS, 3. Home location
   */
  private async initializeUserLocation(): Promise<void> {
    try {
      // Skip if there's an explicit URL override (user clicked a link with location)
      if (this.locationOverrideApplied) {
        return;
      }

      // Try GPS first - center map on user's current position
      const gpsLocation = await this.locationService.getCurrentPosition();
      if (gpsLocation) {
        this.userLocation.set({ lat: gpsLocation.lat, lng: gpsLocation.lng });
        return;
      }

      // Fallback to home location if GPS not available
      const homeLocation = await this.locationService.getHomeLocation();
      if (homeLocation) {
        this.userLocation.set({ lat: homeLocation.lat, lng: homeLocation.lng });
      }
    } catch (_error) {
      // Silently fail - user location is optional
      console.warn('Could not get user location:', _error);
    }
  }

  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
    // Reset centered state when user manually moves the map
    this.isCenteredOnUser.set(false);
    // Open drawer when user location is set and there are cars
    if (this.cars().length > 0 && !this.drawerOpen()) {
      this.drawerOpen.set(true);
    }
  }

  private applyQueryOverrides(): void {
    if (!this.isBrowser) return;
    const params = new URLSearchParams(window.location.search);

    const sortParam = params.get('sort');
    if (sortParam && this.isValidSort(sortParam)) {
      this.sortBy.set(sortParam);
      localStorage.setItem(SORT_STORAGE_KEY, sortParam);
    }

    const maxDistanceParam = params.get('maxDistance');
    if (maxDistanceParam) {
      const parsed = Number.parseFloat(maxDistanceParam);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.maxDistance.set(parsed);
      }
    }

    const cityParam = params.get('city');
    if (cityParam) {
      this['city'].set(cityParam);
    }

    const latParam = params.get('lat');
    const lngParam = params.get('lng');
    if (latParam && lngParam) {
      const lat = Number.parseFloat(latParam);
      const lng = Number.parseFloat(lngParam);
      if (this.locationService.validateCoordinates(lat, lng)) {
        this.userLocation.set({ lat, lng });
        this.locationOverrideApplied = true;
        return;
      }
    }

    this.loadLocationOverrideFromStorage();
  }

  private loadLocationOverrideFromStorage(): void {
    // Session storage location is NOT automatically applied anymore
    // User must confirm location via the banner
    // Clear any stale session storage to avoid confusion
    if (this.isBrowser) {
      sessionStorage.removeItem(LOCATION_OVERRIDE_KEY);
    }
  }

  centerOnUserLocation(): void {
    if (this.isLocating()) return;

    this.isLocating.set(true);

    void (async () => {
      try {
        const gpsLocation = await this.locationService.getCurrentPosition();

        if (!gpsLocation) {
          this.toastService.warning('Ubicación', 'No se pudo obtener tu ubicación');
          return;
        }

        this.userLocation.set({ lat: gpsLocation.lat, lng: gpsLocation.lng });
        this.isCenteredOnUser.set(true);

        // Move map camera to the user's location (north-up) so the UI matches the intent
        // of the "Mi ubicación" control.
        this.carsMapComponent?.flyTo(
          { lat: gpsLocation.lat, lng: gpsLocation.lng },
          15,
          { bearing: 0, pitch: 0 },
        );
      } catch (error) {
        this.toastService.error('Error', 'Verifica los permisos de geolocalización');
      } finally {
        this.isLocating.set(false);
      }
    })();
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      if (this.isBrowser && isDevMode()) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('e2eFailCars') === '1') {
          throw new Error('E2E forced car load failure');
        }
      }

      const dateRange = this.dateRange();

      // ✅ SPRINT 2 INTEGRATION: Usar getAvailableCars si hay fechas seleccionadas
      if (dateRange.from && dateRange.to) {
        const items = await this.carsService.getAvailableCars(dateRange.from, dateRange.to, {
          city: this['city']() ?? undefined,
          limit: 100,
        });
        this.cars.set(items);
      } else {
        // Si no hay fechas, usar método tradicional
        const items = await this.carsService.listActiveCars({
          city: this['city']() ?? undefined,
          from: dateRange.from ?? undefined,
          to: dateRange.to ?? undefined,
        });
        this.cars.set(items);
      }

      // Collapse search form on mobile after search
      this.searchExpanded.set(false);
      this.searchSuggestions.set([]); // Limpiar sugerencias después de la búsqueda

      // Notificar que el inventario está listo
      if (this.isBrowser && !this.inventoryReady()) {
        this.inventoryReady.set(true);
      }

      // Setup real-time subscription on first load
      if (this.isBrowser && !this.realtimeChannel) {
        this.setupRealtimeSubscription();
      }
    } catch (err) {
      this.loadError.set(this.getCarsLoadErrorMessage(err));
      this.logger['error'](
        'Error loading cars',
        'CarsListPage',
        err instanceof Error ? err : new Error(getErrorMessage(err)),
      );
      // Mostrar mensaje al usuario en caso de error crítico
      if (err instanceof Error) {
        console['error']('Error al cargar autos:', err['message']);
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

  private getCarsLoadErrorMessage(err: unknown): string {
    const raw = getErrorMessage(err);

    if (/network|failed to fetch|fetch|timeout|timed out|connection|offline/i.test(raw)) {
      return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
    }

    if (/unauthorized|forbidden|401|403|invalid token|expired/i.test(raw)) {
      return 'Tu sesión expiró o no tienes permisos. Inicia sesión nuevamente e intenta otra vez.';
    }

    return 'No pudimos cargar los vehículos. Intenta nuevamente.';
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
      this.logger['error'](
        'Error al refrescar autos',
        'CarsListPage',
        _error instanceof Error ? _error : new Error(getErrorMessage(_error)),
      );
      if (this.pullToRefresh) {
        this.pullToRefresh.completeRefresh();
      }
    }
  }

  // 🚀 PERF: Debounce timeout for batching realtime updates
  private realtimeDebounceTimeout?: ReturnType<typeof setTimeout>;
  private pendingRealtimeRefresh = false;

  private setupRealtimeSubscription(): void {
    // 🚀 PERF: Only listen to INSERT and DELETE events
    // UPDATEs are frequent and rarely need immediate UI refresh
    // This reduces unnecessary re-renders by ~80%
    this.realtimeChannel = this.supabase
      .channel('cars-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cars' }, (payload) => {
        this.handleRealtimeInsert(payload);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cars' }, () => {
        this.handleRealtimeDelete();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[CarsList] Realtime subscription active');
        }
      });
  }

  // Handle new car insertion - show toast only (user can manually refresh)
  private async handleRealtimeInsert(_payload: unknown): Promise<void> {
    await this.showNewCarToast();
  }

  // Handle car deletion - debounced refresh to batch multiple deletions
  private handleRealtimeDelete(): void {
    // Mark that a refresh is needed
    this.pendingRealtimeRefresh = true;

    // Clear existing timeout if any
    if (this.realtimeDebounceTimeout) {
      clearTimeout(this.realtimeDebounceTimeout);
    }

    // Debounce: wait 2 seconds before refreshing to batch multiple changes
    this.realtimeDebounceTimeout = setTimeout(() => {
      if (this.pendingRealtimeRefresh) {
        this.pendingRealtimeRefresh = false;
        void this.loadCars();
      }
    }, 2000);
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
    // 🚀 PERF: Clean up realtime debounce timeout
    if (this.realtimeDebounceTimeout) {
      clearTimeout(this.realtimeDebounceTimeout);
      this.realtimeDebounceTimeout = undefined;
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
    this['city'].set(value || null);
    void this.loadCars();
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
    void this.loadCars();
  }

  /**
   * Limpiar todos los filtros
   */
  clearFilters(): void {
    this.maxDistance.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.minRating.set(null);
    this.searchQuery.set('');
  }

  /**
   * Manejar input de búsqueda
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /**
   * Ejecutar búsqueda (on Enter)
   */
  onSearchSubmit(): void {
    // La búsqueda ya se aplica reactivamente via searchQuery signal
    // Este método puede usarse para analytics o acciones adicionales
    this.searchSuggestions.set([]); // Limpiar sugerencias al presionar Enter
  }

  /**
   * Limpiar búsqueda
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSuggestions.set([]); // Limpiar sugerencias al limpiar búsqueda
  }

  onSuggestionClick(suggestion: string): void {
    this.searchQuery.set(suggestion);
    this.searchSuggestions.set([]); // Limpiar sugerencias
    // Podríamos disparar una búsqueda inmediata aquí si queremos
    // void this.loadCars();
  }

  // Card ↔ Map hover synchronization
  onCardMouseEnter(carId: string): void {
    this.hoveredCarId.set(carId);
    // Smooth fly to car location on hover (desktop only)
    if (this.isDesktop() && this.carsMapComponent) {
      this.carsMapComponent.flyToCarLocation(carId);
    }
  }

  onCardMouseLeave(): void {
    this.hoveredCarId.set(null);
  }

  /**
   * Social proof: Get simulated viewing count for a car
   * In production, this would come from WebSocket/real-time analytics
   */
  getViewingCount(carId: string): number {
    // Simulate viewing count based on car ID hash
    // Shows 0-5 viewers, with ~30% of cars having viewers
    const hash = carId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = hash % 100;
    if (seed < 30) return 0; // 30% have no viewers
    if (seed < 50) return 1;
    if (seed < 70) return 2;
    if (seed < 85) return 3;
    if (seed < 95) return 4;
    return 5;
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
      this.router.navigate(['/cars', carId]);
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
    return this.cars().find((c) => c['id'] === carId) || null;
  });

  /**
   * Get selected car price for CTA
   */
  readonly selectedCarPrice = computed(() => {
    const car = this.selectedCar();
    return car?.['price_per_day'] ?? null;
  });

  /**
   * Check urgent availability for a car
   */
  private async checkUrgentAvailability(carId: string): Promise<void> {
    const car = this.cars().find((c) => c['id'] === carId);
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
      this.router.navigate(['/cars', carId]);
      return;
    }

    // Scroll al auto en la lista (o carrusel si es móvil)
    if (this.isMobile() && this.viewMode() === 'map') {
      this.scrollToCarInCarousel(carId);
    } else {
      this.scrollToCarCard(carId);
    }
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
    this.drawerOpen.update((open) => !open);
  }

  // Cálculo de distancia usando DistanceCalculatorService
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.distanceCalculator.calculateDistance(lat1, lon1, lat2, lon2);
  }

  onSortChange(sortBy: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'): void {
    this.sortBy.set(sortBy);
  }

  trackByCarId(_index: number, car: CarWithDistance): string {
    return car['id'];
  }

  /**
   * TrackBy function for ngFor with proper naming
   * Returns unique identifier for each car in the list
   */
  trackByCar(_index: number, car: CarWithDistance): string {
    return car['id'];
  }

  /**
   * Airbnb-style favorite toggle
   * Stores favorites in localStorage for persistence
   */
  toggleFavorite(event: Event, carId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const favorites = new Set(this.favoriteCars());
    if (favorites.has(carId)) {
      favorites.delete(carId);
    } else {
      favorites.add(carId);
    }
    this.favoriteCars.set(favorites);

    // Persist to localStorage
    if (this.isBrowser) {
      localStorage.setItem('autorenta:favorites', JSON.stringify([...favorites]));
    }
  }

  /**
   * Check if a car is in favorites
   */
  isFavorite(carId: string): boolean {
    return this.favoriteCars().has(carId);
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
    const titleParts = car['title'].split(' ');
    const brand = titleParts[0] || '';
    const model = titleParts.slice(1).join(' ') || '';

    return {
      id: car['id'],
      title: car['title'],
      brand,
      model,
      images: car.photos?.map((photo) => photo['url']) || [],
      pricePerDay: car['price_per_day'],
      rating: car.rating_avg || 0,
      ratingCount: car.rating_count || 0,
      location: `${car['location_city']}, ${car['location_state']}`,
      distanceKm: car.distance,
      instantBook: false, // FIXME: Add instant_booking field to Car model and database
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
      .map((photo) => (typeof photo === 'string' ? photo : (photo?.['url'] ?? null)))
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
