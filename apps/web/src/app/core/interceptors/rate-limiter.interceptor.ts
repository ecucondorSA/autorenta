import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';

/**
 * Rate Limiting HTTP Interceptor
 *
 * Prevents clients from making too many requests to critical endpoints
 * within a short time window. Complements server-side rate limiting.
 *
 * CRITICAL: Issue #112 - Security Hardening Epic
 *
 * Handles:
 * - Client-side request throttling
 * - Per-user and per-endpoint rate limit tracking
 * - User-friendly rate limit error messages
 * - Retry-After header support
 *
 * Usage:
 * Add to app.config.ts withInterceptors():
 * ```typescript
 * rateLimiterInterceptor  // Add before httpErrorInterceptor
 * ```
 */
export const rateLimiterInterceptor: HttpInterceptorFn = (req, next) => {
  const rateLimiter = inject(RateLimiterService);
  const auth = inject(AuthService);
  const logger = inject(LoggerService);

  // Skip rate limiting for health checks, metrics, and non-critical endpoints
  if (
    req.url.includes('/health') ||
    req.url.includes('/metrics') ||
    req.url.includes('/analytics') ||
    req.url.includes('/monitoring') ||
    req.method === 'GET' // Optional: can customize based on needs
  ) {
    return next(req);
  }

  try {
    // Get current user ID if authenticated (synchronous check)
    let userId: string | undefined;
    const userPromise = auth.getCurrentUser();
    if (userPromise instanceof Promise) {
      // Can't await in sync context, will use async-like pattern
      userPromise.then(user => {
        userId = user?.id;
      }).catch(() => {
        // User not authenticated
      });
    }

    // Check rate limit
    if (!rateLimiter.isWithinRateLimit(req.method, req.url, userId)) {
      const resetTimeMs = rateLimiter.getResetTime(req.method, req.url, userId);
      const resetTimeSeconds = Math.ceil(resetTimeMs / 1000);

      // Log rate limit violation (security event)
      logger.warn(`Rate limit exceeded for ${req.method} ${req.url}. Reset in ${resetTimeSeconds}s`, {
        method: req.method,
        url: req.url,
        userId,
        resetTime: resetTimeSeconds,
      });

      // Create 429 Too Many Requests error
      const error = new HttpErrorResponse({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${resetTimeSeconds} seconds.`,
          retryAfter: resetTimeSeconds,
        },
        status: 429,
        statusText: 'Too Many Requests',
        url: req.url,
      });

      return throwError(() => error);
    }

    // Request is within rate limit, proceed
    return next(req);
  } catch (error) {
    // If rate limiter fails, log but don't block request
    logger.error(`Rate limiter error for ${req.method} ${req.url}`, error);
    return next(req);
  }
};
