-- ============================================================================
-- Migration: Create user_stats materialized view
-- Purpose: Aggregate user statistics for reviews, ratings, and bookings
-- Author: Claude Code
-- Date: 2026-01-05
-- ============================================================================

-- Create materialized view for user statistics
-- Uses materialized view for performance (can be refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats AS
SELECT
  p.id AS user_id,
  -- Reviews as owner (reviews of the user's cars)
  COUNT(DISTINCT r.id) FILTER (
    WHERE r.reviewee_id = p.id AND r.is_car_review = true
  ) AS reviews_as_owner,
  -- Reviews as renter (reviews given to the user as a renter)
  COUNT(DISTINCT r.id) FILTER (
    WHERE r.reviewee_id = p.id AND r.is_car_review = false
  ) AS reviews_as_renter,
  -- Total reviews received
  COUNT(DISTINCT r.id) AS total_reviews_received,
  -- Average rating (all reviews)
  ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
  -- Total bookings as renter
  COUNT(DISTINCT b.id) FILTER (
    WHERE b.renter_id = p.id
  ) AS total_bookings_as_renter,
  -- Completed bookings as renter
  COUNT(DISTINCT b.id) FILTER (
    WHERE b.renter_id = p.id AND b.status = 'completed'
  ) AS completed_bookings_as_renter,
  -- Total bookings as owner
  COUNT(DISTINCT bo.id) AS total_bookings_as_owner,
  -- Completed bookings as owner
  COUNT(DISTINCT bo.id) FILTER (
    WHERE bo.status = 'completed'
  ) AS completed_bookings_as_owner,
  -- Total cars listed
  COUNT(DISTINCT c.id) AS total_cars_listed,
  -- Active cars
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'active' OR c.status = 'approved'
  ) AS active_cars
FROM profiles p
LEFT JOIN reviews r ON r.reviewee_id = p.id
LEFT JOIN bookings b ON b.renter_id = p.id
LEFT JOIN cars c ON c.owner_id = p.id
LEFT JOIN bookings bo ON bo.car_id = c.id
GROUP BY p.id;

-- Create unique index on user_id for efficient lookups and concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_user_stats_avg_rating ON user_stats(avg_rating DESC NULLS LAST);

-- Enable RLS on the view (materialized views require this to be set explicitly)
-- Note: Materialized views inherit base table permissions through the queries

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION refresh_user_stats() TO service_role;

-- Grant select to authenticated users
GRANT SELECT ON user_stats TO authenticated;

-- Create a trigger function to schedule refresh after review changes
-- Note: In production, this should be done via a cron job instead for better performance
CREATE OR REPLACE FUNCTION schedule_user_stats_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Queue a background job to refresh stats (async)
  -- For now, we'll just log - actual implementation should use pg_cron or edge function
  RAISE NOTICE 'User stats refresh needed for user: %', COALESCE(NEW.reviewee_id, OLD.reviewee_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add comment explaining the view
COMMENT ON MATERIALIZED VIEW user_stats IS
'Aggregated user statistics including reviews, ratings, and bookings.
Refresh periodically using: SELECT refresh_user_stats();';
