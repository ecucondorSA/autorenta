import { inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

/**
 * Custom Route Reuse Strategy
 *
 * Keeps specific route components in memory when navigating away,
 * so they can be instantly restored when the user returns.
 *
 * USE CASE:
 * - User is on Marketplace (/) with 3D car model loaded
 * - User navigates to /cars/detail/123
 * - User navigates back to /
 * - WITHOUT this: 3D model reloads from scratch (2-4 seconds)
 * - WITH this: Component is instantly restored (< 100ms)
 *
 * ROUTES TO CACHE:
 * - '' (Marketplace) - Heavy 3D model
 * - 'cars/list' - Heavy Mapbox map
 */
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private readonly logger = inject(LoggerService);
  /**
   * Routes to keep in memory for instant restore
   * Add route paths here (without leading slash)
   */
  private readonly routesToCache = new Set([
    '',           // Marketplace with 3D model
    'cars/list',  // Cars list with Mapbox map
  ]);

  /**
   * Storage for detached route handles
   * Key: route path, Value: detached component reference
   */
  private readonly handlers = new Map<string, DetachedRouteHandle>();

  /**
   * Maximum number of routes to cache (memory management)
   */
  private readonly maxCacheSize = 3;

  /**
   * Get the route path from snapshot
   */
  private getPath(route: ActivatedRouteSnapshot): string {
    // Build full path from route tree
    const path = route.pathFromRoot
      .filter(r => r.url.length > 0)
      .map(r => r.url.map(segment => segment.path).join('/'))
      .join('/');
    return path;
  }

  /**
   * Determines if this route should be detached (stored) when leaving
   * Return true to store the component in memory
   */
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    const path = this.getPath(route);
    const shouldCache = this.routesToCache.has(path);

    if (shouldCache) {
      this.logger.debug(`[RouteReuse] Detaching route for cache: "${path}"`);
    }

    return shouldCache;
  }

  /**
   * Stores the detached route handle
   * Called after shouldDetach returns true
   */
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const path = this.getPath(route);

    if (handle) {
      // Enforce max cache size (LRU eviction)
      if (this.handlers.size >= this.maxCacheSize && !this.handlers.has(path)) {
        const oldestKey = this.handlers.keys().next().value;
        if (oldestKey) {
          this.logger.debug(`[RouteReuse] Evicting oldest cached route: "${oldestKey}"`);
          this.handlers.delete(oldestKey);
        }
      }

      this.handlers.set(path, handle);
      this.logger.debug(`[RouteReuse] Stored route: "${path}" (cache size: ${this.handlers.size})`);
    } else {
      this.handlers.delete(path);
    }
  }

  /**
   * Determines if this route should be attached (restored) from cache
   * Return true to restore the cached component
   */
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const path = this.getPath(route);
    const hasHandle = this.handlers.has(path);

    if (hasHandle) {
      this.logger.debug(`[RouteReuse] Restoring cached route: "${path}"`);
    }

    return hasHandle;
  }

  /**
   * Retrieves the stored route handle
   * Called after shouldAttach returns true
   */
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const path = this.getPath(route);
    return this.handlers.get(path) || null;
  }

  /**
   * Determines if the route should be reused
   * Return true to keep the current component, false to create new
   */
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Default behavior: reuse if same route config
    return future.routeConfig === curr.routeConfig;
  }

  /**
   * Clear all cached routes (call on logout, etc.)
   */
  clearCache(): void {
    this.logger.debug(`[RouteReuse] Clearing all cached routes (${this.handlers.size} routes)`);
    this.handlers.clear();
  }

  /**
   * Clear a specific route from cache
   */
  clearRoute(path: string): void {
    if (this.handlers.has(path)) {
      this.handlers.delete(path);
      this.logger.debug(`[RouteReuse] Cleared cached route: "${path}"`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; routes: string[] } {
    return {
      size: this.handlers.size,
      routes: Array.from(this.handlers.keys()),
    };
  }
}

/**
 * Factory function to create and export a singleton instance
 * This allows other services to clear the cache if needed
 */
let strategyInstance: CustomRouteReuseStrategy | null = null;

export function getRouteReuseStrategy(): CustomRouteReuseStrategy {
  if (!strategyInstance) {
    strategyInstance = new CustomRouteReuseStrategy();
  }
  return strategyInstance;
}

/**
 * Provider for the route reuse strategy
 * Add this to your app.config.ts providers
 */
export const routeReuseStrategyProvider = {
  provide: RouteReuseStrategy,
  useFactory: getRouteReuseStrategy,
};
