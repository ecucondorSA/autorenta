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
import { toucan } from '@sentry/cloudflare';
let sentryInstance = null;
/**
 * Initialize Sentry for Cloudflare Worker
 *
 * @param request Current request
 * @param env Worker environment
 * @param ctx Execution context
 */
export function initSentry(request, env, ctx) {
    if (sentryInstance) {
        return sentryInstance;
    }
    const sentryDsn = env.SENTRY_DSN;
    const environment = env.ENVIRONMENT || 'production';
    if (!sentryDsn) {
        console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
        return null;
    }
    sentryInstance = toucan({
        dsn: sentryDsn,
        environment,
        context: ctx,
        request,
        // Performance Monitoring
        tracesSampleRate: 0.1, // 10% of transactions
        // Release tracking
        release: 'autorenta-workers@0.1.0',
        // Enable debug mode in development
        debug: environment !== 'production',
        // Default tags
        initialScope: {
            tags: {
                service: 'cloudflare-workers',
                worker: 'payments-webhook',
                runtime: 'cloudflare-workers',
            },
        },
        // Before send hook - sanitize sensitive data
        beforeSend(event) {
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
    console.log('✅ Sentry initialized:', environment);
    return sentryInstance;
}
/**
 * Get current Sentry instance
 */
export function getSentry() {
    return sentryInstance;
}
/**
 * Capture an error to Sentry
 *
 * @param error The error to capture
 * @param options Additional context and tags
 */
export function captureError(error, options) {
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
export function captureMessage(message, level = 'info', options) {
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
export function addBreadcrumb(message, category = 'default', data, level = 'info') {
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
export function setUser(user) {
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
export async function withSentry(request, env, ctx, handler) {
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
    }
    catch (error) {
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
function sanitizeData(data) {
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
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey.toLowerCase()));
        if (isSensitive) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeData(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
//# sourceMappingURL=sentry.js.map