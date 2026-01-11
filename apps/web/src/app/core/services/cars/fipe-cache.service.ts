import { Injectable, inject } from '@angular/core';
import { PricingService, FipeValueResult } from '@core/services/payments/pricing.service';

/**
 * Cached FIPE entry with timestamp
 */
interface FipeCacheEntry {
  result: FipeValueResult;
  cachedAt: number;
}

/**
 * FipeCacheService
 *
 * LRU cache for FIPE market value lookups.
 * Prevents repeated API calls for the same brand/model/year.
 *
 * Features:
 * - 10 minute TTL (FIPE data rarely changes)
 * - Max 50 entries with LRU eviction
 * - In-memory only (resets on page reload)
 */
@Injectable({ providedIn: 'root' })
export class FipeCacheService {
  private readonly pricingService = inject(PricingService);

  private readonly cache = new Map<string, FipeCacheEntry>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_ENTRIES = 50;

  /**
   * Generate cache key from vehicle info
   */
  private generateKey(brand: string, model: string, year: number): string {
    return `${brand.toLowerCase().trim()}_${model.toLowerCase().trim()}_${year}`;
  }

  /**
   * Get cached value if exists and not expired
   */
  get(brand: string, model: string, year: number): FipeValueResult | null {
    const key = this.generateKey(brand, model, year);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.cachedAt > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used) for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  /**
   * Lookup FIPE value with caching
   * Returns cached value if available, otherwise fetches from API
   */
  async lookup(
    brand: string,
    model: string,
    year: number
  ): Promise<FipeValueResult | null> {
    // Check cache first
    const cached = this.get(brand, model, year);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const result = await this.pricingService.getFipeValueRealtime({
      brand,
      model,
      year,
      country: 'AR',
    });

    if (!result) return null;

    // Cache the result (even failures, to avoid repeated failed lookups)
    this.set(brand, model, year, result);

    return result;
  }

  /**
   * Store value in cache with LRU eviction
   */
  private set(
    brand: string,
    model: string,
    year: number,
    result: FipeValueResult
  ): void {
    const key = this.generateKey(brand, model, year);

    // Enforce max entries (LRU - delete oldest)
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      cachedAt: Date.now(),
    });
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttlMs: this.TTL_MS,
    };
  }
}
