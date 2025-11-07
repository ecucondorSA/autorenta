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
    tracesSampleRate: environment.production ? 0.1 : 1.0,
    // Security: Only send errors in production, all in development
    enabled: true,
    // Capture breadcrumbs for better debugging
    maxBreadcrumbs: 50,
    // Add user context for support
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true, // Mask all text for PII protection
        blockAllMedia: true, // Block all media for privacy
      }),
    ],
    // Security: Attachments for additional context (errors, console logs)
    attachStacktrace: true,
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
