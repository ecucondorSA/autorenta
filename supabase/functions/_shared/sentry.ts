/**
 * Sentry integration for Supabase Edge Functions (Deno)
 *
 * Usage:
 * ```typescript
 * import { initSentry, captureError, captureMessage } from '../_shared/sentry.ts';
 *
 * // In your edge function:
 * const sentry = initSentry({
 *   functionName: 'my-function',
 *   environment: Deno.env.get('ENVIRONMENT') || 'production',
 * });
 *
 * try {
 *   // Your code
 * } catch (error) {
 *   captureError(error, { tags: { function: 'my-function' } });
 *   throw error;
 * }
 * ```
 */

// Sentry DSN (should be set via environment variable)
const SENTRY_DSN = Deno.env.get('SENTRY_DSN');

interface SentryConfig {
  functionName: string;
  environment?: string;
  release?: string;
}

interface SentryContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
}

/**
 * Initialize Sentry for the current Edge Function
 */
export function initSentry(config: SentryConfig): void {
  if (!SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
    return;
  }

  // Set default context
  globalThis._sentryConfig = {
    ...config,
    environment: config.environment || 'production',
    release: config.release || 'unknown',
  };

  console.log(`✅ Sentry initialized for ${config.functionName}`);
}

/**
 * Capture an exception and send to Sentry
 */
export async function captureError(
  error: Error | unknown,
  context?: SentryContext
): Promise<void> {
  if (!SENTRY_DSN) return;

  const config = (globalThis as any)._sentryConfig as SentryConfig | undefined;

  const event = {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    server_name: 'supabase-edge-function',
    environment: config?.environment || 'production',
    release: config?.release || 'unknown',
    level: context?.level || 'error',
    message: error instanceof Error ? error.message : String(error),
    exception: {
      values: [
        {
          type: error instanceof Error ? error.constructor.name : 'Error',
          value: error instanceof Error ? error.message : String(error),
          stacktrace: error instanceof Error && error.stack
            ? {
                frames: parseStackTrace(error.stack),
              }
            : undefined,
        },
      ],
    },
    tags: {
      function: config?.functionName || 'unknown',
      runtime: 'deno',
      ...context?.tags,
    },
    extra: {
      ...context?.extra,
    },
  };

  try {
    await sendToSentry(event);
  } catch (sendError) {
    console.error('Failed to send error to Sentry:', sendError);
  }
}

/**
 * Capture a message and send to Sentry
 */
export async function captureMessage(
  message: string,
  context?: SentryContext
): Promise<void> {
  if (!SENTRY_DSN) return;

  const config = (globalThis as any)._sentryConfig as SentryConfig | undefined;

  const event = {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    server_name: 'supabase-edge-function',
    environment: config?.environment || 'production',
    release: config?.release || 'unknown',
    level: context?.level || 'info',
    message,
    tags: {
      function: config?.functionName || 'unknown',
      runtime: 'deno',
      ...context?.tags,
    },
    extra: {
      ...context?.extra,
    },
  };

  try {
    await sendToSentry(event);
  } catch (sendError) {
    console.error('Failed to send message to Sentry:', sendError);
  }
}

/**
 * Measure performance of an operation and send to Sentry
 */
export async function measureOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: SentryContext
): Promise<T> {
  const start = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - start;

    // Log slow operations (>2s)
    if (duration > 2000) {
      console.warn(`⚠️ Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);

      if (SENTRY_DSN) {
        await captureMessage(
          `Slow operation: ${operationName} took ${duration.toFixed(2)}ms`,
          {
            level: 'warning',
            tags: {
              ...context?.tags,
              operation: operationName,
            },
            extra: {
              ...context?.extra,
              duration_ms: duration,
            },
          }
        );
      }
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    await captureError(error, {
      ...context,
      extra: {
        ...context?.extra,
        operation: operationName,
        duration_ms: duration,
      },
    });

    throw error;
  }
}

/**
 * Send event to Sentry
 */
async function sendToSentry(event: unknown): Promise<void> {
  if (!SENTRY_DSN) return;

  // Extract project ID from DSN
  const dsnMatch = SENTRY_DSN.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
  if (!dsnMatch) {
    console.error('Invalid Sentry DSN format');
    return;
  }

  const [, publicKey, host, projectId] = dsnMatch;
  const url = `https://${host}/api/${projectId}/store/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=deno-sentry/1.0.0`,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Sentry returned ${response.status}: ${await response.text()}`);
  }
}

/**
 * Parse stack trace into Sentry format
 */
function parseStackTrace(stack: string): Array<{
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
}> {
  const frames: Array<{
    filename?: string;
    function?: string;
    lineno?: number;
    colno?: number;
  }> = [];

  const lines = stack.split('\n');

  for (const line of lines) {
    // Parse Deno stack trace format: "    at functionName (file:line:col)"
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);

    if (match) {
      const [, functionName, filename, lineno, colno] = match;
      frames.push({
        filename,
        function: functionName,
        lineno: parseInt(lineno, 10),
        colno: parseInt(colno, 10),
      });
    }
  }

  return frames.reverse(); // Sentry expects oldest frame first
}

/**
 * Create a Sentry-aware error handler for Edge Functions
 */
export function createErrorHandler(functionName: string) {
  return async (error: Error | unknown): Promise<Response> => {
    console.error(`Error in ${functionName}:`, error);

    // Send to Sentry
    await captureError(error, {
      tags: { function: functionName },
    });

    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };
}
