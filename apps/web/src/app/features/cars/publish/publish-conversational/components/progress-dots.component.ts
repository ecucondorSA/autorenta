import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Progress dots indicator for conversational form
 * Shows 8 dots representing each step
 */
@Component({
  selector: 'app-progress-dots',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center gap-2">
      @for (dot of dots(); track $index) {
        <button
          type="button"
          [attr.aria-label]="'Paso ' + ($index + 1)"
          [attr.aria-current]="$index === currentIndex() ? 'step' : null"
          (click)="onDotClick($index)"
          class="transition-all duration-300 ease-out rounded-full focus:outline-none focus:ring-2 focus:ring-cta-default focus:ring-offset-2"
          [class]="getDotClasses($index)"
          [disabled]="!canNavigateTo($index)"
        >
          @if (dot.completed && $index !== currentIndex()) {
            <svg
              class="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProgressDotsComponent {
  readonly currentIndex = input.required<number>();
  readonly totalSteps = input.required<number>();
  readonly completedSteps = input<Set<number>>(new Set());
  readonly onNavigate = input<(index: number) => void>();

  readonly dots = computed(() => {
    const total = this.totalSteps();
    const completed = this.completedSteps();
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      completed: completed.has(i),
      current: i === this.currentIndex(),
    }));
  });

  getDotClasses(index: number): string {
    const current = this.currentIndex();
    const completed = this.completedSteps().has(index);

    if (index === current) {
      // Current step - larger and highlighted
      return 'w-8 h-3 bg-cta-default shadow-lg shadow-cta-default/30';
    }

    if (completed) {
      // Completed step - with checkmark
      return 'w-5 h-5 bg-emerald-500 flex items-center justify-center cursor-pointer hover:scale-110';
    }

    if (index < current) {
      // Past step but not completed (skipped)
      return 'w-3 h-3 bg-slate-300 dark:bg-slate-600 cursor-pointer hover:bg-slate-400';
    }

    // Future step
    return 'w-3 h-3 bg-slate-200 dark:bg-slate-700';
  }

  canNavigateTo(index: number): boolean {
    const current = this.currentIndex();
    const completed = this.completedSteps().has(index);

    // Can navigate to completed steps or previous steps
    return completed || index < current;
  }

  onDotClick(index: number): void {
    if (!this.canNavigateTo(index)) return;

    const navigate = this.onNavigate();
    if (navigate) {
      navigate(index);
    }
  }
}
