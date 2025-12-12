import { CommonModule } from '@angular/common';
import {Component, computed, EventEmitter, inject, Input, Output, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { BankAccount, PayoutService } from '../../../core/services/payout.service';

/**
 * Request Payout Modal Component
 *
 * Modal for requesting a payout from wallet to bank account
 */
@Component({
  selector: 'app-request-payout-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Solicitar Retiro</h2>
          <button type="button" class="close-button" (click)="onClose()">
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

        <div class="modal-body">
          <!-- Bank Account Info -->
          <div class="info-card" *ngIf="defaultBankAccount">
            <h3 class="info-title">Cuenta Destino</h3>
            <div class="bank-info">
              <div class="bank-holder">{{ defaultBankAccount.accountHolder }}</div>
              <div class="bank-number">
                {{ formatAccountNumber(defaultBankAccount.accountNumber) }}
              </div>
              <div class="bank-type">
                {{
                  defaultBankAccount.accountType === 'checking'
                    ? 'Cuenta Corriente'
                    : 'Caja de Ahorro'
                }}
              </div>
            </div>
          </div>

          <!-- Request Form -->
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label">Monto a Retirar</label>
              <div class="input-with-addon">
                <span class="addon">$</span>
                <input
                  type="number"
                  formControlName="amount"
                  [max]="maxAmount"
                  min="1000"
                  step="100"
                  placeholder="1000"
                  class="form-input"
                />
              </div>
              <div class="form-hints">
                <span class="hint-text">Disponible: {{ formattedMaxAmount() }}</span>
                <span class="hint-text">Mínimo: ARS 1.000</span>
              </div>
              <div
                *ngIf="form.controls.amount.invalid && form.controls.amount.touched"
                class="error-messages"
              >
                <span *ngIf="form.controls.amount.errors?.['required']" class="error-text">
                  El monto es requerido
                </span>
                <span *ngIf="form.controls.amount.errors?.['min']" class="error-text">
                  El monto mínimo es ARS 1.000
                </span>
                <span *ngIf="form.controls.amount.errors?.['max']" class="error-text">
                  No tenés suficiente saldo disponible
                </span>
              </div>
            </div>

            <!-- Quick Amount Buttons -->
            <div class="quick-amounts">
              <button
                type="button"
                class="quick-amount-btn"
                *ngFor="let preset of quickAmounts()"
                (click)="setAmount(preset.value)"
                [disabled]="preset.value > maxAmount"
              >
                {{ preset.label }}
              </button>
            </div>

            <!-- Preview -->
            <div class="preview-card" *ngIf="form.value.amount && form.value.amount >= 1000">
              <h3 class="preview-title">Resumen</h3>
              <div class="preview-row">
                <span>Monto solicitado</span>
                <span class="preview-value">{{
                  form.value.amount | number: '1.0-0' | currency: 'ARS' : 'symbol-narrow'
                }}</span>
              </div>
              <div class="preview-row">
                <span>Comisión</span>
                <span class="preview-value">{{
                  calculateFee() | number: '1.0-0' | currency: 'ARS' : 'symbol-narrow'
                }}</span>
              </div>
              <div class="preview-row total">
                <span>Recibirás</span>
                <span class="preview-value">{{
                  calculateNet() | number: '1.0-0' | currency: 'ARS' : 'symbol-narrow'
                }}</span>
              </div>
              <p class="preview-hint">El depósito se procesará en 1-3 días hábiles</p>
            </div>

            <!-- Error Message -->
            <div *ngIf="error()" class="alert alert-error">
              <svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ error() }}
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                (click)="onClose()"
                [disabled]="submitting()"
              >
                Cancelar
              </button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || submitting()">
                <div *ngIf="submitting()" class="spinner-small"></div>
                {{ submitting() ? 'Procesando...' : 'Solicitar Retiro' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: #4E4E4E;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }

      .modal-content {
        background: white;
        border-radius: 0.75rem;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .modal-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
      }

      .close-button {
        padding: 0.5rem;
        border: none;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        border-radius: 0.375rem;
        transition: all 0.2s;
      }

      .close-button:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .modal-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .info-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
      }

      .info-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }

      .bank-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .bank-holder {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
      }

      .bank-number {
        font-family: var(--font-mono);
        font-size: 0.875rem;
        color: #6b7280;
      }

      .bank-type {
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .form-group {
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

      .form-hints {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #6b7280;
      }

      .error-messages {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .error-text {
        font-size: 0.75rem;
        color: #dc2626;
      }

      .quick-amounts {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
      }

      .quick-amount-btn {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
      }

      .quick-amount-btn:hover:not(:disabled) {
        border-color: #3b82f6;
        background: #eff6ff;
        color: #3b82f6;
      }

      .quick-amount-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .preview-card {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 0.5rem;
        padding: 1rem;
      }

      .preview-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #166534;
        margin-bottom: 0.75rem;
      }

      .preview-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        color: #166534;
        margin-bottom: 0.5rem;
      }

      .preview-row.total {
        font-size: 1rem;
        font-weight: 700;
        padding-top: 0.5rem;
        border-top: 1px solid #bbf7d0;
        margin-top: 0.5rem;
      }

      .preview-value {
        font-weight: 600;
      }

      .preview-hint {
        font-size: 0.75rem;
        color: #16a34a;
        margin-top: 0.5rem;
      }

      .alert {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 0.375rem;
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

      .modal-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }

      .btn-primary,
      .btn-secondary {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #2563eb;
      }

      .btn-secondary {
        background: white;
        color: #6b7280;
        border: 1px solid #d1d5db;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #f9fafb;
        color: #111827;
      }

      .btn-primary:disabled,
      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .spinner-small {
        width: 1rem;
        height: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 640px) {
        .modal-overlay {
          padding: 0;
        }

        .modal-content {
          max-width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }

        .quick-amounts {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class RequestPayoutModalComponent {
  @Input() userId!: string;
  @Input() maxAmount!: number;
  @Input() defaultBankAccount!: BankAccount | null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() payoutRequested = new EventEmitter<void>();

  private readonly payoutService = inject(PayoutService);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1000), Validators.max(this.maxAmount)]],
  });

  readonly formattedMaxAmount = computed(() => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(this.maxAmount);
  });

  readonly quickAmounts = computed(() => {
    const amounts = [
      { label: 'ARS 5.000', value: 5000 },
      { label: 'ARS 10.000', value: 10000 },
      { label: 'ARS 20.000', value: 20000 },
      { label: 'ARS 50.000', value: 50000 },
      { label: 'ARS 100.000', value: 100000 },
      { label: 'Todo', value: this.maxAmount },
    ];
    return amounts.filter((a) => a.value <= 1000000); // Max allowed by service
  });

  onClose(): void {
    if (!this.submitting()) {
      this.closeModal.emit();
    }
  }

  setAmount(amount: number): void {
    this.form.patchValue({ amount });
    this.form.controls.amount.markAsTouched();
  }

  calculateFee(): number {
    const amount = this.form.value.amount || 0;
    // Assume 2% fee for payouts
    return Math.round(amount * 0.02);
  }

  calculateNet(): number {
    const amount = this.form.value.amount || 0;
    return amount - this.calculateFee();
  }

  formatAccountNumber(accountNumber: string): string {
    return accountNumber.replace(/(\d{4})/g, '$1 ').trim();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.defaultBankAccount) return;

    this.submitting.set(true);
    this.error.set(null);

    try {
      const amount = this.form.value.amount || 0;

      await this.payoutService.requestPayout(this.userId, amount).pipe(take(1)).toPromise();

      this.payoutRequested.emit();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al solicitar retiro');
    } finally {
      this.submitting.set(false);
    }
  }
}
