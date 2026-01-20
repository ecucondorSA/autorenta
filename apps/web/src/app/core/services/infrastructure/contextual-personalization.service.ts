import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { LoggerService } from './logger.service';
import { RemoteConfigService } from './remote-config.service';
import { EdgePersonalizationService } from './edge-personalization.service';
import { DynamicTokensService } from './dynamic-tokens.service';

/**
 * Contextual Personalization Service
 *
 * Personaliza la experiencia basándose en contexto:
 * - Hora del día (mañana, tarde, noche)
 * - Clima actual
 * - Eventos especiales y feriados
 * - Comportamiento del usuario
 * - Dispositivo y conexión
 *
 * @example
 * ```typescript
 * // Obtener contexto actual
 * const ctx = this.contextual.currentContext();
 *
 * // Obtener recomendaciones contextuales
 * const recs = await this.contextual.getContextualRecommendations();
 *
 * // Mensaje contextual
 * const message = this.contextual.getContextualMessage('search');
 * ```
 */

export interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'unknown';
  temperature: number; // Celsius
  humidity: number; // Porcentaje
  description: string;
}

export interface ContextualEvent {
  id: string;
  name: string;
  type: 'holiday' | 'promo' | 'seasonal' | 'local';
  startDate: string;
  endDate: string;
  theme?: string;
  discount?: number;
  message?: string;
  countries?: string[];
}

export interface UserBehavior {
  sessionCount: number;
  lastVisit?: Date;
  averageSessionDuration: number;
  preferredSearchTime?: 'weekday' | 'weekend';
  deviceType: 'mobile' | 'desktop' | 'tablet';
  connectionType?: 'slow' | 'fast' | 'offline';
}

export interface PersonalizationContext {
  // Tiempo
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6
  isWeekend: boolean;
  localTime: Date;

  // Clima
  weather?: WeatherData;

  // Ubicación
  country: string;
  city?: string;
  timezone: string;

  // Eventos
  activeEvents: ContextualEvent[];
  hasPromotion: boolean;

  // Usuario
  isAuthenticated: boolean;
  isNewUser: boolean;
  behavior?: UserBehavior;

  // Dispositivo
  deviceType: 'mobile' | 'desktop' | 'tablet';
  isSlowConnection: boolean;
  prefersReducedMotion: boolean;
}

export interface ContextualRecommendation {
  type: string;
  title: string;
  subtitle?: string;
  icon?: string;
  action?: string;
  priority: number;
}

@Injectable({ providedIn: 'root' })
export class ContextualPersonalizationService implements OnDestroy {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly remoteConfig = inject(RemoteConfigService);
  private readonly edgePersonalization = inject(EdgePersonalizationService);
  private readonly dynamicTokens = inject(DynamicTokensService);

  // Estado
  private readonly context = signal<PersonalizationContext>(this.buildInitialContext());
  private readonly activeEvents = signal<ContextualEvent[]>([]);
  private readonly weatherData = signal<WeatherData | null>(null);
  private updateInterval?: ReturnType<typeof setInterval>;

  // Selectores públicos
  readonly currentContext = computed(() => this.context());
  readonly events = computed(() => this.activeEvents());
  readonly weather = computed(() => this.weatherData());
  readonly hasActivePromo = computed(() => this.activeEvents().some((e) => e.type === 'promo'));

  constructor() {
    this.initialize();
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  /**
   * Inicializa el servicio
   */
  private async initialize(): Promise<void> {
    // Cargar eventos activos
    await this.loadActiveEvents();

    // Cargar clima (opcional)
    await this.loadWeather();

    // Actualizar contexto cada 5 minutos
    this.updateInterval = setInterval(() => {
      this.updateContext();
    }, 5 * 60 * 1000);

    // Aplicar tema si hay evento activo
    this.applyEventThemeIfActive();
  }

  /**
   * Obtiene recomendaciones basadas en contexto
   */
  getContextualRecommendations(): ContextualRecommendation[] {
    const ctx = this.context();
    const recommendations: ContextualRecommendation[] = [];

    // Recomendaciones por hora del día
    if (ctx.timeOfDay === 'morning') {
      recommendations.push({
        type: 'time',
        title: 'Reserva temprano',
        subtitle: 'Mejores precios en reservas matutinas',
        icon: 'sunny',
        priority: 1,
      });
    }

    if (ctx.timeOfDay === 'evening' || ctx.timeOfDay === 'night') {
      recommendations.push({
        type: 'time',
        title: 'Planifica tu fin de semana',
        subtitle: 'Reserva ahora para el próximo sábado',
        icon: 'calendar',
        priority: 2,
      });
    }

    // Recomendaciones por clima
    if (ctx.weather) {
      if (ctx.weather.condition === 'sunny' && ctx.weather.temperature > 25) {
        recommendations.push({
          type: 'weather',
          title: '¡Día perfecto para pasear!',
          subtitle: 'Mira nuestros convertibles y SUVs',
          icon: 'car-sport',
          action: '/marketplace?type=convertible,suv',
          priority: 1,
        });
      }

      if (ctx.weather.condition === 'rainy') {
        recommendations.push({
          type: 'weather',
          title: 'Clima lluvioso',
          subtitle: 'Vehículos con tracción 4x4 recomendados',
          icon: 'rainy',
          action: '/marketplace?features=4x4',
          priority: 2,
        });
      }
    }

    // Recomendaciones por día de la semana
    if (ctx.isWeekend) {
      recommendations.push({
        type: 'weekend',
        title: 'Ofertas de fin de semana',
        subtitle: 'Descuentos especiales por 2+ días',
        icon: 'pricetag',
        priority: 2,
      });
    }

    // Recomendaciones por eventos activos
    for (const event of ctx.activeEvents) {
      if (event.discount) {
        recommendations.push({
          type: 'event',
          title: event.name,
          subtitle: event.message || `${event.discount}% de descuento`,
          icon: 'gift',
          priority: 0, // Alta prioridad para eventos
        });
      }
    }

    // Recomendaciones para usuarios nuevos
    if (ctx.isNewUser) {
      recommendations.push({
        type: 'new_user',
        title: '¡Bienvenido a Autorentar!',
        subtitle: '20% OFF en tu primera reserva',
        icon: 'sparkles',
        priority: 0,
      });
    }

    // Ordenar por prioridad
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Obtiene mensaje contextual para una acción
   */
  getContextualMessage(
    action: 'search' | 'booking' | 'welcome' | 'checkout' | 'review'
  ): string {
    const ctx = this.context();

    const messages: Record<string, Record<string, string[]>> = {
      search: {
        morning: [
          '¡Buenos días! ¿A dónde vamos hoy?',
          'Empieza el día con el auto perfecto',
        ],
        afternoon: [
          'Encuentra tu auto ideal para esta tarde',
          '¿Planificando un viaje?',
        ],
        evening: [
          'Reserva ahora para mañana temprano',
          'Los mejores autos te esperan',
        ],
        night: [
          'Planifica tu próximo viaje',
          'Reserva ahora, viaja cuando quieras',
        ],
      },
      booking: {
        morning: ['¡Excelente elección para empezar el día!'],
        afternoon: ['¡Perfecto para tu tarde!'],
        evening: ['¡Listo para tu aventura de mañana!'],
        night: ['¡Reserva confirmada! Descansa tranquilo.'],
      },
      welcome: {
        morning: ['¡Buenos días! Qué bueno verte.'],
        afternoon: ['¡Buenas tardes! ¿Listo para reservar?'],
        evening: ['¡Buenas noches! Bienvenido de vuelta.'],
        night: ['¡Hola! Gracias por visitarnos.'],
      },
      checkout: {
        default: [
          '¡Ya casi está! Completa tu reserva.',
          'Último paso para tu aventura.',
        ],
      },
      review: {
        default: [
          '¿Cómo fue tu experiencia?',
          'Tu opinión nos ayuda a mejorar.',
        ],
      },
    };

    const timeMessages = messages[action]?.[ctx.timeOfDay] || messages[action]?.['default'] || [''];
    return timeMessages[Math.floor(Math.random() * timeMessages.length)];
  }

  /**
   * Obtiene filtros sugeridos basados en contexto
   */
  getSuggestedFilters(): Record<string, unknown> {
    const ctx = this.context();
    const filters: Record<string, unknown> = {};

    // Clima caliente -> sugerir autos con A/C
    if (ctx.weather && ctx.weather.temperature > 28) {
      filters['hasAC'] = true;
    }

    // Fin de semana -> sugerir autos familiares
    if (ctx.isWeekend) {
      filters['suggestedTypes'] = ['suv', 'minivan'];
    }

    // Lluvia -> sugerir 4x4
    if (ctx.weather?.condition === 'rainy') {
      filters['suggestedFeatures'] = ['4x4', 'all_wheel_drive'];
    }

    return filters;
  }

  /**
   * Verifica si debe mostrar contenido especial
   */
  shouldShowSpecialContent(contentType: 'promo_banner' | 'event_modal' | 'weather_tip'): boolean {
    const ctx = this.context();

    switch (contentType) {
      case 'promo_banner':
        return ctx.activeEvents.some((e) => e.type === 'promo');

      case 'event_modal': {
        // Mostrar modal solo una vez por sesión para eventos importantes
        const hasHoliday = ctx.activeEvents.some((e) => e.type === 'holiday');
        return hasHoliday && this.isFirstVisitToday();
      }

      case 'weather_tip':
        // Mostrar tip de clima si hay condiciones extremas
        if (!ctx.weather) return false;
        return (
          ctx.weather.condition === 'stormy' ||
          ctx.weather.temperature > 35 ||
          ctx.weather.temperature < 5
        );

      default:
        return false;
    }
  }

  /**
   * Obtiene el evento activo más relevante
   */
  getPrimaryEvent(): ContextualEvent | null {
    const events = this.activeEvents();
    if (events.length === 0) return null;

    // Prioridad: holiday > promo > seasonal > local
    const priority = ['holiday', 'promo', 'seasonal', 'local'];
    const sorted = [...events].sort(
      (a, b) => priority.indexOf(a.type) - priority.indexOf(b.type)
    );

    return sorted[0];
  }

  // ============================================
  // Métodos privados
  // ============================================

  private buildInitialContext(): PersonalizationContext {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    return {
      timeOfDay: this.getTimeOfDay(hour),
      dayOfWeek: day,
      isWeekend: day === 0 || day === 6,
      localTime: now,
      country: 'BR',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      activeEvents: [],
      hasPromotion: false,
      isAuthenticated: false,
      isNewUser: true,
      deviceType: this.detectDeviceType(),
      isSlowConnection: this.detectSlowConnection(),
      prefersReducedMotion: this.detectReducedMotion(),
    };
  }

  private updateContext(): void {
    const now = new Date();
    const hour = now.getHours();

    this.context.update((ctx) => ({
      ...ctx,
      timeOfDay: this.getTimeOfDay(hour),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      localTime: now,
      activeEvents: this.activeEvents(),
      hasPromotion: this.activeEvents().some((e) => e.type === 'promo'),
      weather: this.weatherData() || undefined,
    }));
  }

  private getTimeOfDay(hour: number): PersonalizationContext['timeOfDay'] {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'night';
  }

  private async loadActiveEvents(): Promise<void> {
    try {
      const now = new Date().toISOString();
      const country = this.edgePersonalization.country;

      const { data, error } = await this.supabase
        .from('special_events')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now)
        .or(`countries.is.null,countries.cs.{${country}}`);

      if (error) throw error;

      const events: ContextualEvent[] = (data || []).map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        startDate: e.start_date,
        endDate: e.end_date,
        theme: e.theme,
        discount: e.discount,
        message: e.message,
        countries: e.countries,
      }));

      this.activeEvents.set(events);
      this.logger.debug('Active events loaded', { count: events.length });
    } catch (err) {
      this.logger.warn('Failed to load events', { error: err });
      // Cargar eventos hardcodeados como fallback
      this.loadFallbackEvents();
    }
  }

  private loadFallbackEvents(): void {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    const fallbackEvents: ContextualEvent[] = [];

    // Eventos por fecha
    if (month === 11 && day >= 20 && day <= 31) {
      // Navidad
      fallbackEvents.push({
        id: 'christmas-2026',
        name: '¡Felices Fiestas!',
        type: 'holiday',
        startDate: '2026-12-20',
        endDate: '2026-12-31',
        theme: 'christmas',
        discount: 15,
        message: '15% OFF en reservas navideñas',
      });
    }

    if (month === 0 && day <= 7) {
      // Año nuevo
      fallbackEvents.push({
        id: 'new-year-2027',
        name: '¡Feliz Año Nuevo!',
        type: 'holiday',
        startDate: '2027-01-01',
        endDate: '2027-01-07',
        theme: 'new-year',
        discount: 10,
      });
    }

    if (month === 1 || month === 2) {
      // Carnaval (Feb-Mar)
      fallbackEvents.push({
        id: 'carnival-2026',
        name: '¡Carnaval!',
        type: 'seasonal',
        startDate: '2026-02-01',
        endDate: '2026-03-10',
        theme: 'carnival',
        discount: 20,
        countries: ['BR'],
      });
    }

    this.activeEvents.set(fallbackEvents);
  }

  private async loadWeather(): Promise<void> {
    try {
      // Usar API de clima gratuita o edge function
      const geoData = this.edgePersonalization.geoData();
      if (!geoData?.latitude || !geoData?.longitude) return;

      const { data, error } = await this.supabase.functions.invoke('get-weather', {
        body: {
          lat: geoData.latitude,
          lon: geoData.longitude,
        },
      });

      if (error) throw error;

      if (data) {
        this.weatherData.set({
          condition: this.mapWeatherCondition(data.condition),
          temperature: data.temperature,
          humidity: data.humidity,
          description: data.description,
        });
      }
    } catch (err) {
      // Clima es opcional, no bloquear
      this.logger.debug('Weather data not available', { error: err });
    }
  }

  private mapWeatherCondition(condition: string): WeatherData['condition'] {
    const map: Record<string, WeatherData['condition']> = {
      clear: 'sunny',
      sunny: 'sunny',
      clouds: 'cloudy',
      cloudy: 'cloudy',
      rain: 'rainy',
      drizzle: 'rainy',
      thunderstorm: 'stormy',
      snow: 'snowy',
    };
    return map[condition.toLowerCase()] || 'unknown';
  }

  private applyEventThemeIfActive(): void {
    const event = this.getPrimaryEvent();
    if (event?.theme) {
      this.dynamicTokens.applyEventTheme(event.theme);
    }
  }

  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private detectSlowConnection(): boolean {
    if (typeof navigator === 'undefined') return false;
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    return conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';
  }

  private detectReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private isFirstVisitToday(): boolean {
    const key = 'autorentar_last_visit';
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem(key);

    if (lastVisit !== today) {
      localStorage.setItem(key, today);
      return true;
    }
    return false;
  }
}
