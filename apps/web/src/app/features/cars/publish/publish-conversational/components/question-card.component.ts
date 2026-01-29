import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Question card wrapper with animations
 * Handles the slide/fade transitions between questions
 */
@Component({
  selector: 'app-question-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="question-card w-full max-w-lg mx-auto"
      [class.slide-in-up]="direction() === 'forward' && !isTransitioning()"
      [class.slide-out-up]="direction() === 'forward' && isTransitioning()"
      [class.slide-in-down]="direction() === 'backward' && !isTransitioning()"
      [class.slide-out-down]="direction() === 'backward' && isTransitioning()"
    >
      <!-- Question Header -->
      <div class="text-center mb-8">
        <!-- Icon -->
        @if (icon()) {
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cta-default/20 to-cta-default/5 flex items-center justify-center shadow-lg shadow-cta-default/10"
          >
            <span class="text-2xl sm:text-3xl">{{ getIconEmoji() }}</span>
          </div>
        }

        <!-- Title -->
        <h2 class="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          {{ title() }}
        </h2>

        <!-- Subtitle -->
        @if (subtitle()) {
          <p class="text-base text-text-secondary max-w-sm mx-auto">
            {{ subtitle() }}
          </p>
        }
      </div>

      <!-- Content -->
      <div class="question-content">
        <ng-content></ng-content>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between mt-8 pt-6 border-t border-border-default">
        <!-- Back button -->
        <button
          type="button"
          (click)="back.emit()"
          [disabled]="!canGoBack() || isTransitioning()"
          class="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span class="hidden sm:inline">Anterior</span>
        </button>

        <!-- Continue button -->
        <button
          type="button"
          (click)="next.emit()"
          [disabled]="!canContinue() || isTransitioning()"
          class="flex items-center gap-2 px-6 py-3 bg-cta-default text-white font-semibold rounded-xl shadow-lg shadow-cta-default/30 hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all hover:scale-105 active:scale-95"
        >
          <span>{{ isSummary() ? 'Publicar' : 'Continuar' }}</span>
          @if (!isSummary()) {
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          } @else {
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
        </button>
      </div>

      <!-- Keyboard hint -->
      <p class="text-center text-xs text-text-muted mt-4 hidden sm:block">
        Presioná <kbd class="px-1.5 py-0.5 bg-surface-secondary rounded text-text-secondary">Enter</kbd> para continuar
        @if (canGoBack()) {
          o <kbd class="px-1.5 py-0.5 bg-surface-secondary rounded text-text-secondary">Esc</kbd> para volver
        }
      </p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .question-card {
        animation-duration: 0.4s;
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        animation-fill-mode: both;
      }

      .slide-in-up {
        animation-name: slideInUp;
      }

      .slide-out-up {
        animation-name: slideOutUp;
      }

      .slide-in-down {
        animation-name: slideInDown;
      }

      .slide-out-down {
        animation-name: slideOutDown;
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideOutUp {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-30px);
        }
      }

      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideOutDown {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(30px);
        }
      }

      kbd {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.75rem;
      }
    `,
  ],
})
export class QuestionCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly icon = input<string>();
  readonly canGoBack = input(true);
  readonly canContinue = input(true);
  readonly isSummary = input(false);
  readonly direction = input<'forward' | 'backward'>('forward');
  readonly isTransitioning = input(false);

  readonly back = output<void>();
  readonly next = output<void>();

  private readonly iconMap: Record<string, string> = {
    car: '🚗',
    calendar: '📅',
    tag: '🏷️',
    camera: '📸',
    gauge: '⏱️',
    dollar: '💰',
    location: '📍',
    check: '✅',
  };

  getIconEmoji(): string {
    const iconName = this.icon();
    return iconName ? this.iconMap[iconName] || '📋' : '📋';
  }
}
