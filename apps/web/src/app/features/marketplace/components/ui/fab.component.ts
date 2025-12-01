import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FAB (Floating Action Button) Component V2
 *
 * Features:
 * - Primary action button that floats above content
 * - Extended variant with label
 * - Mini variant for secondary actions
 * - Position variants (bottom-right, bottom-left, bottom-center)
 * - Haptic feedback on tap
 * - Animation on scroll (hide/show)
 */
@Component({
  selector: 'app-fab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="fabClasses()"
      [disabled]="disabled()"
      (click)="handleClick($event)"
      [attr.aria-label]="ariaLabel()"
    >
      <!-- Icon -->
      <span class="fab-icon">
        <ng-content select="[fabIcon]" />
      </span>

      <!-- Extended Label -->
      @if (extended() && label()) {
        <span class="fab-label">{{ label() }}</span>
      }
    </button>
  `,
  styles: [
    `
      button {
        position: fixed;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        background: var(--cta-default, #4f46e5); /* Replaced gradient with solid color token */
        color: white;
        border: none;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 999;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      /* Regular FAB */
      .fab-regular {
        width: 56px;
        height: 56px;
        padding: 0;
      }

      /* Mini FAB */
      .fab-mini {
        width: 40px;
        height: 40px;
        padding: 0;
      }

      /* Extended FAB */
      .fab-extended {
        height: 56px;
        padding: 0 1.5rem;
        min-width: 120px;
      }

      /* Position variants */
      .position-bottom-right {
        bottom: calc(1rem + env(safe-area-inset-bottom));
        right: 1rem;
      }

      .position-bottom-left {
        bottom: calc(1rem + env(safe-area-inset-bottom));
        left: 1rem;
      }

      .position-bottom-center {
        bottom: calc(1rem + env(safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
      }

      /* With bottom nav adjustment */
      .with-bottom-nav {
        bottom: calc(76px + env(safe-area-inset-bottom));
      }

      /* Hover state */
      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
      }

      .position-bottom-center:hover:not(:disabled) {
        transform: translate(-50%, -2px);
      }

      /* Active state */
      button:active:not(:disabled) {
        transform: scale(0.95);
      }

      .position-bottom-center:active:not(:disabled) {
        transform: translate(-50%, 0) scale(0.95);
      }

      /* Disabled state */
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      /* Icon */
      .fab-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      }

      .fab-icon :global(svg) {
        width: 100%;
        height: 100%;
      }

      /* Label */
      .fab-label {
        line-height: 1;
      }

      /* Hide on scroll (optional animation) */
      .hide-on-scroll {
        animation: fadeOut 0.3s ease forwards;
      }

      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translateY(100px);
        }
      }

      /* Secondary color variant */
      .fab-secondary {
        background: #10b981;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      }

      .fab-secondary:hover:not(:disabled) {
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
      }
    `,
  ],
})
export class FABComponent {
  // Props
  variant = input<'regular' | 'mini' | 'extended'>('regular');
  position = input<'bottom-right' | 'bottom-left' | 'bottom-center'>('bottom-right');
  label = input<string>('');
  ariaLabel = input<string>('');
  disabled = input<boolean>(false);
  withBottomNav = input<boolean>(false);
  color = input<'primary' | 'secondary'>('primary');
  hideOnScroll = input<boolean>(false);

  // Events
  clicked = output<MouseEvent>();

  // Extended state
  extended = (): boolean => this.variant() === 'extended';

  fabClasses(): string {
    const classes = [`fab-${this.variant()}`, `fab-${this.color()}`, `position-${this.position()}`];

    if (this.withBottomNav()) classes.push('with-bottom-nav');
    if (this.hideOnScroll()) classes.push('hide-on-scroll');

    return classes.join(' ');
  }

  handleClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      return;
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    this.clicked.emit(event);
  }
}
