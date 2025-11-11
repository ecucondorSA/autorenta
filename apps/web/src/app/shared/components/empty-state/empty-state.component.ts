import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="text-center py-12 px-4">
      <div class="mb-4 flex justify-center">
        @if (customIcon()) {
          <ng-content select="[icon]"></ng-content>
        } @else {
          <svg
            class="h-16 w-16 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
      </div>
      <h3 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-2">
        {{ title() }}
      </h3>
      @if (description()) {
        <p class="text-sm text-text-secondary dark:text-text-secondary/70 mb-6 max-w-md mx-auto">
          {{ description() }}
        </p>
      }
      <ng-content></ng-content>
      @if (actionLabel()) {
        <app-button variant="primary" size="md" (clicked)="action.emit()">{{
          actionLabel()
        }}</app-button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  title = input.required<string>();
  description = input<string>();
  actionLabel = input<string>();
  customIcon = input(false);
  action = output<void>();
}
