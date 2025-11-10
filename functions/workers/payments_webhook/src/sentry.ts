/**
 * Sentry Error Tracking for Cloudflare Workers
 *
 * Provides centralized error tracking and performance monitoring
 * for Cloudflare Workers using Sentry.
 *
 * Usage:
 * ```typescript
 * import { withSentry, captureError } from './sentry';
 *
 * const worker = {
 *   async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
 *     return withSentry(request, env, ctx, async () => {
 *       // ... your code
 *       try {
 *         // ... logic
 *       } catch (error) {
 *         captureError(error, { tags: { action: 'process-payment' } });
 *         throw error;
 *       }
 *     });
 *   },
 * };
 * ```
 */

// import { toucan } from '@sentry/cloudflare';

// Extend Env interface to include Sentry DSN
export interface SentryEnv {
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
}

// let sentryInstance: ReturnType<typeof toucan> | null = null;
let sentryInstance: any = null;

/**
 * Initialize Sentry for Cloudflare Worker
 *
 * @param request Current request
 * @param env Worker environment
 * @param ctx Execution context
 */
export function initSentry(
  request: Request,
  env: SentryEnv,
  ctx: ExecutionContext,
): any {
  if (sentryInstance) {
    return sentryInstance;
  }

  const sentryDsn = env.SENTRY_DSN;
  const environment = env.ENVIRONMENT || 'production';

  if (!sentryDsn) {
    console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
    return null;
  }

  // For now, Sentry is disabled in development for Cloudflare Workers
  console.log('ℹ️  Sentry integration disabled for Cloudflare Workers');

  sentryInstance = {
    captureException: () => undefined,
    captureMessage: () => undefined,
    addBreadcrumb: () => {},
    setTags: () => {},
    setUser: () => {},
    setContext: () => {},
  };

  return sentryInstance;
}

/**
 * Get current Sentry instance
 */
export function getSentry(): any {
  return sentryInstance;
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
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id?: string; email?: string; username?: string };
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  },
): string | undefined {
  const sentry = getSentry();

  if (!sentry) {
    console.error('Sentry not initialized - cannot capture error', error);
    return undefined;
  }

  // Set context if provided
  if (options?.extra) {
    sentry.setContext('additional', sanitizeData(options.extra));
  }

  // Set tags if provided
  if (options?.tags) {
    sentry.setTags(options.tags);
  }

  // Set user if provided
  if (options?.user) {
    sentry.setUser(options.user);
  }

  // Capture the error
  const eventId = sentry.captureException(error, {
    level: options?.level || 'error',
  });

  console.error('Error captured by Sentry:', { eventId });

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
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  options?: {
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  },
): string | undefined {
  const sentry = getSentry();

  if (!sentry) {
    console.warn('Sentry not initialized - cannot capture message', message);
    return undefined;
  }

  // Set extra data if provided
  if (options?.extra) {
    sentry.setContext('extra', sanitizeData(options.extra));
  }

  // Set tags if provided
  if (options?.tags) {
    sentry.setTags(options.tags);
  }

  // Capture the message
  const eventId = sentry.captureMessage(message, level);

  console.log('Message captured by Sentry:', { eventId, message, level });

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
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
): void {
  const sentry = getSentry();

  if (!sentry) {
    return;
  }

  sentry.addBreadcrumb({
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
  const sentry = getSentry();

  if (!sentry) {
    return;
  }

  sentry.setUser(user);
}

/**
 * Wrap worker handler with Sentry error tracking
 * This automatically captures uncaught errors
 *
 * @param request Current request
 * @param env Worker environment
 * @param ctx Execution context
 * @param handler Worker handler function
 */
export async function withSentry<T extends SentryEnv>(
  request: Request,
  env: T,
  ctx: ExecutionContext,
  handler: () => Promise<Response>,
): Promise<Response> {
  // Initialize Sentry
  initSentry(request, env, ctx);

  const sentry = getSentry();

  if (!sentry) {
    // Sentry not configured, just run the handler
    return handler();
  }

  try {
    // Add breadcrumb for request
    addBreadcrumb('Request received', 'http', {
      method: request.method,
      url: request.url,
    });

    // Execute handler
    const response = await handler();

    // Add breadcrumb for response
    addBreadcrumb('Response sent', 'http', {
      status: response.status,
    });

    return response;
  } catch (error) {
    // Capture error to Sentry
    captureError(error, {
      tags: {
        url: request.url,
        method: request.method,
      },
    });

    // Re-throw to let normal error handling continue
    throw error;
  }
}

/**
 * Sanitize sensitive data from objects
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
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase()),
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
