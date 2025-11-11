import { Injectable, inject } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { DistanceCalculatorService } from './distance-calculator.service';

export interface QuoteBreakdown {
  price_subtotal: number;
  discount: number;
  service_fee: number;
  total: number;
  // ✅ NEW: Distance-based pricing fields
  delivery_fee?: number;
  delivery_distance_km?: number;
  distance_risk_tier?: 'local' | 'regional' | 'long_distance';
}

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface VehicleCategory {
  id: string;
  name: string;
  description: string;
  base_rate_multiplier: number;
  depreciation_rate_annual: number;
}

export interface VehicleValueEstimation {
  estimated_value_usd: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'pricing_model' | 'category_fallback';
  category_id?: string;
  category_name?: string;
  suggested_daily_rate_usd?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PricingService {
  private readonly supabase = injectSupabase();
  private readonly distanceCalculator = inject(DistanceCalculatorService);

  async quoteBooking(params: {
    carId: string;
    start: string;
    end: string;
    promoCode?: string;
    userLocation?: LocationCoords;
  }): Promise<QuoteBreakdown> {
    // Get base quote from RPC
    const { data, error } = await this.supabase.rpc('quote_booking', {
      p_car_id: params.carId,
      p_start: params.start,
      p_end: params.end,
      p_promo: params.promoCode ?? null,
    });
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No se pudo calcular la cotización');
    }

    const baseQuote = data[0] as QuoteBreakdown;

    // If user location provided, calculate delivery fee
    if (params.userLocation) {
      const distanceData = await this.calculateDeliveryFee(params.carId, params.userLocation);

      if (distanceData) {
        baseQuote.delivery_fee = distanceData.deliveryFeeCents / 100; // Convert to ARS
        baseQuote.delivery_distance_km = distanceData.distanceKm;
        baseQuote.distance_risk_tier = distanceData.tier;
        baseQuote.total += baseQuote.delivery_fee;
      }
    }

    return baseQuote;
  }

  /**
   * Calculate delivery fee based on distance between user and car
   * @param carId Car ID
   * @param userLocation User location coordinates
   * @returns Delivery fee data or null if car location not available
   */
  async calculateDeliveryFee(
    carId: string,
    userLocation: LocationCoords,
  ): Promise<{
    distanceKm: number;
    deliveryFeeCents: number;
    tier: 'local' | 'regional' | 'long_distance';
  } | null> {
    // Get car location
    const { data: car, error } = await this.supabase
      .from('cars')
      .select('location_lat, location_lng')
      .eq('id', carId)
      .single();

    if (error || !car || !car.location_lat || !car.location_lng) {
      return null;
    }

    // Calculate distance
    const distanceKm = this.distanceCalculator.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      car.location_lat,
      car.location_lng,
    );

    // Calculate delivery fee
    const deliveryFeeCents = this.distanceCalculator.calculateDeliveryFee(distanceKm);

    // Get tier
    const tier = this.distanceCalculator.getDistanceTier(distanceKm);

    return {
      distanceKm,
      deliveryFeeCents,
      tier,
    };
  }

  async cancelWithFee(bookingId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('cancel_with_fee', {
      p_booking_id: bookingId,
    });
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No se pudo cancelar la reserva');
    }
    return Number(data[0].cancel_fee ?? 0);
  }

  /**
   * Get all vehicle categories from database
   */
  async getVehicleCategories(): Promise<VehicleCategory[]> {
    const { data, error } = await this.supabase
      .from('vehicle_categories')
      .select('id, name, description, base_rate_multiplier, depreciation_rate_annual')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Estimate vehicle value using SQL function
   * Calls estimate_vehicle_value_usd(brand, model, year, country)
   */
  async estimateVehicleValue(params: {
    brand: string;
    model: string;
    year: number;
    country?: string;
  }): Promise<VehicleValueEstimation | null> {
    const { data, error } = await this.supabase.rpc('estimate_vehicle_value_usd', {
      p_brand: params.brand,
      p_model: params.model,
      p_year: params.year,
      p_country: params.country || 'AR',
    });

    if (error) {
      console.error('Error estimating vehicle value:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];

    // Calculate suggested daily rate (0.25-0.35% of vehicle value per day)
    const suggestedRate =
      result.estimated_value_usd > 0 ? result.estimated_value_usd * 0.003 : undefined;

    return {
      estimated_value_usd: result.estimated_value_usd,
      confidence: result.confidence,
      source: result.source,
      category_id: result.category_id,
      category_name: result.category_name,
      suggested_daily_rate_usd: suggestedRate,
    };
  }

  /**
   * Calculate suggested daily rate for a category
   * Uses base_rate_multiplier from category
   */
  async calculateSuggestedRate(params: {
    categoryId: string;
    estimatedValueUsd?: number;
  }): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('vehicle_categories')
      .select('base_rate_multiplier')
      .eq('id', params.categoryId)
      .single();

    if (error || !data) {
      return null;
    }

    // If we have estimated value, use it
    if (params.estimatedValueUsd) {
      return params.estimatedValueUsd * 0.003; // 0.3% of value per day
    }

    // Otherwise use category default (e.g., 0.35% for Economy)
    // Assume average vehicle value by category:
    // Economy: $8k, Standard: $15k, Premium: $35k, Luxury: $80k
    const averageValues: Record<string, number> = {
      economy: 8000,
      standard: 15000,
      premium: 35000,
      luxury: 80000,
    };

    const categoryName = Object.keys(averageValues).find((name) =>
      params.categoryId.toLowerCase().includes(name),
    );
    const avgValue = categoryName ? averageValues[categoryName] : 15000;

    return avgValue * (data.base_rate_multiplier / 100);
  }
}
