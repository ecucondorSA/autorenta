import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Injectable, signal, inject } from '@angular/core';

/**
 * Asset Preloader Service
 *
 * Preloads critical images for better perceived performance.
 * Mapbox GL is handled by MapboxPreloaderService via dynamic import('mapbox-gl').
 */
@Injectable({
  providedIn: 'root',
})
export class AssetPreloaderService {
  private readonly logger = inject(LoggerService);
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

  private async runPreload(): Promise<void> {
    const tasks: Array<{ name: string; task: () => Promise<void>; weight: number }> = [
      {
        name: 'Critical Images',
        weight: 100,
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
        this.logger.warn(`[Preloader] Failed to preload ${name}:`, 'AssetPreloaderService', error);
        errors.push(name);
      }

      completedWeight += weight;
      this._progress.set(Math.round((completedWeight / totalWeight) * 100));
    }

    this._errors.set(errors);
    this._isPreloading.set(false);

    this.logger.debug(
      `[Preloader] Complete. Errors: ${errors.length > 0 ? errors.join(', ') : 'none'}`,
    );
  }

  /**
   * Preload critical images using link preload
   */
  private preloadCriticalImages(): Promise<void> {
    const criticalImages = ['/assets/images/autorentar-logo.png', '/assets/og-image.jpg'];

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

}
