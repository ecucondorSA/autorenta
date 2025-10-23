-- Performance Optimization: Additional Indexes
-- Date: 2025-10-22
-- Purpose: Improve query performance based on pg_stat_statements analysis

-- ============================================================================
-- WALLET_TRANSACTIONS OPTIMIZATIONS
-- ============================================================================

-- Index for filtering deposits by type and status (most common query pattern)
-- This query runs 4,636 times with avg 0.59ms - can be improved
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type_status
ON wallet_transactions(type, status)
WHERE type = 'deposit';

-- Composite index for common filtering pattern: user + type + status + date
-- Covers queries like: "get all pending deposits for user X"
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type_status_date
ON wallet_transactions(user_id, type, status, created_at DESC)
WHERE status IN ('pending', 'completed', 'failed');

-- Index for completed_at queries (used in dashboard and reporting)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_completed_at
ON wallet_transactions(completed_at DESC)
WHERE completed_at IS NOT NULL;

-- Index for withdrawal queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_withdrawal_status
ON wallet_transactions(status, updated_at DESC)
WHERE type = 'withdrawal';

-- ============================================================================
-- BOOKINGS OPTIMIZATIONS
-- ============================================================================

-- Composite index for active bookings dashboard queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_dates
ON bookings(status, start_at, end_at)
WHERE status IN ('pending', 'confirmed', 'in_progress');

-- Index for renter's active bookings
CREATE INDEX IF NOT EXISTS idx_bookings_renter_status
ON bookings(renter_id, status, start_at DESC)
WHERE status != 'cancelled';

-- Index for owner's active bookings
CREATE INDEX IF NOT EXISTS idx_bookings_car_status_dates
ON bookings(car_id, status, start_at)
WHERE status IN ('pending', 'confirmed', 'in_progress');

-- ============================================================================
-- CARS OPTIMIZATIONS
-- ============================================================================

-- Composite index for active cars listing (most common query)
CREATE INDEX IF NOT EXISTS idx_cars_status_location
ON cars(status, location_city, location_province)
WHERE status = 'active';

-- Index for search by brand and model
CREATE INDEX IF NOT EXISTS idx_cars_brand_model_status
ON cars(brand_id, model_id, status)
WHERE status = 'active';

-- Partial index for available cars (excludes inactive)
CREATE INDEX IF NOT EXISTS idx_cars_available
ON cars(location_city, price_per_day, created_at DESC)
WHERE status = 'active';

-- ============================================================================
-- PROFILES OPTIMIZATIONS
-- ============================================================================

-- Index for verification queries (using actual columns: kyc status and driver verification)
CREATE INDEX IF NOT EXISTS idx_profiles_verification
ON profiles(kyc, is_driver_verified, is_email_verified, updated_at DESC)
WHERE kyc = 'pending' OR is_driver_verified = false;

-- Index for admin queries (find users by role)
CREATE INDEX IF NOT EXISTS idx_profiles_role_created
ON profiles(role, created_at DESC);

-- ============================================================================
-- MATERIALIZED VIEW FOR ANALYTICS (OPTIONAL - FUTURE)
-- ============================================================================

-- Uncomment to create a materialized view for expensive analytics queries
-- This can be refreshed periodically (e.g., every hour) to avoid real-time computation

/*
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_wallet_stats AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  type,
  status,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) as avg_completion_minutes
FROM wallet_transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), type, status;

-- Create index on materialized view
CREATE INDEX idx_mv_wallet_stats_date ON mv_wallet_stats(date DESC);

-- Refresh the view (should be done via cron job)
-- REFRESH MATERIALIZED VIEW mv_wallet_stats;
*/

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Update table statistics for query planner
ANALYZE wallet_transactions;
ANALYZE bookings;
ANALYZE cars;
ANALYZE profiles;
ANALYZE user_wallets;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check index usage stats
-- Run this after deployment to verify indexes are being used:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('wallet_transactions', 'bookings', 'cars', 'profiles')
ORDER BY idx_scan DESC;
*/

-- Check for unused indexes (run after 1 week in production)
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 100 -- Less than 100 uses
  AND indexrelid IS NOT NULL
ORDER BY pg_relation_size(indexrelid) DESC;
*/
