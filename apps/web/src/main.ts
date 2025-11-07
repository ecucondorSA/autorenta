import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

// Initialize Sentry for error tracking and performance monitoring
if (environment.production && environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.sentryEnvironment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment.sentryTracesSampleRate,
    // Session Replay
    replaysSessionSampleRate: environment.sentryReplaysSessionSampleRate,
    replaysOnErrorSampleRate: environment.sentryReplaysOnErrorSampleRate,
    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send events with sensitive paths
      if (event.request?.url) {
        const sensitivePatterns = ['/api/auth/', '/wallet/', '/payment/'];
        if (sensitivePatterns.some((pattern) => event.request?.url?.includes(pattern))) {
          // Redact URL params
          if (event.request.url) {
            event.request.url = event.request.url.split('?')[0];
          }
        }
      }
      return event;
    },
  });
}

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [...(appConfig.providers ?? []), provideAnimations()],
}).catch((err) => {
  console.error('Bootstrap failed', err);
  if (environment.production && environment.sentryDsn) {
    Sentry.captureException(err);
  }
});
