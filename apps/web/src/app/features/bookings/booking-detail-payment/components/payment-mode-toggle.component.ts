import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentMode } from '../../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-payment-mode-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300"
    >
      <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous mb-4">
        Elegí tu método de pago
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Con Tarjeta -->
        <button
          type="button"
          class="relative p-4 border rounded-lg bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-petrol/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-soft dark:focus-visible:ring-offset-graphite-dark"
          [ngClass]="
            selectedMode === 'card'
              ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover'
              : ''
          "
          (click)="onModeChange('card')"
        >
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg
                class="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-smoke-black dark:text-ivory-luminous">Pagar con tarjeta</p>
              <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                Crédito o débito • Liberación automática
              </p>
            </div>
          </div>
          <div *ngIf="selectedMode === 'card'" class="absolute top-2 right-2">
            <svg
              class="w-5 h-5 text-primary-600 dark:text-accent-petrol"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </button>

        <!-- Con Wallet -->
        <button
          type="button"
          class="relative p-4 border rounded-lg bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-petrol/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-soft dark:focus-visible:ring-offset-graphite-dark"
          [ngClass]="
            selectedMode === 'wallet'
              ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover'
              : ''
          "
          (click)="onModeChange('wallet')"
        >
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg
                class="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-smoke-black dark:text-ivory-luminous">Pagar con wallet</p>
              <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                Usa tu saldo AutoRenta • Sin tarjeta
              </p>
            </div>
          </div>
          <div *ngIf="selectedMode === 'wallet'" class="absolute top-2 right-2">
            <svg
              class="w-5 h-5 text-primary-600 dark:text-accent-petrol"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </button>
      </div>

      <!-- Beneficios destacados -->
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/60 rounded-lg">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-sm font-medium text-green-800 dark:text-green-200">Pago seguro</span>
          </div>
          <p class="text-xs text-green-700 dark:text-green-300 mt-1">
            @if (selectedMode === 'card') {
              MercadoPago protege tus datos
            } @else {
              Sin comisiones adicionales
            }
          </p>
        </div>
        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 rounded-lg">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span class="text-sm font-medium text-blue-800 dark:text-blue-200">Garantía incluida</span>
          </div>
          <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
            @if (selectedMode === 'card') {
              Liberación automática al devolver
            } @else {
              Crédito bloqueado para protección
            }
          </p>
        </div>
      </div>
    </div>
  `,
})
export class PaymentModeToggleComponent {
  @Input() selectedMode: PaymentMode = 'card';
  @Output() modeChange = new EventEmitter<PaymentMode>();

  onModeChange(mode: PaymentMode): void {
    this.selectedMode = mode;
    this.modeChange.emit(mode);
  }
}
