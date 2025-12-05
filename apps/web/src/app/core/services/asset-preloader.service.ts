import { Injectable, signal } from '@angular/core';

/**
 * Asset Preloader Service
 *
 * Preloads heavy assets during splash screen:
 * - Three.js library (~500KB)
 * - GLTF/DRACO loaders
 * - Critical images
 *
 * This improves perceived performance by loading assets
 * while the user watches the splash animation.
 */
@Injectable({
  providedIn: 'root',
})
export class AssetPreloaderService {
  private readonly _isPreloading = signal(false);
  private readonly _progress = signal(0);
  private readonly _errors = signal<string[]>([]);

  /** Whether preloading is in progress */
  readonly isPreloading = this._isPreloading.asReadonly();

  /** Progress percentage (0-100) */
  readonly progress = this._progress.asReadonly();

  /** Any errors that occurred during preloading */
  readonly errors = this._errors.asReadonly();

  private preloadPromise: Promise<void> | null = null;
  private threeModule: typeof import('three') | null = null;

  /**
   * Start preloading critical assets
   * Returns a promise that resolves when preloading completes
   * Safe to call multiple times - will return existing promise if in progress
   */
  preloadCriticalAssets(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this._isPreloading.set(true);
    this._progress.set(0);

    this.preloadPromise = this.runPreload();

    return this.preloadPromise;
  }

  /**
   * Get cached Three.js module (if already loaded)
   */
  getThreeModule(): typeof import('three') | null {
    return this.threeModule;
  }

  private async runPreload(): Promise<void> {
    const tasks: Array<{ name: string; task: () => Promise<void>; weight: number }> = [
      {
        name: 'Three.js Core',
        weight: 40,
        task: async () => {
          this.threeModule = await import('three');
        },
      },
      {
        name: 'GLTF Loader',
        weight: 20,
        task: async () => {
          await import('three/examples/jsm/loaders/GLTFLoader.js');
        },
      },
      {
        name: 'DRACO Loader',
        weight: 20,
        task: async () => {
          await import('three/examples/jsm/loaders/DRACOLoader.js');
        },
      },
      {
        name: 'Orbit Controls',
        weight: 10,
        task: async () => {
          await import('three/examples/jsm/controls/OrbitControls.js');
        },
      },
      {
        name: 'Critical Images',
        weight: 10,
        task: () => this.preloadCriticalImages(),
      },
    ];

    const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
    let completedWeight = 0;

    const errors: string[] = [];

    for (const { name, task, weight } of tasks) {
      try {
        await task();
      } catch (error) {
        console.warn(`[Preloader] Failed to preload ${name}:`, error);
        errors.push(name);
      }

      completedWeight += weight;
      this._progress.set(Math.round((completedWeight / totalWeight) * 100));
    }

    this._errors.set(errors);
    this._isPreloading.set(false);

    console.log(`[Preloader] Complete. Errors: ${errors.length > 0 ? errors.join(', ') : 'none'}`);
  }

  /**
   * Preload critical images using link preload
   */
  private preloadCriticalImages(): Promise<void> {
    const criticalImages = [
      '/assets/images/autorentar-logo.png',
      '/assets/images/hero-car.webp',
    ];

    const promises = criticalImages.map((src) => {
      return new Promise<void>((resolve) => {
        // Check if already in cache
        const existing = document.querySelector(`link[href="${src}"]`);
        if (existing) {
          resolve();
          return;
        }

        // Create preload link
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        link.onload = () => resolve();
        link.onerror = () => resolve(); // Don't fail on image errors
        document.head.appendChild(link);

        // Timeout fallback
        setTimeout(resolve, 3000);
      });
    });

    return Promise.all(promises).then(() => {});
  }

  /**
   * Preload a specific 3D model (optional, for known models)
   */
  async preloadModel(modelUrl: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Use fetch to cache the model file
      await fetch(modelUrl, { method: 'GET', cache: 'force-cache' });
      console.log(`[Preloader] Model cached: ${modelUrl}`);
    } catch (error) {
      console.warn(`[Preloader] Failed to cache model: ${modelUrl}`, error);
    }
  }
}
