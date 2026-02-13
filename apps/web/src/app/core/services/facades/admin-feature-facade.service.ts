import { Injectable } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class AdminFeatureFacadeService {
  private readonly supabase = injectSupabase();

  async listAccidents(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('accidents')
      .select(
        `
          *,
          reporter:profiles!accidents_reporter_id_fkey(full_name),
          booking:bookings!accidents_booking_id_fkey(
            car:cars(brand, model, year)
          )
        `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async updateAccident(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('accidents').update(payload).eq('id', id);

    if (error) {
      throw error;
    }
  }

  async listConversionEvents(limit: number = 1000): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('conversion_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async getCoverageFund(): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase.from('coverage_fund').select('*').single();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) || {};
  }

  async listWalletLedgerByKinds(params: {
    kinds: string[];
    limit?: number;
    orderBy?: 'ts' | 'created_at';
  }): Promise<Array<Record<string, unknown>>> {
    let query = this.supabase.from('wallet_ledger').select('*').in('kind', params.kinds);

    if (params.orderBy) {
      query = query.order(params.orderBy, { ascending: false });
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listDepositTransactions(params: {
    status?: 'pending' | 'completed' | 'failed';
    limit?: number;
  }): Promise<Array<Record<string, unknown>>> {
    let query = this.supabase
      .from('wallet_transactions')
      .select('*, profiles!wallet_transactions_user_id_fkey(first_name, last_name)')
      .eq('type', 'deposit')
      .order(params.status === 'completed' ? 'completed_at' : 'updated_at', { ascending: false });

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listAllDepositTransactionsForStats(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('wallet_transactions')
      .select('status, amount, created_at, completed_at')
      .eq('type', 'deposit');

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async getSessionAccessToken(): Promise<string | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return session?.access_token ?? null;
  }

  async listActiveExchangeRates(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('exchange_rates')
      .select('*')
      .eq('is_active', true)
      .order('pair', { ascending: true });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listExchangeRateHistory(pair: string, limit: number = 24): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('exchange_rates')
      .select('*')
      .eq('pair', pair)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
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

  async listMarketingQueue(limit: number = 100): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('marketing_content_queue')
      .select('*')
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listMarketingPosts(limit: number = 50): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('marketing_posts_log')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async insertMarketingQueue(payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('marketing_content_queue').insert(payload);

    if (error) {
      throw error;
    }
  }

  async updateMarketingQueue(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('marketing_content_queue').update(payload).eq('id', id);

    if (error) {
      throw error;
    }
  }

  async deleteMarketingQueue(id: string): Promise<void> {
    const { error } = await this.supabase.from('marketing_content_queue').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }

  async listPricingRules(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('pricing_rules')
      .select('*')
      .order('priority', { ascending: true });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async createPricingRule(payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('pricing_rules').insert(payload);

    if (error) {
      throw error;
    }
  }

  async updatePricingRule(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('pricing_rules').update(payload).eq('id', id);

    if (error) {
      throw error;
    }
  }

  async deletePricingRule(id: string): Promise<void> {
    const { error } = await this.supabase.from('pricing_rules').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }

  async getAppConfig(configKey: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', configKey)
      .single();

    if (error) {
      return null;
    }

    return (data?.config_value as string) ?? null;
  }

  async upsertAppConfig(configKey: string, configValue: string): Promise<void> {
    const { error } = await this.supabase
      .from('app_config')
      .upsert({
        config_key: configKey,
        config_value: configValue,
      })
      .eq('config_key', configKey);

    if (error) {
      throw error;
    }
  }

  async listCompletedBookings(limit: number = 10): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('id, car_id, renter_id, owner_id')
      .eq('status', 'completed')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listClaims(statusFilter?: string): Promise<Array<Record<string, unknown>>> {
    let query = this.supabase
      .from('claims')
      .select('id, booking_id, reported_by, damages, total_estimated_cost_usd, status, notes, locked_at, locked_by, processed_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listUpcomingCampaigns(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase.from('upcoming_scheduled_campaigns').select('*');

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listRecentlyPublishedCampaigns(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase.from('recently_published_campaigns').select('*');

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async createCampaignSchedule(payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('campaign_schedules').insert(payload);

    if (error) {
      throw error;
    }
  }

  async getCampaignScheduleById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('campaign_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async updateCampaignSchedule(id: string, payload: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('campaign_schedules').update(payload).eq('id', id);

    if (error) {
      throw error;
    }
  }

  async listAdvisoryLocksHeld(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase.from('v_advisory_locks_held').select('*');

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async listTrafficInfractions(): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from('traffic_infractions')
      .select(
        `
          *,
          renter:profiles!traffic_infractions_renter_id_fkey(full_name),
          owner:profiles!traffic_infractions_owner_id_fkey(full_name)
        `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as Array<Record<string, unknown>>) || [];
  }

  async resolveTrafficInfractionDispute(params: {
    infractionId: string;
    inFavorOfRenter: boolean;
    resolutionNotes: string;
  }): Promise<void> {
    const { error } = await this.supabase.rpc('resolve_traffic_infraction_dispute', {
      p_infraction_id: params.infractionId,
      p_in_favor_of_renter: params.inFavorOfRenter,
      p_resolution_notes: params.resolutionNotes,
    });

    if (error) {
      throw error;
    }
  }
}
