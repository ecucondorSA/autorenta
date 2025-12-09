import { isPlatformBrowser } from '@angular/common';
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
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  NoPreloading,
  provideRouter,
  withEnabledBlockingInitialNavigation,
  withInMemoryScrolling,
  withPreloading,
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
import { GlobalErrorHandler } from './core/services/global-error-handler';
import { PerformanceMonitoringService } from './core/services/performance-monitoring.service';
import { SupabaseClientService } from './core/services/supabase-client.service';
import { routeReuseStrategyProvider } from './core/strategies/custom-route-reuse.strategy';

/**
 * Inicializa el servicio de monitoreo de performance
 * Solo en development mode
 */
function initializePerformanceMonitoring(_perfService: PerformanceMonitoringService) {
  return () => {
    if (isDevMode()) {
      console.log('📊 Performance Monitoring initialized');
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
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
    provideNoopAnimations(),

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
        defaultLanguage: 'es',
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
          deps: [PerformanceMonitoringService],
          multi: true,
        }
      : [],
  ],
};
