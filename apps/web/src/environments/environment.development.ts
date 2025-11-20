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
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  // ✅ Secrets se leen de .env.local (NO hardcodeados)
  supabaseAnonKey: undefined, // Lee de NG_APP_SUPABASE_ANON_KEY
  defaultCurrency: 'ARS',
  mapboxAccessToken: undefined, // Lee de NG_APP_MAPBOX_ACCESS_TOKEN
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments',
  appUrl: 'http://localhost:4200',
  // PayPal Sandbox Credentials
  paypalClientId: undefined, // Lee de NG_APP_PAYPAL_CLIENT_ID
  paypalClientSecret: '', // No se necesita en frontend
  // Sentry Configuration
  sentryDsn: '', // Opcional: NG_APP_SENTRY_DSN
  sentryEnvironment: 'development',
  sentryTracesSampleRate: 0.1,
  // Google Calendar Configuration
  // IMPORTANTE: Configurar via variables de entorno
  // NG_APP_GOOGLE_CALENDAR_ID - ID del calendario (email o calendar ID)
  // NG_APP_GOOGLE_CALENDAR_API_KEY - API Key de Google Cloud Console
  // NG_APP_GOOGLE_CALENDAR_CLIENT_ID - OAuth Client ID (opcional, para escritura/calendarios privados)
  googleCalendarId: undefined, // Lee de NG_APP_GOOGLE_CALENDAR_ID
  googleCalendarApiKey: undefined, // Lee de NG_APP_GOOGLE_CALENDAR_API_KEY
  googleCalendarClientId: undefined, // Lee de NG_APP_GOOGLE_CALENDAR_CLIENT_ID
  // TikTok OAuth Configuration
  tiktok: {
    clientId: undefined, // Lee de NG_APP_TIKTOK_CLIENT_ID
  },
});
