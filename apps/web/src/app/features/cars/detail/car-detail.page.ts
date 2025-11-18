import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of, combineLatest, from } from 'rxjs';

// Services
import { CarsService } from '../../../core/services/cars.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { WalletService } from '../../../core/services/wallet.service';
import { AuthService } from '../../../core/services/auth.service';
import { MetaService } from '../../../core/services/meta.service';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import { FxService } from '../../../core/services/fx.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';
import { DistanceCalculatorService } from '../../../core/services/distance-calculator.service';
import { LocationService } from '../../../core/services/location.service';

// Models
import { Car, Review, CarStats, CarPhoto } from '../../../core/models';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';
import { calculateCreditSecurityUsd } from '../../../core/models/booking-detail-payment.model';

// Components
import {
  DateRangePickerComponent,
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CarReviewsSectionComponent } from '../../../shared/components/car-reviews-section/car-reviews-section.component';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';
import { ShareMenuComponent } from '../../../shared/components/share-menu/share-menu.component';
import { ShareButtonComponent } from '../../../shared/components/share-button/share-button.component';
import { DynamicPriceDisplayComponent } from '../../../shared/components/dynamic-price-display/dynamic-price-display.component';
import { UrgentRentalBannerComponent } from '../../../shared/components/urgent-rental-banner/urgent-rental-banner.component';
import { SocialProofIndicatorsComponent } from '../../../shared/components/social-proof-indicators/social-proof-indicators.component';
import { StickyCtaMobileComponent } from '../../../shared/components/sticky-cta-mobile/sticky-cta-mobile.component';
import { WhatsappFabComponent } from '../../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { DistanceBadgeComponent } from '../../../shared/components/distance-badge/distance-badge.component';
import { CarChatComponent } from '../../messages/components/car-chat.component';
import {
  PaymentMethodButtonsComponent,
  type PaymentMethod,
} from '../../../shared/components/payment-method-buttons/payment-method-buttons.component';
import {
  BookingLocationFormComponent,
  BookingLocationData,
} from '../../bookings/components/booking-location-form/booking-location-form.component';
import {
  PickupLocationSelectorComponent,
  PickupLocationSelection,
} from '../../../shared/components/pickup-location-selector/pickup-location-selector.component';

// Services
import { UrgentRentalService } from '../../../core/services/urgent-rental.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { WaitlistService } from '../../../core/services/waitlist.service';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { TikTokEventsService } from '../../../core/services/tiktok-events.service';

interface CarDetailState {
  car: Car | null;
  reviews: Review[];
  stats: CarStats | null;
  loading: boolean;
  error: string | null;
}

@Component({
  standalone: true,
  selector: 'app-car-detail-page',
  imports: [
    CommonModule,
    RouterLink,
    DateRangePickerComponent,
    MoneyPipe,
    CarReviewsSectionComponent,
    ShareMenuComponent,
    ShareButtonComponent,
    TranslateModule,
    UrgentRentalBannerComponent,
    SocialProofIndicatorsComponent,
    StickyCtaMobileComponent,
    DistanceBadgeComponent,
    CarChatComponent,
    PaymentMethodButtonsComponent,
    BookingLocationFormComponent,
    PickupLocationSelectorComponent,
  ],
  templateUrl: './car-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly walletService = inject(WalletService);
  private readonly metaService = inject(MetaService);
  private readonly fxService = inject(FxService);
  private readonly supabase = injectSupabase();
  readonly authService = inject(AuthService);
  readonly pricingService = inject(DynamicPricingService);
  readonly urgentRentalService = inject(UrgentRentalService);
  private readonly analytics = inject(AnalyticsService);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly locationService = inject(LocationService);
  private readonly waitlistService = inject(WaitlistService);
  private readonly toastService = inject(NotificationManagerService);
  private readonly tiktokEvents = inject(TikTokEventsService);

  readonly expressMode = signal(false);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly urgentAvailability = signal<{
    available: boolean;
    distance?: number;
    eta?: number;
  } | null>(null);

  // ✅ NEW: Distance-based pricing
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly distanceKm = signal<number | null>(null);
  readonly deliveryFeeCents = signal<number>(0);
  readonly distanceTier = signal<'local' | 'regional' | 'long_distance' | null>(null);
  readonly bookingInProgress = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly validatingAvailability = signal(false); // ✅ NEW: Loading state for re-validation
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');

  // ✅ NEW: Booking location form state
  readonly showLocationForm = signal(false);
  readonly pendingBookingData = signal<{ from: string; to: string } | null>(null);

  // ✅ NEW: Pickup location selector state
  readonly pickupLocationSelection = signal<PickupLocationSelection | null>(null);
  readonly userHomeLocation = signal<{ lat: number; lng: number; address?: string } | null>(null);

  // ✅ NEW: Date suggestions and waitlist
  readonly suggestedDateRanges = signal<
    Array<{ startDate: string; endDate: string; daysCount: number }>
  >([]);
  readonly canWaitlist = signal(false);
  readonly addingToWaitlist = signal(false);
  readonly currentPhotoIndex = signal(0);
  readonly blockedDates = signal<string[]>([]); // DEPRECATED: Usado solo para inline calendar
  readonly blockedRanges = signal<Array<{ from: string; to: string }>>([]); // ✅ NEW: Rangos bloqueados para date picker
  readonly imageLoaded = signal(false);
  readonly specsCollapsed = signal(false);

  // ✅ FIX: Precio dinámico para mostrar en lugar del estático
  readonly dynamicPrice = signal<number | null>(null);
  readonly priceLoading = signal(false);
  readonly hourlyRateLoading = signal(false);

  readonly isCarOwner = signal<boolean>(false);

  private readonly carId$ = this.route.paramMap.pipe(map((params) => params.get('id')));

  /**
   * Valida si un string es un UUID válido
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private readonly carData$ = this.carId$.pipe(
    switchMap((id) => {
      if (!id) {
        return of({
          car: null,
          reviews: [],
          stats: null,
          loading: false,
          error: 'Auto no encontrado',
        });
      }
      // ✅ FIX: Validar que el ID sea un UUID válido
      // Previene errores cuando se navega a rutas como /cars/publish
      if (!this.isValidUUID(id)) {
        // Redirigir a la lista de autos si el ID no es válido
        setTimeout(() => this.router.navigate(['/cars']), 100);
        return of({
          car: null,
          reviews: [],
          stats: null,
          loading: false,
          error: 'ID de auto inválido',
        });
      }
      return combineLatest([
        from(this.carsService.getCarById(id)),
        from(this.reviewsService.getReviewsForCar(id)).pipe(
          catchError(() => of([])), // Retornar array vacío si falla
        ),
        from(this.reviewsService.getCarStats(id)).pipe(
          catchError(() => of(null)), // Retornar null si falla
        ),
      ]).pipe(
        map(([car, reviews, stats]) => {
          if (car) {
            this.updateMetaTags(car, stats);
          }
          return { car, reviews, stats, loading: false, error: car ? null : 'Auto no disponible' };
        }),
        catchError((err) => {
          // Determinar mensaje de error más específico
          let errorMessage = 'Error al cargar el auto';
          if (err?.code === 'PGRST116') {
            errorMessage = 'Auto no encontrado';
          } else if (err?.message?.includes('permission') || err?.code === '42501') {
            errorMessage = 'No tienes permiso para ver este auto';
          } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
            errorMessage = 'Error de conexión. Verifica tu internet';
          } else if (err?.message) {
            errorMessage = `Error: ${err.message}`;
          }
          return of({
            car: null,
            reviews: [],
            stats: null,
            loading: false,
            error: errorMessage,
          });
        }),
      );
    }),
  );

  private readonly state = toSignal(this.carData$, {
    initialValue: {
      car: null,
      reviews: [],
      stats: null,
      loading: true,
      error: null,
    } as CarDetailState,
  });

  readonly car = computed(() => this.state().car);
  readonly reviews = computed(() => this.state().reviews);
  readonly carStats = computed(() => this.state().stats);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  /**
   * Obtiene la mejor review de 5 estrellas para mostrar en el sidebar
   */
  readonly bestFiveStarReview = computed(() => {
    const reviews = this.reviews();
    if (!reviews || reviews.length === 0) return null;

    // Filtrar reviews de 5 estrellas (rating_overall calculado)
    const fiveStarReviews = reviews.filter((r) => (r.rating_overall ?? 0) >= 5);
    if (fiveStarReviews.length === 0) return null;

    // Ordenar por más reciente y con comentario más largo
    return fiveStarReviews.sort((a, b) => {
      const aLength = a.comment_public?.length ?? 0;
      const bLength = b.comment_public?.length ?? 0;
      return bLength - aLength;
    })[0];
  });

  /**
   * Determina si el propietario es "Superhost"
   * Criterios: 50+ alquileres y rating >= 4.8
   */
  readonly isSuperhost = computed(() => {
    const car = this.car();
    if (!car?.owner) return false;

    return car.owner.rating_count >= 50 && car.owner.rating_avg >= 4.8;
  });

  /**
   * Verifica si el usuario actual es el propietario del auto
   */
  readonly isOwner = computed(() => this.isCarOwner());

  readonly walletBalance = toSignal(this.walletService.getBalance(), {
    initialValue: null,
  });
  readonly currentFxRate = toSignal(
    this.fxService.getFxSnapshot('USD', 'ARS').pipe(map((s) => s?.rate ?? null)),
  );

  readonly allPhotos = computed(() => {
    const photos = (this.car()?.photos ?? this.car()?.car_photos ?? []) as CarPhoto[];
    if (!Array.isArray(photos) || photos.length === 0) {
      return [] as CarPhoto[];
    }

    const seen = new Set<string>();
    return photos.filter((photo) => {
      const key = photo.stored_path || photo.url;
      if (!key) {
        return true;
      }
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  });
  readonly currentPhoto = computed(() => this.allPhotos()[this.currentPhotoIndex()]);
  readonly hasMultiplePhotos = computed(() => this.allPhotos().length > 1);

  readonly daysCount = computed(() => {
    const { from, to } = this.dateRange();
    if (!from || !to) return 0;
    const diff = Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff > 0 ? diff : 0;
  });

  readonly hoursCount = computed(() => {
    const { from, to } = this.dateRange();
    if (!from || !to) return 0;
    const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60));
    return diff > 0 ? Math.max(diff, 5) : 5; // Mínimo 5 horas
  });

  readonly isCurrentUserOwner = computed(() => {
    const car = this.car();
    const session = this.authService.session$();
    const currentUserId = session?.user?.id;
    if (!car || !currentUserId) {
      return false;
    }
    return car.owner_id === currentUserId;
  });

  readonly canContactOwner = computed(
    () => this.authService.isAuthenticated() && !this.isCurrentUserOwner(),
  );

  // ✅ FIX: Precio por hora dinámico (cargado desde el servicio de pricing)
  readonly dynamicHourlyRate = signal<number | null>(null);

  /**
   * Precio por hora calculado
   * ✅ FIX: Usa precio dinámico del sistema de pricing si está disponible,
   * sino calcula como 75% del precio diario / 24
   */
  readonly calculatedHourlyRate = computed(() => {
    // Prioridad 1: Precio dinámico por hora del sistema de pricing
    const dynamicHourly = this.dynamicHourlyRate();
    if (dynamicHourly !== null && dynamicHourly > 0) {
      return dynamicHourly;
    }

    // Prioridad 2: Calcular desde precio diario dinámico/estático
    const car = this.car();
    if (!car) {
      return null;
    }

    const pricePerDay = this.displayPrice();
    if (!pricePerDay || isNaN(pricePerDay) || pricePerDay <= 0) {
      return null;
    }

    // 75% del precio diario / 24 horas
    const hourlyRate = (pricePerDay * 0.75) / 24;
    return hourlyRate;
  });

  /**
   * Total del alquiler (sin incluir depósito de seguridad)
   */
  readonly rentalTotal = computed(() => {
    const car = this.car();
    if (!car) return null;

    // Modo express: precio por hora (75% del precio diario / 24)
    if (this.expressMode()) {
      const hours = this.hoursCount();
      const hourlyRate = this.calculatedHourlyRate();
      if (!hourlyRate) return null;

      return hours * hourlyRate;
    }

    // Modo normal: precio por día (usar precio dinámico si está disponible)
    const days = this.daysCount();
    if (days <= 0) return null;

    // ✅ FIX: Usar precio dinámico si está disponible, sino precio estático
    const pricePerDay = this.displayPrice();
    return isNaN(pricePerDay) ? null : days * pricePerDay;
  });

  /**
   * Depósito de seguridad en USD (para mostrar)
   * Retorna siempre US$ 600 según el sistema de garantías
   */
  readonly depositAmount = computed(() => {
    const car = this.car();
    if (!car) return 0;

    // Usar el sistema de cálculo de garantías (siempre retorna 600 USD)
    const vehicleValueUsd = car.value_usd ?? 10000;
    return calculateCreditSecurityUsd(vehicleValueUsd);
  });

  /**
   * Depósito de seguridad en ARS (para cálculos)
   * Convierte el depósito USD a ARS usando la tasa de cambio
   */
  readonly depositAmountArs = computed(() => {
    const depositUsd = this.depositAmount();
    const fxRate = this.currentFxRate();

    if (!fxRate) return depositUsd; // Fallback a USD si no hay tasa
    return depositUsd * fxRate;
  });

  /**
   * Total a autorizar (alquiler + depósito)
   * Este es el monto que se pre-autoriza en tarjeta o se bloquea en wallet
   */
  readonly authorizationTotal = computed(() => {
    const rental = this.rentalTotal();
    const depositArs = this.depositAmountArs();

    if (rental === null) return null;
    return rental + depositArs;
  });

  /**
   * @deprecated Usar rentalTotal() en su lugar
   * Mantenido por compatibilidad temporal
   */
  readonly totalPrice = computed(() => this.rentalTotal());

  readonly canBook = computed(() => {
    if (this.expressMode()) {
      return !!this.totalPrice() && this.urgentAvailability()?.available;
    }
    return !!this.totalPrice();
  });

  /**
   * Callback para verificar disponibilidad del auto
   * Usado por el date-range-picker component
   */
  checkAvailability = async (carId: string, from: string, to: string): Promise<boolean> => {
    try {
      return await this.carsService.isCarAvailable(carId, from, to);
    } catch (_error) {
      return false;
    }
  };

  suggestNextAvailableRange = async (
    carId: string,
    from: string,
    to: string,
  ): Promise<DateRange | null> => {
    try {
      const suggestions = await this.carsService.getNextAvailableRange(carId, from, to);
      if (!suggestions || suggestions.length === 0) {
        return null;
      }

      // Get the first suggestion
      const firstSuggestion = suggestions[0];
      return {
        from: this.normalizeDateInput(firstSuggestion.startDate),
        to: this.normalizeDateInput(firstSuggestion.endDate),
      };
    } catch (_error) {
      // Silent fail - próxima ventana disponible es opcional
      return null;
    }
  };

  ngOnInit(): void {
    // Verificar si viene con query param urgent
    this.route.queryParams.subscribe((params) => {
      if (params['urgent'] === 'true') {
        this.expressMode.set(true);
        void this.setupExpressMode();
      }

    });

    // Cargar fechas bloqueadas cuando el auto esté disponible
    this.carData$.subscribe((state) => {
      if (state.car) {
        void this.loadBlockedDates(state.car.id);
        // ✅ FIX: Cargar precio dinámico si el auto tiene region_id
        if (state.car.region_id) {
          void this.loadDynamicPrice();
        }
        // ✅ NEW: Inicializar ubicación y calcular distancia
        void this.initializeUserLocationAndDistance(state.car);

        // ✅ NEW: Check if current user is the owner
        void this.checkOwnership(state.car.owner_id);

        // 🎯 TikTok Events: Track ViewContent
        void this.tiktokEvents.trackViewContent({
          contentId: state.car.id,
          contentName: state.car.title,
          value: state.car.price_per_day,
          currency: state.car.currency || 'ARS',
        });
      }
    });
  }

  onContactOwner(): void {
    const car = this.car();
    if (!car?.owner_id) {
      return;
    }

    const session = this.authService.session$();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (currentUserId === car.owner_id) {
      return;
    }

    const queryParams = {
      carId: car.id,
      userId: car.owner_id,
      carName: this.getCarChatTitle(car),
      userName: car.owner?.full_name ?? 'Anfitrión',
    };

    void this.router.navigate(['/messages/chat'], { queryParams });
  }

  private getCarChatTitle(car: Car): string {
    if (car.title?.trim()) {
      return car.title;
    }

    const parts = [
      car.brand ?? car.brand_name ?? car.brand_text_backup,
      car.model ?? car.model_name ?? car.model_text_backup,
      car.year ? String(car.year) : '',
    ]
      .map((value) => (value ? value.toString().trim() : ''))
      .filter((value) => !!value);

    return parts.join(' ').trim() || 'Auto';
  }

  /**
   * Initialize user location and calculate distance to car
   */
  private async initializeUserLocationAndDistance(car: Car): Promise<void> {
    try {
      // Get user location
      const locationData = await this.locationService.getUserLocation();
      if (locationData) {
        this.userLocation.set({ lat: locationData.lat, lng: locationData.lng });

        // Calculate distance if car has location
        if (car.location_lat && car.location_lng) {
          const distance = this.distanceCalculator.calculateDistance(
            locationData.lat,
            locationData.lng,
            car.location_lat,
            car.location_lng,
          );

          this.distanceKm.set(distance);

          // Calculate tier and delivery fee
          const tier = this.distanceCalculator.getDistanceTier(distance);
          this.distanceTier.set(tier);

          const deliveryFee = this.distanceCalculator.calculateDeliveryFee(distance);
          this.deliveryFeeCents.set(deliveryFee);
        }
      }

      // ✅ NEW: Load home location for pickup-location-selector
      const homeLocation = await this.locationService.getHomeLocation();
      if (homeLocation) {
        this.userHomeLocation.set({
          lat: homeLocation.lat,
          lng: homeLocation.lng,
          address: homeLocation.address,
        });
      }
    } catch (_error) {
      // Silently fail - distance is optional
    }
  }

  /**
   * ✅ FIX: Cargar precio dinámico para el auto (diario y por hora)
   */
  private async loadDynamicPrice(): Promise<void> {
    const car = this.car();
    if (!car || !car.region_id) {
      return;
    }

    this.priceLoading.set(true);
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      // Cargar precio diario (24 horas)
      const { data, error } = await this.supabase.rpc('calculate_dynamic_price', {
        p_region_id: car.region_id,
        p_user_id: userId,
        p_rental_start: new Date().toISOString(),
        p_rental_hours: 24,
      });

      if (error) {
        return;
      }

      if (data && data.total_price) {
        this.dynamicPrice.set(data.total_price);
      }

      // ✅ FIX: Cargar precio por hora para modo express (5 horas mínimo)
      if (this.expressMode()) {
        this.hourlyRateLoading.set(true);
        try {
          const hours = Math.max(this.hoursCount(), 5); // Mínimo 5 horas para cálculo representativo
          const quote = await this.urgentRentalService.getUrgentQuote(car.id, car.region_id, hours);
          // Usar el precio por hora del sistema de pricing dinámico
          this.dynamicHourlyRate.set(quote.hourlyRate);
        } catch (_error) {
          // Fallback: calcular desde precio diario
          const pricePerDay = this.displayPrice();
          if (pricePerDay > 0) {
            const fallbackHourly = (pricePerDay * 0.75) / 24;
            this.dynamicHourlyRate.set(fallbackHourly);
          }
        } finally {
          this.hourlyRateLoading.set(false);
        }
      }
    } catch (_error) {
      // Silent fail - will use static price
    } finally {
      this.priceLoading.set(false);
    }
  }

  /**
   * ✅ FIX: Precio a mostrar (dinámico si está disponible, sino estático)
   */
  readonly displayPrice = computed(() => {
    const dynamic = this.dynamicPrice();
    const car = this.car();
    return dynamic !== null ? dynamic : (car?.price_per_day ?? 0);
  });

  async setupExpressMode(): Promise<void> {
    const car = this.car();
    if (!car || !car.region_id) return;

    try {
      // Obtener ubicación del usuario
      try {
        await this.urgentRentalService.getCurrentLocation();
      } catch (_error) {
        // Silent fail - location is optional
      }

      // Verificar disponibilidad inmediata
      const availability = await this.urgentRentalService.checkImmediateAvailability(car.id);
      this.urgentAvailability.set({
        available: availability.available,
        distance: availability.distance,
        eta: availability.eta,
      });

      // ✅ FIX: Cargar precio dinámico por hora para modo express (5 horas mínimo)
      // Siempre intentar cargar, independientemente del precio diario
      this.hourlyRateLoading.set(true);
      try {
        const hours = Math.max(this.hoursCount(), 5); // Mínimo 5 horas para cálculo representativo
        const quote = await this.urgentRentalService.getUrgentQuote(car.id, car.region_id, hours);
        // Usar el precio por hora del sistema de pricing dinámico
        this.dynamicHourlyRate.set(quote.hourlyRate);
        console.log(
          `💰 [CarDetail] Express mode hourly rate: $${quote.hourlyRate}/hora (quote para ${hours} horas)`,
        );
      } catch (_error) {
        console.warn('⚠️ [CarDetail] Could not load hourly rate for express mode:', _error);
        // Fallback: calcular desde precio diario si está disponible
        const pricePerDay = this.displayPrice();
        if (pricePerDay > 0) {
          const fallbackHourly = (pricePerDay * 0.75) / 24;
          this.dynamicHourlyRate.set(fallbackHourly);
          console.log(`💰 [CarDetail] Using fallback hourly rate: $${fallbackHourly}/hora`);
        }
      } finally {
        this.hourlyRateLoading.set(false);
      }

      // Preseleccionar fechas: ahora + 5 horas (mínimo)
      const now = new Date();
      const fiveHoursLater = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      this.dateRange.set({
        from: now.toISOString().split('T')[0],
        to: fiveHoursLater.toISOString().split('T')[0],
      });
    } catch (_error) {
      console.error('Error setting up express mode:', _error);
    }
  }

  toggleExpressMode(): void {
    this.expressMode.set(!this.expressMode());
    if (this.expressMode()) {
      // Resetear precio por hora para forzar recarga
      this.dynamicHourlyRate.set(null);
      void this.setupExpressMode();
    } else {
      // Resetear fechas y precio por hora
      this.dateRange.set({ from: null, to: null });
      this.dynamicHourlyRate.set(null);
    }
  }

  nextPhoto(): void {
    this.imageLoaded.set(false);
    this.currentPhotoIndex.update((index) => (index + 1) % this.allPhotos().length);
  }

  previousPhoto(): void {
    this.imageLoaded.set(false);
    this.currentPhotoIndex.update(
      (index) => (index - 1 + this.allPhotos().length) % this.allPhotos().length,
    );
  }

  goToPhoto(index: number): void {
    this.imageLoaded.set(false);
    this.currentPhotoIndex.set(index);
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
  }

  toggleSpecs(): void {
    this.specsCollapsed.update((value) => !value);
  }

  /**
   * ✅ NEW: Handle payment method selection
   * Saves the selected method and navigates to payment page
   */
  onPaymentMethodSelected(method: PaymentMethod): void {
    const car = this.car();
    const { from, to } = this.dateRange();

    if (!car || !from || !to) {
      this.bookingError.set('Por favor seleccioná las fechas de alquiler');
      return;
    }

    // Track: Booking initiated with payment method
    this.analytics.trackEvent('booking_initiated', {
      car_id: car.id,
      payment_method: method,
      rental_amount: this.rentalTotal() ?? undefined,
      deposit_amount: this.depositAmount(),
      total_amount: this.authorizationTotal() ?? undefined,
    });

    // Save method in sessionStorage for payment page
    sessionStorage.setItem('payment_method', method);

    // Navigate to payment page with method pre-selected
    void this.navigateToPaymentPage(method);
  }

  /**
   * Navigate to payment page with payment method pre-selected
   */
  private async navigateToPaymentPage(paymentMethod?: PaymentMethod): Promise<void> {
    const car = this.car();
    const { from, to } = this.dateRange();

    if (!car || !from || !to) return;

    // Check authentication
    if (!(await this.authService.isAuthenticated())) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    // Prepare booking data
    const startDate = new Date(from).toISOString();
    const endDate = new Date(to).toISOString();

    // Save booking detail input for payment page
    sessionStorage.setItem(
      'booking_detail_input',
      JSON.stringify({
        carId: car.id,
        startDate,
        endDate,
        bucket: 'standard', // Default bucket, not stored in Car model
        vehicleValueUsd: car.value_usd ?? 10000,
        country: car.location_country ?? 'AR',
      }),
    );

    // Navigate with payment method if provided
    const queryParams: Record<string, string> = {
      carId: car.id,
      startDate,
      endDate,
    };

    if (paymentMethod) {
      queryParams['paymentMethod'] = paymentMethod;
    }

    await this.router.navigate(['/bookings/detail-payment'], { queryParams });
  }

  async onBookClick(): Promise<void> {
    const car = this.car();
    const { from, to } = this.dateRange();
    if (!car || !from || !to) {
      this.bookingError.set('Por favor seleccioná las fechas de alquiler');
      return;
    }

    // Track: CTA clicked
    this.analytics.trackEvent('cta_clicked', {
      car_id: car.id,
      has_dates: true,
      express_mode: this.expressMode(),
      days_count: this.daysCount(),
      total_price: this.totalPrice() ?? undefined,
    });

    if (!(await this.authService.isAuthenticated())) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    // ✅ NEW: Show location form instead of directly booking
    // Prepare dates in ISO format
    let startDate: string;
    let endDate: string;

    if (this.expressMode()) {
      const now = new Date();
      const hours = this.hoursCount();
      const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
      startDate = now.toISOString();
      endDate = end.toISOString();
    } else {
      startDate = new Date(from).toISOString();
      endDate = new Date(to).toISOString();
    }

    // Store booking data and show form
    this.pendingBookingData.set({ from: startDate, to: endDate });
    this.showLocationForm.set(true);
    this.bookingError.set(null);
  }

  /**
   * ✅ NEW: Handle location form submission
   */
  async onLocationFormSubmit(locationData: BookingLocationData): Promise<void> {
    const car = this.car();
    const pendingData = this.pendingBookingData();

    if (!car || !pendingData) {
      this.bookingError.set('Datos incompletos. Por favor intentá nuevamente.');
      return;
    }

    this.bookingInProgress.set(true);
    this.bookingError.set(null);

    try {
      const startDate = pendingData.from;
      const endDate = pendingData.to;

      // ✅ NEW: Re-validate availability before booking
      if (!this.expressMode()) {
        this.validatingAvailability.set(true);
        try {
          const isAvailable = await this.carsService.isCarAvailable(car.id, startDate, endDate);
          if (!isAvailable) {
            // Track: Booking failed due to availability
            this.analytics.trackEvent('booking_failed', {
              car_id: car.id,
              error: 'Fechas no disponibles - reserva confirmada en ese período',
            });

            // Try to suggest alternative dates
            const suggestions = await this.carsService.getNextAvailableRange(
              car.id,
              startDate,
              endDate,
              3,
            );

            if (suggestions && suggestions.length > 0) {
              this.suggestedDateRanges.set(suggestions);
              this.bookingError.set(
                'El auto no está disponible para esas fechas. Te sugerimos las siguientes alternativas:',
              );
              this.canWaitlist.set(false);
            } else {
              this.suggestedDateRanges.set([]);
              this.bookingError.set(
                'El auto no está disponible para esas fechas. Hay una reserva confirmada en ese período.',
              );
              this.canWaitlist.set(true);
            }

            await this.loadBlockedDates(car.id);
            return;
          }
        } finally {
          this.validatingAvailability.set(false);
        }
      }

      // Track: Booking initiated
      this.analytics.trackEvent('booking_initiated', {
        car_id: car.id,
        days_count: this.daysCount(),
        total_amount: this.totalPrice() ?? undefined,
        express_mode: this.expressMode(),
        has_delivery: locationData.deliveryRequired,
        delivery_distance_km: locationData.distanceKm,
      });

      // ✅ NEW: Create booking with location data
      const result = await this.bookingsService.createBookingWithValidation(
        car.id,
        startDate,
        endDate,
        locationData,
      );

      if (!result.success || !result.booking) {
        // Track: Booking failed
        this.analytics.trackEvent('booking_failed', {
          car_id: car.id,
          error: result.error ?? 'Unknown error',
        });

        this.bookingError.set(result.error || 'No pudimos crear la reserva.');
        this.showLocationForm.set(false);
        return;
      }

      // Track: Booking completed (navigation to payment)
      this.analytics.trackEvent('booking_completed', {
        car_id: car.id,
        booking_id: result.booking.id,
        total_amount: this.totalPrice() ?? undefined,
        days_count: this.daysCount(),
      });

      // Close form and navigate
      this.showLocationForm.set(false);
      this.pendingBookingData.set(null);

      this.router.navigate(['/bookings/detail-payment'], {
        queryParams: { bookingId: result.booking.id },
      });
    } catch (err) {
      // Track: Booking failed (exception)
      this.analytics.trackEvent('booking_failed', {
        car_id: car.id,
        error: err instanceof Error ? err.message : 'Exception during booking',
      });

      this.bookingError.set(err instanceof Error ? err.message : 'Error al crear la reserva');
    } finally {
      this.bookingInProgress.set(false);
    }
  }

  /**
   * ✅ NEW: Handle location form cancellation
   */
  onLocationFormCancelled(): void {
    this.showLocationForm.set(false);
    this.pendingBookingData.set(null);
    this.bookingError.set(null);
  }

  /**
   * ✅ NEW: Handle pickup location selection from pickup-location-selector component
   * Updates delivery fee and distance based on selection
   */
  onPickupLocationSelected(selection: PickupLocationSelection): void {
    this.pickupLocationSelection.set(selection);
    this.deliveryFeeCents.set(selection.deliveryFeeCents);
    this.distanceKm.set(selection.distanceKm);

    // Log the selection for debugging
    console.log('📍 Pickup location selected:', {
      pickupLat: selection.pickupLocation?.lat,
      pickupLng: selection.pickupLocation?.lng,
      deliveryRequired: selection.deliveryRequired,
      deliveryFee: selection.deliveryFeeCents,
      distance: selection.distanceKm,
    });
  }

  private updateMetaTags(car: Car, stats: CarStats | null): void {
    const mainPhoto = (car.photos?.[0] ?? car.car_photos?.[0])?.url;
    const description =
      car.description ||
      `${car.brand} ${car.model} ${car.year} - Alquiler de auto en ${car.location_city}`;
    this.metaService.updateCarDetailMeta({
      title: car.title,
      description,
      main_photo_url: mainPhoto,
      price_per_day: car.price_per_day,
      currency: car.currency || 'ARS',
      id: car.id,
    });
    this.metaService.addCarProductData({
      title: car.title,
      description,
      main_photo_url: mainPhoto,
      price_per_day: car.price_per_day,
      currency: car.currency || 'ARS',
      id: car.id,
      rating_avg: stats?.rating_avg,
      rating_count: stats?.reviews_count || 0,
    });
  }

  /**
   * ✅ UPDATED: Carga los rangos de fechas bloqueadas del auto
   * Usa el nuevo método del servicio que incluye TODOS los estados de reserva bloqueantes:
   * pending, pending_payment, confirmed, in_progress
   */
  private async loadBlockedDates(carId: string): Promise<void> {
    try {
      const ranges = await this.carsService.getBlockedDateRanges(carId);
      this.blockedRanges.set(ranges);

      // DEPRECATED: Mantener blockedDates para compatibilidad con inline calendar
      // TODO: Migrar inline calendar a usar blockedRanges también
      const blocked = new Set<string>();
      ranges.forEach((range: { from: string; to: string }) => {
        const start = new Date(range.from);
        const end = new Date(range.to);
        const currentDate = new Date(start);
        while (currentDate <= end) {
          blocked.add(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      this.blockedDates.set(Array.from(blocked));
    } catch (error) {
      console.error('Error in loadBlockedDates:', error);
    }
  }

  /**
   * Check if the current user is the owner of the car
   */
  private async checkOwnership(ownerId: string): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      this.isCarOwner.set(data.session?.user?.id === ownerId);
    } catch (error) {
      console.error('Error checking ownership:', error);
      this.isCarOwner.set(false);
    }
  }

  private normalizeDateInput(value: string): string {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? value : parsed.toISOString().split('T')[0];
  }

  /**
   * ✅ NEW: Aplica una sugerencia de fecha clickeada por el usuario
   */
  applySuggestedDates(suggestion: { startDate: string; endDate: string; daysCount: number }): void {
    // Convertir fechas de YYYY-MM-DD a DateRange format
    this.dateRange.set({
      from: suggestion.startDate,
      to: suggestion.endDate,
    });

    // Clear errors and suggestions
    this.bookingError.set(null);
    this.suggestedDateRanges.set([]);
    this.canWaitlist.set(false);

    // Show success toast
    this.toastService.success(
      'Fechas actualizadas',
      `Seleccionaste ${suggestion.daysCount} día${suggestion.daysCount !== 1 ? 's' : ''} disponibles`,
    );

    // Track: Date suggestion applied
    this.analytics.trackEvent('date_range_selected', {
      car_id: this.car()?.id,
      days_count: suggestion.daysCount,
      source: 'suggestion_chip',
    });
  }

  /**
   * ✅ NEW: Agrega el usuario a la lista de espera
   */
  async addToWaitlist(): Promise<void> {
    const car = this.car();
    const { from, to } = this.dateRange();

    if (!car || !from || !to) {
      this.toastService.error('Error', 'Por favor seleccioná las fechas primero');
      return;
    }

    this.addingToWaitlist.set(true);
    try {
      const result = await this.waitlistService.addToWaitlist(car.id, from, to);

      if (result.success) {
        this.bookingError.set(null);
        this.canWaitlist.set(false);
        this.suggestedDateRanges.set([]);

        this.toastService.success(
          'Agregado a lista de espera',
          'Te notificaremos cuando el auto esté disponible para esas fechas',
        );

        // Track: Waitlist joined
        this.analytics.trackEvent('date_range_selected', {
          car_id: car.id,
          source: 'waitlist_added',
        });
      } else {
        this.toastService.error(
          'Error',
          result.error || 'No pudimos agregarte a la lista de espera',
        );
      }
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      this.toastService.error(
        'Error',
        'No pudimos agregarte a la lista de espera. Intentá nuevamente',
      );
    } finally {
      this.addingToWaitlist.set(false);
    }
  }

  /**
   * ✅ NEW: Formatea una fecha para mostrar en los chips de sugerencias
   */
  formatSuggestionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(date);
  }
}
