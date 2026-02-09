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
    <div class="flex items-center justify-center gap-1.5">
      @for (dot of dots(); track $index) {
        <button
          type="button"
          [attr.aria-label]="'Paso ' + ($index + 1)"
          [attr.aria-current]="$index === currentIndex() ? 'step' : null"
          (click)="onDotClick($index)"
          class="relative p-1 transition-all duration-300 ease-out focus:outline-none group"
          [class.cursor-pointer]="canNavigateTo($index)"
          [class.cursor-default]="!canNavigateTo($index)"
          [disabled]="!canNavigateTo($index)"
        >
          <!-- Dot -->
          <span
            class="block rounded-full transition-all duration-300 ease-out"
            [class]="getDotClasses($index)"
          >
            @if (dot.completed && $index !== currentIndex()) {
              <svg
                class="w-2.5 h-2.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          </span>
          <!-- Hover tooltip -->
          @if (canNavigateTo($index) && $index !== currentIndex()) {
            <span
              class="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-text-primary text-surface-base text-[10px] font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              Paso {{ $index + 1 }}
            </span>
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
    const canNav = this.canNavigateTo(index);

    if (index === current) {
      // Current step - pill shape, highlighted
      return 'w-8 h-2.5 bg-cta-default shadow-md shadow-cta-default/40';
    }

    if (completed) {
      // Completed step - with checkmark, clickable
      return 'w-5 h-5 bg-cta-default/80 hover:bg-cta-default flex items-center justify-center hover:scale-110';
    }

    if (canNav) {
      // Past step, navigable
      return 'w-2.5 h-2.5 bg-border-default hover:bg-cta-default/50 hover:scale-125';
    }

    // Future step - not navigable
    return 'w-2.5 h-2.5 bg-border-default/50';
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
