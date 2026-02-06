import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

/**
 * P1-021 FIX: HTTP Cache Interceptor
 *
 * Caching strategy:
 * - User data: 1 hour
 * - Car listings: 5 minutes
 * - Static content: forever (until cleared)
 * - Booking data: No cache (always fresh)
 */

interface CacheEntry {
  response: HttpResponse<unknown>;
  timestamp: number;
}

class HttpCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 50;

  get(key: string, maxAge: number): HttpResponse<unknown> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  set(key: string, response: HttpResponse<unknown>): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Singleton cache service
const cacheService = new HttpCacheService();

// Export for programmatic cache clearing
export function clearHttpCache(pattern?: string): void {
  cacheService.clear(pattern);
}

export const httpCacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Determine cache duration based on URL
  const cacheConfig = getCacheConfig(req.url);

  if (!cacheConfig.enabled) {
    return next(req);
  }

  // Check cache
  const cachedResponse = cacheService.get(req.urlWithParams, cacheConfig.maxAge);
  if (cachedResponse) {
    return of(cachedResponse.clone());
  }

  // Forward request and cache response
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cacheService.set(req.urlWithParams, event);
      }
    }),
  );
};

function getCacheConfig(url: string): { enabled: boolean; maxAge: number } {
  // User profile data: 1 hour
  if (url.includes('/users') || url.includes('/profiles')) {
    return { enabled: true, maxAge: 60 * 60 * 1000 };
  }

  // Car listings: 5 minutes
  if (url.includes('/cars') && !url.includes('/bookings')) {
    return { enabled: true, maxAge: 5 * 60 * 1000 };
  }

  // Static content (insurance policies, etc): 1 day
  if (url.includes('/insurance_policies') || url.includes('/static')) {
    return { enabled: true, maxAge: 24 * 60 * 60 * 1000 };
  }

  // Bookings: NO CACHE (always fresh)
  if (url.includes('/bookings') || url.includes('/payments')) {
    return { enabled: false, maxAge: 0 };
  }

  // Wallet: NO CACHE (always fresh)
  if (url.includes('/wallet')) {
    return { enabled: false, maxAge: 0 };
  }

  // Default: 5 minutes
  return { enabled: true, maxAge: 5 * 60 * 1000 };
}
