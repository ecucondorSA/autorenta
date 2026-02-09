import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { ErrorHandlerService } from '@core/services/infrastructure/error-handler.service';

/**
 * Global Error Handler
 *
 * Intercepts all unhandled errors in the application and routes them
 * through the centralized ErrorHandlerService.
 *
 * Replaces the default Angular ErrorHandler and SentryErrorHandler.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private injector: Injector,
    private zone: NgZone,
  ) {}

  handleError(error: unknown): void {
    // 1. Noise Reduction: Ignore common network errors that aren't bugs
    if (this.isNetworkError(error)) {
      // Just log to console debug, don't send to Sentry or show toast
      console.debug('Ignored network error:', error);
      return;
    }

    // 2. Extract meaningful context from error
    const context = this.extractErrorContext(error);

    // Run in zone to ensure change detection works for toasts/dialogs
    this.zone.run(() => {
      try {
        // Lazy inject ErrorHandlerService to avoid cyclic dependencies
        const errorHandlerService = this.injector.get(ErrorHandlerService);

        // Delegate to centralized service
        // We pass showToUser=true for global errors as they are usually unexpected
        errorHandlerService.handleError(error, context, true, 'error');
      } catch (handlingError) {
        // Failsafe: if error handling fails, log to console
        console.error('Error in GlobalErrorHandler:', handlingError);
        console.error('Original error:', error);
      }
    });
  }

  /**
   * Extract meaningful context from error object
   * P0.1 FIX: Improved to extract details from all error types
   */
  private extractErrorContext(error: unknown): string {
    // 1. Handle standard Error objects with stack traces
    if (error instanceof Error) {
      // Try to extract location from stack trace
      if (error.stack) {
        const stackLines = error.stack.split('\n');
        const relevantLine = stackLines.find(
          (line, i) =>
            i > 0 && !line.includes('GlobalErrorHandler') && !line.includes('handleError'),
        );
        if (relevantLine) {
          const match = relevantLine.match(/at\s+(.+?)\s+\(|at\s+(.+?):\d+:\d+/);
          if (match) {
            const location = (match[1] || match[2]).split('/').pop();
            return `Global Error (${location}): ${error.message.substring(0, 80)}`;
          }
        }
      }

      // Use error name and message
      if (error.name && error.name !== 'Error') {
        return `Global Error (${error.name}): ${error.message.substring(0, 80)}`;
      }

      // At minimum, show the message
      return `Global Error: ${error.message.substring(0, 100)}`;
    }

    // 2. Handle non-standard error objects
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>;

      // Try common error properties
      if (typeof obj['message'] === 'string' && obj['message']) {
        return `Global Error: ${obj['message'].substring(0, 100)}`;
      }
      if (typeof obj['error'] === 'string' && obj['error']) {
        return `Global Error: ${obj['error'].substring(0, 100)}`;
      }
      if (obj['code']) {
        const msg = obj['message'] || obj['error'] || 'unknown';
        return `Global Error (code: ${obj['code']}): ${String(msg).substring(0, 80)}`;
      }

      // Try to serialize for debugging
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== '{}') {
          return `Global Error Object: ${serialized.substring(0, 150)}`;
        }
      } catch {
        // Can't serialize
      }

      return 'Global Error (unserializable object)';
    }

    // 3. Handle string errors
    if (typeof error === 'string') {
      return `Global Error: ${error.substring(0, 100)}`;
    }

    // 4. Fallback for primitives
    return `Global Error: ${String(error).substring(0, 100)}`;
  }

  /**
   * Check if error is a noisy network error that should be ignored
   */
  private isNetworkError(error: unknown): boolean {
    if (!error) return false;

    // Check for offline status
    if (!navigator.onLine) return true;

    // Type safe message extraction
    let msg = '';
    if (error instanceof Error) {
      msg = error.message;
    } else if (typeof error === 'string') {
      msg = error;
    } else {
      try {
        msg = String(error);
      } catch {
        msg = '';
      }
    }

    msg = msg.toLowerCase();

    // Common noisy patterns
    const noisyPatterns = [
      'network error',
      'failed to fetch',
      'networkrequestfailed',
      'timeout',
      'importing a module script failed',
      'loading chunk',
      'connection lost',
    ];

    return noisyPatterns.some((pattern) => msg.includes(pattern));
  }
}
