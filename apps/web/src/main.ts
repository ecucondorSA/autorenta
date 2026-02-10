import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { setAppInjector } from '@core/utils/platform.utils';
import {
  clearChunkRetryFlag,
  installGlobalChunkErrorHandler,
} from '@core/utils/chunk-error-recovery';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

// Global fallback: catch chunk/module load errors that escape the Angular router.
// Covers both synchronous errors (window.error) and async rejections (unhandledrejection).
// After a deploy, stale chunk filenames no longer exist on Cloudflare; the SPA
// fallback serves 404.html (text/html) instead of JS, causing MIME type errors.
installGlobalChunkErrorHandler();

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...(appConfig.providers ?? []), provideAnimations()],
})
  .then((appRef) => {
    // Bootstrap succeeded — clear any pending chunk retry flag
    clearChunkRetryFlag();

    // Set injector for platform utilities (enables afterNextRender in non-DI contexts)
    setAppInjector(appRef.injector);

    // Initialize Eruda for mobile debugging in development
    if (!environment.production) {
      import('eruda').then((eruda) => eruda.default.init());
    }

    // Lazy-load Sentry initialization (saves ~238KB from initial bundle)
    // Sentry doesn't need to block app startup - it can initialize async
    void import('@core/services/infrastructure/sentry.service').then(({ initSentry }) =>
      initSentry(),
    );
  })
  .catch((err) => {
    console.error('Bootstrap failed', err);
  });
