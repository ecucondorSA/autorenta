import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { HapticFeedbackService } from '../../../core/services/haptic-feedback.service';

/**
 * ButtonComponent - Sistema de botones unificado Mobile-First
 *
 * Implementa el patrón de diseño del documento de propuestas (docs/design-proposals.md)
 * con 5 variantes y soporte completo de estados (loading, disabled, hover, active).
 *
 * Features:
 * - 5 variantes: primary, secondary, danger, ghost, outline
 * - 3 tamaños: sm, md, lg (touch-friendly: 44px+ para md/lg)
 * - Estado de loading con spinner
 * - Full width opcional
 * - Haptic feedback en mobile
 * - WCAG 2.5.5 compliant (44px touch targets para md/lg)
 * - WCAG AA compliant (focus rings, contraste validado)
 *
 * @example
 * ```html
 * <app-button variant="primary" size="md" (clicked)="onSave()">
 *   Guardar
 * </app-button>
 * ```
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="buttonClasses()"
      [disabled]="disabled() || loading()"
      [type]="type()"
      (click)="handleClick($event)"
    >
      @if (loading()) {
        <svg
          class="animate-spin h-4 w-4 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      }

      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      :host(.full-width) {
        display: block;
        width: 100%;
      }

      /* Touch-friendly tap highlight removal */
      button {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      /* Active state micro-interaction */
      button:active:not(:disabled) {
        transform: scale(0.97);
      }
    `,
  ],
})
export class ButtonComponent {
  private readonly hapticService = inject(HapticFeedbackService);

  // Inputs
  variant = input<'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  loading = input(false);
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  fullWidth = input(false);
  haptic = input(true); // Enable haptic feedback by default

  // Output
  clicked = output<MouseEvent>();

  // Computed classes
  buttonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-cta-default hover:bg-cta-hover active:bg-cta-pressed text-cta-text focus-visible:ring-border-focus shadow-sm',
      secondary:
        'bg-white border border-border-default hover:bg-surface-secondary text-text-primary focus-visible:ring-border-focus shadow-sm',
      danger: 'bg-error-light hover:bg-red-700 text-white focus-visible:ring-error-light',
      ghost:
        'bg-transparent hover:bg-surface-secondary text-text-primary hover:text-cta-default focus-visible:ring-border-focus',
      outline:
        'border-2 border-cta-default text-text-primary hover:bg-cta-default hover:text-cta-text focus-visible:ring-border-focus',
    };

    // Touch-friendly sizes: WCAG 2.5.5 requires 44x44px minimum for md/lg
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[36px] min-w-[44px]',
      md: 'px-4 py-2.5 text-base gap-2 min-h-[44px] min-w-[44px]',
      lg: 'px-6 py-3.5 text-lg gap-3 min-h-[52px] min-w-[52px]',
    };

    const width = this.fullWidth() ? 'w-full' : '';

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${width}`;
  });

  handleClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      return;
    }

    // Trigger haptic feedback if enabled
    if (this.haptic()) {
      this.triggerHapticFeedback();
    }

    this.clicked.emit(event);
  }

  private triggerHapticFeedback(): void {
    // Use contextual haptic feedback based on button variant
    const variant = this.variant();

    switch (variant) {
      case 'primary':
        this.hapticService.medium();
        break;
      case 'danger':
        this.hapticService.heavy();
        break;
      case 'secondary':
      case 'outline':
        this.hapticService.light();
        break;
      case 'ghost':
        this.hapticService.selection();
        break;
      default:
        this.hapticService.light();
    }
  }
}
