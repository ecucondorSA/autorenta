import { Component, Input, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettlementService } from '../../../../core/services/settlement.service';
import { WaterfallBreakdown, EligibilityResult, centsToUsd } from '../../../../core/models/fgo-v1-1.model';

/**
 * Waterfall Simulator Component
 *
 * Simula el flujo de waterfall (cascada de cobros) sin ejecutarlo
 * Muestra visualmente cómo se distribuyen los cobros:
 * 1. Hold de tarjeta (si aplica)
 * 2. Débito de wallet (si aplica)
 * 3. Cargos adicionales (hasta franquicia)
 * 4. Cobertura FGO
 * 5. Monto sin cubrir
 */
@Component({
  selector: 'app-waterfall-simulator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="waterfall-simulator">
      <h3 class="simulator-title">Simulador de Waterfall</h3>
      <p class="simulator-description">
        Simula el flujo de cobros sin ejecutar transacciones reales
      </p>

      <!-- Input Form -->
      <form [formGroup]="form" class="simulator-form">
        <div class="form-group">
          <label class="form-label">Monto del Claim (USD)</label>
          <div class="input-with-addon">
            <span class="addon">$</span>
            <input
              type="number"
              formControlName="claimAmount"
              [max]="10000"
              min="1"
              step="10"
              placeholder="100"
              class="form-input"
              (input)="onAmountChange()"
            />
          </div>
          <span class="hint-text">Monto estimado del siniestro en USD</span>
        </div>

        <button
          type="button"
          class="btn-primary"
          (click)="simulate()"
          [disabled]="form.invalid || simulating()"
        >
          <svg *ngIf="!simulating()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div *ngIf="simulating()" class="spinner-small"></div>
          {{ simulating() ? 'Simulando...' : 'Simular Waterfall' }}
        </button>
      </form>

      <!-- Error Message -->
      <div *ngIf="error()" class="alert alert-error">
        <svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        {{ error() }}
      </div>

      <!-- Eligibility Result -->
      <div *ngIf="eligibility()" class="eligibility-card">
        <div class="eligibility-header">
          <h4 class="eligibility-title">Elegibilidad FGO</h4>
          <span class="eligibility-badge" [class.eligible]="eligibility()!.eligible" [class.not-eligible]="!eligibility()!.eligible">
            {{ eligibility()!.eligible ? 'ELEGIBLE' : 'NO ELEGIBLE' }}
          </span>
        </div>
        <div *ngIf="!eligibility()!.eligible" class="eligibility-reasons">
          <span class="reason-label">Razones:</span>
          <ul class="reason-list">
            <li *ngFor="let reason of eligibility()!.reasons">{{ reason }}</li>
          </ul>
        </div>
        <div *ngIf="eligibility()!.eligible" class="eligibility-info">
          <div class="info-row">
            <span>Cobertura Máxima:</span>
            <span class="info-value">\${{ formatAmount(eligibility()!.maxCoverCents) }}</span>
          </div>
        </div>
      </div>

      <!-- Waterfall Visualization -->
      <div *ngIf="breakdown()" class="waterfall-visualization">
        <h4 class="waterfall-title">Distribución de Cobros</h4>

        <div class="waterfall-steps">
          <!-- Step 1: Hold Captured -->
          <div class="waterfall-step" *ngIf="breakdown()!.holdCaptured > 0">
            <div class="step-header">
              <div class="step-icon hold">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="step-info">
                <span class="step-label">Hold de Tarjeta</span>
                <span class="step-description">Captura de hold preautorizado</span>
              </div>
            </div>
            <div class="step-amount">\${{ formatAmount(breakdown()!.holdCaptured) }}</div>
            <div class="step-bar">
              <div class="step-fill hold" [style.width.%]="calculatePercentage(breakdown()!.holdCaptured)"></div>
            </div>
          </div>

          <!-- Step 2: Wallet Debited -->
          <div class="waterfall-step" *ngIf="breakdown()!.walletDebited > 0">
            <div class="step-header">
              <div class="step-icon wallet">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" />
                </svg>
              </div>
              <div class="step-info">
                <span class="step-label">Débito de Wallet</span>
                <span class="step-description">Crédito de seguridad del wallet</span>
              </div>
            </div>
            <div class="step-amount">\${{ formatAmount(breakdown()!.walletDebited) }}</div>
            <div class="step-bar">
              <div class="step-fill wallet" [style.width.%]="calculatePercentage(breakdown()!.walletDebited)"></div>
            </div>
          </div>

          <!-- Step 3: Extra Charged -->
          <div class="waterfall-step" *ngIf="breakdown()!.extraCharged > 0">
            <div class="step-header">
              <div class="step-icon extra">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="step-info">
                <span class="step-label">Cargo Adicional</span>
                <span class="step-description">Hasta completar franquicia</span>
              </div>
            </div>
            <div class="step-amount">\${{ formatAmount(breakdown()!.extraCharged) }}</div>
            <div class="step-bar">
              <div class="step-fill extra" [style.width.%]="calculatePercentage(breakdown()!.extraCharged)"></div>
            </div>
          </div>

          <!-- Step 4: FGO Paid -->
          <div class="waterfall-step" *ngIf="breakdown()!.fgoPaid > 0">
            <div class="step-header">
              <div class="step-icon fgo">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="step-info">
                <span class="step-label">Cobertura FGO</span>
                <span class="step-description">Fondo de Garantía del Organizador</span>
              </div>
            </div>
            <div class="step-amount">\${{ formatAmount(breakdown()!.fgoPaid) }}</div>
            <div class="step-bar">
              <div class="step-fill fgo" [style.width.%]="calculatePercentage(breakdown()!.fgoPaid)"></div>
            </div>
          </div>

          <!-- Step 5: Remaining Uncovered -->
          <div class="waterfall-step warning" *ngIf="breakdown()!.remainingUncovered > 0">
            <div class="step-header">
              <div class="step-icon uncovered">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="step-info">
                <span class="step-label">Sin Cubrir</span>
                <span class="step-description">Monto que no puede ser recuperado</span>
              </div>
            </div>
            <div class="step-amount warning">\${{ formatAmount(breakdown()!.remainingUncovered) }}</div>
            <div class="step-bar">
              <div class="step-fill uncovered" [style.width.%]="calculatePercentage(breakdown()!.remainingUncovered)"></div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="waterfall-summary">
          <div class="summary-row">
            <span>Total Claim:</span>
            <span class="summary-value">\${{ formatAmount(totalClaim()) }}</span>
          </div>
          <div class="summary-row">
            <span>Total Recuperado:</span>
            <span class="summary-value success">\${{ formatAmount(totalRecovered()) }}</span>
          </div>
          <div class="summary-row" *ngIf="breakdown()!.remainingUncovered > 0">
            <span>Sin Cubrir:</span>
            <span class="summary-value warning">\${{ formatAmount(breakdown()!.remainingUncovered) }}</span>
          </div>
          <div class="summary-row total">
            <span>Recovery Rate:</span>
            <span class="summary-value">{{ recoveryRate() }}%</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .waterfall-simulator {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .simulator-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.5rem;
    }

    .simulator-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .simulator-form {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .input-with-addon {
      display: flex;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      overflow: hidden;
    }

    .input-with-addon:focus-within {
      border-color: #3b82f6;
      ring: 2px;
      ring-color: #dbeafe;
    }

    .addon {
      display: flex;
      align-items: center;
      padding: 0 1rem;
      background: #f9fafb;
      border-right: 1px solid #d1d5db;
      font-weight: 600;
      color: #6b7280;
    }

    .form-input {
      flex: 1;
      padding: 0.75rem;
      border: none;
      font-size: 1rem;
    }

    .form-input:focus {
      outline: none;
    }

    .hint-text {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner-small {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
    }

    .alert-error {
      background: #fee2e2;
      color: #991b1b;
    }

    .alert-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .eligibility-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .eligibility-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .eligibility-title {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    .eligibility-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .eligibility-badge.eligible {
      background: #d1fae5;
      color: #065f46;
    }

    .eligibility-badge.not-eligible {
      background: #fee2e2;
      color: #991b1b;
    }

    .eligibility-reasons {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .reason-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
    }

    .reason-list {
      list-style: disc;
      padding-left: 1.5rem;
      color: #991b1b;
      font-size: 0.875rem;
    }

    .eligibility-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: #374151;
    }

    .info-value {
      font-weight: 600;
      color: #065f46;
    }

    .waterfall-visualization {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .waterfall-title {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1.5rem;
    }

    .waterfall-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .waterfall-step {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .waterfall-step.warning {
      border-color: #fbbf24;
      background: #fffbeb;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .step-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-icon svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .step-icon.hold {
      background: #dbeafe;
      color: #1e40af;
    }

    .step-icon.wallet {
      background: #e0e7ff;
      color: #4338ca;
    }

    .step-icon.extra {
      background: #fef3c7;
      color: #92400e;
    }

    .step-icon.fgo {
      background: #d1fae5;
      color: #065f46;
    }

    .step-icon.uncovered {
      background: #fee2e2;
      color: #991b1b;
    }

    .step-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .step-label {
      font-weight: 600;
      color: #111827;
      font-size: 0.875rem;
    }

    .step-description {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .step-amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #059669;
      margin-bottom: 0.5rem;
    }

    .step-amount.warning {
      color: #dc2626;
    }

    .step-bar {
      height: 0.5rem;
      background: #e5e7eb;
      border-radius: 0.25rem;
      overflow: hidden;
    }

    .step-fill {
      height: 100%;
      transition: width 0.5s ease;
    }

    .step-fill.hold {
      background: #3b82f6;
    }

    .step-fill.wallet {
      background: #6366f1;
    }

    .step-fill.extra {
      background: #f59e0b;
    }

    .step-fill.fgo {
      background: #10b981;
    }

    .step-fill.uncovered {
      background: #ef4444;
    }

    .waterfall-summary {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 2px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 1rem;
      color: #374151;
    }

    .summary-row.total {
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
      font-weight: 700;
      font-size: 1.125rem;
    }

    .summary-value {
      font-weight: 600;
      color: #111827;
    }

    .summary-value.success {
      color: #059669;
    }

    .summary-value.warning {
      color: #dc2626;
    }

    @media (max-width: 640px) {
      .simulator-form {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-primary {
        width: 100%;
        justify-content: center;
      }
    }
  `],
})
export class WaterfallSimulatorComponent implements OnInit {
  @Input() bookingId!: string;

  private readonly settlementService = inject(SettlementService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    claimAmount: [0, [Validators.required, Validators.min(1), Validators.max(10000)]],
  });

  readonly simulating = signal(false);
  readonly error = signal<string | null>(null);
  readonly eligibility = signal<EligibilityResult | null>(null);
  readonly breakdown = signal<WaterfallBreakdown | null>(null);

  readonly totalClaim = computed(() => {
    if (!this.breakdown()) return 0;
    const b = this.breakdown()!;
    return b.holdCaptured + b.walletDebited + b.extraCharged + b.fgoPaid + b.remainingUncovered;
  });

  readonly totalRecovered = computed(() => {
    if (!this.breakdown()) return 0;
    const b = this.breakdown()!;
    return b.holdCaptured + b.walletDebited + b.extraCharged + b.fgoPaid;
  });

  readonly recoveryRate = computed(() => {
    const total = this.totalClaim();
    if (total === 0) return 0;
    return Math.round((this.totalRecovered() / total) * 100);
  });

  ngOnInit(): void {
    // Set default value
    this.form.patchValue({ claimAmount: 500 });
  }

  onAmountChange(): void {
    // Clear previous results when amount changes
    this.eligibility.set(null);
    this.breakdown.set(null);
    this.error.set(null);
  }

  async simulate(): Promise<void> {
    if (this.form.invalid) return;

    this.simulating.set(true);
    this.error.set(null);

    try {
      const amount = this.form.value.claimAmount || 0;
      const result = await this.settlementService.simulateWaterfall(this.bookingId, amount);

      if (result.eligibility && result.estimatedBreakdown) {
        this.eligibility.set(result.eligibility);
        this.breakdown.set(result.estimatedBreakdown as WaterfallBreakdown);
      } else {
        this.error.set('No se pudo simular el waterfall. Verifica que el booking tenga un snapshot de riesgo.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al simular waterfall');
    } finally {
      this.simulating.set(false);
    }
  }

  formatAmount(cents: number): string {
    return centsToUsd(cents).toFixed(2);
  }

  calculatePercentage(amount: number): number {
    const total = this.totalClaim();
    if (total === 0) return 0;
    return (amount / total) * 100;
  }
}
