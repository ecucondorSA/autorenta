import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { formatDateRange } from '../../../shared/utils/date.utils';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { DepositStatusBadgeComponent } from '../../../shared/components/deposit-status-badge/deposit-status-badge.component';

type BookingStatusFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [CommonModule, MoneyPipe, RouterLink, TranslateModule, DepositStatusBadgeComponent],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<BookingStatusFilter>('all');

  // Array tipado de filtros disponibles
  readonly statusFilters: readonly BookingStatusFilter[] = [
    'all',
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ] as const;

  // Computed: Filtered bookings based on selected status
  readonly filteredBookings = computed(() => {
    const allBookings = this.bookings();
    const filter = this.statusFilter();

    if (filter === 'all') {
      return allBookings;
    }

    return allBookings.filter((booking) => booking.status === filter);
  });

  // Computed: Count of bookings per status
  readonly statusCounts = computed(() => {
    const bookings = this.bookings();
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      in_progress: bookings.filter((b) => b.status === 'in_progress').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled' || b.status === 'expired').length,
    };
  });

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
    } catch {
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
  completePay(_bookingId: string): void {
    // RouterLink handles navigation
  }

  /**
   * ✅ SPRINT 3: Cancelar reserva con validación
   */
  async cancelBooking(bookingId: string): Promise<void> {
    const confirmed = confirm(
      '¿Estás seguro de cancelar esta reserva?\n\n' + 'Esta acción no se puede deshacer.',
    );

    if (!confirmed) return;

    this.loading.set(true);
    try {
      const result = await this.bookingsService.cancelBooking(bookingId);

      if (!result.success) {
        alert(`❌ Error: ${result.error}`);
        return;
      }

      alert('✅ Reserva cancelada exitosamente');
      await this.loadBookings(); // Recargar lista
    } catch {
      alert('❌ Error inesperado al cancelar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  showInstructions(booking: Booking): void {
    const location =
      booking.car_city && booking.car_province
        ? `${booking.car_city}, ${booking.car_province}`
        : 'Ver en detalle';
    // FIXME: Replace alert with modal component for check-in instructions
    alert(
      `📋 Instrucciones para ${booking.car_title}\n\n1. Documentos: DNI y Licencia\n2. Ubicación: ${location}\n3. Hora: ${booking.start_at}\n\n[En próxima actualización: Modal completo con checklist]`,
    );
  }

  /**
   * ✅ SPRINT 3: Abrir chat/contacto con propietario
   * Opción A: WhatsApp redirect (implementado)
   * Opción B: Chat in-app (TODO futuro)
   */
  async openChat(booking: Booking): Promise<void> {
    if (!booking.owner_id) {
      alert('❌ No se pudo obtener información del propietario');
      return;
    }

    this.loading.set(true);
    try {
      const contact = await this.bookingsService.getOwnerContact(booking.owner_id);

      if (!contact.success || !contact.phone) {
        // Fallback: mostrar email
        alert(
          `📧 Contacto del propietario:\n\n` +
            `${contact.name || 'Propietario'}\n` +
            `Email: ${contact.email || 'No disponible'}\n\n` +
            `Puedes contactarlo por email para coordinar el retiro.`,
        );
        return;
      }

      // Si tiene teléfono, abrir WhatsApp
      const carInfo = `${booking.car_title || 'auto'}`;
      const dates = this.rangeLabel(booking);
      const message = encodeURIComponent(
        `Hola! Te contacto por la reserva del ${carInfo} para ${dates}.`,
      );

      const whatsappUrl = `https://wa.me/${contact.phone}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    } catch {
      alert('❌ Error al obtener información de contacto');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * ✅ SPRINT 3: Mostrar mapa de ubicación
   * Usa Google Maps con la ubicación del auto
   */
  showMap(booking: Booking): void {
    const { car_city, car_province } = booking;

    // Show location based on available data
    if (car_city && car_province) {
      // Open Google Maps search with city/province
      const location = `${car_city}, ${car_province}`;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
      window.open(mapsUrl, '_blank');
    } else {
      alert('🗺️ Ubicación no disponible para esta reserva.');
    }
  }

  /**
   * Cambia el filtro de estado
   */
  setStatusFilter(filter: BookingStatusFilter): void {
    this.statusFilter.set(filter);
  }

  /**
   * Obtiene la etiqueta del filtro
   */
  getFilterLabel(filter: BookingStatusFilter): string {
    switch (filter) {
      case 'all':
        return 'Todas';
      case 'pending':
        return 'Pendientes';
      case 'confirmed':
        return 'Confirmadas';
      case 'in_progress':
        return 'En curso';
      case 'completed':
        return 'Finalizadas';
      case 'cancelled':
        return 'Canceladas';
      default:
        return filter;
    }
  }
}
