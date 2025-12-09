import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Sentry module type for lazy loading
 */
type SentryModule = typeof import('@sentry/angular');

type LargestContentfulPaintEntry = PerformanceEntry & {
  renderTime?: number;
  loadTime?: number;
};

type FirstInputDelayEntry = PerformanceEntry & {
  processingStart: number;
  startTime: number;
};

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

// Network Information API types (not in standard lib)
interface NetworkInformation extends EventTarget {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
  onchange: ((this: NetworkInformation, ev: Event) => unknown) | null;
}

type NavigatorWithOptionalConnection = Navigator & {
  connection?: NetworkInformation;
};

/**
 * 📊 Performance Monitoring Service
 *
 * Monitorea métricas clave de performance en móvil:
 * - FPS (Frames per second)
 * - Memory usage
 * - Load times
 * - Core Web Vitals
 */
@Injectable({
  providedIn: 'root',
})
export class PerformanceMonitoringService {
  private fpsCounter = 0;
  private lastFrameTime = performance.now();

  /** Cached Sentry module (lazy-loaded) */
  private sentryModule: SentryModule | null = null;
  private sentryLoadPromise: Promise<SentryModule | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initMonitoring();
    }
  }

  /**
   * Lazy-load Sentry module (saves ~238KB from initial bundle)
   */
  private async getSentry(): Promise<SentryModule | null> {
    if (this.sentryModule) {
      return this.sentryModule;
    }

    if (!environment.sentryDsn) {
      return null;
    }

    if (!this.sentryLoadPromise) {
      this.sentryLoadPromise = import('@sentry/angular')
        .then((module) => {
          this.sentryModule = module;
          return module;
        })
        .catch((err) => {
          console.error('Failed to load Sentry:', err);
          this.sentryLoadPromise = null;
          return null;
        });
    }

    return this.sentryLoadPromise;
  }

  /**
   * Send performance metric to Sentry (lazy-loaded)
   */
  private async sendToSentry(contextKey: string, value: number): Promise<void> {
    if (!environment.sentryDsn) return;

    const Sentry = await this.getSentry();
    if (!Sentry) return;

    Sentry.getCurrentScope().setContext('performance', {
      [contextKey]: value,
    });
  }

  /**
   * Send warning to Sentry (lazy-loaded)
   */
  private async sendWarningToSentry(
    message: string,
    tags: Record<string, string>,
  ): Promise<void> {
    if (!environment.sentryDsn || !environment.production) return;

    const Sentry = await this.getSentry();
    if (!Sentry) return;

    Sentry.captureMessage(message, {
      level: 'warning',
      tags,
    });
  }

  /**
   * Inicializa el monitoreo de performance
   */
  private initMonitoring(): void {
    // Monitorear FPS
    this.monitorFPS();

    // Monitorear Core Web Vitals
    this.monitorWebVitals();

    // Log inicial de device info
    this.logDeviceInfo();
  }

  /**
   * Monitorea FPS en tiempo real
   */
  private monitorFPS(): void {
    const measureFPS = (currentTime: number) => {
      const delta = currentTime - this.lastFrameTime;
      const fps = Math.round(1000 / delta);

      this.lastFrameTime = currentTime;
      this.fpsCounter++;

      // Log cada 60 frames (aprox 1 segundo a 60fps)
      if (this.fpsCounter >= 60) {
        if (fps < 50) {
          console.warn(`⚠️ Low FPS detected: ${fps}fps`);
        }
        this.fpsCounter = 0;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitorea Core Web Vitals
   */
  private monitorWebVitals(): void {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as LargestContentfulPaintEntry[];
          const lastEntry = entries[entries.length - 1];

          const lcp = lastEntry?.renderTime ?? lastEntry?.loadTime ?? 0;
          console.log(`📊 LCP: ${lcp.toFixed(2)}ms`);

          // Send to Sentry as measurement (lazy-loaded)
          void this.sendToSentry('lcp', lcp);

          if (lcp > 2500) {
            console.warn(`⚠️ LCP is above target (2.5s): ${(lcp / 1000).toFixed(2)}s`);
            void this.sendWarningToSentry(`Poor LCP: ${(lcp / 1000).toFixed(2)}s`, {
              metric: 'lcp',
            });
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch {
        // Browser doesn't support LCP
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const fidEntry = entry as FirstInputDelayEntry;
            const fid = fidEntry.processingStart - fidEntry.startTime;
            console.log(`📊 FID: ${fid.toFixed(2)}ms`);

            // Send to Sentry as measurement (lazy-loaded)
            void this.sendToSentry('fid', fid);

            if (fid > 100) {
              console.warn(`⚠️ FID is above target (100ms): ${fid.toFixed(2)}ms`);
              void this.sendWarningToSentry(`Poor FID: ${fid.toFixed(2)}ms`, {
                metric: 'fid',
              });
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch {
        // Browser doesn't support FID
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const clsEntry = entry as LayoutShiftEntry;
            if (!clsEntry.hadRecentInput) {
              clsScore += clsEntry.value;
              console.log(`📊 CLS: ${clsScore.toFixed(4)}`);

              // Send to Sentry as measurement (lazy-loaded)
              void this.sendToSentry('cls', clsScore);

              if (clsScore > 0.1) {
                console.warn(`⚠️ CLS is above target (0.1): ${clsScore.toFixed(4)}`);
                void this.sendWarningToSentry(`Poor CLS: ${clsScore.toFixed(4)}`, {
                  metric: 'cls',
                });
              }
            }
          });
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch {
        // Browser doesn't support CLS
      }
    }
  }

  /**
   * Log información del dispositivo
   */
  private logDeviceInfo(): void {
    const performanceMemory = (performance as PerformanceWithMemory).memory;
    const networkConnection = (navigator as NavigatorWithOptionalConnection).connection;

    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      memory: performanceMemory
        ? {
            used: (performanceMemory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
            total: (performanceMemory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
            limit: (performanceMemory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
          }
        : 'Not available',
      connection: networkConnection
        ? {
            effectiveType: networkConnection.effectiveType,
            downlink: `${networkConnection.downlink} Mbps`,
            rtt: `${networkConnection.rtt} ms`,
          }
        : 'Not available',
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio,
      },
    };

    console.log('📱 Device Info:', info);
  }

  /**
   * Mide el tiempo de una operación
   */
  measureOperation(name: string, operation: () => void | Promise<void>): void {
    const start = performance.now();

    const finish = () => {
      const duration = performance.now() - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);

      // Send to Sentry as measurement (lazy-loaded)
      const metricKey = name.toLowerCase().replace(/\s+/g, '_');
      void this.sendToSentry(metricKey, duration);

      if (duration > 100) {
        console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
        void this.sendWarningToSentry(
          `Slow operation: ${name} took ${duration.toFixed(2)}ms`,
          {
            metric: 'operation_duration',
            operation: name,
          },
        );
      }
    };

    const result = operation();

    if (result instanceof Promise) {
      result.then(finish).catch(finish);
    } else {
      finish();
    }
  }

  /**
   * Obtiene el uso actual de memoria (si está disponible)
   */
  getMemoryUsage(): { used: string; total: string; limit: string } | null {
    const perfWithMemory = performance as PerformanceWithMemory;
    if (perfWithMemory.memory) {
      return {
        used: (perfWithMemory.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: (perfWithMemory.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (perfWithMemory.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
      };
    }
    return null;
  }
}
