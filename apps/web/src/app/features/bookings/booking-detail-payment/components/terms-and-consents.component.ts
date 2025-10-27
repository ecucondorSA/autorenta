import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserConsents, PaymentMode } from '../../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-terms-and-consents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300"
    >
      <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous mb-4">
        Términos y Consentimientos
      </h3>

      <div class="space-y-4">
        <!-- Terms & Conditions -->
        <label class="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            [(ngModel)]="consents.termsAccepted"
            (ngModelChange)="onConsentsChange()"
            class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-accent-petrol/60 border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-slate-deep/60 transition-colors"
          />
          <span class="text-sm text-gray-700 dark:text-pearl-light/80">
            Acepto los
            <a
              href="/terminos-y-condiciones"
              target="_blank"
              class="text-primary-600 hover:text-primary-700 dark:text-accent-petrol dark:hover:text-accent-petrol/80 underline"
            >
              Términos y Condiciones
            </a>
            y la
            <a
              href="/politica-privacidad"
              target="_blank"
              class="text-primary-600 hover:text-primary-700 dark:text-accent-petrol dark:hover:text-accent-petrol/80 underline"
            >
              Política de Privacidad
            </a>
            <span class="text-red-500">*</span>
          </span>
        </label>

        <!-- Card on File (only for card mode) -->
        <label *ngIf="paymentMode === 'card'" class="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            [(ngModel)]="consents.cardOnFileAccepted"
            (ngModelChange)="onConsentsChange()"
            class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-accent-petrol/60 border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-slate-deep/60 transition-colors"
          />
          <span class="text-sm text-gray-700 dark:text-pearl-light/80">
            Autorizo guardar mi tarjeta para cargos diferidos (multas, peajes, daños) según lo
            establecido en los Términos y Condiciones
            <span class="text-red-500">*</span>
          </span>
        </label>
      </div>

      <!-- Legal Info -->
      <div
        class="mt-4 p-3 bg-gray-50 dark:bg-slate-deep/40 rounded-lg transition-colors duration-300"
      >
        <p class="text-xs text-gray-600 dark:text-pearl-light/70">
          <strong>Importante:</strong> Al confirmar esta reserva, estás aceptando las condiciones de
          uso, franquicias y responsabilidades detalladas arriba. Los campos marcados con
          <span class="text-red-500">*</span> son obligatorios.
        </p>
      </div>

      <!-- Validation Errors -->
      <div
        *ngIf="!consents.termsAccepted || (paymentMode === 'card' && !consents.cardOnFileAccepted)"
        class="mt-4 p-3 bg-yellow-50 border border-yellow-200 dark:bg-warning-900/30 dark:border-warning-700/60 rounded-lg transition-colors duration-300"
      >
        <div class="flex space-x-2">
          <svg
            class="w-5 h-5 text-yellow-600 dark:text-warning-200 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-sm text-yellow-800 dark:text-warning-100">
            Debes aceptar todos los consentimientos obligatorios para continuar
          </p>
        </div>
      </div>
    </div>
  `,
})
export class TermsAndConsentsComponent {
  @Input() consents: UserConsents = {
    termsAccepted: false,
    cardOnFileAccepted: false,
    privacyPolicyAccepted: false,
  };
  @Input() paymentMode: PaymentMode = 'card';
  @Output() consentsChange = new EventEmitter<UserConsents>();

  onConsentsChange(): void {
    this.consentsChange.emit(this.consents);
  }
}
