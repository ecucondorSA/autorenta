import { Injectable, signal } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface PricingRequest {
  region_id: string;
  rental_start: string; // ISO 8601 timestamp
  rental_hours: number;
  car_id?: string;
}

export interface PricingBreakdown {
  base_price: number;
  day_factor: number;
  hour_factor: number;
  user_factor: number;
  demand_factor: number;
  event_factor: number;
  total_multiplier: number;
}

export interface PricingDetails {
  user_rentals: number;
  day_of_week: number; // 0=Sunday, 6=Saturday
  hour_of_day: number;
}

export interface DynamicPricingResponse {
  region_id?: string; // Included in batch responses
  price_per_hour: number;
  total_price: number;
  currency: string;
  price_in_usd?: number; // USD equivalent using live exchange rate
  breakdown: PricingBreakdown;
  details: PricingDetails;
  surge_active: boolean;
  surge_message?: string;
}

export interface PricingRegion {
  id: string;
  name: string;
  country_code: string;
  currency: string;
  base_price_per_hour: number;
  fuel_cost_multiplier: number;
  inflation_rate: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DynamicPricingService {
  private readonly supabase = injectSupabase();

  // Cached regions
  private readonly regionsCache = signal<PricingRegion[]>([]);
  private regionsCacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active pricing regions
   */
  async getRegions(): Promise<PricingRegion[]> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.regionsCache().length > 0 && now - this.regionsCacheTimestamp < this.CACHE_TTL) {
      return this.regionsCache();
    }

    const { data, error } = await this.supabase
      .from('pricing_regions')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch pricing regions: ${error.message}`);
    }

    this.regionsCache.set(data as PricingRegion[]);
    this.regionsCacheTimestamp = now;

    return data as PricingRegion[];
  }

  /**
   * Get region by ID
   */
  async getRegionById(regionId: string): Promise<PricingRegion | null> {
    const regions = await this.getRegions();
    return regions.find((r) => r.id === regionId) ?? null;
  }

  /**
   * Calculate dynamic price for a rental
   */
  async calculatePrice(request: PricingRequest): Promise<DynamicPricingResponse> {
    const { data, error } = await this.supabase.functions.invoke('calculate-dynamic-price', {
      body: request,
    });

    if (error) {
      throw new Error(`Failed to calculate dynamic price: ${error.message}`);
    }

    return data as DynamicPricingResponse;
  }

  /**
   * Calculate price using RPC function (fallback if Edge Function unavailable)
   */
  async calculatePriceRPC(
    regionId: string,
    userId: string,
    rentalStart: string,
    rentalHours: number,
  ): Promise<DynamicPricingResponse> {
    const { data, error } = await this.supabase.rpc('calculate_dynamic_price', {
      p_region_id: regionId,
      p_user_id: userId,
      p_rental_start: rentalStart,
      p_rental_hours: rentalHours,
    });

    if (error) {
      throw new Error(`Failed to calculate price via RPC: ${error.message}`);
    }

    return data as DynamicPricingResponse;
  }

  /**
   * Calculate prices for multiple regions in a single RPC call (batch optimization)
   * Returns a map of region_id -> pricing data for efficient lookup
   */
  async calculateBatchPricesRPC(
    regionIds: string[],
    userId: string,
    rentalStart: string,
    rentalHours: number,
  ): Promise<Map<string, DynamicPricingResponse>> {
    if (regionIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabase.rpc('calculate_batch_dynamic_prices', {
      p_region_ids: regionIds,
      p_user_id: userId,
      p_rental_start: rentalStart,
      p_rental_hours: rentalHours,
    });

    if (error) {
      throw new Error(`Failed to calculate batch prices via RPC: ${error.message}`);
    }

    // Convert array response to Map for O(1) lookups
    const pricesMap = new Map<string, DynamicPricingResponse>();
    const results = data as DynamicPricingResponse[];

    for (const result of results) {
      if (result.region_id) {
        pricesMap.set(result.region_id, result);
      }
    }

    return pricesMap;
  }

  /**
   * Get latest demand snapshot for a region
   */
  async getLatestDemand(regionId: string): Promise<{
    available_cars: number;
    active_bookings: number;
    pending_requests: number;
    demand_ratio: number;
    surge_factor: number;
    timestamp: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('pricing_demand_snapshots')
      .select('*')
      .eq('region_id', regionId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get active special events for a region
   */
  async getActiveEvents(
    regionId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      id: string;
      name: string;
      start_date: string;
      end_date: string;
      factor: number;
    }>
  > {
    const { data, error } = await this.supabase
      .from('pricing_special_events')
      .select('id, name, start_date, end_date, factor')
      .eq('region_id', regionId)
      .eq('active', true)
      .lte('start_date', endDate.toISOString())
      .gte('end_date', startDate.toISOString());

    if (error) {
      return [];
    }

    return data;
  }

  /**
   * Get user's pricing calculation history
   */
  async getUserPricingHistory(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      id: string;
      created_at: string;
      base_price: number;
      final_price: number;
      calculation_details: DynamicPricingResponse;
    }>
  > {
    const { data, error } = await this.supabase
      .from('pricing_calculations')
      .select('id, created_at, base_price, final_price, calculation_details')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data;
  }

  /**
   * Format price with currency
   */
  formatPrice(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  }

  /**
   * Get surge badge info
   */
  getSurgeBadge(response: DynamicPricingResponse): {
    show: boolean;
    text: string;
    color: string;
    icon: string;
  } {
    const multiplier = response.breakdown.total_multiplier;

    if (multiplier > 1.15) {
      return {
        show: true,
        text: response.surge_message || 'Tarifa ajustada',
        color: 'bg-warning-500 text-white',
        icon: '⚡',
      };
    } else if (multiplier < 0.95) {
      return {
        show: true,
        text: response.surge_message || 'Descuento disponible',
        color: 'bg-success-500 text-white',
        icon: '💰',
      };
    }

    return {
      show: false,
      text: '',
      color: '',
      icon: '',
    };
  }

  /**
   * Get human-readable breakdown labels
   */
  getBreakdownLabels(): {
    day_factor: string;
    hour_factor: string;
    user_factor: string;
    demand_factor: string;
    event_factor: string;
  } {
    return {
      day_factor: 'Día de la semana',
      hour_factor: 'Hora del día',
      user_factor: 'Tipo de usuario',
      demand_factor: 'Demanda',
      event_factor: 'Eventos especiales',
    };
  }

  /**
   * Format factor as percentage
   */
  formatFactor(factor: number): string {
    const percent = (factor * 100).toFixed(0);
    return factor >= 0 ? `+${percent}%` : `${percent}%`;
  }

  /**
   * Get day name from day_of_week number
   */
  getDayName(dayOfWeek: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek] || 'Desconocido';
  }

  /**
   * Get hour range description
   */
  getHourDescription(hour: number): string {
    if (hour >= 0 && hour < 6) return 'Madrugada (descuento)';
    if (hour >= 6 && hour < 10) return 'Mañana (pico)';
    if (hour >= 10 && hour < 17) return 'Tarde (normal)';
    if (hour >= 17 && hour < 22) return 'Noche (pico)';
    return 'Noche tardía';
  }

  /**
   * Get quick price for a car (for map markers and search results)
   * Uses current time and 24h rental by default
   */
  async getQuickPrice(
    carId: string,
    regionId: string,
  ): Promise<{
    price_per_hour: number;
    price_per_day: number;
    currency: string;
    price_usd_hour?: number;
    price_usd_day?: number;
    surge_active: boolean;
    surge_icon?: string;
  } | null> {
    try {
      // Get current user ID (if logged in)
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // Anonymous user

      const now = new Date();
      const response = await this.calculatePriceRPC(
        regionId,
        userId,
        now.toISOString(),
        24, // Default 24 hours for "per day" pricing
      );

      const result = {
        price_per_hour: response.price_per_hour,
        price_per_day: response.total_price,
        currency: response.currency,
        price_usd_hour: response.price_in_usd,
        price_usd_day: response.price_in_usd ? response.price_in_usd * 24 : undefined,
        surge_active: response.surge_active,
        surge_icon: this.getSurgeBadge(response).icon,
      };

      return result;
    } catch (__error) {
      return null;
    }
  }

  /**
   * Get batch prices for multiple cars (optimized for map view)
   * Returns a map of car_id -> pricing data
   */
  async getBatchPrices(cars: Array<{ id: string; region_id: string }>): Promise<
    Map<
      string,
      {
        price_per_hour: number;
        price_per_day: number;
        currency: string;
        price_usd_hour?: number;
        surge_active: boolean;
      }
    >
  > {
    const pricesMap = new Map();

    // Group cars by region for efficient processing
    const carsByRegion = cars.reduce((acc, car) => {
      if (!acc.has(car.region_id)) {
        acc.set(car.region_id, []);
      }
      acc.get(car.region_id)!.push(car);
      return acc;
    }, new Map<string, typeof cars>());

    // Process each region
    for (const [regionId, regionCars] of carsByRegion) {
      for (const car of regionCars) {
        const price = await this.getQuickPrice(car.id, regionId);
        if (price) {
          pricesMap.set(car.id, price);
        }
      }
    }

    return pricesMap;
  }

  /**
   * Format quick price for display (e.g., "$3.20/h")
   */
  formatQuickPrice(pricePerHour: number, currency: string, showUSD = false): string {
    if (showUSD && currency !== 'USD') {
      // Try to convert to USD if exchange rate available
      // For now, just show local currency
      return `${this.formatPrice(pricePerHour, currency)}/h`;
    }
    return `${this.formatPrice(pricePerHour, currency)}/h`;
  }

  /**
   * Get price trend indicator (↑ ↓ →)
   */
  getPriceTrend(currentMultiplier: number): string {
    if (currentMultiplier > 1.1) return '↑';
    if (currentMultiplier < 0.9) return '↓';
    return '→';
  }
}
