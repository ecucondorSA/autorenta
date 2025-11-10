import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

/**
 * Sentry Error Handler
 *
 * Global error handler that captures all unhandled errors and sends them to Sentry.
 * Only active in production mode when Sentry DSN is configured.
 *
 * Usage:
 *   Configured automatically in app.config.ts
 *   No manual action needed - all errors are automatically captured
 */
@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  handleError(error: Error | unknown): void {
    // Log to console in development
    if (!environment.production) {
      console.error('❌ Unhandled error:', error);
    }

    // Send to Sentry if configured
    if (environment.sentryDsn) {
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureException(new Error(String(error)));
      }
    }

    // Rethrow in development for visibility
    if (!environment.production) {
      throw error;
    }
  }
}

/**
 * Initialize Sentry
 *
 * Call this function early in the application bootstrap process.
 * Configures Sentry with Angular-specific integrations.
 */
export function initSentry(): void {
  if (!environment.sentryDsn) {
    console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.sentryEnvironment,

    // Performance Monitoring
    tracesSampleRate: environment.sentryTracesSampleRate,
    tracePropagationTargets: ['localhost', environment.appUrl, environment.supabaseUrl],

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),

      // Replay sessions for debugging
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Session Replay (sample rate)
    replaysSessionSampleRate: environment.production ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture on errors

    // Release tracking
    release: `autorenta-web@${environment.production ? 'production' : 'development'}`,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive query parameters
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          const sensitiveParams = ['token', 'key', 'password', 'secret', 'apikey'];

          sensitiveParams.forEach((param) => {
            if (url.searchParams.has(param)) {
              url.searchParams.set(param, '[REDACTED]');
            }
          });

          event.request.url = url.toString();
        } catch (e) {
          // Invalid URL, ignore
        }
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach((header) => {
          if (event.request?.headers?.[header]) {
            event.request.headers[header] = '[REDACTED]';
          }
        });
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',

      // Network errors (handled separately)
      'NetworkError',
      'Failed to fetch',

      // Third-party errors
      'ChunkLoadError',
    ],
  });

  console.log('✅ Sentry initialized');
}
