import {Component, inject, OnInit, signal, computed, effect,
  ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ProfileStore } from '../../../core/stores/profile.store';
import { SectionCardComponent } from '../components/shared/section-card/section-card.component';
import type { UserProfile, Role } from '../../../core/models';

/**
 * Profile Personal Page
 *
 * Dedicated page for managing personal information:
 * - Full name
 * - Date of birth
 * - Government ID (DNI/CUIT)
 * - User role (renter/owner/both)
 *
 * Uses auto-save with debounce
 */
@Component({
  selector: 'app-profile-personal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, ReactiveFormsModule, SectionCardComponent],
  template: `
    <ion-header>
      <ion-toolbar
        class="bg-surface-raised dark:bg-surface-secondary border-b border-border-default"
        >
        <ion-buttons slot="start">
          <ion-back-button
            defaultHref="/profile"
            text="Perfil"
            class="text-text-primary dark:text-text-secondary"
          ></ion-back-button>
        </ion-buttons>
        <ion-title class="text-text-primary dark:text-text-secondary">
          Datos Personales
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="bg-surface-base dark:bg-surface-base">
      <div class="min-h-full py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary dark:text-text-primary mb-2">
            Información Personal
          </h1>
          <p class="text-sm text-text-secondary dark:text-text-secondary">
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
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                }
                <span>{{ saveStatus() === 'saving' ? 'Guardando...' : 'Guardado' }}</span>
              </div>
            }
            <!-- Basic Info Section -->
            <app-section-card title="Información Básica" icon="person">
              <div class="space-y-4">
                <!-- Full Name -->
                <div>
                  <label for="full_name" class="block text-sm font-medium text-text-primary mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    formControlName="full_name"
                  class="w-full px-3 py-2 rounded-lg border bg-surface-base dark:bg-surface-secondary
                         text-text-primary dark:text-text-primary
                         border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default
                         placeholder:text-text-muted"
                    placeholder="Ej: Juan Pérez"
                    />
                  @if (personalForm.get('full_name')?.invalid && personalForm.get('full_name')?.touched) {
                    <p
                      class="mt-1 text-xs text-error-text"
                      >
                      El nombre es requerido
                    </p>
                  }
                </div>
                <!-- Date of Birth -->
                <div>
                  <label for="date_of_birth" class="block text-sm font-medium text-text-primary mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    id="date_of_birth"
                    type="date"
                    formControlName="date_of_birth"
                  class="w-full px-3 py-2 rounded-lg border bg-surface-base dark:bg-surface-secondary
                         text-text-primary dark:text-text-primary
                         border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default"
                    [max]="maxBirthDate()"
                    />
                  <p class="mt-1 text-xs text-text-muted">
                    Debes tener al menos 18 años para alquilar un vehículo
                  </p>
                  @if (ageError()) {
                    <p
                      class="mt-1 text-xs text-error-text"
                      >
                      {{ ageError() }}
                    </p>
                  }
                </div>
              </div>
            </app-section-card>
            <!-- Identity Documents Section -->
            <app-section-card title="Documentos de Identidad" icon="card">
              <div class="space-y-4">
                <!-- Gov ID Type -->
                <div>
                  <label for="gov_id_type" class="block text-sm font-medium text-text-primary mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    id="gov_id_type"
                    formControlName="gov_id_type"
                  class="w-full px-3 py-2 rounded-lg border bg-surface-base dark:bg-surface-secondary
                         text-text-primary dark:text-text-primary
                         border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default"
                    >
                    <option value="">Seleccionar...</option>
                    <option value="dni">DNI</option>
                    <option value="cuit">CUIT</option>
                    <option value="passport">Pasaporte</option>
                  </select>
                </div>
                <!-- Gov ID Number -->
                <div>
                  <label for="gov_id_number" class="block text-sm font-medium text-text-primary mb-1">
                    Número de Documento
                  </label>
                  <input
                    id="gov_id_number"
                    type="text"
                    formControlName="gov_id_number"
                  class="w-full px-3 py-2 rounded-lg border bg-surface-base dark:bg-surface-secondary
                         text-text-primary dark:text-text-primary
                         border-border-default focus:border-cta-default focus:ring-1 focus:ring-cta-default
                         placeholder:text-text-muted"
                    placeholder="Ej: 12345678"
                    />
                  <p class="mt-1 text-xs text-text-muted">
                    Este documento será verificado para habilitar ciertas funciones
                  </p>
                </div>
              </div>
            </app-section-card>
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
                        Solo quiero alquilar vehículos de otros usuarios
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
                        Quiero publicar mis vehículos para que otros los alquilen
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
                        Quiero alquilar vehículos y también publicar los míos
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </app-section-card>
            <!-- Help Text -->
            <div class="p-4 rounded-lg bg-info-bg border border-info-border dark:bg-info-bg/20">
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
                  <span>•</span>
                  <span>Tu <strong>fecha de nacimiento</strong> se usa para calcular tarifas de seguro</span>
                </li>
                <li class="flex gap-2">
                  <span>•</span>
                  <span>El <strong>documento de identidad</strong> es necesario para verificar tu cuenta</span>
                </li>
                <li class="flex gap-2">
                  <span>•</span>
                  <span>Cambiar tu <strong>rol</strong> puede afectar las funciones disponibles</span>
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
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;

  personalForm!: FormGroup;
  saveStatus = signal<'saving' | 'saved' | null>(null);
  ageError = signal<string | null>(null);

  // Calculate max birth date (18 years ago)
  readonly maxBirthDate = computed(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  });

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

    // Setup auto-save
    this.setupAutoSave();
  }

  private initForm(): void {
    this.personalForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      date_of_birth: [''],
      gov_id_type: [''],
      gov_id_number: [''],
      role: ['renter'],
    });
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
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.validateAndSave();
      });
  }

  private async validateAndSave(): Promise<void> {
    // Validate age if date_of_birth is set
    const dob = this.personalForm.get('date_of_birth')?.value;
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      const actualAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ? age - 1
          : age;

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
