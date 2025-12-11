import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../../core/models';
import { BookingsService } from '../../../core/services/bookings.service';

/**
 * BookingStatusComponent
 *
 * This component is responsible for displaying the status of a booking.
 * It receives a `Booking` object as input and uses computed properties to determine the appropriate class, label, and icon for the status.
 */
@Component({
  selector: 'app-booking-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="booking" class="status-badge" [ngClass]="statusClass()">
      {{ statusIcon() }} {{ statusLabel() }}
    </div>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-weight: 500;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class BookingStatusComponent {
  @Input({ required: true }) booking!: Booking;

  constructor(private bookingsService: BookingsService) {}

  isExpired = computed(() => {
    return this.bookingsService.isExpired(this.booking);
  });

  statusClass = computed(() => {
    const status = this.booking?.status;
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
    if (status === 'pending' && this.isExpired()) {
      return 'Pago vencido';
    }
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'Pendiente de pago';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
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
    if (this.isExpired()) {
      return '⛔';
    }

    const status = this.booking?.status;
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'in_progress':
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
}
