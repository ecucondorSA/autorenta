import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ProfileStore } from '@core/stores/profile.store';
import { AuthService } from '@core/services/auth/auth.service';
import { PasskeysService } from '@core/services/auth/passkeys.service';

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
  imports: [IonicModule, ReactiveFormsModule],
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
        <ion-title class="text-text-primary"> Seguridad </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-surface-base">
      <div class="min-h-full py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary mb-2">Configuración de Seguridad</h1>
          <p class="text-sm text-text-secondary">Gestiona la seguridad de tu cuenta.</p>
        </div>

        <!-- Change Password Section -->
        <div class="card-premium p-6 mb-6">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Cambiar Contraseña</h2>

          <!-- Success Message -->
          @if (passwordChangeSuccess()) {
            <div
              class="mb-4 p-3 rounded-lg bg-success-light/10 border border-success-light/40 text-sm text-success-text"
            >
              ✅ Contraseña actualizada correctamente
            </div>
          }

          <!-- Error Message -->
          @if (passwordError()) {
            <div
              class="mb-4 p-3 rounded-lg bg-error-bg border border-error-border text-sm text-error-text"
            >
              {{ passwordError() }}
            </div>
          }

          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4">
            <!-- Current Password -->
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-text-primary mb-1">
                Contraseña Actual
              </label>
              <input
                id="currentPassword"
                type="password"
                formControlName="currentPassword"
                class="w-full px-3 py-2 rounded-lg border border-border-default bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-cta-default"
                placeholder="Tu contraseña actual"
              />
              @if (
                passwordForm.get('currentPassword')?.invalid &&
                passwordForm.get('currentPassword')?.touched
              ) {
                <p class="mt-1 text-xs text-error-text">La contraseña actual es requerida</p>
              }
            </div>

            <!-- New Password -->
            <div>
              <label for="newPassword" class="block text-sm font-medium text-text-primary mb-1">
                Nueva Contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                formControlName="newPassword"
                class="w-full px-3 py-2 rounded-lg border border-border-default bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-cta-default"
                placeholder="Mínimo 8 caracteres"
              />
              @if (
                passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched
              ) {
                <p class="mt-1 text-xs text-error-text">
                  La contraseña debe tener al menos 8 caracteres
                </p>
              }
            </div>

            <!-- Confirm New Password -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-text-primary mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                class="w-full px-3 py-2 rounded-lg border border-border-default bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-cta-default"
                placeholder="Repite la nueva contraseña"
              />
              @if (
                passwordForm.hasError('passwordMismatch') &&
                passwordForm.get('confirmPassword')?.touched
              ) {
                <p class="mt-1 text-xs text-error-text">Las contraseñas no coinciden</p>
              }
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="changingPassword() || passwordForm.invalid"
              class="w-full px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-cta-default hover:bg-cta-hover text-cta-text shadow-sm hover:shadow-md"
            >
              @if (!changingPassword()) {
                <span>Cambiar Contraseña</span>
              }
              @if (changingPassword()) {
                <span>Cambiando...</span>
              }
            </button>
          </form>
        </div>

        <!-- Passkeys / Biometric Auth -->
        @if (passkeysSupported()) {
          <div class="card-premium p-6 mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-text-primary">Huella o Face ID</h2>
                <p class="text-xs text-text-secondary">Inicia sesión sin contraseña usando biometría</p>
              </div>
            </div>

            <!-- Success Message -->
            @if (passkeySuccess()) {
              <div class="mb-4 p-3 rounded-lg bg-success-light/10 border border-success-light/40 text-sm text-success-text">
                ✅ {{ passkeySuccess() }}
              </div>
            }

            <!-- Error Message -->
            @if (passkeysError()) {
              <div class="mb-4 p-3 rounded-lg bg-error-bg border border-error-border text-sm text-error-text">
                {{ passkeysError() }}
              </div>
            }

            <!-- Passkeys List -->
            @if (passkeysLoading()) {
              <div class="py-4 text-center text-text-secondary text-sm">Cargando...</div>
            } @else if (passkeys().length > 0) {
              <div class="space-y-3 mb-4">
                @for (passkey of passkeys(); track passkey.id) {
                  <div class="flex items-center justify-between p-3 rounded-lg bg-surface-raised border border-border-default">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-cta-default/10 flex items-center justify-center">
                        <svg class="w-4 h-4 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-text-primary">{{ passkey.name }}</p>
                        <p class="text-xs text-text-secondary">Registrada el {{ formatDate(passkey.createdAt) }}</p>
                      </div>
                    </div>
                    <button
                      (click)="deletePasskey(passkey.id)"
                      class="p-2 text-error-text hover:bg-error-bg rounded-lg transition-colors"
                      title="Eliminar passkey"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                }
              </div>
            } @else {
              <div class="py-4 text-center text-text-secondary text-sm mb-4">
                No tienes passkeys registradas
              </div>
            }

            <!-- Register Button -->
            <button
              (click)="registerPasskey()"
              [disabled]="passkeysState() === 'registering'"
              class="w-full px-6 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              @if (passkeysState() === 'registering') {
                <span>Registrando...</span>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Agregar huella o Face ID</span>
              }
            </button>
          </div>
        }

        <!-- Terms of Service -->
        <div class="card-premium p-6 mb-6">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Términos y Condiciones</h2>
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
              <p class="text-sm text-text-primary">
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
          <h2 class="text-lg font-semibold text-text-primary mb-4">Estado de Verificación</h2>
          <div class="space-y-3">
            <!-- Email -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-primary">Email</span>
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
              <span class="text-sm text-text-primary">Teléfono</span>
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
              <span class="text-sm text-text-primary">Licencia de Conducir</span>
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
          <h2 class="text-lg font-semibold text-text-primary mb-4">
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
  private readonly passkeysService = inject(PasskeysService);

  readonly profile = this.profileStore.profile;
  readonly loading = signal(false);
  readonly changingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordChangeSuccess = signal(false);

  // Passkeys
  readonly passkeysSupported = this.passkeysService.isSupported;
  readonly passkeysState = this.passkeysService.state;
  readonly passkeysError = this.passkeysService.error;
  readonly passkeys = signal<Array<{ id: string; name: string; createdAt: string }>>([]);
  readonly passkeysLoading = signal(false);
  readonly passkeySuccess = signal<string | null>(null);

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
    // Load passkeys
    void this.loadPasskeys();
  }

  /**
   * Load user's registered passkeys
   */
  async loadPasskeys(): Promise<void> {
    this.passkeysLoading.set(true);
    try {
      const list = await this.passkeysService.listPasskeys();
      this.passkeys.set(list);
    } finally {
      this.passkeysLoading.set(false);
    }
  }

  /**
   * Register a new passkey
   */
  async registerPasskey(): Promise<void> {
    this.passkeySuccess.set(null);
    const success = await this.passkeysService.register();
    if (success) {
      this.passkeySuccess.set('¡Passkey registrada exitosamente!');
      await this.loadPasskeys();
      setTimeout(() => this.passkeySuccess.set(null), 5000);
    }
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(id: string): Promise<void> {
    const confirmed = confirm('¿Estás seguro de eliminar esta passkey?');
    if (!confirmed) return;

    const success = await this.passkeysService.deletePasskey(id);
    if (success) {
      this.passkeySuccess.set('Passkey eliminada');
      await this.loadPasskeys();
      setTimeout(() => this.passkeySuccess.set(null), 3000);
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
