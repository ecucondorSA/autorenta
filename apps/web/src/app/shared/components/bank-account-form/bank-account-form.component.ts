import { Component, EventEmitter, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { BankAccountType, AddBankAccountParams } from '../../../core/models/wallet.model';

/**
 * Componente para agregar cuentas bancarias
 * Soporta CBU, CVU y Alias
 */
@Component({
  selector: 'app-bank-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './bank-account-form.component.html',
  styleUrl: './bank-account-form.component.css',
})
export class BankAccountFormComponent {
  @Output() submitAccount = new EventEmitter<AddBankAccountParams>();
  @Output() cancelled = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly submitting = signal(false);
  readonly selectedType = signal<BankAccountType>('cbu');

  readonly selectedAccountTypeInfo = computed(() => {
    const selected = this.selectedType();
    return this.accountTypes.find(t => t.value === selected);
  });

  readonly accountTypes: { value: BankAccountType; label: string; placeholder: string; hint: string }[] = [
    {
      value: 'cbu',
      label: 'CBU',
      placeholder: '0000003100010000000001',
      hint: '22 dígitos numéricos',
    },
    {
      value: 'cvu',
      label: 'CVU',
      placeholder: '0000003100010000000001',
      hint: '22 dígitos numéricos',
    },
    {
      value: 'alias',
      label: 'Alias',
      placeholder: 'mi.alias.banco',
      hint: '6-20 caracteres alfanuméricos',
    },
  ];

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      account_type: ['cbu', Validators.required],
      account_number: ['', [Validators.required, Validators.minLength(6)]],
      account_holder_name: ['', [Validators.required, Validators.minLength(3)]],
      account_holder_document: ['', [Validators.required, Validators.minLength(7)]],
      bank_name: [''],
    });

    // Actualizar validaciones cuando cambia el tipo
    this.form.get('account_type')?.valueChanges.subscribe((type: BankAccountType) => {
      this.selectedType.set(type);
      this.updateAccountNumberValidators(type);
    });
  }

  private updateAccountNumberValidators(type: BankAccountType): void {
    const accountNumberControl = this.form.get('account_number');

    if (type === 'cbu' || type === 'cvu') {
      // CBU y CVU: exactamente 22 dígitos
      accountNumberControl?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{22}$/),
      ]);
    } else {
      // Alias: 6-20 caracteres alfanuméricos
      accountNumberControl?.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9.]+$/),
      ]);
    }

    accountNumberControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const params: AddBankAccountParams = {
      account_type: this.form.value.account_type,
      account_number: this.form.value.account_number.trim(),
      account_holder_name: this.form.value.account_holder_name.trim(),
      account_holder_document: this.form.value.account_holder_document.trim(),
      bank_name: this.form.value.bank_name?.trim() || undefined,
    };

    this.submitAccount.emit(params);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);

    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es requerido';
    }

    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Mínimo ${min} caracteres`;
    }

    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `Máximo ${max} caracteres`;
    }

    if (control.errors['pattern']) {
      if (fieldName === 'account_number') {
        const type = this.selectedType();
        if (type === 'cbu' || type === 'cvu') {
          return 'Debe tener exactamente 22 dígitos';
        } else {
          return 'Solo letras, números y puntos';
        }
      }
    }

    return 'Campo inválido';
  }
}
