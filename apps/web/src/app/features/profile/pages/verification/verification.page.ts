import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  computed,
} from '@angular/core';
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
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex items-center gap-3">
            <a routerLink="/profile" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </a>
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Verificación de Identidad</h1>
              <p class="text-gray-600 dark:text-gray-400 mt-1">
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
              <div *ngIf="showEmailVerification()" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Verificar Email</h3>
                <app-email-verification></app-email-verification>
              </div>

              <!-- Phone Verification -->
              <div *ngIf="showPhoneVerification()" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Verificar Teléfono</h3>
                <app-phone-verification></app-phone-verification>
              </div>

              <!-- Selfie Capture -->
              <div *ngIf="showSelfieCapture()" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Verificación con Selfie</h3>
                <app-selfie-capture></app-selfie-capture>
              </div>
            </div>
          </div>

          <!-- Sidebar: Benefits & Status -->
          <div class="lg:col-span-1">
            <!-- Current Level Badge -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
                Tu Nivel Actual
              </h3>
              <div class="text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full font-bold text-xl text-white mb-3"
                  [class]="getCurrentLevelBadgeClass()">
                  {{ currentLevel() >= 3 ? '✓' : currentLevel() + 1 }}
                </div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ getCurrentLevelName() }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {{ progressPercentage() }}% completado
                </p>
              </div>
            </div>

            <!-- Level Benefits -->
            <div class="space-y-4">
              <!-- Level 1 Benefits -->
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 class="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm">
                  Level 1: Explorador
                </h4>
                <ul class="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                  <li class="flex gap-2">
                    <span class="text-blue-600 dark:text-blue-400">•</span>
                    <span>Navegar catálogo</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-blue-600 dark:text-blue-400">•</span>
                    <span>Ver detalles de autos</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-blue-600 dark:text-blue-400">•</span>
                    <span>Contactar propietarios</span>
                  </li>
                </ul>
              </div>

              <!-- Level 2 Benefits -->
              <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 class="font-semibold text-green-900 dark:text-green-200 mb-2 text-sm">
                  Level 2: Participante
                </h4>
                <ul class="space-y-1 text-sm text-green-800 dark:text-green-300">
                  <li class="flex gap-2">
                    <span class="text-green-600 dark:text-green-400">•</span>
                    <span>Hacer reservas</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-green-600 dark:text-green-400">•</span>
                    <span>Publicar vehículos</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-green-600 dark:text-green-400">•</span>
                    <span>Acceso a wallet</span>
                  </li>
                </ul>
              </div>

              <!-- Level 3 Benefits -->
              <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
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
            <div *ngIf="missingRequirements().length > 0" class="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h4 class="font-semibold text-orange-900 dark:text-orange-200 mb-2 text-sm">
                Próximos pasos
              </h4>
              <ul class="space-y-1 text-sm text-orange-800 dark:text-orange-300">
                <li *ngFor="let req of missingRequirements()" class="flex gap-2">
                  <span class="text-orange-600 dark:text-orange-400">→</span>
                  <span>{{ req.label }}</span>
                </li>
              </ul>
            </div>

            <!-- Completion Celebration -->
            <div *ngIf="progressPercentage() === 100" class="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <p class="text-sm font-semibold text-green-900 dark:text-green-200">
                ✓ ¡Perfil completamente verificado!
              </p>
              <p class="text-xs text-green-800 dark:text-green-300 mt-1">
                Puedes disfrutar de todas las funcionalidades
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
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
      description: 'Completa tu verificación para desbloquear todas las funcionalidades de AutoRenta',
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
      return 'bg-green-500 text-white';
    }
    if (level >= 1) {
      return 'bg-blue-500 text-white';
    }
    return 'bg-gray-300 text-gray-700';
  }
}
