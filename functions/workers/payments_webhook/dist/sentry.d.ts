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
export interface SentryEnv {
    SENTRY_DSN?: string;
    ENVIRONMENT?: string;
}
/**
 * Initialize Sentry for Cloudflare Worker
 *
 * @param request Current request
 * @param env Worker environment
 * @param ctx Execution context
 */
export declare function initSentry(request: Request, env: SentryEnv, ctx: ExecutionContext): ReturnType<typeof toucan> | null;
/**
 * Get current Sentry instance
 */
export declare function getSentry(): ReturnType<typeof toucan> | null;
/**
 * Capture an error to Sentry
 *
 * @param error The error to capture
 * @param options Additional context and tags
 */
export declare function captureError(error: unknown, options?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: {
        id?: string;
        email?: string;
        username?: string;
    };
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
}): string | undefined;
/**
 * Capture a message to Sentry
 *
 * @param message The message to capture
 * @param level Severity level (default: 'info')
 * @param options Additional context and tags
 */
export declare function captureMessage(message: string, level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug', options?: {
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
}): string | undefined;
/**
 * Add a breadcrumb (for debugging context)
 *
 * @param message Breadcrumb message
 * @param category Breadcrumb category
 * @param data Additional data
 * @param level Severity level
 */
export declare function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>, level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'): void;
/**
 * Set user context for error tracking
 *
 * @param user User information
 */
export declare function setUser(user: {
    id?: string;
    email?: string;
    username?: string;
} | null): void;
/**
 * Wrap worker handler with Sentry error tracking
 * This automatically captures uncaught errors
 *
 * @param request Current request
 * @param env Worker environment
 * @param ctx Execution context
 * @param handler Worker handler function
 */
export declare function withSentry<T extends SentryEnv>(request: Request, env: T, ctx: ExecutionContext, handler: () => Promise<Response>): Promise<Response>;
//# sourceMappingURL=sentry.d.ts.map