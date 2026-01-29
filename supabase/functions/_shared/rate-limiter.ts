/**
 * Rate Limiter Middleware for Supabase Edge Functions
 *
 * Usage:
 * ```typescript
 * import { enforceRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';
 *
 * Deno.serve(async (req) => {
 *   try {
 *     await enforceRateLimit(req, {
 *       endpoint: 'wallet-deposit',
 *       windowSeconds: 60,
 *       identifier: req.headers.get('x-forwarded-for') // optional IP override
 *     });
 *
 *     // Process request...
 *     return new Response('OK');
 *   } catch (error) {
 *     if (error instanceof RateLimitError) {
 *       return error.toResponse();
 *     }
 *     throw error;
 *   }
 * });
 * ```
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  endpoint?: string;
  windowSeconds?: number;
  identifier?: string; // Optional override (e.g., IP address)
  /**
   * P0-2: Fail behavior when rate limiter has errors
   * - true (default): Return 503 Service Unavailable when rate limiter fails
   * - false: Allow request through when rate limiter fails (legacy behavior)
   *
   * CRITICAL: Use failClosed=true for payment/financial endpoints
   */
  failClosed?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  limit_value: number;
  window_reset_at: string;
  retry_after_seconds: number;
}

// ============================================================================
// Rate Limit Error
// ============================================================================

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly currentCount: number;
  public readonly limit: number;
  public readonly retryAfter: number;
  public readonly resetAt: string;

  constructor(result: RateLimitResult) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.currentCount = result.current_count;
    this.limit = result.limit_value;
    this.retryAfter = result.retry_after_seconds;
    this.resetAt = result.window_reset_at;
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: {
          current: this.currentCount,
          limit: this.limit,
          retryAfter: this.retryAfter,
          resetAt: this.resetAt,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': this.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': this.resetAt,
          'Retry-After': this.retryAfter.toString(),
        },
      }
    );
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Service Unavailable Error for fail-closed rate limiter
 */
export class RateLimiterUnavailableError extends Error {
  public readonly statusCode = 503;

  constructor(originalError: Error) {
    super('Rate limiter service temporarily unavailable');
    this.name = 'RateLimiterUnavailableError';
    this.cause = originalError;
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Please try again later.',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '30',
        },
      }
    );
  }
}

/**
 * Enforce rate limit using Supabase RPC function
 *
 * @throws {RateLimitError} if rate limit is exceeded
 * @throws {RateLimiterUnavailableError} if rate limiter fails and failClosed=true
 */
export async function enforceRateLimit(
  req: Request,
  config: RateLimitConfig = {}
): Promise<void> {
  const {
    endpoint = 'global',
    windowSeconds = 60,
    identifier = null,
    failClosed = true, // P0-2: Default to fail-closed for security
  } = config;

  // Get Supabase client from request (assumes JWT in Authorization header)
  const supabase = createSupabaseClient(req);

  // Call RPC function to check and record rate limit
  const { data, error } = await supabase.rpc('enforce_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_window_seconds: windowSeconds,
  }).single();

  if (error) {
    console.error('[RateLimiter] Error checking rate limit:', error);

    // P0-2: Configurable fail behavior
    if (failClosed) {
      // CRITICAL ENDPOINTS: Block request when rate limiter is unavailable
      console.error('[RateLimiter] Failing closed - blocking request');
      throw new RateLimiterUnavailableError(error);
    } else {
      // NON-CRITICAL ENDPOINTS: Allow request through (legacy fail-open behavior)
      console.warn('[RateLimiter] Failing open - allowing request');
      return;
    }
  }

  const result = data as unknown as RateLimitResult;

  if (!result.allowed) {
    throw new RateLimitError(result);
  }
}

/**
 * Check rate limit without recording (read-only)
 */
export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const {
    endpoint = 'global',
    windowSeconds = 60,
    identifier = null,
  } = config;

  const supabase = createSupabaseClient(req);

  // Get user ID for determining limit
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  // Determine identifier
  const finalIdentifier = identifier || (userId ? userId : 'anonymous');
  const identifierType = identifier ? 'ip_address' : (userId ? 'user_id' : 'anonymous');

  // Get rate limit for user
  const { data: limit, error: limitError } = await supabase.rpc('get_user_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
  }).single();

  if (limitError) {
    console.error('[RateLimiter] Error getting rate limit:', limitError);
    throw limitError;
  }

  // Check rate limit (without recording)
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: finalIdentifier,
    p_identifier_type: identifierType,
    p_endpoint: endpoint,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  }).single();

  if (error) {
    console.error('[RateLimiter] Error checking rate limit:', error);
    throw error;
  }

  return data as unknown as RateLimitResult;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);

  headers.set('X-RateLimit-Limit', result.limit_value.toString());
  headers.set('X-RateLimit-Remaining', Math.max(0, result.limit_value - result.current_count).toString());
  headers.set('X-RateLimit-Reset', result.window_reset_at);

  if (!result.allowed) {
    headers.set('Retry-After', result.retry_after_seconds.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create Supabase client from request
 */
function createSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Get JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

/**
 * Rate limiter middleware wrapper
 *
 * Usage:
 * ```typescript
 * const handler = withRateLimit(async (req) => {
 *   return new Response('OK');
 * }, { endpoint: 'my-endpoint' });
 *
 * Deno.serve(handler);
 * ```
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response> | Response,
  config: RateLimitConfig = {}
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      await enforceRateLimit(req, config);
      const response = await handler(req);

      // Optionally add rate limit headers to successful responses
      // const result = await checkRateLimit(req, config);
      // return addRateLimitHeaders(response, result);

      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        return error.toResponse();
      }
      // P0-2: Handle fail-closed errors
      if (error instanceof RateLimiterUnavailableError) {
        return error.toResponse();
      }
      throw error;
    }
  };
}

/**
 * Extract IP address from request (considering proxies)
 */
export function getClientIp(req: Request): string | null {
  // Try common proxy headers
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP in the list (client IP)
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback (won't work in Edge Functions, but good for local dev)
  return null;
}
