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
  selector: 'app-owner-bookings-page',
  imports: [CommonModule, MoneyPipe, RouterLink, TranslateModule],
  templateUrl: './owner-bookings.page.html',
  styleUrl: './owner-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly processingAction = signal<string | null>(null);

  constructor(private readonly bookingsService: BookingsService) {}

  ngOnInit(): void {
    void this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // ✅ NUEVO: Obtener reservas de AUTOS DEL LOCADOR
      const items = await this.bookingsService.getOwnerBookings();
      this.bookings.set(items);
    } catch (err) {
      console.error('getOwnerBookings error', err);
      this.error.set('No pudimos cargar las reservas. Por favor intentá de nuevo más tarde.');
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
        return 'Pendiente de confirmación';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'En curso';
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
        return 'El locatario debe completar el pago.';
      case 'confirmed':
        return 'Coordiná la entrega del auto con el locatario.';
      case 'in_progress':
        return 'El auto está siendo utilizado.';
      case 'completed':
        return 'Alquiler finalizado correctamente.';
      case 'cancelled':
        return 'Esta reserva fue cancelada.';
      default:
        return null;
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

  statusIcon(booking: Booking): string {
    switch (booking.status) {
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'in_progress':
        return '🚗';
      case 'completed':
        return '🏁';
      case 'cancelled':
      case 'expired':
        return '❌';
      default:
        return 'ℹ️';
    }
  }

  // ✅ NUEVO: Acciones del locador
  canStartRental(booking: Booking): boolean {
    return booking.status === 'confirmed';
  }

  canCompleteRental(booking: Booking): boolean {
    return booking.status === 'in_progress';
  }

  canCancelBooking(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
  }

  async onStartRental(bookingId: string): Promise<void> {
    if (!confirm('¿Confirmar que el locatario recibió el auto?')) return;
    
    this.processingAction.set(bookingId);
    try {
      await this.bookingsService.updateBooking(bookingId, { status: 'in_progress' });
      await this.loadBookings();
      alert('✅ Alquiler iniciado correctamente');
    } catch (error) {
      console.error('Error starting rental:', error);
      alert('❌ Error al iniciar el alquiler');
    } finally {
      this.processingAction.set(null);
    }
  }

  async onCompleteRental(bookingId: string): Promise<void> {
    if (!confirm('¿Confirmar que el locatario devolvió el auto en buen estado?')) return;
    
    this.processingAction.set(bookingId);
    try {
      await this.bookingsService.updateBooking(bookingId, { status: 'completed' });
      await this.loadBookings();
      alert('✅ Alquiler finalizado correctamente');
    } catch (error) {
      console.error('Error completing rental:', error);
      alert('❌ Error al finalizar el alquiler');
    } finally {
      this.processingAction.set(null);
    }
  }

  async onCancelBooking(bookingId: string): Promise<void> {
    const shouldCancel = confirm('¿Estás seguro de cancelar esta reserva?');
    if (!shouldCancel) return;
    
    this.processingAction.set(bookingId);
    try {
      await this.bookingsService.cancelBooking(bookingId, false);
      await this.loadBookings();
      alert('✅ Reserva cancelada');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('❌ Error al cancelar la reserva');
    } finally {
      this.processingAction.set(null);
    }
  }

  getRenterInfo(booking: Booking): string {
    // TODO: Implementar obtención de info del locatario
    return booking.renter_id || 'Usuario';
  }
}
