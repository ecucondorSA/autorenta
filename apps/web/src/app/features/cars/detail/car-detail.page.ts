import { LoggerService } from '@core/services/infrastructure/logger.service';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest, from, fromEvent, of, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil, throttleTime } from 'rxjs/operators';

// Services
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CarsService } from '@core/services/cars/cars.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';
import { DynamicPricingService } from '@core/services/payments/dynamic-pricing.service';
import { FxService } from '@core/services/payments/fx.service';
import { LocationService } from '@core/services/geo/location.service';
import { MetaService } from '@core/services/ui/meta.service';
import { ReviewsService } from '@core/services/cars/reviews.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';
import { WaitlistService } from '@core/services/bookings/waitlist.service';
import { MoneyPipe } from '@shared/pipes/money.pipe';

// Models
import type { Booking } from '@core/models';
import { BookingPaymentMethod } from '@core/models/wallet.model';
import { RiskCalculation } from '@core/services/verification/risk-calculator.service';
import type { DateRange } from '@core/models/marketplace.model';
// UI 2026 Directives
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { StaggerEnterDirective } from '@shared/directives/stagger-enter.directive';
import { Car, CarPhoto, CarStats, Review } from '../../../core/models';
import { SubscriptionService } from '@core/services/subscriptions/subscription.service';
import { RiskSnapshot } from '@core/models/booking-detail-payment.model';

// Components
import { AiChecklistPanelComponent } from '../../../shared/components/ai-checklist-panel/ai-checklist-panel.component';
import { AiTripPanelComponent } from '../../../shared/components/ai-trip-panel/ai-trip-panel.component';
import { AiReputationCardComponent } from '../../../shared/components/ai-reputation-card/ai-reputation-card.component';
import { CarInquiryChatComponent } from '../../../shared/components/car-inquiry-chat/car-inquiry-chat.component';

import { DateRangePickerComponent } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { type PaymentMethod } from '../../../shared/components/payment-method-buttons/payment-method-buttons.component';

import { StickyCtaMobileComponent } from '../../../shared/components/sticky-cta-mobile/sticky-cta-mobile.component';
import { ReviewSummaryComponent } from '../../../shared/components/review-summary/review-summary.component';
import { BookingLocationData } from '../../bookings/components/booking-location-form/booking-location-form.component';

// Temporary interfaces until components are created
export interface Photo {
  id: string;
  url: string;
  alt: string;
  thumbnail?: string;
}

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
}

interface GuaranteeEstimate {
  fxRate: number;
  holdEstimatedUsd: number;
  holdEstimatedArs: number;
  creditSecurityUsd: number;
  creditSecurityArs: number;
}

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

    TranslateModule,
    MoneyPipe,
    StickyCtaMobileComponent,
    IconComponent,
    AiChecklistPanelComponent,
    AiTripPanelComponent,
    AiReputationCardComponent,
    CarInquiryChatComponent,
    ReviewSummaryComponent,
    // UI 2026 Directives
    HoverLiftDirective,
    StaggerEnterDirective,
  ],
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetailPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  // ✅ NEW: ViewChild references for scroll behavior
  @ViewChild('stickyHeader', { read: ElementRef }) stickyHeaderRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mainHeader', { read: ElementRef }) mainHeaderRef?: ElementRef<HTMLDivElement>;
  @ViewChild('bookingDatePickerDesktop', { read: DateRangePickerComponent })
  bookingDatePickerDesktop?: DateRangePickerComponent;
  @ViewChild('bookingDatePickerMobile', { read: DateRangePickerComponent })
  bookingDatePickerMobile?: DateRangePickerComponent;
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
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // P0-006 FIX: Memory leak prevention
  private readonly destroy$ = new Subject<void>();

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
  readonly termsAccepted = signal(false); // ✅ Checkbox de aceptación de términos
  readonly validatingAvailability = signal(false); // ✅ NEW: Loading state for re-validation
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');

  // ✅ NEW: Booking location form state
  readonly pendingBookingData = signal<{ from: string; to: string } | null>(null);

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

  protected readonly defaultCarPlaceholderUrl = '/assets/placeholder-car.webp';

  // ✅ FIX: Precio dinámico para mostrar en lugar del estático
  readonly dynamicPrice = signal<number | null>(null);
  readonly priceLoading = signal(false);
  readonly hourlyRateLoading = signal(false);

  readonly isCarOwner = signal<boolean>(false);

  // Risk calculation for guarantee display
  readonly riskCalculation = signal<RiskCalculation | null>(null);
  readonly showRiskCalculator = signal(false);

  // AI Panels
  readonly expandedAiPanel = signal<'legal' | 'trip' | 'checklist' | null>(null);

  toggleAiPanel(panel: 'legal' | 'trip' | 'checklist'): void {
    this.expandedAiPanel.update((current) => (current === panel ? null : panel));
  }

  private readonly carId$ = this.route.paramMap.pipe(map((params) => params.get('id')));

  /**
   * Valida si un string es un UUID válido
   */
  private isValidUUID(uuid: string): boolean {
    // Matches UUID v4 format: 8-4-4-4-12 hexadecimal characters with hyphens
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
      this.logger.debug(`CarDetailPage: Validating ID: ${id}`);
      if (!this.isValidUUID(id)) {
        this.logger.debug(`CarDetailPage: Invalid UUID: ${id}, redirecting to /cars`);
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
      this.logger.debug(`CarDetailPage: Valid UUID: ${id}, fetching data...`);
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
            this.logger.debug('CarDetailPage: Car loaded:', JSON.stringify(car));
            this.updateMetaTags(car, stats);
          }
          return { car, reviews, stats, loading: false, error: car ? null : 'Auto no disponible' };
        }),
        catchError((err) => {
          // Determinar mensaje de error más específico
          let errorMessage = 'Error al cargar el auto';
          if (err?.code === 'PGRST116') {
            errorMessage = 'Auto no encontrado';
          } else if (err?.code === 'PGRST200') {
            // Ignore missing relationship error
            console.warn('Review relationship missing (PGRST200), returning empty reviews');
            return of({
              car: null, // This will trigger the overall error state if car is also null
              reviews: [],
              stats: null,
              loading: false,
              error: null, // Allow loading to complete if it was just reviews failing
            });
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

  readonly displayTitle = computed(() => {
    const car = this.car();
    if (!car) return 'Próximamente';
    const title = car.title?.trim() || '';
    if (title && title.toLowerCase() !== 'auto sin título') return title;

    const parts = [
      car.brand || car.brand_name || '',
      car.model || car.model_name || '',
      car.year || '',
    ]
      .map((p) => String(p).trim())
      .filter(Boolean);

    const fallback = parts.join(' ').trim();
    return fallback || 'Próximamente';
  });

  /**
   * Returns owner's first name only if it's valid (not corrupted data like 'del', 'de', etc.)
   */
  readonly ownerFirstName = computed(() => {
    const car = this.car();
    const fullName = car?.owner?.full_name?.trim();
    if (!fullName || fullName.length < 3) return null;

    const firstName = fullName.split(' ')[0];
    // Reject common Spanish prepositions/articles that indicate corrupted data
    const invalidNames = ['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una'];
    if (!firstName || firstName.length < 2 || invalidNames.includes(firstName.toLowerCase())) {
      return null;
    }

    return firstName;
  });

  /** Signal para toggle de términos expandibles */
  readonly showTerms = signal(false);

  // Breadcrumbs navigation
  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    return [
      { label: 'Inicio', url: '/', icon: '🏠' },
      { label: 'Explorar Autos', url: '/cars/list', icon: '🚗' },
      { label: this.displayTitle() || 'Cargando...' },
    ];
  });

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

  // Convert CarPhoto[] to Photo[] for PhotoGalleryComponent
  readonly galleryPhotos = computed<Photo[]>(() => {
    const photos = this.allPhotos();
    const car = this.car();

    return photos.map((photo, index) => ({
      id: photo.id || `photo-${index}`,
      url: photo.url,
      thumbnailUrl: photo.url, // Use same URL, component will handle optimization
      alt: `${car?.title || 'Auto'} - Foto ${index + 1}`,
      caption: undefined, // CarPhoto doesn't have description field
    }));
  });

  readonly currentPhoto = computed(() => this.allPhotos()[this.currentPhotoIndex()]);
  readonly hasMultiplePhotos = computed(() => this.allPhotos().length > 1);

  readonly heroPhotoUrls = computed<string[]>(() => {
    const photos = this.allPhotos();
    // Always return 5 URLs (with fallback) to avoid broken hero grid
    return Array.from({ length: 5 }, (_, idx) => {
      const photo = photos[idx];
      return this.resolveCarPhotoUrl(photo) ?? this.defaultCarPlaceholderUrl;
    });
  });

  private resolveCarPhotoUrl(photo: CarPhoto | undefined): string | null {
    if (!photo) return null;

    // Prefer an explicit absolute URL
    const rawUrl = (photo.url ?? '').trim();
    if (rawUrl) {
      try {
        // Validate & normalize (also helps if there are spaces)
        const url = new URL(rawUrl);
        return url.toString();
      } catch {
        // Fall back to stored_path
      }
    }

    // Fall back to storage public URL
    const rawPath = (photo.stored_path ?? '').trim();
    if (!rawPath) return null;

    // Defensive: strip bucket prefix if it was accidentally included
    const normalizedPath = rawPath.replace(/^car-images\//, '').replace(/^\/+/, '');
    const { data } = this.supabase.storage.from('car-images').getPublicUrl(normalizedPath);
    return data?.publicUrl ?? null;
  }

  /**
   * Helper: Obtiene la etiqueta legible para la política de combustible
   */
  getFuelPolicyLabel(policy: string | null | undefined): string {
    const labels: Record<string, string> = {
      full_to_full: 'Lleno a lleno',
      same_to_same: 'Igual a igual',
      prepaid: 'Prepago',
      free_tank: 'Tanque incluido',
    };
    return labels[policy || ''] || 'Lleno a lleno';
  }

  /**
   * Helper: Obtiene la etiqueta legible para la política de cancelación
   */
  getCancelPolicyLabel(policy: string | undefined): string {
    const labels: Record<string, string> = {
      flexible: 'Flexible - 100% reembolso hasta 24h antes del inicio',
      moderate: 'Moderada - 50% reembolso hasta 48h antes del inicio',
      strict: 'Estricta - Sin reembolso en los 7 días previos',
    };
    return labels[policy || 'moderate'] || 'Moderada';
  }

  onImgError(event: Event, fallbackUrl: string = this.defaultCarPlaceholderUrl): void {
    const el = event.target as HTMLImageElement | null;
    if (!el) return;
    if (el.src === fallbackUrl) return;
    el.src = fallbackUrl;
  }

  private openDatePicker(): void {
    try {
      const mobileInput = this.bookingDatePickerMobile?.dateRangeInput?.nativeElement;
      const desktopInput = this.bookingDatePickerDesktop?.dateRangeInput?.nativeElement;
      const mobileVisible = !!mobileInput && mobileInput.offsetParent !== null;
      const desktopVisible = !!desktopInput && desktopInput.offsetParent !== null;

      if (mobileVisible) {
        this.bookingDatePickerMobile?.handleDateInputClick();
        return;
      }
      if (desktopVisible) {
        this.bookingDatePickerDesktop?.handleDateInputClick();
        return;
      }
    } catch {
      // no-op
    }
  }

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
   * Vista previa de garantía usando la misma lógica del checkout
   */
  readonly guaranteeEstimate = computed<GuaranteeEstimate | null>(() => {
    // Note: We cannot fully calculate proper risk here without async calls to subscription service
    // So we provide a safe estimation based on standard rules (non-subscribed user)
    // Real calculation happens in booking-request page
    const car = this.car();
    const fxRate = this.currentFxRate();

    if (!car || !fxRate || fxRate <= 0) return null;

    // Standard Rule: ~5% of vehicle value or default $600 USD
    // This is just for display estimation
    const vehicleValueUsd = car.value_usd || 12000;
    const holdEstimatedUsd = Math.round(vehicleValueUsd * 0.05);
    const holdEstimatedArs = holdEstimatedUsd * fxRate;

    return {
      fxRate,
      holdEstimatedUsd,
      holdEstimatedArs,
      creditSecurityUsd: holdEstimatedUsd, // Standard equivalence
      creditSecurityArs: holdEstimatedArs,
    };
  });

  readonly cardHoldArs = computed(() => this.guaranteeEstimate()?.holdEstimatedArs ?? null);

  readonly cardHoldUsd = computed(() => {
    const estimate = this.guaranteeEstimate();
    if (!estimate) return null;
    const holdUsd = estimate.holdEstimatedUsd;
    return Math.round(holdUsd * 100) / 100;
  });

  readonly walletCreditUsd = computed(() => this.guaranteeEstimate()?.creditSecurityUsd ?? null);

  readonly walletCreditArs = computed(() => {
    const estimate = this.guaranteeEstimate();
    if (!estimate) return null;
    return Math.round(estimate.creditSecurityArs);
  });

  readonly guaranteeFxRate = computed(() => this.guaranteeEstimate()?.fxRate ?? null);

  /**
   * Depósito de seguridad en USD (estimado para analytics/UI)
   */
  readonly depositAmount = computed(() => {
    const method = this.selectedPaymentMethod();
    if (method === 'wallet') {
      return this.walletCreditUsd() ?? 0;
    }
    return this.cardHoldUsd() ?? 0;
  });

  /**
   * Depósito de seguridad en ARS (para cálculos)
   * Usa hold con tarjeta o crédito wallet según método seleccionado
   */
  readonly depositAmountArs = computed(() => {
    const method = this.selectedPaymentMethod();
    if (method === 'wallet') {
      return this.walletCreditArs() ?? 0;
    }
    return this.cardHoldArs() ?? 0;
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
    if (this.isCarOwner()) {
      return false;
    }
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
    } catch {
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
    } catch {
      // Silent fail - próxima ventana disponible es opcional
      return null;
    }
  };

  ngOnInit(): void {
    // Verificar si viene con query param urgent - P0-006 FIX: Added takeUntil
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['urgent'] === 'true') {
        this.expressMode.set(true);
        void this.setupExpressMode();
      }
    });

    // Cargar fechas bloqueadas cuando el auto esté disponible - P0-006 FIX: Added takeUntil
    this.carData$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
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
          currency: state.car.currency || 'USD',
        });
      }
    });
  }

  /**
   * ✅ NEW: Setup scroll behavior for sticky header (Turo-style)
   */
  ngAfterViewInit(): void {
    // Setup scroll listener for collapsing header
    if (typeof window !== 'undefined') {
      const threshold = 200; // Trigger sticky header after 200px scroll

      fromEvent(window, 'scroll')
        .pipe(
          throttleTime(100, undefined, { leading: true, trailing: true }),
          takeUntil(this.destroy$),
        )
        .subscribe(() => {
          const currentScrollY = window.scrollY;
          const stickyHeader = this.stickyHeaderRef?.nativeElement;

          if (!stickyHeader) return;

          // Show sticky header when scrolling down past threshold
          if (currentScrollY > threshold) {
            stickyHeader.classList.remove('sticky-header-hidden');
            stickyHeader.classList.add('sticky-header-visible');
          } else {
            // Hide when scrolling back up to top
            stickyHeader.classList.remove('sticky-header-visible');
            stickyHeader.classList.add('sticky-header-hidden');
          }
        });
    }
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
    } catch {
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
        } catch {
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
    } catch {
      // Silent fail - will use static price
    } finally {
      this.priceLoading.set(false);
    }
  }

  /**
   * ✅ FIX: Precio a mostrar en USD (precio base del auto)
   * NOTE: Dynamic pricing temporarily disabled during USD migration
   */
  readonly displayPrice = computed(() => {
    const car = this.car();
    const price = car?.price_per_day ?? 0;
    return Number.isFinite(price) ? price : 0;
  });

  readonly hasValidPrice = computed(() => {
    const price = this.displayPrice();
    return Number.isFinite(price) && price > 0;
  });

  readonly formattedPrice = computed(() => {
    return this.hasValidPrice() ? this.usdFormatter.format(this.displayPrice()) : null;
  });

  async setupExpressMode(): Promise<void> {
    const car = this.car();
    if (!car || !car.region_id) return;

    try {
      // Obtener ubicación del usuario
      try {
        await this.urgentRentalService.getCurrentLocation();
      } catch {
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
        this.logger.debug(
          `💰 [CarDetail] Express mode hourly rate: $${quote.hourlyRate}/hora (quote para ${hours} horas)`,
        );
      } catch {
        console.warn('⚠️ [CarDetail] Could not load hourly rate for express mode:');
        // Fallback: calcular desde precio diario si está disponible
        const pricePerDay = this.displayPrice();
        if (pricePerDay > 0) {
          const fallbackHourly = (pricePerDay * 0.75) / 24;
          this.dynamicHourlyRate.set(fallbackHourly);
          this.logger.debug(`💰 [CarDetail] Using fallback hourly rate: $${fallbackHourly}/hora`);
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

    // First create the booking, then navigate to payment page
    try {
      // Call booking service to create the booking (using requestBooking RPC)
      const booking = await this.bookingsService.requestBooking(car.id, startDate, endDate);

      if (booking?.id) {
        // Navigate to booking request (pre-auth + message)
        await this.router.navigate(['/bookings', booking.id, 'detail-payment'], {
          queryParams: paymentMethod ? { paymentMethod } : {},
        });
      } else {
        // Fallback to old flow if booking creation fails
        await this.router.navigate(['/bookings/detail-payment'], { queryParams });
      }
    } catch (error: unknown) {
      console.error('[CarDetail] Error creating booking:', error);

      // Handle specific RPC errors with user-friendly messages
      const errorMessage = (error as { message?: string })?.message;
      if (errorMessage === 'OVERLAP') {
        this.bookingError.set(
          'Las fechas seleccionadas no están disponibles. Por favor elegí otras fechas.',
        );
        // Re-open date picker so user can select new dates
        this.openDatePicker();
        return;
      }

      // Fallback to old flow on other errors
      await this.router.navigate(['/bookings/detail-payment'], { queryParams });
    }
  }

  async onBookClick(): Promise<void> {
    const car = this.car();
    const { from, to } = this.dateRange();
    if (!car || !from || !to) {
      this.bookingError.set('Por favor seleccioná las fechas de alquiler');

      // UX: If the user clicked the CTA without dates, open the date picker.
      this.openDatePicker();
      return;
    }

    if (this.isCarOwner()) {
      this.bookingError.set('No podés reservar tu propio auto.');
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
    this.bookingError.set(null);

    await this.createBookingFlow(startDate, endDate);
  }

  /**
   * ✅ NEW: Handle location form submission
   */
  async onLocationFormSubmit(locationData: BookingLocationData): Promise<void> {
    const pendingData = this.pendingBookingData();
    if (!pendingData) return;

    await this.createBookingFlow(pendingData.from, pendingData.to, locationData);
  }

  private async createBookingFlow(
    startDate: string,
    endDate: string,
    locationData?: BookingLocationData,
  ): Promise<void> {
    const car = this.car();
    if (!car) {
      this.bookingError.set('Datos incompletos. Por favor intentá nuevamente.');
      return;
    }

    this.bookingInProgress.set(true);
    this.bookingError.set(null);

    try {
      // ✅ NEW: Re-validate availability before booking
      if (!this.expressMode()) {
        this.validatingAvailability.set(true);
        try {
          const isAvailable = await this.carsService.isCarAvailable(car.id, startDate, endDate);
          if (!isAvailable) {
            const conflictInfo = await this.getAvailabilityConflictInfo(car.id, startDate, endDate);

            // Track: Booking failed due to availability
            this.analytics.trackEvent('booking_failed', {
              car_id: car.id,
              error: conflictInfo.hasPendingActive
                ? 'Fechas no disponibles - reserva temporal (pendiente/pago)'
                : 'Fechas no disponibles - reserva confirmada/en curso',
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
              // Aun con sugerencias, permitir waitlist para fechas exactas
              this.canWaitlist.set(true);
            } else {
              this.suggestedDateRanges.set([]);
              if (conflictInfo.hasPendingActive && !conflictInfo.hasConfirmed) {
                const minutes = conflictInfo.pendingMinutesLeft;
                this.bookingError.set(
                  minutes && minutes > 0
                    ? `El auto está reservado temporalmente (pendiente de pago). Se libera aprox. en ${minutes} min.`
                    : 'El auto está reservado temporalmente (pendiente de pago). Se libera en breve.',
                );
              } else {
                this.bookingError.set(
                  'El auto no está disponible para esas fechas. Hay una reserva confirmada en ese período.',
                );
              }
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
        has_delivery: locationData?.deliveryRequired ?? false,
        delivery_distance_km: locationData?.distanceKm ?? null,
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
        this.canWaitlist.set(Boolean(result.canWaitlist));
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
      this.pendingBookingData.set(null);

      // After creating a booking, take the user to the booking request step (pre-auth + message)
      await this.router.navigate(['/bookings', result.booking.id, 'detail-payment']);
    } catch (err: unknown) {
      // Track: Booking failed (exception)
      this.analytics.trackEvent('booking_failed', {
        car_id: car.id,
        error: err instanceof Error ? err.message : 'Exception during booking',
      });

      let userMessage = err instanceof Error ? err.message : 'Error al crear la reserva';
      const userMessageLower = userMessage.toLowerCase();

      if (
        userMessageLower.includes('self_booking_not_allowed') ||
        userMessageLower.includes('self booking')
      ) {
        userMessage = 'No podés reservar tu propio auto.';
      } else if (userMessage.includes('OVERLAP')) {
        userMessage = 'El auto ya está reservado para estas fechas. Por favor seleccioná otras.';

        // Load blocked dates to refresh calendar
        void this.loadBlockedDates(car.id);

        // Show waitlist option
        this.canWaitlist.set(true);
      } else if ((err as { code?: string })?.code === 'P0001') {
        // Handle P0001 as overlap only if it doesn't match self-booking
        userMessage = 'El auto ya está reservado para estas fechas. Por favor seleccioná otras.';

        // Load blocked dates to refresh calendar
        void this.loadBlockedDates(car.id);

        // Show waitlist option
        this.canWaitlist.set(true);
      }

      this.bookingError.set(userMessage);
    } finally {
      this.bookingInProgress.set(false);
    }
  }

  private async getAvailabilityConflictInfo(
    carId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    hasPendingActive: boolean;
    pendingMinutesLeft: number | null;
    hasConfirmed: boolean;
  }> {
    try {
      const { data } = await this.supabase
        .from('bookings')
        .select('status, expires_at')
        .eq('car_id', carId)
        .in('status', ['pending', 'pending_payment', 'confirmed', 'in_progress'])
        .lt('start_at', endDate)
        .gt('end_at', startDate);

      const rows = (data ?? []) as Array<{ status: string; expires_at: string | null }>;
      const nowMs = Date.now();

      const pendingRows = rows.filter(
        (r) => r.status === 'pending' || r.status === 'pending_payment',
      );
      const confirmedRows = rows.filter(
        (r) => r.status === 'confirmed' || r.status === 'in_progress',
      );

      const activePending = pendingRows.filter((r) => {
        if (!r.expires_at) return true;
        return new Date(r.expires_at).getTime() > nowMs;
      });

      let pendingMinutesLeft: number | null = null;
      const pendingExpiries = activePending
        .map((r) => (r.expires_at ? new Date(r.expires_at).getTime() : null))
        .filter((t): t is number => typeof t === 'number' && t > nowMs);

      if (pendingExpiries.length) {
        const earliest = Math.min(...pendingExpiries);
        pendingMinutesLeft = Math.max(1, Math.ceil((earliest - nowMs) / (1000 * 60)));
      }

      return {
        hasPendingActive: activePending.length > 0,
        pendingMinutesLeft,
        hasConfirmed: confirmedRows.length > 0,
      };
    } catch {
      return { hasPendingActive: false, pendingMinutesLeft: null, hasConfirmed: false };
    }
  }

  /**
   * ✅ NEW: Handle location form cancellation
   */
  onLocationFormCancelled(): void {
    this.pendingBookingData.set(null);
    this.bookingError.set(null);
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
      currency: car.currency || 'USD',
      id: car.id,
    });
    this.metaService.addCarProductData({
      title: car.title,
      description,
      main_photo_url: mainPhoto,
      price_per_day: car.price_per_day,
      currency: car.currency || 'USD',
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
        const start = this.parseToLocalDate(range.from);
        const end = this.parseToLocalDate(range.to);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const currentDate = new Date(start);
        while (currentDate <= end) {
          blocked.add(this.toLocalDateString(currentDate));
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
    const parsed = this.parseToLocalDate(value);
    return isNaN(parsed.getTime()) ? value : this.toLocalDateString(parsed);
  }

  private toLocalDateString(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseToLocalDate(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

  /**
   * Handle photo share from gallery
   */
  onPhotoShare(photo: Photo): void {
    const car = this.car();
    if (!car) return;

    // Track: Photo shared - using generic 'cta_clicked' event
    this.analytics.trackEvent('cta_clicked', {
      car_id: car.id,
      cta_type: 'photo_share',
      photo_id: photo.id,
      photo_index: this.galleryPhotos().findIndex((p) => p.id === photo.id),
    });

    // Share API if available
    if (navigator.share) {
      void navigator.share({
        title: car.title,
        text: `Mirá este ${car.title} disponible para alquilar`,
        url: window.location.href,
      });
    }
  }

  /**
   * Handle photo change from gallery
   */
  onPhotoChange(event: { photo: Photo; index: number }): void {
    const car = this.car();
    if (!car) return;

    // Track: Photo viewed - using 'cta_clicked' event with photo context
    this.analytics.trackEvent('cta_clicked', {
      car_id: car.id,
      source: 'photo_gallery_navigation',
      // Additional context stored in source field
    });

    // Update current photo index for any other components that might need it
    this.currentPhotoIndex.set(event.index);
  }

  ngOnDestroy(): void {
    // P0-006 FIX: Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
