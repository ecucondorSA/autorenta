import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { initSentry } from './app/core/services/sentry.service';

// Initialize Sentry before bootstrapping (production only)
initSentry();

registerLocaleData(localeEsAr);

// Initialize Sentry error tracking
if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.sentryEnvironment,
    integrations: [
      // Performance monitoring
      Sentry.browserTracingIntegration(),
      // Replay for debugging (only in production)
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment.sentryTracesSampleRate,
    // Session Replay (10% in production)
    replaysSessionSampleRate: environment.production ? 0.1 : 0,
    // Replay 100% of sessions with errors
    replaysOnErrorSampleRate: 1.0,
    // Release tracking
    release: 'autorenta-web@0.1.0',
    // Enable debug mode in development
    debug: !environment.production,
    // Custom tags
    initialScope: {
      tags: {
        service: 'web',
        platform: 'angular',
      },
    },
  });
  console.log('✅ Sentry initialized:', environment.sentryEnvironment);
} else {
  console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
}

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...(appConfig.providers ?? []), provideAnimations()],
}).catch((err) => console.error('Bootstrap failed', err));
