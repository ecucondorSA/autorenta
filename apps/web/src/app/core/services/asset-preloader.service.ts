import { Injectable, signal } from '@angular/core';

/**
 * Asset Preloader Service
 *
 * Preloads heavy assets during splash screen:
 * - Three.js library (~500KB)
 * - GLTF/DRACO loaders
 * - Mapbox GL JS SDK (~500KB)
 * - Critical images
 *
 * This improves perceived performance by loading assets
 * while the user watches the splash animation.
 *
 * PRELOAD STRATEGY:
 * 1. Three.js + loaders (for 3D model on splash/marketplace)
 * 2. After model loads: Preload Mapbox SDK (for /cars/list)
 * 3. Critical images
 */
@Injectable({
  providedIn: 'root',
})
export class AssetPreloaderService {
  private readonly _isPreloading = signal(false);
  private readonly _progress = signal(0);
  private readonly _errors = signal<string[]>([]);
  private readonly _mapboxReady = signal(false);

  /** Whether preloading is in progress */
  readonly isPreloading = this._isPreloading.asReadonly();

  /** Progress percentage (0-100) */
  readonly progress = this._progress.asReadonly();

  /** Any errors that occurred during preloading */
  readonly errors = this._errors.asReadonly();

  /** Whether Mapbox SDK is preloaded and ready */
  readonly mapboxReady = this._mapboxReady.asReadonly();

  private preloadPromise: Promise<void> | null = null;
  private mapboxPreloadPromise: Promise<void> | null = null;
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

  /**
   * Preload Mapbox GL JS SDK
   * Call this AFTER splash/3D model loads to preload map for /cars/list
   * This runs in background and doesn't block the UI
   */
  preloadMapbox(): Promise<void> {
    if (this.mapboxPreloadPromise) {
      return this.mapboxPreloadPromise;
    }

    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    console.log('[Preloader] Starting Mapbox preload...');

    this.mapboxPreloadPromise = this.runMapboxPreload();
    return this.mapboxPreloadPromise;
  }

  private async runMapboxPreload(): Promise<void> {
    try {
      // 1. Preload Mapbox GL JS CSS
      const cssPromise = this.preloadMapboxCSS();

      // 2. Preload Mapbox GL JS script
      const jsPromise = this.preloadMapboxJS();

      // 3. Prefetch map tiles for Buenos Aires (common center point)
      const tilesPromise = this.prefetchMapTiles();

      await Promise.all([cssPromise, jsPromise, tilesPromise]);

      this._mapboxReady.set(true);
      console.log('[Preloader] Mapbox preload complete');
    } catch (error) {
      console.warn('[Preloader] Mapbox preload failed (non-blocking):', error);
      // Don't fail - map will still load when user navigates to /cars/list
    }
  }

  private preloadMapboxCSS(): Promise<void> {
    return new Promise((resolve) => {
      const existingLink = document.querySelector('link[href*="mapbox-gl.css"]');
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.onload = () => {
        // Convert to actual stylesheet after preload
        link.rel = 'stylesheet';
        resolve();
      };
      link.onerror = () => resolve(); // Don't fail
      document.head.appendChild(link);

      // Timeout fallback
      setTimeout(resolve, 5000);
    });
  }

  private preloadMapboxJS(): Promise<void> {
    return new Promise((resolve) => {
      // Check if mapboxgl is already loaded
      if ((window as unknown as { mapboxgl?: unknown }).mapboxgl) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="mapbox-gl.js"]');
      if (existingScript) {
        resolve();
        return;
      }

      // Use link preload for the script
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'script';
      preloadLink.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      document.head.appendChild(preloadLink);

      // Actually load the script (it will come from cache)
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.async = true;
      script.onload = () => {
        console.log('[Preloader] Mapbox JS loaded');
        resolve();
      };
      script.onerror = () => resolve();
      document.body.appendChild(script);

      // Timeout fallback
      setTimeout(resolve, 10000);
    });
  }

  private async prefetchMapTiles(): Promise<void> {
    // Prefetch common map tile resources for Buenos Aires area
    // These URLs are typically accessed when loading the map
    const tilesToPrefetch = [
      // Mapbox style
      'https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=',
      // Common sprite/glyph resources
      'https://api.mapbox.com/fonts/v1/mapbox/',
    ];

    // Just create preload links - browser will cache them
    for (const url of tilesToPrefetch) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }

    // Small delay to let prefetch start
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Check if Mapbox is already loaded (for components to check)
   */
  isMapboxLoaded(): boolean {
    return !!(window as unknown as { mapboxgl?: unknown }).mapboxgl;
  }
}
