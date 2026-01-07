import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'success' | 'info';
export type EmptyStateSize = 'sm' | 'md' | 'lg';

interface EmptyStateAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div [class]="containerClasses()">
      <!-- Icon -->
      <div [class]="iconContainerClasses()">
        @if (customIcon()) {
          <app-icon [name]="customIcon()!" [size]="iconSize()" [cssClass]="iconColorClass()" />
        } @else {
          @switch (variant()) {
            @case ('no-data') {
              <svg [class]="svgSizeClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
            @case ('no-results') {
              <svg [class]="svgSizeClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            @case ('error') {
              <svg [class]="svgSizeClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            @case ('success') {
              <svg [class]="svgSizeClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            @case ('info') {
              <svg [class]="svgSizeClass()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          }
        }
      </div>

      <!-- Title -->
      @if (title()) {
        <h3 [class]="titleClasses()">{{ title() }}</h3>
      }

      <!-- Message -->
      @if (message()) {
        <p [class]="messageClasses()">{{ message() }}</p>
      }

      <!-- Action Button -->
      @if (action()) {
        <button
          type="button"
          [class]="actionButtonClasses()"
          (click)="actionClick.emit()"
        >
          {{ action()!.label }}
        </button>
      }

      <!-- Secondary content slot -->
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  // Inputs
  variant = input<EmptyStateVariant>('no-data');
  size = input<EmptyStateSize>('md');
  title = input<string>();
  message = input<string>();
  action = input<EmptyStateAction>();
  customIcon = input<string>();

  // Outputs
  actionClick = output<void>();

  // Computed classes
  containerClasses = computed(() => {
    const base = 'flex flex-col items-center justify-center text-center';
    const padding = {
      sm: 'py-6 px-4',
      md: 'py-12 px-6',
      lg: 'py-16 px-8',
    }[this.size()];
    return `${base} ${padding}`;
  });

  iconContainerClasses = computed(() => {
    const base = 'rounded-full flex items-center justify-center mb-4';
    const sizeClasses = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-20 h-20',
    }[this.size()];
    const bgClasses = {
      'no-data': 'bg-surface-secondary',
      'no-results': 'bg-surface-secondary',
      'error': 'bg-error-bg',
      'success': 'bg-success-bg',
      'info': 'bg-info-bg',
    }[this.variant()];
    return `${base} ${sizeClasses} ${bgClasses}`;
  });

  iconColorClass = computed(() => {
    return {
      'no-data': 'text-text-secondary',
      'no-results': 'text-text-secondary',
      'error': 'text-error-strong',
      'success': 'text-success-strong',
      'info': 'text-info-strong',
    }[this.variant()];
  });

  svgSizeClass = computed(() => {
    const colorClass = this.iconColorClass();
    const sizeClass = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
    }[this.size()];
    return `${sizeClass} ${colorClass}`;
  });

  iconSize = computed(() => {
    return {
      sm: 24,
      md: 32,
      lg: 40,
    }[this.size()];
  });

  titleClasses = computed(() => {
    const base = 'font-semibold text-text-primary';
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    }[this.size()];
    return `${base} ${sizeClasses}`;
  });

  messageClasses = computed(() => {
    const base = 'text-text-secondary mt-1 max-w-md';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    }[this.size()];
    return `${base} ${sizeClasses}`;
  });

  actionButtonClasses = computed(() => {
    const base = 'mt-4 font-medium rounded-lg transition-colors';
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    }[this.size()];

    const variantClasses = {
      primary: 'bg-cta-default text-cta-text hover:bg-cta-default/90',
      secondary: 'bg-surface-secondary text-text-primary hover:bg-surface-secondary/80',
      outline: 'border border-border-default text-text-secondary hover:bg-surface-secondary/50',
    }[this.action()?.variant ?? 'primary'];

    return `${base} ${sizeClasses} ${variantClasses}`;
  });
}
