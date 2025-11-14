import { Component, inject, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { OnboardingService, OnboardingStep } from '../../../core/services/onboarding.service';

/**
 * Onboarding Checklist Component
 *
 * Displays progress checklist for locador, locatario, or both.
 *
 * Usage:
 * <app-onboarding-checklist />
 *
 * Automatically shows the correct checklist based on user's primary_goal.
 */
@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-surface-raised rounded-xl shadow-lg p-6 border border-border-default">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-xl font-bold text-text-primary">
            Completa tu perfil
          </h3>
          <p class="text-sm text-text-secondary mt-1">
            {{ getHeaderSubtitle() }}
          </p>
        </div>
        @if (showProgress()) {
        <div class="text-right">
          <div class="text-3xl font-bold text-cta-default">
            {{ currentProgress() }}%
          </div>
          <div class="text-xs text-text-muted">Completado</div>
        </div>
        }
      </div>

      <!-- Progress Bar -->
      @if (showProgress()) {
      <div class="mb-6">
        <div class="w-full h-2 bg-border-muted rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-cta-default to-cta-hover transition-all duration-500"
            [style.width.%]="currentProgress()"
          ></div>
        </div>
      </div>
      }

      <!-- Locador Checklist -->
      @if (shouldShowLocadorChecklist()) {
      <div class="mb-6" [class.mb-0]="!shouldShowLocatarioChecklist()">
        @if (activeChecklist() === 'both') {
        <h4 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Publicar auto
          <span class="text-sm font-normal text-text-muted"
            >({{ locadorProgress() }}%)</span
          >
        </h4>
        }

        <div class="space-y-3">
          @for (step of locadorSteps(); track step.key) {
          <button
            (click)="onStepClick(step)"
            class="w-full flex items-start gap-4 p-4 rounded-lg transition-all border-2"
            [class.bg-success-bg]="step.completed"
            [class.border-success-border]="step.completed"
            [class.bg-surface-elevated]="!step.completed"
            [class.border-border-default]="!step.completed"
            [class.hover:border-cta-default]="!step.completed"
            [class.hover:bg-cta-default/5]="!step.completed"
          >
            <!-- Icon -->
            <div class="flex-shrink-0">
              @if (step.completed) {
              <div
                class="w-6 h-6 rounded-full bg-success-icon flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              } @else {
              <div
                class="w-6 h-6 rounded-full border-2 border-text-muted"
              ></div>
              }
            </div>

            <!-- Content -->
            <div class="flex-1 text-left">
              <h5
                class="font-semibold"
                [class.text-text-muted]="step.completed"
                [class.line-through]="step.completed"
                [class.text-text-primary]="!step.completed"
              >
                {{ step.title }}
              </h5>
            </div>

            <!-- Action Arrow -->
            @if (!step.completed) {
            <svg
              class="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            }
          </button>
          }
        </div>
      </div>
      }

      <!-- Locatario Checklist -->
      @if (shouldShowLocatarioChecklist()) {
      <div>
        @if (activeChecklist() === 'both') {
        <h4 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2 mt-6">
          <svg
            class="w-5 h-5 text-info-dark"
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
          Alquilar auto
          <span class="text-sm font-normal text-text-muted"
            >({{ locatarioProgress() }}%)</span
          >
        </h4>
        }

        <div class="space-y-3">
          @for (step of locatarioSteps(); track step.key) {
          <button
            (click)="onStepClick(step)"
            class="w-full flex items-start gap-4 p-4 rounded-lg transition-all border-2"
            [class.bg-success-bg]="step.completed"
            [class.border-success-border]="step.completed"
            [class.bg-surface-elevated]="!step.completed"
            [class.border-border-default]="!step.completed"
            [class.hover:border-info-dark]="!step.completed"
            [class.hover:bg-info-light/5]="!step.completed"
          >
            <!-- Icon -->
            <div class="flex-shrink-0">
              @if (step.completed) {
              <div
                class="w-6 h-6 rounded-full bg-success-icon flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              } @else {
              <div
                class="w-6 h-6 rounded-full border-2 border-text-muted"
              ></div>
              }
            </div>

            <!-- Content -->
            <div class="flex-1 text-left">
              <h5
                class="font-semibold"
                [class.text-text-muted]="step.completed"
                [class.line-through]="step.completed"
                [class.text-text-primary]="!step.completed"
              >
                {{ step.title }}
              </h5>
            </div>

            <!-- Action Arrow -->
            @if (!step.completed) {
            <svg
              class="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            }
          </button>
          }
        </div>
      </div>
      }

      <!-- Completion Message -->
      @if (isOnboardingComplete()) {
      <div class="mt-6 p-4 bg-success-bg border border-success-border rounded-lg">
        <div class="flex items-center gap-3">
          <svg
            class="w-6 h-6 text-success-icon flex-shrink-0"
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
            <h5 class="font-semibold text-success-text-strong">
              ¡Perfil completado!
            </h5>
            <p class="text-sm text-success-text">
              Ya estás listo para usar AutoRenta
            </p>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [],
})
export class OnboardingChecklistComponent {
  private readonly onboardingService = inject(OnboardingService);

  // Signals from service
  readonly locadorSteps = this.onboardingService.locadorSteps;
  readonly locatarioSteps = this.onboardingService.locatarioSteps;
  readonly activeChecklist = this.onboardingService.activeChecklist;
  readonly locadorProgress = this.onboardingService.locadorProgress;
  readonly locatarioProgress = this.onboardingService.locatarioProgress;
  readonly isOnboardingComplete = this.onboardingService.isOnboardingComplete;

  // Computed
  readonly currentProgress = computed(() => {
    const checklist = this.activeChecklist();
    if (checklist === 'both') {
      return Math.round((this.locadorProgress() + this.locatarioProgress()) / 2);
    }
    if (checklist === 'locador') {
      return this.locadorProgress();
    }
    if (checklist === 'locatario') {
      return this.locatarioProgress();
    }
    return 0;
  });

  readonly showProgress = computed(() => this.activeChecklist() !== null);

  shouldShowLocadorChecklist(): boolean {
    const checklist = this.activeChecklist();
    return checklist === 'locador' || checklist === 'both';
  }

  shouldShowLocatarioChecklist(): boolean {
    const checklist = this.activeChecklist();
    return checklist === 'locatario' || checklist === 'both';
  }

  getHeaderSubtitle(): string {
    const checklist = this.activeChecklist();
    if (checklist === 'both') {
      return 'Completa los pasos para publicar y alquilar autos';
    }
    if (checklist === 'locador') {
      return 'Completa los pasos para publicar tu auto';
    }
    if (checklist === 'locatario') {
      return 'Completa los pasos para alquilar autos';
    }
    return '';
  }

  onStepClick(step: OnboardingStep): void {
    this.onboardingService.navigateToStep(step);
  }
}
