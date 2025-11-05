import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: true,
  defaultCurrency: 'ARS',
  appUrl: 'https://autorentar.com',
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU',
  mapboxAccessToken: 'pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtZ3R0bjQ2dDA4Znkyd3B5ejkzNDFrb3IifQ.WwgMG-oIfT_9BDvwAT3nUg',
  googleAnalyticsMeasurementId: '', // Configurar via NG_APP_GA4_MEASUREMENT_ID
  enableAnalytics: true,
});
