import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarsService } from '../../../core/services/cars.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { WalletService } from '../../../core/services/wallet.service';
import { Car, Review, CarStats, ReviewSummary } from '../../../core/models';
import {
  DateRangePickerComponent,
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';

@Component({
  standalone: true,
  selector: 'app-car-detail-page',
  imports: [CommonModule, RouterLink, DateRangePickerComponent, MoneyPipe, ReviewCardComponent, PaymentMethodSelectorComponent],
  templateUrl: './car-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetailPage implements OnInit {
  readonly car = signal<Car | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly bookingInProgress = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');
  readonly walletAmountToUse = signal<number>(0);
  readonly cardAmountToUse = signal<number>(0);
  readonly currentPhotoIndex = signal(0);

  // Reviews-related signals
  readonly reviews = signal<Review[]>([]);
  readonly carStats = signal<CarStats | null>(null);
  readonly reviewsLoading = signal(false);

  readonly firstPhoto = computed(() => {
    const car = this.car();
    return car?.photos?.[0] ?? null;
  });

  readonly allPhotos = computed(() => {
    const car = this.car();
    return car?.photos ?? car?.car_photos ?? [];
  });

  readonly currentPhoto = computed(() => {
    const photos = this.allPhotos();
    const index = this.currentPhotoIndex();
    return photos[index] ?? null;
  });

  readonly hasMultiplePhotos = computed(() => {
    return this.allPhotos().length > 1;
  });

  readonly totalPrice = computed(() => {
    const range = this.dateRange();
    const car = this.car();
    if (!range.from || !range.to || !car) return null;
    const start = new Date(range.from);
    const end = new Date(range.to);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff * car.price_per_day : null;
  });

  readonly canBook = computed(() => {
    const range = this.dateRange();
    const car = this.car();
    const total = this.totalPrice();
    return !!(range.from && range.to && car && total);
  });

  readonly daysCount = computed(() => {
    const range = this.dateRange();
    if (!range.from || !range.to) return 0;
    const start = new Date(range.from);
    const end = new Date(range.to);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  });

  readonly totalWithDeposit = computed(() => {
    const total = this.totalPrice();
    const car = this.car();
    if (!total) return null;
    const deposit = car?.deposit_required && car?.deposit_amount ? car.deposit_amount : 0;
    return total + deposit;
  });

  // Wallet state
  readonly availableBalance = signal<number>(0);
  readonly lockedBalance = signal<number>(0);

  constructor(
    private readonly carsService: CarsService,
    private readonly bookingsService: BookingsService,
    private readonly reviewsService: ReviewsService,
    private readonly walletService: WalletService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.loadCar();
    void this.loadWalletBalance();
  }

  async loadWalletBalance(): Promise<void> {
    try {
      const balance = await this.walletService.getBalance();
      this.availableBalance.set(balance.available_balance);
      this.lockedBalance.set(balance.locked_balance);
    } catch (error) {
      // Ignorar error si el usuario no está autenticado o no tiene wallet
      console.log('Could not load wallet balance:', error);
    }
  }

  async loadCar(): Promise<void> {
    this.loading.set(true);
    const carId = this.route.snapshot.paramMap.get('id');
    if (!carId) {
      this.error.set('Auto no encontrado');
      this.loading.set(false);
      return;
    }
    try {
      const car = await this.carsService.getCarById(carId);
      if (!car) {
        this.error.set('Auto no disponible');
      } else {
        this.car.set(car);
        // Load reviews for this car
        await this.loadReviews(carId);
      }
    } catch (err) {
      console.error(err);
      this.error.set('Error al cargar el auto');
    } finally {
      this.loading.set(false);
    }
  }

  async loadReviews(carId: string): Promise<void> {
    this.reviewsLoading.set(true);
    try {
      const [reviews, stats] = await Promise.all([
        this.reviewsService.getReviewsForCar(carId),
        this.reviewsService.getCarStats(carId),
      ]);

      this.reviews.set(reviews);
      this.carStats.set(stats);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      this.reviewsLoading.set(false);
    }
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
  }

  onPaymentMethodChange(event: {
    method: BookingPaymentMethod;
    walletAmount: number;
    cardAmount: number;
  }): void {
    this.selectedPaymentMethod.set(event.method);
    this.walletAmountToUse.set(event.walletAmount);
    this.cardAmountToUse.set(event.cardAmount);

    console.log('Payment method changed in car detail:', event);
  }

  nextPhoto(): void {
    const photos = this.allPhotos();
    if (photos.length > 1) {
      const currentIndex = this.currentPhotoIndex();
      const nextIndex = (currentIndex + 1) % photos.length;
      this.currentPhotoIndex.set(nextIndex);
    }
  }

  previousPhoto(): void {
    const photos = this.allPhotos();
    if (photos.length > 1) {
      const currentIndex = this.currentPhotoIndex();
      const previousIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
      this.currentPhotoIndex.set(previousIndex);
    }
  }

  goToPhoto(index: number): void {
    this.currentPhotoIndex.set(index);
  }

  async onBookClick(): Promise<void> {
    const car = this.car();
    const range = this.dateRange();

    if (!car || !range.from || !range.to) {
      this.bookingError.set('Por favor seleccioná las fechas de alquiler');
      return;
    }

    this.bookingInProgress.set(true);
    this.bookingError.set(null);

    try {
      // Convertir fechas a ISO string para la RPC function
      const startISO = new Date(range.from).toISOString();
      const endISO = new Date(range.to).toISOString();

      const booking = await this.bookingsService.requestBooking(car.id, startISO, endISO);

      // Redirigir a la página de reservas
      await this.router.navigate(['/bookings']);
    } catch (err: any) {
      console.error('Error creating booking', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', Object.keys(err));
      console.error('Error message:', err?.message);
      console.error('Error code:', err?.code);
      console.error('Error details:', err?.details);
      console.error('Error hint:', err?.hint);

      // Extraer mensaje de error de diferentes estructuras posibles
      let errorMessage = err?.message || err?.error?.message || err?.error || '';

      // Si es un objeto de Supabase, puede venir en err.message
      if (typeof errorMessage === 'string') {
        errorMessage = errorMessage.toLowerCase();
      }

      // Manejar errores específicos
      if (errorMessage.includes('no autenticado') || errorMessage.includes('not authenticated')) {
        this.bookingError.set('Necesitás iniciar sesión para reservar');
      } else if (errorMessage.includes('no disponible') || errorMessage.includes('not available')) {
        this.bookingError.set('Este auto no está disponible en las fechas seleccionadas');
      } else if (errorMessage.includes('propio auto') || errorMessage.includes('own car')) {
        this.bookingError.set('No podés reservar tu propio auto');
      } else {
        // Mostrar el error real para debugging
        this.bookingError.set(`Error: ${err?.message || JSON.stringify(err)}`);
      }
    } finally {
      this.bookingInProgress.set(false);
    }
  }
}
