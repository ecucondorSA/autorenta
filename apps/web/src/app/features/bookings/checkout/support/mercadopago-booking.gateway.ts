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

type MercadoPagoGatewayError = Error & { code?: string; meta?: unknown };
type EdgeFunctionErrorPayload = {
  code?: string;
  error?: string;
  message?: string;
  meta?: unknown;
};

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
      const parsed = this.parseEdgeError(error);

      if (parsed?.code === 'OWNER_ONBOARDING_REQUIRED') {
        const onboardingError = new Error(
          parsed.message ??
            'El propietario todavía no completó la vinculación de Mercado Pago. Te avisaremos cuando puedas pagar.',
        ) as MercadoPagoGatewayError;
        onboardingError.code = parsed.code;
        onboardingError.meta = parsed.meta;
        throw onboardingError;
      }

      throw new Error(
        parsed?.message ?? error.message ?? 'No se pudo crear la preferencia de Mercado Pago',
      );
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

  private parseEdgeError(error: {
    message?: string;
    [key: string]: unknown;
  }): EdgeFunctionErrorPayload | null {
    if (!error) {
      return null;
    }

    const candidates: Array<unknown> = [
      error.message,
      (error as { details?: unknown }).details,
      (error as { name?: unknown }).name,
    ];

    let fallbackMessage: string | undefined;

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const trimmed = candidate.trim();
      if (!trimmed) {
        continue;
      }

      try {
        const parsed = JSON.parse(trimmed) as EdgeFunctionErrorPayload;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        if (!fallbackMessage) {
          fallbackMessage = trimmed;
        }
      }
    }

    return fallbackMessage ? { message: fallbackMessage } : null;
  }
}
