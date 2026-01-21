interface DistanceConfig {
  localThresholdKm: number;
  regionalThresholdKm: number;
  guaranteeMultipliers: {
    local: number;
    regional: number;
    longDistance: number;
  };
  deliveryFeePerKm: number;
  minDistanceForDeliveryFee: number;
  maxDeliveryDistance: number;
  defaultSearchRadiusKm: number;
  maxSearchRadiusKm: number;
}

interface TikTokConfig {
  clientId?: string;
}

interface GoogleOneTapConfig {
  clientId?: string;
  autoSelect?: boolean;
  cancelOnTapOutside?: boolean;
}

/**
 * Log levels for configurable logging
 * - 'debug': All logs (debug, info, warn, error, critical)
 * - 'info': Info and above (info, warn, error, critical)
 * - 'warn': Warnings and above (warn, error, critical)
 * - 'error': Errors and above (error, critical)
 * - 'silent': No console logs (still sends to Sentry)
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface EnvDefaults {
  production?: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  defaultCurrency?: string;
  tripoApiKey?: string;
  paymentsWebhookUrl?: string;
  mapboxAccessToken?: string;
  carLocationsCacheTtlMs?: number;
  carLocationsRefreshMs?: number;
  carLocationsEdgeFunction?: string;
  mercadopagoPublicKey?: string;
  mercadopagoClientId?: string;
  // P0-027 FIX: CLIENT_SECRET removed - must NEVER be in frontend
  // mercadopagoClientSecret is handled by backend Edge Functions only
  paypalClientId?: string;
  // P0-027 FIX: PayPal secret removed - must NEVER be in frontend
  // paypalClientSecret is handled by backend Edge Functions only
  appUrl?: string;
  encryptionKey?: string;
  googleAnalyticsMeasurementId?: string;
  enableAnalytics?: boolean;
  distanceConfig?: DistanceConfig;
  docVerifierUrl?: string;
  cloudflareWorkerUrl?: string;
  pdfWorkerUrl?: string;
  geminiTextWorkerUrl?: string;
  googleAiImageUrl?: string;
  sentryDsn?: string;
  sentryEnvironment?: string;
  sentryTracesSampleRate?: number;
  googleCalendarId?: string;
  googleCalendarApiKey?: string;
  googleCalendarClientId?: string;
  googleGeolocationApiKey?: string;
  tiktok?: TikTokConfig;
  googleOneTap?: GoogleOneTapConfig;
  // GCP Video Damage Detection
  videoIngestionUrl?: string;
  gcpProjectId?: string;
  gcpBucketName?: string;
  // Logging configuration
  logLevel?: LogLevel;
}

// Type-safe interfaces for global environment access
interface GlobalWithEnv {
  __env?: Record<string, string | undefined>;
  process?: {
    env?: Record<string, string | undefined>;
  };
}

interface ImportMetaWithEnv {
  env?: Record<string, string | undefined>;
}

const readEnv = (key: string): string | undefined => {
  // Runtime window-based env (assets/env.js pattern)
  const globalEnv = (globalThis as unknown as GlobalWithEnv)?.__env?.[key];
  if (typeof globalEnv === 'string' && globalEnv.length > 0) {
    return globalEnv;
  }

  // import.meta.env (Angular 17+ builder exposes env vars at build time)
  const metaEnv =
    typeof import.meta !== 'undefined' && (import.meta as unknown as ImportMetaWithEnv).env
      ? (import.meta as unknown as ImportMetaWithEnv).env?.[key]
      : undefined;
  if (typeof metaEnv === 'string' && metaEnv.length > 0) {
    return metaEnv;
  }

  // process.env (guarded via globalThis) as last resort for SSR/tests
  const nodeEnv = (globalThis as unknown as GlobalWithEnv)?.process?.env?.[key];
  if (typeof nodeEnv === 'string' && nodeEnv.length > 0) {
    return nodeEnv;
  }

  return undefined;
};

const resolve = (key: string, fallback?: string): string => {
  return readEnv(key) ?? fallback ?? '';
};

const defaultDistanceConfig: DistanceConfig = {
  localThresholdKm: 20,
  regionalThresholdKm: 100,
  guaranteeMultipliers: {
    local: 1.0,
    regional: 1.15,
    longDistance: 1.3,
  },
  deliveryFeePerKm: 0, // DESHABILITADO - delivery gratis
  minDistanceForDeliveryFee: 5,
  maxDeliveryDistance: 50,
  defaultSearchRadiusKm: 50,
  maxSearchRadiusKm: 100,
};

export const buildEnvironment = (defaults: EnvDefaults) => ({
  production: defaults.production ?? false,
  supabaseUrl: resolve('NG_APP_SUPABASE_URL', defaults.supabaseUrl),
  supabaseAnonKey: resolve('NG_APP_SUPABASE_ANON_KEY', defaults.supabaseAnonKey),
  defaultCurrency: resolve('NG_APP_DEFAULT_CURRENCY', defaults.defaultCurrency ?? 'USD'),
  paymentsWebhookUrl: resolve('NG_APP_PAYMENTS_WEBHOOK_URL', defaults.paymentsWebhookUrl ?? ''),
  // Read from env var first, then fallback to defaults
  mapboxAccessToken: resolve('NG_APP_MAPBOX_ACCESS_TOKEN', defaults.mapboxAccessToken),
  carLocationsCacheTtlMs: defaults.carLocationsCacheTtlMs ?? 5 * 60 * 1000,
  carLocationsRefreshMs: defaults.carLocationsRefreshMs ?? 60 * 1000,
  carLocationsEdgeFunction: resolve(
    'NG_APP_CAR_LOCATIONS_EDGE_FUNCTION',
    defaults.carLocationsEdgeFunction,
  ),
  tripoApiKey: resolve('NG_APP_TRIPO_API_KEY', defaults.tripoApiKey),
  mercadopagoPublicKey: resolve('NG_APP_MERCADOPAGO_PUBLIC_KEY', defaults.mercadopagoPublicKey),
  mercadopagoClientId: resolve('NG_APP_MERCADOPAGO_CLIENT_ID', defaults.mercadopagoClientId),
  // P0-027 FIX: Secrets removed from frontend - handled by backend only
  paypalClientId: resolve('NG_APP_PAYPAL_CLIENT_ID', defaults.paypalClientId),
  appUrl: resolve('NG_APP_URL', defaults.appUrl ?? 'http://localhost:4200'),
  encryptionKey: resolve('NG_APP_ENCRYPTION_KEY', defaults.encryptionKey),
  googleAnalyticsMeasurementId: resolve(
    'NG_APP_GA4_MEASUREMENT_ID',
    defaults.googleAnalyticsMeasurementId,
  ),
  enableAnalytics: defaults.enableAnalytics ?? defaults.production ?? false,
  distanceConfig: defaults.distanceConfig ?? defaultDistanceConfig,
  docVerifierUrl: resolve('NG_APP_DOC_VERIFIER_URL', defaults.docVerifierUrl),
  cloudflareWorkerUrl: resolve('NG_APP_CLOUDFLARE_WORKER_URL', defaults.cloudflareWorkerUrl ?? ''),
  pdfWorkerUrl: resolve('NG_APP_PDF_WORKER_URL', defaults.pdfWorkerUrl ?? ''),
  geminiTextWorkerUrl: resolve('NG_APP_GEMINI_TEXT_WORKER_URL', defaults.geminiTextWorkerUrl ?? ''),
  googleAiImageUrl: resolve('NG_APP_GOOGLE_AI_IMAGE_URL', defaults.googleAiImageUrl),
  sentryDsn: resolve('NG_APP_SENTRY_DSN', defaults.sentryDsn),
  sentryEnvironment: resolve(
    'NG_APP_SENTRY_ENVIRONMENT',
    defaults.sentryEnvironment ?? (defaults.production ? 'production' : 'development'),
  ),
  sentryTracesSampleRate: defaults.sentryTracesSampleRate ?? (defaults.production ? 0.1 : 1.0),
  googleCalendarId: resolve('NG_APP_GOOGLE_CALENDAR_ID', defaults.googleCalendarId),
  googleCalendarApiKey: resolve('NG_APP_GOOGLE_CALENDAR_API_KEY', defaults.googleCalendarApiKey),
  googleCalendarClientId: resolve(
    'NG_APP_GOOGLE_CALENDAR_CLIENT_ID',
    defaults.googleCalendarClientId,
  ),
  googleGeolocationApiKey: resolve(
    'NG_APP_GOOGLE_GEOLOCATION_API_KEY',
    defaults.googleGeolocationApiKey,
  ),
  tiktok: {
    clientId: resolve('NG_APP_TIKTOK_CLIENT_ID', defaults.tiktok?.clientId),
  },
  googleOneTap: {
    clientId: resolve('NG_APP_GOOGLE_ONE_TAP_CLIENT_ID', defaults.googleOneTap?.clientId),
    autoSelect: defaults.googleOneTap?.autoSelect ?? true,
    cancelOnTapOutside: defaults.googleOneTap?.cancelOnTapOutside ?? true,
  },
  // GCP Video Damage Detection
  videoIngestionUrl: resolve('NG_APP_VIDEO_INGESTION_URL', defaults.videoIngestionUrl ?? ''),
  gcpProjectId: resolve('NG_APP_GCP_PROJECT_ID', defaults.gcpProjectId ?? 'autorenta-prod'),
  gcpBucketName: resolve(
    'NG_APP_GCP_BUCKET_NAME',
    defaults.gcpBucketName ?? 'autorenta-inspection-videos',
  ),
  // Logging configuration - configurable via env var
  logLevel: (resolve('NG_APP_LOG_LEVEL', defaults.logLevel) ||
    (defaults.production ? 'warn' : 'debug')) as LogLevel,
});

export type Environment = ReturnType<typeof buildEnvironment>;
