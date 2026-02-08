import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { setAppInjector } from '@core/utils/platform.utils';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...(appConfig.providers ?? []), provideAnimations()],
})
  .then((appRef) => {
    // Set injector for platform utilities (enables afterNextRender in non-DI contexts)
    setAppInjector(appRef.injector);

    // Initialize Eruda for mobile debugging in development
    if (!environment.production) {
      import('eruda').then((eruda) => eruda.default.init());
    }

    // Lazy-load Sentry initialization (saves ~238KB from initial bundle)
    // Sentry doesn't need to block app startup - it can initialize async
    void import('@core/services/infrastructure/sentry.service').then(({ initSentry }) =>
      initSentry()
    );
  })
  .catch((err) => {
    console.error('Bootstrap failed', err);
  });
