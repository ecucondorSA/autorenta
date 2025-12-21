import {Component, Input, computed,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../../core/models';
import { BookingsService } from '@core/services/bookings/bookings.service';

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

  constructor(private bookingsService: BookingsService) {}

  isExpired = computed(() => {
    return this.bookingsService.isExpired(this.booking);
  });

  /** Check if this is a P2P wallet booking */
  isWalletBooking = computed(() => {
    return this.booking?.payment_mode === 'wallet';
  });

  /** Check if booking is pending owner approval (P2P flow) */
  isPendingApproval = computed(() => {
    return this.booking?.status === 'pending' && this.isWalletBooking();
  });

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

    // P2P wallet: pending approval (amber, not error)
    if (this.isPendingApproval()) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }

    if (isReturnFlow) {
      return 'bg-warning-light/20 text-warning-strong';
    }

    // Traditional: expired payment
    if (status === 'pending' && this.isExpired()) {
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

    // P2P wallet: waiting for owner approval
    if (this.isPendingApproval()) {
      return 'Esperando aprobación';
    }

    if (isReturnFlow) {
      return 'En revisión';
    }

    // Traditional: expired payment (only for non-wallet bookings)
    if (status === 'pending' && this.isExpired() && !this.isWalletBooking()) {
      return 'Pago vencido';
    }

    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'Pendiente de pago';
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

    // P2P wallet: clock icon for pending approval
    if (this.isPendingApproval()) {
      return '⏳';
    }

    if (isReturnFlow) {
      return '🔍';
    }

    // Traditional: expired
    if (this.isExpired() && !this.isWalletBooking()) {
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
