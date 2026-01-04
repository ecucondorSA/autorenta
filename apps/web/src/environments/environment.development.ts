import { buildEnvironment } from './environment.base';

/**
 * Development Environment Configuration
 *
 * ⚠️ SECURITY: NO hardcodear secrets en este archivo
 *
 * Secrets se leen de variables de entorno:
 * - NG_APP_SUPABASE_ANON_KEY
 * - NG_APP_MAPBOX_ACCESS_TOKEN
 * - NG_APP_PAYPAL_CLIENT_ID
 *
 * Setup:
 * 1. Copiar .env.local.example a .env.local
 * 2. Llenar con tus credenciales reales
 * 3. NUNCA commitear .env.local (está en .gitignore)
 *
 * Ver: CLAUDE.md para instrucciones completas
 */
export const environment = buildEnvironment({
  production: false,
  defaultCurrency: 'ARS',
  appUrl: 'http://localhost:4200',
  cloudflareWorkerUrl: 'http://localhost:8788',
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ1MzE2MDAsImV4cCI6MjAyMDExMTYwMH0.vO-T3Z...',
  mapboxAccessToken:
    'pk.eyJ1IjoicGhpbGxpcGNsYXJrIiwiYSI6ImNscW51enR3cTBqOWMybG8wZ2h1amxyeHoifQ.1D6wH_ePZ2n3M0t7mH01gQ',
  tripoApiKey: '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',
  googleAnalyticsMeasurementId: '',
  enableAnalytics: false,
  docVerifierUrl: 'https://obxvffplochgeiclibng.supabase.co/functions/v1',
  googleGeolocationApiKey: 'AIzaSyD9VrprbZaNVWrY5CThI2mHpp_SuriWRHY',
  // Logging: debug level shows all logs in development
  logLevel: 'debug' as const,
});
