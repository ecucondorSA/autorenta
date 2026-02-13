import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import type { Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class PaymentsFeatureFacadeService {
  private readonly supabase = injectSupabase();

  private async getAccessToken(preferredToken?: string | null): Promise<string | null> {
    if (preferredToken) return preferredToken;

    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  }

  private isUnauthorizedError(error: unknown): boolean {
    const err = error as { status?: number; context?: { status?: number }; message?: string } | null;
    const status = err?.status ?? err?.context?.status;
    if (status === 401) return true;

    const message = typeof err?.message === 'string' ? err.message : '';
    return message.includes('Missing authorization header') || message.includes('Invalid or expired token');
  }

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
    const attemptInvoke = async (session: Session | null, accessToken: string | null): Promise<T> => {
      const invokeParams: { body?: Record<string, unknown>; headers?: Record<string, string> } = {
        body: params.body,
      };

      // Only set headers when we have a token. Passing `{}` can override client defaults and
      // lead to "Missing authorization header" on Edge Functions with verify_jwt enabled.
      if (accessToken) {
        invokeParams.headers = { Authorization: `Bearer ${accessToken}` };
      } else if (!session) {
        throw new Error('No autenticado');
      }

      const { data, error } = await this.supabase.functions.invoke(params.name, invokeParams);
      if (error) {
        throw error;
      }
      return data as T;
    };

    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    let accessToken = await this.getAccessToken(params.accessToken);
    try {
      return await attemptInvoke(session, accessToken);
    } catch (error: unknown) {
      // If the access token is missing/expired, refresh and retry once.
      if (this.isUnauthorizedError(error)) {
        const refreshed = await this.refreshAccessToken();
        accessToken = refreshed;
        const {
          data: { session: refreshedSession },
        } = await this.supabase.auth.getSession();
        return await attemptInvoke(refreshedSession, accessToken);
      }
      throw error;
    }

    // unreachable
  }
}
