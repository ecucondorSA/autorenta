import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from '../infrastructure/supabase-client.service';
import { LoggerService } from '../infrastructure/logger.service';
import { AuthService } from '../auth/auth.service';
import { Car } from '../../models/car.model';

/**
 * Recommendations Service
 *
 * Sistema de recomendaciones de autos basado en:
 * - Historial de búsqueda del usuario
 * - Autos similares (tipo, precio, ubicación)
 * - Popularidad y ratings
 * - Comportamiento de usuarios similares (futuro: collaborative filtering)
 *
 * @example
 * ```typescript
 * // Autos similares
 * const similar = await this.recommendations.getSimilarCars(carId);
 *
 * // Para ti (basado en historial)
 * const forYou = await this.recommendations.getPersonalizedRecommendations();
 *
 * // Populares en tu zona
 * const popular = await this.recommendations.getPopularNearby(lat, lng);
 * ```
 */

interface RecommendationContext {
  userId?: string;
  currentCarId?: string;
  location?: { lat: number; lng: number };
  priceRange?: { min: number; max: number };
  carType?: string;
  limit?: number;
}

interface UserPreferences {
  preferredCarTypes: string[];
  preferredPriceRange: { min: number; max: number };
  searchLocations: Array<{ lat: number; lng: number; city: string }>;
  viewedCars: string[];
  bookedCarTypes: string[];
}

interface RecommendationResult {
  cars: Car[];
  reason: string;
  score?: number;
}

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly auth = inject(AuthService);

  // Cache de preferencias del usuario
  private readonly userPreferences = signal<UserPreferences | null>(null);
  private readonly isLoading = signal(false);

  /**
   * Obtiene autos similares a uno dado
   * Basado en: tipo, rango de precio, ubicación
   */
  async getSimilarCars(carId: string, limit = 6): Promise<RecommendationResult> {
    try {
      this.isLoading.set(true);

      // Obtener el auto actual
      const { data: currentCar, error: carError } = await this.supabase
        .from('cars')
        .select('id, type, daily_price, city, brand, model, year')
        .eq('id', carId)
        .single();

      if (carError || !currentCar) {
        return { cars: [], reason: 'car_not_found' };
      }

      // Buscar autos similares
      const { data: similarCars, error } = await this.supabase
        .from('cars')
        .select(
          `
          *,
          profiles:owner_id (
            id, first_name, avatar_url, rating
          )
        `
        )
        .eq('status', 'active')
        .eq('type', currentCar.type)
        .neq('id', carId)
        .gte('daily_price', currentCar.daily_price * 0.7)
        .lte('daily_price', currentCar.daily_price * 1.3)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.logger.debug('Similar cars found', { carId, count: similarCars?.length ?? 0 });

      return {
        cars: (similarCars as Car[]) ?? [],
        reason: 'similar_type_price',
      };
    } catch (err) {
      this.logger.error('getSimilarCars failed', { carId, error: err });
      return { cars: [], reason: 'error' };
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Recomendaciones personalizadas basadas en historial
   */
  async getPersonalizedRecommendations(limit = 10): Promise<RecommendationResult> {
    try {
      this.isLoading.set(true);
      const userId = this.auth.currentUser()?.id;

      if (!userId) {
        // Usuario no autenticado - mostrar populares
        return this.getPopularCars(limit);
      }

      // Obtener preferencias del usuario
      const prefs = await this.getUserPreferences(userId);

      if (!prefs || prefs.viewedCars.length === 0) {
        // Sin historial - mostrar populares
        return this.getPopularCars(limit);
      }

      // Construir query basada en preferencias
      let query = this.supabase
        .from('cars')
        .select(
          `
          *,
          profiles:owner_id (
            id, first_name, avatar_url, rating
          )
        `
        )
        .eq('status', 'active');

      // Filtrar por tipos preferidos
      if (prefs.preferredCarTypes.length > 0) {
        query = query.in('type', prefs.preferredCarTypes);
      }

      // Filtrar por rango de precio
      if (prefs.preferredPriceRange) {
        query = query
          .gte('daily_price', prefs.preferredPriceRange.min)
          .lte('daily_price', prefs.preferredPriceRange.max);
      }

      // Excluir autos ya vistos recientemente (últimos 20)
      const recentlyViewed = prefs.viewedCars.slice(0, 20);
      if (recentlyViewed.length > 0) {
        query = query.not('id', 'in', `(${recentlyViewed.join(',')})`);
      }

      const { data: cars, error } = await query
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        cars: (cars as Car[]) ?? [],
        reason: 'personalized_history',
      };
    } catch (err) {
      this.logger.error('getPersonalizedRecommendations failed', { error: err });
      return this.getPopularCars(limit);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Autos populares cerca de una ubicación
   */
  async getPopularNearby(
    lat: number,
    lng: number,
    radiusKm = 50,
    limit = 10
  ): Promise<RecommendationResult> {
    try {
      this.isLoading.set(true);

      // Usar función PostGIS para búsqueda por radio
      const { data: cars, error } = await this.supabase.rpc('get_cars_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
        p_limit: limit,
      });

      if (error) {
        // Fallback: búsqueda sin geolocalización
        return this.getPopularCars(limit);
      }

      return {
        cars: (cars as Car[]) ?? [],
        reason: 'popular_nearby',
      };
    } catch (err) {
      this.logger.error('getPopularNearby failed', { lat, lng, error: err });
      return this.getPopularCars(limit);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Autos populares (fallback general)
   */
  async getPopularCars(limit = 10): Promise<RecommendationResult> {
    try {
      const { data: cars, error } = await this.supabase
        .from('cars')
        .select(
          `
          *,
          profiles:owner_id (
            id, first_name, avatar_url, rating
          )
        `
        )
        .eq('status', 'active')
        .order('rating', { ascending: false })
        .order('total_bookings', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        cars: (cars as Car[]) ?? [],
        reason: 'popular_global',
      };
    } catch (err) {
      this.logger.error('getPopularCars failed', { error: err });
      return { cars: [], reason: 'error' };
    }
  }

  /**
   * Autos vistos recientemente
   */
  async getRecentlyViewed(limit = 10): Promise<RecommendationResult> {
    try {
      const userId = this.auth.currentUser()?.id;
      if (!userId) {
        return { cars: [], reason: 'not_authenticated' };
      }

      const { data: views, error: viewsError } = await this.supabase
        .from('car_views')
        .select('car_id')
        .eq('viewer_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(limit);

      if (viewsError || !views?.length) {
        return { cars: [], reason: 'no_history' };
      }

      const carIds = views.map((v) => v.car_id);

      const { data: cars, error } = await this.supabase
        .from('cars')
        .select(
          `
          *,
          profiles:owner_id (
            id, first_name, avatar_url, rating
          )
        `
        )
        .in('id', carIds)
        .eq('status', 'active');

      if (error) throw error;

      // Mantener orden de views
      const orderedCars = carIds
        .map((id) => cars?.find((c) => c.id === id))
        .filter(Boolean) as Car[];

      return {
        cars: orderedCars,
        reason: 'recently_viewed',
      };
    } catch (err) {
      this.logger.error('getRecentlyViewed failed', { error: err });
      return { cars: [], reason: 'error' };
    }
  }

  /**
   * Registra una vista de auto (para mejorar recomendaciones)
   */
  async trackCarView(carId: string): Promise<void> {
    try {
      const userId = this.auth.currentUser()?.id;
      if (!userId) return;

      await this.supabase.from('car_views').insert({
        viewer_id: userId,
        car_id: carId,
        viewed_at: new Date().toISOString(),
      });

      this.logger.debug('Car view tracked', { carId });
    } catch (err) {
      // No bloquear por errores de tracking
      this.logger.warn('trackCarView failed', { carId, error: err });
    }
  }

  /**
   * Registra una búsqueda (para mejorar recomendaciones)
   */
  async trackSearch(params: {
    query?: string;
    type?: string;
    priceMin?: number;
    priceMax?: number;
    location?: { lat: number; lng: number; city?: string };
  }): Promise<void> {
    try {
      const userId = this.auth.currentUser()?.id;
      if (!userId) return;

      await this.supabase.from('search_history').insert({
        user_id: userId,
        search_params: params,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn('trackSearch failed', { error: err });
    }
  }

  /**
   * Obtiene preferencias del usuario basadas en historial
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      // Cache check
      if (this.userPreferences()) {
        return this.userPreferences();
      }

      // Obtener historial de búsquedas
      const { data: searches } = await this.supabase
        .from('search_history')
        .select('search_params')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Obtener vistas
      const { data: views } = await this.supabase
        .from('car_views')
        .select('car_id')
        .eq('viewer_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(100);

      // Obtener bookings
      const { data: bookings } = await this.supabase
        .from('bookings')
        .select('cars:car_id (type)')
        .eq('renter_id', userId)
        .limit(20);

      // Analizar preferencias
      const carTypes: Record<string, number> = {};
      const prices: number[] = [];
      const locations: Array<{ lat: number; lng: number; city: string }> = [];

      // De búsquedas
      searches?.forEach((s) => {
        const params = s.search_params as Record<string, unknown>;
        if (params.type) carTypes[params.type as string] = (carTypes[params.type as string] || 0) + 1;
        if (params.priceMin) prices.push(params.priceMin as number);
        if (params.priceMax) prices.push(params.priceMax as number);
        if (params.location) locations.push(params.location as { lat: number; lng: number; city: string });
      });

      // De bookings
      bookings?.forEach((b) => {
        const car = b.cars as { type: string } | null;
        if (car?.type) carTypes[car.type] = (carTypes[car.type] || 0) + 5; // Peso mayor
      });

      // Calcular preferencias
      const preferredCarTypes = Object.entries(carTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);

      const prefs: UserPreferences = {
        preferredCarTypes,
        preferredPriceRange: {
          min: prices.length > 0 ? Math.min(...prices) * 0.8 : 0,
          max: prices.length > 0 ? Math.max(...prices) * 1.2 : 100000,
        },
        searchLocations: locations.slice(0, 5),
        viewedCars: views?.map((v) => v.car_id) ?? [],
        bookedCarTypes: bookings?.map((b) => (b.cars as { type: string })?.type).filter(Boolean) ?? [],
      };

      this.userPreferences.set(prefs);
      return prefs;
    } catch (err) {
      this.logger.error('getUserPreferences failed', { userId, error: err });
      return null;
    }
  }

  /**
   * Limpia cache de preferencias (llamar al logout)
   */
  clearCache(): void {
    this.userPreferences.set(null);
  }
}
