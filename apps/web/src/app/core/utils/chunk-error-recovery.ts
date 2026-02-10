/**
 * Chunk Load Error Recovery
 *
 * After a Cloudflare Pages deploy, old chunk filenames no longer exist.
 * The SPA fallback serves index.html (text/html) for missing .js files,
 * causing "Expected JavaScript module but got MIME type text/html" errors.
 *
 * This utility provides two layers of protection:
 *
 * Layer 1 (lazyRetry): Wraps lazy import() calls with a one-time reload recovery:
 * 1. Import fails (stale chunk → MIME error or network error)
 * 2. Set a sessionStorage flag to prevent infinite loops
 * 3. Reload the page → browser gets fresh index.html with correct chunk refs
 * 4. On second failure (flag exists), give up and throw
 *
 * Layer 2 (installGlobalChunkErrorHandler): Catches non-route chunk failures
 * (shared modules, dynamic imports outside router) via global error events.
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

/**
 * Install a global handler that catches chunk/module load failures
 * not covered by lazyRetry (e.g. shared chunks, non-route dynamic imports).
 *
 * Detects MIME type mismatch ("text/html") and ChunkLoadError patterns,
 * then forces a single reload to get fresh assets.
 */
export function installGlobalChunkErrorHandler(): void {
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isChunkLoadError(event.message)) {
      handleChunkFailure();
    }
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (isChunkLoadError(msg)) {
      event.preventDefault();
      handleChunkFailure();
    }
  });
}

function isChunkLoadError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('loading chunk') ||
    lower.includes('loading css chunk') ||
    lower.includes('mime type') ||
    lower.includes('expected a javascript module script')
  );
}

function handleChunkFailure(): void {
  if (!sessionStorage.getItem(RETRY_KEY)) {
    sessionStorage.setItem(RETRY_KEY, '1');
    location.reload();
  }
}
