import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Verification step status
 */
export type VerificationStepStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Verification step definition
 */
export interface VerificationStep {
  id: string;
  label: string;
  status: VerificationStepStatus;
}

/**
 * Verification Stepper Component
 *
 * A horizontal stepper showing verification progress in 3 steps:
 * 1. Contacto (Email + Phone)
 * 2. Documentos (DNI + License)
 * 3. Biometría (Selfie)
 *
 * @example
 * <app-verification-stepper [steps]="verificationSteps()" />
 */
@Component({
  selector: 'app-verification-stepper',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between" role="group" aria-label="Progreso de verificación">
      @for (step of steps(); track step.id; let i = $index; let last = $last) {
        <div class="flex items-center gap-2">
          <!-- Step Circle -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            [ngClass]="getStepClasses(step.status)"
            [attr.aria-current]="step.status === 'in_progress' ? 'step' : null"
          >
            @switch (step.status) {
              @case ('completed') {
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span class="sr-only">Completado:</span>
              }
              @case ('in_progress') {
                <div class="w-2.5 h-2.5 rounded-full bg-current animate-pulse"></div>
                <span class="sr-only">En progreso:</span>
              }
              @default {
                {{ i + 1 }}
                <span class="sr-only">Pendiente:</span>
              }
            }
          </div>
          <!-- Label (hidden on very small screens) -->
          <span
            class="text-xs font-medium hidden sm:inline transition-colors duration-300"
            [ngClass]="getLabelClasses(step.status)"
          >
            {{ step.label }}
          </span>
        </div>
        <!-- Connector Line (except after last) -->
        @if (!last) {
          <div
            class="flex-1 h-0.5 mx-2 transition-colors duration-300"
            [ngClass]="step.status === 'completed' ? 'bg-success-500' : 'bg-border-default'"
            aria-hidden="true"
          ></div>
        }
      }
    </div>
  `,
})
export class VerificationStepperComponent {
  /** Array of verification steps */
  readonly steps = input<VerificationStep[]>([]);

  /** Current step index (0-based) */
  readonly currentStepIndex = computed(() => {
    const stepsArray = this.steps();
    const inProgressIndex = stepsArray.findIndex(s => s.status === 'in_progress');
    if (inProgressIndex >= 0) return inProgressIndex;

    // If no in_progress, return first pending
    const pendingIndex = stepsArray.findIndex(s => s.status === 'pending');
    if (pendingIndex >= 0) return pendingIndex;

    // All completed
    return stepsArray.length - 1;
  });

  /**
   * Get CSS classes for step circle based on status
   */
  getStepClasses(status: VerificationStepStatus): Record<string, boolean> {
    return {
      // Completed
      'bg-success-500 text-white': status === 'completed',
      // In Progress
      'bg-cta-default text-white ring-4 ring-cta-default/20': status === 'in_progress',
      // Pending
      'bg-surface-secondary text-text-muted border border-border-default': status === 'pending',
    };
  }

  /**
   * Get CSS classes for step label based on status
   */
  getLabelClasses(status: VerificationStepStatus): Record<string, boolean> {
    return {
      'text-success-700 font-semibold': status === 'completed',
      'text-cta-default font-semibold': status === 'in_progress',
      'text-text-muted': status === 'pending',
    };
  }
}
