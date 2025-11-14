/**
 * PROFILE IDENTITY SECTION COMPONENT
 *
 * Manages core identity fields:
 * - full_name (required)
 * - date_of_birth (required, min age 18)
 * - gov_id_type (optional)
 * - gov_id_number (conditionally required if gov_id_type is selected)
 *
 * Features:
 * - Form validation with ProfileValidators
 * - Optimistic updates with rollback on error
 * - Auto-save disabled (manual save required for identity changes)
 * - Age calculator preview
 */

import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SectionCardComponent } from '../../shared/section-card';
import { ProfileValidators } from '../../shared/field-validators';
import { ProfileStore } from '../../../../../core/stores/profile.store';
import { UserProfile, UpdateProfileData } from '../../../../../core/models';

@Component({
  selector: 'app-profile-identity-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, SectionCardComponent],
  templateUrl: './profile-identity-section.component.html',
  styleUrls: ['./profile-identity-section.component.scss'],
})
export class ProfileIdentitySectionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileStore = inject(ProfileStore);

  // Input: profile data
  @Input() profile?: UserProfile | null;

  // Section state
  readonly isEditing = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Form
  form!: FormGroup;

  // Computed values
  readonly isDirty = computed(() => this.form?.dirty ?? false);
  readonly isValid = computed(() => this.form?.valid ?? false);

  // Age calculator
  readonly calculatedAge = computed(() => {
    const dateOfBirth = this.form?.get('date_of_birth')?.value;
    if (!dateOfBirth) return null;

    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } catch {
      return null;
    }
  });

  // Government ID types
  readonly govIdTypes = [
    { value: 'DNI', label: 'DNI (Documento Nacional de Identidad)' },
    { value: 'Passport', label: 'Pasaporte' },
    { value: 'Other', label: 'Otro' },
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
  }

  /**
   * Initialize form with validators
   */
  private initializeForm(): void {
    this.form = this.fb.group({
      full_name: [
        '',
        [Validators.required, Validators.minLength(3), ProfileValidators.fullName(3)],
      ],
      date_of_birth: [
        '',
        [
          // Note: Required after migration is applied
          // For now, make it optional to avoid breaking existing profiles
          ProfileValidators.minAge(18),
          ProfileValidators.maxAge(100),
        ],
      ],
      gov_id_type: [''],
      gov_id_number: [
        '',
        [
          // Conditionally required if gov_id_type is selected
          ProfileValidators.conditionallyRequired(() => {
            const govIdType = this.form?.get('gov_id_type')?.value;
            return !!govIdType && govIdType !== '';
          }),
        ],
      ],
    });

    // Watch gov_id_type changes to revalidate gov_id_number
    this.form.get('gov_id_type')?.valueChanges.subscribe(() => {
      this.form.get('gov_id_number')?.updateValueAndValidity();
    });
  }

  /**
   * Load data from profile into form
   */
  private loadData(): void {
    if (!this.profile) return;

    this.form.patchValue({
      full_name: this.profile.full_name || '',
      date_of_birth: this.profile.date_of_birth || '',
      gov_id_type: this.profile.gov_id_type || '',
      gov_id_number: this.profile.gov_id_number || '',
    });

    // Mark as pristine after initial load
    this.form.markAsPristine();
  }

  /**
   * Extract form data for update
   */
  private getData(): Partial<UpdateProfileData> {
    const formValue = this.form.value;

    return {
      full_name: formValue.full_name,
      date_of_birth: formValue.date_of_birth || null,
      gov_id_type: formValue.gov_id_type || null,
      gov_id_number: formValue.gov_id_number || null,
    };
  }

  /**
   * Start editing mode
   */
  onEdit(): void {
    this.isEditing.set(true);
    this.error.set(null);
  }

  /**
   * Save changes
   */
  async onSave(): Promise<void> {
    if (!this.form.valid) {
      this.error.set('Por favor corrige los errores en el formulario');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const updates = this.getData();

      // Call ProfileStore updateSection method with section tracking
      await this.profileStore.updateSection('identity', updates);

      // Success - exit edit mode
      this.isEditing.set(false);
      this.form.markAsPristine();

      // Optional: Show success toast (implement ToastService if needed)
      console.log('✅ Identidad actualizada correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios';
      this.error.set(message);
      console.error('Error saving identity section:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Cancel editing and revert changes
   */
  onCancel(): void {
    // Reload data from profile to discard changes
    this.loadData();
    this.isEditing.set(false);
    this.error.set(null);
  }

  /**
   * Get error message for a field
   */
  getFieldError(fieldName: string): string | null {
    const field = this.form.get(fieldName);

    if (!field || !field.errors || !field.touched) {
      return null;
    }

    const errors = field.errors;

    if (errors['required']) {
      return 'Este campo es requerido';
    }

    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['fullName']) {
      return errors['fullName'].message || 'Nombre completo inválido';
    }

    if (errors['minAge']) {
      return errors['minAge'].message || 'Debes tener al menos 18 años';
    }

    if (errors['maxAge']) {
      return errors['maxAge'].message || 'Edad máxima excedida';
    }

    if (errors['invalidDate']) {
      return 'Fecha de nacimiento inválida';
    }

    if (errors['requiredWith']) {
      return errors['requiredWith'].message || 'Este campo es requerido';
    }

    if (errors['govIdNumber']) {
      return errors['govIdNumber'].message || 'Número de documento inválido';
    }

    return 'Campo inválido';
  }

  /**
   * Check if field has error and is touched
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.errors && field.touched);
  }

  /**
   * Format date for display (if needed)
   */
  formatDate(date: string | null | undefined): string {
    if (!date) return '';

    try {
      const d = new Date(date);
      return d.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  }

  /**
   * Get maximum date for date picker (18 years ago from today)
   */
  getMaxDate(): string {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  }

  /**
   * Get placeholder text for gov_id_number based on selected type
   */
  getGovIdPlaceholder(): string {
    const govIdType = this.form?.get('gov_id_type')?.value;

    switch (govIdType) {
      case 'DNI':
        return 'Ej: 12345678';
      case 'Passport':
        return 'Ej: ABC123456';
      default:
        return 'Ingresa tu número de documento';
    }
  }
}
