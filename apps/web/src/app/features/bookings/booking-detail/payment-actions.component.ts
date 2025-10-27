
import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Booking } from '../../../core/models';
import { BookingsService } from '../../../core/services/bookings.service';
import { PaymentsService } from '../../../core/services/payments.service';

/**
 * PaymentActionsComponent
 *
 * This component is responsible for handling all payment-related actions and information for a booking.
 * It receives a `Booking` object and the time remaining for payment as inputs.
 * It manages the UI for payment status, payment actions (pay now, cancel), and payment summary.
 */
@Component({
  selector: 'app-payment-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Payment Status Summary -->
    <div class="payment-summary-card card-premium rounded-2xl shadow-soft" [ngClass]="paymentSummaryToneClass()">
      <div class="payment-summary-card__status-row">
        <div class="payment-summary-card__badge">
          <!-- Status will be handled by BookingStatusComponent in the parent -->
        </div>
        <span class="payment-summary-card__id" *ngIf="booking.id">ID: {{ booking.id }}</span>
      </div>

      <div class="payment-summary-card__total">
        <p class="payment-summary-card__total-label">Total</p>
        <p class="payment-summary-card__total-amount" *ngIf="booking?.breakdown?.total_cents">
          {{ formatCurrency(booking!.breakdown!.total_cents, booking!.currency) }}
        </p>
        <p class="payment-summary-card__total-amount" *ngIf="!booking?.breakdown?.total_cents">--</p>
      </div>

      <p *ngIf="paymentSummaryMessage()" class="payment-summary-card__message">
        {{ paymentSummaryMessage() }}
      </p>

      <div *ngIf="booking?.status === 'pending' && timeRemaining && !isExpired()" class="payment-summary-card__countdown">
        ⏱️ Pagá dentro de {{ timeRemaining }}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="card-premium rounded-2xl p-4 sm:p-6 shadow-soft">
      <h3 class="h5 mb-4">Acciones</h3>

      <!-- Pending Actions -->
      <div *ngIf="showPaymentActions()" class="flex flex-col sm:flex-row gap-3">
        <button
          (click)="handlePayNow()"
          class="btn-primary flex-1 px-6 py-3 font-semibold shadow-soft"
        >
          💳 Pagar ahora
        </button>
        <button
          (click)="handleCancel()"
          class="btn-secondary flex-1 px-6 py-3 font-semibold"
        >
          ❌ Cancelar reserva
        </button>
      </div>
    </div>
  `
})
export class PaymentActionsComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() timeRemaining: string | null = null;

  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService); // ✅ Inyectar PaymentService
  private readonly router = inject(Router);
  
  protected isProcessing = signal(false); // ✅ Estado de carga

  isExpired = computed(() => {
    return this.bookingsService.isExpired(this.booking);
  });

  paymentSummaryToneClass = computed(() => {
    const status = this.booking?.status;
    if (this.isExpired()) {
      return 'payment-summary-card--danger';
    }

    switch (status) {
      case 'pending':
        return 'payment-summary-card--warning';
      case 'confirmed':
      case 'in_progress':
        return 'payment-summary-card--success';
      case 'completed':
        return 'payment-summary-card--neutral';
      case 'cancelled':
      case 'expired':
        return 'payment-summary-card--danger';
      default:
        return 'payment-summary-card--neutral';
    }
  });

  paymentSummaryMessage = computed(() => {
    if (!this.booking) {
      return '';
    }

    if (this.isExpired()) {
      return 'La reserva caducó porque el pago no se completó a tiempo.';
    }

    switch (this.booking.status) {
      case 'pending':
        return this.timeRemaining
          ? `Completá el pago para confirmar tu reserva. Queda ${this.timeRemaining}.`
          : 'Completá el pago para confirmar tu reserva.';
      case 'confirmed':
        return this.booking.paid_at
          ? `Pago confirmado el ${this.formatDateTime(this.booking.paid_at)}. Coordiná el retiro con el anfitrión.`
          : 'Pago confirmado. Coordiná el retiro con el anfitrión.';
      case 'in_progress':
        return 'El auto está en uso. Conservá el comprobante y cualquier comunicación con el anfitrión.';
      case 'completed':
        return 'Reserva finalizada. Gracias por viajar con AutoRenta.';
      case 'cancelled':
        return 'Reserva cancelada. Podés generar una nueva cuando quieras.';
      case 'expired':
        return 'La reserva caducó porque el pago no se completó a tiempo.';
      default:
        return '';
    }
  });

  showPaymentActions = computed(() => this.booking?.status === 'pending');

  /**
   * ✅ FIX P0.3: Usar PaymentService centralizado en lugar de código duplicado
   */
  async handlePayNow() {
    if (!this.booking || this.isProcessing()) return;

    this.isProcessing.set(true);

    try {
      const result = await this.paymentsService.processPayment(this.booking.id);

      if (result.success) {
        alert('¡Pago procesado exitosamente!');
        // Recargar booking para actualizar estado
        window.location.reload();
      } else {
        throw new Error(result.error || 'Error al procesar el pago');
      }
    } catch (err) {
      console.error('Error en handlePayNow:', err);
      alert('Error al procesar el pago: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      this.isProcessing.set(false);
    }
  }

  async handleCancel() {
    if (!this.booking) return;

    if (!confirm('¿Estás seguro de que querés cancelar esta reserva?')) {
      return;
    }

    try {
      const result = await this.bookingsService.cancelBooking(this.booking.id);
      if (!result.success) {
        alert(`Error al cancelar la reserva: ${result.error}`);
        return;
      }
      // Reloading should be handled by the parent component
      window.location.reload();
    } catch (err) {
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
