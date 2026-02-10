import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// Components
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingInitiationService } from '@core/services/bookings/booking-initiation.service';
import { CarsService } from '@core/services/cars/cars.service';
import type { Car } from '@core/models';
import { DateRangePickerComponent } from '../../../shared/components/date-range-picker/date-range-picker.component';
import {
  PaymentMethodButtonsComponent,
  type PaymentMethod,
} from '../../../shared/components/payment-method-buttons/payment-method-buttons.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CarChatComponent } from '../../messages/components/car-chat.component';

// Services

@Component({
  standalone: true,
  selector: 'app-quick-book-page',
  imports: [
    DateRangePickerComponent,
    CarChatComponent,
    PaymentMethodButtonsComponent,
    TranslateModule,
    MoneyPipe,
  ],
  templateUrl: './quick-book.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickBookPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carsService = inject(CarsService);
  private bookingInitiation = inject(BookingInitiationService);
  private authService = inject(AuthService);
  private analytics = inject(AnalyticsService);

  readonly carId = computed(() => this.route.snapshot.paramMap.get('id'));
  readonly car = signal<Car | null>(null);

  readonly dateRange = signal<{ from: string | null; to: string | null }>({ from: null, to: null });
  readonly selectedPaymentMethod = signal<PaymentMethod>('credit_card');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = this.carId();
    if (id) {
      void this.loadCar(id);
    }
  }

  private async loadCar(id: string): Promise<void> {
    try {
      const car = await this.carsService.getCarById(id);
      this.car.set(car);
    } catch (err) {
      console.error('Error loading car for quick-book:', err);
      this.error.set('No se pudo cargar el auto');
    }
  }

  onRangeChange(range: { from: string | null; to: string | null }): void {
    this.dateRange.set(range);
  }

  onContactOwner(): void {
    const car = this.car();
    if (!car) return;
    const session = this.authService.session$();
    if (!session?.user) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    void this.router.navigate(['/messages/chat'], {
      queryParams: {
        carId: car.id,
        userId: car.owner_id,
        carName: car.title ?? `${car.brand} ${car.model}`,
        userName: car.owner?.full_name ?? 'Anfitrión',
      },
    });
  }

  onPaymentMethodSelected(method: PaymentMethod): void {
    this.selectedPaymentMethod.set(method);
  }

  async onBookNow(): Promise<void> {
    const car = this.car();
    const { from, to } = this.dateRange();
    if (!car || !from || !to) {
      this.error.set('Seleccioná las fechas antes de continuar');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const startIso = new Date(from).toISOString();
      const endIso = new Date(to).toISOString();

      const result = await this.bookingInitiation.startFromCar(car.id, startIso, endIso);

      if (!result.success) {
        if (result.error === 'not_authenticated') {
          // login flow handled by service
          return;
        }
        this.error.set(result.error || 'No pudimos crear la reserva');
        return;
      }

      const bookingId = result.booking?.id ?? null;
      if (!bookingId) {
        this.error.set('No se obtuvo bookingId');
        return;
      }

      // Track conversion
      this.analytics.trackEvent('booking_completed', {
        car_id: car.id,
        booking_id: bookingId,
        payment_method: this.selectedPaymentMethod(),
      });

      // Navigate to payment page and pre-select payment method
      await this.router.navigate(['/bookings/detail-payment'], {
        queryParams: { bookingId, paymentMethod: this.selectedPaymentMethod() },
      });
    } catch (err) {
      console.error('QuickBook error:', err);
      this.error.set(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      this.loading.set(false);
    }
  }

  // Helper: obtiene URL de la primera foto o placeholder
  getCarPhotoUrl(): string {
    const car = this.car();
    if (!car) return '/assets/placeholder-car.jpg';

    // Check for photos array (may come as 'photos' or 'car_photos' from different queries)
    const photos =
      car.photos || ('car_photos' in car ? (car.car_photos as typeof car.photos) : undefined);
    if (photos && photos.length > 0 && photos[0].url) {
      return photos[0].url;
    }

    return '/assets/placeholder-car.jpg';
  }
}
