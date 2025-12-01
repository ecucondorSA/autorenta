import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { OnboardingService } from '../../../core/services/onboarding.service';

/**
 * Initial Goal Modal
 *
 * Shown to new users on first login to capture their primary intent.
 *
 * Options:
 * - Publicar mi auto (publish)
 * - Alquilar un auto (rent)
 * - Ambos (both)
 */
@Component({
  selector: 'app-initial-goal-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-fade-in"
        (click)="$event.stopPropagation()"
      >
        <!-- Close button (optional) -->
        <button
          (click)="onDismiss()"
          class="absolute top-4 right-4 text-text-muted hover:text-text-secondary transition"
          aria-label="Cerrar"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- Header -->
        <div class="text-center mb-8">
          <div class="mb-4">
            <svg
              class="w-16 h-16 mx-auto text-cta-default"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 class="h2 text-text-primary mb-2">
            ¡Bienvenido a AutoRenta!
          </h2>
          <p class="text-text-secondary text-lg">
            ¿Qué querés hacer primero?
          </p>
        </div>

        <!-- Goal Options -->
        <div class="space-y-4 mb-6">
          <!-- Option: Publicar auto -->
          <button
            (click)="onSelectGoal('publish')"
            [disabled]="isLoading()"
            class="w-full p-6 border-2 rounded-xl transition-all hover:border-cta-default hover:bg-cta-default/5 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            [class.border-border-default]="selectedGoal() !== 'publish'"
            [class.border-cta-default]="selectedGoal() === 'publish'"
            [class.bg-cta-default/5]="selectedGoal() === 'publish'"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex-shrink-0 w-12 h-12 rounded-full bg-cta-default/10 flex items-center justify-center group-hover:bg-cta-default/20 transition"
              >
                <svg
                  class="w-6 h-6 text-cta-default"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="h4 text-text-primary mb-1">
                  Publicar mi auto
                </h3>
                <p class="text-text-secondary">
                  Quiero generar ingresos alquilando mi vehículo
                </p>
              </div>
            </div>
          </button>

          <!-- Option: Alquilar auto -->
          <button
            (click)="onSelectGoal('rent')"
            [disabled]="isLoading()"
            class="w-full p-6 border-2 rounded-xl transition-all hover:border-info-dark hover:bg-info-light/5 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            [class.border-border-default]="selectedGoal() !== 'rent'"
            [class.border-info-dark]="selectedGoal() === 'rent'"
            [class.bg-info-light/5]="selectedGoal() === 'rent'"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex-shrink-0 w-12 h-12 rounded-full bg-info-light/10 flex items-center justify-center group-hover:bg-info-light/20 transition"
              >
                <svg
                  class="w-6 h-6 text-info-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="h4 text-text-primary mb-1">
                  Alquilar un auto
                </h3>
                <p class="text-text-secondary">
                  Necesito un vehículo para mis viajes
                </p>
              </div>
            </div>
          </button>

          <!-- Option: Ambos -->
          <button
            (click)="onSelectGoal('both')"
            [disabled]="isLoading()"
            class="w-full p-6 border-2 rounded-xl transition-all hover:border-cta-hover hover:bg-cta-default/5 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            [class.border-border-default]="selectedGoal() !== 'both'"
            [class.border-cta-hover]="selectedGoal() === 'both'"
            [class.bg-cta-default/5]="selectedGoal() === 'both'"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex-shrink-0 w-12 h-12 rounded-full bg-cta-default/10 flex items-center justify-center group-hover:bg-cta-default/20 transition"
              >
                <svg
                  class="w-6 h-6 text-cta-hover"
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
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-text-primary mb-1">
                  Ambos
                </h3>
                <p class="text-text-secondary">
                  Quiero publicar mi auto Y alquilar otros vehículos
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Loading state -->
        @if (isLoading()) {
        <div class="text-center py-4">
          <div
            class="inline-block w-8 h-8 border-4 border-cta-default border-t-transparent rounded-full animate-spin"
          ></div>
          <p class="text-text-secondary mt-2">Configurando tu cuenta...</p>
        </div>
        }

        <!-- Error state -->
        @if (error()) {
        <div class="bg-error-bg border border-error-border rounded-lg p-4 mb-4">
          <p class="text-error-text text-sm">{{ error() }}</p>
        </div>
        }

        <!-- Footer -->
        <div class="text-center text-sm text-text-muted mt-6">
          <p>Podés cambiar esto más tarde desde tu perfil</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
    `,
  ],
})
export class InitialGoalModalComponent {
  private readonly onboardingService = inject(OnboardingService);

  readonly selectedGoal = signal<'publish' | 'rent' | 'both' | null>(null);
  readonly isLoading = this.onboardingService.isLoading;
  readonly error = this.onboardingService.error;

  async onSelectGoal(goal: 'publish' | 'rent' | 'both'): Promise<void> {
    this.selectedGoal.set(goal);
    await this.onboardingService.setPrimaryGoal(goal);
  }

  onDismiss(): void {
    this.onboardingService.dismissInitialModal();
  }

  onBackdropClick(_event: MouseEvent): void {
    // Close on backdrop click
    this.onDismiss();
  }
}
