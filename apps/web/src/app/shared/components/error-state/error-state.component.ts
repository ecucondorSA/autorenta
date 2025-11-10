import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ErrorStateConfig {
  title?: string;
  message: string;
  actionLabel?: string;
  icon?: 'error' | 'warning' | 'network';
}

/**
 * Reusable error state component
 * Displays error messages with optional retry action
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-lg p-6 text-center"
      [class.bg-red-50]="icon() === 'error'"
      [class.dark:bg-red-900/20]="icon() === 'error'"
      [class.bg-yellow-50]="icon() === 'warning'"
      [class.dark:bg-yellow-900/20]="icon() === 'warning'"
      [class.bg-gray-50]="icon() === 'network'"
      [class.dark:bg-gray-800]="icon() === 'network'"
    >
      <!-- Icon -->
      <div class="mb-4 flex justify-center">
        @if (icon() === 'error') {
          <svg
            class="h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        @if (icon() === 'warning') {
          <svg
            class="h-12 w-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        }
        @if (icon() === 'network') {
          <svg
            class="h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414 1 1 0 01-1.414-1.414zm-1.414 5.658a9 9 0 01-9.617-1.72"
            />
          </svg>
        }
      </div>

      <!-- Title -->
      @if (title()) {
        <h3
          class="mb-2 text-lg font-semibold"
          [class.text-red-900]="icon() === 'error'"
          [class.dark:text-red-200]="icon() === 'error'"
          [class.text-yellow-900]="icon() === 'warning'"
          [class.dark:text-yellow-200]="icon() === 'warning'"
          [class.text-gray-900]="icon() === 'network'"
          [class.dark:text-text-inverse]="icon() === 'network'"
        >
          {{ title() }}
        </h3>
      }

      <!-- Message -->
      <p
        class="mb-4 text-sm"
        [class.text-red-800]="icon() === 'error'"
        [class.dark:text-red-300]="icon() === 'error'"
        [class.text-yellow-800]="icon() === 'warning'"
        [class.dark:text-yellow-300]="icon() === 'warning'"
        [class.text-gray-600]="icon() === 'network'"
        [class.dark:text-gray-300]="icon() === 'network'"
      >
        {{ message() }}
      </p>

      <!-- Action Button -->
      @if (actionLabel()) {
        <button
          (click)="action.emit()"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
          [class.bg-red-600]="icon() === 'error'"
          [class.text-text-inverse]="icon() === 'error'"
          [class.hover:bg-red-700]="icon() === 'error'"
          [class.bg-yellow-600]="icon() === 'warning'"
          [class.text-text-inverse]="icon() === 'warning'"
          [class.hover:bg-yellow-700]="icon() === 'warning'"
          [class.bg-cta-default]="icon() === 'network'"
          [class.text-cta-text]="icon() === 'network'"
          [class.hover:bg-cta-default/90]="icon() === 'network'"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input<string>('');
  readonly message = input.required<string>();
  readonly actionLabel = input<string>('');
  readonly icon = input<'error' | 'warning' | 'network'>('error');

  readonly action = output<void>();
}
