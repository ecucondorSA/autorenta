import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';

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
  ) { }

  handleError(error: unknown): void {
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
}
