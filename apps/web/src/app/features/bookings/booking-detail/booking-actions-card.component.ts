import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking } from '@core/models';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  carOutline,
  chatbubbleEllipsesOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  documentTextOutline,
  flagOutline,
  helpCircleOutline,
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
  imports: [CommonModule, RouterLink, IonIcon],
  template: `
    <div class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
      <!-- Primary CTA Section -->
      <div class="p-5">
        <!-- SINGLE PRIMARY CTA based on state -->
        @if (showPaymentAction()) {
          <!-- Garantizar Reserva -->
          <a
            [routerLink]="['/bookings', booking().id, 'request']"
            class="block w-full py-4 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-center hover:bg-neutral-800 transition-all"
          >
            Garantizar Reserva
          </a>
          <p class="text-xs text-neutral-500 text-center mt-2">
            Requerido para que el anfitrión apruebe
          </p>
        } @else if (awaitingRenterCheckIn() && isRenter()) {
          <!-- Renter: Confirmar Recepción (owner ya entregó) -->
          <a
            [routerLink]="['/bookings', booking().id, 'check-in']"
            class="block w-full py-4 px-6 rounded-xl bg-amber-500 text-white font-semibold text-center hover:bg-amber-600 transition-all"
          >
            Confirmar Recepción
          </a>
          <p class="text-xs text-neutral-500 text-center mt-2">
            El propietario ya entregó el vehículo
          </p>
        } @else if (awaitingRenterCheckIn() && isOwner()) {
          <!-- Owner: Esperando que renter confirme recepción -->
          <div class="py-4 px-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p class="text-sm font-medium text-emerald-700">Vehículo entregado</p>
            <p class="text-xs text-emerald-600 mt-1">
              Esperando que el viajero confirme la recepción
            </p>
          </div>
        } @else if (canPerformCheckOut()) {
          <!-- Finalizar Viaje -->
          <a
            [routerLink]="['/bookings', booking().id, 'check-out']"
            class="block w-full py-4 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-center hover:bg-neutral-800 transition-all"
          >
            Finalizar Viaje
          </a>
          <p class="text-xs text-neutral-500 text-center mt-2">
            Devolver el vehículo al propietario
          </p>
        } @else if (canPerformCheckIn()) {
          <!-- Iniciar Check-in -->
          <a
            [routerLink]="['/bookings', booking().id, 'check-in']"
            class="block w-full py-4 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-center hover:bg-neutral-800 transition-all"
          >
            Iniciar Check-in
          </a>
          <p class="text-xs text-neutral-500 text-center mt-2">
            Recibir el vehículo del propietario
          </p>
        } @else if (canOwnerCheckIn()) {
          <!-- Owner: Entregar Vehículo -->
          <a
            [routerLink]="['/bookings', booking().id, 'owner-check-in']"
            class="block w-full py-4 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-center hover:bg-neutral-800 transition-all"
          >
            Entregar Vehículo
          </a>
          <p class="text-xs text-neutral-500 text-center mt-2">Realizar inspección de entrega</p>
        } @else if (canOwnerCheckOut()) {
          <!-- Owner: Confirmar Devolución -->
          <a
            [routerLink]="['/bookings', booking().id, 'owner-check-out']"
            class="block w-full py-4 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-center hover:bg-neutral-800 transition-all"
          >
            Confirmar Devolución
          </a>
          <p class="text-xs text-neutral-500 text-center mt-2">Inspeccionar estado del vehículo</p>
        } @else if (canApproveBooking()) {
          <!-- Approve/Reject -->
          <div class="space-y-2">
            <button
              (click)="approveBooking.emit()"
              class="w-full py-4 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-center hover:bg-neutral-800 transition-all"
            >
              Aprobar Reserva
            </button>
            <button
              (click)="rejectBooking.emit()"
              class="w-full py-3 px-6 rounded-xl border border-neutral-200 text-neutral-600 font-medium text-center hover:bg-neutral-50 transition-all"
            >
              Rechazar
            </button>
          </div>
        } @else if (showWaitingContribution()) {
          <!-- Waiting state -->
          <div class="py-4 px-6 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <p class="text-sm font-medium text-amber-700">Esperando contribución del viajero</p>
          </div>
        } @else {
          <!-- Default: No action needed -->
          <div class="py-4 px-6 rounded-xl bg-neutral-50 text-center">
            <p class="text-sm text-neutral-500">Sin acciones pendientes</p>
          </div>
        }
      </div>

      <!-- Quick Actions (Icons) -->
      <div class="px-5 pb-5">
        <div class="grid grid-cols-4 gap-2">
          <button
            (click)="chatOpen.emit()"
            class="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-neutral-50 transition-colors group"
          >
            <ion-icon
              name="chatbubble-ellipses-outline"
              class="text-xl text-neutral-600 group-hover:text-neutral-900"
            ></ion-icon>
            <span class="text-[10px] text-neutral-500 group-hover:text-neutral-700">Chat</span>
          </button>
          <a
            [routerLink]="['/bookings', booking().id, 'request']"
            class="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-neutral-50 transition-colors group"
          >
            <ion-icon
              name="receipt-outline"
              class="text-xl text-neutral-600 group-hover:text-neutral-900"
            ></ion-icon>
            <span class="text-[10px] text-neutral-500 group-hover:text-neutral-700">Pago</span>
          </a>
          <a
            [routerLink]="['/bookings', booking().id, 'contract']"
            class="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-neutral-50 transition-colors group"
          >
            <ion-icon
              name="document-text-outline"
              class="text-xl text-neutral-600 group-hover:text-neutral-900"
            ></ion-icon>
            <span class="text-[10px] text-neutral-500 group-hover:text-neutral-700">Contrato</span>
          </a>
          @if (showCancelButton()) {
            <button
              (click)="handleCancel()"
              class="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-red-50 transition-colors group"
            >
              <ion-icon
                name="close-circle-outline"
                class="text-xl text-neutral-400 group-hover:text-red-500"
              ></ion-icon>
              <span class="text-[10px] text-neutral-400 group-hover:text-red-500">Cancelar</span>
            </button>
          } @else {
            <a
              href="mailto:soporte@autorentar.com"
              class="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-neutral-50 transition-colors group"
            >
              <ion-icon
                name="help-circle-outline"
                class="text-xl text-neutral-600 group-hover:text-neutral-900"
              ></ion-icon>
              <span class="text-[10px] text-neutral-500 group-hover:text-neutral-700">Ayuda</span>
            </a>
          }
        </div>
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
  readonly awaitingRenterCheckIn = input<boolean>(false);

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
      documentTextOutline,
      closeCircleOutline,
      helpCircleOutline,
    });
  }

  // Computed helpers
  readonly showPaymentAction = computed(() => {
    const booking = this.booking();
    return (this.needsPayment() || booking?.status === 'pending_payment') && this.isRenter();
  });

  readonly showWaitingContribution = computed(() => {
    return this.booking()?.status === 'pending_payment' && this.isOwner();
  });

  readonly showCancelButton = computed(() => {
    const booking = this.booking();
    return this.canOwnerCancel() || (this.isRenter() && booking?.status === 'pending');
  });

  handleCancel(): void {
    if (this.isOwner()) {
      this.ownerCancelBooking.emit();
    } else {
      const bookingId = this.booking().id;
      if (bookingId) {
        this.cancelBooking.emit(bookingId);
      }
    }
  }
}
