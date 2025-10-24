import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PriceBreakdown,
  FxSnapshot,
  BookingDates,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';

/**
 * Componente que muestra el resumen de la reserva (columna derecha)
 * Incluye: info del auto, fechas, desglose de precios, total en ARS y USD
 */
@Component({
  selector: 'app-booking-summary-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow-lg p-6 sticky top-4 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300">
      <!-- Header -->
      <h2 class="text-xl font-bold text-smoke-black dark:text-ivory-luminous mb-4">Resumen de Reserva</h2>

      <!-- Car Info -->
      <div class="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-800">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <img
              *ngIf="carImage"
              [src]="carImage"
              [alt]="carName"
              class="w-16 h-16 rounded object-cover"
            />
            <div
              *ngIf="!carImage"
              class="w-16 h-16 rounded bg-gray-200 dark:bg-neutral-700 flex items-center justify-center transition-colors duration-300"
            >
              <svg class="w-8 h-8 text-gray-400 dark:text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-smoke-black dark:text-ivory-luminous truncate">{{ carName }}</p>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70">{{ carLocation }}</p>
          </div>
        </div>
      </div>

      <!-- Dates -->
      <div *ngIf="dates" class="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-800">
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-pearl-light/70">Retiro:</span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">{{ dates.startDate | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-pearl-light/70">Devolución:</span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">{{ dates.endDate | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-pearl-light/70">Total de días:</span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">{{ dates.totalDays }} {{ dates.totalDays === 1 ? 'día' : 'días' }}</span>
          </div>
        </div>
      </div>

      <!-- Price Breakdown -->
      <div *ngIf="priceBreakdown" class="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-800">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-ivory-luminous mb-3">Desglose de Precios</h3>
        <div class="space-y-2">
          <!-- Daily Rate -->
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-pearl-light/70">
              Tarifa diaria × {{ priceBreakdown.totalDays }}
            </span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">
              {{ formatUsd(priceBreakdown.dailyRateUsd * priceBreakdown.totalDays) }}
            </span>
          </div>

          <!-- FGO Contribution -->
          <div class="flex justify-between text-sm" *ngIf="priceBreakdown.fgoContributionUsd > 0">
            <span class="text-gray-600 dark:text-pearl-light/70">
              Aporte FGO ({{ calculateFgoPercentage() }}%)
            </span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">
              {{ formatUsd(priceBreakdown.fgoContributionUsd) }}
            </span>
          </div>

          <!-- Platform Fee -->
          <div class="flex justify-between text-sm" *ngIf="priceBreakdown.platformFeeUsd > 0">
            <span class="text-gray-600 dark:text-pearl-light/70">Cargo de servicio</span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">
              {{ formatUsd(priceBreakdown.platformFeeUsd) }}
            </span>
          </div>

          <!-- Insurance Fee -->
          <div class="flex justify-between text-sm" *ngIf="priceBreakdown.insuranceFeeUsd > 0">
            <span class="text-gray-600 dark:text-pearl-light/70">Seguro básico</span>
            <span class="font-medium text-gray-900 dark:text-ivory-luminous">
              {{ formatUsd(priceBreakdown.insuranceFeeUsd) }}
            </span>
          </div>

          <!-- Coverage Upgrade -->
          <div class="flex justify-between text-sm" *ngIf="priceBreakdown.coverageUpgradeUsd > 0">
            <span class="text-gray-600 dark:text-pearl-light/70 font-medium text-primary-600 dark:text-accent-petrol">Upgrade de cobertura</span>
            <span class="font-medium text-primary-600 dark:text-accent-petrol">
              {{ formatUsd(priceBreakdown.coverageUpgradeUsd) }}
            </span>
          </div>

          <!-- Subtotal USD -->
          <div class="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-neutral-800/80">
            <span class="text-gray-700 dark:text-pearl-light/80 font-medium">Subtotal (USD)</span>
            <span class="font-semibold text-gray-900 dark:text-ivory-luminous">
              {{ formatUsd(priceBreakdown.totalUsd) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Total in ARS and USD -->
      <div *ngIf="priceBreakdown && fxSnapshot" class="space-y-3">
        <!-- FX Rate Info -->
        <div class="bg-blue-50 border border-blue-100 dark:bg-info-900/25 dark:border-info-700/40 rounded-lg p-3 transition-colors duration-300">
          <div class="flex items-start space-x-2">
            <svg class="w-4 h-4 text-blue-600 dark:text-info-200 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div class="flex-1">
              <p class="text-xs text-blue-800 dark:text-info-100">
                Tipo de cambio: <span class="font-semibold">{{ formatFxRate(fxSnapshot.rate) }}</span>
              </p>
              <p class="text-xs text-blue-600 dark:text-info-200 mt-1">
                Actualizado: {{ fxSnapshot.timestamp | date: 'dd/MM HH:mm' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Total ARS -->
        <div class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-accent-petrol/20 dark:to-accent-petrol/10 rounded-lg p-4 transition-colors duration-300">
          <div class="flex justify-between items-baseline">
            <span class="text-sm font-medium text-gray-700 dark:text-pearl-light/80">Total a pagar</span>
            <div class="text-right">
              <p class="text-2xl font-bold text-primary-900 dark:text-accent-petrol">
                {{ formatArs(priceBreakdown.totalArs) }}
              </p>
              <p class="text-xs text-gray-600 dark:text-pearl-light/70 mt-1">
                ≈ {{ formatUsd(priceBreakdown.totalUsd) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- FX Expiration Warning -->
      <div
        *ngIf="fxSnapshot && fxSnapshot.isExpired"
        class="mt-4 bg-yellow-50 border border-yellow-200 dark:bg-warning-900/30 dark:border-warning-700/60 rounded-lg p-3 transition-colors duration-300"
      >
        <div class="flex space-x-2">
          <svg class="w-5 h-5 text-yellow-600 dark:text-warning-200 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-yellow-800 dark:text-warning-50">Tipo de cambio vencido</p>
            <p class="text-xs text-yellow-700 dark:text-warning-200 mt-1">
              Se actualizará antes de confirmar la reserva
            </p>
          </div>
        </div>
      </div>

      <!-- Action Button Slot -->
      <div class="mt-6">
        <ng-content></ng-content>
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
export class BookingSummaryCardComponent {
  @Input() carName = '';
  @Input() carImage = '';
  @Input() carLocation = '';
  @Input() dates: BookingDates | null = null;
  @Input() priceBreakdown: PriceBreakdown | null = null;
  @Input() fxSnapshot: FxSnapshot | null = null;

  // Expose formatters to template
  formatUsd = formatUsd;
  formatArs = formatArs;

  /**
   * Calcula el porcentaje de FGO del subtotal
   */
  calculateFgoPercentage(): number {
    if (!this.priceBreakdown || this.priceBreakdown.subtotalUsd === 0) {
      return 0;
    }
    return Math.round(
      (this.priceBreakdown.fgoContributionUsd / this.priceBreakdown.subtotalUsd) * 100
    );
  }

  /**
   * Formatea la tasa FX
   */
  formatFxRate(rate: number): string {
    return `1 USD = ${rate.toFixed(2)} ARS`;
  }
}
