import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { BankAccount, RequestWithdrawalParams } from '../../../core/models/wallet.model';

/**
 * Componente para solicitar retiros
 */
@Component({
  selector: 'app-withdrawal-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './withdrawal-request-form.component.html',
  styleUrl: './withdrawal-request-form.component.css',
})
export class WithdrawalRequestFormComponent {
  @Input({ required: true }) availableBalance = 0;
  @Input({ required: true }) accounts: BankAccount[] = [];

  @Output() submitWithdrawal = new EventEmitter<RequestWithdrawalParams>();
  @Output() cancel = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly submitting = signal(false);
  readonly FEE_PERCENTAGE = 0.015; // 1.5%
  readonly MIN_AMOUNT = 100; // ARS

  readonly amount = signal(0);
  readonly selectedAccountId = signal<string | null>(null);

  // Computed values
  readonly feeAmount = computed(() => {
    const amt = this.amount();
    return amt > 0 ? Math.round(amt * this.FEE_PERCENTAGE * 100) / 100 : 0;
  });

  readonly netAmount = computed(() => {
    const amt = this.amount();
    const fee = this.feeAmount();
    return amt > 0 ? amt - fee : 0;
  });

  readonly totalDebit = computed(() => {
    const amt = this.amount();
    const fee = this.feeAmount();
    return amt + fee;
  });

  readonly hasEnoughBalance = computed(() => {
    return this.totalDebit() <= this.availableBalance;
  });

  readonly selectedAccount = computed(() => {
    const id = this.selectedAccountId();
    return this.accounts.find((acc) => acc.id === id) || null;
  });

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      bank_account_id: ['', Validators.required],
      amount: [
        '',
        [Validators.required, Validators.min(this.MIN_AMOUNT), Validators.max(999999)],
      ],
      user_notes: [''],
    });

    // Sync form values with signals
    effect(() => {
      const amountControl = this.form.get('amount');
      if (amountControl) {
        amountControl.valueChanges.subscribe((value: number) => {
          this.amount.set(value || 0);
        });
      }

      const accountControl = this.form.get('bank_account_id');
      if (accountControl) {
        accountControl.valueChanges.subscribe((value: string) => {
          this.selectedAccountId.set(value || null);
        });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.hasEnoughBalance()) {
      alert('Saldo insuficiente para completar el retiro');
      return;
    }

    this.submitting.set(true);

    const params: RequestWithdrawalParams = {
      bank_account_id: this.form.value.bank_account_id,
      amount: this.form.value.amount,
      user_notes: this.form.value.user_notes?.trim() || undefined,
    };

    this.submitWithdrawal.emit(params);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  setMaxAmount(): void {
    // Calcular el monto máximo que se puede retirar
    // max_amount = (available_balance / (1 + fee_percentage))
    const maxWithdrawal = Math.floor(this.availableBalance / (1 + this.FEE_PERCENTAGE));
    this.form.patchValue({ amount: maxWithdrawal });
  }

  getAccountLabel(account: BankAccount): string {
    const type = account.account_type.toUpperCase();
    const last4 = account.account_number.slice(-4);

    if (account.account_type === 'alias') {
      return `${type}: ${account.account_number}`;
    } else {
      return `${type}: •••• ${last4}`;
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);

    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es requerido';
    }

    if (control.errors['min']) {
      return `El monto mínimo es $${this.MIN_AMOUNT}`;
    }

    if (control.errors['max']) {
      return 'Monto demasiado alto';
    }

    return 'Campo inválido';
  }
}
