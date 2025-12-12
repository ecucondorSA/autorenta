import {Component, inject, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ProfileStore } from '../../../core/stores/profile.store';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Profile Security Page
 *
 * Dedicated page for security settings:
 * - Change password
 * - ToS acceptance status
 * - Active sessions (future)
 * - Security activity log (future)
 */
@Component({
  selector: 'app-profile-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
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
        <ion-title class="text-text-primary dark:text-text-secondary"> Seguridad </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-surface-base dark:bg-surface-base">
      <div class="min-h-full py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary dark:text-text-primary mb-2">
            Configuración de Seguridad
          </h1>
          <p class="text-sm text-text-secondary dark:text-text-secondary">
            Gestiona la seguridad de tu cuenta.
          </p>
        </div>

        <!-- Change Password Section -->
        <div class="card-premium p-6 mb-6">
          <h2 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">
            Cambiar Contraseña
          </h2>

          <!-- Success Message -->
          <div
            *ngIf="passwordChangeSuccess()"
            class="mb-4 p-3 rounded-lg bg-success-light/10 border border-success-light/40 text-sm text-success-text"
          >
            ✅ Contraseña actualizada correctamente
          </div>

          <!-- Error Message -->
          <div
            *ngIf="passwordError()"
            class="mb-4 p-3 rounded-lg bg-error-bg border border-error-border text-sm text-error-text"
          >
            {{ passwordError() }}
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4">
            <!-- Current Password -->
            <div>
              <label
                for="currentPassword"
                class="block text-sm font-medium text-text-primary dark:text-text-primary mb-1"
              >
                Contraseña Actual
              </label>
              <input
                id="currentPassword"
                type="password"
                formControlName="currentPassword"
                class="w-full px-3 py-2 rounded-lg border border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary text-text-primary dark:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default"
                placeholder="Tu contraseña actual"
              />
              <p
                *ngIf="
                  passwordForm.get('currentPassword')?.invalid &&
                  passwordForm.get('currentPassword')?.touched
                "
                class="mt-1 text-xs text-error-text"
              >
                La contraseña actual es requerida
              </p>
            </div>

            <!-- New Password -->
            <div>
              <label
                for="newPassword"
                class="block text-sm font-medium text-text-primary dark:text-text-primary mb-1"
              >
                Nueva Contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                formControlName="newPassword"
                class="w-full px-3 py-2 rounded-lg border border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary text-text-primary dark:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default"
                placeholder="Mínimo 8 caracteres"
              />
              <p
                *ngIf="
                  passwordForm.get('newPassword')?.invalid &&
                  passwordForm.get('newPassword')?.touched
                "
                class="mt-1 text-xs text-error-text"
              >
                La contraseña debe tener al menos 8 caracteres
              </p>
            </div>

            <!-- Confirm New Password -->
            <div>
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-text-primary dark:text-text-primary mb-1"
              >
                Confirmar Nueva Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                class="w-full px-3 py-2 rounded-lg border border-border-default dark:border-border-default bg-surface-raised dark:bg-surface-secondary text-text-primary dark:text-text-secondary focus:outline-none focus:ring-2 focus:ring-cta-default"
                placeholder="Repite la nueva contraseña"
              />
              <p
                *ngIf="
                  passwordForm.hasError('passwordMismatch') &&
                  passwordForm.get('confirmPassword')?.touched
                "
                class="mt-1 text-xs text-error-text"
              >
                Las contraseñas no coinciden
              </p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="changingPassword() || passwordForm.invalid"
              class="w-full px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-cta-default hover:bg-cta-hover text-cta-text shadow-sm hover:shadow-md"
            >
              <span *ngIf="!changingPassword()">Cambiar Contraseña</span>
              <span *ngIf="changingPassword()">Cambiando...</span>
            </button>
          </form>
        </div>

        <!-- Terms of Service -->
        <div class="card-premium p-6 mb-6">
          <h2 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">
            Términos y Condiciones
          </h2>
          <div class="flex items-start gap-3">
            <svg
              class="h-5 w-5 text-success-text flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p class="text-sm text-text-primary dark:text-text-primary">
                Aceptaste los Términos y Condiciones el
                <span class="font-semibold">{{ formatDate(profile()?.tos_accepted_at) }}</span>
              </p>
              <a
                href="/legal/terms"
                target="_blank"
                class="mt-2 inline-block text-xs text-cta-default hover:text-cta-hover underline"
              >
                Ver Términos y Condiciones →
              </a>
            </div>
          </div>
        </div>

        <!-- Verification Status -->
        <div class="card-premium p-6">
          <h2 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">
            Estado de Verificación
          </h2>
          <div class="space-y-3">
            <!-- Email -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-primary dark:text-text-primary">Email</span>
              <span
                [class]="
                  profile()?.email_verified
                    ? 'text-success-text font-semibold text-sm'
                    : 'text-text-muted text-sm'
                "
              >
                {{ profile()?.email_verified ? '✓ Verificado' : '✗ Sin verificar' }}
              </span>
            </div>

            <!-- Phone -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-primary dark:text-text-primary">Teléfono</span>
              <span
                [class]="
                  profile()?.phone_verified
                    ? 'text-success-text font-semibold text-sm'
                    : 'text-text-muted text-sm'
                "
              >
                {{ profile()?.phone_verified ? '✓ Verificado' : '✗ Sin verificar' }}
              </span>
            </div>

            <!-- Driver License -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-primary dark:text-text-primary"
                >Licencia de Conducir</span
              >
              <span
                [class]="
                  profile()?.id_verified
                    ? 'text-success-text font-semibold text-sm'
                    : 'text-text-muted text-sm'
                "
              >
                {{ profile()?.id_verified ? '✓ Verificado' : '✗ Sin verificar' }}
              </span>
            </div>
          </div>

          <a
            routerLink="/profile/verification"
            class="mt-4 inline-block text-sm text-cta-default hover:text-cta-hover font-semibold"
          >
            Gestionar verificaciones →
          </a>
        </div>

        <!-- Future: Active Sessions -->
        <!-- <div class="card-premium p-6 mt-6">
          <h2 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">
            Sesiones Activas
          </h2>
          <p class="text-sm text-text-secondary">Próximamente...</p>
        </div> -->
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
export class ProfileSecurityPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileStore = inject(ProfileStore);
  private readonly authService = inject(AuthService);

  readonly profile = this.profileStore.profile;
  readonly loading = signal(false);
  readonly changingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordChangeSuccess = signal(false);

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    },
  );

  ngOnInit(): void {
    // Load profile if not already loaded
    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(form: FormGroup): { passwordMismatch: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  /**
   * Change password using Supabase Auth
   */
  async onChangePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordError.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.changingPassword.set(true);
    this.passwordError.set(null);
    this.passwordChangeSuccess.set(false);

    try {
      const newPassword = this.passwordForm.get('newPassword')?.value;

      if (!newPassword) {
        throw new Error('Nueva contraseña es requerida');
      }

      // Use Supabase Auth to update password
      await this.authService.updatePassword(newPassword);

      // Success!
      this.passwordChangeSuccess.set(true);
      this.passwordForm.reset();

      // Clear success message after 5 seconds
      setTimeout(() => {
        this.passwordChangeSuccess.set(false);
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      const message =
        errorMessage === 'New password should be different from the old password'
          ? 'La nueva contraseña debe ser diferente a la actual'
          : errorMessage || 'Error al cambiar la contraseña';

      this.passwordError.set(message);
      console.error('Error changing password:', err);
    } finally {
      this.changingPassword.set(false);
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Fecha desconocida';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
