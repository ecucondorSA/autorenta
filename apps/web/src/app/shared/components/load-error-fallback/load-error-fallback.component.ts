import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Load Error Fallback Component
 *
 * Displays a user-friendly error UI when async content fails to load.
 * Designed for:
 * - Lazy-loaded route failures (ChunkLoadError)
 * - API data fetch failures
 * - Image/asset loading failures
 *
 * Usage:
 * ```html
 * @if (loadError) {
 *   <app-load-error-fallback
 *     [errorType]="'network'"
 *     [errorMessage]="loadError.message"
 *     (retry)="loadData()"
 *   />
 * } @else {
 *   <app-data-display [data]="data" />
 * }
 * ```
 */
@Component({
  selector: 'app-load-error-fallback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex flex-col items-center justify-center p-8 min-h-[300px] bg-surface-secondary/50 rounded-2xl border border-border-light"
      role="alert"
      aria-live="polite"
    >
      <!-- Icon based on error type -->
      <div [class]="iconClass()" class="w-20 h-20 mb-6">
        @switch (errorType) {
          @case ('network') {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
          }
          @case ('chunk') {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          }
          @case ('timeout') {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          @case ('notfound') {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          @default {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        }
      </div>

      <!-- Title -->
      <h3 class="text-xl font-semibold text-text-primary mb-2">
        {{ title() }}
      </h3>

      <!-- Description -->
      <p class="text-sm text-text-secondary text-center max-w-md mb-6">
        {{ description() }}
      </p>

      <!-- Actions -->
      <div class="flex gap-3">
        @if (showRetry) {
          <button
            (click)="onRetry()"
            [disabled]="retrying()"
            class="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            @if (retrying()) {
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Reintentando...
            } @else {
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reintentar
            }
          </button>
        }

        @if (showHome) {
          <a
            href="/"
            class="px-5 py-2.5 bg-surface-base text-text-primary border border-border-default rounded-xl hover:bg-surface-hover transition-all text-sm font-medium"
          >
            Ir al inicio
          </a>
        }
      </div>

      <!-- Technical details (dev mode) -->
      @if (showDetails && errorMessage) {
        <details class="mt-6 text-xs text-text-secondary w-full max-w-md">
          <summary class="cursor-pointer hover:text-text-primary font-medium">
            Detalles del error
          </summary>
          <pre
            class="mt-2 p-3 bg-surface-base rounded-lg text-left overflow-auto whitespace-pre-wrap break-all"
          >{{ errorMessage }}</pre>
        </details>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadErrorFallbackComponent {
  /** Type of error for customized UI */
  @Input() errorType: 'network' | 'chunk' | 'timeout' | 'notfound' | 'generic' = 'generic';

  /** Raw error message (for dev details) */
  @Input() errorMessage?: string;

  /** Custom title override */
  @Input() customTitle?: string;

  /** Custom description override */
  @Input() customDescription?: string;

  /** Show retry button */
  @Input() showRetry = true;

  /** Show home button */
  @Input() showHome = true;

  /** Show technical details */
  @Input() showDetails = false;

  /** Retry event */
  @Output() retry = new EventEmitter<void>();

  /** Retrying state */
  readonly retrying = signal(false);

  /** Icon color class based on error type */
  readonly iconClass = computed(() => {
    switch (this.errorType) {
      case 'network':
        return 'text-warning-text';
      case 'timeout':
        return 'text-warning-text';
      case 'notfound':
        return 'text-text-secondary';
      case 'chunk':
        return 'text-error-text';
      default:
        return 'text-error-text';
    }
  });

  /** Title based on error type */
  readonly title = computed(() => {
    if (this.customTitle) return this.customTitle;

    switch (this.errorType) {
      case 'network':
        return 'Sin conexión';
      case 'chunk':
        return 'Error al cargar';
      case 'timeout':
        return 'Tiempo agotado';
      case 'notfound':
        return 'No encontrado';
      default:
        return 'Algo salió mal';
    }
  });

  /** Description based on error type */
  readonly description = computed(() => {
    if (this.customDescription) return this.customDescription;

    switch (this.errorType) {
      case 'network':
        return 'Parece que no hay conexión a internet. Verifica tu conexión e intenta nuevamente.';
      case 'chunk':
        return 'Hubo un problema cargando esta página. Esto puede pasar después de una actualización. Intenta recargar.';
      case 'timeout':
        return 'La operación tardó demasiado tiempo. El servidor podría estar ocupado. Intenta nuevamente en unos segundos.';
      case 'notfound':
        return 'El contenido que buscas no existe o fue movido.';
      default:
        return 'Ocurrió un error inesperado. Por favor intenta nuevamente.';
    }
  });

  onRetry(): void {
    this.retrying.set(true);
    this.retry.emit();

    // Auto-reset retrying state after a timeout
    setTimeout(() => {
      this.retrying.set(false);
    }, 3000);
  }
}

/**
 * Utility function to detect error type from an Error object
 */
export function detectErrorType(
  error: Error | unknown
): 'network' | 'chunk' | 'timeout' | 'notfound' | 'generic' {
  if (!error) return 'generic';

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const name = error instanceof Error ? error.name.toLowerCase() : '';

  if (name.includes('chunkloaderror') || message.includes('chunk')) {
    return 'chunk';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return 'network';
  }
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout';
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'notfound';
  }

  return 'generic';
}
