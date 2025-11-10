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
      class="rounded-xl border border-border-default/60 bg-surface-raised shadow p-6 dark:border-neutral-800/70 dark:bg-surface-raised transition-colors duration-300"
    >
      <h3 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">
        Confirmación y autorizaciones
      </h3>

      <div class="space-y-4">
        <!-- Terms & Conditions -->
        <div
          class="p-4 bg-cta-default/10 dark:bg-cta-default/20 border border-cta-default/40 dark:border-cta-default/60 rounded-lg"
        >
          <label class="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              [(ngModel)]="consents.termsAccepted"
              (ngModelChange)="onConsentsChange()"
              class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default dark:focus:ring-blue-400 border-cta-default/50 dark:border-cta-default rounded bg-surface-raised dark:bg-surface-secondary/60 transition-colors"
            />
            <div class="flex-1">
              <span class="text-sm font-medium text-cta-default dark:text-cta-default mb-1 block">
                Acepto los términos del servicio
              </span>
              <span class="text-sm text-cta-default dark:text-cta-default">
                He leído y acepto los
                <a
                  href="/terminos-y-condiciones"
                  target="_blank"
                  class="font-medium underline hover:text-cta-default dark:hover:text-cta-default"
                >
                  Términos y Condiciones
                </a>
                y la
                <a
                  href="/politica-privacidad"
                  target="_blank"
                  class="font-medium underline hover:text-cta-default dark:hover:text-cta-default"
                >
                  Política de Privacidad
                </a>
                <span class="text-error-500">*</span>
              </span>
            </div>
          </label>
        </div>

        <!-- Card on File (only for card mode) -->
        <div
          *ngIf="paymentMode === 'card'"
          class="p-4 bg-success-light/10 dark:bg-success-light/20 border border-success-light/40 dark:border-success-light/60 rounded-lg"
        >
          <label class="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              [(ngModel)]="consents.cardOnFileAccepted"
              (ngModelChange)="onConsentsChange()"
              class="mt-1 h-4 w-4 text-success-light focus:ring-success-light dark:focus:ring-success-light border-success-light/50 dark:border-success-light rounded bg-surface-raised dark:bg-surface-secondary/60 transition-colors"
            />
            <div class="flex-1">
              <span
                class="text-sm font-medium text-success-light dark:text-success-light mb-1 block"
              >
                Autorizo guardar mi tarjeta de forma segura
              </span>
              <span class="text-sm text-success-light dark:text-success-light">
                Permito que AutoRenta guarde mi tarjeta para futuros cargos por multas, peajes o
                daños según nuestros términos
                <span class="text-error-500">*</span>
              </span>
            </div>
          </label>
        </div>
      </div>

      <!-- Security Notice -->
      <div
        class="mt-4 p-4 bg-success-light/10 dark:bg-success-light/20 border border-success-light/40 dark:border-success-light/60 rounded-lg"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-5 h-5 text-success-light flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div>
            <p class="text-sm font-medium text-success-light dark:text-success-light mb-1">
              Tus datos están protegidos
            </p>
            <p class="text-sm text-success-light dark:text-success-light">
              @if (paymentMode === 'card') {
                MercadoPago protege tu información de pago. Solo cobramos según nuestros términos
                acordados.
              } @else {
                Tu saldo en wallet está protegido y solo se usa según las reglas establecidas.
              }
            </p>
          </div>
        </div>
      </div>

      <!-- Validation Errors -->
      <div
        *ngIf="!consents.termsAccepted || (paymentMode === 'card' && !consents.cardOnFileAccepted)"
        class="mt-4 p-3 bg-warning-50 border border-warning-200 dark:bg-warning-900/30 dark:border-warning-700/60 rounded-lg transition-colors duration-300"
      >
        <div class="flex space-x-2">
          <svg
            class="w-5 h-5 text-warning-600 dark:text-warning-200 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-sm text-warning-800 dark:text-warning-100">
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
