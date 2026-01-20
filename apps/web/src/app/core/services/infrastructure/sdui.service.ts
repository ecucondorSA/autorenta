import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { LoggerService } from './logger.service';
import { RemoteConfigService } from './remote-config.service';

/**
 * Server-Driven UI Service
 *
 * Permite que el backend controle la estructura de la UI dinámicamente.
 * El servidor envía una especificación JSON de componentes a renderizar.
 *
 * @example
 * ```typescript
 * // Obtener layout de homepage
 * const layout = await this.sdui.getLayout('homepage');
 *
 * // En template:
 * @for (component of layout.components; track component.id) {
 *   <app-sdui-renderer [config]="component" />
 * }
 * ```
 */

// Tipos de componentes SDUI soportados
export type SDUIComponentType =
  | 'hero_banner'
  | 'car_carousel'
  | 'category_grid'
  | 'promo_card'
  | 'search_bar'
  | 'testimonials'
  | 'cta_banner'
  | 'feature_list'
  | 'countdown_timer'
  | 'video_player'
  | 'map_preview'
  | 'stats_counter'
  | 'faq_accordion'
  | 'newsletter_signup'
  | 'social_proof'
  | 'custom_html';

export interface SDUIComponent {
  id: string;
  type: SDUIComponentType;
  props: Record<string, unknown>;
  style?: Record<string, string>;
  visibility?: {
    startDate?: string;
    endDate?: string;
    countries?: string[];
    userSegments?: string[];
    featureFlag?: string;
  };
  analytics?: {
    trackView?: boolean;
    trackClick?: boolean;
    eventName?: string;
  };
  children?: SDUIComponent[];
}

export interface SDUILayout {
  id: string;
  name: string;
  version: number;
  components: SDUIComponent[];
  metadata?: {
    title?: string;
    description?: string;
    lastModified?: string;
  };
}

export interface SDUIPage {
  pageId: string;
  layout: SDUILayout;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

@Injectable({ providedIn: 'root' })
export class SDUIService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly remoteConfig = inject(RemoteConfigService);

  // Cache de layouts
  private readonly layoutCache = signal<Map<string, SDUIPage>>(new Map());
  private readonly isLoading = signal(false);

  // Estado público
  readonly loading = computed(() => this.isLoading());

  /**
   * Obtiene el layout de una página
   */
  async getLayout(pageId: string, forceRefresh = false): Promise<SDUILayout | null> {
    try {
      // Verificar cache
      const cached = this.layoutCache().get(pageId);
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.layout;
      }

      this.isLoading.set(true);

      const { data, error } = await this.supabase
        .from('sdui_layouts')
        .select('*')
        .eq('page_id', pageId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Si no hay layout, retornar default
        if (error.code === 'PGRST116') {
          return this.getDefaultLayout(pageId);
        }
        throw error;
      }

      const layout: SDUILayout = {
        id: data.id,
        name: data.name,
        version: data.version,
        components: data.components as SDUIComponent[],
        metadata: data.metadata as SDUILayout['metadata'],
      };

      // Filtrar componentes por visibilidad
      layout.components = await this.filterByVisibility(layout.components);

      // Guardar en cache
      this.layoutCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(pageId, { pageId, layout, fetchedAt: Date.now() });
        return newCache;
      });

      this.logger.debug('SDUI layout loaded', { pageId, version: layout.version });
      return layout;
    } catch (err) {
      this.logger.error('Failed to load SDUI layout', { pageId, error: err });
      return this.getDefaultLayout(pageId);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Filtra componentes por reglas de visibilidad
   */
  private async filterByVisibility(components: SDUIComponent[]): Promise<SDUIComponent[]> {
    const now = new Date();
    const userCountry = this.remoteConfig.getString('USER_COUNTRY', 'BR');

    return components.filter((component) => {
      const vis = component.visibility;
      if (!vis) return true;

      // Verificar fechas
      if (vis.startDate && new Date(vis.startDate) > now) return false;
      if (vis.endDate && new Date(vis.endDate) < now) return false;

      // Verificar país
      if (vis.countries && vis.countries.length > 0) {
        if (!vis.countries.includes(userCountry)) return false;
      }

      // Feature flag se verifica en el renderer

      return true;
    });
  }

  /**
   * Layout por defecto cuando no hay configuración en BD
   */
  private getDefaultLayout(pageId: string): SDUILayout {
    const defaults: Record<string, SDUILayout> = {
      homepage: {
        id: 'default-homepage',
        name: 'Default Homepage',
        version: 1,
        components: [
          {
            id: 'hero-1',
            type: 'hero_banner',
            props: {
              title: 'Alquila el auto perfecto',
              subtitle: 'Miles de autos te esperan en tu ciudad',
              backgroundImage: '/assets/images/hero-bg.jpg',
              ctaText: 'Buscar autos',
              ctaLink: '/marketplace',
            },
          },
          {
            id: 'search-1',
            type: 'search_bar',
            props: {
              placeholder: '¿A dónde vas?',
              showDatePicker: true,
            },
          },
          {
            id: 'carousel-popular',
            type: 'car_carousel',
            props: {
              title: 'Autos populares',
              source: 'popular',
              limit: 10,
            },
          },
          {
            id: 'categories-1',
            type: 'category_grid',
            props: {
              title: 'Explora por categoría',
              categories: ['sedan', 'suv', 'hatchback', 'pickup', 'luxury'],
            },
          },
          {
            id: 'testimonials-1',
            type: 'testimonials',
            props: {
              title: 'Lo que dicen nuestros usuarios',
              limit: 3,
            },
          },
        ],
      },
      'car-detail': {
        id: 'default-car-detail',
        name: 'Default Car Detail',
        version: 1,
        components: [
          {
            id: 'similar-cars',
            type: 'car_carousel',
            props: {
              title: 'Autos similares',
              source: 'similar',
              limit: 6,
            },
          },
        ],
      },
    };

    return defaults[pageId] || { id: `default-${pageId}`, name: pageId, version: 1, components: [] };
  }

  /**
   * Registra evento de analytics para componente SDUI
   */
  async trackComponentEvent(
    componentId: string,
    eventType: 'view' | 'click' | 'interaction',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabase.from('sdui_analytics').insert({
        component_id: componentId,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // No bloquear por errores de analytics
      this.logger.warn('SDUI analytics tracking failed', { componentId, eventType });
    }
  }

  /**
   * Invalida cache de un layout
   */
  invalidateCache(pageId?: string): void {
    if (pageId) {
      this.layoutCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.delete(pageId);
        return newCache;
      });
    } else {
      this.layoutCache.set(new Map());
    }
  }
}
