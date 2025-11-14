/**
 * PROFILE CONTACT SECTION COMPONENT
 *
 * Manages contact and address fields:
 * - phone (E.164 format)
 * - whatsapp (E.164 format, optional)
 * - address_line1
 * - address_line2
 * - city
 * - state
 * - postal_code (validated by country)
 * - country
 *
 * Features:
 * - Auto-save for non-critical fields (debounced 2s)
 * - "Same as phone" checkbox for WhatsApp
 * - Address autocomplete (future: Mapbox integration)
 * - Country-specific postal code validation
 */

import { Component, Input, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { SectionCardComponent } from '../../shared/section-card';
import { ProfileValidators } from '../../shared/field-validators';
import { ProfileStore } from '../../../../../core/stores/profile.store';
import { UserProfile, UpdateProfileData } from '../../../../../core/models';

@Component({
  selector: 'app-profile-contact-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, SectionCardComponent],
  templateUrl: './profile-contact-section.component.html',
  styleUrls: ['./profile-contact-section.component.scss'],
})
export class ProfileContactSectionComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly profileStore = inject(ProfileStore);
  private readonly destroy$ = new Subject<void>();

  // Input: profile data
  @Input() profile?: UserProfile | null;

  // Section state
  readonly isEditing = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly autoSaving = signal(false);

  // Form
  form!: FormGroup;

  // Computed values
  readonly isDirty = computed(() => this.form?.dirty ?? false);
  readonly isValid = computed(() => this.form?.valid ?? false);

  // WhatsApp sync state
  readonly sameAsPhone = signal(false);

  // Supported countries
  readonly countries = [
    { code: 'AR', name: 'Argentina', phonePrefix: '+54' },
    { code: 'UY', name: 'Uruguay', phonePrefix: '+598' },
    { code: 'CL', name: 'Chile', phonePrefix: '+56' },
    { code: 'US', name: 'Estados Unidos', phonePrefix: '+1' },
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize form with validators
   */
  private initializeForm(): void {
    this.form = this.fb.group({
      phone: ['', [ProfileValidators.phone()]],
      whatsapp: ['', [ProfileValidators.phone()]],
      address_line1: [''],
      address_line2: [''],
      city: [''],
      state: [''],
      postal_code: [''],
      country: ['AR'], // Default to Argentina
    });

    // Watch country changes to revalidate postal_code
    this.form
      .get('country')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.get('postal_code')?.updateValueAndValidity();
      });

    // Watch phone changes when sameAsPhone is enabled
    this.form
      .get('phone')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((phoneValue) => {
        if (this.sameAsPhone()) {
          this.form.get('whatsapp')?.setValue(phoneValue, { emitEvent: false });
        }
      });
  }

  /**
   * Load data from profile into form
   */
  private loadData(): void {
    if (!this.profile) return;

    this.form.patchValue({
      phone: this.profile.phone || '',
      whatsapp: this.profile.whatsapp || '',
      address_line1: this.profile.address_line1 || '',
      address_line2: this.profile.address_line2 || '',
      city: this.profile.city || '',
      state: this.profile.state || '',
      postal_code: this.profile.postal_code || '',
      country: this.profile.country || 'AR',
    });

    // Check if phone and whatsapp are the same
    if (this.profile.phone && this.profile.phone === this.profile.whatsapp) {
      this.sameAsPhone.set(true);
    }

    // Mark as pristine after initial load
    this.form.markAsPristine();
  }

  /**
   * Setup auto-save for non-critical fields
   * Auto-saves after 2 seconds of inactivity
   */
  private setupAutoSave(): void {
    this.form.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // Only auto-save if in edit mode, form is valid, and has changes
        if (this.isEditing() && this.form.valid && this.form.dirty) {
          this.autoSave();
        }
      });
  }

  /**
   * Auto-save changes (silent save without exiting edit mode)
   */
  private async autoSave(): Promise<void> {
    if (this.loading() || this.autoSaving()) return;

    this.autoSaving.set(true);
    this.error.set(null);

    try {
      const updates = this.getData();
      await this.profileStore.updateSection('contact', updates);

      // Mark as pristine after successful save
      this.form.markAsPristine();

      console.log('✅ Contacto guardado automáticamente');
    } catch (err) {
      console.error('Error auto-saving contact section:', err);
      // Don't show error for auto-save failures (user can manually save)
    } finally {
      this.autoSaving.set(false);
    }
  }

  /**
   * Extract form data for update
   */
  private getData(): Partial<UpdateProfileData> {
    const formValue = this.form.value;

    return {
      phone: formValue.phone || null,
      whatsapp: formValue.whatsapp || null,
      address_line1: formValue.address_line1 || null,
      address_line2: formValue.address_line2 || null,
      city: formValue.city || null,
      state: formValue.state || null,
      postal_code: formValue.postal_code || null,
      country: formValue.country || null,
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
   * Save changes (manual save)
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
      await this.profileStore.updateSection('contact', updates);

      // Success - exit edit mode
      this.isEditing.set(false);
      this.form.markAsPristine();

      console.log('✅ Contacto actualizado correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios';
      this.error.set(message);
      console.error('Error saving contact section:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Cancel editing and revert changes
   */
  onCancel(): void {
    this.loadData();
    this.isEditing.set(false);
    this.error.set(null);
  }

  /**
   * Toggle "Same as phone" for WhatsApp
   */
  toggleSameAsPhone(): void {
    const newValue = !this.sameAsPhone();
    this.sameAsPhone.set(newValue);

    if (newValue) {
      const phoneValue = this.form.get('phone')?.value;
      this.form.get('whatsapp')?.setValue(phoneValue);
      this.form.get('whatsapp')?.disable();
    } else {
      this.form.get('whatsapp')?.enable();
    }
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

    if (errors['phone']) {
      return errors['phone'].message || 'Número de teléfono inválido (incluye código de país)';
    }

    if (errors['postalCode']) {
      return errors['postalCode'].message || 'Código postal inválido';
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
   * Get phone prefix for selected country
   */
  getPhonePrefix(): string {
    const countryCode = this.form?.get('country')?.value || 'AR';
    const country = this.countries.find((c) => c.code === countryCode);
    return country?.phonePrefix || '+54';
  }

  /**
   * Format address for display in view mode
   */
  getFormattedAddress(): string {
    if (!this.profile) return '—';

    const parts: string[] = [];

    if (this.profile.address_line1) parts.push(this.profile.address_line1);
    if (this.profile.address_line2) parts.push(this.profile.address_line2);

    const cityState: string[] = [];
    if (this.profile.city) cityState.push(this.profile.city);
    if (this.profile.state) cityState.push(this.profile.state);
    if (cityState.length > 0) parts.push(cityState.join(', '));

    if (this.profile.postal_code) parts.push(`CP ${this.profile.postal_code}`);

    const country = this.countries.find((c) => c.code === this.profile?.country);
    if (country) parts.push(country.name);

    return parts.length > 0 ? parts.join('\n') : '—';
  }

  /**
   * Check if address is complete
   */
  hasCompleteAddress(): boolean {
    return !!(this.profile?.address_line1 && this.profile?.city && this.profile?.country);
  }

  /**
   * Get postal code placeholder based on selected country
   */
  getPostalCodePlaceholder(): string {
    const countryCode = this.form?.get('country')?.value || 'AR';

    switch (countryCode) {
      case 'AR':
        return 'C1234 o 1234';
      case 'UY':
        return '12345';
      case 'CL':
        return '1234567';
      case 'US':
        return '12345 o 12345-6789';
      default:
        return 'Código postal';
    }
  }
}
