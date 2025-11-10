import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PaymentMode,
  RiskSnapshot,
  FxSnapshot,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-payment-mode-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (paymentMode === 'card') {
      <!-- Alerta para Tarjeta -->
      <div
        class="bg-cta-default/10 dark:bg-cta-default/20 border-l-4 border-cta-default dark:border-cta-default rounded-lg p-4 animate-slide-down transition-colors duration-300"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-6 h-6 text-cta-default dark:text-cta-default flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-semibold text-cta-default dark:text-cta-default">
              Pago con Tarjeta
            </p>
            <p class="text-sm text-cta-default dark:text-cta-default mt-1">
              Se bloqueará <strong>{{ formatArs(holdAmountArs()) }}</strong> en tu tarjeta como
              garantía. Si todo está bien al devolver el auto,
              <strong>se libera automáticamente</strong>.
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cta-default/20 text-cta-default dark:bg-cta-default/40 dark:text-cta-default"
              >
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                Reembolsable
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cta-default/20 text-cta-default dark:bg-cta-default/40 dark:text-cta-default"
              >
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clip-rule="evenodd"
                  />
                </svg>
                Liberación automática
              </span>
            </div>
          </div>
        </div>
      </div>
    } @else {
      <!-- Alerta para Wallet -->
      <div
        class="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 dark:border-purple-500 rounded-lg p-4 animate-slide-down transition-colors duration-300"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-6 h-6 text-purple-600 dark:text-purple-300 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-semibold text-purple-900 dark:text-purple-100">
              Pago con Wallet
            </p>
            <p class="text-sm text-purple-800 dark:text-purple-200 mt-1">
              Se bloqueará <strong>{{ formatArs(creditSecurityArs()) }}</strong> de tu wallet como
              garantía. Este monto <strong>NO es reembolsable</strong>, pero queda disponible para
              futuras reservas en AutoRenta.
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-warning-900/40 dark:text-warning-200"
              >
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                No reembolsable
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
              >
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clip-rule="evenodd"
                  />
                </svg>
                Reutilizable
              </span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @keyframes slide-down {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-slide-down {
        animation: slide-down 0.3s ease-out;
      }
    `,
  ],
})
export class PaymentModeAlertComponent {
  @Input({ required: true }) paymentMode!: PaymentMode;
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;

  protected holdAmountArs = computed(() => {
    return this.riskSnapshot.holdEstimatedArs;
  });

  protected creditSecurityArs = computed(() => {
    return this.riskSnapshot.creditSecurityUsd * this.fxSnapshot.rate;
  });

  formatArs = formatArs;
  formatUsd = formatUsd;
}
