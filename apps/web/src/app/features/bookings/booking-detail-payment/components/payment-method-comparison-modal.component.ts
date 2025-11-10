import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PriceBreakdown,
  RiskSnapshot,
  FxSnapshot,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';

@Component({
  selector: 'app-payment-method-comparison-modal',
  standalone: true,
  imports: [CommonModule, ReembolsabilityBadgeComponent],
  template: `
    <!-- Modal Backdrop -->
    <div
      class="fixed inset-0 bg-surface-overlay/50 dark:bg-surface-overlay/70 z-50 flex items-center justify-center p-4 animate-fade-in"
      (click)="onBackdropClick($event)"
    >
      <!-- Modal Content -->
      <div
        class="bg-surface-raised dark:bg-surface-raised rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div
          class="sticky top-0 bg-surface-raised dark:bg-surface-raised border-b border-border-default dark:border-neutral-700 px-6 py-4 flex items-center justify-between z-10"
        >
          <div>
            <h2 class="text-2xl font-bold text-text-primary dark:text-text-primary">
              Comparación de Métodos de Pago
            </h2>
            <p class="text-sm text-text-secondary dark:text-text-secondary/70 mt-1">
              Elegí la opción que más te convenga
            </p>
          </div>
          <button
            type="button"
            (click)="onClose()"
            class="text-text-muted dark:text-text-secondary hover:text-text-secondary dark:text-text-secondary/60 dark:hover:text-pearl-light transition-colors"
            aria-label="Cerrar modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Comparison Table -->
        <div class="p-6">
          <!-- Resumen de Alquiler (común a ambos) -->
          <div class="mb-6 bg-surface-base dark:bg-surface-secondary/40 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-text-primary dark:text-text-secondary/80 mb-2">
              Total del alquiler (igual para ambos métodos)
            </h3>
            <p class="text-2xl font-bold text-text-primary dark:text-text-primary">
              {{ formatArs(priceBreakdown.totalArs) }}
            </p>
            <p class="text-sm text-text-secondary dark:text-text-secondary/60 mt-1">
              ≈ {{ formatUsd(priceBreakdown.totalUsd) }}
            </p>
            <p class="text-xs text-text-secondary dark:text-text-secondary/50 mt-2">
              Se cobra inmediatamente en ambos casos
            </p>
          </div>

          <!-- Side-by-side Comparison -->
          <div class="grid md:grid-cols-2 gap-4">
            <!-- TARJETA -->
            <div
              class="border-2 border-cta-default/40 dark:border-cta-default rounded-xl p-5 bg-cta-default/10/50 dark:bg-cta-default/10 transition-colors duration-300"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <svg
                    class="w-6 h-6 text-cta-default dark:text-cta-default"
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
                  <h3 class="text-lg font-bold text-cta-default dark:text-cta-default">
                    Con Tarjeta
                  </h3>
                </div>
              </div>

              <!-- Pago Inmediato -->
              <div class="mb-4">
                <p
                  class="text-xs uppercase font-semibold text-cta-default dark:text-cta-default mb-1"
                >
                  Pago inmediato
                </p>
                <p class="text-sm text-text-primary dark:text-text-secondary/80">Total del alquiler</p>
                <p class="text-lg font-bold text-cta-default dark:text-cta-default">
                  {{ formatArs(priceBreakdown.totalArs) }}
                </p>
              </div>

              <!-- Garantía -->
              <div class="mb-4 pb-4 border-b border-cta-default/40 dark:border-cta-default">
                <p
                  class="text-xs uppercase font-semibold text-cta-default dark:text-cta-default mb-1"
                >
                  Garantía
                </p>
                <p class="text-sm text-text-primary dark:text-text-secondary/80 mb-2">
                  Hold temporal en tarjeta
                </p>
                <p class="text-lg font-bold text-cta-default dark:text-cta-default mb-2">
                  {{ formatArs(riskSnapshot.holdEstimatedArs) }}
                </p>
                <app-reembolsability-badge
                  type="reembolsable"
                  customTooltip="Se libera automáticamente al devolver el auto sin daños"
                ></app-reembolsability-badge>
              </div>

              <!-- Total Bloqueado -->
              <div class="mb-4">
                <p
                  class="text-xs uppercase font-semibold text-cta-default dark:text-cta-default mb-1"
                >
                  Total bloqueado en tarjeta
                </p>
                <p class="text-2xl font-bold text-cta-default dark:text-cta-default">
                  {{ formatArs(totalCardArs()) }}
                </p>
                <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
                  ≈ {{ formatUsd(totalCardUsd()) }}
                </p>
              </div>

              <!-- Ventajas -->
              <div class="bg-surface-raised/80 dark:bg-surface-secondary/60 rounded-lg p-3">
                <p class="text-xs font-semibold text-text-primary dark:text-text-secondary/80 mb-2">
                  ✓ Ventajas
                </p>
                <ul class="text-xs text-text-secondary dark:text-text-secondary/70 space-y-1">
                  <li>• No necesitas saldo en wallet</li>
                  <li>• Garantía se libera automáticamente</li>
                  <li>• Pago protegido por MercadoPago</li>
                </ul>
              </div>
            </div>

            <!-- WALLET -->
            <div
              class="border-2 border-purple-200 dark:border-purple-800 rounded-xl p-5 bg-purple-50/50 dark:bg-purple-900/10 transition-colors duration-300"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <svg
                    class="w-6 h-6 text-purple-600 dark:text-purple-300"
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
                  <h3 class="text-lg font-bold text-purple-900 dark:text-purple-200">Con Wallet</h3>
                </div>
              </div>

              <!-- Pago Inmediato -->
              <div class="mb-4">
                <p
                  class="text-xs uppercase font-semibold text-purple-700 dark:text-purple-300 mb-1"
                >
                  Pago inmediato
                </p>
                <p class="text-sm text-text-primary dark:text-text-secondary/80">
                  Total del alquiler (de saldo)
                </p>
                <p class="text-lg font-bold text-purple-900 dark:text-purple-200">
                  {{ formatArs(priceBreakdown.totalArs) }}
                </p>
              </div>

              <!-- Garantía -->
              <div class="mb-4 pb-4 border-b border-purple-200 dark:border-purple-800">
                <p
                  class="text-xs uppercase font-semibold text-purple-700 dark:text-purple-300 mb-1"
                >
                  Garantía
                </p>
                <p class="text-sm text-text-primary dark:text-text-secondary/80 mb-2">
                  Crédito de seguridad
                </p>
                <p class="text-lg font-bold text-purple-900 dark:text-purple-200 mb-2">
                  {{ formatArs(creditSecurityArs()) }}
                </p>
                <div class="flex flex-col gap-2">
                  <app-reembolsability-badge
                    type="no-reembolsable"
                    customTooltip="Queda bloqueado en tu wallet (no puedes retirarlo)"
                  ></app-reembolsability-badge>
                  <app-reembolsability-badge
                    type="reutilizable"
                    customTooltip="Disponible para futuras reservas si no se usa"
                  ></app-reembolsability-badge>
                </div>
              </div>

              <!-- Total Bloqueado -->
              <div class="mb-4">
                <p
                  class="text-xs uppercase font-semibold text-purple-700 dark:text-purple-300 mb-1"
                >
                  Total bloqueado en wallet
                </p>
                <p class="text-2xl font-bold text-purple-900 dark:text-purple-200">
                  {{ formatArs(totalWalletArs()) }}
                </p>
                <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
                  ≈ {{ formatUsd(totalWalletUsd()) }}
                </p>
              </div>

              <!-- Ventajas -->
              <div class="bg-surface-raised/80 dark:bg-surface-secondary/60 rounded-lg p-3">
                <p class="text-xs font-semibold text-text-primary dark:text-text-secondary/80 mb-2">
                  ✓ Ventajas
                </p>
                <ul class="text-xs text-text-secondary dark:text-text-secondary/70 space-y-1">
                  <li>• Sin límite de tarjeta de crédito</li>
                  <li>• {{ savingsText() }}</li>
                  <li>• Crédito queda para futuras reservas</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Ahorro Destacado -->
          @if (savingsArs() > 0) {
            <div
              class="mt-6 bg-success-light/10 dark:bg-success-900/20 border border-success-light/40 dark:border-success-700 rounded-lg p-4"
            >
              <div class="flex items-start gap-3">
                <svg
                  class="w-6 h-6 text-success-light dark:text-success-300 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-success-light dark:text-success-100">
                    Ahorro con Wallet
                  </p>
                  <p class="text-xs text-success-light dark:text-success-200 mt-1">
                    Con Wallet bloqueas {{ formatArs(savingsArs()) }} menos en garantía. Eso es
                    {{ formatUsd(savingsUsd()) }} que quedan disponibles.
                  </p>
                </div>
              </div>
            </div>
          }

          <!-- Nota Final -->
          <div
            class="mt-6 bg-cta-default/10 dark:bg-cta-default/20 border border-cta-default/40 dark:border-cta-default rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-cta-default dark:text-cta-default flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <p class="text-xs text-cta-default dark:text-cta-default">
                <strong>Importante:</strong> Ambos métodos son igualmente seguros. La diferencia
                está en cómo se maneja la garantía: con tarjeta se libera automáticamente, con
                wallet queda disponible para futuras reservas.
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="sticky bottom-0 bg-surface-base dark:bg-surface-secondary/60 border-t border-border-default dark:border-neutral-700 px-6 py-4"
        >
          <button
            type="button"
            (click)="onClose()"
            class="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-text-inverse font-semibold rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .animate-fade-in {
        animation: fade-in 0.2s ease-out;
      }
    `,
  ],
})
export class PaymentMethodComparisonModalComponent {
  @Input({ required: true }) priceBreakdown!: PriceBreakdown;
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;

  @Output() closeModal = new EventEmitter<void>();

  // Computed values
  protected creditSecurityArs = computed(() => {
    return this.riskSnapshot.creditSecurityUsd * this.fxSnapshot.rate;
  });

  protected totalCardArs = computed(() => {
    return this.priceBreakdown.totalArs + this.riskSnapshot.holdEstimatedArs;
  });

  protected totalCardUsd = computed(() => {
    return this.priceBreakdown.totalUsd + this.riskSnapshot.holdEstimatedUsd;
  });

  protected totalWalletArs = computed(() => {
    return this.priceBreakdown.totalArs + this.creditSecurityArs();
  });

  protected totalWalletUsd = computed(() => {
    return this.priceBreakdown.totalUsd + this.riskSnapshot.creditSecurityUsd;
  });

  protected savingsArs = computed(() => {
    return this.riskSnapshot.holdEstimatedArs - this.creditSecurityArs();
  });

  protected savingsUsd = computed(() => {
    return this.riskSnapshot.holdEstimatedUsd - this.riskSnapshot.creditSecurityUsd;
  });

  protected savingsText = computed(() => {
    const savings = this.savingsArs();
    if (savings > 0) {
      return `Ahorra ${this.formatArs(savings)} en garantía`;
    } else if (savings < 0) {
      return `Garantía ${this.formatArs(Math.abs(savings))} mayor`;
    } else {
      return 'Misma garantía que tarjeta';
    }
  });

  formatArs = formatArs;
  formatUsd = formatUsd;

  protected onClose(): void {
    this.closeModal.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    // Solo cerrar si el click es directamente en el backdrop
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
