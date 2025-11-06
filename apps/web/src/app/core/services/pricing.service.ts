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
      const distanceData = await this.calculateDeliveryFee(
        params.carId,
        params.userLocation
      );

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
    userLocation: LocationCoords
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
      car.location_lng
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
}
