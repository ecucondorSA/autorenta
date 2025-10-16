import { EnvironmentProviders, Injectable, inject, makeEnvironmentProviders } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

type SupabaseLock = <T>(name: string, acquireTimeout: number, fn: () => Promise<T>) => Promise<T>;

const createResilientLock = (): SupabaseLock => {
  const navigatorLocks = (globalThis as any)?.navigator?.locks;
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

      const options: any = { mode: 'exclusive' };
      if (controller) {
        options.signal = controller.signal;
      }

      return await navigatorLocks.request(name, options, async () => fn());
    } catch (error: any) {
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
    if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
      const message =
        'Supabase no está configurado. Define NG_APP_SUPABASE_URL y NG_APP_SUPABASE_ANON_KEY en tu entorno (por ejemplo, .env.development.local).';
      console.error(message, {
        supabaseUrl: environment.supabaseUrl,
        supabaseAnonKey: environment.supabaseAnonKey ? '***' : '',
      });
      throw new Error(message);
    }

    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        lock: createResilientLock(),
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
}

export const injectSupabase = (): SupabaseClient => inject(SupabaseClientService).getClient();
