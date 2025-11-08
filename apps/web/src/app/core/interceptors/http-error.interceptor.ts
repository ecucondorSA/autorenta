import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '../services/error-handler.service';

/**
 * HTTP Error Interceptor
 *
 * Automatically handles HTTP errors and shows user-friendly messages.
 * Works with ErrorHandlerService to provide consistent error handling.
 *
 * Usage:
 * Add to app.config.ts:
 * ```typescript
 * provideHttpClient(
 *   withInterceptors([
 *     SupabaseAuthInterceptor,
 *     httpErrorInterceptor  // Add this
 *   ])
 * )
 * ```
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Determine if we should show error to user
      // Skip for certain endpoints (e.g., analytics, health checks)
      const skipUserNotification =
        req.url.includes('/analytics') ||
        req.url.includes('/health') ||
        req.url.includes('/metrics');

      // Determine severity based on status code
      let severity: 'error' | 'warning' | 'critical' = 'error';
      if (error.status >= 500) {
        severity = 'critical';
      } else if (error.status === 401 || error.status === 403) {
        severity = 'error';
      } else if (error.status === 404 || error.status === 400) {
        severity = 'warning';
      }

      // Handle error with context
      const context = `HTTP ${req.method} ${req.url}`;
      errorHandler.handleError(error, context, !skipUserNotification, severity);

      // Re-throw error so components can still handle it if needed
      return throwError(() => error);
    }),
  );
};



