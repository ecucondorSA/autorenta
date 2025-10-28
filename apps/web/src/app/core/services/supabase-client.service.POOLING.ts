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

/**
 * SupabaseClientService con Connection Pooling habilitado
 *
 * MEJORAS IMPLEMENTADAS:
 * 1. Connection Pooling via 'x-supabase-pooling-mode' header
 * 2. Configuración de realtime optimizada
 * 3. Retry logic para resiliencia
 * 4. Logging mejorado
 */
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
        'Supabase no está configurado. Define NG_APP_SUPABASE_URL y NG_APP_SUPABASE_ANON_KEY en tu entorno (por ejemplo, .env.development.local).';
      console.error(message, {
        supabaseUrl,
        supabaseAnonKey: supabaseAnonKey ? '***' : '',
      });
      throw new Error(message);
    }

    // Log para debug en producción
    console.log('🔍 [SUPABASE CLIENT] Inicializando con URL:', supabaseUrl);
    console.log('🔌 [SUPABASE CLIENT] Connection Pooling: HABILITADO (transaction mode)');

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        lock: createResilientLock(),
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          // ⚡ HABILITAR CONNECTION POOLING
          // Transaction mode: cada query obtiene una conexión del pool
          // Mejor para queries cortos y APIs REST
          'x-supabase-pooling-mode': 'transaction',
        },
        // Configurar fetch con retry
        fetch: this.createFetchWithRetry(),
      },
      realtime: {
        params: {
          // Limitar eventos realtime para no saturar cliente
          eventsPerSecond: 10,
        },
      },
    });

    console.log('✅ [SUPABASE CLIENT] Inicializado correctamente con pooling');
  }

  /**
   * Crear fetch con retry logic para resiliencia
   */
  private createFetchWithRetry() {
    return async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
      const maxRetries = 3;
      const retryDelay = 1000; // 1 segundo

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, options);

          // Si es 5xx o timeout, reintentar
          if (response.status >= 500 && attempt < maxRetries) {
            console.warn(
              `⚠️ [SUPABASE CLIENT] Error ${response.status}, reintentando... (${attempt}/${maxRetries})`,
            );
            await this.sleep(retryDelay * attempt);
            continue;
          }

          return response;
        } catch (error) {
          if (attempt === maxRetries) {
            console.error('❌ [SUPABASE CLIENT] Error después de todos los reintentos:', error);
            throw error;
          }

          console.warn(
            `⚠️ [SUPABASE CLIENT] Error de red, reintentando... (${attempt}/${maxRetries})`,
            error,
          );
          await this.sleep(retryDelay * attempt);
        }
      }

      throw new Error('Max retries reached');
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  /**
   * Verificar estado de conexión
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('users').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error('❌ [SUPABASE CLIENT] Health check failed:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de conexión (solo para debug)
   */
  getConnectionInfo(): { url: string; pooling: string } {
    return {
      url: environment.supabaseUrl || 'hardcoded',
      pooling: 'transaction',
    };
  }
}

export const injectSupabase = (): SupabaseClient => inject(SupabaseClientService).getClient();
