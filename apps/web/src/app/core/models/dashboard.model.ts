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
