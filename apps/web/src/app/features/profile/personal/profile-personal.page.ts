import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ProfileStore } from '@core/stores/profile.store';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { SectionCardComponent } from '../components/shared/section-card/section-card.component';
import type { UserProfile, Role } from '../../../core/models';

/**
 * Profile Personal Page
 *
 * Dedicated page for managing personal information:
 * - Full name, Date of birth, Government ID, User role
 * - Shows verified data as read-only with badge when identity is locked by OCR
 * - Displays driver license info from user_identity_levels when verified
 */
@Component({
  selector: 'app-profile-personal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, ReactiveFormsModule, SectionCardComponent],
  template: `
    <ion-header>
      <ion-toolbar class="bg-surface-raised border-b border-border-default">
        <ion-buttons slot="start">
          <ion-back-button
            defaultHref="/profile"
            text="Perfil"
            class="text-text-primary"
          ></ion-back-button>
        </ion-buttons>
        <ion-title class="text-text-primary"> Datos Personales </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-surface-base">
      <div class="min-h-full py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary mb-2">Información Personal</h1>
          <p class="text-sm text-text-secondary">
            Mantén tus datos personales actualizados para una mejor experiencia.
          </p>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="flex justify-center py-12">
            <div
              class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cta-default border-r-transparent"
            ></div>
          </div>
        }

        <!-- Form -->
        @if (!loading() && personalForm) {
          <form [formGroup]="personalForm" class="space-y-6">
            <!-- Save Status Indicator -->
            @if (saveStatus()) {
              <div
                class="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                [class.bg-success-bg]="saveStatus() === 'saved'"
                [class.bg-warning-bg]="saveStatus() === 'saving'"
                [class.text-success-text]="saveStatus() === 'saved'"
                [class.text-warning-text]="saveStatus() === 'saving'"
              >
                @if (saveStatus() === 'saving') {
                  <svg
                    class="h-4 w-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
                @if (saveStatus() === 'saved') {
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                }
                <span>{{ saveStatus() === 'saving' ? 'Guardando...' : 'Guardado' }}</span>
              </div>
            }

            <!-- Identity Verified Banner -->
            @if (identityLocked()) {
              <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
                <svg class="h-5 w-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-green-800">Identidad Verificada</p>
                  <p class="text-xs text-green-600">
                    Tus datos fueron verificados por OCR y no pueden ser modificados.
                    Si hay un error, contacta a soporte.
                  </p>
                </div>
              </div>
            }

            <!-- Basic Info Section -->
            <app-section-card title="Información Básica" icon="person">
              <div class="space-y-4">
                <!-- Full Name -->
                @if (identityLocked()) {
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      Nombre Completo
                      <span class="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        Verificado
                      </span>
                    </label>
                    <div class="w-full px-3 py-2 rounded-lg border bg-surface-subtle text-text-primary border-green-200">
                      {{ profile()?.full_name }}
                    </div>
                  </div>
                } @else {
                  <div>
                    <label for="full_name" class="block text-sm font-medium text-text-primary mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      formControlName="full_name"
                      class="w-full px-3 py-2 rounded-lg border bg-surface-base
                           text-text-primary
                           border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default
                           placeholder:text-text-muted"
                      placeholder="Ej: Juan Pérez"
                    />
                    @if (
                      personalForm.get('full_name')?.invalid && personalForm.get('full_name')?.touched
                    ) {
                      <p class="mt-1 text-xs text-error-text">El nombre es requerido</p>
                    }
                  </div>
                }
                <!-- Date of Birth -->
                @if (identityLocked() && profile()?.date_of_birth) {
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      Fecha de Nacimiento
                      <span class="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        Verificado
                      </span>
                    </label>
                    <div class="w-full px-3 py-2 rounded-lg border bg-surface-subtle text-text-primary border-green-200">
                      {{ formatDate(profile()?.date_of_birth) }}
                    </div>
                  </div>
                } @else {
                  <div>
                    <label
                      for="date_of_birth"
                      class="block text-sm font-medium text-text-primary mb-1"
                    >
                      Fecha de Nacimiento
                    </label>
                    <input
                      id="date_of_birth"
                      type="date"
                      formControlName="date_of_birth"
                      class="w-full px-3 py-2 rounded-lg border bg-surface-base
                           text-text-primary
                           border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default"
                      [max]="maxBirthDate()"
                    />
                    <p class="mt-1 text-xs text-text-muted">
                      Debes tener al menos 18 años para usar la plataforma
                    </p>
                    @if (ageError()) {
                      <p class="mt-1 text-xs text-error-text">
                        {{ ageError() }}
                      </p>
                    }
                  </div>
                }
              </div>
            </app-section-card>

            <!-- Identity Documents Section -->
            <app-section-card title="Documentos de Identidad" icon="card">
              <div class="space-y-4">
                @if (identityLocked()) {
                  <!-- Gov ID Type - Verified -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      Tipo de Documento
                      <span class="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        Verificado
                      </span>
                    </label>
                    <div class="w-full px-3 py-2 rounded-lg border bg-surface-subtle text-text-primary border-green-200 uppercase">
                      {{ profile()?.gov_id_type || 'DNI' }}
                    </div>
                  </div>
                  <!-- Gov ID Number - Verified -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      Número de Documento
                    </label>
                    <div class="w-full px-3 py-2 rounded-lg border bg-surface-subtle text-text-primary border-green-200">
                      {{ profile()?.gov_id_number || profile()?.['identity_document_number'] || '—' }}
                    </div>
                  </div>
                } @else {
                  <!-- Gov ID Type - Editable -->
                  <div>
                    <label for="gov_id_type" class="block text-sm font-medium text-text-primary mb-1">
                      Tipo de Documento
                    </label>
                    <select
                      id="gov_id_type"
                      formControlName="gov_id_type"
                      class="w-full px-3 py-2 rounded-lg border bg-surface-base
                           text-text-primary
                           border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="dni">DNI</option>
                      <option value="cuit">CUIT</option>
                      <option value="passport">Pasaporte</option>
                    </select>
                  </div>
                  <!-- Gov ID Number - Editable -->
                  <div>
                    <label
                      for="gov_id_number"
                      class="block text-sm font-medium text-text-primary mb-1"
                    >
                      Número de Documento
                    </label>
                    <input
                      id="gov_id_number"
                      type="text"
                      formControlName="gov_id_number"
                      class="w-full px-3 py-2 rounded-lg border bg-surface-base
                           text-text-primary
                           border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default
                           placeholder:text-text-muted"
                      placeholder="Ej: 12345678"
                    />
                    <p class="mt-1 text-xs text-text-muted">
                      Este documento será verificado para habilitar ciertas funciones
                    </p>
                    @if (govIdError()) {
                      <p class="mt-1 text-xs text-error-text">{{ govIdError() }}</p>
                    }
                  </div>
                }
              </div>
            </app-section-card>

            <!-- Driver License Section (read-only, from verification) -->
            @if (licenseVerified()) {
              <app-section-card title="Licencia de Conducir" icon="car">
                @if (licenseData(); as lic) {
                  @if (lic.isExpired) {
                    <div class="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                      <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      Licencia Vencida
                    </div>
                  }
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <span class="block text-xs text-text-muted mb-1">Número</span>
                      <span class="text-sm font-medium text-text-primary">{{ lic.number || '—' }}</span>
                    </div>
                    <div>
                      <span class="block text-xs text-text-muted mb-1">Vencimiento</span>
                      <span class="text-sm font-medium" [class.text-red-600]="lic.isExpired" [class.text-text-primary]="!lic.isExpired">
                        {{ formatDate(lic.expiry) }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <span class="text-xs text-text-muted">Categorías:</span>
                    @for (cat of lic.categories ?? []; track cat) {
                      <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{{ cat }}</span>
                    }
                    @if (!lic.categories?.length) {
                      <span class="text-xs text-text-muted">—</span>
                    }
                    @if (lic.professional) {
                      <span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Profesional</span>
                    }
                  </div>
                }
              </app-section-card>
            }

            <!-- Role Section -->
            <app-section-card title="Tipo de Usuario" icon="people">
              <div class="space-y-4">
                <p class="text-sm text-text-secondary mb-4">
                  Selecciona cómo deseas usar AutoRenta. Puedes cambiar esto en cualquier momento.
                </p>
                <div class="space-y-3">
                  <!-- Renter Option -->
                  <label
                    class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all"
                    [class.border-cta-default]="personalForm.get('role')?.value === 'renter'"
                    [class.bg-cta-default/5]="personalForm.get('role')?.value === 'renter'"
                    [class.border-border-default]="personalForm.get('role')?.value !== 'renter'"
                  >
                    <input
                      type="radio"
                      formControlName="role"
                      value="renter"
                      class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default"
                    />
                    <div>
                      <span class="block font-medium text-text-primary">Locatario</span>
                      <span class="text-sm text-text-secondary">
                        Solo quiero usar vehículos de la comunidad
                      </span>
                    </div>
                  </label>
                  <!-- Owner Option -->
                  <label
                    class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all"
                    [class.border-cta-default]="personalForm.get('role')?.value === 'owner'"
                    [class.bg-cta-default/5]="personalForm.get('role')?.value === 'owner'"
                    [class.border-border-default]="personalForm.get('role')?.value !== 'owner'"
                  >
                    <input
                      type="radio"
                      formControlName="role"
                      value="owner"
                      class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default"
                    />
                    <div>
                      <span class="block font-medium text-text-primary">Locador</span>
                      <span class="text-sm text-text-secondary">
                        Quiero compartir mis vehículos con la comunidad
                      </span>
                    </div>
                  </label>
                  <!-- Both Option -->
                  <label
                    class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all"
                    [class.border-cta-default]="personalForm.get('role')?.value === 'both'"
                    [class.bg-cta-default/5]="personalForm.get('role')?.value === 'both'"
                    [class.border-border-default]="personalForm.get('role')?.value !== 'both'"
                  >
                    <input
                      type="radio"
                      formControlName="role"
                      value="both"
                      class="mt-1 h-4 w-4 text-cta-default focus:ring-cta-default"
                    />
                    <div>
                      <span class="block font-medium text-text-primary">Ambos</span>
                      <span class="text-sm text-text-secondary">
                        Quiero usar y compartir vehículos
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </app-section-card>
            <!-- Help Text -->
            <div class="p-4 rounded-lg bg-info-bg border border-info-border">
              <h4 class="text-sm font-semibold text-info-text mb-2 flex items-center gap-2">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Información Importante
              </h4>
              <ul class="text-xs text-info-text space-y-1.5">
                <li class="flex gap-2">
                  <span>&bull;</span>
                  <span
                    >Tu <strong>fecha de nacimiento</strong> se usa para calcular tarifas de
                    seguro</span
                  >
                </li>
                <li class="flex gap-2">
                  <span>&bull;</span>
                  <span
                    >El <strong>documento de identidad</strong> es necesario para verificar tu
                    cuenta</span
                  >
                </li>
                <li class="flex gap-2">
                  <span>&bull;</span>
                  <span
                    >Cambiar tu <strong>rol</strong> puede afectar las funciones disponibles</span
                  >
                </li>
              </ul>
            </div>
          </form>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      ion-content {
        --padding-bottom: 24px;
        min-height: 100vh;
      }
    `,
  ],
})
export class ProfilePersonalPage implements OnInit {
  private readonly profileStore = inject(ProfileStore);
  private readonly identityLevelService = inject(IdentityLevelService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;

  /** Identity is locked when OCR verification succeeded with >=70% confidence */
  readonly identityLocked = computed(() => {
    const p = this.profile();
    return p?.['identity_locked'] === true;
  });

  /** Driver license verified when user_identity_levels has a verification timestamp */
  readonly licenseVerified = computed(() => {
    const il = this.identityLevelService.identityLevel();
    return !!il?.driver_license_verified_at;
  });

  /** License data from user_identity_levels for display */
  readonly licenseData = computed(() => {
    const il = this.identityLevelService.identityLevel();
    if (!il?.driver_license_verified_at) return null;
    return {
      number: il.driver_license_number,
      expiry: il.driver_license_expiry,
      categories: il.driver_license_categories,
      professional: il.driver_license_professional,
      isExpired: il.driver_license_expiry ? new Date(il.driver_license_expiry) < new Date() : false,
    };
  });

  personalForm!: FormGroup;
  saveStatus = signal<'saving' | 'saved' | null>(null);
  ageError = signal<string | null>(null);

  // Calculate max birth date (18 years ago)
  readonly maxBirthDate = computed(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  });

  readonly govIdError = signal<string | null>(null);

  constructor() {
    // Initialize form when profile loads
    effect(() => {
      const profile = this.profile();
      if (profile && this.personalForm) {
        this.updateFormFromProfile(profile);
      }
    });
  }

  ngOnInit(): void {
    this.initForm();

    // Load profile if not already loaded
    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }

    // Load identity level data (for license info)
    void this.identityLevelService.loadIdentityLevel();

    // Setup auto-save
    this.setupAutoSave();
  }

  /** Format ISO date to human-readable DD/MM/YYYY */
  formatDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  private initForm(): void {
    this.personalForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      date_of_birth: [''],
      gov_id_type: [''],
      gov_id_number: ['', [this.govIdValidator.bind(this)]],
      role: ['renter'],
    });

    // Re-validate gov_id_number when type changes
    this.personalForm
      .get('gov_id_type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.personalForm.get('gov_id_number')?.updateValueAndValidity();
      });
  }

  /**
   * Custom validator for government ID based on type
   * - DNI: 7-8 digits only
   * - CUIT: 11 digits in format XX-XXXXXXXX-X or XXXXXXXXXXX
   * - Passport: 6-12 alphanumeric characters
   */
  private govIdValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.toString().trim();
    if (!value) return null; // Optional field

    const idType = this.personalForm?.get('gov_id_type')?.value;
    if (!idType) return null;

    // Remove dashes and spaces for validation
    const cleanValue = value.replace(/[-\s]/g, '');

    switch (idType) {
      case 'dni':
        // DNI: 7-8 digits
        if (!/^\d{7,8}$/.test(cleanValue)) {
          this.govIdError.set('El DNI debe tener 7 u 8 dígitos');
          return { invalidDni: true };
        }
        break;

      case 'cuit':
        // CUIT: 11 digits with valid check digit
        if (!/^\d{11}$/.test(cleanValue)) {
          this.govIdError.set('El CUIT debe tener 11 dígitos');
          return { invalidCuit: true };
        }
        // Validate CUIT check digit (Módulo 11)
        if (!this.validateCuitCheckDigit(cleanValue)) {
          this.govIdError.set('El dígito verificador del CUIT es inválido');
          return { invalidCuitCheckDigit: true };
        }
        break;

      case 'passport':
        // Passport: 6-12 alphanumeric
        if (!/^[A-Za-z0-9]{6,12}$/.test(cleanValue)) {
          this.govIdError.set('El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos');
          return { invalidPassport: true };
        }
        break;
    }

    this.govIdError.set(null);
    return null;
  }

  /**
   * Validate Argentine CUIT check digit using Módulo 11 algorithm
   */
  private validateCuitCheckDigit(cuit: string): boolean {
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const digits = cuit.split('').map(Number);

    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

    return checkDigit === digits[10];
  }

  private updateFormFromProfile(profile: UserProfile): void {
    this.personalForm.patchValue(
      {
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gov_id_type: profile.gov_id_type || '',
        gov_id_number: profile.gov_id_number || '',
        role: profile.role || 'renter',
      },
      { emitEvent: false },
    );
  }

  private setupAutoSave(): void {
    this.personalForm.valueChanges
      .pipe(debounceTime(1000), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.validateAndSave();
      });
  }

  private async validateAndSave(): Promise<void> {
    // Skip saving identity fields if locked by OCR
    if (this.identityLocked()) {
      // Only save role (the only editable field when locked)
      const formValue = this.personalForm.value;
      this.saveStatus.set('saving');
      try {
        await this.profileStore.updateProfile({
          role: formValue.role as Role,
        });
        this.saveStatus.set('saved');
        setTimeout(() => this.saveStatus.set(null), 2000);
      } catch (error) {
        console.error('Error saving profile:', error);
        this.saveStatus.set(null);
      }
      return;
    }

    // Validate age if date_of_birth is set
    const dob = this.personalForm.get('date_of_birth')?.value;
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      const actualAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

      if (actualAge < 18) {
        this.ageError.set('Debes tener al menos 18 años');
        return;
      } else if (actualAge > 100) {
        this.ageError.set('Por favor verifica la fecha ingresada');
        return;
      }
      this.ageError.set(null);
    }

    if (this.personalForm.invalid) {
      return;
    }

    this.saveStatus.set('saving');

    try {
      const formValue = this.personalForm.value;

      await this.profileStore.updateProfile({
        full_name: formValue.full_name,
        date_of_birth: formValue.date_of_birth || null,
        gov_id_type: formValue.gov_id_type || null,
        gov_id_number: formValue.gov_id_number || null,
        role: formValue.role as Role,
      });

      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set(null), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      this.saveStatus.set(null);
    }
  }
}
