import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import type {
  CreditReport,
  CreditVerifyRequest,
  CreditVerifyResponse,
  CreditEligibility,
  CreditSummary,
  CreditRiskLevel,
} from '@core/models';

/**
 * Nosis Credit Verification Service (Argentina)
 *
 * Provides credit verification for Argentine users via Nosis/Veraz API.
 * Used to assess risk before approving car rentals.
 *
 * Features:
 * - Credit score verification (1-999 scale)
 * - BCRA status lookup (Central Bank classification)
 * - Financial flags (bounced checks, lawsuits, bankruptcy)
 * - Eligibility check with deposit requirements
 * - 30-day report caching
 *
 * Usage:
 * ```typescript
 * const nosis = inject(NosisService);
 *
 * // Verify credit
 * await nosis.verifyCredit('DNI', '12345678');
 *
 * // Check eligibility for booking
 * const eligibility = await nosis.checkEligibility();
 * if (!eligibility.eligible) {
 *   console.log(eligibility.reason);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NosisService implements OnDestroy {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('NosisService');

  // Realtime subscription
  private realtimeChannel?: RealtimeChannel;
  private currentUserId: string | null = null;

  // Reactive state
  readonly creditReport = signal<CreditReport | null>(null);
  readonly creditSummary = signal<CreditSummary | null>(null);
  readonly eligibility = signal<CreditEligibility | null>(null);
  readonly loading = signal(false);
  readonly verifying = signal(false);
  readonly error = signal<string | null>(null);

  // Computed values
  readonly hasValidReport = computed(() => {
    const summary = this.creditSummary();
    return summary?.has_report && summary?.is_valid;
  });

  readonly creditScore = computed(() => this.creditReport()?.credit_score ?? null);

  readonly riskLevel = computed(() => this.creditReport()?.risk_level ?? null);

  readonly isEligible = computed(() => this.eligibility()?.eligible ?? false);

  readonly requiresHigherDeposit = computed(
    () => this.eligibility()?.requires_higher_deposit ?? false,
  );

  readonly depositMultiplier = computed(
    () => this.eligibility()?.suggested_deposit_multiplier ?? 1.0,
  );

  readonly hasIssues = computed(() => {
    const report = this.creditReport();
    if (!report) return false;
    return report.has_bounced_checks || report.has_lawsuits || report.has_bankruptcy;
  });

  readonly daysUntilExpiry = computed(() => this.creditSummary()?.days_until_expiry ?? null);

  /**
   * Verify credit using Nosis API
   *
   * @param documentType - 'DNI', 'CUIT', or 'CUIL'
   * @param documentNumber - Document number (cleaned of dots/dashes)
   * @returns Verification response
   */
  async verifyCredit(
    documentType: CreditVerifyRequest['document_type'],
    documentNumber: string,
  ): Promise<CreditVerifyResponse> {
    this.verifying.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      this.logger.info('Verifying credit', { documentType, userId: user.id });

      // Call Edge Function
      const { data, error } = await this.supabase.functions.invoke<CreditVerifyResponse>(
        'nosis-verify',
        {
          body: {
            document_type: documentType,
            document_number: documentNumber,
            user_id: user.id,
          },
        },
      );

      if (error) {
        this.logger.error('Credit verification failed', error);
        throw new Error(error.message || 'Error al verificar crédito');
      }

      if (!data) {
        throw new Error('No se recibió respuesta del servicio');
      }

      this.logger.info('Credit verification completed', {
        success: data.success,
        cached: data.cached,
        riskLevel: data.risk_level,
      });

      // Refresh local data
      await this.loadCreditReport();
      await this.loadCreditSummary();

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al verificar crédito';
      this.error.set(message);
      throw err;
    } finally {
      this.verifying.set(false);
    }
  }

  /**
   * Load user's credit report from database
   */
  async loadCreditReport(): Promise<CreditReport | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('credit_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error('Failed to load credit report', error);
        throw error;
      }

      this.creditReport.set(data as CreditReport | null);
      return data as CreditReport | null;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar reporte de crédito';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Load credit summary for display
   */
  async loadCreditSummary(): Promise<CreditSummary | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return null;
      }

      // Use the database function
      const { data, error } = await this.supabase.rpc('get_user_credit_report', {
        p_user_id: user.id,
      });

      if (error) {
        // PGRST116 = no rows returned, not an error for us
        if (error.code === 'PGRST116') {
          const emptySummary: CreditSummary = {
            has_report: false,
            is_valid: false,
            credit_score: null,
            risk_level: null,
            risk_label: 'Sin evaluar',
            verified_at: null,
            expires_at: null,
            days_until_expiry: null,
            issues: [],
          };
          this.creditSummary.set(emptySummary);
          return emptySummary;
        }
        throw error;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        const emptySummary: CreditSummary = {
          has_report: false,
          is_valid: false,
          credit_score: null,
          risk_level: null,
          risk_label: 'Sin evaluar',
          verified_at: null,
          expires_at: null,
          days_until_expiry: null,
          issues: [],
        };
        this.creditSummary.set(emptySummary);
        return emptySummary;
      }

      const row = Array.isArray(data) ? data[0] : data;

      // Calculate days until expiry
      let daysUntilExpiry: number | null = null;
      if (row.expires_at) {
        const expiresAt = new Date(row.expires_at);
        const now = new Date();
        daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      // Build issues list
      const issues: string[] = [];
      if (row.has_bounced_checks) issues.push('Cheques rechazados');
      if (row.has_lawsuits) issues.push('Juicios activos');
      if (row.has_bankruptcy) issues.push('Historial de quiebra');

      const summary: CreditSummary = {
        has_report: true,
        is_valid: row.is_valid ?? false,
        credit_score: row.credit_score,
        risk_level: row.risk_level as CreditRiskLevel,
        risk_label: this.getRiskLabelLocal(row.risk_level as CreditRiskLevel),
        verified_at: row.verified_at,
        expires_at: row.expires_at,
        days_until_expiry: daysUntilExpiry,
        issues,
      };

      this.creditSummary.set(summary);
      return summary;
    } catch (err) {
      this.logger.error('Failed to load credit summary', err);
      return null;
    }
  }

  /**
   * Check eligibility to rent a car
   *
   * @param dailyPrice - Optional daily rental price for deposit calculation
   */
  async checkEligibility(dailyPrice = 0): Promise<CreditEligibility> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('check_credit_eligibility', {
        p_user_id: user.id,
        p_rental_daily_price: dailyPrice,
      });

      if (error) {
        throw error;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        const notEligible: CreditEligibility = {
          eligible: false,
          reason: 'Verificación crediticia requerida',
          credit_score: null,
          risk_level: null,
          requires_higher_deposit: false,
          suggested_deposit_multiplier: 1.0,
        };
        this.eligibility.set(notEligible);
        return notEligible;
      }

      const row = Array.isArray(data) ? data[0] : data;

      const eligibility: CreditEligibility = {
        eligible: row.eligible,
        reason: row.reason,
        credit_score: row.credit_score,
        risk_level: row.risk_level as CreditRiskLevel,
        requires_higher_deposit: row.requires_higher_deposit,
        suggested_deposit_multiplier: row.suggested_deposit_multiplier,
      };

      this.eligibility.set(eligibility);
      return eligibility;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al verificar elegibilidad';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refresh all credit data
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadCreditReport(),
      this.loadCreditSummary(),
      this.checkEligibility(),
    ]);
  }

  /**
   * Subscribe to realtime updates for credit report changes
   */
  async subscribeToRealtimeUpdates(): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return;
      }

      this.currentUserId = user.id;

      // Unsubscribe from previous channel
      this.unsubscribeFromRealtime();

      // Create new channel
      this.realtimeChannel = this.supabase
        .channel(`credit_reports_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_reports',
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            this.logger.debug('Credit report changed via realtime, refreshing...');
            await this.refresh();
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            this.logger.error('Realtime channel error');
          } else if (status === 'SUBSCRIBED') {
            this.logger.debug('Realtime subscription active');
          }
        });
    } catch (err) {
      this.logger.error('Failed to subscribe to realtime', err);
    }
  }

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromRealtime(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Get human-readable risk label (local copy to avoid import issues)
   */
  private getRiskLabelLocal(level: CreditRiskLevel | null): string {
    switch (level) {
      case 'low':
        return 'Riesgo Bajo';
      case 'medium':
        return 'Riesgo Medio';
      case 'high':
        return 'Riesgo Alto';
      case 'critical':
        return 'Riesgo Crítico';
      default:
        return 'Sin evaluar';
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.unsubscribeFromRealtime();
  }
}
