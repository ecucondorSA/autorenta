import {Component, input,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * WizardStepComponent - Container for wizard step content
 *
 * Provides consistent styling and structure for wizard step content.
 * Use this component to wrap the content of each step in a wizard.
 *
 * @example
 * ```html
 * <app-wizard-step
 *   title="Información Básica"
 *   subtitle="Completa los datos principales del vehículo">
 *
 *   <!-- Step content goes here -->
 *   <form>...</form>
 *
 * </app-wizard-step>
 * ```
 */
@Component({
  selector: 'app-wizard-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="wizard-step">
      @if (title()) {
        <div class="step-header">
          <h2 class="step-title">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="step-subtitle">{{ subtitle() }}</p>
          }
        </div>
      }

      <div class="step-body">
        <ng-content></ng-content>
      </div>

      @if (hasFooter) {
        <div class="step-footer">
          <ng-content select="[footer]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .wizard-step {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .step-header {
        border-bottom: 1px solid var(--border-default);
        padding-bottom: 1rem;
      }

      .step-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        margin-bottom: 0.5rem;
      }

      .step-subtitle {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .step-body {
        flex: 1;
      }

      .step-footer {
        border-top: 1px solid var(--border-default);
        padding-top: 1rem;
      }

      /* Mobile */
      @media (max-width: 768px) {
        .step-title {
          font-size: 1.25rem;
        }

        .step-subtitle {
          font-size: 0.8125rem;
        }
      }
    `,
  ],
})
export class WizardStepComponent {
  /**
   * Step title
   */
  title = input<string>();

  /**
   * Step subtitle/description
   */
  subtitle = input<string>();

  /**
   * Internal flag to check if footer content is present
   * This would need to be set via ViewChild/ContentChild in a real implementation
   */
  hasFooter = false;
}
