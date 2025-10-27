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
  backgroundRemovalModelUrl?: string;
  mercadopagoPublicKey?: string;
  mercadopagoClientId?: string;
  mercadopagoClientSecret?: string;
  appUrl?: string;
}

const readEnv = (key: string): string | undefined => {
  // Runtime window-based env (assets/env.js pattern)
  const globalEnv = (globalThis as any)?.__env?.[key];
  if (typeof globalEnv === 'string' && globalEnv.length > 0) {
    return globalEnv;
  }

  // import.meta.env (Angular 17+ builder exposes env vars at build time)
  const metaEnv =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env[key]
      : undefined;
  if (typeof metaEnv === 'string' && metaEnv.length > 0) {
    return metaEnv;
  }

  // process.env (guarded via globalThis) as last resort for SSR/tests
  const nodeEnv = (globalThis as any)?.process?.env?.[key];
  if (typeof nodeEnv === 'string' && nodeEnv.length > 0) {
    return nodeEnv;
  }

  return undefined;
};

const resolve = (key: string, fallback?: string): string => {
  return readEnv(key) ?? fallback ?? '';
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
  backgroundRemovalModelUrl: resolve(
    'NG_APP_BACKGROUND_MODEL_URL',
    defaults.backgroundRemovalModelUrl ??
      'https://huggingface.co/briaai/RMBG-1.4/resolve/main/rmbg-1.4.onnx?download=1',
  ),
  mercadopagoPublicKey: resolve('NG_APP_MERCADOPAGO_PUBLIC_KEY', defaults.mercadopagoPublicKey),
  mercadopagoClientId: resolve('NG_APP_MERCADOPAGO_CLIENT_ID', defaults.mercadopagoClientId),
  mercadopagoClientSecret: resolve(
    'NG_APP_MERCADOPAGO_CLIENT_SECRET',
    defaults.mercadopagoClientSecret,
  ),
  appUrl: resolve('NG_APP_URL', defaults.appUrl ?? 'http://localhost:4200'),
});

export type Environment = ReturnType<typeof buildEnvironment>;
