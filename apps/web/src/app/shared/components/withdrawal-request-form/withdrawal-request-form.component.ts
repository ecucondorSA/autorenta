import {Component, EventEmitter, Input, Output, signal, computed, DestroyRef, OnInit,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { BankAccount, RequestWithdrawalParams } from '../../../core/models/wallet.model';

/**
 * Componente para solicitar retiros
 *
 * ✅ SECURITY: Validaciones robustas de monto y disponibilidad
 */
@Component({
  selector: 'app-withdrawal-request-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './withdrawal-request-form.component.html',
  styleUrl: './withdrawal-request-form.component.css',
})
export class WithdrawalRequestFormComponent implements OnInit {
  @Input({ required: true }) availableBalance = 0;
  @Input() withdrawableBalance = 0;
  @Input() nonWithdrawableBalance = 0;
  @Input({ required: true }) accounts: BankAccount[] = [];

  @Output() submitWithdrawal = new EventEmitter<RequestWithdrawalParams>();
  @Output() cancelled = new EventEmitter<void>();

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
    return this.totalDebit() <= this.withdrawableBalance;
  });

  readonly selectedAccount = computed(() => {
    const id = this.selectedAccountId();
    return this.accounts.find((acc) => acc.id === id) || null;
  });

  constructor(private readonly fb: FormBuilder, private readonly destroyRef: DestroyRef) {
    this.form = this.fb.group({
      bank_account_id: ['', Validators.required],
      amount: [
        '',
        [
          Validators.required,
          Validators.min(this.MIN_AMOUNT),
          this.validateMaxWithdrawableAmount(),
        ],
      ],
      user_notes: [''],
    });
  }

  ngOnInit(): void {
    // Sync form values with signals
    const amountControl = this.form.get('amount');
    if (amountControl) {
      amountControl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value: number) => {
          this.amount.set(value || 0);
        });
    }

    const accountControl = this.form.get('bank_account_id');
    if (accountControl) {
      accountControl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value: string) => {
          this.selectedAccountId.set(value || null);
        });
    }
  }

  /**
   * ✅ SECURITY: Validar que el monto no exceda el balance disponible
   */
  private validateMaxWithdrawableAmount(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const amount = control.value;

      if (!amount || amount <= 0) {
        return null; // Dejar que Validators.required maneje esto
      }

      // Calcular fee y total debit
      const fee = Math.round(amount * this.FEE_PERCENTAGE * 100) / 100;
      const totalDebit = amount + fee;

      // Validar contra withdrawableBalance
      if (totalDebit > this.withdrawableBalance) {
        return {
          insufficientBalance: {
            required: totalDebit,
            available: this.withdrawableBalance,
            missing: totalDebit - this.withdrawableBalance,
          },
        };
      }

      return null;
    };
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
    this.cancelled.emit();
  }

  setMaxAmount(): void {
    // Calcular el monto máximo que se puede retirar
    // max_amount = (available_balance / (1 + fee_percentage))
    const maxWithdrawal = Math.floor(this.withdrawableBalance / (1 + this.FEE_PERCENTAGE));
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

    if (control.errors['insufficientBalance']) {
      const error = control.errors['insufficientBalance'];
      return `Saldo insuficiente. Disponible: $${error.available.toFixed(2)}, Necesario: $${error.required.toFixed(2)} (incluye comisión)`;
    }

    return 'Campo inválido';
  }
}
