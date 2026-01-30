-- ============================================================================
-- Migration: Cleanup duplicate RLS policies
-- Date: 2026-01-30
-- Issue: Performance audit found ~478 redundant permissive policies
-- ============================================================================
-- NOTE: This migration documents changes already applied via MCP.
--
-- Duplicate policies cause Postgres to evaluate multiple rules per query
-- unnecessarily, impacting performance.
-- ============================================================================

-- Policies removed (exact duplicates or made redundant by broader policies):

-- 1. car_stats
--    - "car_stats_service_role_all" (duplicate of "System manages car_stats")

-- 2. car_views
--    - "car_views_insert_any" (duplicate of "Anyone can insert car views")

-- 3. feature_flags
--    - "feature_flags_select_all" (duplicate of "All can read feature_flags")

-- 4. feature_flag_overrides
--    - "flag_overrides_read_own" (duplicate of "feature_flag_overrides_select_own")

-- 5. reward_criteria_config
--    - "Admins can modify reward_criteria_config" (jwt-based, kept profiles-based)

-- 6. reward_pool
--    - "Admins can manage reward_pool" (jwt-based, kept profiles-based)

-- 7. marketing_content_queue
--    - "Admins can delete/insert/read/update marketing queue"
--    - (redundant - "Authenticated users can X" with `true` already allows all)

-- 8. marketing_posts_log
--    - "Admins can read marketing posts log" (redundant with "Authenticated users can view")

-- 9. owner_availability
--    - "Users manage own availability" (duplicate of "Owners can manage their availability")

-- 10. car_blocked_dates
--     - "Owners can view their car blocked dates" (redundant with "Anyone can view")

-- 11. wallet_transactions
--     - "Users can view own transactions" (exact duplicate of "wallet_transactions_select")

-- ============================================================================
-- Result: Reduced from ~478 redundant policy evaluations to 14 legitimate
-- multi-policy scenarios (different conditions for different user types)
-- ============================================================================
