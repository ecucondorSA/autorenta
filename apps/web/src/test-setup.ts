/**
 * Global test setup file for Vitest
 *
 * NOTE: Angular service tests that require TestBed should use `ng test` (Karma/Jasmine)
 * Vitest is used for pure unit tests (utils, helpers, pure functions)
 */

// Configure Supabase environment variables for tests
// These are required by SupabaseClientService to initialize without errors
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['__env'] = {
    NG_APP_SUPABASE_URL: 'https://test.supabase.co',
    NG_APP_SUPABASE_ANON_KEY: 'test-anon-key-for-unit-tests',
    NG_APP_DEFAULT_CURRENCY: 'ARS',
    NG_APP_MAPBOX_ACCESS_TOKEN: 'pk.test.mapbox.token',
  };

  // Also set on globalThis for environment.ts access
  (globalThis as unknown as Record<string, unknown>)['__env'] = (
    window as unknown as Record<string, unknown>
  )['__env'];
}

console.log('[test-setup] Configured Vitest environment (pure unit tests)');
