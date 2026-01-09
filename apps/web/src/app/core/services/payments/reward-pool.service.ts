import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';
import type {
  CommunityReward,
  OwnerPointsSummary,
  RewardPoolStatus,
  OwnerPointsBreakdown,
} from '@core/models/dashboard.model';

/**
 * RewardPoolService
 *
 * Manages owner participation in the cooperative reward pool.
 * Owners earn points based on availability, ratings, seniority, etc.
 * Points are converted to earnings at the end of each month.
 *
 * Key concepts:
 * - Points accumulate throughout the month
 * - Pool is distributed monthly based on total points
 * - Earnings = (MyPoints / TotalPoints) * PoolSize
 */
@Injectable({
  providedIn: 'root',
})
export class RewardPoolService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  // State signals
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<OwnerPointsSummary | null>(null);
  readonly poolStatus = signal<RewardPoolStatus | null>(null);

  // Computed values
  readonly currentMonthPoints = computed(() => this.summary()?.currentMonth?.points?.total_points ?? 0);
  readonly estimatedEarnings = computed(() => this.summary()?.currentMonth?.estimatedEarnings ?? 0);
  readonly lastMonthEarnings = computed(() => this.summary()?.lastMonth?.earnings ?? 0);
  readonly totalEarnedAllTime = computed(() => this.summary()?.totalEarnedAllTime ?? 0);

  /**
   * Load complete points summary for current owner
   */
  async loadOwnerSummary(): Promise<OwnerPointsSummary | null> {
    const userId = this.authService.userId();
    if (!userId) {
      this.error.set('Usuario no autenticado');
      return null;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Fetch current month rewards
      const { data: currentReward, error: currentError } = await this.supabase
        .from('community_rewards')
        .select('*')
        .eq('owner_id', userId)
        .eq('period_year', currentYear)
        .eq('period_month', currentMonth)
        .maybeSingle();

      if (currentError) throw currentError;

      // Fetch last month rewards
      const { data: lastReward, error: lastError } = await this.supabase
        .from('community_rewards')
        .select('*')
        .eq('owner_id', userId)
        .eq('period_year', lastMonthYear)
        .eq('period_month', lastMonth)
        .maybeSingle();

      if (lastError) throw lastError;

      // Fetch current pool status
      const { data: poolData, error: poolError } = await this.supabase
        .from('reward_pool')
        .select('*')
        .eq('period_year', currentYear)
        .eq('period_month', currentMonth)
        .maybeSingle();

      if (poolError) throw poolError;

      // Fetch history (last 6 months)
      const { data: historyData, error: historyError } = await this.supabase
        .from('community_rewards')
        .select('*')
        .eq('owner_id', userId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(6);

      if (historyError) throw historyError;

      // Calculate total earned all time
      const { data: totalData, error: totalError } = await this.supabase
        .from('community_rewards')
        .select('amount_cents')
        .eq('owner_id', userId)
        .in('status', ['approved', 'paid']);

      if (totalError) throw totalError;

      const totalEarned = (totalData || []).reduce(
        (sum, r) => sum + (r.amount_cents || 0),
        0
      );

      // Build summary
      const emptyPoints: OwnerPointsBreakdown = {
        availability_points: 0,
        rating_points: 0,
        seniority_points: 0,
        referral_points: 0,
        response_time_points: 0,
        participation_points: 0,
        bonus_points: 0,
        penalty_points: 0,
        total_points: 0,
      };

      const currentPoints: OwnerPointsBreakdown = currentReward
        ? {
            availability_points: currentReward.availability_points || 0,
            rating_points: currentReward.rating_points || 0,
            seniority_points: currentReward.seniority_points || 0,
            referral_points: currentReward.referral_points || 0,
            response_time_points: currentReward.response_time_points || 0,
            participation_points: currentReward.participation_points || 0,
            bonus_points: currentReward.bonus_points || 0,
            penalty_points: currentReward.penalty_points || 0,
            total_points: currentReward.total_points || 0,
          }
        : emptyPoints;

      // Estimate earnings based on current pool
      let estimatedEarnings = 0;
      if (poolData && poolData.total_available_cents > 0 && currentPoints.total_points > 0) {
        // If we have cents_per_point, use it; otherwise estimate
        if (poolData.cents_per_point) {
          estimatedEarnings = currentPoints.total_points * poolData.cents_per_point;
        } else if (poolData.total_points_in_period > 0) {
          estimatedEarnings =
            (currentPoints.total_points / poolData.total_points_in_period) *
            poolData.total_available_cents;
        }
      }

      const summary: OwnerPointsSummary = {
        currentMonth: {
          year: currentYear,
          month: currentMonth,
          points: currentPoints,
          estimatedEarnings: Math.round(estimatedEarnings),
          status: currentReward?.status || 'pending',
        },
        lastMonth: lastReward
          ? {
              year: lastMonthYear,
              month: lastMonth,
              points: {
                availability_points: lastReward.availability_points || 0,
                rating_points: lastReward.rating_points || 0,
                seniority_points: lastReward.seniority_points || 0,
                referral_points: lastReward.referral_points || 0,
                response_time_points: lastReward.response_time_points || 0,
                participation_points: lastReward.participation_points || 0,
                bonus_points: lastReward.bonus_points || 0,
                penalty_points: lastReward.penalty_points || 0,
                total_points: lastReward.total_points || 0,
              },
              earnings: lastReward.amount_cents || 0,
              status: lastReward.status || 'pending',
            }
          : null,
        poolStatus: poolData
          ? {
              period_year: poolData.period_year,
              period_month: poolData.period_month,
              contributions_cents: poolData.contributions_cents || 0,
              total_points_in_period: poolData.total_points_in_period || 0,
              cents_per_point: poolData.cents_per_point,
              total_available_cents: poolData.total_available_cents || 0,
              total_distributed_cents: poolData.total_distributed_cents || 0,
              status: poolData.status || 'open',
            }
          : null,
        history: (historyData || []) as CommunityReward[],
        totalEarnedAllTime: totalEarned,
      };

      this.summary.set(summary);
      this.poolStatus.set(summary.poolStatus);
      this.loading.set(false);

      return summary;
    } catch (err) {
      console.error('[RewardPoolService] Error loading summary:', err);
      this.error.set('Error al cargar los puntos. Intentá de nuevo.');
      this.loading.set(false);
      return null;
    }
  }

  /**
   * Get current pool status (public info)
   */
  async getCurrentPoolStatus(): Promise<RewardPoolStatus | null> {
    try {
      const now = new Date();
      const { data, error } = await this.supabase
        .from('reward_pool')
        .select('*')
        .eq('period_year', now.getFullYear())
        .eq('period_month', now.getMonth() + 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const status: RewardPoolStatus = {
          period_year: data.period_year,
          period_month: data.period_month,
          contributions_cents: data.contributions_cents || 0,
          total_points_in_period: data.total_points_in_period || 0,
          cents_per_point: data.cents_per_point,
          total_available_cents: data.total_available_cents || 0,
          total_distributed_cents: data.total_distributed_cents || 0,
          status: data.status || 'open',
        };
        this.poolStatus.set(status);
        return status;
      }

      return null;
    } catch (err) {
      console.error('[RewardPoolService] Error getting pool status:', err);
      return null;
    }
  }

  /**
   * Format month name in Spanish
   */
  getMonthName(month: number): string {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return months[month - 1] || '';
  }

  /**
   * Get status label in Spanish
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      calculated: 'Calculado',
      approved: 'Aprobado',
      paid: 'Pagado',
      open: 'Abierto',
      calculating: 'Calculando',
      distributed: 'Distribuido',
    };
    return labels[status] || status;
  }

  /**
   * Get status color class
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'text-warning-text bg-warning-bg',
      calculated: 'text-primary-600 bg-primary-50',
      approved: 'text-success-text bg-success-bg',
      paid: 'text-success-strong bg-success-bg',
      open: 'text-primary-600 bg-primary-50',
      calculating: 'text-warning-text bg-warning-bg',
      distributed: 'text-success-strong bg-success-bg',
    };
    return colors[status] || 'text-text-secondary bg-surface-base';
  }
}
