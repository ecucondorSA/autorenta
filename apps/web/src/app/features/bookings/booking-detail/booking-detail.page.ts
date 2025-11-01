import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../../../core/models';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { BookingInspection } from '../../../core/models/fgo-v1-1.model';
import { OwnerConfirmationComponent } from '../../../shared/components/owner-confirmation/owner-confirmation.component';
import { RenterConfirmationComponent } from '../../../shared/components/renter-confirmation/renter-confirmation.component';
import { BookingChatComponent } from '../../../shared/components/booking-chat/booking-chat.component';
import { ConfirmAndReleaseResponse } from '../../../core/services/booking-confirmation.service';
import { MetaService } from '../../../core/services/meta.service';
import { BookingStatusComponent } from './booking-status.component';
import { ReviewManagementComponent } from './review-management.component';

/**
 * BookingDetailPage
 *
 * This component acts as a container for the booking detail view. It is responsible for:
 * - Fetching the booking data from the server.
 * - Passing the booking data to child components that handle specific aspects of the view.
 * - Handling general page-level concerns like loading and error states.
 *
 * The component has been refactored to delegate responsibilities to smaller, more focused child components:
 * - app-booking-status: Displays the current status of the booking.
 * - app-review-management: Manages the creation and display of reviews.
 */
@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OwnerConfirmationComponent,
    RenterConfirmationComponent,
    BookingChatComponent,
    TranslateModule,
    BookingStatusComponent,
    ReviewManagementComponent,
  ],
  templateUrl: './booking-detail.page.html',
  styleUrl: './booking-detail.page.css',
})
export class BookingDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);
  private readonly metaService = inject(MetaService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly fgoService = inject(FgoV1_1Service);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  timeRemaining = signal<string | null>(null);

  // Exchange rate signals
  exchangeRate = signal<number | null>(null);
  totalInARS = signal<number | null>(null);
  loadingRate = signal(false);

  // FGO signals
  inspections = signal<BookingInspection[]>([]);

  private countdownInterval: number | null = null;

  // Computed properties
  isExpired = computed(() => {
    const booking = this.booking();
    return booking ? this.bookingsService.isExpired(booking) : false;
  });

  showConfirmedActions = computed(() => this.booking()?.status === 'confirmed');

  // Confirmations - show if booking is in "returned" status
  showConfirmationSection = computed(() => {
    const booking = this.booking();
    return (
      booking?.completion_status === 'returned' ||
      booking?.completion_status === 'pending_owner' ||
      booking?.completion_status === 'pending_renter' ||
      booking?.completion_status === 'pending_both' ||
      booking?.completion_status === 'funds_released'
    );
  });

  isOwner = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    if (!booking || !currentUser) return false;

    // Need to check car owner_id - will load from car data
    return this.carOwnerId() === currentUser.id;
  });

  isRenter = computed(() => {
    const booking = this.booking();
    const currentUser = this.authService.session$()?.user;
    return booking?.renter_id === currentUser?.id;
  });

  // Car owner ID and name (loaded separately)
  carOwnerId = signal<string | null>(null);
  carOwnerName = signal<string>('el anfitrión');

  // 🆕 FGO v1.1: Computed properties para inspecciones
  readonly canUploadInspection = computed(() => {
    const booking = this.booking();
    return booking?.status === 'in_progress' || booking?.status === 'completed';
  });

  readonly hasCheckIn = computed(() => {
    return this.inspections().some((i: BookingInspection) => i.stage === 'check_in' && i.signedAt);
  });

  readonly hasCheckOut = computed(() => {
    return this.inspections().some((i: BookingInspection) => i.stage === 'check_out' && i.signedAt);
  });

  readonly hasClaim = computed(() => {
    // TODO: Implementar cuando se agregue tabla de claims en DB
    return false;
  });

  async ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('id');
    if (!bookingId) {
      this.error.set('ID de reserva inválido');
      this.loading.set(false);
      return;
    }

    try {
      const booking = await this.bookingsService.getBookingById(bookingId);
      if (!booking) {
        this.error.set('Reserva no encontrada');
        this.loading.set(false);
        return;
      }

      this.booking.set(booking);
      this.startCountdown();

      // Update SEO meta tags (private page - noindex)
      this.metaService.updateBookingDetailMeta(booking.id);

      // Load exchange rate for ARS conversion
      await this.loadExchangeRate();

      // Load car owner ID for confirmation logic
      await this.loadCarOwner();

      // Load FGO inspections
      await this.loadInspections();
    } catch (err) {
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadExchangeRate(): Promise<void> {
    const booking = this.booking();
    if (!booking || !booking.breakdown?.total_cents) return;

    try {
      this.loadingRate.set(true);
      const rate = await this.exchangeRateService.getPlatformRate();
      this.exchangeRate.set(rate);

      // Convert total USD to ARS
      const totalUSD = booking.breakdown.total_cents / 100; // Convertir centavos a dólares
      const totalARS = await this.exchangeRateService.convertUsdToArs(totalUSD);
      this.totalInARS.set(totalARS);
    } catch (error) {
      // No fallar si no se puede obtener la tasa, solo no mostrar conversión
    } finally {
      this.loadingRate.set(false);
    }
  }

  private async loadCarOwner(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const { data: car } = await this.bookingsService['supabase']
        .from('cars')
        .select('owner_id, owner:profiles!cars_owner_id_fkey(id, full_name)')
        .eq('id', booking.car_id)
        .single();

      if (car) {
        this.carOwnerId.set(car.owner_id);
        const owner = car.owner as { full_name?: string } | undefined;
        const ownerFullName = owner?.full_name || 'el anfitrión';
        this.carOwnerName.set(ownerFullName);
      }
    } catch (error) {}
  }

  private async loadInspections(): Promise<void> {
    const booking = this.booking();
    if (!booking) return;

    try {
      const inspections = await firstValueFrom(this.fgoService.getInspections(booking.id));
      this.inspections.set(inspections);
    } catch (error) {
      // Non-blocking error, inspections are optional
    }
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  private startCountdown() {
    const booking = this.booking();
    if (!booking || booking.status !== 'pending' || !booking.expires_at) {
      return;
    }

    this.updateCountdown();

    // Update every second
    this.countdownInterval = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown() {
    const booking = this.booking();
    if (!booking) return;

    const remaining = this.bookingsService.getTimeUntilExpiration(booking);
    if (remaining === null || remaining === 0) {
      this.timeRemaining.set(null);
      this.stopCountdown();
      return;
    }

    this.timeRemaining.set(this.bookingsService.formatTimeRemaining(remaining));
  }

  formatCurrency(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private getTotalCents(booking: Booking): number {
    if (booking.breakdown?.total_cents) {
      return booking.breakdown.total_cents;
    }
    return Math.round((booking.total_amount ?? 0) * 100);
  }

  private formatUsd(amount: number): string {
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Confirmation handlers
  async handleConfirmationSuccess(result: ConfirmAndReleaseResponse): Promise<void> {
    // Reload booking to get updated status
    const bookingId = this.booking()?.id;
    if (bookingId) {
      const updated = await this.bookingsService.getBookingById(bookingId);
      this.booking.set(updated);
    }

    // Show success message
    if (result.funds_released) {
      alert(`✅ ${result.message}\n\n¡Los fondos fueron liberados automáticamente!`);
    } else {
      alert(`✅ ${result.message}`);
    }
  }

  handleConfirmationError(errorMessage: string): void {
    alert(`❌ Error: ${errorMessage}`);
  }
}
