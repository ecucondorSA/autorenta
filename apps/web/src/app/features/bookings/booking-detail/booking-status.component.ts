import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { Booking } from '../../../core/models';

/**
 * BookingStatusComponent
 *
 * This component is responsible for displaying the status of a booking.
 * It receives a `Booking` object as input and uses computed properties to determine the appropriate class, label, and icon for the status.
 */
@Component({
  selector: 'app-booking-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (booking) {
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase" [ngClass]="statusClass()">
        <span class="w-2 h-2 rounded-full" [ngClass]="dotClass()"></span>
        {{ statusLabel() }}
      </div>
    }
  `,
  styles: [],
})
export class BookingStatusComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() deliveryCountdown: string | null = null;
  @Input() awaitingRenterCheckIn: boolean = false;
  @Input() hasRenterCheckIn: boolean = false;
  @Input() isOwner: boolean = false;

  constructor(private bookingsService: BookingsService) {}

  isExpired = computed(() => {
    return this.bookingsService.isExpired(this.booking);
  });

  /** Check if this is a P2P wallet booking */
  isWalletBooking = computed(() => {
    return this.booking?.payment_mode === 'wallet';
  });

  /**
   * Request/approval flow: a pending booking that already chose a guarantee mode
   * (card hold or wallet lock) is waiting for owner approval.
   */
  isAwaitingOwnerApproval = computed(() => {
    return this.booking?.status === 'pending' && !!this.booking?.payment_mode;
  });

  /** Legacy alias (kept for template compatibility if referenced elsewhere) */
  isPendingApproval = computed(() => this.isAwaitingOwnerApproval());

  statusClass = computed(() => {
    const status = this.booking?.status;
    const startAt = this.booking?.start_at ? new Date(this.booking.start_at).getTime() : null;
    const isBeforeStart =
      status === 'in_progress' && startAt && !Number.isNaN(startAt) && Date.now() < startAt;
    const isReturnFlow =
      !!this.booking?.returned_at ||
      this.booking?.completion_status === 'returned' ||
      this.booking?.completion_status === 'pending_owner' ||
      this.booking?.completion_status === 'pending_renter' ||
      this.booking?.completion_status === 'pending_both';

    // Check-in bilateral completado: mostrar como "En curso"
    if (this.hasRenterCheckIn && status === 'confirmed') {
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    }

    // Bilateral check-in: owner delivered, renter needs to confirm
    if (this.awaitingRenterCheckIn && status === 'confirmed') {
      // Owner ve verde (completó su parte), Renter ve ámbar (acción pendiente)
      return this.isOwner
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-amber-50 text-amber-700 border border-amber-200';
    }

    // Request flow: pending approval (amber, not error)
    if (this.isAwaitingOwnerApproval()) {
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    }

    if (isReturnFlow) {
      return 'bg-orange-50 text-orange-700 border border-orange-200';
    }

    // Traditional: expired payment (only when not in approval/request flow)
    if (status === 'pending' && this.isExpired() && !this.isAwaitingOwnerApproval()) {
      return 'bg-red-50 text-red-700 border border-red-200';
    }

    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'in_progress':
        if (isBeforeStart) {
          return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        }
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'pending_review':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'completed':
        return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
      case 'disputed':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'cancelled':
      case 'expired':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    }
  });

  dotClass = computed(() => {
    const status = this.booking?.status;
    const startAt = this.booking?.start_at ? new Date(this.booking.start_at).getTime() : null;
    const isBeforeStart =
      status === 'in_progress' && startAt && !Number.isNaN(startAt) && Date.now() < startAt;
    const isReturnFlow =
      !!this.booking?.returned_at ||
      this.booking?.completion_status === 'returned' ||
      this.booking?.completion_status === 'pending_owner' ||
      this.booking?.completion_status === 'pending_renter' ||
      this.booking?.completion_status === 'pending_both';

    // Check-in bilateral completado: mostrar como "En curso"
    if (this.hasRenterCheckIn && status === 'confirmed') return 'bg-blue-500 animate-pulse';

    // Bilateral check-in: owner delivered, renter needs to confirm
    if (this.awaitingRenterCheckIn && status === 'confirmed') {
      return this.isOwner ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse';
    }

    if (this.isAwaitingOwnerApproval()) return 'bg-amber-500';
    if (isReturnFlow) return 'bg-orange-500';
    if (status === 'pending' && this.isExpired()) return 'bg-red-500';

    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'bg-amber-500';
      case 'confirmed':
        return 'bg-emerald-500';
      case 'in_progress':
        return isBeforeStart ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse';
      case 'pending_review':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-neutral-400';
      case 'disputed':
      case 'cancelled':
      case 'expired':
        return 'bg-red-500';
      default:
        return 'bg-neutral-400';
    }
  });

  statusLabel = computed(() => {
    const status = this.booking?.status;
    const startAt = this.booking?.start_at ? new Date(this.booking.start_at).getTime() : null;
    const isBeforeStart =
      status === 'in_progress' && startAt && !Number.isNaN(startAt) && Date.now() < startAt;
    const isReturnFlow =
      !!this.booking?.returned_at ||
      this.booking?.completion_status === 'returned' ||
      this.booking?.completion_status === 'pending_owner' ||
      this.booking?.completion_status === 'pending_renter' ||
      this.booking?.completion_status === 'pending_both';

    // Check-in bilateral completado: mostrar como "En curso"
    if (this.hasRenterCheckIn && status === 'confirmed') {
      return 'En curso';
    }

    // Bilateral check-in: owner delivered, renter needs to confirm
    if (this.awaitingRenterCheckIn && status === 'confirmed') {
      // Owner ve "Vehículo entregado", Renter ve "Confirmar recepción"
      return this.isOwner ? 'Vehículo entregado' : 'Confirmar recepción';
    }

    // Request flow: waiting for owner approval
    if (this.isAwaitingOwnerApproval()) {
      return 'Esperando aprobación';
    }

    if (isReturnFlow) {
      return 'En revisión';
    }

    // Traditional: expired payment
    if (status === 'pending' && this.isExpired() && !this.isAwaitingOwnerApproval()) {
      return 'Pago vencido';
    }

    switch (status) {
      case 'pending':
        return 'Pendiente de pago';
      case 'pending_payment':
        return 'Pago en proceso';
      case 'confirmed':
        return 'Aprobada';
      case 'in_progress':
        if (isBeforeStart) {
          return 'Check-in pendiente';
        }
        return 'En curso';
      case 'pending_review':
        return 'En revisión';
      case 'completed':
        return 'Completada';
      case 'disputed':
        return 'En disputa';
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

  statusIcon = computed(() => {
    const status = this.booking?.status;
    const startAt = this.booking?.start_at ? new Date(this.booking.start_at).getTime() : null;
    const isBeforeStart =
      status === 'in_progress' && startAt && !Number.isNaN(startAt) && Date.now() < startAt;
    const isReturnFlow =
      !!this.booking?.returned_at ||
      this.booking?.completion_status === 'returned' ||
      this.booking?.completion_status === 'pending_owner' ||
      this.booking?.completion_status === 'pending_renter' ||
      this.booking?.completion_status === 'pending_both';

    // Request flow: clock icon for pending approval
    if (this.isAwaitingOwnerApproval()) {
      return '⏳';
    }

    if (isReturnFlow) {
      return '🔍';
    }

    // Traditional: expired
    if (this.isExpired() && !this.isAwaitingOwnerApproval()) {
      return '⛔';
    }

    switch (status) {
      case 'pending':
      case 'pending_payment':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'in_progress':
        if (isBeforeStart) {
          return '✅';
        }
        return '🚗';
      case 'pending_review':
        return '🔍';
      case 'completed':
        return '🏁';
      case 'disputed':
        return '⚖️';
      case 'cancelled':
        return '⚠️';
      case 'expired':
        return '⛔';
      default:
        return 'ℹ️';
    }
  });

  showDeliveryCountdown = computed(() => {
    const startAt = this.booking?.start_at ? new Date(this.booking.start_at).getTime() : null;
    const isBeforeStart =
      this.booking?.status === 'in_progress' &&
      startAt &&
      !Number.isNaN(startAt) &&
      Date.now() < startAt;

    return this.booking?.status === 'in_progress' && !!this.deliveryCountdown && !isBeforeStart;
  });
}
