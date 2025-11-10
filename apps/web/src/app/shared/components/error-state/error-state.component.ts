import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErrorStateVariant = 'default' | 'network' | 'not-found' | 'forbidden' | 'server';

export interface ErrorStateAction {
  label: string;
  handler: () => void;
  variant?: 'primary' | 'secondary';
}

/**
 * ⚠️ Error State Component
 *
 * Componente reutilizable para mostrar estados de error con mensajes claros
 * y acciones sugeridas.
 *
 * @example
 * ```html
 * <app-error-state
 *   variant="network"
 *   title="Sin conexión"
 *   message="Verifica tu conexión a internet"
 *   [actions]="[{ label: 'Reintentar', handler: retryFn }]"
 * ></app-error-state>
 * ```
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-col items-center justify-center px-4 py-8 text-center"
      [class.min-h-[400px]]="fullHeight"
    >
      <!-- Icon -->
      <div
        class="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        [ngClass]="{
          'bg-red-100 dark:bg-red-900/20': variant === 'default' || variant === 'server',
          'bg-orange-100 dark:bg-orange-900/20': variant === 'network',
          'bg-gray-100 dark:bg-gray-800': variant === 'not-found',
          'bg-yellow-100 dark:bg-yellow-900/20': variant === 'forbidden'
        }"
      >
        <!-- Default/Server Error Icon -->
        <svg
          *ngIf="variant === 'default' || variant === 'server'"
          class="h-8 w-8"
          [ngClass]="{
            'text-red-600 dark:text-red-400': variant === 'default' || variant === 'server'
          }"
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

        <!-- Network Error Icon -->
        <svg
          *ngIf="variant === 'network'"
          class="h-8 w-8 text-orange-600 dark:text-orange-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>

        <!-- Not Found Icon -->
        <svg
          *ngIf="variant === 'not-found'"
          class="h-8 w-8 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <!-- Forbidden Icon -->
        <svg
          *ngIf="variant === 'forbidden'"
          class="h-8 w-8 text-yellow-600 dark:text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h3
        class="mb-2 text-lg font-semibold"
        [ngClass]="{
          'text-red-900 dark:text-red-200': variant === 'default' || variant === 'server',
          'text-orange-900 dark:text-orange-200': variant === 'network',
          'text-gray-900 dark:text-gray-100': variant === 'not-found',
          'text-yellow-900 dark:text-yellow-200': variant === 'forbidden'
        }"
      >
        {{ title || getDefaultTitle() }}
      </h3>

      <!-- Message -->
      <p
        class="mb-6 max-w-md text-sm"
        [ngClass]="{
          'text-red-700 dark:text-red-300': variant === 'default' || variant === 'server',
          'text-orange-700 dark:text-orange-300': variant === 'network',
          'text-gray-600 dark:text-gray-400': variant === 'not-found',
          'text-yellow-700 dark:text-yellow-300': variant === 'forbidden'
        }"
      >
        {{ message || getDefaultMessage() }}
      </p>

      <!-- Actions -->
      <div *ngIf="actions && actions.length > 0" class="flex flex-wrap gap-3 justify-center">
        <button
          *ngFor="let action of actions"
          type="button"
          (click)="action.handler()"
          class="px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          [ngClass]="{
            'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500':
              action.variant === 'primary' || !action.variant,
            'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600':
              action.variant === 'secondary'
          }"
        >
          {{ action.label }}
        </button>
      </div>

      <!-- Retry button (legacy support) -->
      <button
        *ngIf="retryable && (!actions || actions.length === 0)"
        type="button"
        (click)="onRetry()"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        {{ retryLabel }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  @Input() variant: ErrorStateVariant = 'default';
  @Input() title?: string;
  @Input() message?: string;
  @Input() actions?: ErrorStateAction[];
  @Input() retryable = false;
  @Input() retryLabel = 'Reintentar';
  @Input() fullHeight = false;

  @Output() retry = new EventEmitter<void>();

  getDefaultTitle(): string {
    switch (this.variant) {
      case 'network':
        return 'Sin conexión';
      case 'not-found':
        return 'No encontrado';
      case 'forbidden':
        return 'Acceso denegado';
      case 'server':
        return 'Error del servidor';
      default:
        return 'Algo salió mal';
    }
  }

  getDefaultMessage(): string {
    switch (this.variant) {
      case 'network':
        return 'Verifica tu conexión a internet e intenta nuevamente.';
      case 'not-found':
        return 'El recurso que buscas no existe o fue eliminado.';
      case 'forbidden':
        return 'No tienes permisos para acceder a este recurso.';
      case 'server':
        return 'Estamos experimentando problemas técnicos. Intenta más tarde.';
      default:
        return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
    }
  }

  onRetry(): void {
    this.retry.emit();
  }
}
