
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';

@Component({
  standalone: true,
  selector: 'app-verification-progress',
  imports: [],
  template: `
    <div
      class="bg-surface-raised rounded-xl shadow-sm border border-border-default overflow-hidden"
      >
      <!-- Compact Header with Progress -->
      <div class="p-4 bg-gradient-to-r from-cta-default/5 to-transparent">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-cta-default/10 flex items-center justify-center">
              <svg
                class="w-5 h-5 text-cta-default"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-text-primary">Estado de Verificación</h3>
              <p class="text-xs text-text-secondary">{{ getProgressMessage() }}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-cta-default">{{ progressPercentage() }}%</div>
          </div>
        </div>
    
        <!-- Progress Bar -->
        <div class="relative">
          <div class="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              [class]="progressPercentage() === 100 ? 'bg-success-light' : 'bg-cta-default'"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
          <!-- Milestone markers -->
          <div class="absolute top-0 left-0 right-0 h-2 flex justify-between px-0.5">
            <div class="w-0.5 h-2 bg-transparent"></div>
            <div
              class="w-0.5 h-2"
              [class]="progressPercentage() >= 50 ? 'bg-transparent' : 'bg-border-default/50'"
            ></div>
            <div
              class="w-0.5 h-2"
              [class]="progressPercentage() >= 80 ? 'bg-transparent' : 'bg-border-default/50'"
            ></div>
            <div class="w-0.5 h-2 bg-transparent"></div>
          </div>
        </div>
      </div>
    
      <!-- Level Steps - Horizontal on desktop, vertical on mobile -->
      <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Level 1 -->
        <div
          class="relative p-3 rounded-lg border transition-all duration-300"
          [class]="getLevelCardClass(1)"
          >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              [class]="getLevelBadgeClass(1)"
              >
              @if (!isLevelComplete(1)) {
                <span>1</span>
              }
              @if (isLevelComplete(1)) {
                <svg
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                    />
                </svg>
              }
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-text-primary truncate">Contacto</h4>
              <span class="text-xs" [class]="getLevelStatusTextClass(1)">{{
                getLevelStatusLabel(1)
              }}</span>
            </div>
          </div>
    
          <!-- Level 1 Items -->
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center gap-2">
              <span [class]="getCheckClass(requirements()?.level_1?.email_verified)">
                {{ requirements()?.level_1?.email_verified ? '✓' : '○' }}
              </span>
              <span class="text-text-secondary">Email</span>
            </div>
            <div class="flex items-center gap-2">
              <span [class]="getCheckClass(requirements()?.level_1?.phone_verified)">
                {{ requirements()?.level_1?.phone_verified ? '✓' : '○' }}
              </span>
              <span class="text-text-secondary">Teléfono</span>
            </div>
          </div>
        </div>
    
        <!-- Level 2 -->
        <div
          class="relative p-3 rounded-lg border transition-all duration-300"
          [class]="getLevelCardClass(2)"
          >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              [class]="getLevelBadgeClass(2)"
              >
              @if (!isLevelComplete(2)) {
                <span>2</span>
              }
              @if (isLevelComplete(2)) {
                <svg
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                    />
                </svg>
              }
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-text-primary truncate">Documentos</h4>
              <span class="text-xs" [class]="getLevelStatusTextClass(2)">{{
                getLevelStatusLabel(2)
              }}</span>
            </div>
          </div>
    
          <!-- Level 2 Items -->
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center gap-2">
              <span [class]="getCheckClass(requirements()?.level_2?.document_verified)">
                {{ requirements()?.level_2?.document_verified ? '✓' : '○' }}
              </span>
              <span class="text-text-secondary">DNI</span>
            </div>
            <div class="flex items-center gap-2">
              <span [class]="getCheckClass(requirements()?.level_2?.driver_license_verified)">
                {{ requirements()?.level_2?.driver_license_verified ? '✓' : '○' }}
              </span>
              <span class="text-text-secondary">Licencia</span>
            </div>
          </div>
    
          <!-- Lock overlay -->
          @if (!canAccessLevel2()) {
            <div
              class="absolute inset-0 bg-surface-base/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center"
              >
              <div class="text-center">
                <svg
                  class="w-5 h-5 text-text-muted mx-auto mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
                <span class="text-xs text-text-muted">Completa Nivel 1</span>
              </div>
            </div>
          }
        </div>
    
        <!-- Level 3 -->
        <div
          class="relative p-3 rounded-lg border transition-all duration-300"
          [class]="getLevelCardClass(3)"
          >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              [class]="getLevelBadgeClass(3)"
              >
              @if (!isLevelComplete(3)) {
                <span>3</span>
              }
              @if (isLevelComplete(3)) {
                <svg
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                    />
                </svg>
              }
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-text-primary truncate">Identidad</h4>
              <span class="text-xs" [class]="getLevelStatusTextClass(3)">{{
                getLevelStatusLabel(3)
              }}</span>
            </div>
          </div>
    
          <!-- Level 3 Items -->
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center gap-2">
              <span [class]="getCheckClass(requirements()?.level_3?.selfie_verified)">
                {{ requirements()?.level_3?.selfie_verified ? '✓' : '○' }}
              </span>
              <span class="text-text-secondary">Selfie verificado</span>
            </div>
          </div>
    
          <!-- Lock overlay -->
          @if (!canAccessLevel3()) {
            <div
              class="absolute inset-0 bg-surface-base/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center"
              >
              <div class="text-center">
                <svg
                  class="w-5 h-5 text-text-muted mx-auto mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
                <span class="text-xs text-text-muted">Completa Nivel 2</span>
              </div>
            </div>
          }
        </div>
      </div>
    
      <!-- Loading State -->
      @if (loading()) {
        <div
          class="absolute inset-0 bg-surface-base/50 flex items-center justify-center rounded-xl"
          >
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-default"></div>
        </div>
      }
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
    const req = this.requirements();
    if (req) {
      switch (level) {
        case 1:
          return req.level_1?.completed ?? false;
        case 2:
          return req.level_2?.completed ?? false;
        case 3:
          return req.level_3?.completed ?? false;
      }
    }
    return this.currentLevel() > level;
  }

  getProgressMessage(): string {
    const progress = this.progressPercentage();
    if (progress === 100) return '¡Verificación completa!';
    if (progress >= 80) return 'Casi terminado';
    if (progress >= 50) return 'Buen progreso';
    if (progress > 0) return 'Comenzando';
    return 'Sin verificar';
  }

  getLevelCardClass(level: number): string {
    const isComplete = this.isLevelComplete(level);
    const isActive = !isComplete && (level === 1 || this.isLevelComplete(level - 1));

    if (isComplete) {
      return 'border-success-light/30 bg-success-light/5';
    }
    if (isActive) {
      return 'border-cta-default/30 bg-cta-default/5';
    }
    return 'border-border-default bg-surface-base';
  }

  getLevelBadgeClass(level: number): string {
    const isComplete = this.isLevelComplete(level);
    const isActive = !isComplete && (level === 1 || this.isLevelComplete(level - 1));

    if (isComplete) {
      return 'bg-success-light text-white';
    }
    if (isActive) {
      return 'bg-cta-default text-cta-text';
    }
    return 'bg-surface-hover text-text-muted';
  }

  getLevelStatusLabel(level: number): string {
    const isComplete = this.isLevelComplete(level);
    if (isComplete) return 'Completado';

    const isActive = level === 1 || this.isLevelComplete(level - 1);
    if (isActive) return 'En progreso';

    return 'Bloqueado';
  }

  getLevelStatusTextClass(level: number): string {
    const isComplete = this.isLevelComplete(level);
    if (isComplete) return 'text-success-strong';

    const isActive = level === 1 || this.isLevelComplete(level - 1);
    if (isActive) return 'text-cta-default';

    return 'text-text-muted';
  }

  getCheckClass(isComplete: boolean | undefined): string {
    return isComplete ? 'text-success-strong font-bold' : 'text-text-muted';
  }
}
