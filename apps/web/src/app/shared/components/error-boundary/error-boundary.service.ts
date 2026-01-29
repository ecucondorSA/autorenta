import { Injectable, Optional, SkipSelf, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * ErrorBoundaryService
 *
 * Allows child components to propagate errors to parent ErrorBoundary components.
 * Uses hierarchical injection to find the nearest error boundary.
 *
 * Usage in child component:
 * ```typescript
 * export class ChildComponent {
 *   private errorBoundary = inject(ErrorBoundaryService, { optional: true });
 *
 *   async loadData() {
 *     try {
 *       await this.fetchData();
 *     } catch (error) {
 *       this.errorBoundary?.captureError(error, 'ChildComponent.loadData');
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class ErrorBoundaryService {
  private readonly logger = inject(LoggerService);

  private readonly _errors$ = new Subject<{
    error: Error;
    context: string;
    timestamp: Date;
  }>();

  /** Stream of captured errors */
  readonly errors$ = this._errors$.asObservable();

  /**
   * Capture an error and emit it to listeners
   */
  captureError(error: unknown, context = 'Unknown'): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    this.logger.warn(`ErrorBoundaryService captured error in ${context}`, {
      error: errorObj.message,
    });

    this._errors$.next({
      error: errorObj,
      context,
      timestamp: new Date(),
    });
  }

  /**
   * Wrap an async function with error boundary protection
   */
  async withErrorBoundary<T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T,
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.captureError(error, context);
      return fallback;
    }
  }

  /**
   * Create a wrapped version of a function that captures errors
   */
  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, context: string): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error, context);
        throw error;
      }
    }) as T;
  }
}

/**
 * Factory function for hierarchical error boundary injection
 *
 * Usage:
 * ```typescript
 * @Component({
 *   providers: [provideErrorBoundary()],
 * })
 * export class ParentComponent {}
 * ```
 */
export function provideErrorBoundary() {
  return {
    provide: ErrorBoundaryService,
    useFactory: (parent?: ErrorBoundaryService) => {
      // Return parent if exists (for nested boundaries)
      // Otherwise create new instance
      return parent || new ErrorBoundaryService();
    },
    deps: [[new Optional(), new SkipSelf(), ErrorBoundaryService]],
  };
}
