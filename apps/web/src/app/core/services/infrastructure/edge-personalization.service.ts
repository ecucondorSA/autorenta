import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoggerService } from './logger.service';

/**
 * Edge Personalization Service
 *
 * Consume la API del Cloudflare Worker para obtener:
 * - Geolocalización del usuario
 * - Variantes de A/B test asignadas
 * - Configuración regional
 *
 * Los datos se obtienen del edge (CDN) con latencia mínima (<50ms)
 *
 * @example
 * ```typescript
 * // Obtener país del usuario
 * const country = this.edge.geoData().country; // 'AR', 'BR', etc.
 *
 * // Obtener variante de A/B test
 * const variant = this.edge.getVariant('HERO_EXPERIMENT'); // 'control' | 'variant_a'
 *
 * // Obtener moneda por geolocalización
 * const currency = this.edge.geoData().currency; // 'ARS', 'BRL'
 * ```
 */

export interface GeoData {
  country: string;
  city: string;
  region: string;
  timezone: string;
  currency: string;
  locale: string;
  latitude?: number;
  longitude?: number;
}

export interface AbVariants {
  userId: string;
  variants: Record<string, string>;
}

export interface RegionalConfig {
  currency: string;
  locale: string;
  defaultSearchRadius: number;
  paymentMethods: string[];
  features: Record<string, boolean>;
}

interface EdgeState {
  geoData: GeoData | null;
  abVariants: Record<string, string>;
  regionalConfig: RegionalConfig | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY_GEO = 'autorentar_geo';
const STORAGE_KEY_AB = 'autorentar_ab';
const EDGE_API_BASE = '/edge-api';

// Defaults para cuando el edge no está disponible
const DEFAULT_GEO: GeoData = {
  country: 'AR',
  city: 'Buenos Aires',
  region: 'Buenos Aires',
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  locale: 'es-AR',
};

@Injectable({ providedIn: 'root' })
export class EdgePersonalizationService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  // Estado reactivo
  private readonly state = signal<EdgeState>({
    geoData: this.loadGeoFromStorage(),
    abVariants: this.loadAbFromStorage(),
    regionalConfig: null,
    userId: null,
    isLoading: false,
    error: null,
  });

  // Selectores públicos
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);
  readonly geoData = computed(() => this.state().geoData ?? DEFAULT_GEO);
  readonly abVariants = computed(() => this.state().abVariants);
  readonly regionalConfig = computed(() => this.state().regionalConfig);
  readonly userId = computed(() => this.state().userId);

  // Accesos directos
  readonly country = computed(() => this.geoData().country);
  readonly currency = computed(() => this.geoData().currency);
  readonly locale = computed(() => this.geoData().locale);
  readonly timezone = computed(() => this.geoData().timezone);

  constructor() {
    // Inicializar datos del edge
    this.initialize();
  }

  /**
   * Inicializa los datos del edge
   */
  async initialize(): Promise<void> {
    this.state.update((s) => ({ ...s, isLoading: true }));

    try {
      // Cargar geo y A/B en paralelo
      await Promise.all([this.fetchGeoData(), this.fetchAbVariants()]);

      // Cargar config regional basada en geo
      await this.fetchRegionalConfig();

      this.logger.debug('Edge personalization initialized', {
        country: this.geoData().country,
        variants: Object.keys(this.abVariants()).length,
      });
    } catch (err) {
      this.logger.warn('Edge personalization init failed, using defaults', { error: err });
    } finally {
      this.state.update((s) => ({ ...s, isLoading: false }));
    }
  }

  /**
   * Obtiene la variante asignada para un A/B test
   */
  getVariant(testName: string): string | undefined {
    return this.state().abVariants[testName];
  }

  /**
   * Verifica si el usuario está en una variante específica
   */
  isVariant(testName: string, variant: string): boolean {
    return this.getVariant(testName) === variant;
  }

  /**
   * Verifica si una feature regional está habilitada
   */
  isFeatureEnabled(featureName: string): boolean {
    const config = this.state().regionalConfig;
    return config?.features[featureName] ?? false;
  }

  /**
   * Obtiene métodos de pago disponibles para la región
   */
  getPaymentMethods(): string[] {
    return this.state().regionalConfig?.paymentMethods ?? ['card'];
  }

  /**
   * Tracking de evento en edge
   */
  async trackEvent(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      // Fire and forget
      this.http
        .post(`${EDGE_API_BASE}/track`, { type, data })
        .subscribe({
          error: () => {}, // Ignorar errores de tracking
        });
    } catch {
      // Ignorar
    }
  }

  /**
   * Fuerza recarga de datos del edge
   */
  async refresh(): Promise<void> {
    await this.initialize();
  }

  /**
   * Obtiene datos de geolocalización desde el edge
   */
  private async fetchGeoData(): Promise<void> {
    try {
      // Primero intentar desde headers (si el worker los inyectó)
      const geoFromHeaders = this.getGeoFromHeaders();
      if (geoFromHeaders) {
        this.state.update((s) => ({ ...s, geoData: geoFromHeaders }));
        this.saveGeoToStorage(geoFromHeaders);
        return;
      }

      // Si no hay headers, llamar al endpoint
      const response = await fetch(`${EDGE_API_BASE}/geo`);
      if (!response.ok) throw new Error('Geo fetch failed');

      const geoData = (await response.json()) as GeoData;
      this.state.update((s) => ({ ...s, geoData }));
      this.saveGeoToStorage(geoData);
    } catch {
      // Usar datos cacheados o defaults
      const cached = this.loadGeoFromStorage();
      if (!cached) {
        this.state.update((s) => ({ ...s, geoData: DEFAULT_GEO }));
      }
    }
  }

  /**
   * Intenta obtener geo de headers inyectados por el worker
   */
  private getGeoFromHeaders(): GeoData | null {
    // Los headers solo están disponibles en respuestas, no en el cliente
    // Este método es un placeholder para cuando se use SSR o middleware
    return null;
  }

  /**
   * Obtiene variantes de A/B test desde el edge
   */
  private async fetchAbVariants(): Promise<void> {
    try {
      const response = await fetch(`${EDGE_API_BASE}/ab-variants`, {
        credentials: 'include', // Para enviar cookies
      });

      if (!response.ok) throw new Error('AB variants fetch failed');

      const data = (await response.json()) as AbVariants;

      this.state.update((s) => ({
        ...s,
        abVariants: data.variants,
        userId: data.userId,
      }));

      this.saveAbToStorage(data.variants);
    } catch {
      // Usar datos cacheados
    }
  }

  /**
   * Obtiene configuración regional
   */
  private async fetchRegionalConfig(): Promise<void> {
    try {
      const response = await fetch(`${EDGE_API_BASE}/config`);
      if (!response.ok) throw new Error('Config fetch failed');

      const config = (await response.json()) as RegionalConfig;
      this.state.update((s) => ({ ...s, regionalConfig: config }));
    } catch {
      // Usar defaults
    }
  }

  // Storage helpers
  private loadGeoFromStorage(): GeoData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GEO);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveGeoToStorage(data: GeoData): void {
    try {
      localStorage.setItem(STORAGE_KEY_GEO, JSON.stringify(data));
    } catch {
      // Ignorar
    }
  }

  private loadAbFromStorage(): Record<string, string> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AB);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveAbToStorage(variants: Record<string, string>): void {
    try {
      localStorage.setItem(STORAGE_KEY_AB, JSON.stringify(variants));
    } catch {
      // Ignorar
    }
  }
}
