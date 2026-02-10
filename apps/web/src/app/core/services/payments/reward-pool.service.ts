import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';
import type {
  CommunityReward,
  OwnerPointsSummary,
  RewardPoolStatus,
  OwnerPointsBreakdown,
  OwnerMonthlyPointsSummary,
  CarDailyPoints,
  VAStatus,
  RewardPoolConfigSenior,
} from '@core/models/dashboard.model';
import {
  getFactorQuality,
  BASE_POINTS_PER_DAY,
  MAX_CARS_PER_OWNER,
  MAX_POOL_SHARE_PER_OWNER,
  VA_THRESHOLDS,
} from '@core/models/reward-pool.model';

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
  readonly currentMonthPoints = computed(
    () => this.summary()?.currentMonth?.points?.total_points ?? 0,
  );
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

      const totalEarned = (totalData || []).reduce((sum, r) => sum + (r.amount_cents || 0), 0);

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

  // ============================================================================
  // SENIOR MODEL: Multiplicative Points System
  // ============================================================================

  // Senior model signals
  readonly seniorSummary = signal<OwnerMonthlyPointsSummary | null>(null);
  readonly carDailyPoints = signal<CarDailyPoints[]>([]);
  readonly poolConfig = signal<RewardPoolConfigSenior | null>(null);

  // Computed for senior model
  readonly totalPointsSenior = computed(() => this.seniorSummary()?.totalPoints ?? 0);
  readonly estimatedPayoutUsd = computed(() => this.seniorSummary()?.payoutUsd ?? 0);
  readonly eligibleCars = computed(() => this.seniorSummary()?.carsContributing ?? 0);
  readonly isEligible = computed(() => this.seniorSummary()?.isEligible ?? false);

  /**
   * Load senior model summary for current owner
   * Uses the new daily_car_points and owner_monthly_summary tables
   */
  async loadSeniorSummary(): Promise<OwnerMonthlyPointsSummary | null> {
    const userId = this.authService.userId();
    if (!userId) {
      this.error.set('Usuario no autenticado');
      return null;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      // Fetch monthly summary
      const { data: summaryData, error: summaryError } = await this.supabase
        .from('owner_monthly_summary')
        .select('*')
        .eq('owner_id', userId)
        .eq('month', currentMonth)
        .maybeSingle();

      if (summaryError) throw summaryError;

      // Fetch daily points for this month (per car)
      const { data: dailyData, error: dailyError } = await this.supabase
        .from('daily_car_points')
        .select(
          `
          *,
          cars:car_id (
            id,
            brand,
            model,
            year
          )
        `,
        )
        .eq('owner_id', userId)
        .gte('date', currentMonth)
        .order('date', { ascending: false });

      if (dailyError) throw dailyError;

      // Fetch pool config
      const { data: configData, error: configError } = await this.supabase
        .from('reward_pool_config')
        .select('*')
        .eq('month', currentMonth)
        .maybeSingle();

      if (configError) throw configError;

      // Aggregate daily points by car
      const carPointsMap = new Map<
        string,
        {
          carId: string;
          carTitle: string;
          points: number;
          eligibleDays: number;
          valueFactor: number;
          repFactor: number;
          demandFactor: number;
        }
      >();

      for (const dp of dailyData || []) {
        const carId = dp.car_id;
        const car = dp.cars as { brand?: string; model?: string; year?: number } | null;
        const carTitle = car ? `${car.brand} ${car.model} ${car.year}` : 'Auto';

        const existing = carPointsMap.get(carId);
        if (existing) {
          existing.points += dp.points || 0;
          existing.eligibleDays += dp.is_eligible ? 1 : 0;
        } else {
          carPointsMap.set(carId, {
            carId,
            carTitle,
            points: dp.points || 0,
            eligibleDays: dp.is_eligible ? 1 : 0,
            valueFactor: dp.value_factor || 1,
            repFactor: dp.rep_factor || 1,
            demandFactor: dp.demand_factor || 1,
          });
        }
      }

      const carPointsArray = Array.from(carPointsMap.values()).map((cp) => ({
        ...cp,
        avgDailyPoints: cp.eligibleDays > 0 ? Math.round(cp.points / cp.eligibleDays) : 0,
        factors: {
          valueFactor: cp.valueFactor,
          repFactor: cp.repFactor,
          demandFactor: cp.demandFactor,
        },
      }));

      // Build summary
      const summary: OwnerMonthlyPointsSummary = {
        ownerId: userId,
        month: currentMonth,
        totalPoints:
          summaryData?.total_points || carPointsArray.reduce((sum, c) => sum + c.points, 0),
        eligibleDays:
          summaryData?.eligible_days || carPointsArray.reduce((sum, c) => sum + c.eligibleDays, 0),
        carsContributing:
          summaryData?.cars_contributing || carPointsArray.filter((c) => c.points > 0).length,
        carsCapped:
          summaryData?.cars_capped || Math.max(0, carPointsArray.length - MAX_CARS_PER_OWNER),
        rawShare: summaryData?.raw_share || 0,
        cappedShare: summaryData?.capped_share || 0,
        payoutUsd: summaryData?.payout_usd || 0,
        isEligible: summaryData?.is_eligible ?? true,
        eligibilityReasons: summaryData?.eligibility_reasons || [],
        gamingRiskScore: summaryData?.gaming_risk_score || 0,
        carPoints: carPointsArray.sort((a, b) => b.points - a.points),
      };

      // Build pool config
      if (configData) {
        const poolCfg: RewardPoolConfigSenior = {
          month: currentMonth,
          totalPoolUsd: configData.total_pool_usd || 0,
          totalPointsNetwork: 0, // Would need aggregation
          pointValueUsd: 0,
          maxCarsPerOwner: configData.max_cars_per_owner || MAX_CARS_PER_OWNER,
          maxSharePerOwner: configData.max_share_per_owner || MAX_POOL_SHARE_PER_OWNER,
          vaMaxResponseHours: configData.va_max_response_hours || VA_THRESHOLDS.maxResponseHours,
          vaMinAcceptanceRate: configData.va_min_acceptance_rate || VA_THRESHOLDS.minAcceptanceRate,
          vaMaxCancellationRate:
            configData.va_max_cancellation_rate || VA_THRESHOLDS.maxCancellationRate,
          status: configData.status || 'open',
        };
        this.poolConfig.set(poolCfg);
      }

      this.seniorSummary.set(summary);
      this.carDailyPoints.set(
        (dailyData || []).map((dp) => ({
          carId: dp.car_id,
          carTitle: (dp.cars as { brand?: string; model?: string; year?: number } | null)
            ? `${(dp.cars as { brand: string }).brand} ${(dp.cars as { model: string }).model}`
            : 'Auto',
          date: dp.date,
          points: dp.points || 0,
          isEligible: dp.is_eligible || false,
          basePoints: dp.base_points || BASE_POINTS_PER_DAY,
          vaStatus: dp.va_status || false,
          vaFailureReasons: dp.va_failure_reasons || [],
          valueFactor: dp.value_factor || 1,
          repFactor: dp.rep_factor || 1,
          demandFactor: dp.demand_factor || 1,
          formula: dp.formula || '',
        })),
      );

      this.loading.set(false);
      return summary;
    } catch (err) {
      console.error('[RewardPoolService] Error loading senior summary:', err);
      this.error.set('Error al cargar los puntos. Intentá de nuevo.');
      this.loading.set(false);
      return null;
    }
  }

  /**
   * Get VA status for a specific car
   */
  async getCarVAStatus(carId: string): Promise<VAStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('daily_car_points')
        .select('*')
        .eq('car_id', carId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        isVerified: data.va_status || false,
        failureReasons: data.va_failure_reasons || [],
        metrics: {
          isReadyToBook: data.is_ready_to_book || false,
          responseTimeHours: data.response_time_hours,
          acceptanceRate30d: data.acceptance_rate_30d || 0,
          cancellationRate90d: data.cancellation_rate_90d || 0,
          priceDeviationPct: data.price_deviation_pct,
          isInCooldown: false, // Would need to check cooldowns table
          isOwnerKYC: true, // Would need to check profile
        },
      };
    } catch (err) {
      console.error('[RewardPoolService] Error getting VA status:', err);
      return null;
    }
  }

  /**
   * Get factor quality label for UI
   */
  getFactorQualityLabel(factor: number, type: 'value' | 'rep' | 'demand'): string {
    return getFactorQuality(factor, type);
  }

  /**
   * Get factor color class for UI
   */
  getFactorColor(factor: number, type: 'value' | 'rep' | 'demand'): string {
    const quality = getFactorQuality(factor, type);
    const colors: Record<string, string> = {
      Excellent: 'text-success-strong',
      Good: 'text-success-text',
      'Above Average': 'text-primary-600',
      Standard: 'text-text-primary',
      Average: 'text-text-secondary',
      'Normal Demand': 'text-text-secondary',
      'Below Average': 'text-warning-text',
      'Low Demand': 'text-warning-text',
      Poor: 'text-error-text',
      'Very Low Demand': 'text-error-text',
      Entry: 'text-text-muted',
      Premium: 'text-primary-600',
      'High Demand': 'text-success-strong',
    };
    return colors[quality] || 'text-text-secondary';
  }

  /**
   * Get VA failure reason in Spanish
   */
  getVAFailureLabel(reason: string): string {
    const labels: Record<string, string> = {
      not_ready_to_book: 'Auto no disponible',
      slow_response: 'Respuesta lenta (>12h)',
      low_acceptance: 'Tasa de aceptación baja (<70%)',
      high_cancellation: 'Muchas cancelaciones (>5%)',
      price_too_high: 'Precio muy alto vs mercado',
      in_cooldown: 'En período de cooldown',
      owner_not_kyc: 'KYC no verificado',
    };
    return labels[reason] || reason;
  }

  /**
   * Format points with K suffix for large numbers
   */
  formatPoints(points: number): string {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  }

  // ============================================================================
  // ANTI-FRAUD: Owner-facing status + Admin review queue
  // ============================================================================

  /** Anti-fraud status signals (owner-facing) */
  readonly antifraudLoading = signal(false);
  readonly activeCooldowns = signal<AntifraudCooldown[]>([]);
  readonly activeGamingSignals = signal<AntifraudGamingSignal[]>([]);
  readonly gamingRiskScore = computed(() => this.seniorSummary()?.gamingRiskScore ?? 0);
  readonly hasActiveWarnings = computed(() => this.activeGamingSignals().length > 0);

  /** Admin review queue signals */
  readonly reviewQueue = signal<AdminReviewItem[]>([]);
  readonly reviewQueueLoading = signal(false);
  readonly reviewQueueStats = computed(() => {
    const items = this.reviewQueue();
    return {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      inReview: items.filter((i) => i.status === 'in_review').length,
      highRisk: items.filter((i) => i.riskScore >= 60).length,
    };
  });

  /**
   * Load anti-fraud status for current owner (cooldowns + gaming signals)
   */
  async loadAntifraudStatus(): Promise<void> {
    const userId = this.authService.userId();
    if (!userId) return;

    this.antifraudLoading.set(true);

    try {
      const [cooldownResult, signalResult] = await Promise.all([
        this.supabase
          .from('owner_cooldowns')
          .select('*')
          .eq('owner_id', userId)
          .gt('ends_at', new Date().toISOString())
          .order('ends_at', { ascending: true }),
        this.supabase
          .from('owner_gaming_signals')
          .select('*')
          .eq('owner_id', userId)
          .eq('status', 'active')
          .order('detected_at', { ascending: false })
          .limit(20),
      ]);

      if (cooldownResult.error) throw cooldownResult.error;
      if (signalResult.error) throw signalResult.error;

      this.activeCooldowns.set(
        (cooldownResult.data || []).map((c) => ({
          id: c.id,
          carId: c.car_id,
          reason: c.reason,
          startsAt: c.starts_at,
          endsAt: c.ends_at,
          reasonLabel: this.getCooldownReasonLabel(c.reason),
        })),
      );

      this.activeGamingSignals.set(
        (signalResult.data || []).map((s) => ({
          id: s.id,
          signalType: s.signal_type,
          riskScore: s.risk_score,
          detectedAt: s.detected_at,
          details: s.details,
          signalLabel: this.getGamingSignalLabel(s.signal_type),
        })),
      );
    } catch (err) {
      console.error('[RewardPoolService] Error loading anti-fraud status:', err);
    } finally {
      this.antifraudLoading.set(false);
    }
  }

  /**
   * Load admin review queue (admin only)
   */
  async loadAdminReviewQueue(): Promise<void> {
    this.reviewQueueLoading.set(true);

    try {
      const { data, error } = await this.supabase
        .from('admin_review_queue')
        .select(
          `
          *,
          owner:owner_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            id_verified,
            rating_avg,
            rating_count
          )
        `,
        )
        .in('status', ['pending', 'in_review'])
        .order('risk_score', { ascending: false });

      if (error) throw error;

      this.reviewQueue.set(
        (data || []).map((item) => ({
          id: item.id,
          ownerId: item.owner_id,
          ownerName: item.owner
            ? `${(item.owner as { first_name?: string }).first_name || ''} ${(item.owner as { last_name?: string }).last_name || ''}`.trim()
            : 'Desconocido',
          ownerEmail: (item.owner as { email?: string })?.email || '',
          ownerRating: (item.owner as { rating_avg?: number })?.rating_avg || 0,
          ownerVerified: (item.owner as { id_verified?: boolean })?.id_verified || false,
          reviewType: item.review_type,
          riskScore: item.risk_score,
          signals: item.signals || [],
          month: item.month,
          frozenAmount: item.frozen_amount,
          status: item.status,
          payoutId: item.payout_id,
          createdAt: item.created_at,
        })),
      );
    } catch (err) {
      console.error('[RewardPoolService] Error loading review queue:', err);
    } finally {
      this.reviewQueueLoading.set(false);
    }
  }

  /**
   * Admin: resolve a review item
   */
  async resolveReview(
    reviewId: string,
    action: 'clear' | 'warn' | 'suspend' | 'release_payout' | 'cancel_payout',
    notes?: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('admin_resolve_review', {
        p_review_id: reviewId,
        p_action: action,
        p_notes: notes || null,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[RewardPoolService] Error resolving review:', err);
      return false;
    }
  }

  /** Get cooldown reason in Spanish */
  getCooldownReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      owner_cancellation: 'Cancelación de reserva',
      gaming_detected: 'Actividad sospechosa detectada',
      manual: 'Aplicado manualmente por admin',
    };
    return labels[reason] || reason;
  }

  /** Get gaming signal label in Spanish */
  getGamingSignalLabel(signalType: string): string {
    const labels: Record<string, string> = {
      calendar_open_no_bookings: 'Calendario abierto sin reservas',
      high_rejection_rate: 'Alta tasa de rechazo',
      price_manipulation: 'Manipulación de precios',
      fake_bookings_suspected: 'Reservas sospechosas',
      multi_account_suspected: 'Múltiples cuentas sospechosas',
      rapid_cancellation_pattern: 'Patrón de cancelaciones',
      listing_velocity: 'Publicación acelerada de autos',
      cross_account_collusion: 'Colusión entre cuentas',
      synthetic_availability: 'Disponibilidad sintética',
      review_manipulation: 'Manipulación de reseñas',
      geographic_anomaly: 'Anomalía geográfica',
    };
    return labels[signalType] || signalType;
  }

  /** Get risk level label and color */
  getRiskLevel(score: number): { label: string; color: string } {
    if (score >= 60) return { label: 'Alto', color: 'text-red-400 bg-red-500/20' };
    if (score >= 40) return { label: 'Medio', color: 'text-amber-400 bg-amber-500/20' };
    if (score >= 20) return { label: 'Bajo', color: 'text-yellow-400 bg-yellow-500/20' };
    return { label: 'Sin riesgo', color: 'text-emerald-400 bg-emerald-500/20' };
  }
}

// ============================================================================
// ANTI-FRAUD TYPES
// ============================================================================

export interface AntifraudCooldown {
  id: string;
  carId: string | null;
  reason: string;
  startsAt: string;
  endsAt: string;
  reasonLabel: string;
}

export interface AntifraudGamingSignal {
  id: string;
  signalType: string;
  riskScore: number;
  detectedAt: string;
  details: Record<string, unknown>;
  signalLabel: string;
}

export interface AdminReviewItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerRating: number;
  ownerVerified: boolean;
  reviewType: string;
  riskScore: number;
  signals: Array<{ type: string; score: number; details: Record<string, unknown> }>;
  month: string;
  frozenAmount: number | null;
  status: string;
  payoutId: string | null;
  createdAt: string;
}
