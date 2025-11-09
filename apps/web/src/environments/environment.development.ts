import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: false,
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU',
  defaultCurrency: 'ARS',
  mapboxAccessToken:
    'pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtZ3R0bjQ2dDA4Znkyd3B5ejkzNDFrb3IifQ.WwgMG-oIfT_9BDvwAT3nUg',
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments',
  appUrl: 'http://localhost:4200',
  // PayPal Sandbox Credentials
  // TODO: Reemplazar con tus credenciales de PayPal Sandbox
  // Obtener en: https://developer.paypal.com/dashboard/applications/sandbox
  paypalClientId:
    'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R',
  paypalClientSecret: '', // No se necesita en frontend (solo para backend)
  // Sentry Configuration
  // TODO: Replace with actual Sentry DSN from https://sentry.io/settings/projects/
  sentryDsn: '', // Empty in development - set NG_APP_SENTRY_DSN to test
  sentryEnvironment: 'development',
  sentryTracesSampleRate: 0.1, // 10% of transactions for performance monitoring
});
