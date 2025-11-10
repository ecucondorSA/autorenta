import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { Booking } from '../../../core/models';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'timeout';

@Component({
  selector: 'app-booking-success',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
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
  private pollingInterval: number | null = null;
  pollAttempts = 0; // public para template
  private readonly MAX_POLL_ATTEMPTS = 40; // 2 minutos (3 segundos × 40)
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

    this.pollingInterval = window.setInterval(async () => {
      this.pollAttempts++;

      try {
        // Obtener booking actualizado
        const booking = await this.bookingsService.getBookingById(this.bookingId());

        if (!booking) {
          return;
        }

        // Actualizar booking signal
        this.booking.set(booking);

        // Verificar estado del booking
        if (booking.status === 'confirmed') {
          this.paymentStatus.set('completed');
          this.stopPolling();
          return;
        }

        if (booking.status === 'cancelled') {
          this.paymentStatus.set('failed');
          this.stopPolling();
          return;
        }

        // Si llegamos al máximo de intentos sin respuesta
        if (this.pollAttempts >= this.MAX_POLL_ATTEMPTS) {
          this.paymentStatus.set('timeout');
          this.stopPolling();
        }
      } catch (err: unknown) {
        // No detener polling por errores de red transitorios
      }
    }, this.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  getCarName(): string {
    const booking = this.booking();
    if (!booking) {
      console.warn('[BookingSuccess] Booking not loaded yet');
      return 'Vehículo';
    }

    // Car is now loaded with booking
    if (booking.car && booking.car.brand && booking.car.model && booking.car.year) {
      return `${booking.car.brand} ${booking.car.model} ${booking.car.year}`;
    }

    // Fallback: mostrar car_id si existe
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

  getCarImage(): string {
    const booking = this.booking();
    if (!booking || !booking.car) {
      return '/assets/images/car-placeholder.png';
    }

    // Return first image if available
    if (booking.car.images && booking.car.images.length > 0) {
      return booking.car.images[0];
    }

    return '/assets/images/car-placeholder.png';
  }
}
