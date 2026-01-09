import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking } from '@core/models';
import { DepositStatusBadgeComponent } from '@shared/components/deposit-status-badge/deposit-status-badge.component';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  carOutline,
  chatbubbleEllipsesOutline,
  checkmarkDoneOutline,
  flagOutline,
  receiptOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons';

/**
 * Booking Actions Card Component
 *
 * Displays the sticky action card in the booking detail right column.
 * Contains all contextual action buttons based on booking state and user role.
 *
 * Extracted from BookingDetailPage to reduce complexity and improve maintainability.
 */
@Component({
  selector: 'app-booking-actions-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IonIcon, DepositStatusBadgeComponent],
  template: `
    <div class="card-premium p-0 overflow-hidden">
      <div class="p-6">
        <h3 class="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Gestión</h3>

        <!-- Contact Button (Primary Communication) -->
        <button
          (click)="chatOpen.emit()"
          class="w-full flex items-center justify-center gap-3 p-4 mb-4 rounded-2xl bg-cta-default text-cta-text font-bold text-lg hover:bg-cta-hover active:scale-[0.98] transition-all shadow-md"
        >
          <ion-icon name="chatbubble-ellipses-outline" class="text-2xl"></ion-icon>
          Chat con {{ isOwner() ? 'Viajero' : 'Anfitrión' }}
        </button>

        <!-- Contextual Action Buttons -->
        <div class="space-y-3">
          <!-- Primary Payment/Guarantee Action (Viajero) -->
          @if (showPaymentAction()) {
            <a
              [routerLink]="['/bookings', booking()?.id, 'detail-payment']"
              class="w-full flex items-center justify-between p-4 rounded-xl bg-cta-default text-cta-text hover:bg-cta-hover transition-all shadow-lg transform hover:scale-[1.02] active:scale-95 border-2 border-white/20"
            >
              <span class="font-bold flex items-center gap-2">
                <ion-icon name="shield-checkmark-outline"></ion-icon>
                Garantizar Reserva Ahora
              </span>
              <ion-icon name="arrow-forward"></ion-icon>
            </a>
            <p class="text-[10px] text-center text-text-muted mt-2">
              Debes garantizar la reserva para que el anfitrión pueda aprobarla.
            </p>
          }

          <!-- Waiting for Contribution (Anfitrión) -->
          @if (showWaitingContribution()) {
            <div
              class="w-full flex items-center gap-3 p-4 rounded-xl bg-warning-50 text-warning-700 border border-warning-200"
            >
              <ion-icon name="time-outline" class="text-2xl text-warning-500"></ion-icon>
              <span class="font-medium">Esperando contribución del viajero</span>
            </div>
          }

          <!-- Approve/Reject (Owner) -->
          @if (canApproveBooking()) {
            <div class="grid grid-cols-2 gap-3">
              <button
                (click)="rejectBooking.emit()"
                class="px-4 py-3 rounded-xl border border-border-default text-text-secondary font-semibold hover:bg-surface-secondary transition-colors"
              >
                Rechazar
              </button>
              <button
                (click)="approveBooking.emit()"
                class="px-4 py-3 rounded-xl bg-success-600 text-white font-semibold hover:bg-success-700 transition-colors shadow-sm"
              >
                Aprobar
              </button>
            </div>
          }

          <!-- Check-in Action (Renter) -->
          @if (canPerformCheckIn()) {
            <a
              [routerLink]="['/bookings', booking()?.id, 'check-in']"
              class="w-full flex items-center justify-between p-4 rounded-xl bg-success-50 text-success-900 hover:bg-success-100 transition-colors border border-success-200"
            >
              <span class="font-semibold flex items-center gap-2">
                <ion-icon name="checkmark-done-outline"></ion-icon>
                Iniciar Check-in
              </span>
              <ion-icon name="arrow-forward"></ion-icon>
            </a>
          }

          <!-- Check-out Action (Renter) -->
          @if (canPerformCheckOut()) {
            <a
              [routerLink]="['/bookings', booking()?.id, 'check-out']"
              class="w-full flex items-center justify-between p-4 rounded-xl bg-info-50 text-info-900 hover:bg-info-100 transition-colors border border-info-200"
            >
              <span class="font-semibold flex items-center gap-2">
                <ion-icon name="flag-outline"></ion-icon>
                Finalizar Viaje
              </span>
              <ion-icon name="arrow-forward"></ion-icon>
            </a>
          }

          <!-- Owner Check-in Action -->
          @if (canOwnerCheckIn()) {
            <a
              [routerLink]="['/bookings', booking()?.id, 'owner-check-in']"
              class="w-full flex items-center justify-between p-4 rounded-xl bg-warning-50 text-warning-900 hover:bg-warning-100 transition-colors border border-warning-200"
            >
              <span class="font-semibold flex items-center gap-2">
                <ion-icon name="car-outline"></ion-icon>
                Iniciar Entrega del Vehículo
              </span>
              <ion-icon name="arrow-forward"></ion-icon>
            </a>
          }

          <!-- Owner Check-out Action -->
          @if (canOwnerCheckOut()) {
            <a
              [routerLink]="['/bookings', booking()?.id, 'owner-check-out']"
              class="w-full flex items-center justify-between p-4 rounded-xl bg-info-50 text-info-900 hover:bg-info-100 transition-colors border border-info-200"
            >
              <span class="font-semibold flex items-center gap-2">
                <ion-icon name="checkmark-done-outline"></ion-icon>
                Confirmar Devolución
              </span>
              <ion-icon name="arrow-forward"></ion-icon>
            </a>
          }

          <!-- Cancel Button -->
          @if (showCancelButton()) {
            <button
              (click)="handleCancel()"
              class="w-full py-3 text-text-muted hover:text-error-600 text-sm font-medium transition-colors"
            >
              Cancelar Reserva
            </button>
          }
        </div>
      </div>

      <!-- Financial Summary Mini -->
      <div class="bg-surface-secondary border-t border-border-default p-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-text-secondary">Total</span>
          <span class="text-xl font-bold text-text-primary">
            {{ booking()?.total_amount | currency: booking()?.currency : 'symbol' : '1.0-0' }}
          </span>
        </div>
        @if (booking()?.deposit_amount_cents) {
          <div class="flex justify-between items-center text-sm">
            <span class="text-text-secondary flex items-center gap-1">
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              Garantía
            </span>
            <div class="flex items-center gap-2">
              <span class="font-medium text-text-primary">
                {{
                  (booking()?.deposit_amount_cents ?? 0) / 100
                    | currency: booking()?.currency : 'symbol' : '1.0-0'
                }}
              </span>
              @if (booking()?.deposit_status) {
                <app-deposit-status-badge
                  [status]="booking()!.deposit_status!"
                ></app-deposit-status-badge>
              }
            </div>
          </div>
        }

        <!-- View Payment Details Button -->
        <a
          [routerLink]="['/bookings', booking()?.id, 'detail-payment']"
          class="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border-default text-text-secondary font-semibold hover:bg-surface-raised hover:text-text-primary transition-all text-sm group"
        >
          <ion-icon
            name="receipt-outline"
            class="text-lg group-hover:scale-110 transition-transform"
          ></ion-icon>
          Ver detalle de pago
        </a>
      </div>
    </div>
  `,
})
export class BookingActionsCardComponent {
  // Inputs
  readonly booking = input.required<Booking>();
  readonly isOwner = input.required<boolean>();
  readonly isRenter = input.required<boolean>();
  readonly needsPayment = input.required<boolean>();
  readonly canApproveBooking = input.required<boolean>();
  readonly canPerformCheckIn = input.required<boolean>();
  readonly canPerformCheckOut = input.required<boolean>();
  readonly canOwnerCheckIn = input.required<boolean>();
  readonly canOwnerCheckOut = input.required<boolean>();
  readonly canOwnerCancel = input.required<boolean>();

  // Outputs
  readonly chatOpen = output<void>();
  readonly cancelBooking = output<string>();
  readonly ownerCancelBooking = output<void>();
  readonly approveBooking = output<void>();
  readonly rejectBooking = output<void>();

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      shieldCheckmarkOutline,
      arrowForward,
      timeOutline,
      checkmarkDoneOutline,
      flagOutline,
      carOutline,
      receiptOutline,
    });
  }

  // Computed helpers
  readonly showPaymentAction = computed(() => {
    const booking = this.booking();
    return (
      (this.needsPayment() || booking?.status === 'pending_payment') && this.isRenter()
    );
  });

  readonly showWaitingContribution = computed(() => {
    return this.booking()?.status === 'pending_payment' && this.isOwner();
  });

  readonly showCancelButton = computed(() => {
    const booking = this.booking();
    return (
      this.canOwnerCancel() || (this.isRenter() && booking?.status === 'pending')
    );
  });

  handleCancel(): void {
    if (this.isOwner()) {
      this.ownerCancelBooking.emit();
    } else {
      const bookingId = this.booking()?.id;
      if (bookingId) {
        this.cancelBooking.emit(bookingId);
      }
    }
  }
}
