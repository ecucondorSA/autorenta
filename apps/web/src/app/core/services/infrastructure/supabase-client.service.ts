import { isPlatformBrowser } from '@angular/common';
import {
  EnvironmentProviders,
  inject,
  isDevMode,
  Injectable,
  makeEnvironmentProviders,
  PLATFORM_ID,
} from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { LoggerService } from '@core/services/infrastructure/logger.service';

type SupabaseLock = <T>(name: string, acquireTimeout: number, fn: () => Promise<T>) => Promise<T>;

// Type-safe interfaces for Navigator Locks API
interface NavigatorLockOptions {
  mode: 'exclusive' | 'shared';
  signal?: AbortSignal;
}

interface NavigatorLocks {
  request<T>(name: string, options: NavigatorLockOptions, callback: () => Promise<T>): Promise<T>;
}

interface GlobalWithNavigator {
  navigator?: {
    locks?: NavigatorLocks;
  };
}

const createResilientLock = (): SupabaseLock => {
  const navigatorLocks = (globalThis as unknown as GlobalWithNavigator)?.navigator?.locks;
  if (!navigatorLocks?.request) {
    return async (_name, _acquireTimeout, fn) => fn();
  }

  return async (name, acquireTimeout, fn) => {
    const controller =
      typeof acquireTimeout === 'number' && acquireTimeout > 0 ? new AbortController() : null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      if (controller) {
        timeoutId = setTimeout(() => controller.abort(), acquireTimeout);
      }

      const options: NavigatorLockOptions = { mode: 'exclusive' };
      if (controller) {
        options.signal = controller.signal;
      }

      return await navigatorLocks.request(name, options, async () => fn());
    } catch (error: unknown) {
      const errorObj = error as { name?: string; message?: string };
      if (
        errorObj?.name === 'AbortError' ||
        errorObj?.name === 'NavigatorLockAcquireTimeoutError' ||
        errorObj?.message?.includes('Navigator LockManager')
      ) {
        // Lock timeout - continue without locking
        return fn();
      }
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
};

/**
 * Creates a stub Supabase client for SSR that returns empty results
 * This prevents errors during prerendering while maintaining type safety
 */
function createSSRStubClient(): SupabaseClient {
  // Create a proxy that returns safe stubs for any property access
  const createChainableStub = (): unknown => {
    const stub = new Proxy(() => createChainableStub(), {
      get: (_target, prop) => {
        // Handle common async methods
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined; // Not a promise
        }
        // Return empty data for terminal methods
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => Promise.resolve({ data: null, error: null });
        }
        // Auth state methods
        if (prop === 'getSession' || prop === 'getUser') {
          return () => Promise.resolve({ data: { session: null, user: null }, error: null });
        }
        if (prop === 'onAuthStateChange') {
          return () => ({ data: { subscription: { unsubscribe: () => { } } } });
        }
        // RPC calls
        if (typeof prop === 'string' && prop.startsWith('rpc')) {
          return () => Promise.resolve({ data: null, error: null });
        }
        // Realtime channel
        if (prop === 'subscribe') {
          return () => ({ unsubscribe: () => { } });
        }
        if (prop === 'unsubscribe') {
          return () => { };
        }
        // Default: return chainable stub
        return createChainableStub();
      },
      apply: () => {
        // When called as function, return promise with empty result
        return Promise.resolve({ data: [], error: null, count: 0 });
      },
    });
    return stub;
  };

  return createChainableStub() as unknown as SupabaseClient;
}

function createUnconfiguredBrowserStubClient(message: string): SupabaseClient {
  const createChainableThrower = (): unknown => {
    const thrower = () => {
      throw new Error(message);
    };

    const stub = new Proxy(thrower, {
      get: (_target, prop) => {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined;
        }

        return createChainableThrower();
      },
      apply: () => {
        throw new Error(message);
      },
    });

    return stub;
  };

  return createChainableThrower() as unknown as SupabaseClient;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseClientService {
  private readonly logger = inject(LoggerService);
  private client: SupabaseClient | null = null;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    // SSR-safe: Don't initialize Supabase during server-side rendering
    // The client will be created lazily on first getClient() call in browser
    if (!this.isBrowser) {
      this.logger.debug('[SupabaseClientService] SSR mode - skipping initialization');
      return;
    }
  }

  /**
   * Initialize the Supabase client (only in browser)
   */
  private initializeClient(): void {
    if (this.client) return; // Already initialized

    this.logger.debug('[SupabaseClientService] Initializing...');
    const supabaseUrl = environment.supabaseUrl;
    const supabaseAnonKey = environment.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      const message =
        'Supabase no está configurado. Define NG_APP_SUPABASE_URL y NG_APP_SUPABASE_ANON_KEY en tus variables de entorno (por ejemplo, .env.development.local).';
      throw new Error(message);
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        lock: createResilientLock(),
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        // Force bypass Service Worker cache for all API calls
        // This prevents stale 404 responses from being cached (P0 fix for wallet_lock_funds)
        fetch: (url, options = {}) => {
          const fetchOptions: RequestInit = {
            ...options,
            cache: 'no-store', // Never use HTTP cache
          };
          // Add cache-busting headers for critical RPC calls
          const urlStr = typeof url === 'string' ? url : url.toString();
          if (urlStr.includes('/rpc/wallet_') || urlStr.includes('/rpc/payment_') || urlStr.includes('/rpc/booking_')) {
            // FIX: Headers object is not spreadable - convert to plain object first
            // Without this, Authorization header is lost causing 401 errors
            const existingHeaders = options.headers instanceof Headers
              ? Object.fromEntries(options.headers.entries())
              : (options.headers || {});

            fetchOptions.headers = {
              ...existingHeaders,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            };
          }
          return fetch(url, fetchOptions);
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  static forRoot(): EnvironmentProviders {
    return makeEnvironmentProviders([
      {
        provide: SupabaseClientService,
        useFactory: () => new SupabaseClientService(),
      },
    ]);
  }

  /**
   * Get the Supabase client instance
   * Returns a stub client during SSR that safely returns empty results
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      if (!this.isBrowser) {
        // Return stub client during SSR instead of throwing
        return createSSRStubClient();
      }
      // Lazy init if not done yet
      this.initializeClient();
    }
    return this.client!;
  }

  /**
   * Check if Supabase is available (only true in browser)
   */
  isAvailable(): boolean {
    return this.isBrowser && this.client !== null;
  }

  /**
   * Get client or null (SSR-safe alternative to getClient())
   */
  getClientOrNull(): SupabaseClient | null {
    if (!this.isBrowser) return null;

    if (this.client) return this.client;

    const supabaseUrl = environment.supabaseUrl;
    const supabaseAnonKey = environment.supabaseAnonKey;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    try {
      this.initializeClient();
      return this.client;
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    const client = this.getClientOrNull();
    if (!client) return false;
    try {
      const { error } = await client.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  getConnectionInfo(): { url: string; pooling: string } {
    return {
      url: environment.supabaseUrl || 'hardcoded',
      pooling: 'transaction',
    };
  }
}

/**
 * Inject Supabase client - SSR-safe
 * Returns a stub client during SSR that returns empty results
 * Returns the real client in browser
 */
export const injectSupabase = (): SupabaseClient => {
  const service = inject(SupabaseClientService) as unknown as {
    getClient?: () => SupabaseClient;
    getClientOrNull?: () => SupabaseClient | null;
    client?: SupabaseClient | null;
  };
  const platformId = inject(PLATFORM_ID);

  // During SSR, return a stub client that doesn't throw
  if (!isPlatformBrowser(platformId)) {
    return createSSRStubClient();
  }

  // Browser: prefer a non-throwing lookup first.
  if (typeof service.getClientOrNull === 'function') {
    const client = service.getClientOrNull();
    if (client) return client;
  }

  // Tolerate test doubles that only expose `client`.
  if (service.client) return service.client;

  // Fall back to `getClient()` (may throw if env isn't configured).
  if (typeof service.getClient === 'function') {
    try {
      return service.getClient();
    } catch (error) {
      // In dev/test we prefer a lazy throwing proxy so services can be constructed
      // without requiring env vars or a fully mocked Supabase client.
      if (isDevMode()) {
        return createUnconfiguredBrowserStubClient(
          'Supabase no está configurado (o no fue mockeado en tests). Define NG_APP_SUPABASE_URL y NG_APP_SUPABASE_ANON_KEY, o provee un mock de SupabaseClientService en el spec.',
        );
      }
      throw error;
    }
  }

  if (isDevMode()) {
    return createUnconfiguredBrowserStubClient(
      'Supabase client is not available (missing provider or mock in tests).',
    );
  }

  throw new Error('Supabase client is not available');
};
