import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TooltipComponent - Generic tooltip for displaying help text
 *
 * Features:
 * - Hover and click activation
 * - Automatic positioning (top, right, bottom, left)
 * - Mobile-friendly (tap to toggle)
 * - Accessibility (ARIA labels)
 *
 * @example
 * ```html
 * <app-tooltip text="This is helpful information">
 *   <button>Hover me</button>
 * </app-tooltip>
 * ```
 */
@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tooltip-wrapper" (mouseenter)="show()" (mouseleave)="hide()" (click)="toggle()">
      <ng-content></ng-content>

      @if (isVisible()) {
        <div class="tooltip-content" [class]="'tooltip-' + position()" role="tooltip" [attr.aria-label]="text()">
          {{ text() }}
          @if (hasIcon()) {
            <svg class="tooltip-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tooltip-wrapper {
      position: relative;
      display: inline-block;
      cursor: help;
    }

    .tooltip-content {
      position: absolute;
      z-index: 1000;
      padding: 0.625rem 0.875rem;
      background: var(--surface-overlay);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      line-height: 1.4;
      max-width: 200px;
      box-shadow: var(--elevation-3);
      white-space: normal;
      animation: tooltipFadeIn var(--duration-fast) var(--ease-default);
    }

    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Positioning */
    .tooltip-top {
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
    }

    .tooltip-top::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--surface-overlay);
    }

    .tooltip-bottom {
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
    }

    .tooltip-bottom::after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-bottom-color: var(--surface-overlay);
    }

    .tooltip-left {
      right: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
    }

    .tooltip-left::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-left-color: var(--surface-overlay);
    }

    .tooltip-right {
      left: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
    }

    .tooltip-right::after {
      content: '';
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-right-color: var(--surface-overlay);
    }

    .tooltip-icon {
      width: 1rem;
      height: 1rem;
      margin-left: 0.25rem;
      display: inline-block;
      vertical-align: middle;
    }
  `]
})
export class TooltipComponent {
  /**
   * Tooltip text to display
   */
  text = input.required<string>();

  /**
   * Tooltip position
   */
  position = input<'top' | 'right' | 'bottom' | 'left'>('top');

  /**
   * Show info icon
   */
  showIcon = input<boolean>(false);

  /**
   * Visibility state
   */
  isVisible = signal<boolean>(false);

  /**
   * Has icon
   */
  hasIcon = this.showIcon;

  /**
   * Show tooltip
   */
  show(): void {
    this.isVisible.set(true);
  }

  /**
   * Hide tooltip
   */
  hide(): void {
    this.isVisible.set(false);
  }

  /**
   * Toggle tooltip (for click/tap on mobile)
   */
  toggle(): void {
    this.isVisible.update(val => !val);
  }
}
