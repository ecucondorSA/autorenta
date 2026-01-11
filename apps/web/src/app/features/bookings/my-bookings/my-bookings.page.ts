import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingRealtimeService } from '@core/services/bookings/booking-realtime.service';
import { AuthService } from '@core/services/auth/auth.service';
import { ToastService } from '@core/services/ui/toast.service';
// UI 2026 Directives
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { SpringCollapseDirective } from '@shared/directives/spring-collapse.directive';
import { StaggerEnterDirective } from '@shared/directives/stagger-enter.directive';
import { Booking } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDateRange } from '../../../shared/utils/date.utils';

type BookingStatusFilter =
  | 'all'
  | 'pending'
  | 'pending_review'
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

// Status configuration object - centralizes all status-related UI properties
interface StatusConfig {
  label: string;
  labelShort: string;
  hint: string;
  icon: string;
  filterLabel: string;
  bannerClass: string;
  badgeClass: string;
  cardClass: string;
  borderClass: string;
  iconBgClass: string;
  badgeCompactClass: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pendiente de pago',
    labelShort: 'Pendiente',
    hint: 'Completá el checkout para confirmar tu reserva.',
    icon: '⏳',
    filterLabel: 'Pendientes',
    bannerClass: 'status-banner--pending',
    badgeClass: 'badge-warning',
    cardClass: 'booking-card--pending',
    borderClass: 'border-l-warning-500',
    iconBgClass: 'bg-warning-bg',
    badgeCompactClass: 'bg-warning-bg text-warning-text',
  },
  pending_review: {
    label: 'En revisión',
    labelShort: 'En revisión',
    hint: 'El auto fue devuelto. Confirmá la devolución para liberar los fondos.',
    icon: '🔍',
    filterLabel: 'En revisión',
    bannerClass: 'status-banner--info',
    badgeClass: 'badge-info',
    cardClass: 'booking-card--info',
    borderClass: 'border-l-info-500',
    iconBgClass: 'bg-info-bg',
    badgeCompactClass: 'bg-info-bg text-info-text',
  },
  confirmed: {
    label: 'Aprobada',
    labelShort: 'Aprobada',
    hint: 'Tu reserva fue aprobada. Coordiná el check-in con el propietario.',
    icon: '✅',
    filterLabel: 'Confirmadas',
    bannerClass: 'status-banner--success',
    badgeClass: 'badge-success',
    cardClass: 'booking-card--success',
    borderClass: 'border-l-success-500',
    iconBgClass: 'bg-success-bg',
    badgeCompactClass: 'bg-success-bg text-success-text',
  },
  in_progress: {
    label: 'En uso',
    labelShort: 'En uso',
    hint: 'Disfrutá tu viaje. Recordá devolver el auto en las condiciones acordadas.',
    icon: '✅',
    filterLabel: 'En curso',
    bannerClass: 'status-banner--success',
    badgeClass: 'badge-info',
    cardClass: 'booking-card--success',
    borderClass: 'border-l-success-500',
    iconBgClass: 'bg-success-bg',
    badgeCompactClass: 'bg-info-bg text-info-text',
  },
  completed: {
    label: 'Finalizada',
    labelShort: 'Finalizada',
    hint: 'Gracias por viajar con nosotros.',
    icon: '🚗',
    filterLabel: 'Finalizadas',
    bannerClass: 'status-banner--neutral',
    badgeClass: 'badge-neutral',
    cardClass: 'booking-card--neutral',
    borderClass: 'border-l-border-default',
    iconBgClass: 'bg-surface-secondary',
    badgeCompactClass: 'bg-surface-secondary text-text-secondary',
  },
  cancelled: {
    label: 'Cancelada',
    labelShort: 'Cancelada',
    hint: 'Se canceló esta reserva. Podés generar una nueva cuando quieras.',
    icon: '❌',
    filterLabel: 'Canceladas',
    bannerClass: 'status-banner--danger',
    badgeClass: 'badge-danger',
    cardClass: 'booking-card--danger',
    borderClass: 'border-l-error-500',
    iconBgClass: 'bg-error-bg',
    badgeCompactClass: 'bg-error-bg text-error-text',
  },
  expired: {
    label: 'Vencida',
    labelShort: 'Vencida',
    hint: 'La fecha de alquiler ya pasó sin completar el pago.',
    icon: '❌',
    filterLabel: 'Vencidas',
    bannerClass: 'status-banner--danger',
    badgeClass: 'badge-danger',
    cardClass: 'booking-card--danger',
    borderClass: 'border-l-error-500',
    iconBgClass: 'bg-error-bg',
    badgeCompactClass: 'bg-error-bg text-error-text',
  },
} as const;

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  label: 'Desconocido',
  labelShort: 'Desconocido',
  hint: '',
  icon: 'ℹ️',
  filterLabel: 'Otros',
  bannerClass: '',
  badgeClass: 'badge-neutral',
  cardClass: 'booking-card--neutral',
  borderClass: 'border-l-border-default',
  iconBgClass: 'bg-surface-secondary',
  badgeCompactClass: 'bg-surface-secondary text-text-secondary',
};

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
    // UI 2026 Directives
    HoverLiftDirective,
    PressScaleDirective,
    StaggerEnterDirective,
    SpringCollapseDirective,
  ],
  templateUrl: './my-bookings.page.html',
  styleUrl: './my-bookings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsPage implements OnInit, OnDestroy {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<BookingStatusFilter>('all');
  private currentUserId: string | null = null;

  // Collapsible sections state
  readonly sections = signal<BookingSection[]>([
    {
      id: 'action-required',
      title: 'Requieren Acción',
      icon: '⚠️',
      expanded: true, // Always expanded by default
      priority: 1,
      statuses: ['pending', 'pending_review'],
      accentClass: 'section-accent section-accent--pending',
    },
    {
      id: 'active',
      title: 'Activas',
      icon: '✅',
      expanded: true,
      priority: 2,
      statuses: ['confirmed', 'in_progress'],
      accentClass: 'section-accent section-accent--active',
    },
    {
      id: 'history',
      title: 'Historial',
      icon: '📋',
      expanded: false, // Collapsed by default
      priority: 3,
      statuses: ['completed', 'cancelled', 'expired'],
      accentClass: 'section-accent section-accent--history',
    },
  ]);

  // Array tipado de filtros disponibles
  readonly statusFilters: readonly BookingStatusFilter[] = [
    'all',
    'pending',
    'pending_review',
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

  // Computed: Bookings grouped by section (using effective status) - OPTIMIZED: single iteration
  readonly bookingsBySection = computed(() => {
    const allBookings = this.bookings();
    const filter = this.statusFilter();
    const sectionList = this.sections();

    // Pre-create section buckets
    const sectionBuckets = new Map<string, Booking[]>();
    for (const section of sectionList) {
      sectionBuckets.set(section.id, []);
    }

    // Single pass through bookings
    for (const booking of allBookings) {
      const effectiveStatus = this.getEffectiveStatus(booking);

      // Apply filter if not 'all'
      if (filter !== 'all' && effectiveStatus !== filter) continue;

      // Find matching section and add booking
      for (const section of sectionList) {
        if (section.statuses.includes(effectiveStatus)) {
          sectionBuckets.get(section.id)!.push(booking);
          break;
        }
      }
    }

    // Build result
    return sectionList.map((section) => {
      const bookings = sectionBuckets.get(section.id) ?? [];
      return {
        ...section,
        bookings,
        count: bookings.length,
      };
    });
  });

  // Computed: Count of bookings per status (using effective status) - OPTIMIZED: single iteration
  readonly statusCounts = computed(() => {
    const bookings = this.bookings();
    const counts = {
      all: bookings.length,
      pending: 0,
      pending_review: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      expired: 0,
      cancelled: 0,
    };

    for (const booking of bookings) {
      const status = this.getEffectiveStatus(booking);
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    }

    return counts;
  });

  // Computed: Summary stats for dashboard (using effective status)
  readonly dashboardStats = computed(() => {
    const counts = this.statusCounts();
    return {
      actionRequired: counts.pending + counts.pending_review, // Pending payment or review
      active: counts.confirmed + counts.in_progress,
      history: counts.completed + counts.cancelled + counts.expired, // Include expired
      total: counts.all,
    };
  });

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly router: Router,
    private readonly toastService: ToastService,
    private readonly bookingRealtimeService: BookingRealtimeService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    void this.loadBookings();
    void this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    this.bookingRealtimeService.unsubscribeUserBookings();
  }

  private async setupRealtimeSubscription(): Promise<void> {
    const session = await this.authService.ensureSession();
    this.currentUserId = session?.user?.id ?? null;
    if (this.currentUserId) {
      this.bookingRealtimeService.subscribeToUserBookings(this.currentUserId, 'renter', {
        onBookingsChange: () => {
          void this.loadBookings();
        },
      });
    }
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
    if (booking.status === 'pending_payment' && this.isStartDatePassed(booking)) {
      return 'expired';
    }
    if (booking.status === 'pending_payment') {
      return 'pending';
    }
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

  /**
   * Get status configuration for a booking (base config from STATUS_CONFIG)
   */
  private getStatusConfig(booking: Booking): StatusConfig {
    const effectiveStatus = this.getEffectiveStatus(booking);
    return STATUS_CONFIG[effectiveStatus] ?? DEFAULT_STATUS_CONFIG;
  }

  statusLabel(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        // P2P flow: wallet bookings are awaiting owner approval, not payment
        if (booking.status === 'pending_payment') {
          return 'Pago en proceso';
        }
        return this.isWalletBooking(booking) ? 'Esperando aprobación' : 'Pendiente de pago';
      case 'pending_review':
        return 'En revisión';
      case 'confirmed':
        return 'Aprobada';
      case 'in_progress':
        // FIX: Consider completion_status for detailed status
        if (
          booking.completion_status === 'pending_renter' ||
          booking.completion_status === 'pending_both'
        ) {
          return 'Confirmar devolución';
        }
        if (
          booking.completion_status === 'pending_owner' ||
          booking.completion_status === 'returned'
        ) {
          return 'Esperando al propietario';
        }
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
        if (booking.status === 'pending_payment') {
          return 'Estamos confirmando tu pago. Si hubo un problema, podés intentar nuevamente.';
        }
        return this.isWalletBooking(booking)
          ? 'El propietario está revisando tu solicitud. Te notificaremos cuando responda.'
          : 'Completá el checkout para confirmar tu reserva.';
      case 'pending_review':
        return 'El auto fue devuelto. Confirmá la devolución para liberar los fondos.';
      case 'confirmed':
        return 'Tu reserva fue aprobada. Coordiná el check-in con el propietario.';
      case 'in_progress':
        // FIX: Consider completion_status for detailed hint
        if (
          booking.completion_status === 'pending_renter' ||
          booking.completion_status === 'pending_both'
        ) {
          return 'El propietario ya confirmó. Ingresá al detalle para confirmar la devolución.';
        }
        if (
          booking.completion_status === 'pending_owner' ||
          booking.completion_status === 'returned'
        ) {
          return 'Tu confirmación fue registrada. El propietario está verificando el vehículo.';
        }
        return 'Disfrutá tu viaje. Recordá devolver el auto en las condiciones acordadas.';
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
    return this.getStatusConfig(booking).bannerClass;
  }

  statusBadgeClass(booking: Booking): string {
    return this.getStatusConfig(booking).badgeClass;
  }

  statusCardClass(booking: Booking): string {
    return this.getStatusConfig(booking).cardClass;
  }

  statusIcon(booking: Booking): string {
    return this.getStatusConfig(booking).icon;
  }

  /** Short status label for compact cards */
  statusLabelShort(booking: Booking): string {
    const effectiveStatus = this.getEffectiveStatus(booking);
    switch (effectiveStatus) {
      case 'pending':
        // P2P flow: wallet bookings show "Esperando" instead of "Pendiente"
        return this.isWalletBooking(booking) ? 'Esperando' : 'Pendiente';
      case 'pending_review':
        return 'En revisión';
      case 'confirmed':
        return 'Aprobada';
      case 'in_progress':
        // FIX: Consider completion_status for short label
        if (
          booking.completion_status === 'pending_renter' ||
          booking.completion_status === 'pending_both'
        ) {
          return 'Confirmar';
        }
        if (
          booking.completion_status === 'pending_owner' ||
          booking.completion_status === 'returned'
        ) {
          return 'Verificando';
        }
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
    return this.getStatusConfig(booking).borderClass;
  }

  /** Status icon background class */
  statusIconBgClass(booking: Booking): string {
    return this.getStatusConfig(booking).iconBgClass;
  }

  /** Compact badge class with colors */
  statusBadgeCompactClass(booking: Booking): string {
    return this.getStatusConfig(booking).badgeCompactClass;
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
    const pendingStatus = booking.status === 'pending' || booking.status === 'pending_payment';
    return pendingStatus && !this.isStartDatePassed(booking);
  }

  /**
   * Check if booking is pending owner approval (P2P flow)
   */
  isPendingApproval(booking: Booking): boolean {
    return (
      booking.status === 'pending' &&
      this.isWalletBooking(booking) &&
      !this.isStartDatePassed(booking)
    );
  }

  /**
   * Check if booking is pending review (renter needs to confirm return)
   */
  isPendingReview(booking: Booking): boolean {
    return booking.status === 'pending_review';
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
      8000,
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
      this.toastService.warning(
        'Ubicación no disponible',
        'No tenemos la ubicación exacta para esta reserva.',
      );
    }
  }

  /**
   * Cambia el filtro de estado
   */
  setStatusFilter(filter: BookingStatusFilter): void {
    this.statusFilter.set(filter);
  }

  /**
   * Focus a specific section and clear filters.
   */
  focusSection(sectionId: string): void {
    this.statusFilter.set('all');
    const updatedSections = this.sections().map((section) => ({
      ...section,
      expanded: section.id === sectionId,
    }));
    this.sections.set(updatedSections);
  }

  /**
   * Obtiene la etiqueta del filtro
   */
  getFilterLabel(filter: BookingStatusFilter): string {
    if (filter === 'all') return 'Todas';
    return STATUS_CONFIG[filter]?.filterLabel ?? filter;
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
