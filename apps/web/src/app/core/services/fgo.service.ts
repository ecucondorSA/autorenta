import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class FgoService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = inject(SupabaseClientService).getClient();
  }

  async getFgoBalance(): Promise<number> {
    const { data, error } = await this.supabase
      .from('fgo_ledger')
      .select('amount_usd, transaction_type');

    if (error) {
      console.error('Error fetching FGO ledger:', error);
      throw error;
    }

    const balance = data.reduce((acc, transaction) => {
      if (
        transaction.transaction_type === 'FGO_CONTRIBUTION' ||
        transaction.transaction_type === 'FGO_RECOVERY'
      ) {
        return acc + transaction.amount_usd;
      } else {
        return acc - transaction.amount_usd;
      }
    }, 0);

    return balance;
  }

  async getReserveCoefficient(): Promise<number> {
    const fgoBalance = await this.getFgoBalance();

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await this.supabase
      .from('fgo_ledger')
      .select('amount_usd')
      .eq('transaction_type', 'FGO_PAYOUT')
      .gte('created_at', ninetyDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching FGO payouts:', error);
      throw error;
    }

    const totalPayouts = data.reduce((acc, transaction) => acc + transaction.amount_usd, 0);

    if (totalPayouts === 0) {
      return Infinity;
    }

    return fgoBalance / totalPayouts;
  }

  async getContributionAlpha(): Promise<number> {
    const rc = await this.getReserveCoefficient();

    if (rc < 0.9) {
      return 0.2;
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data, error } = await this.supabase
      .from('fgo_ledger')
      .select('rc_snapshot')
      .gte('created_at', sixtyDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching FGO ledger for RC check:', error);
      throw error;
    }

    const allRcsAbove1_2 = data.every(
      (transaction) => transaction.rc_snapshot && transaction.rc_snapshot > 1.2,
    );

    if (allRcsAbove1_2) {
      return 0.1;
    }

    return 0.15;
  }

  async addContribution(amount: number, bookingId: string, fxRate: number): Promise<void> {
    const rc = await this.getReserveCoefficient();
    const { error } = await this.supabase.from('fgo_ledger').insert([
      {
        booking_id: bookingId,
        transaction_type: 'FGO_CONTRIBUTION',
        amount_usd: amount,
        fx_snapshot: fxRate,
        rc_snapshot: rc,
      },
    ]);

    if (error) {
      console.error('Error adding FGO contribution:', error);
      throw error;
    }
  }

  async addPayout(amount: number, bookingId: string, fxRate: number): Promise<void> {
    const rc = await this.getReserveCoefficient();
    const { error } = await this.supabase.from('fgo_ledger').insert([
      {
        booking_id: bookingId,
        transaction_type: 'FGO_PAYOUT',
        amount_usd: amount,
        fx_snapshot: fxRate,
        rc_snapshot: rc,
      },
    ]);

    if (error) {
      console.error('Error adding FGO payout:', error);
      throw error;
    }
  }

  async addRecovery(amount: number, bookingId: string, fxRate: number): Promise<void> {
    const rc = await this.getReserveCoefficient();
    const { error } = await this.supabase.from('fgo_ledger').insert([
      {
        booking_id: bookingId,
        transaction_type: 'FGO_RECOVERY',
        amount_usd: amount,
        fx_snapshot: fxRate,
        rc_snapshot: rc,
      },
    ]);

    if (error) {
      console.error('Error adding FGO recovery:', error);
      throw error;
    }
  }
}
