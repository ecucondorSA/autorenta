import {
  ApplicationConfig,
  LOCALE_ID,
  importProvidersFrom,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { SupabaseAuthInterceptor } from './core/interceptors/supabase-auth.interceptor';
import { SupabaseClientService } from './core/services/supabase-client.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    provideHttpClient(withInterceptors([SupabaseAuthInterceptor])),
    provideAnimationsAsync(),
    provideIonicAngular({
      mode: 'md',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    SupabaseClientService.forRoot(),
    { provide: LOCALE_ID, useValue: 'es-AR' },
    importProvidersFrom(TranslateModule.forRoot()),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json',
    }),
  ],
};
