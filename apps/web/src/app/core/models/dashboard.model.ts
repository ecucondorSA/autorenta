// ============================================================================
// DASHBOARD MODELS
// Types for owner dashboard statistics
// ============================================================================

/**
 * Dashboard statistics response from Edge Function
 */
export interface DashboardStats {
  wallet: WalletStats;
  cars: CarStats;
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
 * Car count statistics by status
 */
export interface CarStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
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
 * Cache entry for dashboard stats with TTL
 */
export interface DashboardStatsCache {
  data: DashboardStats;
  timestamp: number;
  ttl: number; // milliseconds
}
