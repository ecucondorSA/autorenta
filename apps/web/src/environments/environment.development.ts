import { buildEnvironment } from './environment.base';

/**
 * Development Environment Configuration
 *
 * ⚠️ SECURITY: NO hardcodear secrets en este archivo
 *
 * Secrets se leen de variables de entorno:
 * - NG_APP_SUPABASE_URL
 * - NG_APP_SUPABASE_ANON_KEY
 * - NG_APP_MAPBOX_ACCESS_TOKEN
 * - NG_APP_TRIPO_API_KEY
 * - NG_APP_GOOGLE_GEOLOCATION_API_KEY
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
  // Keys se leen de .env.local via NG_APP_* variables
  // NO hardcodear valores aquí - usar .env.local
  supabaseUrl: '', // NG_APP_SUPABASE_URL
  supabaseAnonKey: '', // NG_APP_SUPABASE_ANON_KEY
  mapboxAccessToken: '', // NG_APP_MAPBOX_ACCESS_TOKEN
  tripoApiKey: '', // NG_APP_TRIPO_API_KEY
  googleAnalyticsMeasurementId: '',
  enableAnalytics: false,
  docVerifierUrl: '', // NG_APP_DOC_VERIFIER_URL (se construye desde supabaseUrl)
  pdfWorkerUrl: '', // NG_APP_PDF_WORKER_URL
  googleGeolocationApiKey: '', // NG_APP_GOOGLE_GEOLOCATION_API_KEY
  enableTikTok: false,
  enableFacebook: false,
  // Logging: debug level shows all logs in development
  logLevel: 'debug' as const,
});
