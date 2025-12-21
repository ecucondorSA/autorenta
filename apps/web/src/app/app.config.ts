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
  provideZonelessChangeDetection,
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
import { routes } from './app.routes';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { httpCacheInterceptor } from './core/interceptors/http-cache.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { SupabaseAuthInterceptor } from './core/interceptors/supabase-auth.interceptor';
import { DebugService } from './core/services/debug.service';
import { LoggerService } from './core/services/logger.service';
import { GlobalErrorHandler } from './core/services/global-error-handler';
import { PerformanceMonitoringService } from './core/services/performance-monitoring.service';
import { SupabaseClientService } from './core/services/supabase-client.service';
import { routeReuseStrategyProvider } from './core/strategies/custom-route-reuse.strategy';

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

  // Only apply transformations to known providers
  if (!src.includes('unsplash.com') && !src.includes('images.unsplash.com')) {
    return src;
  }

  try {
    const url = new URL(src);
    const width = config.width ?? 800;

    url.searchParams.set('w', String(width));
    if (!url.searchParams.has('q')) url.searchParams.set('q', '80');
    if (!url.searchParams.has('auto')) url.searchParams.set('auto', 'format');
    if (!url.searchParams.has('fit')) url.searchParams.set('fit', 'crop');

    return url.toString();
  } catch {
    return src;
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: IMAGE_LOADER, useValue: autorentaImageLoader },
    // ✅ Zoneless Change Detection - removes Zone.js (~35KB savings)
    // Works with Angular 20+ and Ionic 8+ (signals-based)
    provideZonelessChangeDetection(),
    provideIonicAngular({ mode: 'md' }),
    provideRouter(
      routes,
      // Cambiamos a NoPreloading para reducir descarga inicial en móvil; prefetch selectivo se puede habilitar con quicklink
      withPreloading(NoPreloading),
      // Note: withEnabledBlockingInitialNavigation removed - can cause SSR timeout
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // ✅ Native-like Page Transitions
      withViewTransitions(),
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

    provideServiceWorker('ngsw-worker.js', {
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
      })
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
