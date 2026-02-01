import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';
import { ErrorHandlerService } from '@core/services/infrastructure/error-handler.service';

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
  const router = inject(Router);

  return next(req).pipe(
    // Retry failed requests (network errors or 5xx) up to 2 times
    retry({
      count: 2,
      delay: (error, retryCount) => {
        // Don't retry client errors (4xx), except 408 (Timeout) and 429 (Too Many Requests)
        if (
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 429
        ) {
          throw error;
        }
        // Exponential backoff: 1s, 2s
        return timer(retryCount * 1000);
      },
    }),
    catchError((error: HttpErrorResponse) => {
      // Determine if we should show error to user
      // Skip for certain endpoints (e.g., analytics, health checks)
      const skipUserNotification =
        req.url.includes('/analytics') ||
        req.url.includes('/health') ||
        req.url.includes('/metrics');

      // ✅ Silent tracking endpoints: don't log to Sentry to avoid noise
      const silentEndpoints = [
        '/analytics',
        '/metrics',
        '/health',
        '/tiktok-events',
        '/telemetry',
        '/telemetry-ingest',
        '/pixel',
      ];
      const shouldSilentlyIgnore = silentEndpoints.some((endpoint) => req.url.includes(endpoint));
      if (shouldSilentlyIgnore) {
        return throwError(() => error);
      }

      // Determine severity based on status code
      let severity: 'error' | 'warning' | 'critical' = 'error';
      if (error.status >= 500) {
        severity = 'critical';
        
        // Redirect to error page for generic 500 errors, but avoid infinite loops
        // if the error comes from the error page itself or critical auth endpoints
        if (!req.url.includes('/error/') && !req.url.includes('auth/')) {
          // Use setTimeout to avoid circular dependency in injection context
          setTimeout(() => router.navigate(['/error/500']), 0);
        }
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
