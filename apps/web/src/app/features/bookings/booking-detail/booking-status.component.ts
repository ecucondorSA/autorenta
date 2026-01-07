import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component, Input, computed
} from '@angular/core';
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
      <div class="status-badge" [ngClass]="statusClass()">
        {{ statusIcon() }} {{ statusLabel() }}
        @if (showDeliveryCountdown()) {
          <span class="delivery-countdown">
            ⏱ {{ deliveryCountdown }}
          </span>
        }
      </div>
    }
    `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-weight: 500;
        font-size: 0.875rem;
      }
      .delivery-countdown {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding-left: 0.5rem;
        border-left: 1px solid rgba(0, 0, 0, 0.1);
        font-size: 0.75rem;
        font-weight: 600;
      }
    `,
  ],
})
export class BookingStatusComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() deliveryCountdown: string | null = null;

  constructor(private bookingsService: BookingsService) { }

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

    // Request flow: pending approval (amber, not error)
    if (this.isAwaitingOwnerApproval()) {
      return 'bg-amber-100 text-amber-700';
    }

    if (isReturnFlow) {
      return 'bg-warning-light/20 text-warning-strong';
    }

    // Traditional: expired payment (only when not in approval/request flow)
    if (status === 'pending' && this.isExpired() && !this.isAwaitingOwnerApproval()) {
      return 'bg-error-bg-hover text-error-strong';
    }

    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'bg-warning-bg-hover text-warning-strong';
      case 'confirmed':
        return 'bg-success-light/20 text-success-strong';
      case 'in_progress':
        if (isBeforeStart) {
          return 'bg-success-light/20 text-success-strong';
        }
        return 'bg-cta-default/20 text-cta-default';
      case 'pending_review':
        return 'bg-warning-light/20 text-warning-strong';
      case 'completed':
        return 'bg-surface-raised text-text-primary';
      case 'disputed':
        return 'bg-error-bg-hover text-error-strong';
      case 'cancelled':
      case 'expired':
        return 'bg-error-bg-hover text-error-strong';
      default:
        return 'bg-surface-raised text-text-primary';
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
