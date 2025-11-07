import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

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
  providedIn: 'root'
})
export class PerformanceMonitoringService {
  private fpsCounter = 0;
  private lastFrameTime = performance.now();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initMonitoring();
    }
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
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;

          const lcp = lastEntry.renderTime || lastEntry.loadTime;
          console.log(`📊 LCP: ${lcp.toFixed(2)}ms`);

          // Send to Sentry as measurement
          if (environment.sentryDsn) {
            Sentry.getCurrentScope().setMeasurement('lcp', lcp, 'millisecond');
          }

          if (lcp > 2500) {
            console.warn(`⚠️ LCP is above target (2.5s): ${(lcp/1000).toFixed(2)}s`);

            // Send warning to Sentry
            if (environment.sentryDsn && environment.production) {
              Sentry.captureMessage(`Poor LCP: ${(lcp/1000).toFixed(2)}s`, {
                level: 'warning',
                tags: { metric: 'lcp' },
              });
            }
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (_e) {
        // Browser doesn't support LCP
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: unknown) => {
            const fid = (entry as any).processingStart - (entry as any).startTime;
            console.log(`📊 FID: ${fid.toFixed(2)}ms`);

            // Send to Sentry as measurement
            if (environment.sentryDsn) {
              Sentry.getCurrentScope().setMeasurement('fid', fid, 'millisecond');
            }

            if (fid > 100) {
              console.warn(`⚠️ FID is above target (100ms): ${fid.toFixed(2)}ms`);

              // Send warning to Sentry
              if (environment.sentryDsn && environment.production) {
                Sentry.captureMessage(`Poor FID: ${fid.toFixed(2)}ms`, {
                  level: 'warning',
                  tags: { metric: 'fid' },
                });
              }
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (_e) {
        // Browser doesn't support FID
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: unknown) => {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
              console.log(`📊 CLS: ${clsScore.toFixed(4)}`);

              // Send to Sentry as measurement
              if (environment.sentryDsn) {
                Sentry.getCurrentScope().setMeasurement('cls', clsScore, 'none');
              }

              if (clsScore > 0.1) {
                console.warn(`⚠️ CLS is above target (0.1): ${clsScore.toFixed(4)}`);

                // Send warning to Sentry
                if (environment.sentryDsn && environment.production) {
                  Sentry.captureMessage(`Poor CLS: ${clsScore.toFixed(4)}`, {
                    level: 'warning',
                    tags: { metric: 'cls' },
                  });
                }
              }
            }
          });
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (_e) {
        // Browser doesn't support CLS
      }
    }
  }

  /**
   * Log información del dispositivo
   */
  private logDeviceInfo(): void {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      memory: (performance as any).memory ? {
        used: ((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: ((performance as any).memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: ((performance as any).memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      } : 'Not available',
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink + ' Mbps',
        rtt: (navigator as any).connection.rtt + ' ms'
      } : 'Not available',
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio
      }
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

      // Send to Sentry as measurement
      if (environment.sentryDsn) {
        Sentry.getCurrentScope().setMeasurement(
          name.toLowerCase().replace(/\s+/g, '_'),
          duration,
          'millisecond'
        );
      }

      if (duration > 100) {
        console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);

        // Send warning to Sentry
        if (environment.sentryDsn && environment.production) {
          Sentry.captureMessage(`Slow operation: ${name} took ${duration.toFixed(2)}ms`, {
            level: 'warning',
            tags: {
              metric: 'operation_duration',
              operation: name,
            },
          });
        }
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
    if ((performance as any).memory) {
      return {
        used: ((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: ((performance as any).memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: ((performance as any).memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      };
    }
    return null;
  }
}
