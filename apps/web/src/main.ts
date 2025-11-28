import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import {
  bootstrapApplication,
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { initSentry } from './app/core/services/sentry.service';

// Initialize Sentry before bootstrapping (production only)
initSentry();

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideAnimations(),
    provideClientHydration(withEventReplay()),
  ],
}).catch((err) => {
  console.error('Bootstrap failed', err);
});
