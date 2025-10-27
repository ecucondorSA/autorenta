import { Injectable } from '@angular/core';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';

export interface MercadoPagoPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  amountArs: number;
  amountUsd: number;
  exchangeRate: number;
}

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoBookingGateway {
  constructor(private readonly supabase: SupabaseClientService) {}

  async createPreference(bookingId: string): Promise<MercadoPagoPreferenceResponse> {
    const client = this.supabase.getClient();
    const { data, error } = await client.functions.invoke('mercadopago-create-booking-preference', {
      body: { booking_id: bookingId },
    });

    if (error) {
      throw new Error(error.message ?? 'No se pudo crear la preferencia de MercadoPago');
    }

    if (!data?.init_point) {
      throw new Error('La Edge Function no devolvió el init_point de MercadoPago');
    }

    return {
      preferenceId: data.preference_id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      amountArs: data.amount_ars,
      amountUsd: data.amount_usd,
      exchangeRate: data.exchange_rate,
    };
  }
}
