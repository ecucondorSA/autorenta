import {Component, computed, input,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @switch (type()) {
      @case ('spinner') {
        <div [class]="containerClasses()">
          <svg [class]="spinnerSizeClass()" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          @if (message()) {
            <p class="text-sm text-text-secondary dark:text-text-secondary/70 mt-3">
              {{ message() }}
            </p>
          }
        </div>
      }
      @case ('skeleton') {
        <div class="animate-pulse space-y-4">
          <ng-content></ng-content>
        </div>
      }
      @case ('inline') {
        <div class="inline-flex items-center gap-2">
          <svg class="animate-spin h-4 w-4 text-text-secondary" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          @if (message()) {
            <span class="text-sm text-text-secondary">{{ message() }}</span>
          }
        </div>
      }
      @case ('dots') {
        <div class="flex items-center gap-2">
          <div
            class="h-2 w-2 rounded-full bg-cta-default animate-bounce"
            style="animation-delay: 0ms"
          ></div>
          <div
            class="h-2 w-2 rounded-full bg-cta-default animate-bounce"
            style="animation-delay: 150ms"
          ></div>
          <div
            class="h-2 w-2 rounded-full bg-cta-default animate-bounce"
            style="animation-delay: 300ms"
          ></div>
        </div>
      }
    }
  `,
})
export class LoadingStateComponent {
  type = input<'spinner' | 'skeleton' | 'inline' | 'dots'>('spinner');
  size = input<'sm' | 'md' | 'lg'>('md');
  message = input<string>();
  containerClasses = computed(() => {
    const align = this.type() === 'spinner' ? 'flex flex-col items-center justify-center' : '';
    const pad = this.type() === 'spinner' ? 'py-12' : '';
    return align + ' ' + pad;
  });
  spinnerSizeClass = computed(() => {
    const s = this.size();
    const sClass = s === 'sm' ? 'h-6 w-6' : s === 'md' ? 'h-8 w-8' : 'h-12 w-12';
    return sClass + ' text-cta-default animate-spin';
  });
}
