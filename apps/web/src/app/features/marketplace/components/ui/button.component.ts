import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Button Component V2
 * Flexible button with multiple variants and sizes
 *
 * Variants: primary, secondary, ghost, danger, success
 * Sizes: sm, md, lg
 * States: loading, disabled
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button-v2',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [class]="getButtonClasses()"
      [disabled]="disabled() || loading()"
      (click)="handleClick($event)"
    >
      @if (loading()) {
        <svg class="spinner" viewBox="0 0 24 24">
          <circle class="spinner-track" cx="12" cy="12" r="10" fill="none" stroke-width="3" />
          <circle class="spinner-fill" cx="12" cy="12" r="10" fill="none" stroke-width="3" />
        </svg>
      }

      @if (icon() && !loading()) {
        <span class="icon" [innerHTML]="icon()"></span>
      }

      <span class="label">
        <ng-content />
      </span>

      @if (iconRight()) {
        <span class="icon-right" [innerHTML]="iconRight()"></span>
      }
    </button>
  `,
  styles: [
    `
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-family: inherit;
        font-weight: 600;
        border-radius: 0.75rem;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;
        text-decoration: none;
        position: relative;
        overflow: hidden;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      button:active:not(:disabled) {
        transform: scale(0.98);
      }

      /* Sizes */
      button.size-sm {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        min-height: 36px;
      }

      button.size-md {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        min-height: 44px;
      }

      button.size-lg {
        padding: 1rem 2rem;
        font-size: 1.125rem;
        min-height: 52px;
      }

      /* Variants */
      button.variant-primary {
        background: var(--cta-default, #A7D8F4); /* Reemplazado hex con token semántico */
        color: white;
      }

      button.variant-primary:hover:not(:disabled) {
        background: var(--cta-dark, #8EC9EC); /* Reemplazado hex con token semántico */
      }

      button.variant-secondary {
        background: var(--surface-light-subtle, #F5F5F5); /* Reemplazado hex con token semántico */
        color: var(--text-secondary, #4E4E4E); /* Reemplazado hex con token semántico */
      }

      button.variant-secondary:hover:not(:disabled) {
        background: var(--surface-hover-light, #E3E3E3); /* Reemplazado hex con token semántico */
      }

      button.variant-ghost {
        background: transparent;
        color: var(--text-secondary, #4E4E4E); /* Reemplazado hex con token semántico */
      }

      button.variant-ghost:hover:not(:disabled) {
        background: var(--surface-hover-light, #E3E3E3); /* Reemplazado hex con token semántico */
      }

      button.variant-danger {
        background: var(--error-default, #B25E5E); /* Reemplazado hex con token semántico */
        color: white;
      }

      button.variant-danger:hover:not(:disabled) {
        background: var(--error-dark); /* Reemplazado hex con token semántico */
      }

      button.variant-success {
        background: var(--success-default); /* Reemplazado hex con token semántico */
        color: white;
      }

      button.variant-success:hover:not(:disabled) {
        background: var(--success-dark, #0F9D58); /* Reemplazado hex con token semántico */
      }

      /* Full width */
      button.full-width {
        width: 100%;
      }

      /* Loading spinner */
      .spinner {
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
      }

      .spinner-track {
        stroke: currentColor;
        opacity: 0.2;
      }

      .spinner-fill {
        stroke: currentColor;
        stroke-dasharray: 63;
        stroke-dashoffset: 47;
        transform-origin: center;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Icons */
      .icon,
      .icon-right {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
      }

      .label {
        line-height: 1;
      }
    `,
  ],
})
export class ButtonV2Component {
  // Inputs
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  fullWidth = input<boolean>(false);
  icon = input<string>('');
  iconRight = input<string>('');

  // Output
  clicked = output<MouseEvent>();

  getButtonClasses(): string {
    const classes = [`variant-${this.variant()}`, `size-${this.size()}`];

    if (this.fullWidth()) {
      classes.push('full-width');
    }

    return classes.join(' ');
  }

  handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
