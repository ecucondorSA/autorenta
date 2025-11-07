import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

// Initialize Sentry (only if enabled and DSN is configured)
if (environment.enableSentry && environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment.production ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay
    replaysSessionSampleRate: environment.production ? 0.1 : 0.0, // 10% in prod, 0% in dev
    replaysOnErrorSampleRate: 1.0, // Always capture replay on error
    // Before sending, sanitize sensitive data
    beforeSend(event, hint) {
      // Filter out sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            const sanitized = { ...breadcrumb.data };
            // Remove sensitive fields
            const sensitiveKeys = ['password', 'token', 'authorization', 'api_key', 'apiKey'];
            sensitiveKeys.forEach((key) => {
              if (key in sanitized) {
                sanitized[key] = '[REDACTED]';
              }
            });
            return { ...breadcrumb, data: sanitized };
          }
          return breadcrumb;
        });
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
  // Report bootstrap failures to Sentry
  if (environment.enableSentry && environment.sentryDsn) {
    Sentry.captureException(err);
  }
});
