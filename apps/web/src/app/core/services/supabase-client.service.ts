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
      if (
        error?.name === 'AbortError' ||
        error?.name === 'NavigatorLockAcquireTimeoutError' ||
        error?.message?.includes('Navigator LockManager')
      ) {
        console.warn(
          `No se pudo obtener el lock de autenticación (${name}). Continuando sin locking.`,
          error,
        );
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
    // HARDCODED URL FIX para resolver "Failed to fetch" en producción
    const SUPABASE_URL_HARDCODED = 'https://obxvffplochgeiclibng.supabase.co';
    const SUPABASE_ANON_KEY_HARDCODED =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU';

    // Usar valores hardcodeados como fallback si environment no está configurado
    const supabaseUrl = environment.supabaseUrl || SUPABASE_URL_HARDCODED;
    const supabaseAnonKey = environment.supabaseAnonKey || SUPABASE_ANON_KEY_HARDCODED;

    if (!supabaseUrl || !supabaseAnonKey) {
      const message =
        'Supabase no está configurado. Define NG_APP_SUPABASE_URL y NG_APP_SUPABASE_ANON_KEY en tu entorno (por ejemplo, .env.development.local).';
      console.error(message, {
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey ? '***' : '',
      });
      throw new Error(message);
    }

    // Log para debug en producción
    console.log('🔍 [SUPABASE CLIENT] Inicializando con URL:', supabaseUrl);
    console.log('🔌 [SUPABASE CLIENT] Connection Pooling: Configurado en connection string');

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
      console.error('❌ [SUPABASE CLIENT] Health check failed:', error);
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
