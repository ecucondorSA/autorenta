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

interface EnvDefaults {
  production?: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  defaultCurrency?: string;
  paymentsWebhookUrl?: string;
  mapboxAccessToken?: string;
  carLocationsCacheTtlMs?: number;
  carLocationsRefreshMs?: number;
  carLocationsEdgeFunction?: string;
  mercadopagoPublicKey?: string;
  mercadopagoClientId?: string;
  mercadopagoClientSecret?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  appUrl?: string;
  encryptionKey?: string;
  googleAnalyticsMeasurementId?: string;
  enableAnalytics?: boolean;
  distanceConfig?: DistanceConfig;
  docVerifierUrl?: string;
  cloudflareWorkerUrl?: string;
  sentryDsn?: string;
  sentryEnvironment?: string;
  sentryTracesSampleRate?: number;
  googleCalendarId?: string;
  googleCalendarApiKey?: string;
  googleCalendarClientId?: string;
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
  mapboxAccessToken: resolve('NG_APP_MAPBOX_ACCESS_TOKEN', defaults.mapboxAccessToken),
  carLocationsCacheTtlMs: defaults.carLocationsCacheTtlMs ?? 5 * 60 * 1000,
  carLocationsRefreshMs: defaults.carLocationsRefreshMs ?? 60 * 1000,
  carLocationsEdgeFunction: resolve(
    'NG_APP_CAR_LOCATIONS_EDGE_FUNCTION',
    defaults.carLocationsEdgeFunction,
  ),
  mercadopagoPublicKey: resolve('NG_APP_MERCADOPAGO_PUBLIC_KEY', defaults.mercadopagoPublicKey),
  mercadopagoClientId: resolve('NG_APP_MERCADOPAGO_CLIENT_ID', defaults.mercadopagoClientId),
  mercadopagoClientSecret: resolve(
    'NG_APP_MERCADOPAGO_CLIENT_SECRET',
    defaults.mercadopagoClientSecret,
  ),
  paypalClientId: resolve('NG_APP_PAYPAL_CLIENT_ID', defaults.paypalClientId),
  paypalClientSecret: resolve('NG_APP_PAYPAL_CLIENT_SECRET', defaults.paypalClientSecret),
  appUrl: resolve('NG_APP_URL', defaults.appUrl ?? 'http://localhost:4200'),
  encryptionKey: resolve('NG_APP_ENCRYPTION_KEY', defaults.encryptionKey),
  googleAnalyticsMeasurementId: resolve(
    'NG_APP_GA4_MEASUREMENT_ID',
    defaults.googleAnalyticsMeasurementId,
  ),
  enableAnalytics: defaults.enableAnalytics ?? defaults.production ?? false,
  distanceConfig: defaults.distanceConfig ?? defaultDistanceConfig,
  docVerifierUrl: resolve('NG_APP_DOC_VERIFIER_URL', defaults.docVerifierUrl),
  cloudflareWorkerUrl: resolve(
    'NG_APP_CLOUDFLARE_WORKER_URL',
    defaults.cloudflareWorkerUrl ?? 'http://localhost:8787',
  ),
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
});

export type Environment = ReturnType<typeof buildEnvironment>;
