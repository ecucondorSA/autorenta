import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: true,
  defaultCurrency: 'ARS',
  appUrl: 'https://autorentar.com',
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  // P0-027 FIX: API keys MUST be loaded from environment variables in production
  // Configure these in Cloudflare Pages settings:
  // - NG_APP_SUPABASE_ANON_KEY
  // - NG_APP_MAPBOX_ACCESS_TOKEN
  supabaseAnonKey: undefined, // Will be read from NG_APP_SUPABASE_ANON_KEY
  mapboxAccessToken: undefined, // Will be read from NG_APP_MAPBOX_ACCESS_TOKEN
  tripoApiKey: undefined, // Will be read from NG_APP_TRIPO_API_KEY
  googleAnalyticsMeasurementId: 'G-WV2PWTKG2E', // Google Analytics 4
  enableAnalytics: true,
  docVerifierUrl: 'https://doc-verifier.autorentar.workers.dev',
  // Google AI Image Generation (Gemini)
  // IMPORTANTE: Configurar via variable de entorno en Cloudflare Pages
  // NG_APP_GOOGLE_AI_IMAGE_URL - Endpoint completo de Gemini (incluye ?key=... si aplica)
  googleAiImageUrl: undefined,
  // Google Geolocation API (fallback when GPS fails)
  // IMPORTANTE: Configurar via variable de entorno en Cloudflare Pages
  // NG_APP_GOOGLE_GEOLOCATION_API_KEY - API Key de Google Cloud Console (Geolocation API)
  googleGeolocationApiKey: undefined, // Se configura via NG_APP_GOOGLE_GEOLOCATION_API_KEY
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
  // P0-027 FIX: Only public client ID - secret is backend-only
  paypalClientId: '', // Se configura via NG_APP_PAYPAL_CLIENT_ID

  // GCP Video Damage Detection (Vertex AI + Cloud Run)
  // IMPORTANTE: Configurar via variables de entorno en Cloudflare Pages después de desplegar GCP
  // NG_APP_VIDEO_INGESTION_URL - URL del Cloud Run service video-ingestion-service
  // NG_APP_GCP_PROJECT_ID - Project ID de GCP (autorenta-prod)
  // NG_APP_GCP_BUCKET_NAME - Nombre del bucket de Cloud Storage para videos
  videoIngestionUrl: '', // Se configura via NG_APP_VIDEO_INGESTION_URL (ej: https://video-ingestion-service-XXXXX-uc.a.run.app)
  gcpProjectId: 'autorenta-prod',
  gcpBucketName: 'autorenta-inspection-videos',
  // Logging: warn level in production (only warn, error, critical)
  // Configurable via NG_APP_LOG_LEVEL env var
  logLevel: 'warn' as const,
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
