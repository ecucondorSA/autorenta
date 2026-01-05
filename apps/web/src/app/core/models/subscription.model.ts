/**
 * Subscription System Models
 * Interfaces para el sistema de membresía Autorentar Club
 *
 * Created: 2026-01-06
 * Tiers: Club Estándar ($300/año, $500 cobertura) y Club Black ($600/año, $1000 cobertura)
 */

import { Database } from '@core/types/database.types';

// ============================================================================
// Database Types (from Supabase)
// ============================================================================

export type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type SubscriptionUsageLogRow = Database['public']['Tables']['subscription_usage_logs']['Row'];
export type SubscriptionUsageLogInsert = Database['public']['Tables']['subscription_usage_logs']['Insert'];

export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
export type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

// ============================================================================
// Application Types
// ============================================================================

/**
 * Subscription details returned by get_active_subscription RPC
 */
export interface ActiveSubscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  remaining_balance_cents: number;
  coverage_limit_cents: number;
  purchase_amount_cents: number;
  starts_at: string;
  expires_at: string;
  created_at: string;
  // Computed fields
  remaining_balance_usd: number;
  coverage_limit_usd: number;
  days_remaining: number;
}

/**
 * Coverage check result from check_subscription_coverage RPC
 */
export interface SubscriptionCoverageCheck {
  has_coverage: boolean;
  coverage_type: 'full' | 'partial' | 'none' | 'depleted';
  reason: string;
  subscription_id: string | null;
  tier?: SubscriptionTier;
  available_cents: number;
  covered_cents: number;
  uncovered_cents: number;
  deposit_required_cents: number;
}

/**
 * Result of subscription deduction
 */
export interface SubscriptionDeductionResult {
  success: boolean;
  deducted_cents: number;
  remaining_balance_cents: number;
  uncovered_cents: number;
  new_status: SubscriptionStatus;
  was_fully_covered: boolean;
}

/**
 * Result of claim charge processing
 */
export interface ClaimChargeResult {
  success: boolean;
  source: 'subscription_only' | 'subscription_plus_wallet' | 'wallet_only';
  total_charged_cents: number;
  subscription_deducted_cents: number;
  wallet_charged_cents: number;
  subscription_remaining_cents: number | null;
  subscription_id: string | null;
  error?: string;
  error_detail?: string;
}

/**
 * Usage log entry with related booking info
 */
export interface SubscriptionUsageLogWithDetails {
  id: string;
  subscription_id: string;
  booking_id: string | null;
  amount_deducted_cents: number;
  balance_before_cents: number;
  balance_after_cents: number;
  reason: SubscriptionUsageReason;
  description: string | null;
  created_at: string;
  // Related data
  booking_start?: string;
  car_name?: string;
}

/**
 * Subscription usage reasons
 */
export type SubscriptionUsageReason =
  | 'claim_deduction'      // Deducted for damage claim
  | 'admin_adjustment'     // Manual adjustment by admin
  | 'refund'              // Refund to balance
  | 'expiration_forfeit'; // Forfeited on expiration

/**
 * Subscription tier configuration
 */
export interface SubscriptionTierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price_cents: number;
  price_usd: number;
  coverage_limit_cents: number;
  coverage_limit_usd: number;
  target_segment: string;
  features: string[];
}

/**
 * Tier configurations (matches v_subscription_tiers view)
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  club_standard: {
    tier: 'club_standard',
    name: 'Club Estándar',
    description: 'Ideal para autos económicos y medios',
    price_cents: 30000,
    price_usd: 300,
    coverage_limit_cents: 50000,
    coverage_limit_usd: 500,
    target_segment: 'Autos con valor < $20,000',
    features: [
      'Cobertura de hasta USD $500 en franquicias',
      'Válido por 1 año desde la activación',
      'Uso ilimitado de reservas',
      'Sin cargos ocultos ni auto-renovación',
      'Soporte prioritario 24/7'
    ]
  },
  club_black: {
    tier: 'club_black',
    name: 'Club Black',
    description: 'Para autos premium y de lujo',
    price_cents: 60000,
    price_usd: 600,
    coverage_limit_cents: 100000,
    coverage_limit_usd: 1000,
    target_segment: 'Autos con valor > $20,000',
    features: [
      'Cobertura de hasta USD $1,000 en franquicias',
      'Válido por 1 año desde la activación',
      'Uso ilimitado de reservas',
      'Sin cargos ocultos ni auto-renovación',
      'Soporte VIP prioritario 24/7',
      'Acceso a vehículos premium exclusivos'
    ]
  }
};

/**
 * Get tier config by tier name
 */
export function getTierConfig(tier: SubscriptionTier): SubscriptionTierConfig {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Parameters for creating a subscription purchase
 */
export interface SubscriptionPurchaseParams {
  tier: SubscriptionTier;
  paymentProvider: 'mercadopago' | 'stripe' | 'wallet';
}

/**
 * Result of subscription purchase initiation
 */
export interface SubscriptionPurchaseResult {
  success: boolean;
  subscriptionId?: string;
  // For MercadoPago redirect
  initPoint?: string;
  preferenceId?: string;
  // For errors
  error?: string;
}

/**
 * Deposit calculation result with subscription coverage
 */
export interface DepositWithSubscriptionCoverage {
  depositRequired: number;           // Amount user must pay (in USD)
  coveredBySubscription: number;     // Amount covered by subscription (in USD)
  coveredBy: 'full_subscription' | 'partial_subscription' | 'wallet' | 'card';
  subscriptionId?: string;
  subscriptionBalance?: number;
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Subscription display state for UI
 */
export interface SubscriptionDisplayState {
  hasSubscription: boolean;
  isActive: boolean;
  tier?: SubscriptionTier;
  tierConfig?: SubscriptionTierConfig;
  balancePercent: number;            // 0-100
  balanceUsd: number;
  coverageLimitUsd: number;
  daysRemaining: number;
  expiresAt?: Date;
}

/**
 * Convert ActiveSubscription to display state
 */
export function toDisplayState(sub: ActiveSubscription | null): SubscriptionDisplayState {
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

  const tierConfig = getTierConfig(sub.tier);
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
}

// ============================================================================
// Status Labels
// ============================================================================

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  depleted: 'Saldo agotado',
  expired: 'Expirada',
  cancelled: 'Cancelada'
};

export const SUBSCRIPTION_USAGE_REASON_LABELS: Record<SubscriptionUsageReason, string> = {
  claim_deduction: 'Cargo por daños',
  admin_adjustment: 'Ajuste administrativo',
  refund: 'Reembolso',
  expiration_forfeit: 'Saldo no utilizado'
};
