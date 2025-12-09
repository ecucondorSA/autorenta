import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';
import { PaymentProvider } from '../../../../core/interfaces/payment-gateway.interface';

export interface BookingPaymentCoverage {
  paymentProvider: PaymentProvider;
  coverageLevel: 'basic' | 'standard' | 'premium';
  addDriverProtection: boolean;
  acceptTerms: boolean;
}

/**
 * BookingPaymentCoverageStepComponent - Step 2 of booking checkout wizard
 *
 * Allows user to select:
 * - Payment provider (MercadoPago, PayPal)
 * - Coverage level (basic, standard, premium)
 * - Additional driver protection
 * - Accept terms and conditions
 */
@Component({
  selector: 'app-booking-payment-coverage-step',
  standalone: true,
  imports: [CommonModule, FormsModule, WizardStepComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-wizard-step
      title="Pago y Cobertura"
      subtitle="Selecciona tu método de pago y nivel de cobertura"
    >
      <div class="payment-coverage-form">
        <!-- Payment Provider Section -->
        <div class="form-section">
          <h3 class="section-title">Método de Pago</h3>

          <div class="provider-options">
            <!-- MercadoPago -->
            <label
              class="provider-card"
              [class.selected]="localData.paymentProvider === 'mercadopago'"
            >
              <input
                type="radio"
                name="provider"
                value="mercadopago"
                [(ngModel)]="localData.paymentProvider"
                class="provider-radio"
              />
              <div class="provider-content">
                <div class="provider-header">
                  <svg class="provider-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                    />
                  </svg>
                  <span class="provider-name">MercadoPago</span>
                </div>
                <p class="provider-description">Paga en pesos argentinos (ARS)</p>
                <div class="provider-methods">
                  <span class="method-badge">Tarjeta</span>
                  <span class="method-badge">Efectivo</span>
                  <span class="method-badge">Débito</span>
                </div>
              </div>
            </label>

            <!-- PayPal -->
            <label class="provider-card" [class.selected]="localData.paymentProvider === 'paypal'">
              <input
                type="radio"
                name="provider"
                value="paypal"
                [(ngModel)]="localData.paymentProvider"
                class="provider-radio"
              />
              <div class="provider-content">
                <div class="provider-header">
                  <svg class="provider-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 01-.793.68H8.29c-.306 0-.555-.227-.597-.525L6.03 11.642a.805.805 0 01.793-.925h2.51a.805.805 0 00.794-.68l.047-.25.88-5.567.027-.15a.805.805 0 01.793-.68h2.847c1.889 0 3.18.393 3.943 1.205.35.375.601.823.757 1.336z"
                    />
                  </svg>
                  <span class="provider-name">PayPal</span>
                </div>
                <p class="provider-description">Paga en dólares (USD)</p>
                <div class="provider-methods">
                  <span class="method-badge">PayPal</span>
                  <span class="method-badge">Tarjeta</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Coverage Level Section -->
        <div class="form-section">
          <h3 class="section-title">Nivel de Cobertura</h3>

          <div class="coverage-options">
            <!-- Basic -->
            <label class="coverage-card" [class.selected]="localData.coverageLevel === 'basic'">
              <input
                type="radio"
                name="coverage"
                value="basic"
                [(ngModel)]="localData.coverageLevel"
                class="coverage-radio"
              />
              <div class="coverage-content">
                <div class="coverage-header">
                  <span class="coverage-name">Básica</span>
                  <span class="coverage-price">Incluida</span>
                </div>
                <ul class="coverage-features">
                  <li>Seguro obligatorio</li>
                  <li>Asistencia en ruta</li>
                  <li>Cobertura por daños a terceros</li>
                </ul>
              </div>
            </label>

            <!-- Standard -->
            <label
              class="coverage-card recommended"
              [class.selected]="localData.coverageLevel === 'standard'"
            >
              <div class="recommended-badge">Recomendado</div>
              <input
                type="radio"
                name="coverage"
                value="standard"
                [(ngModel)]="localData.coverageLevel"
                class="coverage-radio"
              />
              <div class="coverage-content">
                <div class="coverage-header">
                  <span class="coverage-name">Estándar</span>
                  <span class="coverage-price">+ $500/día</span>
                </div>
                <ul class="coverage-features">
                  <li>Todo lo de Básica</li>
                  <li>Cobertura por robo</li>
                  <li>Reducción de franquicia</li>
                  <li>Conductor adicional gratis</li>
                </ul>
              </div>
            </label>

            <!-- Premium -->
            <label class="coverage-card" [class.selected]="localData.coverageLevel === 'premium'">
              <input
                type="radio"
                name="coverage"
                value="premium"
                [(ngModel)]="localData.coverageLevel"
                class="coverage-radio"
              />
              <div class="coverage-content">
                <div class="coverage-header">
                  <span class="coverage-name">Premium</span>
                  <span class="coverage-price">+ $1,200/día</span>
                </div>
                <ul class="coverage-features">
                  <li>Todo lo de Estándar</li>
                  <li>Cobertura total sin franquicia</li>
                  <li>Asistencia 24/7</li>
                  <li>Vehículo de reemplazo</li>
                  <li>Cancelación gratuita</li>
                </ul>
              </div>
            </label>
          </div>
        </div>

        <!-- Additional Options Section -->
        <div class="form-section">
          <h3 class="section-title">Opciones Adicionales</h3>

          <label class="checkbox-card">
            <input
              type="checkbox"
              [(ngModel)]="localData.addDriverProtection"
              class="checkbox-input"
            />
            <div class="checkbox-content">
              <div class="checkbox-header">
                <span class="checkbox-name">Protección del Conductor</span>
                <span class="checkbox-price">+ $300/día</span>
              </div>
              <p class="checkbox-description">
                Cobertura médica y de responsabilidad civil para el conductor en caso de accidente.
              </p>
            </div>
          </label>
        </div>

        <!-- Terms Section -->
        <div class="form-section">
          <label class="terms-checkbox">
            <input
              type="checkbox"
              [(ngModel)]="localData.acceptTerms"
              class="checkbox-input"
              required
            />
            <span class="terms-text">
              Acepto los
              <a href="/legal/terms" target="_blank" class="terms-link">términos y condiciones</a>
              y la
              <a href="/legal/privacy" target="_blank" class="terms-link">política de privacidad</a>
            </span>
          </label>
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [
    `
      .payment-coverage-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .section-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      /* Provider Options */
      .provider-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .provider-card {
        position: relative;
        padding: 1.25rem;
        border: 2px solid var(--border-default);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-default);
      }

      .provider-card:hover {
        border-color: var(--border-focus);
        box-shadow: var(--elevation-2);
      }

      .provider-card.selected {
        border-color: var(--cta-default);
        background: var(--cta-default) / 5;
      }

      .provider-radio {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .provider-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .provider-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .provider-icon {
        width: 2rem;
        height: 2rem;
        color: var(--cta-default);
      }

      .provider-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .provider-description {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .provider-methods {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .method-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.625rem;
        background: var(--surface-hover);
        border-radius: var(--radius-sm);
        color: var(--text-secondary);
      }

      /* Coverage Options */
      .coverage-options {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }

      .coverage-card {
        position: relative;
        padding: 1.25rem;
        border: 2px solid var(--border-default);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-default);
      }

      .coverage-card:hover {
        border-color: var(--border-focus);
        box-shadow: var(--elevation-2);
      }

      .coverage-card.selected {
        border-color: var(--cta-default);
        background: var(--cta-default) / 5;
      }

      .coverage-card.recommended {
        border-color: var(--success-600);
      }

      .coverage-card.recommended.selected {
        border-color: var(--success-600);
        background: var(--success-600) / 10;
      }

      .recommended-badge {
        position: absolute;
        top: -0.625rem;
        right: 1rem;
        background: var(--success-600);
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-full);
      }

      .coverage-radio {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .coverage-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .coverage-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .coverage-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .coverage-price {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--cta-default);
      }

      .coverage-features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .coverage-features li {
        font-size: 0.8125rem;
        color: var(--text-secondary);
        padding-left: 1.25rem;
        position: relative;
      }

      .coverage-features li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--success-600);
        font-weight: 600;
      }

      /* Checkbox Card */
      .checkbox-card {
        display: flex;
        gap: 1rem;
        padding: 1.25rem;
        border: 2px solid var(--border-default);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-default);
      }

      .checkbox-card:hover {
        border-color: var(--border-focus);
        background: var(--surface-hover);
      }

      .checkbox-input {
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
        cursor: pointer;
      }

      .checkbox-content {
        flex: 1;
      }

      .checkbox-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .checkbox-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .checkbox-price {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--cta-default);
      }

      .checkbox-description {
        font-size: 0.8125rem;
        color: var(--text-secondary);
        margin: 0;
      }

      /* Terms */
      .terms-checkbox {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        cursor: pointer;
      }

      .terms-text {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .terms-link {
        color: var(--cta-default);
        text-decoration: underline;
      }

      .terms-link:hover {
        color: var(--cta-hover);
      }

      /* Mobile */
      @media (max-width: 768px) {
        .provider-options,
        .coverage-options {
          grid-template-columns: 1fr;
        }

        .recommended-badge {
          top: 1rem;
          right: 1rem;
        }
      }
    `,
  ],
})
export class BookingPaymentCoverageStepComponent {
  // ==================== INPUTS ====================

  /**
   * Initial data
   */
  data = input<BookingPaymentCoverage>({
    paymentProvider: 'mercadopago',
    coverageLevel: 'standard',
    addDriverProtection: false,
    acceptTerms: false,
  });

  // ==================== OUTPUTS ====================

  /**
   * Emitted when data changes
   */
  dataChange = output<BookingPaymentCoverage>();

  /**
   * Emitted when validation state changes
   */
  validChange = output<boolean>();

  // ==================== STATE ====================

  /**
   * Local editable data
   */
  localData: BookingPaymentCoverage = {
    paymentProvider: 'mercadopago',
    coverageLevel: 'standard',
    addDriverProtection: false,
    acceptTerms: false,
  };

  // ==================== COMPUTED ====================

  /**
   * Is form valid?
   */
  readonly isValid = computed(() => {
    return this.localData.acceptTerms;
  });

  // ==================== LIFECYCLE ====================

  constructor() {
    // Initialize local data from input
    effect(() => {
      this.localData = { ...this.data() };
    });

    // Emit changes when local data changes
    effect(() => {
      const valid = this.isValid();
      this.validChange.emit(valid);

      if (valid) {
        this.dataChange.emit({ ...this.localData });
      }
    });
  }
}
