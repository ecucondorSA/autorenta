import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';
import { BookingDatesLocation } from '../booking-dates-location-step/booking-dates-location-step.component';
import { BookingPaymentCoverage } from '../booking-payment-coverage-step/booking-payment-coverage-step.component';

/**
 * BookingConfirmationStepComponent - Step 3 (final) of booking checkout wizard
 *
 * Displays summary of all booking details for final confirmation
 */
@Component({
  selector: 'app-booking-confirmation-step',
  standalone: true,
  imports: [CommonModule, WizardStepComponent],
  template: `
    <app-wizard-step
      title="Confirmación"
      subtitle="Revisa todos los detalles antes de confirmar tu reserva"
    >
      <div class="confirmation-summary">
        <!-- Dates & Location Summary -->
        <div class="summary-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Fechas y Ubicación
          </h3>

          <div class="summary-grid">
            <div class="summary-item">
              <span class="item-label">Retiro</span>
              <span class="item-value"
                >{{ formatDate(datesLocation().startDate) }} a las
                {{ datesLocation().pickupTime }}</span
              >
            </div>
            <div class="summary-item">
              <span class="item-label">Devolución</span>
              <span class="item-value"
                >{{ formatDate(datesLocation().endDate) }} a las
                {{ datesLocation().dropoffTime }}</span
              >
            </div>
            <div class="summary-item">
              <span class="item-label">Lugar de Retiro</span>
              <span class="item-value">{{ datesLocation().pickupLocation }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Lugar de Devolución</span>
              <span class="item-value">{{ datesLocation().dropoffLocation }}</span>
            </div>
            <div class="summary-item highlight">
              <span class="item-label">Duración Total</span>
              <span class="item-value"
                >{{ durationDays() }} día{{ durationDays() > 1 ? 's' : '' }}</span
              >
            </div>
          </div>
        </div>

        <!-- Payment & Coverage Summary -->
        <div class="summary-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            Pago y Cobertura
          </h3>

          <div class="summary-grid">
            <div class="summary-item">
              <span class="item-label">Método de Pago</span>
              <span class="item-value">
                {{
                  paymentCoverage().paymentProvider === 'mercadopago'
                    ? 'MercadoPago (ARS)'
                    : 'PayPal (USD)'
                }}
              </span>
            </div>
            <div class="summary-item">
              <span class="item-label">Nivel de Cobertura</span>
              <span class="item-value">{{ getCoverageLevelLabel() }}</span>
            </div>
            @if (paymentCoverage().addDriverProtection) {
              <div class="summary-item">
                <span class="item-label">Protección del Conductor</span>
                <span class="item-value">✓ Incluida</span>
              </div>
            }
          </div>
        </div>

        <!-- Vehicle Summary -->
        @if (bookingData()) {
          <div class="summary-section">
            <h3 class="summary-title">
              <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Vehículo
            </h3>

            <div class="vehicle-card">
              <div class="vehicle-info">
                <h4 class="vehicle-name">
                  {{ bookingData()!.car?.brand }} {{ bookingData()!.car?.model }}
                </h4>
                <p class="vehicle-details">
                  {{ bookingData()!.car?.year }} • {{ bookingData()!.car?.category }}
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Price Breakdown -->
        <div class="summary-section price-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Desglose de Precio
          </h3>

          <div class="price-breakdown">
            @if (bookingData()) {
              <div class="price-row">
                <span class="price-label">Tarifa base ({{ durationDays() }} días)</span>
                <span class="price-value">{{
                  formatCurrency(bookingData()!.daily_rate * durationDays())
                }}</span>
              </div>
              <div class="price-row">
                <span class="price-label">Cobertura {{ getCoverageLevelLabel() }}</span>
                <span class="price-value">{{ formatCurrency(getCoverageCost()) }}</span>
              </div>
              @if (paymentCoverage().addDriverProtection) {
                <div class="price-row">
                  <span class="price-label">Protección del Conductor</span>
                  <span class="price-value">{{ formatCurrency(300 * durationDays()) }}</span>
                </div>
              }
              <div class="price-row">
                <span class="price-label">Comisión de servicio</span>
                <span class="price-value">{{
                  formatCurrency(bookingData()!.platform_fee || 0)
                }}</span>
              </div>

              <div class="price-divider"></div>

              <div class="price-row total">
                <span class="price-label">Total</span>
                <span class="price-value">{{ formatCurrency(totalPrice()) }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Important Notes -->
        <div class="summary-section notes-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Información Importante
          </h3>

          <ul class="notes-list">
            <li>Debes presentar tu licencia de conducir válida al momento del retiro</li>
            <li>El vehículo debe ser devuelto con el mismo nivel de combustible</li>
            <li>Los cargos adicionales (peajes, multas) corren por tu cuenta</li>
            <li>La cancelación gratuita está disponible hasta 24hs antes del retiro</li>
          </ul>
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [
    `
      .confirmation-summary {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .summary-section {
        background: var(--surface-base);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }

      .summary-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 1rem 0;
      }

      .title-icon {
        width: 1.5rem;
        height: 1.5rem;
        color: var(--cta-default);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .summary-item.highlight {
        grid-column: 1 / -1;
        padding: 0.75rem;
        background: var(--info-50);
        border-radius: var(--radius-md);
      }

      .item-label {
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }

      .item-value {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      /* Vehicle Card */
      .vehicle-card {
        padding: 1rem;
        background: var(--surface-hover);
        border-radius: var(--radius-md);
      }

      .vehicle-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 0.25rem 0;
      }

      .vehicle-details {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      /* Price Breakdown */
      .price-section {
        background: var(--surface-hover);
        border: 2px solid var(--cta-default) / 20;
      }

      .price-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .price-label {
        font-size: 0.9375rem;
        color: var(--text-primary);
      }

      .price-value {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .price-divider {
        height: 1px;
        background: var(--border-default);
        margin: 0.5rem 0;
      }

      .price-row.total {
        padding-top: 0.75rem;
      }

      .price-row.total .price-label {
        font-size: 1.125rem;
        font-weight: 700;
      }

      .price-row.total .price-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--cta-default);
      }

      /* Notes */
      .notes-section {
        background: var(--warning-50);
        border-color: var(--warning-200);
      }

      .notes-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .notes-list li {
        font-size: 0.875rem;
        color: var(--warning-900);
        padding-left: 1.5rem;
        position: relative;
      }

      .notes-list li::before {
        content: '•';
        position: absolute;
        left: 0.5rem;
        font-weight: 700;
        color: var(--warning-700);
      }

      /* Mobile */
      @media (max-width: 768px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }

        .summary-item.highlight {
          grid-column: 1;
        }
      }
    `,
  ],
})
export class BookingConfirmationStepComponent {
  // ==================== INPUTS ====================

  /**
   * Dates and location data
   */
  datesLocation = input.required<BookingDatesLocation>();

  /**
   * Payment and coverage data
   */
  paymentCoverage = input.required<BookingPaymentCoverage>();

  /**
   * Booking data from database
   */
  bookingData = input<Record<string, unknown> | null>(null);

  // ==================== COMPUTED ====================

  /**
   * Duration in days
   */
  readonly durationDays = computed(() => {
    const start = new Date(this.datesLocation().startDate);
    const end = new Date(this.datesLocation().endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  /**
   * Coverage cost
   */
  readonly getCoverageCost = computed(() => {
    const level = this.paymentCoverage().coverageLevel;
    const days = this.durationDays();

    switch (level) {
      case 'basic':
        return 0;
      case 'standard':
        return 500 * days;
      case 'premium':
        return 1200 * days;
      default:
        return 0;
    }
  });

  /**
   * Total price
   */
  readonly totalPrice = computed(() => {
    if (!this.bookingData()) return 0;

    const basePrice = this.bookingData()!.daily_rate * this.durationDays();
    const coverageCost = this.getCoverageCost();
    const driverProtection = this.paymentCoverage().addDriverProtection
      ? 300 * this.durationDays()
      : 0;
    const platformFee = this.bookingData()!.platform_fee || 0;

    return basePrice + coverageCost + driverProtection + platformFee;
  });

  // ==================== METHODS ====================

  /**
   * Format date for display
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get coverage level label
   */
  getCoverageLevelLabel(): string {
    const level = this.paymentCoverage().coverageLevel;
    switch (level) {
      case 'basic':
        return 'Básica';
      case 'standard':
        return 'Estándar';
      case 'premium':
        return 'Premium';
      default:
        return '';
    }
  }
}
