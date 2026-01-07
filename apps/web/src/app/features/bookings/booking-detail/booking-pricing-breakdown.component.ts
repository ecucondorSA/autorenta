import {Component, Input,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Booking } from '../../../core/models';

/**
 * Coverage info for Autorentar Club subscription
 */
export interface SubscriptionCoverageInfo {
  coverageType: 'full_subscription' | 'partial_subscription' | 'none';
  coveredBySubscriptionUsd: number;
  depositRequiredUsd: number;
  franchiseUsd: number;
  subscriptionBalanceUsd?: number;
}

/**
 * BookingPricingBreakdownComponent
 *
 * Displays a clear breakdown of rental charges vs security deposit
 * with visual separation and tooltips explaining each component.
 */
@Component({
  selector: 'app-booking-detail-pricing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    @if (booking) {
      <div
        class="rounded-lg border border-border-default bg-surface-raised shadow-sm"
        >
        <!-- Header -->
        <div class="p-4 border-b border-border-default">
          <h3
            class="text-lg font-semibold text-text-primary flex items-center gap-2"
            >
            <svg
              class="w-5 h-5 text-cta-default"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
            </svg>
            Desglose de Pagos
          </h3>
        </div>
        <div class="p-4 space-y-4">
          <!-- Rental Charges Section -->
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-text-primary">
                    Cargos del Alquiler
                  </h4>
                  <button
                    type="button"
                    class="group relative"
                    [title]="rentalTooltipText"
                    aria-label="Información sobre cargos del alquiler"
                    >
                    <svg
                      class="w-4 h-4 text-text-muted hover:text-text-secondary cursor-help"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                        />
                    </svg>
                    <!-- Tooltip -->
                    <div
                      class="absolute left-0 bottom-full mb-2 w-64 p-2 bg-surface-raised text-text-inverse text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10"
                      >
                      {{ rentalTooltipText }}
                      <div
                        class="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"
                      ></div>
                    </div>
                  </button>
                </div>
                <p class="text-xs text-text-secondary mt-1">
                  Incluye tarifa diaria, aporte FGO y cargo de servicio
                </p>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-text-primary">
                  {{ formatCurrency(rentalAmount, booking.currency) }}
                </p>
              </div>
            </div>
            <!-- Breakdown items if available -->
            @if (booking.breakdown) {
              <div
                class="pl-4 space-y-2 text-sm text-text-secondary"
                >
                @if (booking.days_count) {
                  <div class="flex justify-between">
                    <span>Tarifa diaria × {{ booking.days_count }} días</span>
                    <span>{{ formatCurrency(dailyRateTotal, booking.currency) }}</span>
                  </div>
                }
                @if (booking.breakdown.insurance_cents) {
                  <div class="flex justify-between">
                    <span>Seguro básico</span>
                    <span>{{ formatCurrency(booking.breakdown.insurance_cents, booking.currency) }}</span>
                  </div>
                }
                @if (booking.breakdown.fees_cents) {
                  <div class="flex justify-between">
                    <span>Cargo de servicio</span>
                    <span>{{ formatCurrency(booking.breakdown.fees_cents, booking.currency) }}</span>
                  </div>
                }
                <!-- ✅ NEW: Show delivery fee with distance tier badge -->
                @if (deliveryFee > 0) {
                  <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                      <span>Entrega a domicilio</span>
                      <!-- Distance tier badge -->
                      @if (distanceTier) {
                        <span [class]="getDistanceTierBadgeClass()">
                          {{ getDistanceTierLabel() }}
                        </span>
                      }
                      <!-- Distance in km -->
                      @if (deliveryDistanceKm > 0) {
                        <span class="text-xs text-text-muted">
                          ({{ deliveryDistanceKm | number: '1.0-0' }} km)
                        </span>
                      }
                    </div>
                    <span>{{ formatCurrency(deliveryFee, booking.currency) }}</span>
                  </div>
                }
              </div>
            }
          </div>
          <!-- Divider -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-border-muted"></div>
            </div>
            <div class="relative flex justify-center">
              <span
                class="px-2 bg-surface-raised text-xs text-text-secondary"
                >
                +
              </span>
            </div>
          </div>
          <!-- Security Deposit Section -->
          <div class="space-y-3">
            <!-- Full Coverage by Autorentar Club -->
            @if (subscriptionCoverage?.coverageType === 'full_subscription') {
              <div
                class="flex items-start justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40"
                >
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-sm font-semibold text-amber-700">
                      Depósito de Garantía
                    </h4>
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/30 text-amber-800"
                      >
                      <ion-icon name="shield-checkmark" class="text-sm"></ion-icon>
                      Cubierto por Club
                    </span>
                  </div>
                  <p class="text-xs text-amber-700/80 mt-1">
                    Tu membresía Autorentar Club cubre el 100% del depósito
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-amber-700 line-through opacity-60">
                    {{ formatCurrency((subscriptionCoverage?.franchiseUsd ?? 0) * 100, 'USD') }}
                  </p>
                  <p class="text-xl font-bold text-success-strong">
                    $0
                  </p>
                </div>
              </div>
            }
            <!-- Partial Coverage by Autorentar Club -->
            @else if (subscriptionCoverage?.coverageType === 'partial_subscription') {
              <div
                class="flex items-start justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/15 to-cta-default/10 border border-amber-500/30"
                >
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-sm font-semibold text-text-primary">
                      Depósito de Garantía
                    </h4>
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-700"
                      >
                      <ion-icon name="shield-half" class="text-sm"></ion-icon>
                      Cobertura parcial
                    </span>
                  </div>
                  <div class="text-xs mt-2 space-y-1">
                    <div class="flex justify-between text-text-secondary">
                      <span>Franquicia total:</span>
                      <span>{{ formatCurrency((subscriptionCoverage?.franchiseUsd ?? 0) * 100, 'USD') }}</span>
                    </div>
                    <div class="flex justify-between text-amber-700">
                      <span>Cubierto por Club:</span>
                      <span>-{{ formatCurrency((subscriptionCoverage?.coveredBySubscriptionUsd ?? 0) * 100, 'USD') }}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm text-text-muted line-through">
                    {{ formatCurrency((subscriptionCoverage?.franchiseUsd ?? 0) * 100, 'USD') }}
                  </p>
                  <p class="text-lg font-bold text-cta-default">
                    {{ formatCurrency((subscriptionCoverage?.depositRequiredUsd ?? 0) * 100, 'USD') }}
                  </p>
                </div>
              </div>
            }
            <!-- No Coverage - Standard deposit -->
            @else {
              <div
                class="flex items-start justify-between p-3 rounded-lg bg-cta-default/10 border border-cta-default/40"
                >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-semibold text-cta-default">
                      Depósito de Garantía
                    </h4>
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-success-light/20 text-success-700"
                      >
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                          />
                      </svg>
                      Reembolsable
                    </span>
                    <button
                      type="button"
                      class="group relative"
                      [title]="depositTooltipText"
                      aria-label="Información sobre depósito de garantía"
                      >
                      <svg
                        class="w-4 h-4 text-cta-default hover:text-cta-default cursor-help"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        >
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clip-rule="evenodd"
                          />
                      </svg>
                      <!-- Tooltip -->
                      <div
                        class="absolute left-0 bottom-full mb-2 w-64 p-2 bg-surface-raised text-text-inverse text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10"
                        >
                        {{ depositTooltipText }}
                        <div
                          class="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"
                        ></div>
                      </div>
                    </button>
                  </div>
                  <p class="text-xs text-cta-default mt-1">
                    Se devuelve al finalizar el alquiler sin daños
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-cta-default">
                    {{ formatCurrency(depositAmount, booking.currency) }}
                  </p>
                </div>
              </div>
            }
            <!-- Payment method info -->
            @if (booking.payment_method) {
              <div
                class="text-xs text-text-secondary flex items-start gap-2"
                >
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                    />
                </svg>
                <span>
                  {{ getPaymentMethodDescription(booking.payment_method) }}
                </span>
              </div>
            }
          </div>
          <!-- Divider -->
          <div class="border-t border-border-muted"></div>
          <!-- Total Amount -->
          <div class="flex items-center justify-between pt-2">
            <div>
              <h4 class="text-base font-semibold text-text-primary">
                Total Bloqueado
              </h4>
              <p class="text-xs text-text-secondary mt-0.5">
                Incluye alquiler + depósito de garantía
              </p>
            </div>
            <div class="text-right">
              <p class="text-xl font-bold text-cta-default">
                {{ formatCurrency(totalAmount, booking.currency) }}
              </p>
            </div>
          </div>
          <!-- Important note -->
          <div
            class="mt-4 p-3 bg-warning-bg border border-warning-border rounded-lg"
            >
            <div class="flex items-start gap-2">
              <svg
                class="w-5 h-5 text-warning-text flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                  />
              </svg>
              <div class="flex-1">
                <p class="text-xs font-medium text-warning-strong">
                  Importante
                </p>
                <p class="text-xs text-warning-strong mt-1">
                  El depósito de garantía se devuelve automáticamente al finalizar el alquiler si no
                  hay daños reportados. El monto del alquiler se cobra inmediatamente.
                </p>
              </div>
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
    `,
  ],
})
export class BookingPricingBreakdownComponent {
  @Input({ required: true }) booking!: Booking;
  @Input() subscriptionCoverage?: SubscriptionCoverageInfo;

  protected readonly rentalTooltipText =
    'Incluye la tarifa diaria del vehículo, el aporte FGO (garantía de alquileres) y el cargo de servicio de la plataforma. Este monto se cobra inmediatamente al confirmar la reserva.';

  protected readonly depositTooltipText =
    'El depósito de garantía cubre posibles daños al vehículo durante el alquiler. Se bloquea al inicio y se devuelve automáticamente al finalizar el alquiler si no hay daños reportados.';

  protected get rentalAmount(): number {
    // Rental amount is breakdown total minus deposit
    if (this.booking.rental_amount_cents) {
      return this.booking.rental_amount_cents;
    }
    // Fallback: calculate from breakdown
    const total = this.booking.breakdown?.total_cents || this.booking.total_cents || 0;
    const deposit = this.depositAmount;
    return total - deposit;
  }

  protected get depositAmount(): number {
    // If subscription covers the deposit, use the adjusted amount
    if (this.subscriptionCoverage) {
      if (this.subscriptionCoverage.coverageType === 'full_subscription') {
        return 0;
      }
      if (this.subscriptionCoverage.coverageType === 'partial_subscription') {
        return this.subscriptionCoverage.depositRequiredUsd * 100;
      }
    }

    // Standard deposit calculation
    if (this.booking.deposit_amount_cents) {
      return this.booking.deposit_amount_cents;
    }
    // Fallback to breakdown or default
    return this.booking.breakdown?.deposit_cents || 25000; // Default 250 USD
  }

  protected get totalAmount(): number {
    return this.rentalAmount + this.depositAmount;
  }

  /**
   * Effective deposit for display (considers subscription coverage)
   */
  protected get effectiveDepositDisplay(): number {
    if (this.subscriptionCoverage?.coverageType === 'full_subscription') {
      return 0;
    }
    if (this.subscriptionCoverage?.coverageType === 'partial_subscription') {
      return this.subscriptionCoverage.depositRequiredUsd * 100;
    }
    return this.depositAmount;
  }

  protected get dailyRateTotal(): number {
    if (this.booking.breakdown?.nightly_rate_cents && this.booking.days_count) {
      return this.booking.breakdown.nightly_rate_cents * this.booking.days_count;
    }
    return 0;
  }

  protected get deliveryFee(): number {
    return this.booking.delivery_fee_cents || 0;
  }

  // ✅ NEW: Distance tier properties and methods
  protected get distanceTier(): string | null {
    return this.booking.distance_risk_tier || null;
  }

  protected get deliveryDistanceKm(): number {
    return this.booking.delivery_distance_km || 0;
  }

  protected getDistanceTierLabel(): string {
    switch (this.distanceTier) {
      case 'local':
        return '📍 Local';
      case 'regional':
        return '🚗 Regional';
      case 'long_distance':
        return '🛣️ Larga distancia';
      default:
        return '';
    }
  }

  protected getDistanceTierBadgeClass(): string {
    const baseClasses =
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full';

    switch (this.distanceTier) {
      case 'local':
        return `${baseClasses} bg-green-50 text-green-700 border border-green-200`;
      case 'regional':
        return `${baseClasses} bg-yellow-50 text-yellow-700 border border-yellow-200`;
      case 'long_distance':
        return `${baseClasses} bg-red-50 text-red-700 border border-red-200`;
      default:
        return baseClasses;
    }
  }

  protected formatCurrency(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  protected getPaymentMethodDescription(method: string): string {
    const descriptions: Record<string, string> = {
      credit_card:
        'El depósito se bloquea en tu tarjeta de crédito. No se cobra, solo se reserva el monto.',
      wallet:
        'El depósito se bloquea en tu wallet AutoRenta. Queda disponible para futuras reservas.',
      partial_wallet: 'El depósito se divide entre tu wallet y tarjeta de crédito.',
    };
    return descriptions[method] || 'Método de pago confirmado.';
  }
}
