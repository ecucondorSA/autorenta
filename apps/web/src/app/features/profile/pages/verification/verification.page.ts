import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IdentityLevelService } from '../../../../core/services/identity-level.service';
import { VerificationStateService } from '../../../../core/services/verification-state.service';
import { VerificationNotificationsService } from '../../../../core/services/verification-notifications.service';
import { VerificationProgressComponent } from '../../../../shared/components/verification-progress/verification-progress.component';
import { EmailVerificationComponent } from '../../../../shared/components/email-verification/email-verification.component';
import { PhoneVerificationComponent } from '../../../../shared/components/phone-verification/phone-verification.component';
import { SelfieCaptureComponent } from '../../../../shared/components/selfie-capture/selfie-capture.component';
import { MetaService } from '../../../../core/services/meta.service';

@Component({
  standalone: true,
  selector: 'app-verification-page',
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    VerificationProgressComponent,
    EmailVerificationComponent,
    PhoneVerificationComponent,
    SelfieCaptureComponent,
  ],
  template: `
    <div class="min-h-screen bg-surface-base dark:bg-surface-raised">
      <!-- Header -->
      <div
        class="bg-surface-raised dark:bg-surface-base shadow-sm border-b border-border-default dark:border-border-muted"
      >
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex items-center gap-3">
            <a
              routerLink="/profile"
              class="text-text-secondary hover:text-text-primary dark:text-text-muted dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </a>
            <div>
              <h1 class="text-3xl font-bold text-text-primary dark:text-text-inverse">
                Verificación de Identidad
              </h1>
              <p class="text-text-secondary dark:text-text-muted mt-1">
                Completa tu verificación para desbloquear todas las funcionalidades de AutoRenta
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Main Verification Progress -->
          <div class="lg:col-span-2">
            <app-verification-progress></app-verification-progress>

            <!-- Verification Components -->
            <div class="mt-8 space-y-6">
              <!-- Email Verification -->
              <div
                *ngIf="showEmailVerification()"
                class="bg-surface-raised dark:bg-surface-base rounded-lg shadow-sm border border-border-default dark:border-border-muted p-6"
              >
                <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse mb-4">
                  Verificar Email
                </h3>
                <app-email-verification></app-email-verification>
              </div>

              <!-- Phone Verification -->
              <div
                *ngIf="showPhoneVerification()"
                class="bg-surface-raised dark:bg-surface-base rounded-lg shadow-sm border border-border-default dark:border-border-muted p-6"
              >
                <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse mb-4">
                  Verificar Teléfono
                </h3>
                <app-phone-verification></app-phone-verification>
              </div>

              <!-- Selfie Capture -->
              <div
                *ngIf="showSelfieCapture()"
                class="bg-surface-raised dark:bg-surface-base rounded-lg shadow-sm border border-border-default dark:border-border-muted p-6"
              >
                <h3 class="text-lg font-semibold text-text-primary dark:text-text-inverse mb-4">
                  Verificación con Selfie
                </h3>
                <app-selfie-capture></app-selfie-capture>
              </div>
            </div>
          </div>

          <!-- Sidebar: Benefits & Status -->
          <div class="lg:col-span-1">
            <!-- Current Level Badge -->
            <div
              class="bg-surface-raised dark:bg-surface-base rounded-lg shadow-sm border border-border-default dark:border-border-muted p-6 mb-6"
            >
              <h3
                class="text-sm font-semibold text-text-primary dark:text-text-secondary uppercase tracking-wide mb-4"
              >
                Tu Nivel Actual
              </h3>
              <div class="text-center">
                <div
                  class="inline-flex items-center justify-center w-16 h-16 rounded-full font-bold text-xl text-text-inverse mb-3"
                  [class]="getCurrentLevelBadgeClass()"
                >
                  {{ currentLevel() >= 3 ? '✓' : currentLevel() + 1 }}
                </div>
                <p class="text-2xl font-bold text-text-primary dark:text-text-inverse">
                  {{ getCurrentLevelName() }}
                </p>
                <p class="text-sm text-text-secondary dark:text-text-muted mt-2">
                  {{ progressPercentage() }}% completado
                </p>
              </div>
            </div>

            <!-- Level Benefits -->
            <div class="space-y-4">
              <!-- Level 1 Benefits -->
              <div
                class="bg-cta-default/10 dark:bg-cta-default/20 border border-cta-default/40 dark:border-cta-default rounded-lg p-4"
              >
                <h4 class="font-semibold text-cta-default dark:text-cta-default mb-2 text-sm">
                  Level 1: Explorador
                </h4>
                <ul class="space-y-1 text-sm text-cta-default dark:text-cta-default">
                  <li class="flex gap-2">
                    <span class="text-cta-default dark:text-cta-default">•</span>
                    <span>Navegar catálogo</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-cta-default dark:text-cta-default">•</span>
                    <span>Ver detalles de autos</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-cta-default dark:text-cta-default">•</span>
                    <span>Contactar propietarios</span>
                  </li>
                </ul>
              </div>

              <!-- Level 2 Benefits -->
              <div
                class="bg-success-light/10 dark:bg-success-light/20 border border-success-light/40 dark:border-success-light rounded-lg p-4"
              >
                <h4 class="font-semibold text-success-light dark:text-success-light mb-2 text-sm">
                  Level 2: Participante
                </h4>
                <ul class="space-y-1 text-sm text-success-light dark:text-success-light">
                  <li class="flex gap-2">
                    <span class="text-success-light dark:text-success-light">•</span>
                    <span>Hacer reservas</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-success-light dark:text-success-light">•</span>
                    <span>Publicar vehículos</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-success-light dark:text-success-light">•</span>
                    <span>Acceso a wallet</span>
                  </li>
                </ul>
              </div>

              <!-- Level 3 Benefits -->
              <div
                class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
              >
                <h4 class="font-semibold text-purple-900 dark:text-purple-200 mb-2 text-sm">
                  Level 3: Verificado Total
                </h4>
                <ul class="space-y-1 text-sm text-purple-800 dark:text-purple-300">
                  <li class="flex gap-2">
                    <span class="text-purple-600 dark:text-purple-400">•</span>
                    <span>Límites de reserva ampliados</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-purple-600 dark:text-purple-400">•</span>
                    <span>Mejor posicionamiento</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-purple-600 dark:text-purple-400">•</span>
                    <span>Soporte prioritario</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Missing Items Alert -->
            <div
              *ngIf="missingRequirements().length > 0"
              class="mt-6 bg-warning-light/10 dark:bg-warning-light/20 border border-warning-light/40 dark:border-warning-light rounded-lg p-4"
            >
              <h4 class="font-semibold text-warning-light dark:text-warning-light mb-2 text-sm">
                Próximos pasos
              </h4>
              <ul class="space-y-1 text-sm text-warning-light dark:text-warning-light">
                <li *ngFor="let req of missingRequirements()" class="flex gap-2">
                  <span class="text-warning-light dark:text-warning-light">→</span>
                  <span>{{ req.label }}</span>
                </li>
              </ul>
            </div>

            <!-- Completion Celebration -->
            <div
              *ngIf="progressPercentage() === 100"
              class="mt-6 bg-success-light/10 dark:bg-success-light/20 border border-success-light/40 dark:border-success-light rounded-lg p-4 text-center"
            >
              <p class="text-sm font-semibold text-success-light dark:text-success-light">
                ✓ ¡Perfil completamente verificado!
              </p>
              <p class="text-xs text-success-light dark:text-success-light mt-1">
                Puedes disfrutar de todas las funcionalidades
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationPage implements OnInit {
  private readonly identityLevelService = inject(IdentityLevelService);
  private readonly verificationStateService = inject(VerificationStateService);
  private readonly verificationNotificationsService = inject(VerificationNotificationsService);
  private readonly metaService = inject(MetaService);

  readonly progressPercentage = this.identityLevelService.progressPercentage;
  readonly currentLevel = this.identityLevelService.currentLevel;
  readonly verificationProgress = this.identityLevelService.verificationProgress;
  readonly missingRequirements = computed(
    () => this.verificationProgress()?.missing_requirements || [],
  );
  readonly canAccessLevel2 = this.identityLevelService.canAccessLevel2;
  readonly canAccessLevel3 = this.identityLevelService.canAccessLevel3;

  // Computed signals for showing verification components
  readonly showEmailVerification = computed(() => {
    const reqs = this.verificationProgress()?.requirements;
    if (!reqs) return false;
    return !reqs.level_1?.email_verified;
  });

  readonly showPhoneVerification = computed(() => {
    const reqs = this.verificationProgress()?.requirements;
    if (!reqs) return false;
    return !reqs.level_1?.phone_verified && reqs.level_1?.email_verified;
  });

  readonly showSelfieCapture = computed(() => {
    return this.canAccessLevel3();
  });

  async ngOnInit(): Promise<void> {
    this.metaService.updateMeta({
      title: 'Verificación de Identidad',
      description:
        'Completa tu verificación para desbloquear todas las funcionalidades de AutoRenta',
    });

    try {
      await this.identityLevelService.getVerificationProgress();
      await this.verificationStateService.initialize();
      this.verificationNotificationsService.initialize();
      console.log('[VerificationPage] Services initialized');
    } catch (error) {
      console.error('[VerificationPage] Error initializing services:', error);
    }
  }

  getCurrentLevelName(): string {
    const level = this.currentLevel();
    const levelNames: Record<number, string> = {
      0: 'Nivel 1',
      1: 'Nivel 2',
      2: 'Nivel 3',
    };
    return levelNames[level] || 'No verificado';
  }

  getCurrentLevelBadgeClass(): string {
    const level = this.currentLevel();

    if (level >= 2) {
      return 'bg-success-light text-text-primary';
    }
    if (level >= 1) {
      return 'bg-cta-default text-cta-text';
    }
    return 'bg-surface-pressed text-text-primary';
  }
}
