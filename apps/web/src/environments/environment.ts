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
  docVerifierUrl: 'https://doc-verifier.autorentar.workers.dev',
  // Sentry Configuration
  // IMPORTANTE: Configurar via variables de entorno en Cloudflare Pages
  // NG_APP_SENTRY_DSN - Sentry Project DSN
  sentryDsn: '', // Se configura via NG_APP_SENTRY_DSN
  sentryEnvironment: 'production',
  sentryTracesSampleRate: 0.1, // 10% sampling for performance monitoring
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
      local: 1.0,       // Sin recargo para autos cercanos
      regional: 1.15,   // +15% para distancia media
      longDistance: 1.3 // +30% para larga distancia
    },

    // Configuración de delivery/entrega
    deliveryFeePerKm: 0,          // ARS por km - DESHABILITADO (delivery gratis)
    minDistanceForDeliveryFee: 5, // km - no cobrar delivery si es < 5km
    maxDeliveryDistance: 50,      // km - distancia máxima para entrega

    // Radio de búsqueda por defecto
    defaultSearchRadiusKm: 50,
    maxSearchRadiusKm: 100
  }
});
