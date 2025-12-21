import { LoggerService } from '../../../core/services/logger.service';
import {Component, inject, OnInit, OnDestroy, signal, effect,
  ChangeDetectionStrategy} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import { ProfileStore } from '../../../core/stores/profile.store';

/**
 * Profile Preferences Page
 *
 * Dedicated page for managing user preferences:
 * - Timezone
 * - Language/Locale
 * - Currency
 * - Marketing opt-in
 *
 * Features auto-save with 2s debounce
 */
@Component({
  selector: 'app-profile-preferences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, ReactiveFormsModule],
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
        <ion-title class="text-text-primary dark:text-text-secondary"> Preferencias </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="bg-surface-base dark:bg-surface-base">
      <div class="min-h-full py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary dark:text-text-primary mb-2">
            Preferencias
          </h1>
          <p class="text-sm text-text-secondary dark:text-text-secondary">
            Personaliza tu experiencia en AutoRenta.
          </p>
          <!-- Auto-save indicator -->
          @if (autoSaving()) {
            <div class="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <div
                class="h-3 w-3 animate-spin rounded-full border-2 border-solid border-cta-default border-r-transparent"
              ></div>
              <span>Guardando...</span>
            </div>
          }
        </div>
    
        <!-- Error Message -->
        @if (error()) {
          <div
            class="mb-4 p-3 rounded-lg bg-error-bg border border-error-border text-sm text-error-text"
            >
            {{ error() }}
          </div>
        }
    
        <!-- Success Message -->
        @if (successMessage()) {
          <div
            class="mb-4 p-3 rounded-lg bg-success-light/10 border border-success-light/40 text-sm text-success-text"
            >
            {{ successMessage() }}
          </div>
        }
    
        <!-- Loading State -->
        @if (loading()) {
          <div class="flex justify-center py-12">
            <div
              class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cta-default border-r-transparent"
            ></div>
          </div>
        }
    
        <!-- Preferences Form -->
        @if (!loading()) {
          <form [formGroup]="preferencesForm" class="space-y-6">
            <!-- Timezone -->
            <div class="card-premium p-4">
              <h3 class="text-sm font-semibold text-text-primary dark:text-text-primary mb-3">
                Zona Horaria
              </h3>
              <select
                formControlName="timezone"
                class="w-full px-3 py-2 rounded-lg border border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary text-text-primary dark:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default"
                >
                <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                <option value="America/Montevideo">Montevideo (UTC-3)</option>
                <option value="America/Santiago">Santiago (UTC-3/UTC-4)</option>
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
              </select>
              <p class="mt-2 text-xs text-text-secondary dark:text-text-secondary">
                Determina cómo se mostrarán las fechas y horas en toda la plataforma
              </p>
            </div>
            <!-- Language/Locale -->
            <div class="card-premium p-4">
              <h3 class="text-sm font-semibold text-text-primary dark:text-text-primary mb-3">
                Idioma
              </h3>
              <select
                formControlName="locale"
                class="w-full px-3 py-2 rounded-lg border border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary text-text-primary dark:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default"
                >
                <option value="es-AR">Español (Argentina)</option>
                <option value="es-UY">Español (Uruguay)</option>
                <option value="es-CL">Español (Chile)</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
              <p class="mt-2 text-xs text-text-secondary dark:text-text-secondary">
                Idioma de la interfaz y formatos regionales
              </p>
            </div>
            <!-- Currency -->
            <div class="card-premium p-4">
              <h3 class="text-sm font-semibold text-text-primary dark:text-text-primary mb-3">
                Moneda Preferida
              </h3>
              <select
                formControlName="currency"
                class="w-full px-3 py-2 rounded-lg border border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary text-text-primary dark:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default"
                >
                <option value="ARS">Pesos Argentinos (ARS)</option>
                <option value="UYU">Pesos Uruguayos (UYU)</option>
                <option value="CLP">Pesos Chilenos (CLP)</option>
                <option value="BRL">Reales Brasileños (BRL)</option>
                <option value="USD">Dólares Estadounidenses (USD)</option>
              </select>
              <p class="mt-2 text-xs text-text-secondary dark:text-text-secondary">
                Los precios se mostrarán en esta moneda cuando sea posible
              </p>
            </div>
            <!-- Marketing Opt-in -->
            <div class="card-premium p-4">
              <h3 class="text-sm font-semibold text-text-primary dark:text-text-primary mb-3">
                Comunicaciones de Marketing
              </h3>
              <label class="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  formControlName="marketing_opt_in"
                  class="mt-0.5 h-5 w-5 rounded border-border-default dark:border-border-default text-cta-default focus:ring-2 focus:ring-cta-default focus:ring-offset-0"
                  />
                <div class="flex-1">
                  <span class="text-sm text-text-primary dark:text-text-primary">
                    Recibir ofertas y promociones especiales
                  </span>
                  <p class="mt-1 text-xs text-text-secondary dark:text-text-secondary">
                    Recibirás emails con descuentos exclusivos, nuevas funcionalidades y promociones
                    de AutoRenta. Puedes darte de baja en cualquier momento.
                  </p>
                </div>
              </label>
            </div>
            <!-- Manual Save Button (optional, form auto-saves) -->
            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="onSave()"
                [disabled]="loading() || autoSaving() || !preferencesForm.dirty"
                class="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-cta-default hover:bg-cta-hover text-cta-text shadow-sm hover:shadow-md"
                >
                @if (!loading()) {
                  <span>Guardar Cambios</span>
                }
                @if (loading()) {
                  <span>Guardando...</span>
                }
              </button>
            </div>
          </form>
        }
    
        <!-- Help Section -->
        <div class="mt-8 p-4 rounded-lg bg-info-bg border border-info-border dark:bg-info-bg/20">
          <h4 class="text-sm font-semibold text-info-text mb-2 flex items-center gap-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            Sobre las preferencias
          </h4>
          <ul class="text-xs text-info-text space-y-1.5">
            <li class="flex gap-2">
              <span>•</span>
              <span>Los cambios se guardan automáticamente después de 2 segundos</span>
            </li>
            <li class="flex gap-2">
              <span>•</span>
              <span>La zona horaria afecta la visualización de fechas en reservas</span>
            </li>
            <li class="flex gap-2">
              <span>•</span>
              <span>La moneda preferida se usa para mostrar precios (sujeto a disponibilidad)</span>
            </li>
          </ul>
        </div>
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
export class ProfilePreferencesPage implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly fb = inject(FormBuilder);
  private readonly profileStore = inject(ProfileStore);
  private readonly destroy$ = new Subject<void>();

  readonly profile = this.profileStore.profile;
  readonly loading = signal(false);
  readonly autoSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly preferencesForm = this.fb.group({
    timezone: ['America/Buenos_Aires', Validators.required],
    locale: ['es-AR', Validators.required],
    currency: ['ARS', Validators.required],
    marketing_opt_in: [true],
  });

  constructor() {
    // Setup auto-save
    effect(() => {
      this.setupAutoSave();
    });
  }

  ngOnInit(): void {
    // Load profile if not already loaded
    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }

    // Load data into form
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load data from profile into form
   */
  private loadData(): void {
    const profile = this.profile();
    if (!profile) return;

    this.preferencesForm.patchValue({
      timezone: profile.timezone || 'America/Buenos_Aires',
      locale: profile.locale || 'es-AR',
      currency: profile.currency || 'ARS',
      marketing_opt_in: profile.marketing_opt_in ?? true,
    });

    this.preferencesForm.markAsPristine();
  }

  /**
   * Setup auto-save for form changes
   */
  private setupAutoSave(): void {
    this.preferencesForm.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        if (this.preferencesForm.valid && this.preferencesForm.dirty) {
          void this.autoSave();
        }
      });
  }

  /**
   * Auto-save changes
   */
  private async autoSave(): Promise<void> {
    if (this.loading() || this.autoSaving()) return;

    this.autoSaving.set(true);
    this.error.set(null);

    try {
      const formValue = this.preferencesForm.value;
      // Filter out null values to match UpdateProfileData type
      const updates = Object.fromEntries(Object.entries(formValue).filter(([_, v]) => v !== null));
      await this.profileStore.updateSection('preferences', updates);

      this.preferencesForm.markAsPristine();
      this.logger.debug('✅ Preferencias guardadas automáticamente');
    } catch (err) {
      console.error('Error auto-saving preferences:', err);
    } finally {
      this.autoSaving.set(false);
    }
  }

  /**
   * Manual save
   */
  async onSave(): Promise<void> {
    if (!this.preferencesForm.valid) {
      this.error.set('Por favor corrige los errores en el formulario');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const formValue = this.preferencesForm.value;
      // Filter out null values to match UpdateProfileData type
      const updates = Object.fromEntries(Object.entries(formValue).filter(([_, v]) => v !== null));
      await this.profileStore.updateSection('preferences', updates);

      this.preferencesForm.markAsPristine();
      this.successMessage.set('✅ Preferencias guardadas correctamente');

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage.set(null);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios';
      this.error.set(message);
      console.error('Error saving preferences:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
