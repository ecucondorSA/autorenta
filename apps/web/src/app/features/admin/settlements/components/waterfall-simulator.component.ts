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
  templateUrl: './waterfall-simulator.component.html',
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
