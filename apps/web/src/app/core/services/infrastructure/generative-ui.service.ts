import { Injectable } from '@angular/core';

/**
 * Generative UI Service
 *
 * Usa AI (Gemini) para generar contenido personalizado dinámicamente:
 * - Descripciones de autos optimizadas
 * - Títulos y CTAs personalizados
 * - Recomendaciones conversacionales
 * - Respuestas contextuales
 *
 * @example
 * ```typescript
 * // Generar descripción optimizada de auto
 * const description = await this.genUI.generateCarDescription(car, userContext);
 *
 * // Generar CTA personalizado
 * const cta = await this.genUI.generateCTA('booking', userContext);
 * ```
 */

interface UserContext {
  userId?: string;
  country?: string;
  language?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  previousSearches?: string[];
  preferredCarTypes?: string[];
  isNewUser?: boolean;
}

interface GeneratedContent {
  content: string;
  confidence: number;
  generatedAt: number;
  cached: boolean;
}

interface CarData {
  brand: string;
  model: string;
  year: number;
  type: string;
  features?: string[];
  dailyPrice: number;
  rating?: number;
  totalBookings?: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

@Injectable({ providedIn: 'root' })
export class GenerativeUIService {
  // Cache en memoria
  private readonly contentCache = new Map<string, GeneratedContent>();

  /**
   * Genera descripción optimizada para un auto
   */
  async generateCarDescription(car: CarData, context?: UserContext): Promise<GeneratedContent> {
    const cacheKey = `car-desc-${car.brand}-${car.model}-${car.year}-${context?.language || 'es'}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Uses deterministic fallbacks (AI edge function not yet deployed)
    const result: GeneratedContent = {
      content: this.getFallbackCarDescription(car),
      confidence: 0.9,
      generatedAt: Date.now(),
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Genera CTA personalizado
   */
  async generateCTA(
    action: 'booking' | 'search' | 'signup' | 'review' | 'share',
    context?: UserContext,
  ): Promise<GeneratedContent> {
    const cacheKey = `cta-${action}-${context?.timeOfDay || 'default'}-${context?.isNewUser ? 'new' : 'returning'}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Uses deterministic fallbacks (AI edge function not yet deployed)
    const result: GeneratedContent = {
      content: this.getFallbackCTA(action),
      confidence: 0.9,
      generatedAt: Date.now(),
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Genera título de sección personalizado
   */
  async generateSectionTitle(
    section: 'popular' | 'recommended' | 'nearby' | 'similar' | 'recent',
    context?: UserContext,
  ): Promise<GeneratedContent> {
    const timeVariant = context?.timeOfDay || 'default';
    const cacheKey = `title-${section}-${timeVariant}-${context?.country || 'default'}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Para títulos, usamos variantes pre-definidas con algo de personalización
    const titles = this.getTitleVariants(section, context);
    const selectedTitle = titles[Math.floor(Math.random() * titles.length)];

    const result: GeneratedContent = {
      content: selectedTitle,
      confidence: 0.9,
      generatedAt: Date.now(),
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Genera mensaje de bienvenida personalizado
   */
  async generateWelcomeMessage(context?: UserContext): Promise<GeneratedContent> {
    const hour = new Date().getHours();
    const timeOfDay =
      hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

    const cacheKey = `welcome-${timeOfDay}-${context?.isNewUser ? 'new' : 'returning'}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Uses deterministic fallbacks (AI edge function not yet deployed)
    const result: GeneratedContent = {
      content: this.getFallbackWelcome(timeOfDay, context?.isNewUser),
      confidence: 0.9,
      generatedAt: Date.now(),
      cached: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Genera sugerencias de búsqueda
   */
  async generateSearchSuggestions(_context?: UserContext): Promise<string[]> {
    // Uses deterministic fallbacks (AI edge function not yet deployed)
    return this.getFallbackSearchSuggestions();
  }

  // ============================================
  // Helpers privados
  // ============================================

  private getFromCache(key: string): GeneratedContent | null {
    const cached = this.contentCache.get(key);
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
      return { ...cached, cached: true };
    }
    return null;
  }

  private setCache(key: string, content: GeneratedContent): void {
    this.contentCache.set(key, content);
    // Limpiar cache viejo periódicamente
    if (this.contentCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.contentCache.entries()) {
        if (now - v.generatedAt > CACHE_TTL_MS) {
          this.contentCache.delete(k);
        }
      }
    }
  }

  private getFallbackCarDescription(car: CarData): string {
    const descriptions: Record<string, string> = {
      sedan: `${car.brand} ${car.model} ${car.year} - Un sedán elegante y confortable, perfecto para viajes urbanos y carreteras. Excelente economía de combustible.`,
      suv: `${car.brand} ${car.model} ${car.year} - SUV espacioso con gran capacidad de carga. Ideal para familias y aventuras.`,
      hatchback: `${car.brand} ${car.model} ${car.year} - Compacto y ágil, perfecto para la ciudad. Fácil de estacionar y económico.`,
      pickup: `${car.brand} ${car.model} ${car.year} - Pickup robusta con gran capacidad de carga. Versátil para trabajo y aventura.`,
      luxury: `${car.brand} ${car.model} ${car.year} - Experiencia premium con acabados de lujo y tecnología de punta.`,
    };
    return (
      descriptions[car.type] ||
      `${car.brand} ${car.model} ${car.year} - Un vehículo confiable para tus viajes.`
    );
  }

  private getFallbackCTA(action: string): string {
    const ctas: Record<string, string> = {
      booking: '¡Reserva ahora!',
      search: 'Buscar autos',
      signup: 'Crear cuenta gratis',
      review: 'Dejar mi opinión',
      share: 'Compartir',
    };
    return ctas[action] || 'Continuar';
  }

  private getFallbackWelcome(timeOfDay: string, isNewUser?: boolean): string {
    const greetings: Record<string, string> = {
      morning: '¡Buenos días!',
      afternoon: '¡Buenas tardes!',
      evening: '¡Buenas noches!',
      night: '¡Buenas noches!',
    };

    const greeting = greetings[timeOfDay] || '¡Hola!';
    return isNewUser
      ? `${greeting} Bienvenido a Autorentar. Encuentra el auto perfecto para tu próximo viaje.`
      : `${greeting} Qué bueno verte de nuevo. ¿Listo para tu próxima aventura?`;
  }

  private getTitleVariants(section: string, context?: UserContext): string[] {
    const variants: Record<string, string[]> = {
      popular: ['Autos más populares', 'Los favoritos de la comunidad', 'Tendencias de la semana'],
      recommended: [
        'Recomendados para ti',
        'Seleccionados especialmente',
        'Basados en tus preferencias',
      ],
      nearby: ['Cerca de ti', 'En tu zona', 'Disponibles ahora'],
      similar: ['Autos similares', 'También te puede interesar', 'Opciones relacionadas'],
      recent: ['Vistos recientemente', 'Continúa explorando', 'Tu historial'],
    };

    const timeVariants: Record<string, Record<string, string[]>> = {
      morning: {
        popular: ['Empieza el día con los mejores', 'Populares esta mañana'],
      },
      evening: {
        popular: ['Los más buscados hoy', 'Tendencias de la tarde'],
      },
    };

    // Combinar variantes base con variantes por tiempo
    const base = variants[section] || ['Autos destacados'];
    const timeSpecific = timeVariants[context?.timeOfDay || 'default']?.[section] || [];

    return [...base, ...timeSpecific];
  }

  private getFallbackSearchSuggestions(): string[] {
    return [
      'SUV para el fin de semana',
      'Auto económico en el centro',
      'Pickup para mudanza',
      'Auto de lujo para ocasión especial',
      'Familiar para vacaciones',
    ];
  }
}
