import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TranslateModule } from '@ngx-translate/core';
import { Booking } from '../../../core/models';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { ToastService } from '@core/services/ui/toast.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDateRange } from '../../../shared/utils/date.utils';

type BookingStatusFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// Section configuration for collapsible groups
interface BookingSection {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
  priority: number;
  statuses: string[];
  accentClass: string;
}

@Component({
  standalone: true,
  selector: 'app-my-bookings-page',
  imports: [
    CommonModule,
    MoneyPipe,
    RouterLink,
    ScrollingModule,
    TranslateModule,
    IconComponent,
  ],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<BookingStatusFilter>('all');

  // Collapsible sections state
  readonly sections = signal<BookingSection[]>([
    {
      id: 'action-required',
      title: 'Requieren Acción',
      icon: '⚠️',
      expanded: true, // Always expanded by default
      priority: 1,
      statuses: ['pending'],
      accentClass: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
    },
    {
      id: 'active',
      title: 'Activas',
      icon: '✅',
      expanded: true,
      priority: 2,
      statuses: ['confirmed', 'in_progress'],
      accentClass: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
    },
    {
      id: 'history',
      title: 'Historial',
      icon: '📋',
      expanded: false, // Collapsed by default
      priority: 3,
      statuses: ['completed', 'cancelled', 'expired'],
      accentClass: 'border-l-gray-400 bg-gray-50 dark:bg-gray-900/20',
    },
  ]);

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

  // Computed: Bookings grouped by section (using effective status)
  readonly bookingsBySection = computed(() => {
    const allBookings = this.bookings();
    const sectionList = this.sections();

    return sectionList.map((section) => ({
      ...section,
      bookings: allBookings.filter((b) => section.statuses.includes(this.getEffectiveStatus(b))),
      count: allBookings.filter((b) => section.statuses.includes(this.getEffectiveStatus(b))).length,
    }));
  });

  // Computed: Count of bookings per status (using effective status)
  readonly statusCounts = computed(() => {
    const bookings = this.bookings();
    return {
      all: bookings.length,
      pending: bookings.filter((b) => this.getEffectiveStatus(b) === 'pending').length,
      confirmed: bookings.filter((b) => this.getEffectiveStatus(b) === 'confirmed').length,
      in_progress: bookings.filter((b) => this.getEffectiveStatus(b) === 'in_progress').length,
      completed: bookings.filter((b) => this.getEffectiveStatus(b) === 'completed').length,
      expired: bookings.filter((b) => this.getEffectiveStatus(b) === 'expired').length,
      cancelled: bookings.filter((b) => this.getEffectiveStatus(b) === 'cancelled').length,
    };
  });

  // Computed: Summary stats for dashboard (using effective status)
  readonly dashboardStats = computed(() => {
    const counts = this.statusCounts();
    return {
      actionRequired: counts.pending, // Only truly pending (can still be paid)
      active: counts.confirmed + counts.in_progress,
      history: counts.completed + counts.cancelled + counts.expired, // Include expired
      total: counts.all,
    };
  });

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly router: Router,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit(): void {
    void this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { bookings } = await this.bookingsService.getMyBookings();
      this.bookings.set(bookings);
    } catch {
      this.error.set('No pudimos cargar tus reservas. Por favor intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }

  rangeLabel(booking: Booking): string {
    return formatDateRange(booking.start_at, booking.end_at);
  }

  /**
   * Determina el estado efectivo de una reserva.
   * Si está pendiente pero la fecha de inicio ya pasó, se considera "vencida".
   */
  getEffectiveStatus(booking: Booking): string {
    if (booking.status === 'pending' && this.isStartDatePassed(booking)) {
      return 'expired';
    }
    return booking.status;
  }

  /**
   * Verifica si la fecha de inicio de la reserva ya pasó
   */
  isStartDatePassed(booking: Booking): boolean {
    if (!booking.start_at) return false;
    const startDate = new Date(booking.start_at);
    const now = new Date();
    return startDate < now;
  }

  statusLabel(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        // P2P flow: wallet bookings are awaiting owner approval, not payment
        return this.isWalletBooking(booking) ? 'Esperando aprobación' : 'Pendiente de pago';
      case 'confirmed':
        return 'Aprobada';
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

  /**
   * Check if booking uses wallet payment mode (P2P flow)
   */
  isWalletBooking(booking: Booking): boolean {
    return booking.payment_mode === 'wallet';
  }

  statusHint(booking: Booking): string | null {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        // P2P flow: wallet bookings are awaiting owner approval
        return this.isWalletBooking(booking)
          ? 'El propietario está revisando tu solicitud. Te notificaremos cuando responda.'
          : 'Completá el checkout para confirmar tu reserva.';
      case 'confirmed':
        return 'Tu reserva fue aprobada. Coordiná el check-in con el propietario.';
      case 'completed':
        return 'Gracias por viajar con nosotros.';
      case 'cancelled':
        return 'Se canceló esta reserva. Podés generar una nueva cuando quieras.';
      case 'expired':
        return this.isWalletBooking(booking)
          ? 'La solicitud expiró sin respuesta del propietario.'
          : 'La fecha de alquiler ya pasó sin completar el pago.';
      default:
        return null;
    }
  }

  statusBannerClass(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
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
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
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
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
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
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        return '⏳';
      case 'confirmed':
      case 'in_progress':
        return '✅';
      case 'completed':
        return '🚗';
      case 'cancelled':
      case 'expired':
        return '❌';
      default:
        return 'ℹ️';
    }
  }

  /** Short status label for compact cards */
  statusLabelShort(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        // P2P flow: wallet bookings show "En revisión" instead of "Pendiente"
        return this.isWalletBooking(booking) ? 'En revisión' : 'Pendiente';
      case 'confirmed':
        return 'Aprobada';
      case 'in_progress':
        return 'En uso';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Vencida';
      default:
        return effectiveStatus;
    }
  }

  /** Border color class for compact cards */
  statusBorderClass(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        return 'border-l-amber-500';
      case 'confirmed':
      case 'in_progress':
        return 'border-l-green-500';
      case 'completed':
        return 'border-l-gray-400';
      case 'cancelled':
      case 'expired':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  }

  /** Status icon background class */
  statusIconBgClass(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/50';
      case 'confirmed':
      case 'in_progress':
        return 'bg-green-100 dark:bg-green-900/50';
      case 'completed':
        return 'bg-gray-100 dark:bg-gray-800';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 dark:bg-red-900/50';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  }

  /** Compact badge class with colors */
  statusBadgeCompactClass(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500';
    }
  }

  /**
   * Check if booking can still be paid (pending AND start date not passed)
   * For P2P (wallet) bookings, funds are already locked so no payment action needed
   */
  canCompletePay(booking: Booking): boolean {
    // Wallet bookings have already locked funds - no payment action needed
    if (this.isWalletBooking(booking)) {
      return false;
    }
    return booking.status === 'pending' && !this.isStartDatePassed(booking);
  }

  /**
   * Check if booking is pending owner approval (P2P flow)
   */
  isPendingApproval(booking: Booking): boolean {
    return booking.status === 'pending' && this.isWalletBooking(booking) && !this.isStartDatePassed(booking);
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
        this.toastService.error('Error', result.error || 'No se pudo cancelar la reserva');
        return;
      }

      this.toastService.success('Reserva cancelada', 'La reserva ha sido cancelada exitosamente.');
      await this.loadBookings(); // Recargar lista
    } catch {
      this.toastService.error('Error', 'Ocurrió un error inesperado al cancelar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  showInstructions(booking: Booking): void {
    const location =
      booking.car_city && booking.car_province
        ? `${booking.car_city}, ${booking.car_province}`
        : 'Ver en detalle';
    
    // Usar Toast info en lugar de alert
    this.toastService.info(
      'Instrucciones de Retiro',
      `Ubicación: ${location}. Recordá llevar tu DNI y Licencia de Conducir.`, 
      8000
    );
  }

  /**
   * ✅ SPRINT 3: Abrir chat interno
   * Navega al sistema de mensajería de la plataforma
   */
  openChat(booking: Booking): void {
    if (!booking.owner_id) {
      this.toastService.error('Error', 'No se pudo obtener información del propietario');
      return;
    }

    // Navegar al chat interno pasando el contexto
    this.router.navigate(['/messages/chat'], {
      queryParams: {
        bookingId: booking.id,
        userId: booking.owner_id,
        userName: booking.car?.owner?.full_name || 'Propietario', // Intentar obtener nombre real
      },
    });
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
      this.toastService.warning('Ubicación no disponible', 'No tenemos la ubicación exacta para esta reserva.');
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

  /**
   * Toggle section expanded/collapsed state
   */
  toggleSection(sectionId: string): void {
    const currentSections = this.sections();
    const updatedSections = currentSections.map((section) =>
      section.id === sectionId ? { ...section, expanded: !section.expanded } : section,
    );
    this.sections.set(updatedSections);
  }

  /**
   * Expand all sections
   */
  expandAllSections(): void {
    const currentSections = this.sections();
    this.sections.set(currentSections.map((s) => ({ ...s, expanded: true })));
  }

  /**
   * Check if booking is from history (older than 3 months)
   */
  isOldBooking(booking: Booking): boolean {
    if (!booking.end_at) return false;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return new Date(booking.end_at) < threeMonthsAgo;
  }
}