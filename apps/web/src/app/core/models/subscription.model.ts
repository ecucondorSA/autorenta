/**
 * Subscription System Models
 * Interfaces para el sistema de membresía Autorentar Club
 *
 * Created: 2026-01-06
 * Updated: 2026-02-01 (Tiered Guarantee Model)
 *
 * Tiers basados en valor del vehículo:
 * - Club Access ($14.99/mes) - Autos < $20,000
 * - Silver Access ($29.99/mes) - Autos $20,000 - $40,000
 * - Black Access ($59.99/mes) - Autos > $40,000
 */

import type { Database, SubscriptionTier } from '@core/types/database.types';

// ============================================================================
// Database Types (from Supabase)
// ============================================================================

export type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type SubscriptionUsageLogRow =
  Database['public']['Tables']['subscription_usage_logs']['Row'];
export type SubscriptionUsageLogInsert =
  Database['public']['Tables']['subscription_usage_logs']['Insert'];

export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
export type { SubscriptionTier } from '@core/types/database.types';

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
  | 'claim_deduction' // Deducted for damage claim
  | 'admin_adjustment' // Manual adjustment by admin
  | 'refund' // Refund to balance
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
  fgo_cap_cents: number;
  fgo_cap_usd: number;
  min_vehicle_value_usd: number;
  max_vehicle_value_usd: number | null; // null = sin límite
  preauth_hold_cents: number;
  preauth_hold_usd: number;
  preauth_with_subscription_cents: number; // Hold reducido con suscripción
  preauth_with_subscription_usd: number;
  target_segment: string;
  features: string[];
}

/**
 * Vehicle value tier thresholds
 */
export const VEHICLE_VALUE_THRESHOLDS = {
  ECONOMY_MAX: 20000, // < $20,000
  STANDARD_MAX: 40000, // $20,000 - $40,000
  LUXURY_MIN: 40000, // > $40,000
} as const;

/**
 * Preauthorization formula: 5% of vehicle value (Deprecated as primary logic)
 */
export const PREAUTH_PERCENTAGE = 0.05;

/**
 * Tier configurations (matches v_subscription_tiers view)
 *
 * IMPORTANTE: Los tiers están basados en el VALOR del vehículo.
 * Definimos Holds agresivamente bajos para suscriptores para incentivar la conversión.
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  club_standard: {
    tier: 'club_standard',
    name: 'Club Access',
    description: 'Para autos económicos (valor < $20,000)',
    price_cents: 1499, // $14.99
    price_usd: 14.99,
    coverage_limit_cents: 80000,
    coverage_limit_usd: 800,
    fgo_cap_cents: 80000,
    fgo_cap_usd: 800,
    min_vehicle_value_usd: 0,
    max_vehicle_value_usd: 20000,
    preauth_hold_cents: 60000, // $600 sin suscripción (Garantía Standard)
    preauth_hold_usd: 600,
    preauth_with_subscription_cents: 30000, // $300 con suscripción (50% OFF)
    preauth_with_subscription_usd: 300,
    target_segment: 'Autos con valor < $20,000',
    features: [
      'Garantía reducida al 50% ($300 USD)',
      'Seguro de Franquicia incluido (cubrimos el gap)',
      'Válido por 1 mes renovable',
      'Uso ilimitado de reservas en autos económicos',
      'Sin cargos ocultos',
      'Soporte prioritario 24/7',
    ],
  },
  club_black: {
    tier: 'club_black',
    name: 'Silver Access',
    description: 'Para autos de gama media (valor $20,000 - $40,000)',
    price_cents: 2999, // $29.99
    price_usd: 29.99,
    coverage_limit_cents: 120000,
    coverage_limit_usd: 1200,
    fgo_cap_cents: 120000,
    fgo_cap_usd: 1200,
    min_vehicle_value_usd: 20000,
    max_vehicle_value_usd: 40000,
    preauth_hold_cents: 120000, // $1,200 sin suscripción
    preauth_hold_usd: 1200,
    preauth_with_subscription_cents: 50000, // $500 con suscripción (~60% OFF)
    preauth_with_subscription_usd: 500,
    target_segment: 'Autos con valor $20,000 - $40,000',
    features: [
      'Garantía reducida ($500 USD)',
      'Seguro de Franquicia incluido (cubrimos el gap)',
      'Válido por 1 mes renovable',
      'Acceso a autos económicos y de gama media',
      'Sin cargos ocultos',
      'Soporte VIP prioritario 24/7',
    ],
  },
  club_luxury: {
    tier: 'club_luxury',
    name: 'Black Access',
    description: 'Para autos premium y de lujo (valor > $40,000)',
    price_cents: 5999, // $59.99
    price_usd: 59.99,
    coverage_limit_cents: 200000,
    coverage_limit_usd: 2000,
    fgo_cap_cents: 200000,
    fgo_cap_usd: 2000,
    min_vehicle_value_usd: 40000,
    max_vehicle_value_usd: null, // Sin límite superior
    preauth_hold_cents: 250000, // $2,500 sin suscripción
    preauth_hold_usd: 2500,
    preauth_with_subscription_cents: 120000, // $1,200 con suscripción (50% OFF)
    preauth_with_subscription_usd: 1200,
    target_segment: 'Autos con valor > $40,000',
    features: [
      'Garantía reducida ($1,200 USD)',
      'Seguro de Franquicia Premium',
      'Válido por 1 mes renovable',
      'Acceso a TODA la flota (incluyendo lujo)',
      'Sin cargos ocultos',
      'Soporte VIP exclusivo 24/7',
      'Prioridad en reservas de vehículos premium',
    ],
  },
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
  depositRequired: number; // Amount user must pay (in USD)
  coveredBySubscription: number; // Amount covered by subscription (in USD)
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
  balancePercent: number; // 0-100
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
      daysRemaining: 0,
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
    expiresAt: new Date(sub.expires_at),
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
  cancelled: 'Cancelada',
  upgraded: 'Actualizada',
};

export const SUBSCRIPTION_USAGE_REASON_LABELS: Record<SubscriptionUsageReason, string> = {
  claim_deduction: 'Cargo por daños',
  admin_adjustment: 'Ajuste administrativo',
  refund: 'Reembolso',
  expiration_forfeit: 'Saldo no utilizado',
};

// ============================================================================
// Vehicle Value & Tier Calculation Functions
// ============================================================================

/**
 * Get required subscription tier based on vehicle value
 * @param vehicleValueUsd - Estimated value of the vehicle in USD
 * @returns The minimum required tier to rent this vehicle
 */
export function getRequiredTierByVehicleValue(vehicleValueUsd: number): SubscriptionTier {
  if (vehicleValueUsd > VEHICLE_VALUE_THRESHOLDS.LUXURY_MIN) {
    return 'club_luxury';
  }
  if (vehicleValueUsd > VEHICLE_VALUE_THRESHOLDS.ECONOMY_MAX) {
    return 'club_black';
  }
  return 'club_standard';
}

/**
 * Get tier configuration by vehicle value
 */
export function getTierConfigByVehicleValue(vehicleValueUsd: number): SubscriptionTierConfig {
  const tier = getRequiredTierByVehicleValue(vehicleValueUsd);
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Check if a subscription tier allows access to a vehicle of given value
 * @param userTier - User's active subscription tier (or null if none)
 * @param vehicleValueUsd - Estimated value of the vehicle
 * @returns Whether the user can rent this vehicle
 */
export function canAccessVehicle(
  userTier: SubscriptionTier | null,
  vehicleValueUsd: number,
): {
  allowed: boolean;
  requiredTier: SubscriptionTier;
  userTier: SubscriptionTier | null;
  reason?: string;
} {
  const requiredTier = getRequiredTierByVehicleValue(vehicleValueUsd);

  // No subscription - can still rent but with higher preauth
  if (!userTier) {
    return {
      allowed: true,
      requiredTier,
      userTier: null,
      reason: 'Sin suscripción: se requiere preautorización completa',
    };
  }

  // Tier hierarchy: club_luxury > club_black > club_standard
  const tierHierarchy: Record<SubscriptionTier, number> = {
    club_standard: 1,
    club_black: 2,
    club_luxury: 3,
  };

  const userLevel = tierHierarchy[userTier];
  const requiredLevel = tierHierarchy[requiredTier];

  if (userLevel >= requiredLevel) {
    return {
      allowed: true,
      requiredTier,
      userTier,
    };
  }

  return {
    allowed: true, // Allowed but with higher preauth
    requiredTier,
    userTier,
    reason: `Tu suscripción ${SUBSCRIPTION_TIERS[userTier].name} no cubre autos de este valor. Se aplicará preautorización estándar de ${SUBSCRIPTION_TIERS[requiredTier].name}.`,
  };
}

/**
 * Calculate required preauthorization (hold) amount for a vehicle
 * @param vehicleValueUsd - Estimated value of the vehicle
 * @param userTier - User's active subscription tier (or null)
 * @returns Preauthorization details
 */
export interface PreauthorizationCalculation {
  holdAmountCents: number;
  holdAmountUsd: number;
  baseHoldCents: number;
  baseHoldUsd: number;
  discountApplied: boolean;
  discountReason?: string;
  requiredTier: SubscriptionTier;
  fgoCap: number;
  formula: string;
}

export function calculatePreauthorization(
  vehicleValueUsd: number,
  userTier: SubscriptionTier | null,
): PreauthorizationCalculation {
  const requiredTier = getRequiredTierByVehicleValue(vehicleValueUsd);
  const tierConfig = SUBSCRIPTION_TIERS[requiredTier];

  // 1. Calculate Base Hold (Non-Subscriber Price)
  // We use the fixed value from configuration, which is designed to be the "Liquid Guarantee"
  const baseHoldUsd = tierConfig.preauth_hold_usd;
  const baseHoldCents = tierConfig.preauth_hold_cents;

  let holdAmountUsd = baseHoldUsd;
  let holdAmountCents = baseHoldCents;
  let discountApplied = false;
  let discountReason: string | undefined = undefined;

  // 2. Check for Subscription Discount
  if (userTier) {
    // Check if user's tier is high enough for this car
    const accessCheck = canAccessVehicle(userTier, vehicleValueUsd);
    
    if (accessCheck.allowed && accessCheck.userTier) { 
       // Verify hierarchy is sufficient
       const hierarchy: Record<SubscriptionTier, number> = { club_standard: 1, club_black: 2, club_luxury: 3 };
       if (hierarchy[userTier] >= hierarchy[requiredTier]) {
          holdAmountUsd = tierConfig.preauth_with_subscription_usd;
          holdAmountCents = tierConfig.preauth_with_subscription_cents;
          discountApplied = true;
          discountReason = `Beneficio Suscriptor ${SUBSCRIPTION_TIERS[userTier].name}`;
       }
    }
  }

  return {
    holdAmountCents,
    holdAmountUsd,
    baseHoldCents,
    baseHoldUsd,
    discountApplied,
    discountReason,
    requiredTier,
    fgoCap: tierConfig.fgo_cap_usd,
    formula: discountApplied
      ? `Garantía Reducida (${SUBSCRIPTION_TIERS[userTier!].name})`
      : `Garantía Estándar (${tierConfig.name})`,
  };
}