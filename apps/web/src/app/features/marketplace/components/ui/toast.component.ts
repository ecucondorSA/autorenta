import { animate, style, transition, trigger } from '@angular/animations';

import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';

/**
 * Toast Component V2
 * Temporary notification message
 *
 * Features:
 * - Auto-dismiss with configurable duration
 * - Swipe to dismiss gesture
 * - Multiple variants (success, error, warning, info)
 * - Position variants (top, bottom)
 * - Action button support
 * - Slide-in animation
 * - Progress bar for auto-dismiss
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(var(--enter-transform))', opacity: 0 }),
        animate(
          '300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({
            transform: 'translateY(0)',
            opacity: 1,
          }),
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms cubic-bezier(0.4, 0, 1, 1)',
          style({
            transform: 'translateY(var(--leave-transform))',
            opacity: 0,
          }),
        ),
      ]),
    ]),
  ],
  host: {
    '[style.--enter-transform]': 'position() === "top" ? "-100%" : "100%"',
    '[style.--leave-transform]': 'position() === "top" ? "-100%" : "100%"',
  },
  template: `
    @if (isVisible()) {
      <div
        [class]="toastClasses()"
        [@slideIn]
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onTouchEnd()"
        [style.transform]="'translateY(' + swipeOffset() + 'px)'"
        role="alert"
        [attr.aria-live]="variant() === 'error' ? 'assertive' : 'polite'"
        aria-atomic="true"
      >
        <!-- Icon -->
        <div class="toast-icon">
          @switch (variant()) {
            @case ('success') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
            @case ('error') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
              </svg>
            }
            @case ('warning') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
            @case ('info') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2" />
                <path
                  d="M12 16v-4m0-4h.01"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
          }
        </div>

        <!-- Content -->
        <div class="toast-content">
          <p class="toast-title">{{ title() }}</p>
          @if (message()) {
            <p class="toast-message">{{ message() }}</p>
          }
        </div>

        <!-- Action Button -->
        @if (actionLabel()) {
          <button type="button" class="toast-action" (click)="handleAction()">
            {{ actionLabel() }}
          </button>
        }

        <!-- Close Button -->
        @if (closable()) {
          <button type="button" class="toast-close" (click)="close()" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        }

        <!-- Progress Bar -->
        @if (duration() && showProgress()) {
          <div class="toast-progress" [style.animation-duration]="duration() + 'ms'"></div>
        }
      </div>
    }
  `,
  styles: [
    `
      .toast {
        position: fixed;
        left: 1rem;
        right: 1rem;
        max-width: 480px;
        margin: 0 auto;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px var(--shadow-dark-alpha-15, rgba(0, 0, 0, 0.15));
        z-index: 10000;
        transition: transform 0.1s linear;
        will-change: transform;
      }

      /* Position */
      .toast-top {
        top: calc(1rem + env(safe-area-inset-top));
      }

      .toast-bottom {
        bottom: calc(1rem + env(safe-area-inset-bottom));
      }

      /* Variants */
      .toast-success {
        border-left: 4px solid var(--success-default, #10b981);
      }

      .toast-error {
        border-left: 4px solid var(--error-default, #ef4444);
      }

      .toast-warning {
        border-left: 4px solid var(--warning-default, #f59e0b);
      }

      .toast-info {
        border-left: 4px solid var(--system-blue-default, #3b82f6);
      }

      /* Icon */
      .toast-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        padding: 4px;
      }

      .toast-success .toast-icon {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success-default, #10b981);
      }

      .toast-error .toast-icon {
        background: rgba(239, 68, 68, 0.1);
        color: var(--error-default, #ef4444);
      }

      .toast-warning .toast-icon {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning-default, #f59e0b);
      }

      .toast-info .toast-icon {
        background: rgba(59, 130, 246, 0.1);
        color: var(--system-blue-default, #3b82f6);
      }

      .toast-icon svg {
        width: 16px;
        height: 16px;
      }

      /* Content */
      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-title {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-primary, #050505); /* Reemplazado hex con token semántico */
        line-height: 1.4;
      }

      .toast-message {
        margin: 0.25rem 0 0;
        color: var(--text-secondary, #4e4e4e); /* Reemplazado hex con token semántico */
        line-height: 1.4;
      }

      /* Action Button */
      .toast-action {
        flex-shrink: 0;
        padding: 0.5rem 0.75rem;
        background: transparent;
        border: none;
        color: var(--cta-default, #a7d8f4); /* Reemplazado hex con token semántico */
        font-size: 0.875rem;
        font-weight: 600;
        font-family: inherit;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .toast-action:hover {
        background: rgba(167, 216, 244, 0.08); /* Reemplazado rgb con token semántico */
      }

      /* Close Button */
      .toast-close {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        padding: 0;
        background: transparent;
        border: none;
        color: var(--text-secondary, #4e4e4e);
        cursor: pointer;
        transition: color 0.2s ease;
      }

      .toast-close:hover {
        color: var(--text-secondary, #4e4e4e);
      }

      .toast-close svg {
        width: 100%;
        height: 100%;
      }

      /* Progress Bar */
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        border-radius: 0 0 0 12px;
        animation: progress linear forwards;
      }

      @keyframes progress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }

      .toast-success .toast-progress {
        color: var(--success-default, #10b981);
      }

      .toast-error .toast-progress {
        color: var(--error-default, #ef4444);
      }

      .toast-warning .toast-progress {
        color: var(--warning-default, #f59e0b);
      }

      .toast-info .toast-progress {
        color: var(--system-blue-default, #3b82f6);
      }
    `,
  ],
})
export class ToastComponent {
  // Props
  isVisible = input<boolean>(false);
  variant = input<'success' | 'error' | 'warning' | 'info'>('info');
  title = input.required<string>();
  message = input<string>('');
  position = input<'top' | 'bottom'>('bottom');
  duration = input<number>(4000); // 0 = no auto-dismiss
  closable = input<boolean>(true);
  actionLabel = input<string>('');
  showProgress = input<boolean>(true);

  // Events
  closed = output<void>();
  actionClicked = output<void>();

  // Swipe state
  swipeOffset = signal(0);
  isDragging = signal(false);
  startY = 0;
  autoCloseTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Auto-dismiss timer
    effect(() => {
      if (this.isVisible() && this.duration() > 0) {
        this.autoCloseTimer = setTimeout(() => {
          this.close();
        }, this.duration());
      }

      // Cleanup
      return () => {
        if (this.autoCloseTimer) {
          clearTimeout(this.autoCloseTimer);
        }
      };
    });
  }

  toastClasses(): string {
    return `toast toast-${this.position()} toast-${this.variant()}`;
  }

  // Swipe to dismiss
  onTouchStart(event: TouchEvent): void {
    this.startY = event.touches[0].clientY;
    this.isDragging.set(true);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging()) return;

    const currentY = event.touches[0].clientY;
    const delta = currentY - this.startY;

    // Allow swiping in dismiss direction
    const dismissDirection = this.position() === 'top' ? -1 : 1;
    if (delta * dismissDirection > 0) {
      this.swipeOffset.set(delta);
    }
  }

  onTouchEnd(): void {
    if (!this.isDragging()) return;

    const offset = Math.abs(this.swipeOffset());

    // Dismiss if swiped past threshold
    if (offset > 80) {
      this.close();
    } else {
      // Snap back
      this.swipeOffset.set(0);
    }

    this.isDragging.set(false);
  }

  handleAction(): void {
    this.actionClicked.emit();
  }

  close(): void {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    this.closed.emit();
  }
}
