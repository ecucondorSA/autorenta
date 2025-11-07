/**
 * Sentry integration for Supabase Edge Functions
 *
 * Provides error tracking and monitoring for Deno-based Edge Functions.
 *
 * Usage:
 * ```typescript
 * import { initSentry, captureError, captureMessage } from '../_shared/sentry.ts';
 *
 * // Initialize once at function start
 * initSentry('function-name');
 *
 * try {
 *   // Your code
 * } catch (error) {
 *   captureError(error, { context: 'payment-processing' });
 *   throw error;
 * }
 * ```
 */

import * as Sentry from 'https://deno.land/x/sentry@8.40.0/index.mjs';

let isInitialized = false;

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
}

/**
 * Initialize Sentry for Edge Function
 */
export function initSentry(functionName: string, config?: SentryConfig): void {
  if (isInitialized) {
    return;
  }

  const dsn = config?.dsn || Deno.env.get('SENTRY_DSN');
  const environment = config?.environment || Deno.env.get('ENVIRONMENT') || 'development';

  // Only initialize if DSN is provided
  if (!dsn) {
    console.warn('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release: config?.release || Deno.env.get('DENO_DEPLOYMENT_ID'),
      // Sample rate: 100% in dev, configurable in prod
      sampleRate: config?.sampleRate ?? (environment === 'production' ? 0.1 : 1.0),
      // Set function name as tag
      initialScope: {
        tags: {
          function: functionName,
          runtime: 'deno',
        },
      },
      // Performance monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      // Before send hook to sanitize sensitive data
      beforeSend(event, hint) {
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
            if (breadcrumb.data) {
              const sanitized = { ...breadcrumb.data };
              const sensitiveKeys = ['password', 'token', 'authorization', 'api_key', 'apiKey', 'secret'];
              sensitiveKeys.forEach((key) => {
                if (key in sanitized) {
                  sanitized[key] = '[REDACTED]';
                }
              });
              return { ...breadcrumb, data: sanitized };
            }
            return breadcrumb;
          });
        }
        return event;
      },
    });

    isInitialized = true;
    console.log(`[Sentry] Initialized for ${functionName} in ${environment}`);
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Capture an error in Sentry
 */
export function captureError(
  error: unknown,
  context?: {
    context?: string;
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  }
): void {
  if (!isInitialized) {
    return;
  }

  try {
    const scope = Sentry.getCurrentScope();

    if (context?.context) {
      scope.setContext('details', { context: context.context });
    }

    if (context?.extra) {
      scope.setExtras(sanitizeData(context.extra));
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureException(new Error(String(error)));
    }
  } catch (err) {
    console.error('[Sentry] Failed to capture error:', err);
  }
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: {
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  }
): void {
  if (!isInitialized) {
    return;
  }

  try {
    const scope = Sentry.getCurrentScope();

    if (context?.extra) {
      scope.setExtras(sanitizeData(context.extra));
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    Sentry.captureMessage(message, level as Sentry.SeverityLevel);
  } catch (err) {
    console.error('[Sentry] Failed to capture message:', err);
  }
}

/**
 * Wrap an Edge Function handler with Sentry error tracking
 */
export function withSentry<T>(
  functionName: string,
  handler: (req: Request) => Promise<Response> | Response
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    initSentry(functionName);

    try {
      return await handler(req);
    } catch (error) {
      // Capture error in Sentry
      captureError(error, {
        context: 'edge-function-handler',
        tags: {
          function: functionName,
          method: req.method,
          url: req.url,
        },
      });

      // Re-throw to let the function handle it
      throw error;
    }
  };
}

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'creditCard',
    'cvv',
    'ssn',
  ];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((k) => lowerKey.includes(k.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
