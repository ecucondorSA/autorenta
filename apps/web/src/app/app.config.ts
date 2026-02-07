import { IMAGE_LOADER, type ImageLoaderConfig, isPlatformBrowser } from '@angular/common';
import { HttpClient, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  inject,
  isDevMode,
  LOCALE_ID,
  PLATFORM_ID,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  NoPreloading,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { authRefreshInterceptor } from '@core/interceptors/auth-refresh.interceptor';
import { httpCacheInterceptor } from '@core/interceptors/http-cache.interceptor';
import { httpErrorInterceptor } from '@core/interceptors/http-error.interceptor';
import { SupabaseAuthInterceptor } from '@core/interceptors/supabase-auth.interceptor';
import { DebugService } from '@core/services/admin/debug.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { GlobalErrorHandler } from '@core/services/infrastructure/global-error-handler';
import { PerformanceMonitoringService } from '@core/services/infrastructure/performance-monitoring.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { routeReuseStrategyProvider } from '@core/strategies/custom-route-reuse.strategy';
import { routes } from './app.routes';

/**
 * Inicializa el servicio de monitoreo de performance
 * Solo en development mode
 */
function initializePerformanceMonitoring(
  _perfService: PerformanceMonitoringService,
  logger: LoggerService,
) {
  return () => {
    if (isDevMode()) {
      logger.debug('Performance Monitoring initialized', 'AppConfig');
    }
  };
}

/**
 * Inicializa el DebugService para e2e tests
 * Expone window.__AR_DEBUG__ para acceso desde tests
 * Nota: Llamamos exposeForE2E() explícitamente porque con SSR+hydration
 * el constructor puede ejecutarse en el servidor donde window no existe
 */
function initializeDebugService(debugService: DebugService) {
  return () => {
    // Solo exponer en el cliente (browser)
    if (typeof window !== 'undefined') {
      debugService.exposeForE2E();
    }
  };
}

function autorentaImageLoader(config: ImageLoaderConfig): string {
  const src = config.src;

  // Local assets (and most relative URLs) should remain unchanged
  if (!src || src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  const width = config.width ?? 800;

  // Supabase Storage Transformation support
  // Project: aceacpaockyxgogxsfyc.supabase.co (production)
  // Supabase Storage Transformation support
  // Project: aceacpaockyxgogxsfyc.supabase.co (production)
  // DISABLE FOR NOW: Render API returning 403 Forbidden
  /*
  if (src.includes('aceacpaockyxgogxsfyc.supabase.co/storage/v1/object/public/') ||
      src.includes('pisqjmoklivzpwufhscx.supabase.co/storage/v1/object/public/')) {
    try {
      // Convert /object/public/ to /render/image/public/
      const transformedSrc = src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      const url = new URL(transformedSrc);
      
      url.searchParams.set('width', String(width));
      url.searchParams.set('quality', '75'); // Slightly more aggressive compression
      // format=origin lets Supabase auto-select WebP/AVIF based on browser support
      if (!url.searchParams.has('format')) url.searchParams.set('format', 'origin');
      
      return url.toString();
    } catch {
      return src;
    }
  }
  */

  // Unsplash Optimization
  if (src.includes('unsplash.com') || src.includes('images.unsplash.com')) {
    try {
      const url = new URL(src);
      url.searchParams.set('w', String(width));
      if (!url.searchParams.has('q')) url.searchParams.set('q', '75');
      if (!url.searchParams.has('auto')) url.searchParams.set('auto', 'format');
      if (!url.searchParams.has('fit')) url.searchParams.set('fit', 'crop');
      return url.toString();
    } catch {
      return src;
    }
  }

  return src;
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: IMAGE_LOADER, useValue: autorentaImageLoader },
    // ✅ Zoneless Change Detection - removes Zone.js (~35KB savings)
    // Works with Angular 20+ and Ionic 8+ (signals-based)
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular({ mode: 'md' }),
    provideRouter(
      routes,
      // Cambiamos a NoPreloading para reducir descarga inicial en móvil; prefetch selectivo se puede habilitar con quicklink
      withPreloading(NoPreloading),
      // Note: withEnabledBlockingInitialNavigation removed - can cause SSR timeout
      withInMemoryScrolling({
        // Disabled: scroll restoration targets window, but our app scrolls in #app-scroller div.
        // Scroll-to-top on navigation is handled manually in AppComponent.
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'enabled',
      }),
      // ✅ Native-like Page Transitions (with error handling for unsupported browsers)
      withViewTransitions({
        skipInitialTransition: true, // Avoid issues during initial load
        onViewTransitionCreated: ({ transition }) => {
          // Gracefully handle transition errors
          transition.finished.catch(() => {
            // Silently ignore transition errors (API not supported or DOM changed)
          });
        },
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        SupabaseAuthInterceptor,
        authRefreshInterceptor,
        httpCacheInterceptor, // ✅ P1-021: HTTP caching
        httpErrorInterceptor,
      ]),
    ),
    // ✅ Async Animations - better initial load performance than standard animations
    provideAnimationsAsync(),

    provideServiceWorker('ngsw-worker.js?v=20260130-reset', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    SupabaseClientService.forRoot(),
    { provide: LOCALE_ID, useValue: 'es-AR' },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: () => {
            const http = inject(HttpClient);
            const platformId = inject(PLATFORM_ID);
            const isBrowser = isPlatformBrowser(platformId);

            return {
              getTranslation: (lang: string) => {
                // During SSR, return empty translations to avoid HTTP timeout
                if (!isBrowser) {
                  return of({});
                }
                // In browser, load translations via HTTP
                return http.get(`./assets/i18n/${lang}.json`);
              },
            };
          },
        },
        // Use fallbackLang instead of deprecated defaultLanguage
        fallbackLang: 'es',
      }),
    ),
    // ✅ Route Reuse Strategy - keeps Marketplace & Map in memory for instant navigation
    routeReuseStrategyProvider,
    // ✅ Global Error Handler (handles Sentry internally)
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // ✅ Performance Monitoring (solo en desarrollo)
    isDevMode()
      ? {
        provide: APP_INITIALIZER,
        useFactory: initializePerformanceMonitoring,
        deps: [PerformanceMonitoringService, LoggerService],
        multi: true,
      }
      : [],
    // ✅ Debug Service initialization (para e2e tests)
    // Siempre inicializar para exponer window.__AR_DEBUG__
    {
      provide: APP_INITIALIZER,
      useFactory: initializeDebugService,
      deps: [DebugService],
      multi: true,
    },
  ],
};
