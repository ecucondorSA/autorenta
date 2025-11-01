import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

// Models
import { Car, Review, CarStats } from '../../../core/models';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';

// Components
import {
  DateRangePickerComponent,
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';
import { ShareMenuComponent } from '../../../shared/components/share-menu/share-menu.component';
import { DynamicPriceDisplayComponent } from '../../../shared/components/dynamic-price-display/dynamic-price-display.component';

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
    ReviewCardComponent,
    ShareMenuComponent,
    TranslateModule,
  ],
  templateUrl: './car-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetailPage {
  private readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly walletService = inject(WalletService);
  private readonly metaService = inject(MetaService);
  private readonly fxService = inject(FxService);
  readonly authService = inject(AuthService);
  readonly pricingService = inject(DynamicPricingService);

  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly bookingInProgress = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');
  readonly currentPhotoIndex = signal(0);

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

  readonly totalPrice = computed(() => {
    const car = this.car();
    const days = this.daysCount();
    if (!car || days <= 0) return null;
    const pricePerDay =
      typeof car.price_per_day === 'string' ? parseFloat(car.price_per_day) : car.price_per_day;
    return isNaN(pricePerDay) ? null : days * pricePerDay;
  });

  readonly canBook = computed(() => !!this.totalPrice());

  nextPhoto(): void {
    this.currentPhotoIndex.update((index) => (index + 1) % this.allPhotos().length);
  }

  previousPhoto(): void {
    this.currentPhotoIndex.update(
      (index) => (index - 1 + this.allPhotos().length) % this.allPhotos().length,
    );
  }

  goToPhoto(index: number): void {
    this.currentPhotoIndex.set(index);
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

    if (!(await this.authService.isAuthenticated())) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.bookingInProgress.set(true);
    this.bookingError.set(null);

    try {
      const result = await this.bookingsService.createBookingWithValidation(
        car.id,
        new Date(from).toISOString(),
        new Date(to).toISOString(),
      );
      if (!result.success || !result.booking) {
        this.bookingError.set(result.error || 'No pudimos crear la reserva.');
        return;
      }
      this.router.navigate(['/bookings/detail-payment'], {
        queryParams: { bookingId: result.booking.id },
      });
    } catch (err) {
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
}
