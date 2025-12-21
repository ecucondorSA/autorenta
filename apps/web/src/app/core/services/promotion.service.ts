import { Injectable } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

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

    // TODO: Validar fechas (valid_from, valid_to) aquí
    return { valid: true, promo: data };
  }
}
