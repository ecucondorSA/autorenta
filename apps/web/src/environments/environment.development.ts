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
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4',
  mapboxAccessToken:
    'pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaXltdHhqMDBoNGQzZXEwNW9idDBhMDUifQ.rY_vmPzdGQiUksrSMuXrhg',
  tripoApiKey: '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',
  googleAnalyticsMeasurementId: '',
  enableAnalytics: false,
  docVerifierUrl: 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1',
  pdfWorkerUrl: 'https://autorent-pdf-generator.marques-eduardo95466020.workers.dev',
  googleGeolocationApiKey: 'AIzaSyD9VrprbZaNVWrY5CThI2mHpp_SuriWRHY',
  // Logging: debug level shows all logs in development
  logLevel: 'debug' as const,
});
