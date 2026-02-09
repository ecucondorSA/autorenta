import { Injectable, inject, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { BcraService } from './bcra.service';

export interface TrustAssessment {
  id: string;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  decision: 'approve' | 'manual_review' | 'reject';
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class TrustService {
  private readonly supabase = injectSupabase();
  private readonly bcraService = inject(BcraService);

  readonly currentTrust = signal<TrustAssessment | null>(null);
  readonly loading = signal(false);

  /**
   * Get latest trust assessment for current user
   */
  async fetchTrustStatus() {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('risk_assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // PGRST116 = no rows, 406 = table doesn't exist or RLS denied
      if (error && !['PGRST116', '42P01'].includes(error.code ?? '')) {
        // Only log if it's not a known "table missing" error
        if (error.message?.includes('406') || error.code === 'PGRST200') {
          console.debug('[TrustService] risk_assessments table not ready yet');
        } else {
          throw error;
        }
      }

      this.currentTrust.set(data as TrustAssessment | null);
      return data;
    } catch (err) {
      console.debug('[TrustService] Trust status unavailable:', err);
      this.currentTrust.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Force a recalculation (e.g. after uploading new docs)
   */
  async recalculateTrust() {
    this.loading.set(true);
    try {
      const { data: userData } = await this.supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) throw new Error('No user logged in');

      // 1. Get User Profile to find CUIT
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('cuit, document_number')
        .eq('id', userId)
        .single();

      // 2. If CUIT exists, run BCRA Check (Async/Background ideally, but here inline for demo)
      if (profile?.cuit) {
        try {
          // We subscribe to observable and convert to promise
          // Note: In a real flow, this might be triggered by a "Verify Financials" button
          // or be part of the Edge Function logic directly to keep backend secure.
          // For now, we assume the RPC 'calculate_user_risk_score' handles the aggregation,
          // but we might need to populate the 'background_checks' table first.
          // TODO: Call verifyFinancialSolvency here if we want to update background_checks table
          // await this.verifyFinancialSolvency(profile.cuit);
        } catch (e) {
          console.warn('BCRA check failed silently', e);
        }
      }

      // 3. Call Core Risk Engine (RPC)
      const { data, error } = await this.supabase.rpc('calculate_user_risk_score', {
        p_user_id: userId,
      });

      if (error) throw error;

      // Refresh local state
      await this.fetchTrustStatus();
      return data;
    } catch (err) {
      console.error('Error calculating trust:', err);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Runs financial solvency check and updates background_checks table
   */
  async verifyFinancialSolvency(cuit: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bcraService.checkSituation(cuit).subscribe({
        next: async (result) => {
          // Save result to 'background_checks' table so the RPC can read it
          const { error } = await this.supabase.from('background_checks').insert({
            user_id: (await this.supabase.auth.getUser()).data.user?.id,
            provider: 'bcra_api',
            status: result.max_situation <= 2 ? 'clear' : 'rejected',
            raw_data: result,
            debt_record_found: result.max_situation > 1,
          });

          if (error) reject(error);
          else resolve();
        },
        error: (err) => reject(err),
      });
    });
  }
}
