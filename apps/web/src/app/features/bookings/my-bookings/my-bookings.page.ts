import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { formatDateRange } from '../../../shared/utils/date.utils';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [CommonModule, MoneyPipe, RouterLink, TranslateModule],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly bookingsService: BookingsService) {}

  ngOnInit(): void {
    void this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.bookingsService.getMyBookings();
      this.bookings.set(items);
    } catch (err) {
      console.error('getMyBookings error', err);
      this.error.set('No pudimos cargar tus reservas. Por favor intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  statusLabel(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return 'Pendiente de pago';
      case 'confirmed':
        return 'Pagada';
      case 'in_progress':
        return 'En uso';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Vencida';
      default:
        return booking.status;
    }
  }

  statusHint(booking: Booking): string | null {
    switch (booking.status) {
      case 'pending':
        return 'Completá el checkout para confirmar tu reserva.';
      case 'confirmed':
        return 'Todo listo. Coordiná el retiro con el anfitrión.';
      case 'completed':
        return 'Gracias por viajar con nosotros.';
      case 'cancelled':
        return 'Se canceló esta reserva. Podés generar una nueva cuando quieras.';
      default:
        return null;
    }
  }

  statusBannerClass(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return 'status-banner--pending';
      case 'confirmed':
      case 'in_progress':
        return 'status-banner--success';
      case 'completed':
        return 'status-banner--neutral';
      case 'cancelled':
      case 'expired':
        return 'status-banner--danger';
      default:
        return '';
    }
  }

  statusBadgeClass(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return 'badge-warning';
      case 'confirmed':
        return 'badge-success';
      case 'in_progress':
        return 'badge-info';
      case 'completed':
        return 'badge-neutral';
      case 'cancelled':
      case 'expired':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  statusCardClass(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return 'booking-card--pending';
      case 'confirmed':
      case 'in_progress':
        return 'booking-card--success';
      case 'completed':
        return 'booking-card--neutral';
      case 'cancelled':
      case 'expired':
        return 'booking-card--danger';
      default:
        return 'booking-card--neutral';
    }
  }

  statusIcon(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return '⏳';
      case 'confirmed':
      case 'in_progress':
        return '✅';
      case 'completed':
        return '🚗';
      case 'cancelled':
      case 'expired':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }

  // Actions
  completePay(bookingId: string): void {
    console.log('Navigating to payment for booking:', bookingId);
    // RouterLink handles navigation
  }

  cancelBooking(bookingId: string): void {
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
      console.log('Cancelling booking:', bookingId);
      // TODO: Call booking service to cancel
      // this.bookingsService.cancelBooking(bookingId).then(() => this.loadBookings());
    }
  }

  showInstructions(booking: Booking): void {
    console.log('Show instructions for:', booking.id);
    const location = booking.car_city && booking.car_province 
      ? `${booking.car_city}, ${booking.car_province}` 
      : 'Ver en detalle';
    // TODO: Open modal with instructions
    alert(`📋 Instrucciones para ${booking.car_title}\n\n1. Documentos: DNI y Licencia\n2. Ubicación: ${location}\n3. Hora: ${booking.start_at}\n\n[En próxima actualización: Modal completo con checklist]`);
  }

  openChat(booking: Booking): void {
    console.log('Open chat for:', booking.id);
    // TODO: Open chat component
    alert(`💬 Chat con anfitrión\n\n[En próxima actualización: Chat integrado]\n\nPor ahora, contacta al anfitrión desde el detalle de la reserva.`);
  }

  showMap(booking: Booking): void {
    console.log('Show map for:', booking.id);
    const location = booking.car_city && booking.car_province 
      ? `${booking.car_city}, ${booking.car_province}` 
      : 'No especificada';
    // TODO: Open map modal
    alert(`🗺️ Ubicación: ${location}\n\n[En próxima actualización: Mapa interactivo con navegación]`);
  }
}
