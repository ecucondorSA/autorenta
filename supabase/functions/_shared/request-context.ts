/**
 * Request Context for Edge Functions
 *
 * Provides unified request handling with:
 * - Automatic correlation ID (trace_id) generation/extraction
 * - Structured logging with request context
 * - Response headers with trace ID for debugging
 *
 * Usage:
 * ```typescript
 * import { createRequestContext, jsonResponse } from '../_shared/request-context.ts';
 *
 * Deno.serve(async (req) => {
 *   const ctx = createRequestContext(req, 'mercadopago-webhook');
 *
 *   ctx.log.info('Request received', { method: req.method, url: req.url });
 *
 *   try {
 *     // Process request...
 *     const result = await processWebhook(req);
 *
 *     ctx.log.info('Request completed successfully');
 *     return ctx.jsonResponse({ success: true, data: result });
 *   } catch (error) {
 *     ctx.log.error('Request failed', error);
 *     return ctx.jsonResponse({ error: 'Internal error' }, 500);
 *   }
 * });
 * ```
 */

import { Logger, generateTraceId, extractTraceId } from './logger.ts';

export interface RequestContext {
  /** Unique correlation ID for this request */
  traceId: string;

  /** Logger with trace ID and function context */
  log: Logger;

  /** Start time for duration measurement */
  startTime: number;

  /** Request metadata */
  request: {
    method: string;
    url: string;
    userAgent?: string;
    ip?: string;
  };

  /**
   * Create a JSON response with trace ID header
   */
  jsonResponse: <T>(body: T, status?: number, headers?: Record<string, string>) => Response;

  /**
   * Calculate request duration in milliseconds
   */
  getDuration: () => number;
}

/**
 * Create a request context with automatic trace ID and structured logging
 */
export function createRequestContext(
  req: Request,
  functionName: string,
): RequestContext {
  // Extract or generate trace ID
  const traceId = extractTraceId(req.headers) || generateTraceId();

  // Create logger with context
  const log = new Logger({
    traceId,
    functionName,
    serviceName: 'edge-function',
    outputJson: true, // Always JSON for Edge Functions
  });

  // Extract request metadata
  const startTime = Date.now();
  const url = new URL(req.url);

  const request = {
    method: req.method,
    url: url.pathname,
    userAgent: req.headers.get('user-agent') || undefined,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined,
  };

  // Log request start
  log.info('Request started', {
    method: request.method,
    path: request.url,
    ip: request.ip,
  });

  /**
   * Create JSON response with standard headers
   */
  function jsonResponse<T>(
    body: T,
    status = 200,
    additionalHeaders: Record<string, string> = {},
  ): Response {
    const duration = Date.now() - startTime;

    // Log response
    if (status >= 400) {
      log.warn('Request completed with error', { status, duration_ms: duration });
    } else {
      log.info('Request completed', { status, duration_ms: duration });
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
      'X-Request-Duration': `${duration}ms`,
      ...additionalHeaders,
    });

    return new Response(JSON.stringify(body), {
      status,
      headers,
    });
  }

  /**
   * Calculate elapsed time
   */
  function getDuration(): number {
    return Date.now() - startTime;
  }

  return {
    traceId,
    log,
    startTime,
    request,
    jsonResponse,
    getDuration,
  };
}

/**
 * Standard error response with trace ID
 */
export function errorResponse(
  ctx: RequestContext,
  message: string,
  status = 500,
  code?: string,
  details?: unknown,
): Response {
  ctx.log.error(message, details);

  return ctx.jsonResponse(
    {
      error: code || 'INTERNAL_ERROR',
      message,
      trace_id: ctx.traceId,
      ...(details && typeof details === 'object' ? { details } : {}),
    },
    status,
  );
}

/**
 * Wrap an async handler with automatic error handling and logging
 */
export function withRequestContext<T>(
  functionName: string,
  handler: (ctx: RequestContext, req: Request) => Promise<T>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const ctx = createRequestContext(req, functionName);

    try {
      const result = await handler(ctx, req);

      // If handler returns a Response, use it directly
      if (result instanceof Response) {
        return result;
      }

      // Otherwise, wrap in JSON response
      return ctx.jsonResponse(result);
    } catch (error) {
      // Log error and return 500
      ctx.log.error('Unhandled error', error);

      return ctx.jsonResponse(
        {
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          trace_id: ctx.traceId,
        },
        500,
      );
    }
  };
}

/**
 * Standard health check response
 */
export function healthCheckResponse(ctx: RequestContext): Response {
  return ctx.jsonResponse({
    status: 'ok',
    trace_id: ctx.traceId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validation error response
 */
export function validationErrorResponse(
  ctx: RequestContext,
  errors: string[] | Record<string, string>,
): Response {
  ctx.log.warn('Validation failed', { errors });

  return ctx.jsonResponse(
    {
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      trace_id: ctx.traceId,
      details: errors,
    },
    400,
  );
}

/**
 * Not found response
 */
export function notFoundResponse(ctx: RequestContext, resource: string): Response {
  ctx.log.warn('Resource not found', { resource });

  return ctx.jsonResponse(
    {
      error: 'NOT_FOUND',
      message: `${resource} not found`,
      trace_id: ctx.traceId,
    },
    404,
  );
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(ctx: RequestContext, reason?: string): Response {
  ctx.log.warn('Unauthorized request', { reason });

  return ctx.jsonResponse(
    {
      error: 'UNAUTHORIZED',
      message: reason || 'Authentication required',
      trace_id: ctx.traceId,
    },
    401,
  );
}
