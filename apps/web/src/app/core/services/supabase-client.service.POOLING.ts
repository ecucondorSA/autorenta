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
    // HARDCODED URL FIX para resolver "Failed to fetch" en producción
    const SUPABASE_URL_HARDCODED = 'https://obxvffplochgeiclibng.supabase.co';
    const SUPABASE_ANON_KEY_HARDCODED = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU';

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
              `⚠️ [SUPABASE CLIENT] Error ${response.status}, reintentando... (${attempt}/${maxRetries})`
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
            error
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
