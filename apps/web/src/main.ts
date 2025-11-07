import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

registerLocaleData(localeEsAr);

// Initialize Sentry for error tracking and security monitoring
// CRITICAL: Required for issue #112 - Security Hardening Epic
if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    // Security: Sample only 10% of traces in production to reduce noise
    tracesSampleRate: environment.production ? 0.1 : 1.0,
    // Enabled by default (respects DSN presence)
    enabled: true,
    // Capture breadcrumbs for better debugging context
    maxBreadcrumbs: 50,
    // Security: Attach stack traces for better error context
    attachStacktrace: true,
    // Denylist to prevent PII from being captured
    denyUrls: [
      /health/i,
      /metrics/i,
      /analytics/i,
    ],
  });
}

const bootstrap = () =>
  bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [...(appConfig.providers ?? []), provideAnimations()],
  });

if (environment.production) {
  // In production, use Sentry for error handling
  bootstrap().catch((err) => {
    Sentry.captureException(err);
    console.error('Bootstrap failed', err);
  });
} else {
  // In development, log to console
  bootstrap().catch((err) => console.error('Bootstrap failed', err));
}
