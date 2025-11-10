import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateVariant = 'default' | 'search' | 'inbox' | 'list' | 'bookings' | 'cars';

export interface EmptyStateAction {
  label: string;
  handler: () => void;
  variant?: 'primary' | 'secondary';
  icon?: string;
}

/**
 * 📭 Empty State Component
 *
 * Componente reutilizable para mostrar estados vacíos con mensajes claros
 * y acciones sugeridas.
 *
 * @example
 * ```html
 * <app-empty-state
 *   variant="cars"
 *   title="No hay autos publicados"
 *   message="Comienza publicando tu primer auto"
 *   [actions]="[{ label: 'Publicar auto', handler: createCarFn, variant: 'primary' }]"
 * ></app-empty-state>
 * ```
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-col items-center justify-center px-4 py-12 text-center"
      [class.min-h-[400px]]="fullHeight"
    >
      <!-- Icon -->
      <div
        class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
      >
        <!-- Default/List Icon -->
        <svg
          *ngIf="variant === 'default' || variant === 'list'"
          class="h-10 w-10 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        <!-- Search Icon -->
        <svg
          *ngIf="variant === 'search'"
          class="h-10 w-10 text-gray-400 dark:text-gray-500"
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

        <!-- Inbox Icon -->
        <svg
          *ngIf="variant === 'inbox'"
          class="h-10 w-10 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>

        <!-- Bookings Icon -->
        <svg
          *ngIf="variant === 'bookings'"
          class="h-10 w-10 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        <!-- Cars Icon -->
        <svg
          *ngIf="variant === 'cars'"
          class="h-10 w-10 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {{ title || getDefaultTitle() }}
      </h3>

      <!-- Message -->
      <p class="mb-6 max-w-md text-sm text-gray-600 dark:text-gray-400">
        {{ message || getDefaultMessage() }}
      </p>

      <!-- Actions -->
      <div *ngIf="actions && actions.length > 0" class="flex flex-wrap gap-3 justify-center">
        <button
          *ngFor="let action of actions"
          type="button"
          (click)="action.handler()"
          class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          [ngClass]="{
            'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500':
              action.variant === 'primary' || !action.variant,
            'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600':
              action.variant === 'secondary'
          }"
        >
          <!-- Icon placeholder (if provided) -->
          <svg
            *ngIf="action.icon === 'plus'"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <svg
            *ngIf="action.icon === 'refresh'"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {{ action.label }}
        </button>
      </div>

      <!-- CTA button (legacy support) -->
      <button
        *ngIf="ctaLabel && (!actions || actions.length === 0)"
        type="button"
        (click)="onCta()"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        {{ ctaLabel }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input() variant: EmptyStateVariant = 'default';
  @Input() title?: string;
  @Input() message?: string;
  @Input() actions?: EmptyStateAction[];
  @Input() ctaLabel?: string;
  @Input() fullHeight = false;

  @Output() cta = new EventEmitter<void>();

  getDefaultTitle(): string {
    switch (this.variant) {
      case 'search':
        return 'No se encontraron resultados';
      case 'inbox':
        return 'No hay mensajes';
      case 'bookings':
        return 'No hay reservas';
      case 'cars':
        return 'No hay autos';
      case 'list':
        return 'Lista vacía';
      default:
        return 'No hay contenido';
    }
  }

  getDefaultMessage(): string {
    switch (this.variant) {
      case 'search':
        return 'Intenta ajustar los filtros o buscar con otros términos.';
      case 'inbox':
        return 'Cuando alguien te escriba, aparecerá aquí.';
      case 'bookings':
        return 'Aún no tienes reservas. Comienza explorando autos disponibles.';
      case 'cars':
        return 'No hay autos disponibles en este momento.';
      case 'list':
        return 'No hay elementos para mostrar.';
      default:
        return 'No hay contenido disponible en este momento.';
    }
  }

  onCta(): void {
    this.cta.emit();
  }
}
