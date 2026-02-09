/**
 * Chunk Load Error Recovery
 *
 * After a Cloudflare Pages deploy, old chunk filenames no longer exist.
 * The SPA fallback serves index.html (text/html) for missing .js files,
 * causing "Expected JavaScript module but got MIME type text/html" errors.
 *
 * This utility wraps lazy import() calls with a one-time reload recovery:
 * 1. Import fails (stale chunk → MIME error or network error)
 * 2. Set a sessionStorage flag to prevent infinite loops
 * 3. Reload the page → browser gets fresh index.html with correct chunk refs
 * 4. On second failure (flag exists), give up and throw
 */

const RETRY_KEY = 'chunk-retry';

export function lazyRetry<T>(importFn: () => Promise<T>): () => Promise<T> {
  return () =>
    importFn().catch((error: unknown) => {
      if (!sessionStorage.getItem(RETRY_KEY)) {
        sessionStorage.setItem(RETRY_KEY, '1');
        location.reload();
        return new Promise<T>(() => {}); // Never resolves — page is reloading
      }
      sessionStorage.removeItem(RETRY_KEY);
      throw error;
    });
}

/**
 * Call on successful app bootstrap to clear the retry flag.
 */
export function clearChunkRetryFlag(): void {
  sessionStorage.removeItem(RETRY_KEY);
}
