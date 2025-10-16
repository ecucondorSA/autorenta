import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface QuoteBreakdown {
  price_subtotal: number;
  discount: number;
  service_fee: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PricingService {
  private readonly supabase = injectSupabase();

  async quoteBooking(params: {
    carId: string;
    start: string;
    end: string;
    promoCode?: string;
  }): Promise<QuoteBreakdown> {
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
    return data[0] as QuoteBreakdown;
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
