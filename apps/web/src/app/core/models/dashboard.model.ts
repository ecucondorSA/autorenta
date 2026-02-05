// ============================================================================
// DASHBOARD MODELS
// Types for owner dashboard statistics
// ============================================================================

/**
 * Dashboard statistics response from Edge Function
 */
export interface DashboardStats {
  wallet: WalletStats;
  cars: DashboardCarStats;
  bookings: BookingStats;
  earnings: EarningsStats;
  timestamp: string;
}

/**
 * Wallet balance statistics
 */
export interface WalletStats {
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  withdrawableBalance: number;
}

/**
 * Car count statistics by status (for dashboard)
 */
export interface DashboardCarStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
}

/**
 * Car review/rating statistics (from car_stats table)
 */
export interface CarStats {
  car_id: string;
  reviews_count: number;
  rating_avg: number;
  rating_cleanliness_avg: number;
  rating_communication_avg: number;
  rating_accuracy_avg: number;
  rating_location_avg: number;
  rating_checkin_avg: number;
  rating_value_avg: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  cancellation_rate: number;
  last_review_at?: string | null;
  updated_at: string;
}

/**
 * Booking count statistics by status
 */
export interface BookingStats {
  upcoming: number;
  active: number;
  completed: number;
  pendingReview: number;
  total: number;
}

/**
 * Earnings statistics by period
 */
export interface EarningsStats {
  thisMonth: number;
  lastMonth: number;
  total: number;
  currency: string;
}

/**
 * Reward Pool & Points System Models
 * =================================
 */

/**
 * Legacy points breakdown (backward compatibility)
 */
export interface OwnerPointsBreakdown {
  availability_points: number;
  rating_points: number;
  seniority_points: number;
  referral_points: number;
  response_time_points: number;
  participation_points: number;
  bonus_points: number;
  penalty_points: number;
  total_points: number;
}

// ============================================================================
// SENIOR MODEL: Multiplicative Points System
// ============================================================================

// Import VAFailureReason from reward-pool.model to avoid duplication
import type { VAFailureReason } from './reward-pool.model';
export type { VAFailureReason };

/**
 * VA (Verified Availability) status for a car
 * If VA = false, the car earns 0 points
 */
export interface VAStatus {
  isVerified: boolean;
  failureReasons: VAFailureReason[];
  metrics: {
    isReadyToBook: boolean;
    responseTimeHours: number | null;
    acceptanceRate30d: number;
    cancellationRate90d: number;
    priceDeviationPct: number | null;
    isInCooldown: boolean;
    isOwnerKYC: boolean;
  };
}

/**
 * Daily points for a single car (Senior Model)
 * Formula: points = BASE_POINTS × VA × value_factor × rep_factor × demand_factor
 */
export interface CarDailyPoints {
  carId: string;
  carTitle: string;
  date: string;
  points: number;
  isEligible: boolean;

  // Breakdown (multiplicative)
  basePoints: number;
  vaStatus: boolean;
  vaFailureReasons: VAFailureReason[];
  valueFactor: number;
  repFactor: number;
  demandFactor: number;

  // Human readable formula
  formula: string;
}

/**
 * Monthly summary for owner (Senior Model)
 */
export interface OwnerMonthlyPointsSummary {
  ownerId: string;
  month: string; // YYYY-MM

  // Totals
  totalPoints: number;
  eligibleDays: number;
  carsContributing: number;
  carsCapped: number; // Excluded due to MAX_CARS limit

  // Share
  rawShare: number; // Before cap
  cappedShare: number; // After MAX_SHARE cap
  payoutUsd: number;

  // Eligibility
  isEligible: boolean;
  eligibilityReasons: string[];
  gamingRiskScore: number;

  // Per-car breakdown
  carPoints: Array<{
    carId: string;
    carTitle: string;
    points: number;
    eligibleDays: number;
    avgDailyPoints: number;
    factors: {
      valueFactor: number;
      repFactor: number;
      demandFactor: number;
    };
  }>;
}

/**
 * Pool configuration and status (Senior Model)
 */
export interface RewardPoolConfigSenior {
  month: string; // YYYY-MM
  totalPoolUsd: number;
  totalPointsNetwork: number;
  pointValueUsd: number;

  // Caps
  maxCarsPerOwner: number;
  maxSharePerOwner: number;

  // VA thresholds
  vaMaxResponseHours: number;
  vaMinAcceptanceRate: number;
  vaMaxCancellationRate: number;

  status: 'open' | 'calculating' | 'distributed' | 'closed';
}

/**
 * Factor quality labels for UI
 */
export type FactorQuality = 'excellent' | 'good' | 'average' | 'below_average' | 'poor';

export interface CommunityReward extends OwnerPointsBreakdown {
  id?: string;
  owner_id?: string;
  period_year: number;
  period_month: number;
  amount_cents: number;
  currency?: string;
  status: string; // 'pending' | 'calculated' | 'approved' | 'paid'
  created_at?: string;
  updated_at?: string;
}

export interface RewardPoolStatus {
  period_year: number;
  period_month: number;
  contributions_cents: number;
  total_points_in_period: number;
  cents_per_point: number | null;
  total_available_cents: number;
  total_distributed_cents: number;
  status: string; // 'open' | 'calculating' | 'distributed'
}

export interface OwnerPointsSummary {
  currentMonth: {
    year: number;
    month: number;
    points: OwnerPointsBreakdown;
    estimatedEarnings: number;
    status: string;
  };
  lastMonth: {
    year: number;
    month: number;
    points: OwnerPointsBreakdown;
    earnings: number;
    status: string;
  } | null;
  poolStatus: RewardPoolStatus | null;
  history: CommunityReward[];
  totalEarnedAllTime: number;
}

/**
 * Cache entry for dashboard stats with TTL
 */
export interface DashboardStatsCache {
  data: DashboardStats;
  timestamp: number;
  ttl: number; // milliseconds
}
