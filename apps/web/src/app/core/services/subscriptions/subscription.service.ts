/**
 * Subscription Service
 * Manages Autorentar Club memberships and deposit coverage
 *
 * Created: 2026-01-06
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  type ActiveSubscription,
  type SubscriptionCoverageCheck,
  type SubscriptionDisplayState,
  type SubscriptionTier,
  type SubscriptionUsageLogWithDetails,
  SUBSCRIPTION_TIERS,
  getTierConfig,
} from '@core/models/subscription.model';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

// Cache configuration
const SUBSCRIPTION_STALE_TIME_MS = 30_000; // 30 seconds

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // SIGNALS: Single source of truth for subscription state
  // ============================================================================

  readonly subscription = signal<ActiveSubscription | null>(null);
  readonly usageHistory = signal<SubscriptionUsageLogWithDetails[]>([]);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed signals for derived state
  readonly hasActiveSubscription = computed(() => {
    const sub = this.subscription();
    return sub !== null && sub.status === 'active';
  });

  readonly tier = computed(() => this.subscription()?.tier ?? null);

  readonly remainingBalanceCents = computed(() =>
    this.subscription()?.remaining_balance_cents ?? 0
  );

  readonly remainingBalanceUsd = computed(() =>
    this.subscription()?.remaining_balance_usd ?? 0
  );

  readonly coverageLimitUsd = computed(() =>
    this.subscription()?.coverage_limit_usd ?? 0
  );

  readonly balancePercent = computed(() => {
    const sub = this.subscription();
    if (!sub || sub.coverage_limit_cents === 0) return 0;
    return Math.round((sub.remaining_balance_cents / sub.coverage_limit_cents) * 100);
  });

  readonly daysRemaining = computed(() =>
    this.subscription()?.days_remaining ?? 0
  );

  readonly displayState = computed<SubscriptionDisplayState>(() => {
    const sub = this.subscription();
    if (!sub) {
      return {
        hasSubscription: false,
        isActive: false,
        balancePercent: 0,
        balanceUsd: 0,
        coverageLimitUsd: 0,
        daysRemaining: 0
      };
    }

    const tierConfig = SUBSCRIPTION_TIERS[sub.tier];
    const balancePercent = Math.round((sub.remaining_balance_cents / sub.coverage_limit_cents) * 100);

    return {
      hasSubscription: true,
      isActive: sub.status === 'active',
      tier: sub.tier,
      tierConfig,
      balancePercent,
      balanceUsd: sub.remaining_balance_usd,
      coverageLimitUsd: sub.coverage_limit_usd,
      daysRemaining: sub.days_remaining,
      expiresAt: new Date(sub.expires_at)
    };
  });

  // Request deduplication
  private pendingFetchSubscription: Promise<ActiveSubscription | null> | null = null;
  private lastFetchTimestamp = 0;

  constructor() {
    // Auto-fetch subscription on init if user is authenticated
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this.fetchSubscription().catch((err) => {
          this.logger.warn('Failed to fetch subscription on init', err);
        });
      }
    }).catch((err) => {
      this.logger.warn('Failed to get session on subscription service init', err);
    });
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Fetch the current user's active subscription
   * Uses request deduplication and SWR-like caching
   */
  async fetchSubscription(forceRefresh = false): Promise<ActiveSubscription | null> {
    const now = Date.now();
    const cached = this.subscription();

    // Return cached if fresh
    if (!forceRefresh && cached && (now - this.lastFetchTimestamp) < SUBSCRIPTION_STALE_TIME_MS) {
      return cached;
    }

    // Return pending request if one exists
    if (this.pendingFetchSubscription) {
      return this.pendingFetchSubscription;
    }

    // Start new fetch
    this.pendingFetchSubscription = this.doFetchSubscription();

    try {
      const result = await this.pendingFetchSubscription;
      this.lastFetchTimestamp = Date.now();
      return result;
    } finally {
      this.pendingFetchSubscription = null;
    }
  }

  /**
   * Check if user has coverage for a specific franchise amount
   * Returns detailed coverage information including partial coverage
   */
  async checkCoverage(franchiseAmountCents: number): Promise<SubscriptionCoverageCheck> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        return {
          has_coverage: false,
          coverage_type: 'none',
          reason: 'not_authenticated',
          subscription_id: null,
          available_cents: 0,
          covered_cents: 0,
          uncovered_cents: franchiseAmountCents,
          deposit_required_cents: franchiseAmountCents
        };
      }

      const { data, error } = await this.supabase.rpc('check_subscription_coverage', {
        p_user_id: session.user.id,
        p_franchise_amount_cents: franchiseAmountCents
      });

      if (error) {
        this.logger.error('Error checking subscription coverage', error);
        throw error;
      }

      return data as SubscriptionCoverageCheck;
    } catch (err) {
      this.handleError(err, 'Error al verificar cobertura');
      // Return no coverage on error
      return {
        has_coverage: false,
        coverage_type: 'none',
        reason: 'error',
        subscription_id: null,
        available_cents: 0,
        covered_cents: 0,
        uncovered_cents: franchiseAmountCents,
        deposit_required_cents: franchiseAmountCents
      };
    }
  }

  /**
   * Check coverage for a specific user (admin use)
   */
  async checkCoverageForUser(userId: string, franchiseAmountCents: number): Promise<SubscriptionCoverageCheck> {
    try {
      const { data, error } = await this.supabase.rpc('check_subscription_coverage', {
        p_user_id: userId,
        p_franchise_amount_cents: franchiseAmountCents
      });

      if (error) throw error;
      return data as SubscriptionCoverageCheck;
    } catch (err) {
      this.handleError(err, 'Error al verificar cobertura del usuario');
      throw err;
    }
  }

  /**
   * Get subscription usage history
   */
  async fetchUsageHistory(subscriptionId?: string, limit = 50): Promise<SubscriptionUsageLogWithDetails[]> {
    this.loading.set(true);

    try {
      const { data, error } = await this.supabase.rpc('get_subscription_usage_history', {
        p_subscription_id: subscriptionId ?? null,
        p_limit: limit
      });

      if (error) throw error;

      const history = (data ?? []) as SubscriptionUsageLogWithDetails[];
      this.usageHistory.set(history);
      return history;
    } catch (err) {
      this.handleError(err, 'Error al obtener historial de uso');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get all available subscription tiers
   */
  getTiers() {
    return Object.values(SUBSCRIPTION_TIERS);
  }

  /**
   * Get config for a specific tier
   */
  getTierConfig(tier: SubscriptionTier) {
    return getTierConfig(tier);
  }

  /**
   * Calculate deposit amount considering subscription coverage
   * This is used by checkout to determine how much deposit user needs to pay
   */
  async calculateDepositWithCoverage(
    franchiseAmountCents: number
  ): Promise<{
    depositRequiredCents: number;
    coveredBySubscriptionCents: number;
    coverageType: 'full' | 'partial' | 'none';
    subscriptionId?: string;
  }> {
    const coverage = await this.checkCoverage(franchiseAmountCents);

    if (!coverage.has_coverage) {
      return {
        depositRequiredCents: franchiseAmountCents,
        coveredBySubscriptionCents: 0,
        coverageType: 'none'
      };
    }

    return {
      depositRequiredCents: coverage.uncovered_cents,
      coveredBySubscriptionCents: coverage.covered_cents,
      coverageType: coverage.coverage_type === 'full' ? 'full' : 'partial',
      subscriptionId: coverage.subscription_id ?? undefined
    };
  }

  /**
   * Subscribe to real-time subscription changes
   */
  subscribeToChanges(
    onUpdate?: (subscription: ActiveSubscription | null) => void
  ): () => void {
    const channel = this.supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        async (payload) => {
          this.logger.debug('Subscription change detected', payload);
          const updated = await this.fetchSubscription(true);
          onUpdate?.(updated);
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Clear subscription state (on logout)
   */
  clearState(): void {
    this.subscription.set(null);
    this.usageHistory.set([]);
    this.lastFetchTimestamp = 0;
    this.error.set(null);
  }

  /**
   * Create a MercadoPago preference for subscription purchase
   * Returns the preference ID to initialize the checkout
   */
  async createSubscriptionPreference(tier: SubscriptionTier): Promise<string> {
    try {
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      if (!tierConfig) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const { data, error } = await this.supabase.functions.invoke('create-subscription-preference', {
        body: {
          tier,
          amount_cents: tierConfig.price_cents,
          description: `Autorentar Club - ${tierConfig.name}`,
        },
      });

      if (error) throw error;
      if (!data?.preference_id) {
        throw new Error('No preference ID returned');
      }

      this.logger.info('Subscription preference created', { tier, preferenceId: data.preference_id });
      return data.preference_id;
    } catch (err) {
      this.handleError(err, 'Error al crear preferencia de pago');
      throw err;
    }
  }

  /**
   * Get usage history (alias for fetchUsageHistory for component compatibility)
   */
  async getUsageHistory(limit = 50): Promise<SubscriptionUsageLogWithDetails[]> {
    return this.fetchUsageHistory(undefined, limit);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async doFetchSubscription(): Promise<ActiveSubscription | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        this.subscription.set(null);
        return null;
      }

      const { data, error } = await this.supabase.rpc('get_active_subscription');

      if (error) throw error;

      // RPC returns null if no subscription
      const sub = data as ActiveSubscription | null;
      this.subscription.set(sub);
      return sub;
    } catch (err) {
      this.handleError(err, 'Error al obtener suscripción');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  private handleError(err: unknown, context: string): void {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    this.error.set({ message: `${context}: ${message}` });
    this.logger.error(context, err);
  }
}
