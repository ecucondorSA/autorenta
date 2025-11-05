import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';
import {
  PriceBreakdown,
  RiskSnapshot,
  FxSnapshot,
  PaymentMode,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-payment-summary-panel',
  standalone: true,
  imports: [CommonModule, ReembolsabilityBadgeComponent],
  template: `
    <div
      class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow-md p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-smoke-black dark:text-ivory-luminous">
          Resumen de Pagos
        </h3>
        <button
          type="button"
          (click)="onCompareMethodsClick()"
          class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline flex items-center gap-1 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          ¿Cuál método conviene?
        </button>
      </div>

      <!-- Total del Alquiler -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-pearl-light/80">
            Total del alquiler
          </span>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-pearl-light/60 cursor-help"
            fill="currentColor"
            viewBox="0 0 20 20"
            attr.title="Incluye: tarifa diaria, aporte FGO, cargo de servicio y mejora de cobertura"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div
          class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 rounded-lg p-4 transition-colors duration-300"
        >
          <p class="text-3xl font-bold text-primary-900 dark:text-primary-200">
            {{ formatArs(priceBreakdown.totalArs) }}
          </p>
          <p class="text-xs text-gray-600 dark:text-pearl-light/60 mt-1">
            ≈ {{ formatUsd(priceBreakdown.totalUsd) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-pearl-light/50 mt-2">
            Se cobra inmediatamente
          </p>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-gray-200 dark:bg-neutral-700 my-4"></div>

      <!-- Garantía según método -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-pearl-light/80">
            Garantía {{ paymentMode === 'card' ? '(Hold)' : '(Crédito)' }}
          </span>
        </div>

        @if (paymentMode === 'card') {
          <!-- Card Hold -->
          <div
            class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-deep/80 dark:to-slate-deep/50 rounded-lg p-4 transition-colors duration-300"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-2xl font-bold text-blue-900 dark:text-info-200">
                  {{ formatArs(riskSnapshot.holdEstimatedArs) }}
                </p>
                <p class="text-xs text-gray-600 dark:text-pearl-light/60 mt-1">
                  ≈ {{ formatUsd(riskSnapshot.holdEstimatedUsd) }}
                </p>
              </div>
            </div>
            <app-reembolsability-badge
              type="reembolsable"
              customTooltip="Bloqueo temporal. Se libera automáticamente al devolver el auto sin daños."
            ></app-reembolsability-badge>
            <p class="text-xs text-gray-500 dark:text-pearl-light/50 mt-2">
              Se bloquea en tu tarjeta (no se cobra)
            </p>
          </div>
        } @else {
          <!-- Wallet Credit Security -->
          <div
            class="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/10 rounded-lg p-4 transition-colors duration-300"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-2xl font-bold text-purple-900 dark:text-purple-200">
                  {{ formatArs(creditSecurityArs()) }}
                </p>
                <p class="text-xs text-gray-600 dark:text-pearl-light/60 mt-1">
                  ≈ {{ formatUsd(riskSnapshot.creditSecurityUsd) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <app-reembolsability-badge
                type="no-reembolsable"
                customTooltip="Queda bloqueado en tu wallet (no puedes retirarlo)."
              ></app-reembolsability-badge>
              <app-reembolsability-badge
                type="reutilizable"
                customTooltip="Disponible para futuras reservas si no se usa."
              ></app-reembolsability-badge>
            </div>
            <p class="text-xs text-gray-500 dark:text-pearl-light/50 mt-2">
              Se bloquea de tu saldo wallet
            </p>
          </div>
        }
      </div>

      <!-- Divider -->
      <div class="h-px bg-gray-200 dark:bg-neutral-700 my-4"></div>

      <!-- Total Consolidado (Informativo) -->
      <div class="bg-gray-50 dark:bg-slate-deep/40 rounded-lg p-4 transition-colors duration-300">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-700 dark:text-pearl-light/80">
              Total bloqueado
              <span class="text-xs text-gray-500 dark:text-pearl-light/50">(informativo)</span>
            </span>
          </div>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-pearl-light/60 cursor-help flex-shrink-0 ml-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            attr.title="Este total es solo informativo. El alquiler se cobra inmediatamente y la garantía se bloquea por separado."
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-ivory-luminous">
          {{ formatArs(totalConsolidatedArs()) }}
        </p>
        <p class="text-xs text-gray-600 dark:text-pearl-light/60 mt-1">
          ≈ {{ formatUsd(totalConsolidatedUsd()) }}
        </p>

        <!-- Aclaración -->
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
          <p class="text-xs text-gray-600 dark:text-pearl-light/70">
            <svg class="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <strong>Importante:</strong> El total del alquiler y la garantía se procesan por separado.
            La garantía {{ paymentMode === 'card' ? 'se libera' : 'queda disponible' }} si no hay daños.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PaymentSummaryPanelComponent {
  @Input({ required: true }) priceBreakdown!: PriceBreakdown;
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;
  @Input({ required: true }) paymentMode!: PaymentMode;

  @Output() compareMethodsClick = new EventEmitter<void>();

  // Computed values
  protected creditSecurityArs = computed(() => {
    return this.riskSnapshot.creditSecurityUsd * this.fxSnapshot.rate;
  });

  protected guaranteeAmountArs = computed(() => {
    return this.paymentMode === 'card'
      ? this.riskSnapshot.holdEstimatedArs
      : this.creditSecurityArs();
  });

  protected guaranteeAmountUsd = computed(() => {
    return this.paymentMode === 'card'
      ? this.riskSnapshot.holdEstimatedUsd
      : this.riskSnapshot.creditSecurityUsd;
  });

  protected totalConsolidatedArs = computed(() => {
    return this.priceBreakdown.totalArs + this.guaranteeAmountArs();
  });

  protected totalConsolidatedUsd = computed(() => {
    return this.priceBreakdown.totalUsd + this.guaranteeAmountUsd();
  });

  formatArs = formatArs;
  formatUsd = formatUsd;

  protected onCompareMethodsClick(): void {
    this.compareMethodsClick.emit();
  }
}
