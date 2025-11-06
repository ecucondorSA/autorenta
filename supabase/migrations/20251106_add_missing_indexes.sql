-- Migration: Add missing indexes for performance optimization
-- Date: 2025-11-06
-- Purpose: Add indexes identified during code review

BEGIN;

-- ============================================================================
-- INDEX 1: bookings.payment_provider
-- ============================================================================
-- Used for:
-- - Filtering bookings by provider
-- - Analytics queries
-- - Payment reconciliation

CREATE INDEX IF NOT EXISTS idx_bookings_payment_provider
ON bookings(payment_provider)
WHERE payment_provider IS NOT NULL;

COMMENT ON INDEX idx_bookings_payment_provider IS
'Index for filtering bookings by payment provider (mercadopago, paypal)';

-- ============================================================================
-- INDEX 2: bookings.distance_risk_tier (already exists from previous migration)
-- ============================================================================
-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_bookings_distance_risk_tier'
  ) THEN
    CREATE INDEX idx_bookings_distance_risk_tier
    ON bookings(distance_risk_tier)
    WHERE distance_risk_tier IS NOT NULL;

    COMMENT ON INDEX idx_bookings_distance_risk_tier IS
    'Index for analytics on distance-based pricing (local, regional, long_distance)';
  END IF;
END $$;

-- ============================================================================
-- INDEX 3: payment_intents.provider_payment_id (already exists from refactor)
-- ============================================================================
-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_payment_intents_provider_payment_id'
  ) THEN
    CREATE INDEX idx_payment_intents_provider_payment_id
    ON payment_intents(provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- INDEX 4: driver_risk_profile indexes (should exist from bonus-malus migration)
-- ============================================================================
-- Verify critical indexes exist
DO $$
BEGIN
  -- Index on class for filtering by driver class
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_driver_risk_profile_class'
  ) THEN
    CREATE INDEX idx_driver_risk_profile_class
    ON driver_risk_profile(class);
  END IF;

  -- Index on driver_score for scoring queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_driver_risk_profile_driver_score'
  ) THEN
    CREATE INDEX idx_driver_risk_profile_driver_score
    ON driver_risk_profile(driver_score);
  END IF;
END $$;

-- ============================================================================
-- INDEX 5: Composite index for booking queries
-- ============================================================================
-- Common query pattern: filter by user + status + date range
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_dates
ON bookings(user_id, status, start_at, end_at)
WHERE status IN ('pending', 'confirmed', 'active');

COMMENT ON INDEX idx_bookings_user_status_dates IS
'Composite index for user booking queries filtered by status and date range';

-- ============================================================================
-- INDEX 6: wallet_transactions timestamp index for history queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
ON wallet_transactions(user_id, created_at DESC);

COMMENT ON INDEX idx_wallet_transactions_user_created IS
'Index for user transaction history queries ordered by date';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all indexes were created:
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE indexname LIKE 'idx_%'
--   AND schemaname = 'public'
-- ORDER BY tablename, indexname;
