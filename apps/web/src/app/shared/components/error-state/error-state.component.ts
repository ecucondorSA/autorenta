import {Component, computed, input, output,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses()">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          @if (customIcon()) {
            <ng-content select="[icon]"></ng-content>
          } @else {
            <svg class="h-5 w-5 text-error-text" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          }
        </div>
        <div class="flex-1 min-w-0">
          @if (title()) {
            <h3 class="text-sm font-semibold text-error-strong mb-1">{{ title() }}</h3>
          }
          @if (message()) {
            <p class="text-sm text-error-text">{{ message() }}</p>
          }
          <ng-content></ng-content>
        </div>
        @if (retryable() || dismissible()) {
          <div class="flex-shrink-0 flex gap-2">
            @if (retryable()) {
              <button
                type="button"
                class="text-sm font-medium text-error-strong hover:text-error-text transition-colors"
                (click)="retry.emit()"
              >
                Reintentar
              </button>
            }
            @if (dismissible()) {
              <button
                type="button"
                class="text-sm text-error-text hover:text-error-strong transition-colors"
                (click)="dismiss.emit()"
              >
                ✕
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ErrorStateComponent {
  title = input<string>();
  message = input<string>();
  variant = input<'inline' | 'banner' | 'toast'>('banner');
  retryable = input(false);
  dismissible = input(false);
  customIcon = input(false);
  retry = output<void>();
  dismiss = output<void>();
  containerClasses = computed(() => {
    const base = 'bg-error-bg border border-error-border';
    const v = this.variant();
    const vClass =
      v === 'inline'
        ? 'rounded-lg p-3'
        : v === 'banner'
          ? 'rounded-xl p-4'
          : 'rounded-lg p-4 shadow-elevation-3';
    return base + ' ' + vClass;
  });
}
