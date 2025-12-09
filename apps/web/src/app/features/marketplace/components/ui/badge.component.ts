import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Badge Component V2
 * Small notification or status indicator
 *
 * Features:
 * - Variants: filled, outlined, dot
 * - Colors: primary, success, warning, danger, info
 * - Sizes: sm, md, lg
 * - Position: top-right, top-left, bottom-right, bottom-left
 * - Anchor to parent element
 * - Pulse animation for attention
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (variant() === 'dot') {
      <span [class]="badgeClasses()"></span>
    } @else {
      <span [class]="badgeClasses()">
        @if (content()) {
          {{ displayContent() }}
        } @else {
          <ng-content />
        }
      </span>
    }
  `,
  styles: [
    `
      span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        font-weight: 600;
        line-height: 1;
        user-select: none;
      }

      /* Base badge */
      .badge {
        border-radius: 9999px;
        padding: 0.125rem 0.5rem;
        font-size: 0.75rem;
        min-width: 1.25rem;
        height: 1.25rem;
      }

      /* Sizes */
      .badge-sm {
        padding: 0.0625rem 0.375rem;
        font-size: 0.6875rem;
        min-width: 1rem;
        height: 1rem;
      }

      .badge-lg {
        padding: 0.1875rem 0.625rem;
        font-size: 0.8125rem;
        min-width: 1.5rem;
        height: 1.5rem;
      }

      /* Dot variant */
      .badge-dot {
        width: 8px;
        height: 8px;
        padding: 0;
        min-width: auto;
      }

      .badge-dot.badge-sm {
        width: 6px;
        height: 6px;
      }

      .badge-dot.badge-lg {
        width: 10px;
        height: 10px;
      }

      /* Variants */
      .badge-filled {
        border: none;
      }

      .badge-outlined {
        background: white;
        border: 1.5px solid currentColor;
      }

      /* Colors - Filled */
      .badge-primary.badge-filled {
        background: var(--cta-default, #4f46e5);
        color: white;
      }

      .badge-success.badge-filled {
        background: var(--success-default, #10b981);
        color: white;
      }

      .badge-warning.badge-filled {
        background: var(--warning-default, #f59e0b);
        color: white;
      }

      .badge-danger.badge-filled {
        background: var(--error-default, #ef4444);
        color: white;
      }

      .badge-info.badge-filled {
        background: var(--system-blue-default, #3b82f6);
        color: white;
      }

      /* Colors - Outlined */
      .badge-primary.badge-outlined {
        color: var(--cta-default, #4f46e5);
      }

      .badge-success.badge-outlined {
        color: var(--success-default, #10b981);
      }

      .badge-warning.badge-outlined {
        color: var(--warning-default, #f59e0b);
      }

      .badge-danger.badge-outlined {
        color: var(--error-default, #ef4444);
      }

      .badge-info.badge-outlined {
        color: var(--system-blue-default, #3b82f6);
      }

      /* Anchored positioning */
      .badge-anchored {
        position: absolute;
        z-index: 10;
      }

      .position-top-right {
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
      }

      .position-top-left {
        top: 0;
        left: 0;
        transform: translate(-50%, -50%);
      }

      .position-bottom-right {
        bottom: 0;
        right: 0;
        transform: translate(50%, 50%);
      }

      .position-bottom-left {
        bottom: 0;
        left: 0;
        transform: translate(-50%, 50%);
      }

      /* Pulse animation */
      .badge-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      /* Bounce animation */
      .badge-bounce {
        animation: bounce 1s ease infinite;
      }

      @keyframes bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px);
        }
      }

      .badge-anchored.badge-bounce.position-top-right {
        animation: bounceTopRight 1s ease infinite;
      }

      @keyframes bounceTopRight {
        0%,
        100% {
          transform: translate(50%, -50%);
        }
        50% {
          transform: translate(50%, calc(-50% - 4px));
        }
      }
    `,
  ],
})
export class BadgeComponent {
  // Props
  content = input<string | number | null>(null);
  variant = input<'filled' | 'outlined' | 'dot'>('filled');
  color = input<'primary' | 'success' | 'warning' | 'danger' | 'info'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  max = input<number>(99);
  anchored = input<boolean>(false);
  position = input<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  pulse = input<boolean>(false);
  bounce = input<boolean>(false);

  badgeClasses(): string {
    const classes = [
      'badge',
      `badge-${this.variant()}`,
      `badge-${this.color()}`,
      `badge-${this.size()}`,
    ];

    if (this.anchored()) {
      classes.push('badge-anchored', `position-${this.position()}`);
    }

    if (this.pulse()) classes.push('badge-pulse');
    if (this.bounce()) classes.push('badge-bounce');

    return classes.join(' ');
  }

  displayContent(): string {
    const content = this.content();

    if (typeof content === 'number') {
      return content > this.max() ? `${this.max()}+` : content.toString();
    }

    return content || '';
  }
}
