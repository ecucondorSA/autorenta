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

    // Run in zone to ensure change detection works for toasts/dialogs
    this.zone.run(() => {
      try {
        // Lazy inject ErrorHandlerService to avoid cyclic dependencies
        const errorHandlerService = this.injector.get(ErrorHandlerService);

        // Determine context based on error type or location if possible
        const context = 'Global Error';

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
      'connection lost'
    ];

    return noisyPatterns.some(pattern => msg.includes(pattern));
  }
}
