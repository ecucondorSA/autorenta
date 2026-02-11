import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentsFeatureFacadeService {
  private readonly supabase = injectSupabase();

  async getLatestUsdArsRate(): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('exchange_rates')
      .select('rate')
      .eq('pair', 'USDARS')
      .eq('is_active', true)
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.rate ? Number(data.rate) : null;
  }

  async initiateWalletDeposit(params: {
    userId: string;
    amountCentsUsd: number;
    provider: string;
  }): Promise<string> {
    const { data, error } = await this.supabase.rpc('wallet_initiate_deposit', {
      p_user_id: params.userId,
      p_amount: params.amountCentsUsd,
      p_provider: params.provider,
    });

    if (error) {
      throw error;
    }

    return data as string;
  }

  async invokeFunction<T>(params: {
    name: string;
    body?: Record<string, unknown>;
    accessToken?: string | null;
  }): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke(params.name, {
      body: params.body,
      headers: params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {},
    });

    if (error) {
      throw error;
    }

    return data as T;
  }
}
