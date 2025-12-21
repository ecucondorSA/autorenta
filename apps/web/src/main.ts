import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Lazy-load Sentry initialization (saves ~238KB from initial bundle)
// Sentry doesn't need to block app startup - it can initialize async
void import('@core/services/infrastructure/sentry.service').then(({ initSentry }) => initSentry());

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [ ...(appConfig.providers ?? []), provideAnimations() ],
}).catch((err) => {
  console.error('Bootstrap failed', err);
});
