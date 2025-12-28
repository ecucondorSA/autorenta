import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ErrorHandler,
  Input,
  OnDestroy,
  TemplateRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * ErrorBoundary Component
 *
 * Wraps a section of UI and catches rendering errors from child components.
 * Displays a fallback UI when an error occurs, with retry capability.
 *
 * Usage:
 * ```html
 * <app-error-boundary context="Car List">
 *   <app-car-list [cars]="cars" />
 * </app-error-boundary>
 *
 * <!-- With custom fallback -->
 * <app-error-boundary context="Dashboard" [showRetry]="true">
 *   <ng-template #fallback let-error="error" let-retry="retry">
 *     <div class="custom-error">
 *       <p>Something went wrong: {{ error.message }}</p>
 *       <button (click)="retry()">Try Again</button>
 *     </div>
 *   </ng-template>
 *   <app-dashboard />
 * </app-error-boundary>
 * ```
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hasError()) {
      @if (customFallback) {
        <ng-container
          *ngTemplateOutlet="customFallback; context: { error: error(), retry: retry.bind(this) }"
        />
      } @else {
        <!-- Default fallback UI -->
        <div
          class="flex flex-col items-center justify-center p-6 bg-surface-secondary rounded-xl border border-border-default min-h-[200px]"
          role="alert"
          aria-live="polite"
        >
          <div class="w-16 h-16 mb-4 text-error-text">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 class="text-lg font-semibold text-text-primary mb-2">
            Algo salió mal
          </h3>

          <p class="text-sm text-text-secondary text-center max-w-sm mb-4">
            {{ userMessage() }}
          </p>

          @if (showRetry) {
            <button
              (click)="retry()"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Reintentar
            </button>
          }

          @if (showDetails && error()) {
            <details class="mt-4 text-xs text-text-secondary">
              <summary class="cursor-pointer hover:text-text-primary">
                Detalles técnicos
              </summary>
              <pre class="mt-2 p-2 bg-surface-base rounded text-left overflow-auto max-w-full">{{ errorDetails() }}</pre>
            </details>
          }
        </div>
      }
    } @else {
      <ng-content />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBoundaryComponent implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly globalErrorHandler = inject(ErrorHandler);

  /** Context description for error logging */
  @Input() context = 'Component';

  /** Whether to show retry button */
  @Input() showRetry = true;

  /** Whether to show technical details (dev only) */
  @Input() showDetails = false;

  /** Custom fallback template */
  @ContentChild('fallback') customFallback?: TemplateRef<unknown>;

  /** Error state */
  readonly hasError = signal(false);
  readonly error = signal<Error | null>(null);

  /** User-friendly message */
  readonly userMessage = signal('Ocurrió un error inesperado. Por favor intenta nuevamente.');

  /** Technical error details (for dev mode) */
  readonly errorDetails = signal('');

  /**
   * Capture an error from a child component
   * Call this from child components that catch errors
   */
  captureError(error: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    this.logger.error(
      `ErrorBoundary caught error in ${this.context}`,
      'ErrorBoundary',
      errorObj,
    );

    this.error.set(errorObj);
    this.hasError.set(true);
    this.errorDetails.set(this.formatErrorDetails(errorObj));
    this.userMessage.set(this.getDisplayMessage(errorObj));
  }

  /**
   * Reset error state and retry rendering
   */
  retry(): void {
    this.logger.info(`ErrorBoundary retry in ${this.context}`, 'ErrorBoundary');
    this.hasError.set(false);
    this.error.set(null);
    this.errorDetails.set('');
  }

  ngOnDestroy(): void {
    // Clean up
    this.hasError.set(false);
    this.error.set(null);
  }

  private formatErrorDetails(error: Error): string {
    return `${error.name}: ${error.message}\n${error.stack || ''}`;
  }

  private getDisplayMessage(error: Error): string {
    const msg = error.message.toLowerCase();

    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
    }
    if (msg.includes('timeout')) {
      return 'La operación tardó demasiado. Por favor intenta nuevamente.';
    }
    if (msg.includes('permission') || msg.includes('unauthorized')) {
      return 'No tienes permisos para ver este contenido.';
    }
    if (msg.includes('not found')) {
      return 'No se encontró el contenido solicitado.';
    }

    return 'Ocurrió un error inesperado. Por favor intenta nuevamente.';
  }
}

/**
 * Directive to automatically catch errors in async operations
 * and propagate them to parent ErrorBoundary
 *
 * Usage:
 * ```html
 * <app-error-boundary>
 *   <div appCatchErrors>
 *     <app-some-component />
 *   </div>
 * </app-error-boundary>
 * ```
 */
