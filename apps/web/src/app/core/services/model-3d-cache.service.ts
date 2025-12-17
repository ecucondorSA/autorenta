import { Injectable, signal } from '@angular/core';

/**
 * Model 3D Cache Service
 *
 * Singleton service that caches loaded 3D models (GLTF)
 * to avoid re-downloading on navigation.
 *
 * Usage:
 * 1. Check if model is cached: getCachedModel(src)
 * 2. If not cached, load normally then cache it: cacheModel(src, model)
 * 3. On subsequent loads, clone the cached model for instant display
 *
 * Memory Management:
 * - Models are stored as cloneable references
 * - Call clearCache() if needed to free memory
 * - Maximum cache size can be configured
 */

// Type imports for Three.js (lazy loaded)
type ThreeGroup = import('three').Group;
type ThreeScene = import('three').Scene;

interface CachedModel {
  model: ThreeGroup;
  loadedAt: number;
  src: string;
}

@Injectable({
  providedIn: 'root',
})
export class Model3DCacheService {
  private readonly cache = new Map<string, CachedModel>();
  private readonly maxCacheSize = 5; // Maximum number of models to cache

  // Signals for reactive state
  private readonly _isCaching = signal(false);
  private readonly _cachedModels = signal<string[]>([]);

  readonly isCaching = this._isCaching.asReadonly();
  readonly cachedModels = this._cachedModels.asReadonly();

  // Store Three.js module reference for cloning
  private threeModule: typeof import('three') | null = null;

  /**
   * Set the Three.js module reference (call once after importing Three.js)
   */
  setThreeModule(three: typeof import('three')): void {
    this.threeModule = three;
  }

  /**
   * Check if a model is cached
   */
  hasModel(src: string): boolean {
    return this.cache.has(src);
  }

  /**
   * Get a cached model (returns a CLONE for safe reuse)
   * Returns null if not cached
   */
  getCachedModel(src: string): ThreeGroup | null {
    const cached = this.cache.get(src);
    if (!cached || !this.threeModule) return null;

    // Clone the model so each component gets its own instance
    // This allows multiple components to use the same cached model
    return cached['model'].clone();
  }

  /**
   * Get the original cached model reference (for inspection only)
   * WARNING: Do not modify this directly - use getCachedModel() for safe clones
   */
  getOriginalModel(src: string): ThreeGroup | null {
    return this.cache.get(src)?.['model'] ?? null;
  }

  /**
   * Cache a loaded model
   * The model is stored as-is, clones are created on getCachedModel()
   */
  cacheModel(src: string, model: ThreeGroup): void {
    if (this.cache.has(src)) {
      console.log(`[Model3DCache] Model already cached: ${src}`);
      return;
    }

    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this._isCaching.set(true);

    this.cache.set(src, {
      model: model,
      loadedAt: Date.now(),
      src,
    });

    this._cachedModels.set(Array.from(this.cache.keys()));
    this._isCaching.set(false);

    console.log(`[Model3DCache] Model cached: ${src} (total: ${this.cache.size})`);
  }

  /**
   * Prepare a model for caching by detaching it from scene
   * Call this before navigating away to preserve the model
   */
  prepareForCache(model: ThreeGroup, scene: ThreeScene): ThreeGroup {
    // Remove from scene but keep the reference
    scene.remove(model);
    return model;
  }

  /**
   * Clear a specific model from cache
   */
  clearModel(src: string): void {
    const cached = this.cache.get(src);
    if (cached) {
      // Dispose of geometries and materials to free GPU memory
      this.disposeModel(cached['model']);
      this.cache.delete(src);
      this._cachedModels.set(Array.from(this.cache.keys()));
      console.log(`[Model3DCache] Model cleared: ${src}`);
    }
  }

  /**
   * Clear all cached models (free memory)
   */
  clearCache(): void {
    for (const cached of this.cache.values()) {
      this.disposeModel(cached['model']);
    }
    this.cache.clear();
    this._cachedModels.set([]);
    console.log('[Model3DCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; models: string[]; memoryEstimate: string } {
    return {
      size: this.cache.size,
      models: Array.from(this.cache.keys()),
      memoryEstimate: this.estimateMemory(),
    };
  }

  /**
   * Evict the oldest cached model (LRU)
   */
  private evictOldest(): void {
    let oldest: CachedModel | null = null;
    let oldestKey: string | null = null;

    for (const [key, cached] of this.cache.entries()) {
      if (!oldest || cached.loadedAt < oldest.loadedAt) {
        oldest = cached;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.clearModel(oldestKey);
      console.log(`[Model3DCache] Evicted oldest model: ${oldestKey}`);
    }
  }

  /**
   * Dispose of a model's resources (free GPU memory)
   */
  private disposeModel(model: ThreeGroup): void {
    model.traverse((child: any) => {
      const mesh = child as import('three').Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m: any) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }

  /**
   * Estimate memory usage of cached models
   */
  private estimateMemory(): string {
    let totalVertices = 0;

    for (const cached of this.cache.values()) {
      cached['model'].traverse((child: any) => {
        const mesh = child as import('three').Mesh;
        if (mesh.isMesh && mesh.geometry) {
          const posAttr = mesh.geometry.getAttribute('position');
          if (posAttr) {
            totalVertices += posAttr.count;
          }
        }
      });
    }

    // Rough estimate: 32 bytes per vertex (position + normal + uv + tangent)
    const bytes = totalVertices * 32;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
