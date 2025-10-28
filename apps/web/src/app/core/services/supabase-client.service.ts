import { EnvironmentProviders, Injectable, inject, makeEnvironmentProviders } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

type SupabaseLock = <T>(name: string, acquireTimeout: number, fn: () => Promise<T>) => Promise<T>;

// Type-safe interfaces for Navigator Locks API
interface NavigatorLockOptions {
  mode: 'exclusive' | 'shared';
  signal?: AbortSignal;
}

interface NavigatorLocks {
  request<T>(
    name: string,
    options: NavigatorLockOptions,
    callback: () => Promise<T>,
  ): Promise<T>;
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

@Injectable({
  providedIn: 'root',
})
export class SupabaseClientService {
  private readonly client: SupabaseClient;

  constructor() {
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
      },
      db: {
        schema: 'public',
      },
      // ⚠️ REMOVED: global pooling header causes CORS errors with Edge Functions
      // Pooling should be handled by Supabase connection string configuration instead
      realtime: {
        params: {
          // Limitar eventos realtime para no saturar cliente
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

  getClient(): SupabaseClient {
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('profiles').select('id').limit(1);
      return !error;
    } catch (error) {
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

export const injectSupabase = (): SupabaseClient => inject(SupabaseClientService).getClient();
