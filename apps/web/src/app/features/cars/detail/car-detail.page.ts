import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of, combineLatest } from 'rxjs';

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
import { Car, Review, CarStats } from '../../../core/models';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';

// Components
import {
  DateRangePickerComponent,
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CarReviewsSectionComponent } from '../../../shared/components/car-reviews-section/car-reviews-section.component';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';
import { ShareMenuComponent } from '../../../shared/components/share-menu/share-menu.component';
import { DynamicPriceDisplayComponent } from '../../../shared/components/dynamic-price-display/dynamic-price-display.component';
import { UrgentRentalBannerComponent } from '../../../shared/components/urgent-rental-banner/urgent-rental-banner.component';
import { SocialProofIndicatorsComponent } from '../../../shared/components/social-proof-indicators/social-proof-indicators.component';
import { BookingBenefitsComponent } from '../../../shared/components/booking-benefits/booking-benefits.component';
import { StickyCtaMobileComponent } from '../../../shared/components/sticky-cta-mobile/sticky-cta-mobile.component';
import { WhatsappFabComponent } from '../../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { DistanceBadgeComponent } from '../../../shared/components/distance-badge/distance-badge.component';

// Services
import { UrgentRentalService } from '../../../core/services/urgent-rental.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

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
    TranslateModule,
    UrgentRentalBannerComponent,
    SocialProofIndicatorsComponent,
    BookingBenefitsComponent,
    StickyCtaMobileComponent,
    DistanceBadgeComponent,
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

  readonly expressMode = signal(false);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly urgentAvailability = signal<{ available: boolean; distance?: number; eta?: number } | null>(null);

  // ✅ NEW: Distance-based pricing
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly distanceKm = signal<number | null>(null);
  readonly deliveryFeeCents = signal<number>(0);
  readonly distanceTier = signal<'local' | 'regional' | 'long_distance' | null>(null);
  readonly bookingInProgress = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');
  readonly currentPhotoIndex = signal(0);
  readonly blockedDates = signal<string[]>([]);
  readonly imageLoaded = signal(false);
  
  // ✅ FIX: Precio dinámico para mostrar en lugar del estático
  readonly dynamicPrice = signal<number | null>(null);
  readonly priceLoading = signal(false);
  readonly hourlyRateLoading = signal(false);

  private readonly carId$ = this.route.paramMap.pipe(map((params) => params.get('id')));

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
      return combineLatest([
        this.carsService.getCarById(id),
        this.reviewsService.getReviewsForCar(id),
        this.reviewsService.getCarStats(id),
      ]).pipe(
        map(([car, reviews, stats]) => {
          if (car) {
            this.updateMetaTags(car, stats);
          }
          return { car, reviews, stats, loading: false, error: car ? null : 'Auto no disponible' };
        }),
        catchError(() =>
          of({
            car: null,
            reviews: [],
            stats: null,
            loading: false,
            error: 'Error al cargar el auto',
          }),
        ),
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

  readonly walletBalance = toSignal(this.walletService.getBalance(), {
    initialValue: null,
  });
  readonly currentFxRate = toSignal(
    this.fxService.getFxSnapshot('USD', 'ARS').pipe(map((s) => s?.rate ?? null)),
  );

  readonly allPhotos = computed(() => this.car()?.photos ?? this.car()?.car_photos ?? []);
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
    const diff = Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60),
    );
    return diff > 0 ? Math.max(diff, 5) : 5; // Mínimo 5 horas
  });

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
      console.warn('⚠️ [CarDetail] No car available for hourly rate calculation');
      return null;
    }

    const pricePerDay = this.displayPrice();
    if (!pricePerDay || isNaN(pricePerDay) || pricePerDay <= 0) {
      console.warn(`⚠️ [CarDetail] Invalid price per day: ${pricePerDay}`, {
        dynamicPrice: this.dynamicPrice(),
        staticPrice: car.price_per_day,
        displayPrice: this.displayPrice(),
      });
      return null;
    }

    // 75% del precio diario / 24 horas
    const hourlyRate = (pricePerDay * 0.75) / 24;
    console.log(`💰 [CarDetail] Calculated hourly rate from daily price: $${pricePerDay}/día → $${hourlyRate}/hora`);
    return hourlyRate;
  });

  readonly totalPrice = computed(() => {
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
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
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
      }
    });
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
            car.location_lng
          );

          this.distanceKm.set(distance);

          // Calculate tier and delivery fee
          const tier = this.distanceCalculator.getDistanceTier(distance);
          this.distanceTier.set(tier);

          const deliveryFee = this.distanceCalculator.calculateDeliveryFee(distance);
          this.deliveryFeeCents.set(deliveryFee);
        }
      }
    } catch (error) {
      // Silently fail - distance is optional
      console.warn('Could not calculate distance:', error);
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
        console.error('❌ [CarDetail] Error loading dynamic price:', error);
        return;
      }

      if (data && data.total_price) {
        this.dynamicPrice.set(data.total_price);
        console.log(`💰 [CarDetail] Dynamic price loaded: $${data.total_price} (was $${car.price_per_day})`);
      }

      // ✅ FIX: Cargar precio por hora para modo express (5 horas mínimo)
      if (this.expressMode()) {
        this.hourlyRateLoading.set(true);
        try {
          const hours = Math.max(this.hoursCount(), 5); // Mínimo 5 horas para cálculo representativo
          const quote = await this.urgentRentalService.getUrgentQuote(car.id, car.region_id, hours);
          // Usar el precio por hora del sistema de pricing dinámico
          this.dynamicHourlyRate.set(quote.hourlyRate);
          console.log(`💰 [CarDetail] Dynamic hourly rate loaded: $${quote.hourlyRate}/hora (quote para ${hours} horas)`);
        } catch (error) {
          console.warn('⚠️ [CarDetail] Could not load dynamic hourly rate:', error);
          // Fallback: calcular desde precio diario
          const pricePerDay = this.displayPrice();
          if (pricePerDay > 0) {
            const fallbackHourly = (pricePerDay * 0.75) / 24;
            this.dynamicHourlyRate.set(fallbackHourly);
            console.log(`💰 [CarDetail] Using fallback hourly rate: $${fallbackHourly}/hora`);
          }
        } finally {
          this.hourlyRateLoading.set(false);
        }
      }
    } catch (error) {
      console.error('❌ [CarDetail] Error loading dynamic price:', error);
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
      } catch (error) {
        console.warn('No se pudo obtener ubicación:', error);
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
        console.log(`💰 [CarDetail] Express mode hourly rate: $${quote.hourlyRate}/hora (quote para ${hours} horas)`);
      } catch (error) {
        console.warn('⚠️ [CarDetail] Could not load hourly rate for express mode:', error);
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
    } catch (error) {
      console.error('Error setting up express mode:', error);
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

    this.bookingInProgress.set(true);
    this.bookingError.set(null);

    try {
      // Modo express: usar fechas inmediatas
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

      // Track: Booking initiated
      this.analytics.trackEvent('booking_initiated', {
        car_id: car.id,
        days_count: this.daysCount(),
        total_amount: this.totalPrice() ?? undefined,
        express_mode: this.expressMode(),
      });

      const result = await this.bookingsService.createBookingWithValidation(
        car.id,
        startDate,
        endDate,
      );
      if (!result.success || !result.booking) {
        // Track: Booking failed
        this.analytics.trackEvent('booking_failed', {
          car_id: car.id,
          error: result.error ?? 'Unknown error',
        });

        this.bookingError.set(result.error || 'No pudimos crear la reserva.');
        return;
      }

      // Track: Booking completed (navigation to payment)
      this.analytics.trackEvent('booking_completed', {
        car_id: car.id,
        booking_id: result.booking.id,
        total_amount: this.totalPrice() ?? undefined,
        days_count: this.daysCount(),
      });

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
   * Carga las fechas bloqueadas del auto
   * Obtiene todas las reservas confirmadas y genera un array de fechas bloqueadas
   */
  private async loadBlockedDates(carId: string): Promise<void> {
    try {
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('start_at, end_at')
        .eq('car_id', carId)
        .in('status', ['confirmed', 'in_progress']);

      if (error || !bookings) {
        console.error('Error loading blocked dates:', error);
        return;
      }

      // Generar array de fechas bloqueadas
      const blocked = new Set<string>();

      bookings.forEach((booking) => {
        const start = new Date(booking.start_at);
        const end = new Date(booking.end_at);

        // Marcar todos los días entre start y end como bloqueados
        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dateKey = currentDate.toISOString().split('T')[0];
          blocked.add(dateKey);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      this.blockedDates.set(Array.from(blocked));
    } catch (error) {
      console.error('Error in loadBlockedDates:', error);
    }
  }
}
