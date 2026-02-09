/**
 * Subscription Service
 * Manages Autorentar Club memberships and deposit coverage
 *
 * Created: 2026-01-06
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import {
  calcHoldAndBuydown,
  getVehicleTierByValue,
  type MembershipPlan,
} from '@core/models/guarantee-tiers.model';
import {
  type ActiveSubscription,
  type PreauthorizationCalculation,
  type SubscriptionCoverageCheck,
  type SubscriptionDisplayState,
  type SubscriptionPlan,
  type SubscriptionTier,
  type SubscriptionUsageLogWithDetails,
  type UpgradeRecommendation,
  type UserClubBenefits,
  SUBSCRIPTION_TIERS,
  getTierConfig,
  getRequiredTierByVehicleValue,
  canAccessVehicle,
  formatPreauthorizationInfo,
} from '@core/models/subscription.model';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

// Cache configuration
const SUBSCRIPTION_STALE_TIME_MS = 30_000; // 30 seconds

// Type for Supabase Functions errors
interface FunctionsError extends Error {
  context?: {
    json?: () => Promise<{ message?: string; error?: string }>;
    text?: () => Promise<string>;
    status?: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

  // Helper to map DB tiers to logic plans
  private mapTierToPlan(tier: SubscriptionTier | null): MembershipPlan {
    if (!tier) return 'none';
    const mapping: Record<string, MembershipPlan> = {
      club_standard: 'club',
      club_black: 'silver',
      club_luxury: 'black',
    };
    return mapping[tier] || 'none';
  }

  // ============================================================================
  // SIGNALS: Single source of truth for subscription state
  // ============================================================================

  readonly subscription = signal<ActiveSubscription | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly usageHistory = signal<SubscriptionUsageLogWithDetails[]>([]);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed signals for derived state
  readonly hasActiveSubscription = computed(() => {
    const sub = this.subscription();
    return sub !== null && sub.status === 'active';
  });

  /**
   * Fetch available subscription plans from database
   */
  async fetchPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      this.logger.error('Error fetching subscription plans', error);
      return [];
    }

    // Map DB rows to SubscriptionPlan interface
    // DB uses 'slug' column, app uses 'tier' property
    const plans = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...row,
      tier: row['tier'] ?? row['slug'],
    })) as unknown as SubscriptionPlan[];
    this.plans.set(plans);
    return plans;
  }

  /**
   * Get dynamic benefits for the current user
   */
  async fetchUserBenefits(): Promise<UserClubBenefits | null> {
    const { data, error } = await this.supabase.rpc('get_user_club_benefits');
    if (error) {
      this.logger.error('Error fetching user benefits', error);
      return null;
    }
    return data as UserClubBenefits;
  }

  readonly tier = computed(() => this.subscription()?.tier ?? null);

  readonly remainingBalanceCents = computed(
    () => this.subscription()?.remaining_balance_cents ?? 0,
  );

  readonly remainingBalanceUsd = computed(() => this.subscription()?.remaining_balance_usd ?? 0);

  readonly coverageLimitUsd = computed(() => this.subscription()?.coverage_limit_usd ?? 0);

  readonly balancePercent = computed(() => {
    const sub = this.subscription();
    if (!sub || sub.coverage_limit_cents === 0) return 0;
    return Math.round((sub.remaining_balance_cents / sub.coverage_limit_cents) * 100);
  });

  readonly daysRemaining = computed(() => this.subscription()?.days_remaining ?? 0);

  readonly displayState = computed<SubscriptionDisplayState>(() => {
    const sub = this.subscription();
    if (!sub) {
      return {
        hasSubscription: false,
        isActive: false,
        balancePercent: 0,
        balanceUsd: 0,
        coverageLimitUsd: 0,
        daysRemaining: 0,
      };
    }

    const tierConfig = SUBSCRIPTION_TIERS[sub.tier];
    const balancePercent = Math.round(
      (sub.remaining_balance_cents / sub.coverage_limit_cents) * 100,
    );

    return {
      hasSubscription: true,
      isActive: sub.status === 'active',
      tier: sub.tier,
      tierConfig,
      balancePercent,
      balanceUsd: sub.remaining_balance_usd,
      coverageLimitUsd: sub.coverage_limit_usd,
      daysRemaining: sub.days_remaining,
      expiresAt: new Date(sub.expires_at),
    };
  });

  // Request deduplication
  private pendingFetchSubscription: Promise<ActiveSubscription | null> | null = null;
  private lastFetchTimestamp = 0;

  constructor() {
    // Auto-fetch subscription on init if user is authenticated
    this.supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: { user?: unknown } | null } }) => {
        if (session?.user) {
          this.fetchSubscription().catch((err: unknown) => {
            this.logger.warn('Failed to fetch subscription on init', err);
          });
        }
      })
      .catch((err: unknown) => {
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
    if (!forceRefresh && cached && now - this.lastFetchTimestamp < SUBSCRIPTION_STALE_TIME_MS) {
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
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (!session?.user) {
        return {
          has_coverage: false,
          coverage_type: 'none',
          reason: 'not_authenticated',
          subscription_id: null,
          available_cents: 0,
          covered_cents: 0,
          uncovered_cents: franchiseAmountCents,
          deposit_required_cents: franchiseAmountCents,
        };
      }

      const { data, error } = await this.supabase.rpc('check_subscription_coverage', {
        p_user_id: session.user.id,
        p_franchise_amount_cents: franchiseAmountCents,
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
        deposit_required_cents: franchiseAmountCents,
      };
    }
  }

  /**
   * Check coverage for a specific user (admin use)
   */
  async checkCoverageForUser(
    userId: string,
    franchiseAmountCents: number,
  ): Promise<SubscriptionCoverageCheck> {
    try {
      const { data, error } = await this.supabase.rpc('check_subscription_coverage', {
        p_user_id: userId,
        p_franchise_amount_cents: franchiseAmountCents,
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
  async fetchUsageHistory(
    subscriptionId?: string,
    limit = 50,
  ): Promise<SubscriptionUsageLogWithDetails[]> {
    this.loading.set(true);

    try {
      const { data, error } = await this.supabase.rpc('get_subscription_usage_history', {
        p_subscription_id: subscriptionId ?? null,
        p_limit: limit,
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
  async calculateDepositWithCoverage(franchiseAmountCents: number): Promise<{
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
        coverageType: 'none',
      };
    }

    return {
      depositRequiredCents: coverage.uncovered_cents,
      coveredBySubscriptionCents: coverage.covered_cents,
      coverageType: coverage.coverage_type === 'full' ? 'full' : 'partial',
      subscriptionId: coverage.subscription_id ?? undefined,
    };
  }

  /**
   * Subscribe to real-time subscription changes
   */
  subscribeToChanges(onUpdate?: (subscription: ActiveSubscription | null) => void): () => void {
    const channel = this.supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        async (payload: { new: unknown; old: unknown; eventType: string }) => {
          this.logger.debug('Subscription change detected', payload);
          const updated = await this.fetchSubscription(true);
          onUpdate?.(updated);
        },
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

      const { data, error } = await this.supabase.functions.invoke(
        'create-subscription-preference',
        {
          body: {
            tier,
            amount_cents: tierConfig.price_cents,
            description: `Autorentar Club - ${tierConfig.name}`,
          },
        },
      );

      if (error) throw error;
      if (!data?.preference_id) {
        throw new Error('No preference ID returned');
      }

      this.logger.info('Subscription preference created', {
        tier,
        preferenceId: data.preference_id,
      });
      return data.preference_id;
    } catch (err) {
      this.handleError(err, 'Error al crear preferencia de pago');
      throw err;
    }
  }
  /**
   * Create a subscription using wallet balance (internal transfer).
   * Returns the subscription ID if successful.
   */
  async createSubscriptionWithWallet(tier: SubscriptionTier): Promise<string> {
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('create-subscription-wallet', {
        body: { tier },
      });

      if (error) {
        // Extract error message from FunctionsHttpError
        let serverError = await this.extractFunctionError(error);
        throw new Error(serverError);
      }

      if (!data?.subscription_id) {
        throw new Error(data?.error || data?.message || 'No subscription ID returned');
      }

      this.logger.info('Subscription created with wallet', {
        tier,
        subscriptionId: data.subscription_id,
      });
      await this.fetchSubscription(true);
      return data.subscription_id as string;
    } catch (err) {
      // Handle thrown exceptions (functions.invoke may throw for non-2xx)
      const message = await this.extractFunctionError(err);
      this.logger.error('Error al crear suscripción con wallet', { message, tier });
      throw new Error(message);
    }
  }

  /**
   * Extract error message from Supabase function errors.
   * Handles FunctionsHttpError, FunctionsRelayError, and plain Error objects.
   */
  private async extractFunctionError(error: unknown): Promise<string> {
    if (!error) return 'Error desconocido';

    const err = error as FunctionsError;

    // Try to get message from error context (FunctionsHttpError)
    if (err.context?.json) {
      try {
        const body = await err.context.json();
        if (body?.message) return body.message;
        if (body?.error) return body.error;
      } catch {
        // json() may have been consumed, try text()
        if (err.context?.text) {
          try {
            const text = await err.context.text();
            if (text) {
              try {
                const parsed = JSON.parse(text) as { message?: string; error?: string };
                if (parsed.message) return parsed.message;
                if (parsed.error) return parsed.error;
              } catch {
                return text;
              }
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    // Fallback to error message
    if (err.message && err.message !== 'FunctionsHttpError') {
      return err.message;
    }

    // Check for 409 status
    if (err.context?.status === 409) {
      return 'Already subscribed';
    }

    return 'Error al procesar la solicitud';
  }

  /**
   * Get usage history (alias for fetchUsageHistory for component compatibility)
   */
  async getUsageHistory(limit = 50): Promise<SubscriptionUsageLogWithDetails[]> {
    return this.fetchUsageHistory(undefined, limit);
  }

  /**
   * Calculate upgrade cost from current tier to a new tier.
   * Returns the price difference and other upgrade info.
   */
  async calculateUpgrade(newTier: SubscriptionTier): Promise<{
    canUpgrade: boolean;
    reason?: string;
    message?: string;
    currentTier?: SubscriptionTier;
    newTier: SubscriptionTier;
    currentPriceUsd?: number;
    newPriceUsd?: number;
    priceDifferenceUsd?: number;
    newCoverageUsd?: number;
  }> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (!session?.user) {
        return {
          canUpgrade: false,
          reason: 'not_authenticated',
          message: 'No estás autenticado',
          newTier,
        };
      }

      const { data, error } = await this.supabase.rpc('calculate_subscription_upgrade', {
        p_user_id: session.user.id,
        p_new_tier: newTier,
      });

      if (error) throw error;

      if (!data?.can_upgrade) {
        return {
          canUpgrade: false,
          reason: data?.reason,
          message: data?.message,
          newTier,
        };
      }

      return {
        canUpgrade: true,
        currentTier: data.current_tier as SubscriptionTier,
        newTier: data.new_tier as SubscriptionTier,
        currentPriceUsd: data.current_price_cents / 100,
        newPriceUsd: data.new_price_cents / 100,
        priceDifferenceUsd: data.price_difference_usd,
        newCoverageUsd: data.new_coverage_usd,
        message: data.message,
      };
    } catch (err) {
      this.handleError(err, 'Error al calcular upgrade');
      return {
        canUpgrade: false,
        reason: 'error',
        message: 'Error al calcular el upgrade',
        newTier,
      };
    }
  }

  /**
   * Upgrade subscription to a higher tier using wallet balance.
   * Pays only the price difference.
   */
  async upgradeSubscriptionWithWallet(newTier: SubscriptionTier): Promise<string> {
    try {
      const tierConfig = SUBSCRIPTION_TIERS[newTier];
      if (!tierConfig) {
        throw new Error(`Invalid tier: ${newTier}`);
      }

      const { data, error } = await this.supabase.functions.invoke('upgrade-subscription-wallet', {
        body: { new_tier: newTier },
      });

      if (error) throw error;
      if (!data?.subscription_id) {
        throw new Error(data?.error || data?.message || 'No subscription ID returned');
      }

      this.logger.info('Subscription upgraded with wallet', {
        newTier,
        subscriptionId: data.subscription_id,
        pricePaidUsd: data.price_paid_usd,
      });

      await this.fetchSubscription(true);
      return data.subscription_id as string;
    } catch (err) {
      this.handleError(err, 'Error al hacer upgrade con wallet');
      throw err;
    }
  }

  // ============================================================================
  // PREAUTHORIZATION & VEHICLE VALUE METHODS
  // ============================================================================

  /**
   * Calculate required preauthorization (hold) for a vehicle
   * Uses the server-side RPC for authoritative calculation
   * @param vehicleValueUsd - Estimated value of the vehicle in USD
   * @returns Preauthorization details
   */
  async calculatePreauthorizationForVehicle(
    vehicleValueUsd: number,
  ): Promise<PreauthorizationCalculation> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      const { data, error } = await this.supabase.rpc('calculate_preauthorization', {
        p_vehicle_value_usd: vehicleValueUsd,
        p_user_id: session?.user?.id ?? null,
      });

      if (error) throw error;

      // Transform RPC response to match interface
      return {
        holdAmountCents: data.hold_amount_cents,
        holdAmountUsd: data.hold_amount_usd,
        baseHoldCents: data.base_hold_cents,
        baseHoldUsd: data.base_hold_usd,
        discountApplied: data.discount_applied,
        discountReason: data.discount_reason ?? undefined,
        requiredTier: data.required_tier as SubscriptionTier,
        fgoCap: data.fgo_cap_usd,
        formula: data.discount_applied
          ? `Hold reducido con suscripción ${data.user_tier}`
          : `Hold = ${vehicleValueUsd} × 5%`,
      };
    } catch (err) {
      this.logger.error('Error calculating preauthorization from server', err);
      // Fallback to local calculation
      return this.calculatePreauthorizationLocal(vehicleValueUsd);
    }
  }

  /**
   * Calculate preauthorization locally (without server call)
   * Uses the new 6-tier vehicle model
   */
  calculatePreauthorizationLocal(vehicleValueUsd: number): PreauthorizationCalculation {
    const vehicleTier = getVehicleTierByValue(vehicleValueUsd);
    const membershipPlan = this.mapTierToPlan(this.tier());
    const calculation = calcHoldAndBuydown(vehicleTier, membershipPlan);

    return {
      holdAmountCents: calculation.holdUsd * 100,
      holdAmountUsd: calculation.holdUsd,
      baseHoldCents: calculation.baseHoldUsd * 100,
      baseHoldUsd: calculation.baseHoldUsd,
      discountApplied: calculation.discountApplied,
      discountReason: calculation.discountApplied
        ? `Descuento ${calculation.membershipPlan}`
        : undefined,
      requiredTier: this.tier() || 'club_standard', // Fallback
      fgoCap: calculation.buyDownFgoUsd,
      formula: calculation.formula,
    };
  }

  /**
   * Validate if user's subscription allows access to a vehicle
   * Uses server-side validation for authoritative result
   */
  async validateSubscriptionForVehicle(vehicleValueUsd: number): Promise<{
    hasSubscription: boolean;
    canBook: boolean;
    requiresFullPreauth: boolean;
    requiredTier: SubscriptionTier;
    userTier: SubscriptionTier | null;
    subscriptionId?: string;
    remainingBalanceCents?: number;
    upgradeRecommended?: boolean;
    message: string;
  }> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (!session?.user) {
        const requiredTier = getRequiredTierByVehicleValue(vehicleValueUsd);
        const preauth = this.calculatePreauthorizationLocal(vehicleValueUsd);
        return {
          hasSubscription: false,
          canBook: true,
          requiresFullPreauth: true,
          requiredTier,
          userTier: null,
          message: `Sin sesión: se requiere preautorización completa de $${preauth.holdAmountUsd.toFixed(0)} USD`,
        };
      }

      const { data, error } = await this.supabase.rpc('validate_subscription_for_vehicle', {
        p_user_id: session.user.id,
        p_vehicle_value_usd: vehicleValueUsd,
      });

      if (error) throw error;

      return {
        hasSubscription: data.has_subscription,
        canBook: data.can_book,
        requiresFullPreauth: data.requires_full_preauth,
        requiredTier: data.required_tier as SubscriptionTier,
        userTier: data.user_tier as SubscriptionTier | null,
        subscriptionId: data.subscription_id ?? undefined,
        remainingBalanceCents: data.remaining_balance_cents ?? undefined,
        upgradeRecommended: data.upgrade_recommended ?? false,
        message: data.message,
      };
    } catch (err) {
      this.logger.error('Error validating subscription for vehicle', err);
      // Fallback to local validation
      const access = canAccessVehicle(this.tier(), vehicleValueUsd);
      return {
        hasSubscription: this.hasActiveSubscription(),
        canBook: true,
        requiresFullPreauth: !access.allowed || access.reason !== undefined,
        requiredTier: access.requiredTier,
        userTier: access.userTier,
        message: access.reason ?? 'Validación local',
      };
    }
  }

  /**
   * Get required tier for a vehicle value (local calculation)
   */
  getRequiredTierForVehicle(vehicleValueUsd: number): SubscriptionTier {
    return getRequiredTierByVehicleValue(vehicleValueUsd);
  }

  /**
   * Get upgrade recommendation for a vehicle
   */
  getUpgradeRecommendation(vehicleValueUsd: number): UpgradeRecommendation {
    // Use the exported function from the model
    const access = canAccessVehicle(this.tier(), vehicleValueUsd);

    // If user tier is sufficient, no upgrade needed
    if (!access.reason) {
      return { recommended: false };
    }

    // Recommend upgrade to required tier
    return {
      recommended: true,
      upgradeTo: access.requiredTier,
      reason: access.reason,
    };
  }

  /**
   * Check if current subscription allows renting a specific vehicle
   */
  canRentVehicle(vehicleValueUsd: number): {
    allowed: boolean;
    requiredTier: SubscriptionTier;
    userTier: SubscriptionTier | null;
    reason?: string;
  } {
    return canAccessVehicle(this.tier(), vehicleValueUsd);
  }

  /**
   * Format preauthorization info for UI display
   */
  formatPreauthorization(preauth: PreauthorizationCalculation) {
    return formatPreauthorizationInfo(preauth);
  }

  /**
   * Get all tier configurations with preauth info
   */
  getAllTiersWithPreauth() {
    return Object.values(SUBSCRIPTION_TIERS).map((tier) => ({
      ...tier,
      savingsMessage: 'Preautorización: 5% del valor del auto',
    }));
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async doFetchSubscription(): Promise<ActiveSubscription | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
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
    let message = err instanceof Error ? err.message : 'Error desconocido';

    // Check if error is from Supabase Edge Function (FunctionsHttpError)
    const errorObj = err as Error & { context?: { message?: string }; message?: string };
    if (errorObj?.context?.message) {
      message = errorObj.context.message;
    } else if (errorObj?.message) {
      message = errorObj.message;
    }

    // Try to extract JSON from error context if available
    try {
      if (errorObj?.context instanceof Response) {
        // We can't easily await here since this is not async,
        // but often the message is already extracted in errorObj.message
      }
    } catch {
      // Ignore
    }

    this.error.set({ message: `${context}: ${message}` });
    this.logger.error(context, err);
  }
}
