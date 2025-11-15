import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { VerificationProgressComponent } from '../../../shared/components/verification-progress/verification-progress.component';
import { EmailVerificationComponent } from '../../../shared/components/email-verification/email-verification.component';
import { PhoneVerificationComponent } from '../../../shared/components/phone-verification/phone-verification.component';
import { SelfieCaptureComponent } from '../../../shared/components/selfie-capture/selfie-capture.component';
import { ProfileStore } from '../../../core/stores/profile.store';

/**
 * Profile Verification Page
 *
 * Dedicated page for identity verification:
 * - Level 1: Email + Phone verification
 * - Level 2: Document verification (DNI, Driver License)
 * - Level 3: Selfie/Face match
 *
 * Uses existing verification components
 */
@Component({
  selector: 'app-profile-verification',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    VerificationProgressComponent,
    EmailVerificationComponent,
    PhoneVerificationComponent,
    SelfieCaptureComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header> </ion-header>

    <ion-content class="bg-surface-base dark:bg-surface-base ion-padding" fullscreen="true">
      <div class="py-6 px-4 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6 block">
          <h1 class="text-2xl font-bold text-text-primary dark:text-text-primary mb-2 block">
            Verificación de Identidad
          </h1>
          <p class="text-sm text-text-secondary dark:text-text-secondary block">
            Verifica tu identidad para acceder a todas las funcionalidades de AutoRenta.
          </p>
        </div>

        <!-- Verification Progress -->
        <div class="mb-6 block">
          <app-verification-progress class="block"></app-verification-progress>
        </div>

        <!-- Level 1: Email & Phone -->
        <div class="card-premium p-6 mb-6">
          <h2
            class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4 flex items-center gap-2"
          >
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full bg-info-bg text-info-text font-bold text-sm"
            >
              1
            </span>
            Nivel 1: Contacto Básico
          </h2>
          <p class="text-sm text-text-secondary dark:text-text-secondary mb-4">
            Verifica tu email y teléfono para poder comunicarte con otros usuarios.
          </p>

          <!-- Email Verification -->
          <div class="mb-4">
            <app-email-verification />
          </div>

          <!-- Phone Verification -->
          <div>
            <app-phone-verification />
          </div>
        </div>

        <!-- Level 2: Documents -->
        <div class="card-premium p-6 mb-6">
          <h2
            class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4 flex items-center gap-2"
          >
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full bg-warning-bg text-warning-text font-bold text-sm"
            >
              2
            </span>
            Nivel 2: Documentación
          </h2>
          <p class="text-sm text-text-secondary dark:text-text-secondary mb-4">
            Sube tus documentos para verificar tu identidad y poder rentar vehículos.
          </p>

          <div class="space-y-4">
            <!-- DNI/ID Card -->
            <div class="p-4 rounded-lg bg-surface-secondary dark:bg-surface-secondary/70">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <h4 class="text-sm font-semibold text-text-primary dark:text-text-primary">
                    Documento de Identidad (DNI)
                  </h4>
                  <p class="text-xs text-text-secondary dark:text-text-secondary mt-1">
                    Frente y dorso de tu DNI
                  </p>
                </div>
                <span
                  [class]="
                    profile()?.kyc === 'verified'
                      ? 'text-success-text font-semibold text-xs'
                      : 'text-text-muted text-xs'
                  "
                >
                  {{ profile()?.kyc === 'verified' ? '✓ Verificado' : 'Pendiente' }}
                </span>
              </div>
              <a
                *ngIf="profile()?.kyc !== 'verified'"
                routerLink="/verification/upload-documents"
                class="inline-block mt-2 px-4 py-2 rounded-lg bg-cta-default hover:bg-cta-hover text-cta-text text-sm font-semibold transition-all"
              >
                Subir DNI
              </a>
            </div>

            <!-- Driver License -->
            <div class="p-4 rounded-lg bg-surface-secondary dark:bg-surface-secondary/70">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <h4 class="text-sm font-semibold text-text-primary dark:text-text-primary">
                    Licencia de Conducir
                  </h4>
                  <p class="text-xs text-text-secondary dark:text-text-secondary mt-1">
                    Frente y dorso de tu licencia vigente
                  </p>
                </div>
                <span
                  [class]="
                    profile()?.is_driver_verified
                      ? 'text-success-text font-semibold text-xs'
                      : 'text-text-muted text-xs'
                  "
                >
                  {{ profile()?.is_driver_verified ? '✓ Verificado' : 'Pendiente' }}
                </span>
              </div>
              <a
                *ngIf="!profile()?.is_driver_verified"
                routerLink="/verification/upload-documents"
                class="inline-block mt-2 px-4 py-2 rounded-lg bg-cta-default hover:bg-cta-hover text-cta-text text-sm font-semibold transition-all"
              >
                Subir Licencia
              </a>
            </div>
          </div>
        </div>

        <!-- Level 3: Selfie -->
        <div class="card-premium p-6">
          <h2
            class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4 flex items-center gap-2"
          >
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full bg-success-bg text-success-text font-bold text-sm"
            >
              3
            </span>
            Nivel 3: Verificación Facial
          </h2>
          <p class="text-sm text-text-secondary dark:text-text-secondary mb-4">
            Toma una selfie para confirmar que eres tú quien está usando la cuenta.
          </p>

          <app-selfie-capture />
        </div>

        <!-- Help Section -->
        <div class="mt-6 p-4 rounded-lg bg-info-bg border border-info-border dark:bg-info-bg/20">
          <h4 class="text-sm font-semibold text-info-text mb-2 flex items-center gap-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            ¿Por qué necesitamos verificar tu identidad?
          </h4>
          <ul class="text-xs text-info-text space-y-1.5">
            <li class="flex gap-2">
              <span>•</span>
              <span><strong>Seguridad:</strong> Protege a todos los usuarios de la plataforma</span>
            </li>
            <li class="flex gap-2">
              <span>•</span>
              <span
                ><strong>Confianza:</strong> Los usuarios verificados generan más confianza</span
              >
            </li>
            <li class="flex gap-2">
              <span>•</span>
              <span
                ><strong>Acceso completo:</strong> Desbloquea todas las funcionalidades (rentar,
                publicar autos)</span
              >
            </li>
            <li class="flex gap-2">
              <span>•</span>
              <span
                ><strong>Legal:</strong> Cumplimos con regulaciones de prevención de fraude</span
              >
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
        --background: transparent;
        --padding-bottom: 24px;
        min-height: 100vh;
      }
    `,
  ],
})
export class ProfileVerificationPage implements OnInit {
  private readonly profileStore = inject(ProfileStore);

  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;

  ngOnInit(): void {
    // Load profile if not already loaded
    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }
  }
}
