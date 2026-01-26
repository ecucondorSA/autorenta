import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from '@environment';
import { getLocalStorage, isBrowser, runAfterHydration } from '@core/utils/platform.utils';

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

    // Serialize error properly to avoid [object Object] in Sentry
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else if (typeof error === 'object' && error !== null) {
      // Try to extract meaningful information from object errors
      const serialized = this.serializeError(error);
      Sentry.captureException(new Error(serialized.message), {
        extra: serialized.extra,
      });
    } else {
      Sentry.captureException(new Error(String(error)));
    }
  }

  /**
   * Serialize error objects to avoid [object Object] in Sentry
   */
  private serializeError(error: unknown): { message: string; extra: Record<string, unknown> } {
    if (typeof error !== 'object' || error === null) {
      return { message: String(error), extra: {} };
    }

    const obj = error as Record<string, unknown>;

    // Try to extract a meaningful message
    const message =
      (obj['message'] as string) ||
      (obj['error'] as string) ||
      (obj['statusText'] as string) ||
      (obj['name'] as string) ||
      'Unknown error';

    // Collect extra context
    const extra: Record<string, unknown> = {};

    // Common error properties
    const keys = ['code', 'status', 'statusText', 'url', 'method', 'data', 'response', 'stack'];
    for (const key of keys) {
      if (key in obj && obj[key] !== undefined) {
        extra[key] = obj[key];
      }
    }

    // If no extra context, stringify the whole object
    if (Object.keys(extra).length === 0) {
      try {
        extra['serialized'] = JSON.stringify(error);
      } catch {
        extra['serialized'] = '[Circular or non-serializable object]';
      }
    }

    return { message: `Error: ${message}`, extra };
  }
}

/**
 * Initialize Sentry (lazy-loaded)
 *
 * Call this function early in the application bootstrap process.
 * Configures Sentry with Angular-specific integrations.
 */
export async function initSentry(): Promise<void> {
  // Only initialize Sentry in browser
  if (!isBrowser()) {
    return;
  }

  if (!environment.sentryDsn) {
    if (environment.production) {
      console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    }
    return;
  }

  // Wait for hydration to complete before initializing Sentry
  // This prevents NG0750 hydration errors
  runAfterHydration(async () => {
    const Sentry = await getSentry();
    if (!Sentry) return;

    await initializeSentry(Sentry);
  });
}

/**
 * Internal function to initialize Sentry with configuration
 */
async function initializeSentry(Sentry: SentryModule): Promise<void> {

  const options = {
    dsn: environment.sentryDsn,
    environment: environment.sentryEnvironment,

    // Performance Monitoring
    tracesSampleRate: environment.sentryTracesSampleRate ?? (environment.production ? 0.1 : 1.0),
    sendDefaultPii: true, // Add data like inputs and responses to/from LLMs and tools
    tracePropagationTargets: ['localhost', environment.appUrl, environment.supabaseUrl],

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Track HTTP requests
        traceFetch: true,
        traceXHR: true,

        // Track navigation and page loads
        enableLongTask: true,
        enableInp: true,
      }),

      // Track Core Web Vitals
      Sentry.browserProfilingIntegration(),

      // Capture console errors
      Sentry.captureConsoleIntegration({
        levels: ['error', 'assert'],
      }),

      // Track HTTP errors
      Sentry.httpClientIntegration({
        failedRequestStatusCodes: [[400, 599]],
      }),

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

    // Configure what data to send
    beforeSend(event: any, hint: any) {
      // Don't send errors in development unless explicitly testing
      const storage = getLocalStorage();
      const testMode = storage ? storage.getItem('sentry-test-mode') : null;
      if (!environment.production && !testMode) {
        return null;
      }

      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;

        if (event.request.headers) {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'proxy-authorization'];
          sensitiveHeaders.forEach((header) => {
            if (event.request?.headers?.[header]) {
              event.request.headers[header] = '[REDACTED]';
            }
          });
        }

        // Sanitize URL params
        if (event.request.url) {
          try {
            const url = new URL(event.request.url);
            const sensitiveParams = ['token', 'key', 'password', 'secret', 'apikey', 'access_token'];
            let changed = false;

            sensitiveParams.forEach((param) => {
              if (url.searchParams.has(param)) {
                url.searchParams.set(param, '[REDACTED]');
                changed = true;
              }
            });

            if (changed) {
              event.request.url = url.toString();
            }
          } catch {
            // Invalid URL, ignore
          }
        }
      }

      return event;
    },

    // Configure breadcrumbs
    beforeBreadcrumb(breadcrumb: any): any | null {
      // Don't log sensitive URLs in breadcrumbs
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        const url = breadcrumb.data?.['url'];
        if (url && (url.includes('token') || url.includes('auth') || url.includes('key'))) {
          breadcrumb.data['url'] = '[REDACTED]';
        }
      }

      // Don't log console breadcrumbs in development (too noisy)
      if (!environment.production && breadcrumb.category === 'console') {
        return null;
      }

      return breadcrumb;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Network errors (captured by httpClientIntegration but often noisy if transient)
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      'Load failed',
      'The operation was aborted',

      // Angular issues
      'NG0', // Hydration warnings (NG0750, etc.)
      'ExpressionChangedAfterItHasBeenCheckedError',

      // Facebook SDK errors (expected when ad blockers are active)
      'FB is not defined',
      'fb is not defined',
      'Facebook SDK',
      'facebook login',
      'FacebookExpectedError',
      'bloqueador de anuncios',
      'ad blocker',

      // WebAuthn errors (expected user behavior)
      'NotAllowedError',
      'The operation either timed out',
      'authenticator',

      // User-initiated actions
      'User cancelled',
      'User denied',
      'cancelled by user',
      'cancelado',

      // Common benign errors
      'Loading chunk',
      'ChunkLoadError',
      'Script error',
      'style is not done loading',

      // Object serialization (catch-all for [object Object])
      '[object Object]',
    ],

    // Ignore specific URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Set initial scope
    initialScope: {
      tags: {
        app: 'autorenta-web',
        version: environment.production ? 'production' : 'development',
      },
    },

    // Enable debug mode in development
    debug: !environment.production,
  };

  // Por ahora, solo inicializamos la parte web debido a conflictos de tipos con Sentry Capacitor
  Sentry.init(options);

  if (!environment.production) {
    console.log('✅ Sentry initialized (Web only)');
  }
}
