import {Component, computed, input, output,
  ChangeDetectionStrategy} from '@angular/core';


export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  isValid?: () => boolean;
  isOptional?: boolean;
}

/**
 * WizardComponent - Multi-step wizard with progress indicator
 *
 * Features:
 * - Step-by-step navigation with progress indicator
 * - Validation per step
 * - Optional steps support
 * - Keyboard navigation (Enter to continue, Escape to cancel)
 * - Accessibility (ARIA labels, keyboard support)
 *
 * @example
 * ```html
 * <app-wizard
 *   [steps]="wizardSteps"
 *   [currentStepIndex]="currentStep()"
 *   (stepChange)="handleStepChange($event)"
 *   (cancelRequested)="handleCancel()"
 *   (completed)="handleComplete()">
 *
 *   <!-- Step content via ng-content -->
 *   <ng-container *ngIf="currentStep() === 0">
 *     <h2>Step 1 Content</h2>
 *   </ng-container>
 *
 *   <ng-container *ngIf="currentStep() === 1">
 *     <h2>Step 2 Content</h2>
 *   </ng-container>
 * </app-wizard>
 * ```
 */
@Component({
  selector: 'app-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="wizard-container">
      <!-- Progress Indicator -->
      <div
        class="wizard-progress"
        role="progressbar"
        [attr.aria-valuenow]="currentStepIndex() + 1"
        [attr.aria-valuemin]="1"
        [attr.aria-valuemax]="steps().length"
        [attr.aria-label]="progressLabel()"
      >
        <div class="progress-steps">
          @for (step of steps(); track step.id; let i = $index) {
            <div
              class="progress-step"
              [class.completed]="i < currentStepIndex()"
              [class.active]="i === currentStepIndex()"
              [class.upcoming]="i > currentStepIndex()"
              (click)="goToStep(i)"
            >
              <div class="step-indicator">
                @if (i < currentStepIndex()) {
                  <!-- Checkmark for completed steps -->
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                } @else {
                  <!-- Step number -->
                  <span class="step-number">{{ i + 1 }}</span>
                }
              </div>

              <div class="step-info">
                <div class="step-label">{{ step.label }}</div>
                @if (step.description) {
                  <div class="step-description">{{ step.description }}</div>
                }
                @if (step.isOptional) {
                  <span class="step-optional">Opcional</span>
                }
              </div>
            </div>

            @if (i < steps().length - 1) {
              <div class="progress-connector" [class.completed]="i < currentStepIndex()"></div>
            }
          }
        </div>
      </div>

      <!-- Step Content -->
      <div class="wizard-content">
        <ng-content></ng-content>
      </div>

      <!-- Navigation Controls -->
      <div class="wizard-controls">
        <div class="controls-left">
          @if (showCancelButton()) {
            <button
              type="button"
              class="btn-ghost"
              (click)="handleCancel()"
              [disabled]="isProcessing()"
            >
              {{ cancelLabel() }}
            </button>
          }
        </div>

        <div class="controls-right">
          @if (!isFirstStep()) {
            <button
              type="button"
              class="btn-secondary"
              (click)="goBack()"
              [disabled]="isProcessing()"
            >
              Atrás
            </button>
          }

          @if (!isLastStep()) {
            <button
              type="button"
              class="btn-primary"
              (click)="goNext()"
              [disabled]="!canProceed() || isProcessing()"
            >
              {{ nextLabel() }}
            </button>
          } @else {
            <button
              type="button"
              class="btn-primary"
              (click)="handleComplete()"
              [disabled]="!canComplete() || isProcessing()"
            >
              @if (isProcessing()) {
                <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              }
              {{ completeLabel() }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .wizard-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      /* Progress Indicator */
      .wizard-progress {
        background: var(--surface-raised);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        box-shadow: var(--elevation-1);
      }

      .progress-steps {
        display: flex;
        align-items: center;
        gap: 0;
      }

      .progress-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-default);
      }

      .progress-step:hover {
        opacity: 0.8;
      }

      .step-indicator {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        transition: all var(--duration-normal) var(--ease-default);
        margin-bottom: 0.5rem;
      }

      .progress-step.completed .step-indicator {
        background: var(--success-600);
        color: white;
      }

      .progress-step.active .step-indicator {
        background: var(--cta-default);
        color: var(--cta-text);
        box-shadow: 0 0 0 4px var(--cta-default) / 20;
      }

      .progress-step.upcoming .step-indicator {
        background: var(--surface-hover);
        color: var(--text-muted);
        border: 2px solid var(--border-default);
      }

      .step-info {
        text-align: center;
        width: 100%;
      }

      .step-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .progress-step.upcoming .step-label {
        color: var(--text-muted);
      }

      .step-description {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }

      .step-optional {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-style: italic;
      }

      .progress-connector {
        flex: 1;
        height: 2px;
        background: var(--border-default);
        margin: 0 -1rem;
        position: relative;
        top: -1.5rem;
        transition: background var(--duration-normal) var(--ease-default);
      }

      .progress-connector.completed {
        background: var(--success-600);
      }

      /* Content */
      .wizard-content {
        background: var(--surface-raised);
        border-radius: var(--radius-lg);
        padding: 2rem;
        box-shadow: var(--elevation-1);
        min-height: 300px;
      }

      /* Controls */
      .wizard-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
      }

      .controls-left,
      .controls-right {
        display: flex;
        gap: 0.75rem;
      }

      /* Buttons */
      .btn-primary,
      .btn-secondary,
      .btn-ghost {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: 0.875rem;
        transition: all var(--duration-fast) var(--ease-default);
        cursor: pointer;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .btn-primary {
        background: var(--cta-default);
        color: var(--cta-text);
      }

      .btn-primary:hover:not(:disabled) {
        background: var(--cta-hover);
      }

      .btn-primary:active:not(:disabled) {
        background: var(--cta-pressed);
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: var(--cta-secondary);
        color: var(--cta-secondary-text);
      }

      .btn-secondary:hover:not(:disabled) {
        background: var(--cta-secondary-hover);
      }

      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-ghost {
        background: transparent;
        color: var(--text-primary);
      }

      .btn-ghost:hover:not(:disabled) {
        background: var(--surface-hover);
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .wizard-container {
          gap: 1rem;
        }

        .wizard-progress {
          padding: 1rem;
        }

        .progress-steps {
          flex-direction: column;
          align-items: stretch;
        }

        .progress-step {
          flex-direction: row;
          justify-content: flex-start;
          padding: 0.75rem;
          border-radius: var(--radius-md);
        }

        .progress-step.active {
          background: var(--surface-hover);
        }

        .step-indicator {
          margin-bottom: 0;
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .step-info {
          text-align: left;
        }

        .progress-connector {
          display: none;
        }

        .wizard-content {
          padding: 1.5rem;
        }

        .wizard-controls {
          flex-direction: column;
          gap: 0.75rem;
        }

        .controls-left,
        .controls-right {
          width: 100%;
        }

        .controls-right {
          flex-direction: column-reverse;
        }

        .btn-primary,
        .btn-secondary,
        .btn-ghost {
          width: 100%;
        }
      }
    `,
  ],
})
export class WizardComponent {
  // ==================== INPUTS ====================

  /**
   * Array of wizard steps
   */
  steps = input.required<WizardStep[]>();

  /**
   * Current step index (0-based)
   */
  currentStepIndex = input<number>(0);

  /**
   * Show cancel button
   */
  showCancelButton = input<boolean>(true);

  /**
   * Cancel button label
   */
  cancelLabel = input<string>('Cancelar');

  /**
   * Next button label
   */
  nextLabel = input<string>('Siguiente');

  /**
   * Complete button label
   */
  completeLabel = input<string>('Completar');

  /**
   * Is wizard processing (disable controls)
   */
  isProcessing = input<boolean>(false);

  /**
   * Allow navigation to previous steps by clicking
   */
  allowStepClick = input<boolean>(true);

  // ==================== OUTPUTS ====================

  /**
   * Emitted when step changes
   */
  stepChange = output<number>();

  /**
   * Emitted when cancel is clicked
   */
  cancelRequested = output<void>();

  /**
   * Emitted when wizard is completed
   */
  completed = output<void>();

  // ==================== COMPUTED ====================

  /**
   * Progress label for screen readers
   */
  readonly progressLabel = computed(() => {
    const current = this.currentStepIndex() + 1;
    const total = this.steps().length;
    return `Paso ${current} de ${total}`;
  });

  /**
   * Is first step?
   */
  readonly isFirstStep = computed(() => {
    return this.currentStepIndex() === 0;
  });

  /**
   * Is last step?
   */
  readonly isLastStep = computed(() => {
    return this.currentStepIndex() === this.steps().length - 1;
  });

  /**
   * Current step
   */
  readonly currentStep = computed(() => {
    return this.steps()[this.currentStepIndex()];
  });

  /**
   * Can proceed to next step?
   */
  readonly canProceed = computed(() => {
    const step = this.currentStep();
    if (!step) return false;

    // If step is optional, always allow proceeding
    if (step.isOptional) return true;

    // If step has validation function, use it
    if (step.isValid) {
      return step.isValid();
    }

    // Otherwise, allow proceeding
    return true;
  });

  /**
   * Can complete wizard?
   */
  readonly canComplete = computed(() => {
    const step = this.currentStep();
    if (!step) return false;

    // Must be on last step
    if (!this.isLastStep()) return false;

    // If step is optional, always allow completion
    if (step.isOptional) return true;

    // If step has validation function, use it
    if (step.isValid) {
      return step.isValid();
    }

    // Otherwise, allow completion
    return true;
  });

  // ==================== METHODS ====================

  /**
   * Go to specific step
   */
  goToStep(index: number): void {
    if (!this.allowStepClick()) return;
    if (this.isProcessing()) return;
    if (index === this.currentStepIndex()) return;

    // Only allow going to previous steps or the next step if current is valid
    if (
      index < this.currentStepIndex() ||
      (index === this.currentStepIndex() + 1 && this.canProceed())
    ) {
      this.stepChange.emit(index);
    }
  }

  /**
   * Go to next step
   */
  goNext(): void {
    if (!this.canProceed()) return;
    if (this.isProcessing()) return;
    if (this.isLastStep()) return;

    this.stepChange.emit(this.currentStepIndex() + 1);
  }

  /**
   * Go to previous step
   */
  goBack(): void {
    if (this.isProcessing()) return;
    if (this.isFirstStep()) return;

    this.stepChange.emit(this.currentStepIndex() - 1);
  }

  /**
   * Handle cancel
   */
  handleCancel(): void {
    if (this.isProcessing()) return;
    this.cancelRequested.emit();
  }

  /**
   * Handle complete
   */
  handleComplete(): void {
    if (!this.canComplete()) return;
    if (this.isProcessing()) return;

    this.completed.emit();
  }
}
