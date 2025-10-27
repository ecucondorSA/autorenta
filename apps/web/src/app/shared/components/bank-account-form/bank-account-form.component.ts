import { Component, EventEmitter, Output, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { BankAccountType, AddBankAccountParams } from '../../../core/models/wallet.model';
import { ProfileService } from '../../../core/services/profile.service';

/**
 * Componente para agregar cuentas bancarias
 * Soporta CBU, CVU y Alias
 *
 * NOTA: Los datos de titular (nombre y documento) se obtienen del perfil del usuario.
 * Si el usuario no tiene estos datos completados, debe completarlos primero en su perfil.
 */
@Component({
  selector: 'app-bank-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './bank-account-form.component.html',
  styleUrl: './bank-account-form.component.css',
})
export class BankAccountFormComponent implements OnInit {
  private readonly profileService = inject(ProfileService);

  @Output() submitAccount = new EventEmitter<AddBankAccountParams>();
  @Output() cancelled = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly submitting = signal(false);
  readonly selectedType = signal<BankAccountType>('cbu');
  readonly profileData = signal<{ fullName: string; govIdNumber: string } | null>(null);
  readonly profileError = signal<string | null>(null);

  readonly selectedAccountTypeInfo = computed(() => {
    const selected = this.selectedType();
    return this.accountTypes.find((t) => t.value === selected);
  });

  readonly accountTypes: {
    value: BankAccountType;
    label: string;
    placeholder: string;
    hint: string;
  }[] = [
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
      bank_name: [''],
    });

    // Actualizar validaciones cuando cambia el tipo
    this.form.get('account_type')?.valueChanges.subscribe((type: BankAccountType) => {
      this.selectedType.set(type);
      this.updateAccountNumberValidators(type);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const profile = await this.profileService.getCurrentProfile();

      if (!profile) {
        this.profileError.set('No se pudo cargar tu perfil');
        return;
      }

      // Verificar que el usuario tenga los datos necesarios
      if (!profile.full_name || !profile.gov_id_number) {
        this.profileError.set(
          'Debes completar tu nombre completo y número de documento en tu perfil antes de agregar una cuenta bancaria',
        );
        return;
      }

      this.profileData.set({
        fullName: profile.full_name,
        govIdNumber: profile.gov_id_number,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      this.profileError.set('Error al cargar tu perfil');
    }
  }

  private updateAccountNumberValidators(type: BankAccountType): void {
    const accountNumberControl = this.form.get('account_number');

    if (type === 'cbu' || type === 'cvu') {
      // CBU y CVU: exactamente 22 dígitos
      accountNumberControl?.setValidators([Validators.required, Validators.pattern(/^\d{22}$/)]);
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

    const profile = this.profileData();
    if (!profile) {
      this.profileError.set('No se pudieron obtener los datos del perfil');
      return;
    }

    this.submitting.set(true);

    const params: AddBankAccountParams = {
      account_type: this.form.value.account_type,
      account_number: this.form.value.account_number.trim(),
      account_holder_name: profile.fullName,
      account_holder_document: profile.govIdNumber,
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
      const fieldLabels: Record<string, string> = {
        account_type: 'El tipo de cuenta',
        account_number: 'El número de cuenta',
        bank_name: 'El nombre del banco',
      };
      return `${fieldLabels[fieldName] || 'Este campo'} es requerido`;
    }

    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Debe tener al menos ${min} caracteres`;
    }

    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `No puede exceder ${max} caracteres`;
    }

    if (control.errors['pattern']) {
      if (fieldName === 'account_number') {
        const type = this.selectedType();
        if (type === 'cbu' || type === 'cvu') {
          return 'El CBU/CVU debe tener exactamente 22 dígitos numéricos';
        } else {
          return 'El alias solo puede contener letras, números y puntos';
        }
      }
    }

    return 'El formato ingresado no es válido';
  }
}
