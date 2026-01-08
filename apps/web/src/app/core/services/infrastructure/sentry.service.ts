import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { environment } from '@environment';

/**
 * Sentry module type for lazy loading
 */
type SentryModule = typeof import('@sentry/angular');

/** Cached Sentry module */
let sentryModule: SentryModule | null = null;
let sentryLoadPromise: Promise<SentryModule | null> | null = null;

/**
 * Lazy-load Sentry module (saves ~238KB from initial bundle)
 * Caches the module for subsequent calls
 */
async function getSentry(): Promise<SentryModule | null> {
  if (sentryModule) {
    return sentryModule;
  }

  if (!environment.sentryDsn) {
    return null;
  }

  if (!sentryLoadPromise) {
    sentryLoadPromise = import('@sentry/angular')
      .then((module) => {
        sentryModule = module;
        return module;
      })
      .catch((err) => {
        console.error('Failed to load Sentry:', err);
        sentryLoadPromise = null;
        return null;
      });
  }

  return sentryLoadPromise;
}

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
  private readonly logger = inject(LoggerService);
  handleError(error: Error | unknown): void {
    // Log to console in development
    if (!environment.production) {
      console.error('❌ Unhandled error:', error);
    }

    // Send to Sentry if configured (lazy-loaded)
    if (environment.sentryDsn) {
      void this.sendToSentry(error);
    }

    // Rethrow in development for visibility
    if (!environment.production) {
      throw error;
    }
  }

  private async sendToSentry(error: Error | unknown): Promise<void> {
    const Sentry = await getSentry();
    if (!Sentry) return;

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureException(new Error(String(error)));
    }
  }
}

/**
 * Initialize Sentry (lazy-loaded)
 *
 * Call this function early in the application bootstrap process.
 * Configures Sentry with Angular-specific integrations.
 */
export async function initSentry(): Promise<void> {
  if (!environment.sentryDsn) {
    if (environment.production) {
      console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    }
    return;
  }

  const Sentry = await getSentry();
  if (!Sentry) return;
  const logger = inject(LoggerService);

  const options = {
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
    // beforeSend(event: any, _hint: any) { // Cambiado a any
    //   // Remove sensitive query parameters
    //   if (event.request?.url) {
    //     try {
    //       const url = new URL(event.request.url);
    //       const sensitiveParams = ['token', 'key', 'password', 'secret', 'apikey'];

    //       sensitiveParams.forEach((param) => {
    //         if (url.searchParams.has(param)) {
    //           url.searchParams.set(param, '[REDACTED]');
    //         }
    //       });

    //       event.request.url = url.toString();
    //     } catch {
    //       // Invalid URL, ignore
    //     }
    //   }

    //   // Remove sensitive headers
    //   if (event.request?.headers) {
    //     const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    //     sensitiveHeaders.forEach((header) => {
    //       if (event.request?.headers?.[header]) {
    //         event.request.headers[header] = '[REDACTED]';
    //       }
    //     });
    //   }

    //   return event;
    // },

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
  };

  // Por ahora, solo inicializamos la parte web debido a conflictos de tipos con Sentry Capacitor
  Sentry.init(options);
  logger.debug('✅ Sentry initialized (Web only)', 'Sentry');
}
