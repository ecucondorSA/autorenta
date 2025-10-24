import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentMode } from '../../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-payment-mode-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300">
      <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous mb-4">Modalidad de Garantía</h3>

      <div class="grid grid-cols-2 gap-4">
        <!-- Con Tarjeta -->
        <button
          type="button"
          class="relative p-4 border rounded-lg bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-petrol/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-soft dark:focus-visible:ring-offset-graphite-dark"
          [ngClass]="selectedMode === 'card' ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover' : ''"
          (click)="onModeChange('card')"
        >
          <div class="flex flex-col items-center text-center space-y-2">
            <svg class="w-8 h-8 text-primary-600 dark:text-accent-petrol" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div>
              <p class="font-semibold text-smoke-black dark:text-ivory-luminous">Con Tarjeta</p>
              <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">Preautorización reembolsable</p>
            </div>
          </div>
          <div *ngIf="selectedMode === 'card'" class="absolute top-2 right-2">
            <svg class="w-5 h-5 text-primary-600 dark:text-accent-petrol" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>

        <!-- Sin Tarjeta (Wallet) -->
        <button
          type="button"
          class="relative p-4 border rounded-lg bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-petrol/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-soft dark:focus-visible:ring-offset-graphite-dark"
          [ngClass]="selectedMode === 'wallet' ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover' : ''"
          (click)="onModeChange('wallet')"
        >
          <div class="flex flex-col items-center text-center space-y-2">
            <svg class="w-8 h-8 text-primary-600 dark:text-accent-petrol" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p class="font-semibold text-smoke-black dark:text-ivory-luminous">Sin Tarjeta</p>
              <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">Crédito de Seguridad (wallet)</p>
            </div>
          </div>
          <div *ngIf="selectedMode === 'wallet'" class="absolute top-2 right-2">
            <svg class="w-5 h-5 text-primary-600 dark:text-accent-petrol" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>
      </div>

      <!-- Help Text -->
      <div class="mt-4 p-3 bg-gray-50 dark:bg-slate-deep/40 rounded-lg transition-colors duration-300">
        <p class="text-xs text-charcoal-medium dark:text-pearl-light/80" *ngIf="selectedMode === 'card'">
          <strong>Con tarjeta:</strong> Autorizamos un monto en tu tarjeta (hold). Si todo está OK, se libera completamente.
          Si hay consumos o daños, capturamos solo lo necesario (hasta tu franquicia).
        </p>
        <p class="text-xs text-charcoal-medium dark:text-pearl-light/80" *ngIf="selectedMode === 'wallet'">
          <strong>Sin tarjeta:</strong> Depositás un Crédito de Seguridad (NO reembolsable) que queda como saldo no retirable
          en tu wallet y se usa primero para gastos/daños. Ideal si no tenés tarjeta disponible.
        </p>
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
