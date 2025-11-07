/**
 * Sentry Error Tracking for Supabase Edge Functions (Deno)
 *
 * Provides centralized error tracking and performance monitoring
 * for all Supabase Edge Functions using Sentry.
 *
 * Usage:
 * ```typescript
 * import { initSentry, captureError, captureMessage } from '../_shared/sentry.ts';
 *
 * // Initialize at the start of your Edge Function
 * initSentry('my-function-name');
 *
 * // Capture errors
 * try {
 *   // ... your code
 * } catch (error) {
 *   captureError(error, { context: { userId: '123' } });
 *   throw error;
 * }
 *
 * // Capture messages
 * captureMessage('Something unusual happened', 'warning', { extra: { foo: 'bar' } });
 * ```
 *
 * Environment Variables Required:
 * - SENTRY_DSN: Sentry DSN for the project
 * - ENVIRONMENT: 'production' or 'development' (defaults to 'production')
 */

import * as Sentry from 'https://esm.sh/@sentry/deno@8.46.0';
import { logger } from './logger.ts';

let initialized = false;
let currentFunctionName = '';

/**
 * Initialize Sentry for Edge Function
 * Call this at the beginning of your Edge Function handler
 *
 * @param functionName Name of the Edge Function (for tagging)
 */
export function initSentry(functionName: string): void {
  if (initialized) {
    return;
  }

  const sentryDsn = Deno.env.get('SENTRY_DSN');
  const environment = Deno.env.get('ENVIRONMENT') || 'production';

  if (!sentryDsn) {
    logger.warn('Sentry DSN not configured - error tracking disabled', undefined, functionName);
    return;
  }

  currentFunctionName = functionName;

  Sentry.init({
    dsn: sentryDsn,
    environment,
    integrations: [
      // Deno-specific integrations
      Sentry.denoContextIntegration(),
      Sentry.contextLinesIntegration(),
      Sentry.breadcrumbsIntegration({
        console: true,
        fetch: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Release tracking
    release: 'autorenta-functions@0.1.0',
    // Enable debug mode in development
    debug: environment !== 'production',
    // Default tags
    initialScope: {
      tags: {
        service: 'edge-functions',
        function: functionName,
        runtime: 'deno',
      },
    },
    // Before send hook - sanitize sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            breadcrumb.data = sanitizeData(breadcrumb.data);
          }
          return breadcrumb;
        });
      }

      // Remove sensitive data from extra
      if (event.extra) {
        event.extra = sanitizeData(event.extra);
      }

      // Remove sensitive data from contexts
      if (event.contexts) {
        event.contexts = sanitizeData(event.contexts);
      }

      return event;
    },
  });

  initialized = true;
  logger.info('Sentry initialized', { environment, functionName }, functionName);
}

/**
 * Capture an error to Sentry
 *
 * @param error The error to capture
 * @param options Additional context and tags
 */
export function captureError(
  error: unknown,
  options?: {
    context?: Record<string, unknown>;
    tags?: Record<string, string>;
    user?: { id?: string; email?: string; username?: string };
    level?: Sentry.SeverityLevel;
  },
): string {
  if (!initialized) {
    logger.error('Sentry not initialized - cannot capture error', error, currentFunctionName);
    return '';
  }

  // Set context if provided
  if (options?.context) {
    Sentry.setContext('additional', sanitizeData(options.context));
  }

  // Set tags if provided
  if (options?.tags) {
    Sentry.setTags(options.tags);
  }

  // Set user if provided
  if (options?.user) {
    Sentry.setUser(options.user);
  }

  // Capture the error
  const eventId = Sentry.captureException(error, {
    level: options?.level || 'error',
  });

  logger.error('Error captured by Sentry', { eventId }, currentFunctionName);

  return eventId;
}

/**
 * Capture a message to Sentry
 *
 * @param message The message to capture
 * @param level Severity level (default: 'info')
 * @param options Additional context and tags
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  options?: {
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
    user?: { id?: string; email?: string; username?: string };
  },
): string {
  if (!initialized) {
    logger.warn('Sentry not initialized - cannot capture message', { message }, currentFunctionName);
    return '';
  }

  // Set extra data if provided
  if (options?.extra) {
    Sentry.setContext('extra', sanitizeData(options.extra));
  }

  // Set tags if provided
  if (options?.tags) {
    Sentry.setTags(options.tags);
  }

  // Set user if provided
  if (options?.user) {
    Sentry.setUser(options.user);
  }

  // Capture the message
  const eventId = Sentry.captureMessage(message, level);

  logger.info('Message captured by Sentry', { eventId, message, level }, currentFunctionName);

  return eventId;
}

/**
 * Add a breadcrumb (for debugging context)
 *
 * @param message Breadcrumb message
 * @param category Breadcrumb category
 * @param data Additional data
 * @param level Severity level
 */
export function addBreadcrumb(
  message: string,
  category = 'default',
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info',
): void {
  if (!initialized) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data: data ? sanitizeData(data) : undefined,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error tracking
 *
 * @param user User information
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null): void {
  if (!initialized) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Start a new transaction for performance monitoring
 *
 * @param name Transaction name
 * @param op Operation type (e.g., 'http.server', 'function.invoke')
 * @returns Transaction object
 */
export function startTransaction(
  name: string,
  op = 'function.invoke',
): Sentry.Transaction | null {
  if (!initialized) {
    return null;
  }

  return Sentry.startTransaction({
    name,
    op,
    tags: {
      function: currentFunctionName,
    },
  });
}

/**
 * Sanitize sensitive data from objects
 * Similar to logger sanitization but for Sentry
 */
function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  // Objects
  const SENSITIVE_KEYS = [
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
    'mp_access_token',
    'mp_refresh_token',
    'mercadopago_access_token',
    'supabase_service_role_key',
    'anon_key',
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Flush pending events to Sentry (useful for serverless environments)
 * Call this before your Edge Function returns
 *
 * @param timeout Timeout in milliseconds (default: 2000)
 */
export async function flush(timeout = 2000): Promise<boolean> {
  if (!initialized) {
    return true;
  }

  try {
    return await Sentry.flush(timeout);
  } catch (error) {
    logger.error('Failed to flush Sentry events', error, currentFunctionName);
    return false;
  }
}

// Re-export Sentry types for convenience
export type { SeverityLevel, Transaction, Span } from 'https://esm.sh/@sentry/deno@8.46.0';
