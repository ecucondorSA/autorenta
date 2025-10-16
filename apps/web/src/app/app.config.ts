import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { routes } from './app.routes';
import { SupabaseAuthInterceptor } from './core/interceptors/supabase-auth.interceptor';
import { SupabaseClientService } from './core/services/supabase-client.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    provideHttpClient(withInterceptors([SupabaseAuthInterceptor])),
    SupabaseClientService.forRoot(),
    { provide: LOCALE_ID, useValue: 'es-AR' },
  ],
};
