/**
 * Fetch Utilities with Timeout and Retry
 *
 * P0-1: All external API calls MUST use fetchWithTimeout to prevent
 * edge function hangs when external services are slow/down.
 *
 * Default timeouts:
 * - 5s for external APIs (Binance, MercadoPago)
 * - 3s for webhooks (high frequency)
 * - 10s for file operations (PDF generation, etc)
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Fetch with configurable timeout
 *
 * @param url - URL to fetch
 * @param options - Fetch options + timeoutMs
 * @returns Response
 * @throws Error if timeout or fetch fails
 *
 * @example
 * ```typescript
 * // Basic usage with 5s timeout (default)
 * const response = await fetchWithTimeout('https://api.binance.com/...');
 *
 * // Custom timeout
 * const response = await fetchWithTimeout('https://api.example.com', {
 *   timeoutMs: 3000,
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with timeout and automatic retry with exponential backoff + jitter
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Response
 *
 * @example
 * ```typescript
 * const response = await fetchWithRetry('https://api.binance.com/...', {
 *   timeoutMs: 5000,
 * }, {
 *   maxRetries: 3,
 *   baseDelayMs: 200,
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {},
  retryOptions: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 200,
    maxDelayMs = 5000,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff with jitter (P1-1 fix)
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5),
          maxDelayMs
        );
        console.warn(
          `[FetchWithRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}, retrying in ${Math.round(delay)}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
}

/**
 * Fetch JSON with timeout - convenience wrapper
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}
