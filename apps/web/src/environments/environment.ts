import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: true,
  defaultCurrency: 'ARS',
  appUrl: 'https://autorentar.com',
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4',
  mapboxAccessToken:
    'pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaHlrYXV1cTA5amYyanB5OGU4MHRtbnkifQ.Xd0d1Cu0LPw75_UbvZj2vQ',
  googleAnalyticsMeasurementId: '', // Configurar via NG_APP_GA4_MEASUREMENT_ID
  enableAnalytics: true,
  docVerifierUrl: 'https://doc-verifier.autorentar.workers.dev',
  // Sentry Configuration
  // IMPORTANTE: Configurar via variables de entorno en Cloudflare Pages
  // NG_APP_SENTRY_DSN - Sentry Project DSN
  sentryDsn: '', // Se configura via NG_APP_SENTRY_DSN
  sentryEnvironment: 'production',
  sentryTracesSampleRate: 0.1, // 10% sampling for performance monitoring
  // Google Calendar Configuration
  // IMPORTANTE: Configurar via variables de entorno en Cloudflare Pages
  // NG_APP_GOOGLE_CALENDAR_ID - ID del calendario de Google (email o calendar ID)
  // NG_APP_GOOGLE_CALENDAR_API_KEY - API Key de Google Cloud Console
  // NG_APP_GOOGLE_CALENDAR_CLIENT_ID - OAuth Client ID (opcional, para escritura/calendarios privados)
  googleCalendarId: '', // Se configura via NG_APP_GOOGLE_CALENDAR_ID
  googleCalendarApiKey: '', // Se configura via NG_APP_GOOGLE_CALENDAR_API_KEY
  googleCalendarClientId: '', // Se configura via NG_APP_GOOGLE_CALENDAR_CLIENT_ID
  // TikTok OAuth Configuration
  // IMPORTANTE: Configurar via variables de entorno en Cloudflare Pages
  // NG_APP_TIKTOK_CLIENT_ID - Client ID de TikTok Developer
  tiktok: {
    clientId: '', // Se configura via NG_APP_TIKTOK_CLIENT_ID
  },
  // PayPal Production Credentials
  // IMPORTANTE: Configurar via variables de entorno en Cloudflare Pages
  // NG_APP_PAYPAL_CLIENT_ID - Client ID de PayPal Production
  paypalClientId: '', // Se configura via NG_APP_PAYPAL_CLIENT_ID
  paypalClientSecret: '', // No se usa en frontend
  distanceConfig: {
    // Umbrales de tiers (km)
    localThresholdKm: 20,
    regionalThresholdKm: 100,

    // Multiplicadores de garantía por distancia
    guaranteeMultipliers: {
      local: 1.0, // Sin recargo para autos cercanos
      regional: 1.15, // +15% para distancia media
      longDistance: 1.3, // +30% para larga distancia
    },

    // Configuración de delivery/entrega
    deliveryFeePerKm: 0, // ARS por km - DESHABILITADO (delivery gratis)
    minDistanceForDeliveryFee: 5, // km - no cobrar delivery si es < 5km
    maxDeliveryDistance: 50, // km - distancia máxima para entrega

    // Radio de búsqueda por defecto
    defaultSearchRadiusKm: 50,
    maxSearchRadiusKm: 100,
  },
});
