import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  isDevMode,
  LOCALE_ID,
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
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { MessageService } from 'primeng/api';
import { routes } from './app.routes';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { httpCacheInterceptor } from './core/interceptors/http-cache.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { SupabaseAuthInterceptor } from './core/interceptors/supabase-auth.interceptor';
import { GlobalErrorHandler } from './core/services/global-error-handler';
import { PerformanceMonitoringService } from './core/services/performance-monitoring.service';
import { SupabaseClientService } from './core/services/supabase-client.service';

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
    provideRouter(
      routes,
      // Cambiamos a NoPreloading para reducir descarga inicial en móvil; prefetch selectivo se puede habilitar con quicklink
      withPreloading(NoPreloading),
      withEnabledBlockingInitialNavigation(),
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
    importProvidersFrom(TranslateModule.forRoot()),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
    // ✅ PrimeNG MessageService for notifications
    MessageService,
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
