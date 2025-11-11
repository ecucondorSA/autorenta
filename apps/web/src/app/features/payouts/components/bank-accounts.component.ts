import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PayoutService, BankAccount } from '../../../core/services/payout.service';
import { take } from 'rxjs/operators';

/**
 * Bank Accounts Component
 *
 * Manages user's bank accounts (CBU/CVU)
 * - List all accounts
 * - Add new account
 * - Set default account
 * - Delete account
 */
@Component({
  selector: 'app-bank-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bank-accounts">
      <!-- Accounts List -->
      <div class="accounts-list" *ngIf="accounts().length > 0">
        <div
          *ngFor="let account of accounts()"
          class="account-card"
          [class.default]="account.isDefault"
        >
          <div class="account-info">
            <div class="account-header">
              <h4 class="account-holder">{{ account.accountHolder }}</h4>
              <span *ngIf="account.isDefault" class="badge badge-primary"> Predeterminada </span>
              <span *ngIf="!account.isDefault" class="badge badge-secondary"> Adicional </span>
            </div>
            <div class="account-details">
              <span class="account-type">
                {{ account.accountType === 'checking' ? 'Cuenta Corriente' : 'Caja de Ahorro' }}
              </span>
              <span class="account-number">
                {{ formatAccountNumber(account.accountNumber) }}
              </span>
            </div>
            <div class="account-status">
              <span
                class="status-badge"
                [class.verified]="account.status === 'verified'"
                [class.unverified]="account.status === 'unverified'"
                [class.invalid]="account.status === 'invalid'"
              >
                {{ getStatusText(account.status) }}
              </span>
            </div>
          </div>
          <div class="account-actions">
            <button
              *ngIf="!account.isDefault"
              type="button"
              class="btn-text"
              (click)="setAsDefault(account.id)"
              [disabled]="loading()"
            >
              Usar como predeterminada
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="accounts().length === 0" class="empty-state">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        <p class="empty-text">No tenés cuentas bancarias configuradas</p>
        <p class="empty-hint">Agregá una cuenta para poder retirar fondos</p>
      </div>

      <!-- Add Account Button -->
      <button type="button" class="btn-secondary" (click)="toggleAddForm()" *ngIf="!showAddForm()">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Agregar Cuenta Bancaria
      </button>

      <!-- Add Account Form -->
      <div *ngIf="showAddForm()" class="add-form">
        <h3 class="form-title">Nueva Cuenta Bancaria</h3>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Titular de la Cuenta</label>
            <input
              type="text"
              formControlName="accountHolder"
              placeholder="Juan Pérez"
              class="form-input"
            />
            <span
              *ngIf="form.controls.accountHolder.invalid && form.controls.accountHolder.touched"
              class="error-text"
            >
              El nombre del titular es requerido
            </span>
          </div>

          <div class="form-group">
            <label>CBU/CVU</label>
            <input
              type="text"
              formControlName="accountNumber"
              placeholder="0000003100010000000000"
              maxlength="22"
              class="form-input"
            />
            <span class="hint-text">22 dígitos sin espacios</span>
            <span
              *ngIf="form.controls.accountNumber.invalid && form.controls.accountNumber.touched"
              class="error-text"
            >
              CBU/CVU debe tener 22 dígitos
            </span>
          </div>

          <div class="form-group">
            <label>Tipo de Cuenta</label>
            <select formControlName="accountType" class="form-select">
              <option value="savings">Caja de Ahorro</option>
              <option value="checking">Cuenta Corriente</option>
            </select>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="isDefault" />
              <span>Usar como cuenta predeterminada</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-text" (click)="toggleAddForm()" [disabled]="loading()">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Guardando...' : 'Agregar Cuenta' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Error Message -->
      <div *ngIf="error()" class="alert alert-error">
        {{ error() }}
      </div>

      <!-- Success Message -->
      <div *ngIf="success()" class="alert alert-success">
        {{ success() }}
      </div>
    </div>
  `,
  styles: [
    `
      .bank-accounts {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .accounts-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .account-card {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        transition: all 0.2s;
      }

      .account-card:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .account-card.default {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .account-info {
        margin-bottom: 0.75rem;
      }

      .account-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .account-holder {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
      }

      .badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-weight: 500;
      }

      .badge-primary {
        background: #dbeafe;
        color: #1e40af;
      }

      .badge-secondary {
        background: #f3f4f6;
        color: #6b7280;
      }

      .account-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .account-number {
        font-family: var(--font-mono);
        font-size: 0.875rem;
      }

      .account-status {
        margin-top: 0.5rem;
      }

      .status-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-weight: 500;
      }

      .status-badge.verified {
        background: #d1fae5;
        color: #065f46;
      }

      .status-badge.unverified {
        background: #fef3c7;
        color: #92400e;
      }

      .status-badge.invalid {
        background: #fee2e2;
        color: #991b1b;
      }

      .account-actions {
        display: flex;
        gap: 0.5rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        text-align: center;
      }

      .empty-icon {
        width: 3rem;
        height: 3rem;
        color: #9ca3af;
        margin-bottom: 1rem;
      }

      .empty-text {
        font-size: 1rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.25rem;
      }

      .empty-hint {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .add-form {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        background: #f9fafb;
      }

      .form-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 1rem;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.25rem;
      }

      .form-input,
      .form-select {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      .form-input:focus,
      .form-select:focus {
        outline: none;
        border-color: #3b82f6;
        ring: 2px;
        ring-color: #dbeafe;
      }

      .hint-text {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .error-text {
        display: block;
        font-size: 0.75rem;
        color: #dc2626;
        margin-top: 0.25rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      .checkbox-label input[type='checkbox'] {
        width: 1rem;
        height: 1rem;
      }

      .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }

      .btn-primary,
      .btn-secondary,
      .btn-text {
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
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
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: white;
        color: #3b82f6;
        border: 1px solid #3b82f6;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #eff6ff;
      }

      .btn-text {
        background: transparent;
        color: #6b7280;
      }

      .btn-text:hover:not(:disabled) {
        color: #111827;
      }

      .btn-primary:disabled,
      .btn-secondary:disabled,
      .btn-text:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .alert {
        padding: 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      .alert-error {
        background: #fee2e2;
        color: #991b1b;
      }

      .alert-success {
        background: #d1fae5;
        color: #065f46;
      }
    `,
  ],
})
export class BankAccountsComponent implements OnInit {
  @Input() userId!: string;
  @Output() accountUpdated = new EventEmitter<void>();

  private readonly payoutService = inject(PayoutService);
  private readonly fb = inject(FormBuilder);

  readonly accounts = signal<BankAccount[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showAddForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    accountHolder: ['', Validators.required],
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d{22}$/)]],
    accountType: ['savings' as 'savings' | 'checking', Validators.required],
    bankCode: [''],
    isDefault: [false],
  });

  ngOnInit(): void {
    void this.loadAccounts();
  }

  async loadAccounts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const accounts = await this.payoutService
        .getUserBankAccounts(this.userId)
        .pipe(take(1))
        .toPromise();

      this.accounts.set(accounts || []);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar cuentas');
    } finally {
      this.loading.set(false);
    }
  }

  toggleAddForm(): void {
    this.showAddForm.set(!this.showAddForm());
    if (!this.showAddForm()) {
      this.form.reset({ accountType: 'savings', isDefault: false });
      this.error.set(null);
      this.success.set(null);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const formValue = this.form.getRawValue();
      await this.payoutService
        .addBankAccount(this.userId, {
          accountHolder: formValue.accountHolder,
          accountNumber: formValue.accountNumber,
          accountType: formValue.accountType,
          bankCode: formValue.bankCode || 'AUTO',
          isDefault: formValue.isDefault,
        })
        .pipe(take(1))
        .toPromise();

      this.success.set('Cuenta bancaria agregada exitosamente');
      this.form.reset({ accountType: 'savings', isDefault: false });
      this.showAddForm.set(false);
      await this.loadAccounts();
      this.accountUpdated.emit();

      setTimeout(() => this.success.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al agregar cuenta');
    } finally {
      this.loading.set(false);
    }
  }

  async setAsDefault(accountId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.payoutService
        .setDefaultBankAccount(this.userId, accountId)
        .pipe(take(1))
        .toPromise();

      this.success.set('Cuenta predeterminada actualizada');
      await this.loadAccounts();
      this.accountUpdated.emit();

      setTimeout(() => this.success.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al actualizar cuenta');
    } finally {
      this.loading.set(false);
    }
  }

  formatAccountNumber(accountNumber: string): string {
    // Format: 0000 0031 0001 0000 0000 00
    return accountNumber.replace(/(\d{4})/g, '$1 ').trim();
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      verified: 'Verificada',
      unverified: 'Sin verificar',
      invalid: 'Inválida',
    };
    return statusMap[status] || status;
  }
}
