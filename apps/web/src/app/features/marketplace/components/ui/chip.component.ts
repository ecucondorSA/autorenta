import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Chip Component V2
 * Small interactive element for filters, tags, or selections
 *
 * Features:
 * - Variants: filled, outlined, text
 * - Removable with X button
 * - Active/selected state
 * - Leading icon support
 * - Avatar variant
 * - Haptic feedback
 */
@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="chipClasses()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-pressed]="active()"
      (click)="handleClick($event)"
    >
      <!-- Leading Icon or Avatar -->
      @if (avatar()) {
        <img [src]="avatar()" [alt]="label()" class="chip-avatar" />
      } @else if (icon()) {
        <span class="chip-icon">
          <ng-content select="[chipIcon]" />
        </span>
      }

      <!-- Label -->
      <span class="chip-label">{{ label() }}</span>

      <!-- Remove Button -->
      @if (removable()) {
        <button
          type="button"
          class="chip-remove"
          (click)="handleRemove($event)"
          [attr.aria-label]="'Remover ' + label()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        font-family: inherit;
        transition: all 0.2s ease;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      /* Variants */
      .chip-filled {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid transparent;
      }

      .chip-filled.is-active {
        background: #4f46e5;
        color: white;
      }

      .chip-outlined {
        background: transparent;
        color: #374151;
        border: 1px solid #e5e7eb;
      }

      .chip-outlined.is-active {
        background: rgba(79, 70, 229, 0.08);
        color: #4f46e5;
        border-color: #4f46e5;
      }

      .chip-text {
        background: transparent;
        color: #6b7280;
        border: 1px solid transparent;
      }

      .chip-text.is-active {
        color: #4f46e5;
      }

      /* Clickable state */
      .is-clickable {
        cursor: pointer;
      }

      .is-clickable:hover {
        transform: translateY(-1px);
      }

      .chip-filled.is-clickable:hover:not(.is-active) {
        background: #e5e7eb;
      }

      .chip-outlined.is-clickable:hover:not(.is-active) {
        background: #f9fafb;
      }

      .is-clickable:active {
        transform: scale(0.97);
      }

      /* Sizes */
      .chip-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
      }

      .chip-lg {
        padding: 0.625rem 1rem;
        font-size: 0.9375rem;
      }

      /* Avatar */
      .chip-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
        margin-left: -0.25rem;
      }

      /* Icon */
      .chip-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
      }

      .chip-icon :global(svg) {
        width: 100%;
        height: 100%;
      }

      /* Label */
      .chip-label {
        line-height: 1;
        white-space: nowrap;
      }

      /* Remove button */
      .chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        padding: 0;
        margin-right: -0.25rem;
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.7;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      .chip-remove:hover {
        opacity: 1;
      }

      .chip-remove svg {
        width: 100%;
        height: 100%;
      }

      /* Color variants */
      .chip-primary {
        background: rgba(79, 70, 229, 0.1);
        color: #4f46e5;
      }

      .chip-success {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
      }

      .chip-warning {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
      }

      .chip-danger {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }
    `,
  ],
})
export class ChipComponent {
  // Props
  label = input.required<string>();
  variant = input<'filled' | 'outlined' | 'text'>('filled');
  size = input<'sm' | 'md' | 'lg'>('md');
  color = input<'default' | 'primary' | 'success' | 'warning' | 'danger'>('default');
  active = input<boolean>(false);
  clickable = input<boolean>(false);
  removable = input<boolean>(false);
  icon = input<boolean>(false);
  avatar = input<string | null>(null);

  // Events
  clicked = output<MouseEvent>();
  removed = output<MouseEvent>();

  chipClasses(): string {
    const classes = ['chip', `chip-${this.variant()}`, `chip-${this.size()}`];

    if (this.active()) classes.push('is-active');
    if (this.clickable()) classes.push('is-clickable');
    if (this.color() !== 'default') classes.push(`chip-${this.color()}`);

    return classes.join(' ');
  }

  handleClick(event: MouseEvent): void {
    if (!this.clickable()) return;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }

    this.clicked.emit(event);
  }

  handleRemove(event: MouseEvent): void {
    event.stopPropagation();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    this.removed.emit(event);
  }
}
