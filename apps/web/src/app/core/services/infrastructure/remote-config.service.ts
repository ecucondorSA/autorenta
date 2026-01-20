import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { LoggerService } from './logger.service';

/**
 * Remote Config Service
 *
 * Permite cambiar configuración de la app en tiempo real sin deploy.
 * Los valores se cargan desde Supabase y se cachean localmente.
 *
 * @example
 * ```typescript
 * const maxDays = this.remoteConfig.get('MAX_BOOKING_DAYS', 30);
 * const commission = this.remoteConfig.getNumber('OWNER_COMMISSION_RATE', 0.15);
 * ```
 */

interface ConfigItem {
  key: string;
  value: unknown;
  category: string;
}

interface RemoteConfigState {
  config: Record<string, unknown>;
  lastFetch: number;
  isLoading: boolean;
  error: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const STORAGE_KEY = 'autorentar_remote_config';

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  // Estado reactivo
  private readonly state = signal<RemoteConfigState>({
    config: this.loadFromStorage(),
    lastFetch: 0,
    isLoading: false,
    error: null,
  });

  // Selectores públicos
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);
  readonly config = computed(() => this.state().config);

  constructor() {
    // Cargar config al iniciar
    this.fetchConfig();
  }

  /**
   * Obtiene un valor de configuración
   */
  get<T>(key: string, defaultValue: T): T {
    const value = this.state().config[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }

    // Intentar parsear JSON si es string
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    }

    return value as T;
  }

  /**
   * Obtiene un valor numérico
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Obtiene un valor booleano
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key, defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }

  /**
   * Obtiene un valor string
   */
  getString(key: string, defaultValue: string): string {
    const value = this.get(key, defaultValue);
    return String(value);
  }

  /**
   * Obtiene un array
   */
  getArray<T>(key: string, defaultValue: T[]): T[] {
    const value = this.get(key, defaultValue);
    if (Array.isArray(value)) return value;
    return defaultValue;
  }

  /**
   * Obtiene valores por categoría
   */
  getByCategory(category: string): Record<string, unknown> {
    const allConfig = this.state().config;
    const result: Record<string, unknown> = {};

    // Nota: esto requiere que guardemos la categoría en el valor
    // Por ahora retorna todas las configs
    return allConfig;
  }

  /**
   * Fuerza recarga de configuración
   */
  async refresh(): Promise<void> {
    await this.fetchConfig(true);
  }

  /**
   * Carga configuración desde Supabase
   */
  private async fetchConfig(force = false): Promise<void> {
    const now = Date.now();
    const { lastFetch, isLoading } = this.state();

    // Evitar fetch si ya está cargando o cache es válido
    if (isLoading) return;
    if (!force && lastFetch > 0 && now - lastFetch < CACHE_TTL_MS) return;

    this.state.update((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const { data, error } = await this.supabase.rpc('get_app_config', {
        p_environment: 'production',
      });

      if (error) throw error;

      const config: Record<string, unknown> = {};
      for (const item of data as ConfigItem[]) {
        config[item.key] = item.value;
      }

      this.state.update((s) => ({
        ...s,
        config,
        lastFetch: now,
        isLoading: false,
      }));

      // Persistir en localStorage
      this.saveToStorage(config);

      this.logger.debug('RemoteConfig loaded', { count: Object.keys(config).length });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('RemoteConfig fetch failed', { error: errorMsg });

      this.state.update((s) => ({
        ...s,
        isLoading: false,
        error: errorMsg,
      }));
    }
  }

  /**
   * Carga config desde localStorage (fallback offline)
   */
  private loadFromStorage(): Record<string, unknown> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignorar errores de parsing
    }
    return {};
  }

  /**
   * Guarda config en localStorage
   */
  private saveToStorage(config: Record<string, unknown>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignorar errores de storage lleno
    }
  }
}
