/**
 * LRU Cache Service for Map API calls (Isochrone, Directions)
 * Reduces redundant API calls and improves performance
 */
import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapCacheService {
  private readonly maxEntries = 100;
  private readonly ttlMs = 60 * 60 * 1000; // 1 hour TTL

  private isochroneCache = new Map<string, CacheEntry<unknown>>();
  private directionsCache = new Map<string, CacheEntry<unknown>>();
  private accessOrder: string[] = []; // Track LRU order

  /**
   * Get cached isochrone data
   */
  getIsochrone(profile: string, lng: number, lat: number): unknown | null {
    const key = `${profile}:${lng.toFixed(6)}:${lat.toFixed(6)}`;
    return this.getCachedValue(this.isochroneCache, key);
  }

  /**
   * Set isochrone cache entry
   */
  setIsochrone(profile: string, lng: number, lat: number, data: unknown): void {
    const key = `${profile}:${lng.toFixed(6)}:${lat.toFixed(6)}`;
    this.setCachedValue(this.isochroneCache, key, data);
  }

  /**
   * Get cached directions data
   */
  getDirections(origin: string, destination: string): unknown | null {
    const key = `${origin}:${destination}`;
    return this.getCachedValue(this.directionsCache, key);
  }

  /**
   * Set directions cache entry
   */
  setDirections(origin: string, destination: string, data: unknown): void {
    const key = `${origin}:${destination}`;
    this.setCachedValue(this.directionsCache, key, data);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.isochroneCache.clear();
    this.directionsCache.clear();
    this.accessOrder = [];
  }

  /**
   * Clear expired entries (call periodically)
   */
  clearExpired(): void {
    const now = Date.now();
    this.clearExpiredFromMap(this.isochroneCache, now);
    this.clearExpiredFromMap(this.directionsCache, now);
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    return {
      isochroneSize: this.isochroneCache.size,
      directionsSize: this.directionsCache.size,
      totalEntries: this.isochroneCache.size + this.directionsCache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Private helper to get cached value
   */
  private getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update LRU order
    this.updateAccessOrder(key);
    return entry.value;
  }

  /**
   * Private helper to set cached value with LRU eviction
   */
  private setCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    // Check if at capacity and need to evict
    if (!cache.has(key) && cache.size >= this.maxEntries) {
      // Remove least recently used entry
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        cache.delete(lruKey);
        // Also try to delete from other cache if it exists
        if (lruKey.includes(':') && lruKey.split(':').length === 2) {
          const otherCache =
            cache === this.isochroneCache ? this.directionsCache : this.isochroneCache;
          otherCache.delete(lruKey);
        }
      }
    }

    // Set new entry
    cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    // Update access order
    this.updateAccessOrder(key);
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove key if it already exists
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Clear expired entries from a cache map
   */
  private clearExpiredFromMap<T>(cache: Map<string, CacheEntry<T>>, now: number): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }
}
