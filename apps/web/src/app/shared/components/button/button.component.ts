import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ButtonComponent - Sistema de botones unificado
 *
 * Implementa el patrón de diseño del documento de propuestas (docs/design-proposals.md)
 * con 5 variantes y soporte completo de estados (loading, disabled, hover, active).
 *
 * Features:
 * - 5 variantes: primary, secondary, danger, ghost, outline
 * - 3 tamaños: sm, md, lg
 * - Estado de loading con spinner
 * - Full width opcional
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
      (click)="handleClick($event)">

      @if (loading()) {
        <svg
          class="animate-spin h-4 w-4 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }

      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class ButtonComponent {
  // Inputs
  variant = input<'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  loading = input(false);
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  fullWidth = input(false);

  // Output
  clicked = output<MouseEvent>();

  // Computed classes
  buttonClasses = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-cta-default hover:bg-cta-hover active:bg-cta-pressed text-cta-text focus-visible:ring-border-focus',
      secondary: 'bg-cta-secondary hover:bg-cta-secondary-hover text-cta-secondary-text focus-visible:ring-border-focus',
      danger: 'bg-error-text hover:bg-error-strong text-white focus-visible:ring-error-border',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-primary focus-visible:ring-border-focus',
      outline: 'border-2 border-border-default hover:bg-surface-hover text-text-primary focus-visible:ring-border-focus'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-3'
    };

    const width = this.fullWidth() ? 'w-full' : '';

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${width}`;
  });

  handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
