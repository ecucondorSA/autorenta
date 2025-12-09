import { Component, Input, Output, EventEmitter, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromoCodeInputComponent } from '../../../../shared/components/promo-code-input/promo-code-input.component';
import {
  PriceBreakdown,
  RiskSnapshot,
  FxSnapshot,
  PaymentMode,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';
import type { PromoCode } from '../../../../core/services/promotion.service';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';

@Component({
  selector: 'app-payment-summary-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReembolsabilityBadgeComponent, PromoCodeInputComponent], // Añadir PromoCodeInputComponent aquí
  template: `
    <div
      class="rounded-xl border border-border-default/60 bg-surface-raised shadow-md p-6 dark:border-neutral-800/70 dark:bg-surface-raised transition-colors duration-300"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-text-primary dark:text-text-primary">Resumen de Pagos</h3>
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

      <!-- ✅ NEW: Distance Information -->
      @if (priceBreakdown.distanceKm !== undefined && priceBreakdown.distanceKm !== null) {
        <div class="mb-4">
          <div
            class="flex items-center justify-between p-3 bg-cta-default/10 dark:bg-cta-default/20 rounded-lg border border-cta-default/40 dark:border-cta-default/40"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-5 h-5 text-cta-default dark:text-cta-default"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div>
                <span class="text-sm font-medium text-cta-default dark:text-cta-default">
                  Distancia al auto: {{ formatDistance(priceBreakdown.distanceKm) }}
                </span>
                @if (priceBreakdown.distanceTier) {
                  <span
                    class="ml-2 text-xs px-2 py-0.5 rounded-full {{
                      getDistanceTierClass(priceBreakdown.distanceTier)
                    }}"
                  >
                    {{ getDistanceTierLabel(priceBreakdown.distanceTier) }}
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Total del Alquiler -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text-primary dark:text-text-secondary/80">
            Total del alquiler
          </span>
          <svg
            class="w-4 h-4 text-text-muted dark:text-text-secondary/60 cursor-help"
            fill="currentColor"
            viewBox="0 0 20 20"
            title="Incluye: tarifa diaria, aporte FGO, cargo de servicio, mejora de cobertura{{
              priceBreakdown.deliveryFeeUsd ? ' y envío' : ''
            }}"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <!-- ✅ NEW: Delivery Fee line item (if applicable) -->
        @if (priceBreakdown.deliveryFeeUsd && priceBreakdown.deliveryFeeUsd > 0) {
          <div
            class="mb-3 p-3 bg-warning-bg dark:bg-warning-900/20 rounded-lg border border-warning-border dark:border-warning-800/40"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-warning-text dark:text-warning-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <span class="text-xs font-medium text-warning-strong dark:text-warning-200">
                  Envío ({{ formatDistance(priceBreakdown.distanceKm || 0) }})
                </span>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-warning-strong dark:text-warning-200">
                  {{ formatArs(deliveryFeeArs()) }}
                </p>
                <p class="text-xs text-warning-strong dark:text-warning-400">
                  {{ formatUsd(priceBreakdown.deliveryFeeUsd) }}
                </p>
              </div>
            </div>
          </div>
        }

        <div
          class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 rounded-lg p-4 transition-colors duration-300"
        >
          <p class="text-3xl font-bold text-primary-900 dark:text-primary-200">
            {{ formatArs(priceBreakdown.totalArs) }}
          </p>
          <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
            ≈ {{ formatUsd(priceBreakdown.totalUsd) }}
          </p>
          <p class="text-xs text-text-secondary dark:text-text-secondary/50 mt-2">
            Se cobra inmediatamente
          </p>
        </div>
      </div>

      <!-- Promo Code Input -->
      <div class="my-4">
        <app-promo-code-input (promoApplied)="onPromoApplied($event)"></app-promo-code-input>
      </div>

      <!-- Divider -->
      <div class="h-px bg-surface-hover dark:bg-neutral-700 my-4"></div>

      <!-- Garantía según método -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text-primary dark:text-text-secondary/80">
            Garantía {{ paymentMode === 'card' ? '(Hold)' : '(Crédito)' }}
          </span>
        </div>

        @if (paymentMode === 'card') {
          <!-- Card Hold -->
          <div
            class="bg-gradient-to-r from-cta-default/10 to-cta-default/20 dark:from-surface-secondary/80 dark:to-surface-secondary/50 rounded-lg p-4 transition-colors duration-300"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-2xl font-bold text-cta-default dark:text-cta-default">
                  {{ formatArs(riskSnapshot.holdEstimatedArs) }}
                </p>
                <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
                  ≈ {{ formatUsd(riskSnapshot.holdEstimatedUsd) }}
                </p>
              </div>
            </div>
            <app-reembolsability-badge
              type="reembolsable"
              customTooltip="Bloqueo temporal. Se libera automáticamente al devolver el auto sin daños."
            ></app-reembolsability-badge>
            <p class="text-xs text-text-secondary dark:text-text-secondary/50 mt-2">
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
                <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
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
            <p class="text-xs text-text-secondary dark:text-text-secondary/50 mt-2">
              Se bloquea de tu saldo wallet
            </p>
          </div>
        }
      </div>

      <!-- Divider -->
      <div class="h-px bg-surface-hover dark:bg-neutral-700 my-4"></div>

      <!-- Total Consolidado (Informativo) -->
      <div
        class="bg-surface-base dark:bg-surface-secondary/40 rounded-lg p-4 transition-colors duration-300"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <span class="text-sm font-medium text-text-primary dark:text-text-secondary/80">
              Total bloqueado
              <span class="text-xs text-text-secondary dark:text-text-secondary/50"
                >(informativo)</span
              >
            </span>
          </div>
          <svg
            class="w-4 h-4 text-text-muted dark:text-text-secondary/60 cursor-help flex-shrink-0 ml-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            title="Este total es solo informativo. El alquiler se cobra inmediatamente y la garantía se bloquea por separado."
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <p class="text-2xl font-bold text-text-primary dark:text-text-primary">
          {{ formatArs(totalConsolidatedArs()) }}
        </p>
        <p class="text-xs text-text-secondary dark:text-text-secondary/60 mt-1">
          ≈ {{ formatUsd(totalConsolidatedUsd()) }}
        </p>

        <!-- Aclaración -->
        <div class="mt-3 pt-3 border-t border-border-default dark:border-neutral-700">
          <p class="text-xs text-text-secondary dark:text-text-secondary/70">
            <svg class="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <strong>Importante:</strong> El total del alquiler y la garantía se procesan por
            separado. La garantía {{ paymentMode === 'card' ? 'se libera' : 'queda disponible' }} si
            no hay daños.
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
  @Output() promoApplied = new EventEmitter<PromoCode>();

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

  protected deliveryFeeArs = computed(() => {
    if (!this.priceBreakdown.deliveryFeeUsd) return 0;
    return this.priceBreakdown.deliveryFeeUsd * this.fxSnapshot.rate;
  });

  formatArs = formatArs;
  formatUsd = formatUsd;

  protected formatDistance(km: number): string {
    if (km < 1) {
      const meters = Math.round(km * 1000);
      return `${meters} m`;
    }
    return `${km.toFixed(1)} km`;
  }

  protected getDistanceTierLabel(tier: 'local' | 'regional' | 'long_distance'): string {
    const labels = {
      local: 'Cercano',
      regional: 'Regional',
      long_distance: 'Larga distancia',
    };
    return labels[tier];
  }

  protected getDistanceTierClass(tier: 'local' | 'regional' | 'long_distance'): string {
    const classes = {
      local:
        'bg-success-light/20 text-success-light dark:bg-success-light/30 dark:text-success-strong',
      regional:
        'bg-warning-bg-hover text-warning-strong dark:bg-warning-900/30 dark:text-warning-300',
      long_distance:
        'bg-warning-light/20 text-warning-light dark:bg-warning-light/30 dark:text-warning-strong',
    };
    return classes[tier];
  }

  protected onCompareMethodsClick(): void {
    this.compareMethodsClick.emit();
  }

  protected onPromoApplied(promo: PromoCode): void {
    this.promoApplied.emit(promo);
  }
}
