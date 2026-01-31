import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { CarsService } from '@core/services/cars/cars.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';
import { GeocodingResult, GeocodingService } from '@core/services/geo/geocoding.service';
import { LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { environment } from '@environment';
import { RealtimeChannel } from '@supabase/supabase-js';

// QuickFilter interface defined locally (component was removed)
interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
}

// FabAction interface defined locally (component was removed)
interface FabAction {
  id: string;
  label: string;
  icon: string;
  color?: 'primary' | 'secondary';
}

import { BookingsService } from '@core/services/bookings/bookings.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';
import { BreakpointService } from '@core/services/ui/breakpoint.service';

import type { DateRange, LatLngBoundsLiteral, Stat } from '@core/models/marketplace.model';
import { CarLatestLocation, CarLocationService } from '@core/services/geo/car-location.service';
import { MapboxPreloaderService } from '@core/services/geo/mapbox-preloader.service';
import { AssetPreloaderService } from '@core/services/ui/asset-preloader.service';
import { SeoSchemaService } from '@core/services/ui/seo-schema.service';
import { ThemeService } from '@core/services/ui/theme.service';
import { Car } from '../../core/models';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { SmartSearchBarComponent } from '../../shared/components/smart-search-bar/smart-search-bar.component';
import { DateRangePickerComponent } from '../../shared/components/date-range-picker/date-range-picker.component';
import { HdriBackgroundComponent } from '../../shared/components/hdri-background/hdri-background.component';
import { FilterState } from '../../shared/components/map-filters/map-filters.component';
import { Tilt3dDirective } from '../../shared/directives/tilt-3d.directive';

interface CarWithLatestLocation extends Car {
  distance?: number;
  distanceText?: string;
  latest_location?: {
    lat: number;
    lng: number;
    recorded_at: string;
  };
}

// Type alias for backward compatibility
type ToastType = 'success' | 'info' | 'warning' | 'error';

@Component({
  selector: 'app-marketplace-v2-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgOptimizedImage,
    DateRangePickerComponent,
    HdriBackgroundComponent,
    Tilt3dDirective,
    CarCardComponent,
    SmartSearchBarComponent,
  ],
  templateUrl: './marketplace-v2.page.html',
  styleUrls: ['./marketplace-v2.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceV2Page implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  @ViewChild('drawerContent', { read: ElementRef }) drawerContent?: ElementRef<HTMLDivElement>;
  @ViewChild('hdriViewer') hdriViewer?: HdriBackgroundComponent;

  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly notificationManager = inject(NotificationManagerService);
  private readonly tiktokEvents = inject(TikTokEventsService);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly bookingsService = inject(BookingsService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly breakpoint = inject(BreakpointService);
  private readonly carLocationService = inject(CarLocationService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly seoSchemaService = inject(SeoSchemaService);
  readonly themeService = inject(ThemeService);
  private readonly assetPreloader = inject(AssetPreloaderService);
  private readonly mapboxPreloader = inject(MapboxPreloaderService);
  private locationSearchTimeout?: ReturnType<typeof setTimeout>;

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly cars = signal<Car[]>([]);
  readonly selectedCarId = signal<string | null>(null);
  readonly latestLocations = signal<Record<string, CarLatestLocation>>({});
  readonly generatedPhotoIds = signal<Set<string>>(new Set()); // Almacena IDs de autos con fotos generadas

  // Calculator State - Business Simulator Logic
  readonly calculatorCarValue = signal(15000); // Valor de mercado (USD)
  readonly calculatorDays = signal(12); // Días disponibles (Default: Fines de semana + extras)

  // New: Financing Logic
  readonly isFinanced = signal(false); // ¿Paga cuota?
  readonly monthlyQuota = signal(350); // Cuota promedio USD

  // Constants for calculation
  private readonly CALC_CONSTANTS = {
    dailyRateFactor: 0.0035, // 0.35% del valor del auto (Ajustado a inflación)
    platformFee: 0.15, // 15% comisión
    avgWashCost: 8, // Costo lavado USD
    insuranceAvg: 60, // Seguro promedio mensual USD
    maxDailyRateUsd: 120, // Tope razonable por día
  };

  readonly calculatorEstimate = computed(() => {
    const carValue = this.calculatorCarValue();
    const days = this.calculatorDays();
    const isFinanced = this.isFinanced();
    const quota = this.monthlyQuota();

    // 1. Determinar Tarifa Diaria Estimada
    let estimatedDailyRate = carValue * this.CALC_CONSTANTS.dailyRateFactor;
    // Tope de mercado
    estimatedDailyRate = Math.min(estimatedDailyRate, this.CALC_CONSTANTS.maxDailyRateUsd);

    // 2. Calcular Ingresos Brutos
    const grossIncome = estimatedDailyRate * days;

    // 3. Calcular Costos Operativos Visibles
    const platformFee = grossIncome * this.CALC_CONSTANTS.platformFee;
    // Estimamos 1 lavado cada 3 días de uso
    const estimatedWashes = Math.ceil(days / 3) * this.CALC_CONSTANTS.avgWashCost;
    // Seguro proporcional al uso (o fijo mensual, usamos fijo para ser conservadores/realistas)
    const insuranceCost = this.CALC_CONSTANTS.insuranceAvg;

    const operationalCost = platformFee + estimatedWashes + insuranceCost;

    // 4. Resultado Neto Operativo (En tu bolsillo)
    const netResult = Math.max(0, grossIncome - operationalCost);

    // 5. Lógica de Financiación (El "Hook")
    let financingMessage = '';
    let healthScore = 'neutral'; // green, yellow, red

    if (isFinanced && quota > 0) {
      const balance = netResult - quota;
      const coveragePercent = (netResult / quota) * 100;

      if (balance >= 0) {
        financingMessage = `¡Excelente! Cubres el 100% de tu cuota y te sobran $${balance.toLocaleString('en-US')}. Tu auto es GRATIS.`;
        healthScore = 'green';
      } else {
        // Cuántos días faltan para cubrir
        // Profit por día extra = tarifa - comisión - lavado/3
        const profitPerDay =
          estimatedDailyRate * (1 - this.CALC_CONSTANTS.platformFee) -
          this.CALC_CONSTANTS.avgWashCost / 3;
        const missing = Math.abs(balance);
        const missingDays = Math.ceil(missing / profitPerDay);

        financingMessage = `Cubres el ${Math.round(coveragePercent)}% de la cuota. Comparte ${missingDays} días más para que se pague solo.`;
        healthScore = 'yellow';
      }
    } else {
      // Mensaje para dueños sin deuda
      financingMessage = `Generas un ingreso extra de $${netResult.toLocaleString('en-US')} limpios al mes.`;
      healthScore = 'green';
    }

    return {
      grossIncome,
      netResult,
      expenses: operationalCost,
      financingMessage,
      healthScore,
      breakdown: {
        platformFee,
        insurance: insuranceCost,
        washes: estimatedWashes,
      },
    };
  });

  // Helper computed for template
  readonly calculatorEarnings = computed(() => this.calculatorEstimate().netResult);

  readonly testimonials: Array<{
    avatar: string;
    name: string;
    location: string;
    quote: string;
    earnings: number;
  }> = [
    {
      avatar: '/assets/images/avatars/avatar-2.jpg', // Martín (Hombre 40s)
      name: 'Martín',
      location: 'Buenos Aires',
      quote:
        'Empecé para pagar el seguro y ahora pago la cuota completa del auto. Es increíble que antes perdía plata teniéndolo estacionado.',
      earnings: 450000,
    },
    {
      avatar: '/assets/images/avatars/avatar-1.jpg', // Sofía (Mujer joven)
      name: 'Sofía',
      location: 'Córdoba',
      quote:
        'Lo uso para ir al trabajo y lo comparto los fines de semana. Con eso cubro el mantenimiento y me sobra para ahorrar.',
      earnings: 280000,
    },
    {
      avatar: '/assets/images/avatars/avatar-3.jpg', // Carlos (Hombre joven)
      name: 'Carlos',
      location: 'Rosario',
      quote:
        'Tengo una camioneta que uso poco. La puse en la plataforma y se convirtió en mi mejor inversión del año.',
      earnings: 820000,
    },
  ];

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(12);
  readonly totalCarsCount = signal(0);
  // User Location Signals
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly locationAccuracy = signal<number | null>(null);
  readonly lastLocationUpdate = signal<Date | null>(null);
  private locationWatchId: number | null = null;

  // UI State Signals

  readonly drawerOpen = signal(false);
  readonly filtersVisible = signal(true);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
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
  readonly expressMode = signal(true);

  readonly searchValue = signal('');
  readonly showFilters = signal(false);
  // ViewMode removed - Grid only now
  readonly toastMessage = signal('');
  readonly toastType = signal<ToastType>('info');
  readonly toastVisible = signal(false);
  readonly radiusKm = signal(5); // Search radius in kilometers
  readonly showDatePicker = signal(false); // Modal de selector de fechas
  readonly showLocationPicker = signal(false); // Modal de selector de ubicación
  readonly selectedLocation = signal<string>(''); // Ubicación seleccionada
  readonly locationSuggestions = signal<GeocodingResult[]>([]); // Sugerencias de ubicación
  readonly showLocationSuggestions = signal(false); // Mostrar dropdown de sugerencias
  readonly locationSearchLoading = signal(false); // Cargando sugerencias
  readonly googleCalendarId = signal<string | null>(environment.googleCalendarId || null); // ID del calendario de Google desde environment
  readonly showPriceTransparencyModal = signal(false); // Modal de transparencia de precios
  readonly mapBounds = signal<{ north: number; south: number; east: number; west: number } | null>(
    null,
  );
  readonly showSearchAreaButton = signal(false); // Botón "Buscar en esta zona"

  // Dynamic greeting based on time of day and context
  readonly dynamicGreeting = computed(() => {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const carsAvailable = this.totalCarsCount();

    // Weekend vibes
    if (dayOfWeek === 5) {
      return 'El finde arranca. ¿A dónde te escapás?';
    }
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      return '¿Domingo de ruta? Hay autos esperándote.';
    }

    // Time-based greetings
    if (hour < 9) {
      return 'Arrancá el día con ruedas. Elegí tu auto.';
    }
    if (hour < 13) {
      return `${carsAvailable} autos cerca tuyo, ¿cuál te llevás?`;
    }
    if (hour < 18) {
      return 'Todavía llegás a reservar para hoy.';
    }
    if (hour < 21) {
      return 'Reservá ahora, retirá mañana temprano.';
    }

    // Late night
    return 'Dejá todo listo para mañana.';
  });

  // HDRI Background State
  hdriLoaded = false;

  // Quick Booking State
  readonly quickBookingCar = signal<Car | null>(null);
  readonly quickBookingModalOpen = signal(false);

  // Hero 3D Click Hint State
  readonly showClickHint = signal(false);
  readonly clickHintFading = signal(false);
  private clickHintTimeout?: ReturnType<typeof setTimeout>;
  private clickHintShownSession = false;

  // Scroll listener reference for cleanup
  private readonly scrollListener = () => this.isScrolled.set(window.scrollY > 20);

  // Splash Screen State
  readonly showSplash = signal(true);

  // Scroll State for Glass Header
  readonly isScrolled = signal(false);

  // Testimonial State (Mobile)
  readonly showFullTestimonial = signal(false);

  constructor() {
    // Hide splash immediately to show skeletons or content
    this.showSplash.set(false);

    // Track scroll for glass header
    if (this.isBrowser) {
      // Use passive listener for performance
      window.addEventListener('scroll', this.scrollListener, { passive: true });
    }
  }

  onHdriLoaded(): void {
    // Mark HDRI as loaded
    this.hdriLoaded = true;

    // Show click hint after HDRI loads (only once per session)
    if (!this.clickHintShownSession && this.isBrowser) {
      this.clickHintShownSession = true;
      setTimeout(() => {
        this.showClickHint.set(true);
        this.clickHintTimeout = setTimeout(() => {
          this.hideClickHint();
        }, 2500);
      }, 900);
    }

    // Preload Mapbox map after HDRI loads
    if (this.isBrowser) {
      setTimeout(() => {
        this.mapboxPreloader.preloadMap().then(() => {
          this.logger.debug('[Marketplace] Mapbox map fully preloaded');
        });
      }, 1000);
    }
  }

  scrollToHowItWorks(): void {
    if (this.isBrowser) {
      const element = document.getElementById('how-it-works');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Computed - Ahora usa BreakpointService
  readonly isMobile = this.breakpoint.isMobile;
  readonly isTablet = this.breakpoint.isTablet;
  readonly isDesktop = this.breakpoint.isDesktop;

  readonly selectedCar = computed(() => {
    const carId = this.selectedCarId();
    if (!carId) return null;
    return this.cars().find((c) => c.id === carId) || null;
  });

  readonly quickFilters: QuickFilter[] = [
    { id: 'immediate', label: 'Entrega inmediata', icon: 'lightning' },
    { id: 'verified', label: 'Dueño verificado', icon: 'verified' },
    { id: 'no-card', label: 'Sin tarjeta', icon: 'credit-card' },
    { id: 'near-me', label: 'Cerca de mí', icon: 'location' },
    { id: 'electric', label: 'Eléctrico', icon: 'battery-charging' },
  ];

  readonly fabActions: FabAction[] = [
    { id: 'filter', label: 'Filtros', icon: 'filter', color: 'primary' },
    { id: 'location', label: 'Mi ubicación', icon: 'location', color: 'secondary' },
  ];

  readonly carsWithDistance = computed<CarWithLatestLocation[]>(() => {
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

  readonly carMapLocations = computed(() =>
    this.carsWithDistance().map((car) => {
      const gallery = this.extractPhotoGallery(car);
      return {
        carId: car.id,
        title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`.trim(),
        pricePerDay: car.price_per_day,
        currency: car.currency || 'USD',
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

  readonly statsStripData = computed<Stat[]>(() => {
    const totalCars = this.carsWithDistance().length;
    const availableNow = this.carsWithDistance().filter((c) => c.distance && c.distance < 5).length;
    const avgPrice = this.calculateAveragePrice();
    return [
      { label: 'Autos disponibles', value: totalCars, icon: 'car' },
      { label: 'Cerca de ti', value: availableNow, icon: 'location' },
      { label: 'Desde', value: `$${avgPrice}/día`, icon: 'money' },
    ];
  });

  readonly availableNowCount = computed(() => {
    return this.carsWithDistance().filter((c) => c.distance && c.distance < 5).length;
  });

  readonly activeQuickFilters = signal<Set<string>>(new Set());

  /**
   * Visible cars with client-side enhancements.
   * Note: Most filters are now applied server-side in loadCars().
   * This computed only handles:
   * - Distance sorting (requires user location)
   * - Client-only filters (verified, no-card) that can't be done server-side
   */
  readonly visibleCars = computed(() => {
    let cars = this.carsWithDistance().slice();
    const quickFilters = this.activeQuickFilters();
    const generatedIds = this.generatedPhotoIds(); // Obtener el Set de IDs

    // 1. Filtrar solo autos con fotos IA generadas
    cars = cars.filter((car) => generatedIds.has(car.id));

    // Client-only filters (can't be done server-side due to nested relations)
    if (quickFilters.has('verified')) {
      cars = cars.filter((c) => c.owner?.email_verified && c.owner?.phone_verified);
    }

    if (quickFilters.has('no-card')) {
      cars = cars.filter(
        (c) =>
          c.payment_methods?.some((pm) =>
            ['debit_card', 'cash', 'transfer', 'wallet'].includes(pm),
          ) || !c.payment_methods?.includes('credit_card'),
      );
    }

    // Distance sorting (requires user location - can't be done server-side)
    const sort = this.sortOrder();
    if (sort === 'distance') {
      cars = cars.sort((a, b) => {
        const distA = a.distance ?? Number.MAX_VALUE;
        const distB = b.distance ?? Number.MAX_VALUE;
        return distA - distB;
      });
    }
    // Other sorts are now handled server-side in loadCars()

    return cars;
  });

  readonly sortOrder = signal<string>('distance');

  /**
   * Contextual marker variant:
   * - 'photo' for browsing/exploration (default for marketplace - more visual)
   * - 'price' when user is actively comparing prices (has filters or date range)
   */
  readonly contextualMarkerVariant = computed<'photo' | 'price'>(() => {
    // Default to 'photo' for marketplace - more visual and marketplace-like
    // Only switch to 'price' when user is actively filtering/comparing
    const filters = this.mapFilters();
    const dateRange = this.dateRange();

    // Switch to 'price' mode ONLY when:
    // 1. User has active price filters AND date range (serious comparison)
    const hasPriceFilter = filters.priceRange !== null;
    const hasDateRange = dateRange.from !== null && dateRange.to !== null;

    // Only use price mode when both price filter AND date range are active
    if (hasPriceFilter && hasDateRange) {
      return 'price'; // Price comparison mode
    }

    // Default to photo mode for better marketplace experience
    return 'photo'; // Browsing/exploration mode (default - more visual)
  });

  /**
   * Static Mapbox image URL for performance optimization
   * Replaces interactive Mapbox GL JS with static image
   */
  readonly staticMapUrl = computed(() => {
    const center = this.userLocation() || { lng: -58.3816, lat: -34.6037 }; // Buenos Aires default
    const token = environment.mapboxAccessToken;
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${center.lng},${center.lat},11,0/1200x800@2x?access_token=${token}`;
  });

  /**
   * Total pages for pagination
   */
  readonly totalPages = computed(() => Math.ceil(this.totalCarsCount() / this.pageSize()));

  // Realtime
  private realtimeChannel?: RealtimeChannel;
  private loadingInterval?: ReturnType<typeof setInterval>;
  private observer?: IntersectionObserver;

  // Effects
  private readonly filtersEffect = effect(() => {
    const filters = this.mapFilters();
    if (filters.dateRange) {
      const from = filters.dateRange.start.toISOString().split('T')[0];
      const to = filters.dateRange.end.toISOString().split('T')[0];
      this.dateRange.set({ from, to });
    }
  });

  private readonly dateRangeEffect = effect(() => {
    const range = this.dateRange();
    if (range.from && range.to) {
      void this.loadCars();
    }
  });

  ngOnInit(): void {
    // SEO Meta Tags
    this.titleService.setTitle('Autorentar | Alquiler de Autos entre Personas - Renta Segura');
    this.meta.updateTag({
      name: 'description',
      content:
        'Alquila autos verificados directamente de dueños. 100% asegurado, pagos seguros con MercadoPago, entrega express. Sin intermediarios, sin tarjeta de crédito requerida.',
    });
    this.meta.updateTag({
      name: 'keywords',
      content:
        'alquiler autos, renta de autos, alquiler sin tarjeta, autos particulares, alquiler entre personas, Argentina',
    });
    this.meta.updateTag({
      property: 'og:title',
      content: 'Autorentar - Alquiler de Autos entre Personas',
    });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Conectamos personas con vehículos verificados. Sin intermediarios, 100% asegurado.',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    // Initialize JSON-LD structured data schemas for SEO
    if (this.isBrowser) {
      this.seoSchemaService.setOrganizationSchema();
      this.seoSchemaService.setLocalBusinessSchema();
      this.seoSchemaService.setWebSiteSchema();
    }

    void this.initializeUserLocation();
    void this.loadGeneratedPhotoManifest(); // Cargar manifest al inicio
    void this.loadCars();
    if (this.isBrowser) {
      this.setupRealtimeSubscription();
      this.checkPriceTransparencyModal();

      // Setup Scroll Reveal Observer
      // We use a small timeout to ensure DOM elements are rendered
      setTimeout(() => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Trigger only once
              }
            });
          },
          {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
          },
        );

        const elements = document.querySelectorAll('.scroll-reveal');
        elements.forEach((el) => observer.observe(el));
        this.observer = observer;
      }, 500);
    }
  }

  ngOnDestroy(): void {
    // Cleanup scroll listener
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    // Cleanup location watch
    if (this.locationWatchId !== null) {
      this.locationService.clearWatch(this.locationWatchId);
    }
    // Cleanup timeouts
    if (this.clickHintTimeout) {
      clearTimeout(this.clickHintTimeout);
    }
    if (this.locationSearchTimeout) {
      clearTimeout(this.locationSearchTimeout);
    }
    // Cleanup loading interval
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
    // Cleanup realtime channel
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
    // Cleanup observer
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Carga el manifest de IDs de fotos generadas
   */
  private async loadGeneratedPhotoManifest(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const response = await fetch('/assets/generated_photos_manifest.json');
      if (!response.ok) {
        console.warn(
          'No se encontró generated_photos_manifest.json. Posiblemente no se han generado fotos IA.',
        );
        return;
      }
      const ids: string[] = await response.json();
      this.generatedPhotoIds.set(new Set(ids));
      this.logger.debug(`✅ Manifest de fotos cargado. ${ids.length} fotos IA disponibles.`);
    } catch (error) {
      console.error('Error cargando manifest de fotos:', error);
    }
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
      console.warn('Could not get user location:', _error);
    }
  }

  /**
   * Load available cars with filters applied server-side
   */
  async loadCars(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const dateRange = this.dateRange();
      const filters = this.mapFilters();
      const quickFilters = this.activeQuickFilters();
      const page = this.currentPage();
      const size = this.pageSize();
      const rangeStart = (page - 1) * size;

      // Prepare common filter options
      const filterOptions = {
        lat: this.userLocation()?.lat,
        lng: this.userLocation()?.lng,
        limit: size,
        offset: rangeStart,
        minPrice: filters.priceRange?.min,
        maxPrice: filters.priceRange?.max,
        transmission: filters.transmission || undefined,
        verifiedOwner: quickFilters.has('verified'),
        noCreditCard: quickFilters.has('no-card'),
      };

      // Default dates if not selected (e.g. tomorrow to next day) for availability check
      // Or if RPC supports null dates (it does in our new version), we can pass null?
      // Our optimized RPC requires dates to filter availability.
      // If user hasn't selected dates, we just check "available now/future" or skip availability check?
      // The RPC expects p_start_date. Let's provide a default "next 24h" window if none selected
      // to ensure we only show cars that aren't booked NOW.
      const searchFrom = dateRange.from ? dateRange.from : new Date().toISOString();
      const searchTo = dateRange.to ? dateRange.to : new Date(Date.now() + 86400000).toISOString();

      // Call the optimized RPC
      const items = await this.carsService.getAvailableCarsWithDistance(
        searchFrom,
        searchTo,
        filterOptions,
      );

      // Map RPC result to Car format
      const carsData = items.map((item) => ({
        id: item.id,
        owner_id: item.owner_id,
        brand_text_backup: item.brand,
        model_text_backup: item.model,
        year: item.year,
        plate: item.plate,
        price_per_day: item.price_per_day, // Valor directo (NUMERIC)
        currency: item.currency,
        status: item.status,
        location_city: item.location?.city || '',
        location_state: item.location?.state || '',
        location_lat: item.location?.lat || 0,
        location_lng: item.location?.lng || 0,
        photos: item.images?.map((url: string) => ({ url })) || [],
        car_photos: item.images?.map((url: string) => ({ url })) || [],
        features: item.features,
        created_at: item.created_at,
        updated_at: item.updated_at,
        rating_avg: item.avg_rating,
        score: item.score,
        // Map owner info if available in RPC or hydration needed?
        // RPC v2 joins profile but we might need to conform to Car interface
        // We can hydrate owner separately or relying on the join.
        // For now, minimal owner mock or we need to update RPC to return owner JSON
        owner: {
          id: item.owner_id,
          // RPC doesn't return full profile yet, assume partial hydration or refactor RPC further
          // efficient list view doesn't need full profile usually.
        },
      })) as unknown as Car[];

      this.cars.set(carsData);

      // We need a way to get total count from RPC or separate count query
      // For now, simple count query (approximate)
      const { count } = await this.supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      this.totalCarsCount.set(count || 0);

      await this.loadLatestLocationsFor(carsData);

      // Hide search button after loading
      this.showSearchAreaButton.set(false);

      // Open drawer if there are cars and user location is set
      if (this.cars().length > 0 && this.userLocation() && !this.drawerOpen()) {
        this.drawerOpen.set(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.error.set(err.message);
        this.logger.error('Error loading cars', err);
      } else {
        this.error.set('Error loading cars');
        console.error('Error loading cars', err);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadLatestLocationsFor(cars: Car[]): Promise<void> {
    if (!cars.length) return;

    try {
      const ids = cars.map((c) => c.id);
      const locations = await this.carLocationService.getLatestLocations(ids);

      // Map for quick template lookup
      const map: Record<string, CarLatestLocation> = {};
      for (const loc of locations) {
        map[loc.car_id] = loc;
      }
      this.latestLocations.set(map);

      // Also enrich car list so other parts can reuse coords if needed
      const locationMap = new Map(locations.map((l) => [l.car_id, l]));
      this.cars.update((currentCars) =>
        currentCars.map((car) => {
          const loc = locationMap.get(car.id);
          if (!loc) return car;
          return {
            ...car,
            latest_location: {
              lat: loc.lat,
              lng: loc.lng,
              recorded_at: loc.recorded_at,
            },
            location_lat: loc.lat ?? car.location_lat,
            location_lng: loc.lng ?? car.location_lng,
          } as Car;
        }),
      );
    } catch (err) {
      console.warn('latest-locations-load', err);
    }
  }

  /**
   * Setup realtime subscription for car updates
   * Only listen to INSERT and DELETE events to avoid excessive reloads
   */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabase
      .channel('marketplace-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cars' },
        () => void this.loadCars(),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cars' },
        () => void this.loadCars(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[Marketplace] Car deletion subscription active');
        }
      });
  }

  /**
   * Handle logo click - switch to map view and request current location
   */
  async onLogoClick(): Promise<void> {
    // Solicitar ubicación actual del navegador
    try {
      const currentPosition = await this.locationService.getCurrentPosition();
      if (currentPosition) {
        this.userLocation.set({
          lat: currentPosition.lat,
          lng: currentPosition.lng,
        });
        // Recargar autos con la nueva ubicación
        await this.loadCars();
        this.showToast('Ubicación actualizada', 'success');
      } else {
        this.showToast(
          'No se pudo obtener tu ubicación. Verifica los permisos del navegador.',
          'warning',
        );
      }
    } catch (error) {
      console.warn('Error obteniendo ubicación:', error);
      this.showToast('Error al obtener tu ubicación', 'error');
    }
  }

  onCarSelected(carId: string): void {
    // Navigate to car detail page
    this.router.navigate(['/cars/detail', carId]);

    // Track analytics event
    this.analyticsService.trackEvent('car_details_clicked', {
      car_id: carId,
      source: 'car_card',
    });
  }

  /**
   * Handle map filters change
   */
  onFiltersChange(filters: FilterState): void {
    this.mapFilters.set(filters);

    // Sync quick filters if needed
    const quick = new Set(this.activeQuickFilters());
    if (filters.immediateOnly) quick.add('immediate');
    else quick.delete('immediate');
    this.activeQuickFilters.set(quick);

    void this.loadCars();
    this.showToast('Filtros aplicados', 'success');
    this.closeFiltersPanel();
  }

  /**
   * Handle drawer close
   */
  onDrawerClose(): void {
    this.drawerOpen.set(false);
  }

  /**
   * Handle reserve CTA click
   */
  onReserveClick(): void {
    const carId = this.selectedCarId();
    if (carId) {
      this.router.navigate(['/cars', carId]);
    }
  }

  /**
   * Handle user location change from map
   */
  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
    void this.loadCars();
    this.showToast('Ubicación actualizada', 'success');
  }

  /**
   * Handle map bounds change
   */
  onBoundsChange(bounds: LatLngBoundsLiteral): void {
    // Don't update immediately, just show the button
    // Only update if bounds are significantly different to avoid jitter
    this.mapBounds.set(bounds);
    this.showSearchAreaButton.set(true);
  }

  /**
   * Trigger search in current area
   */
  searchInArea(): void {
    void this.loadCars();
  }

  /**
   * Toggle fullscreen mode for map
   */
  private toggleFullscreen(): void {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        this.showToast('No se pudo activar pantalla completa', 'error');
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Extract photo gallery from car
   * Uses Supabase car_photos (Gemini 3 Pro generated) with placeholder fallback.
   */
  extractPhotoGallery(car: Car): string[] {
    // Usar fotos de Supabase (car_photos) generadas por Gemini 3 Pro
    if (car.car_photos && car.car_photos.length > 0) {
      return car.car_photos.map((p) => p.url);
    }
    if (car.photos && car.photos.length > 0) {
      return car.photos.map((p) => p.url);
    }
    // Fallback a placeholder si no hay fotos
    return ['/assets/images/car-placeholder.svg'];
  }

  /**
   * Track by car ID for ngFor
   */
  trackByCarId(_index: number, car: CarWithLatestLocation): string {
    return car.id;
  }

  trackBySuggestion(_index: number, suggestion: GeocodingResult): string {
    return `${suggestion.latitude}-${suggestion.longitude}`;
  }

  /**
   * Generate a realistic-looking rating based on car ID
   * Creates consistent but varied ratings that feel human
   */
  getCarRating(carId: string): string {
    // Use car ID to generate a deterministic but varied rating
    const hash = carId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseRating = 4.2 + (hash % 8) / 10; // Range: 4.2 - 4.9
    return baseRating.toFixed(1);
  }

  /**
   * Generate a realistic review count based on car ID
   */
  getCarReviewCount(carId: string): number {
    const hash = carId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 3 + (hash % 47); // Range: 3 - 49 reviews
  }

  onSearchChange(value: string): void {
    this.searchValue.set(value);
  }

  onSearchSubmit(value: string): void {
    this.searchValue.set(value);
    this.showToast(`Buscando autos en "${value}"...`, 'info');

    // 🎯 TikTok Events: Track Search
    void this.tiktokEvents.trackSearch({
      searchString: value,
    });

    void this.loadCars();
  }

  /**
   * Handle smart search bar submission
   */
  onSmartSearch(event: { location: { lat: number; lng: number } | null; dates: DateRange }): void {
    if (event.location) {
      this.userLocation.set(event.location);
    }
    
    if (event.dates.from && event.dates.to) {
      this.dateRange.set(event.dates);
    }

    // Scroll to results
    const element = document.querySelector('.bg-surface-base'); // Target the listing section
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    void this.loadCars();
    this.showToast('Buscando autos...', 'success');
  }

  onQuickFilterClick(filterId: string): void {
    const current = new Set(this.activeQuickFilters());
    let active = false;

    if (current.has(filterId)) {
      current.delete(filterId);
      active = false;
    } else {
      current.add(filterId);
      active = true;
    }
    this.activeQuickFilters.set(current);

    // Sync specific filters with mapFilters
    if (filterId === 'immediate') {
      const filters = this.mapFilters();
      this.mapFilters.set({ ...filters, immediateOnly: active });
    }

    if (filterId === 'near-me' && active) {
      this.sortOrder.set('distance');
    }

    this.showToast(`Filtro "${filterId}" ${active ? 'activado' : 'desactivado'}`, 'info');
  }

  private openQuickBooking(): void {
    const selectedCar = this.selectedCar();
    const carToBook = selectedCar ?? this.cars()[0] ?? null;

    if (!carToBook) {
      this.showToast('No hay autos disponibles para reservar en este momento.', 'warning');
      return;
    }

    this.selectedCarId.set(carToBook.id);
    this.quickBookingCar.set(carToBook);
    this.quickBookingModalOpen.set(true);

    this.analyticsService.trackEvent('cta_clicked', {
      car_id: carToBook.id,
      source: 'fab_quick_booking',
    });
  }

  private async handleLocationAction(): Promise<void> {
    await this.onLogoClick();
    this.analyticsService.trackEvent('cta_clicked', {
      source: 'fab_location',
    });
  }

  private openFiltersPanel(): void {
    this.showFilters.set(true);
    this.analyticsService.trackEvent('filters_opened', {
      source: 'fab',
    });
  }

  closeFiltersPanel(): void {
    this.showFilters.set(false);
  }

  onPublishClick(): void {
    void this.router.navigate(['/cars/publish']);
  }

  /**
   * Abre el selector de fechas
   */
  openDatePicker(): void {
    this.showDatePicker.set(true);
  }

  /**
   * Cierra el selector de fechas
   */
  closeDatePicker(): void {
    this.showDatePicker.set(false);
  }

  /**
   * Maneja el cambio de rango de fechas
   */
  onDateRangeChange(range: DateRange): void {
    this.dateRange.set(range);

    if (range.from && range.to) {
      this.showToast(`Fechas: ${range.from} - ${range.to}`, 'success');
      void this.loadCars();
      this.closeDatePicker(); // Cerrar el modal al seleccionar fechas
    }
  }

  /**
   * Abre el selector de ubicación
   */
  openLocationPicker(): void {
    this.showLocationPicker.set(true);
  }

  /**
   * Cierra el selector de ubicación
   */
  closeLocationPicker(): void {
    this.showLocationPicker.set(false);
  }

  /**
   * Maneja la selección de ubicación
   */
  onLocationSelect(location: string): void {
    this.selectedLocation.set(location);
    this.searchValue.set(location);
    this.closeLocationPicker();
    this.showToast(`Ubicación: ${location}`, 'success');
    void this.loadCars();
  }

  /**
   * Maneja el cambio en el input de ubicación - busca sugerencias dinámicamente
   */
  onLocationInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();

    this.selectedLocation.set(query);
    this.searchValue.set(query);

    // Limpiar timeout anterior
    if (this.locationSearchTimeout) {
      clearTimeout(this.locationSearchTimeout);
    }

    // Si el query es muy corto, ocultar sugerencias
    if (query.length < 2) {
      this.locationSuggestions.set([]);
      this.showLocationSuggestions.set(false);
      return;
    }

    // Mostrar sugerencias
    this.showLocationSuggestions.set(true);
    this.locationSearchLoading.set(true);

    // Debounce: esperar 300ms después de que el usuario deje de escribir
    this.locationSearchTimeout = setTimeout(async () => {
      try {
        // Buscar en Argentina, Uruguay y Brasil
        const suggestions = await this.geocodingService.getLocationSuggestions(
          query,
          'AR,UY,BR',
          8,
        );
        this.locationSuggestions.set(suggestions);
      } catch (error) {
        console.warn('Error buscando sugerencias:', error);
        this.locationSuggestions.set([]);
      } finally {
        this.locationSearchLoading.set(false);
      }
    }, 300);
  }

  /**
   * Selecciona una sugerencia de ubicación
   */
  onLocationSuggestionSelect(suggestion: GeocodingResult): void {
    this.selectedLocation.set(suggestion.fullAddress);
    this.searchValue.set(suggestion.fullAddress);
    this.showLocationSuggestions.set(false);
    this.locationSuggestions.set([]);

    // Actualizar ubicación del usuario en el mapa
    this.userLocation.set({
      lat: suggestion.latitude,
      lng: suggestion.longitude,
    });

    // Recargar autos con la nueva ubicación
    void this.loadCars();
    this.showToast(`Ubicación: ${suggestion.placeName}`, 'success');
  }

  /**
   * Cierra el dropdown de sugerencias
   */
  closeLocationSuggestions(): void {
    this.showLocationSuggestions.set(false);
  }

  /**
   * Maneja el blur del input de ubicación con delay para permitir clicks en sugerencias
   */
  onLocationInputBlur(): void {
    setTimeout(() => {
      this.closeLocationSuggestions();
    }, 200);
  }

  onFabActionClick(actionId: string): void {
    switch (actionId) {
      case 'filter':
        this.openFiltersPanel();
        break;
      case 'quick-rent':
        this.openQuickBooking();
        break;
      case 'location':
        void this.handleLocationAction();
        break;
      default:
        console.warn(`[Marketplace] Unhandled FAB action: ${actionId}`);
        break;
    }
  }

  calculateAveragePrice(): number {
    const cars = this.carsWithDistance();
    if (cars.length === 0) return 0;
    const sum = cars.reduce((acc, car) => acc + car.price_per_day, 0);
    return Math.round(sum / cars.length);
  }

  getCarInstantBooking(car: CarWithLatestLocation): boolean {
    // Check if car has auto_approval enabled (closest equivalent to instant booking)
    return car.auto_approval === true;
  }

  /**
   * Toggle favorite status for a car
   * @param event - Click event (prevent navigation)
   * @param carId - Car ID
   */
  toggleFavorite(event: Event, carId: string): void {
    event.stopPropagation();
    event.preventDefault();

    // Get current favorites from localStorage
    const favorites = this.getFavorites();
    const index = favorites.indexOf(carId);

    if (index > -1) {
      favorites.splice(index, 1);
      this.showToast('Eliminado de favoritos', 'info');
    } else {
      favorites.push(carId);
      this.showToast('Agregado a favoritos', 'success');
    }

    // Save to localStorage
    if (this.isBrowser) {
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    // Track analytics
    this.analyticsService.trackEvent('favorite_toggled', {
      car_id: carId,
      action: index > -1 ? 'remove' : 'add',
      source: 'marketplace_card',
    });
  }

  /**
   * Check if a car is favorited
   * @param carId - Car ID
   */
  isFavorite(carId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.includes(carId);
  }

  /**
   * Get favorites from localStorage
   */
  private getFavorites(): string[] {
    if (!this.isBrowser) return [];
    try {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  showToast(message: string, type: ToastType = 'info'): void {
    // Using NotificationManagerService instead of inline toast
    const title =
      type === 'success'
        ? 'Éxito'
        : type === 'error'
          ? 'Error'
          : type === 'warning'
            ? 'Advertencia'
            : 'Información';

    if (type === 'success') {
      this.notificationManager.success(title, message);
    } else if (type === 'error') {
      this.notificationManager.error(title, message);
    } else if (type === 'warning') {
      this.notificationManager.warning(title, message);
    } else {
      this.notificationManager.info(title, message);
    }
  }

  /**
   * Handle search radius change from map
   */
  onSearchRadiusChange(radiusKm: number): void {
    this.radiusKm.set(radiusKm);
    // Reload cars with new radius filter
    void this.loadCars();
  }

  /**
   * Check if user has seen price transparency modal
   * Show it on first visit with a 1.5s delay
   */
  private checkPriceTransparencyModal(): void {
    if (!this.isBrowser) return;

    const hasSeenModal = localStorage.getItem('hasSeenPriceTransparencyModal');

    if (!hasSeenModal) {
      // Show modal after 1.5 seconds (after welcome toast)
      setTimeout(() => {
        this.showPriceTransparencyModal.set(true);
      }, 1500);
    }
  }

  /**
   * Handle price transparency modal close
   */
  onPriceTransparencyModalClose(): void {
    this.showPriceTransparencyModal.set(false);

    if (this.isBrowser) {
      localStorage.setItem('hasSeenPriceTransparencyModal', 'true');
    }

    // Track analytics event
    this.analyticsService.trackEvent('price_transparency_modal_viewed', {
      context: 'marketplace_first_visit',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle quick book from hero section
   */
  handleHeroQuickBook(): void {
    const firstCar = this.visibleCars()[0];
    if (firstCar) {
      this.openQuickBooking();
    } else {
      this.showToast('No hay autos disponibles para reservar', 'warning');
    }
  }

  /**
   * Hide click hint with fade animation
   */
  private hideClickHint(): void {
    if (this.clickHintTimeout) {
      clearTimeout(this.clickHintTimeout);
      this.clickHintTimeout = undefined;
    }

    this.clickHintFading.set(true);

    // Remove from DOM after animation
    setTimeout(() => {
      this.showClickHint.set(false);
      this.clickHintFading.set(false);
    }, 400);
  }

  /**
   * Handle click on hero 3D car - navigate to cars list
   */
  onHeroCarClick(): void {
    // Hide hint immediately if showing
    if (this.showClickHint()) {
      this.hideClickHint();
    }

    // Navigate to cars list
    void this.router.navigate(['/cars/list']);

    // Track analytics
    this.analyticsService.trackEvent('hero_car_clicked', {
      source: '3d_model',
      destination: '/cars/list',
    });
  }

  /**
   * Check if a quick filter is active
   */
  isQuickFilterActive(filterId: string): boolean {
    return this.activeQuickFilters().has(filterId);
  }

  /**
   * Handle sort order change
   */
  onSortOrderChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.sortOrder.set(value);

    // Show user-friendly toast message
    const messages: Record<string, string> = {
      distance: 'Mostrando autos más cercanos primero',
      price_asc: 'Ordenado por precio: menor a mayor',
      price_desc: 'Ordenado por precio: mayor a menor',
      rating: 'Mostrando mejor valorados primero',
      score: 'Ordenado por relevancia',
      relevance: 'Ordenado por relevancia',
    };

    const message = messages[value] || `Ordenado por: ${value}`;
    this.showToast(message, 'info');
  }

  /**
   * Clear all quick filters
   */
  clearQuickFilters(): void {
    // Reset filters to default
    this.mapFilters.set({
      dateRange: null,
      priceRange: null,
      vehicleTypes: null,
      immediateOnly: false,
      transmission: null,
    });
    this.activeQuickFilters.set(new Set());
    // Reset pagination
    this.currentPage.set(1);
    void this.loadCars();
    this.showToast('Filtros limpiados', 'success');
  }

  /**
   * Map filter source locations for the map component
   */
  mapFilterSourceLocations(): CarMapLocation[] {
    return this.carMapLocations();
  }

  /**
   * Go to next page of cars
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      void this.loadCars();
      if (this.isBrowser) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  /**
   * Go to previous page of cars
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      void this.loadCars();
      if (this.isBrowser) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }
}
