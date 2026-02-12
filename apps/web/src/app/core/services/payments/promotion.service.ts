import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface PromoCode {
  code: string;
  percent_off: number | null;
  amount_off: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class PromotionService {
  private supabase = injectSupabase();

  async validatePromoCode(
    code: string,
  ): Promise<{ valid: boolean; promo?: PromoCode; error?: string }> {
    const { data, error } = await this.supabase
      .from('promos')
      .select('code, percent_off, amount_off, valid_from, valid_to')
      .eq('code', code)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Código inválido' };
    }

    const nowMs = Date.now();
    const validFromMs =
      typeof data.valid_from === 'string' ? Date.parse(data.valid_from) : Number.NaN;
    const validToMs = typeof data.valid_to === 'string' ? Date.parse(data.valid_to) : Number.NaN;

    if (!Number.isNaN(validFromMs) && nowMs < validFromMs) {
      return { valid: false, error: 'El código promocional aún no está vigente' };
    }

    if (!Number.isNaN(validToMs) && nowMs > validToMs) {
      return { valid: false, error: 'El código promocional ya expiró' };
    }

    return {
      valid: true,
      promo: {
        code: data.code,
        percent_off: data.percent_off,
        amount_off: data.amount_off,
      },
    };
  }
}
