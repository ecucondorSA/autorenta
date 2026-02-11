/**
 * Safe Error Response Utility
 *
 * OWASP A04 — Never leak internal error details to clients.
 * Logs full error server-side, returns sanitized message to client.
 *
 * Usage:
 * ```typescript
 * import { safeErrorResponse } from '../_shared/safe-error.ts';
 * import { getCorsHeaders } from '../_shared/cors.ts';
 *
 * try {
 *   // ...
 * } catch (error) {
 *   return safeErrorResponse(error, getCorsHeaders(req), 'calculate-price');
 * }
 * ```
 */

/** User-safe error messages by status code */
const SAFE_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Resource not found',
  409: 'Conflict',
  422: 'Validation failed',
  429: 'Too many requests',
  500: 'Internal server error',
  502: 'Service temporarily unavailable',
  503: 'Service temporarily unavailable',
};

/**
 * Create a safe error response that never leaks internal details.
 *
 * @param error - The caught error (logged server-side, NEVER sent to client)
 * @param corsHeaders - CORS headers to include in response
 * @param context - Function name for structured logging
 * @param status - HTTP status code (default: 500)
 * @param userMessage - Optional explicit user-safe message (for 4xx only)
 */
export function safeErrorResponse(
  error: unknown,
  corsHeaders: HeadersInit = {},
  context = 'edge-function',
  status = 500,
  userMessage?: string,
): Response {
  // 1. Log full error server-side (visible in Supabase logs / Sentry)
  const errorDetail = error instanceof Error
    ? { message: error.message, stack: error.stack?.split('\n').slice(0, 5).join('\n') }
    : { raw: String(error) };

  console.error(JSON.stringify({
    level: 'error',
    context,
    status,
    error: errorDetail,
    timestamp: new Date().toISOString(),
  }));

  // 2. Build safe client response — NEVER include error.message
  const safeMessage = status < 500 && userMessage
    ? userMessage
    : SAFE_MESSAGES[status] || 'An error occurred';

  return new Response(
    JSON.stringify({ error: safeMessage }),
    {
      status,
      headers: { ...Object.fromEntries(new Headers(corsHeaders).entries()), 'Content-Type': 'application/json' },
    },
  );
}
