import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IdentityLevelService } from '../../../core/services/identity-level.service';

@Component({
  standalone: true,
  selector: 'app-verification-progress',
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Estado de Verificación</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Completa los niveles para desbloquear todas las funcionalidades
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold text-sky-600">{{ progressPercentage() }}%</div>
          <div class="text-xs text-gray-500 dark:text-gray-300">Completado</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            class="h-full transition-all duration-500 ease-out rounded-full"
            [class]="getProgressBarClass()"
            [style.width.%]="progressPercentage()"
          ></div>
        </div>
      </div>

      <!-- Level Badges -->
      <div class="space-y-4">
        <!-- Level 1 -->
        <div class="flex items-start gap-4">
          <div
            class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300"
            [class]="getLevelBadgeClass(1)"
          >
            {{ isLevelComplete(1) ? '✓' : '1' }}
          </div>
          <div class="flex-grow">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-gray-900">Level 1: Explorador</h4>
              <span
                class="text-xs font-medium px-2 py-1 rounded-full"
                [class]="getLevelStatusClass(1)"
              >
                {{ getLevelStatusLabel(1) }}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Verifica tu email o teléfono
            </p>
            <div class="mt-2 space-y-1">
              <div class="flex items-center gap-2 text-sm">
                <span [class]="getCheckmarkClass(requirements()?.level_1?.email_verified)">
                  {{ requirements()?.level_1?.email_verified ? '✓' : '○' }}
                </span>
                <span class="text-gray-700">Email verificado</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span [class]="getCheckmarkClass(requirements()?.level_1?.phone_verified)">
                  {{ requirements()?.level_1?.phone_verified ? '✓' : '○' }}
                </span>
                <span class="text-gray-700">Teléfono verificado</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="ml-6 border-l-2 border-gray-200 h-4"></div>

        <!-- Level 2 -->
        <div class="flex items-start gap-4">
          <div
            class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300"
            [class]="getLevelBadgeClass(2)"
          >
            {{ isLevelComplete(2) ? '✓' : '2' }}
          </div>
          <div class="flex-grow">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-gray-900">Level 2: Participante</h4>
              <span
                class="text-xs font-medium px-2 py-1 rounded-full"
                [class]="getLevelStatusClass(2)"
              >
                {{ getLevelStatusLabel(2) }}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Sube tus documentos de identidad
              <span *ngIf="!canAccessLevel2()" class="text-orange-600 font-medium">
                (Requiere Level 1)
              </span>
            </p>
            <div class="mt-2 space-y-1">
              <div class="flex items-center gap-2 text-sm">
                <span [class]="getCheckmarkClass(requirements()?.level_2?.document_verified)">
                  {{ requirements()?.level_2?.document_verified ? '✓' : '○' }}
                </span>
                <span class="text-gray-700">DNI verificado</span>
                <span
                  *ngIf="requirements()?.level_2?.ai_score"
                  class="text-xs text-gray-500 dark:text-gray-300 ml-auto"
                >
                  ({{ requirements()?.level_2?.ai_score }}% confianza)
                </span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span [class]="getCheckmarkClass(requirements()?.level_2?.driver_license_verified)">
                  {{ requirements()?.level_2?.driver_license_verified ? '✓' : '○' }}
                </span>
                <span class="text-gray-700">Licencia de conducir</span>
                <span
                  *ngIf="requirements()?.level_2?.driver_license_score"
                  class="text-xs text-gray-500 dark:text-gray-300 ml-auto"
                >
                  ({{ requirements()?.level_2?.driver_license_score }}% confianza)
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="ml-6 border-l-2 border-gray-200 h-4"></div>

        <!-- Level 3 -->
        <div class="flex items-start gap-4">
          <div
            class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300"
            [class]="getLevelBadgeClass(3)"
          >
            {{ isLevelComplete(3) ? '✓' : '3' }}
          </div>
          <div class="flex-grow">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-gray-900">Level 3: Verificado Total</h4>
              <span
                class="text-xs font-medium px-2 py-1 rounded-full"
                [class]="getLevelStatusClass(3)"
              >
                {{ getLevelStatusLabel(3) }}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Verifica tu identidad con selfie video
              <span *ngIf="!canAccessLevel3()" class="text-orange-600 font-medium">
                (Requiere Level 2)
              </span>
            </p>
            <div class="mt-2 space-y-1">
              <div class="flex items-center gap-2 text-sm">
                <span [class]="getCheckmarkClass(requirements()?.level_3?.selfie_verified)">
                  {{ requirements()?.level_3?.selfie_verified ? '✓' : '○' }}
                </span>
                <span class="text-gray-700">Selfie verificado</span>
                <span
                  *ngIf="requirements()?.level_3?.face_match_score"
                  class="text-xs text-gray-500 dark:text-gray-300 ml-auto"
                >
                  ({{ requirements()?.level_3?.face_match_score }}% match)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Missing Requirements Alert -->
      <div
        *ngIf="missingRequirements().length > 0"
        class="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg"
      >
        <h4 class="text-sm font-semibold text-orange-900 mb-2">Requisitos pendientes:</h4>
        <ul class="space-y-1">
          <li *ngFor="let req of missingRequirements()" class="text-sm text-orange-800">
            • {{ req.label }}
          </li>
        </ul>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="mt-4 flex items-center justify-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>

      <!-- Error State -->
      <div
        *ngIf="error()"
        class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
      >
        {{ error() }}
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationProgressComponent implements OnInit {
  private readonly identityLevelService = inject(IdentityLevelService);

  readonly progressPercentage = this.identityLevelService.progressPercentage;
  readonly currentLevel = this.identityLevelService.currentLevel;
  readonly loading = this.identityLevelService.loading;
  readonly error = this.identityLevelService.error;

  readonly verificationProgress = this.identityLevelService.verificationProgress;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);
  readonly missingRequirements = computed(
    () => this.verificationProgress()?.missing_requirements || [],
  );
  readonly canAccessLevel2 = this.identityLevelService.canAccessLevel2;
  readonly canAccessLevel3 = this.identityLevelService.canAccessLevel3;

  async ngOnInit(): Promise<void> {
    try {
      await this.identityLevelService.getVerificationProgress();
    } catch (_error) {
      console.error('Failed to load verification progress:', _error);
    }
  }

  isLevelComplete(level: number): boolean {
    return this.currentLevel() >= level;
  }

  getLevelBadgeClass(level: number): string {
    const isComplete = this.isLevelComplete(level);
    const isCurrent = this.currentLevel() === level - 1;

    if (isComplete) {
      return 'bg-green-500 text-white shadow-lg';
    }
    if (isCurrent) {
      return 'bg-sky-500 text-white shadow-md animate-pulse';
    }
    return 'bg-gray-200 text-gray-500 dark:text-gray-300';
  }

  getLevelStatusClass(level: number): string {
    const isComplete = this.isLevelComplete(level);

    if (isComplete) {
      return 'bg-green-100 text-green-800';
    }
    if (this.currentLevel() === level - 1) {
      return 'bg-sky-100 text-sky-600';
    }
    return 'bg-gray-100 text-gray-600 dark:text-gray-300';
  }

  getLevelStatusLabel(level: number): string {
    const isComplete = this.isLevelComplete(level);

    if (isComplete) {
      return 'Completado';
    }
    if (this.currentLevel() === level - 1) {
      return 'En progreso';
    }
    return 'Bloqueado';
  }

  getCheckmarkClass(isComplete: boolean | undefined): string {
    return isComplete ? 'text-green-600 font-bold' : 'text-gray-400 dark:text-gray-300';
  }

  getProgressBarClass(): string {
    const progress = this.progressPercentage();

    if (progress === 100) {
      return 'bg-gradient-to-r from-green-500 to-green-600';
    }
    if (progress >= 66) {
      return 'bg-gradient-to-r from-blue-500 to-blue-600';
    }
    if (progress >= 33) {
      return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    }
    return 'bg-gradient-to-r from-orange-500 to-orange-600';
  }
}
