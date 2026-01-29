/**
 * Global test setup file
 * This file is loaded before all tests to configure the test environment
 */

// Configure Supabase environment variables for tests
// These are required by SupabaseClientService to initialize without errors
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

// Mock environment for SupabaseClientService
// The service checks these values in environment.ts which reads from __env
console.log('[test-setup] Configured Supabase test environment');
