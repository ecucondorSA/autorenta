import * as Sentry from '@sentry/angular';
import type { Breadcrumb } from '@sentry/types';
import { environment } from '../../../environments/environment';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * Features:
 * - Error tracking with stack traces
 * - Performance monitoring (10% sample rate)
 * - Core Web Vitals tracking (LCP, FID, CLS)
 * - HTTP request instrumentation
 * - Breadcrumbs for user actions
 * - Release tracking with git commit SHA
 */
export function initializeSentry(): void {
  // Only initialize if DSN is provided
  if (!environment.sentryDsn) {
    if (!environment.production) {
      console.log('ℹ️ Sentry not initialized - no DSN provided');
    }
    return;
  }

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.sentryEnvironment,

    // Performance Monitoring
    integrations: [
      // Enable browser tracing
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
    ],

    // Performance monitoring sample rate (10% of transactions)
    tracesSampleRate: environment.sentryTracesSampleRate,

    // Capture 100% of errors
    sampleRate: 1.0,

    // Release tracking
    release: `autorenta-web@${environment.production ? 'production' : 'development'}`,

    // Ignore common errors
    ignoreErrors: [
      // Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',

      // Browser extension errors
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Angular hydration warnings (not critical)
      'NG0',

      // ResizeObserver errors (not critical)
      'ResizeObserver loop',
    ],

    // Ignore specific URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Configure what data to send
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly testing
      const testMode =
        typeof localStorage !== 'undefined' ? localStorage.getItem('sentry-test-mode') : null;
      if (!environment.production && !testMode) {
        console.warn('🚫 Sentry error blocked in development:', hint.originalException);
        return null;
      }

      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;

        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
      }

      return event;
    },

    // Configure breadcrumbs
    beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
      // Don't log sensitive URLs
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.url?.includes('token') || breadcrumb.data?.url?.includes('auth')) {
          breadcrumb.data.url = '[REDACTED]';
        }
      }

      // Don't log console breadcrumbs in development (too noisy)
      if (!environment.production && breadcrumb.category === 'console') {
        return null;
      }

      return breadcrumb;
    },

    // Enable debug mode in development
    debug: !environment.production,

    // Set user context
    initialScope: {
      tags: {
        app: 'autorenta-web',
        version: environment.production ? 'production' : 'development',
      },
    },
  });

  if (!environment.production) {
    console.log('✅ Sentry initialized in development mode');
  }
}
