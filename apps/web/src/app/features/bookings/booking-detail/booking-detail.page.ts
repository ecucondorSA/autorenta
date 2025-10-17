import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Booking } from '../../../core/models';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './booking-detail.page.html',
  styleUrl: './booking-detail.page.css',
})
export class BookingDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);

  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  timeRemaining = signal<string | null>(null);

  private countdownInterval: number | null = null;

  // Computed properties
  statusClass = computed(() => {
    const status = this.booking()?.status;
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  });

  statusLabel = computed(() => {
    const status = this.booking()?.status;
    switch (status) {
      case 'pending':
        return 'Pendiente de pago';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En curso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Expirada';
      case 'no_show':
        return 'No show';
      default:
        return status ?? 'Desconocido';
    }
  });

  showPaymentActions = computed(() => this.booking()?.status === 'pending');
  showConfirmedActions = computed(() => this.booking()?.status === 'confirmed');
  showCompletedActions = computed(() => this.booking()?.status === 'completed');
  isExpired = computed(() => {
    const booking = this.booking();
    return booking ? this.bookingsService.isExpired(booking) : false;
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
    } catch (err) {
      console.error('Error loading booking:', err);
      this.error.set('Error al cargar la reserva');
    } finally {
      this.loading.set(false);
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

  async handlePayNow() {
    const booking = this.booking();
    if (!booking) return;

    try {
      // Create payment intent
      const intent = await this.paymentsService.createPaymentIntent(booking.id, 'mock');

      // Simulate payment (in production, redirect to payment provider)
      await this.paymentsService.simulateWebhook('mock', intent.id, 'approved');

      // Reload booking
      const updated = await this.bookingsService.getBookingById(booking.id);
      this.booking.set(updated);

      alert('¡Pago realizado exitosamente!');
    } catch (err) {
      console.error('Payment error:', err);
      alert('Error al procesar el pago');
    }
  }

  async handleCancel() {
    const booking = this.booking();
    if (!booking) return;

    if (!confirm('¿Estás seguro de que querés cancelar esta reserva?')) {
      return;
    }

    try {
      await this.bookingsService.cancelBooking(booking.id, 'Cancelled by user');

      // Reload booking
      const updated = await this.bookingsService.getBookingById(booking.id);
      this.booking.set(updated);
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Error al cancelar la reserva');
    }
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
}
