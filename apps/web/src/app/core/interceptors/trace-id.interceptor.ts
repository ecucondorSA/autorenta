import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Trace ID HTTP Interceptor
 *
 * Part of centralized logging infrastructure (Issue #120).
 *
 * Automatically adds X-Trace-Id header to all HTTP requests for cross-service correlation.
 * Generates a new trace ID if one doesn't exist in the logger service.
 *
 * Usage:
 * ```typescript
 * // In app.config.ts or main providers
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([traceIdInterceptor, ...])
 *     )
 *   ]
 * };
 * ```
 *
 * Flow:
 * 1. Check if logger service has a trace ID
 * 2. If not, generate one
 * 3. Add X-Trace-Id header to request
 * 4. Backend services can extract this ID for correlated logging
 *
 * Example:
 * ```
 * Frontend → X-Trace-Id: req-abc-123 → Worker → X-Trace-Id: req-abc-123 → Edge Function
 * All logs from this request will have the same trace_id for easy searching
 * ```
 */
export const traceIdInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  // Get or generate trace ID
  let traceId = logger.getTraceId();
  if (!traceId) {
    traceId = logger.generateTraceId();
  }

  // Clone request and add trace ID header
  const clonedReq = req.clone({
    setHeaders: {
      'X-Trace-Id': traceId,
    },
  });

  return next(clonedReq);
};
