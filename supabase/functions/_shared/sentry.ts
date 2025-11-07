/**
 * Sentry Integration for Supabase Edge Functions
 *
 * Provides error tracking and performance monitoring for Edge Functions.
 * Uses Sentry's Deno SDK.
 *
 * Usage:
 *   import { initSentry, captureError, captureMessage } from '../_shared/sentry.ts';
 *
 *   // Initialize at the start of your function
 *   const sentry = initSentry('function-name');
 *
 *   // Capture errors
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     captureError(error, { context: 'operation-name' });
 *   }
 */

import * as Sentry from 'https://deno.land/x/sentry@7.114.0/index.mjs';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
}

// Global Sentry initialization flag
let sentryInitialized = false;

/**
 * Initialize Sentry for Edge Function
 *
 * @param functionName - Name of the Edge Function (for tagging)
 * @returns Sentry client or null if not configured
 */
export function initSentry(functionName: string): typeof Sentry | null {
  // Get DSN from environment
  const dsn = Deno.env.get('SENTRY_DSN');

  if (!dsn) {
    console.warn('⚠️ SENTRY_DSN not configured - error tracking disabled');
    return null;
  }

  if (!sentryInitialized) {
    const environment = Deno.env.get('SENTRY_ENVIRONMENT') || 'production';
    const tracesSampleRate = parseFloat(Deno.env.get('SENTRY_TRACES_SAMPLE_RATE') || '0.1');

    Sentry.init({
      dsn,
      environment,
      tracesSampleRate,
      release: `autorenta-functions@${environment}`,

      // Add function name as tag
      initialScope: {
        tags: {
          function: functionName,
          runtime: 'edge-function',
        },
      },

      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive environment variables
        if (event.extra?.env) {
          const sensitiveKeys = [
            'SUPABASE_SERVICE_ROLE_KEY',
            'SUPABASE_ANON_KEY',
            'MERCADOPAGO_ACCESS_TOKEN',
            'MERCADOPAGO_WEBHOOK_SECRET',
            'PAYPAL_CLIENT_SECRET',
            'SENTRY_DSN',
          ];

          sensitiveKeys.forEach(key => {
            if (event.extra?.env?.[key]) {
              event.extra.env[key] = '[REDACTED]';
            }
          });
        }

        // Remove authorization headers
        if (event.request?.headers?.authorization) {
          event.request.headers.authorization = '[REDACTED]';
        }

        return event;
      },
    });

    sentryInitialized = true;
    console.log(`✅ Sentry initialized for ${functionName}`);
  }

  return Sentry;
}

/**
 * Capture an error to Sentry
 *
 * @param error - Error to capture
 * @param context - Additional context (tags, extra data)
 */
export function captureError(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  },
): void {
  if (!sentryInitialized) {
    console.error('❌ Error:', error);
    return;
  }

  const captureContext: Sentry.CaptureContext = {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
  };

  if (error instanceof Error) {
    Sentry.captureException(error, captureContext);
  } else {
    Sentry.captureException(new Error(String(error)), captureContext);
  }
}

/**
 * Capture a message to Sentry
 *
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
): void {
  if (!sentryInitialized) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Start a Sentry transaction for performance monitoring
 *
 * @param name - Transaction name
 * @param op - Operation type
 * @returns Transaction or null
 */
export function startTransaction(
  name: string,
  op: string = 'function',
): Sentry.Transaction | null {
  if (!sentryInitialized) {
    return null;
  }

  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Wrap an Edge Function handler with Sentry error tracking
 *
 * @param functionName - Name of the function
 * @param handler - Request handler function
 * @returns Wrapped handler
 */
export function withSentry(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  // Initialize Sentry
  initSentry(functionName);

  return async (req: Request): Promise<Response> => {
    const transaction = startTransaction(functionName, 'http.server');

    try {
      // Set request context
      if (sentryInitialized) {
        Sentry.setContext('request', {
          method: req.method,
          url: req.url,
          headers: {
            'content-type': req.headers.get('content-type'),
            'user-agent': req.headers.get('user-agent'),
          },
        });
      }

      const response = await handler(req);

      // Tag response status
      if (sentryInitialized && transaction) {
        transaction.setTag('http.status_code', response.status.toString());
      }

      return response;
    } catch (error) {
      // Capture error
      captureError(error, {
        tags: {
          function: functionName,
          method: req.method,
        },
        extra: {
          url: req.url,
        },
        level: 'error',
      });

      // Return error response
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } finally {
      if (transaction) {
        transaction.finish();
      }
    }
  };
}
