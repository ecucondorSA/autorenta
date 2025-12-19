import {Component, OnInit, OnDestroy, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { Booking } from '../../../core/models';
import { ReferralBannerComponent } from '../../../shared/components/referral-banner/referral-banner.component';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'timeout';

@Component({
  selector: 'app-booking-success',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterModule, ReferralBannerComponent],
  templateUrl: './booking-success.page.html',
  styleUrls: ['./booking-success.page.scss'],
})
export class BookingSuccessPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);

  readonly bookingId = signal<string>('');
  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // ✅ Payment polling state
  readonly paymentStatus = signal<PaymentStatus>('pending');
  readonly pollProgress = signal<number>(0); // Progreso del polling (0-100)
  private pollingInterval: number | null = null;
  pollAttempts = 0; // public para template
  readonly MAX_POLL_ATTEMPTS = 40; // 2 minutos (3 segundos × 40) - public para template
  private readonly POLL_INTERVAL_MS = 3000; // 3 segundos

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.bookingId.set(id);
    this.loadBooking(id);

    // ✅ Iniciar polling si viene desde MercadoPago
    const fromMercadoPago = this.route.snapshot.queryParamMap.get('from_mp') === 'true';
    if (fromMercadoPago) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private async loadBooking(id: string): Promise<void> {
    try {
      const booking = await this.bookingsService.getBookingById(id);
      if (!booking) {
        throw new Error('Reserva no encontrada');
      }
      this.booking.set(booking);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * ✅ FIX P0.4: Polling de payment intent después de redirect de MercadoPago
   *
   * Problema:
   * - Usuario es redirigido desde MercadoPago a booking-success
   * - Webhook puede tardar segundos en procesarse
   * - Frontend no sabe si el pago fue aprobado o rechazado
   *
   * Solución:
   * - Polling cada 3 segundos por hasta 2 minutos
   * - Consulta estado del payment intent asociado al booking
   * - Actualiza UI en base al estado
   */
  private startPolling(): void {
    this.pollAttempts = 0;
    this.paymentStatus.set('pending');
    this.pollProgress.set(0);

    this.pollingInterval = window.setInterval(async () => {
      this.pollAttempts++;

      // Actualizar progreso (0-100%)
      const progress = Math.min(
        Math.round((this.pollAttempts / this.MAX_POLL_ATTEMPTS) * 100),
        100,
      );
      this.pollProgress.set(progress);

      try {
        // Obtener booking actualizado
        const booking = await this.bookingsService.getBookingById(this.bookingId());

        if (!booking) {
          console.warn('[BookingSuccess] Booking not found during polling');
          return;
        }

        // Actualizar booking signal
        this.booking.set(booking);

        // Verificar estado del booking
        if (booking.status === 'confirmed') {
          this.paymentStatus.set('completed');
          this.pollProgress.set(100);
          this.stopPolling();
          console.log(`✅ Payment confirmed after ${this.pollAttempts} attempts`);
          return;
        }

        if (booking.status === 'cancelled') {
          this.paymentStatus.set('failed');
          this.stopPolling();
          console.log(`❌ Payment failed after ${this.pollAttempts} attempts`);
          return;
        }

        // Si llegamos al máximo de intentos sin respuesta
        if (this.pollAttempts >= this.MAX_POLL_ATTEMPTS) {
          this.paymentStatus.set('timeout');
          this.stopPolling();
          console.warn(
            `⏰ Payment polling timeout after ${this.pollAttempts} attempts (${(this.pollAttempts * this.POLL_INTERVAL_MS) / 1000}s)`,
          );
        }
      } catch (err: unknown) {
        // No detener polling por errores de red transitorios
        console.warn(`[BookingSuccess] Polling error (attempt ${this.pollAttempts}):`, err);

        // Si falla después de varios intentos consecutivos, considerar timeout
        if (this.pollAttempts > 10 && this.pollAttempts % 5 === 0) {
          console.error(
            `⚠️ Multiple polling failures detected (${this.pollAttempts} attempts). Network issue?`,
          );
        }
      }
    }, this.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Retry manual del polling (para caso de timeout)
   */
  retryPolling(): void {
    console.log('🔄 Retrying payment polling...');
    this.startPolling();
  }

  /**
   * Reintentar pago - navega de vuelta al checkout
   */
  retryPayment(): void {
    const booking = this.booking();
    if (!booking) {
      console.error('[BookingSuccess] Cannot retry payment: booking not loaded');
      return;
    }

    console.log('🔄 Retrying payment for booking:', booking.id);

    // Navegar al wizard de checkout con el booking ID
    this.router.navigate(['/bookings', 'checkout', booking.id], {
      queryParams: { retry: 'true' },
    });
  }

  /**
   * Calcular tiempo estimado restante en segundos
   */
  getEstimatedTimeRemaining(): number {
    const remainingAttempts = this.MAX_POLL_ATTEMPTS - this.pollAttempts;
    return Math.max(0, Math.round((remainingAttempts * this.POLL_INTERVAL_MS) / 1000));
  }

  /**
   * Obtener nombre del vehículo con fallbacks robustos
   */
  getCarName(): string {
    const booking = this.booking();
    if (!booking) {
      console.warn('[BookingSuccess] Booking not loaded yet');
      return 'Vehículo';
    }

    // Prioridad 1: Usar car.brand, car.model, car.year
    if (booking.car && booking.car.brand && booking.car.model && booking.car.year) {
      return `${booking.car.brand} ${booking.car.model} ${booking.car.year}`;
    }

    // Prioridad 2: Usar car.title (si está disponible)
    if (booking.car && booking.car.title) {
      return booking.car.title;
    }

    // Prioridad 3: Usar campos de booking view (car_brand, car_model, car_year)
    if (booking.car_brand && booking.car_model && booking.car_year) {
      return `${booking.car_brand} ${booking.car_model} ${booking.car_year}`;
    }

    // Prioridad 4: Usar solo car_title del booking view
    if (booking.car_title) {
      return booking.car_title;
    }

    // Fallback final: mostrar car_id si existe
    if (booking.car_id) {
      console.warn(
        '[BookingSuccess] Car data not loaded for booking:',
        booking.id,
        'car_id:',
        booking.car_id,
      );
      return `Vehículo (${booking.car_id.slice(0, 8)}...)`;
    }

    return 'Vehículo';
  }

  /**
   * Obtener imagen del vehículo con fallbacks robustos
   */
  getCarImage(): string {
    const booking = this.booking();
    if (!booking) {
      return '/assets/images/car-placeholder.svg';
    }

    // Prioridad 1: Usar car.images
    if (booking.car && booking.car.images && booking.car.images.length > 0) {
      return booking.car.images[0];
    }

    // Prioridad 2: Usar car.photos
    if (booking.car && booking.car.photos && booking.car.photos.length > 0) {
      const firstPhoto = booking.car.photos[0];
      if (typeof firstPhoto === 'string') {
        return firstPhoto;
      }
      if (firstPhoto && typeof firstPhoto === 'object' && 'url' in firstPhoto) {
        return (firstPhoto as { url: string }).url;
      }
    }

    // Prioridad 3: Usar main_photo_url del booking view
    if (booking.main_photo_url) {
      return booking.main_photo_url;
    }

    return '/assets/images/car-placeholder.svg';
  }
}
