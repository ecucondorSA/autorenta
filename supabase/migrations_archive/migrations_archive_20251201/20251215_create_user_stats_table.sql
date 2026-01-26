-- ============================================
-- Migration: Create user_stats table
-- Date: 2025-01-15
-- Description: Creates user_stats table for storing user statistics and ratings
-- ============================================

-- ============================================
-- 1. CREATE user_stats TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY,

  -- Owner stats
  owner_reviews_count INTEGER DEFAULT 0,
  owner_rating_avg NUMERIC(3,2) DEFAULT 0,
  owner_rating_cleanliness_avg NUMERIC(3,2) DEFAULT 0,
  owner_rating_communication_avg NUMERIC(3,2) DEFAULT 0,
  owner_rating_accuracy_avg NUMERIC(3,2) DEFAULT 0,
  owner_rating_location_avg NUMERIC(3,2) DEFAULT 0,
  owner_rating_checkin_avg NUMERIC(3,2) DEFAULT 0,
  owner_rating_value_avg NUMERIC(3,2) DEFAULT 0,
  owner_response_rate NUMERIC(5,2) DEFAULT 0,
  owner_response_time_hours NUMERIC(5,2) DEFAULT NULL,

  -- Renter stats
  renter_reviews_count INTEGER DEFAULT 0,
  renter_rating_avg NUMERIC(3,2) DEFAULT 0,
  renter_rating_cleanliness_avg NUMERIC(3,2) DEFAULT 0,
  renter_rating_communication_avg NUMERIC(3,2) DEFAULT 0,
  renter_rating_accuracy_avg NUMERIC(3,2) DEFAULT 0,
  renter_rating_checkin_avg NUMERIC(3,2) DEFAULT 0,

  -- Bookings
  total_bookings_as_owner INTEGER DEFAULT 0,
  total_bookings_as_renter INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  cancellation_rate NUMERIC(4,2) DEFAULT 0,

  -- Badges and flags
  is_top_host BOOLEAN DEFAULT false,
  is_super_host BOOLEAN DEFAULT false,
  is_verified_renter BOOLEAN DEFAULT false,
  badges JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  last_review_received_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_owner_rating ON public.user_stats(owner_rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_renter_rating ON public.user_stats(renter_rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_super_host ON public.user_stats(is_super_host) WHERE is_super_host = true;
CREATE INDEX IF NOT EXISTS idx_user_stats_top_host ON public.user_stats(is_top_host) WHERE is_top_host = true;

-- ============================================
-- 3. ENABLE RLS
-- ============================================
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================
-- Public read access for all user stats
CREATE POLICY "user_stats_select" ON public.user_stats
  FOR SELECT
  USING (true);

-- Only system/service_role can update user stats
CREATE POLICY "user_stats_update" ON public.user_stats
  FOR UPDATE
  USING (
    (SELECT auth.jwt()->>'role') IN ('admin', 'service_role')
  );

-- Only system/service_role can insert user stats
CREATE POLICY "user_stats_insert" ON public.user_stats
  FOR INSERT
  WITH CHECK (
    (SELECT auth.jwt()->>'role') IN ('admin', 'service_role')
  );

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.user_stats TO anon, authenticated;
GRANT ALL ON public.user_stats TO service_role;

-- ============================================
-- 6. ADD COMMENTS
-- ============================================
COMMENT ON TABLE public.user_stats IS 'Statistics and ratings for users (owners and renters)';
COMMENT ON COLUMN public.user_stats.user_id IS 'Foreign key to profiles.id';
COMMENT ON COLUMN public.user_stats.owner_rating_avg IS 'Average rating received as car owner';
COMMENT ON COLUMN public.user_stats.renter_rating_avg IS 'Average rating received as renter';
COMMENT ON COLUMN public.user_stats.badges IS 'JSON array of badge objects earned by the user';

-- ============================================
-- 7. CREATE FUNCTION TO UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_updated_at();

COMMENT ON FUNCTION public.update_user_stats_updated_at() IS 'Automatically updates updated_at timestamp on user_stats';

-- ============================================
-- 7.1. ADD FOREIGN KEY CONSTRAINT (if profiles exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Add foreign key constraint if profiles table exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'user_stats_user_id_fkey'
      AND table_name = 'user_stats'
    ) THEN
      ALTER TABLE public.user_stats
      ADD CONSTRAINT user_stats_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================
-- 8. CREATE FUNCTION TO GET OR CREATE USER STATS
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  owner_reviews_count INTEGER,
  owner_rating_avg NUMERIC,
  owner_rating_cleanliness_avg NUMERIC,
  owner_rating_communication_avg NUMERIC,
  owner_rating_accuracy_avg NUMERIC,
  owner_rating_location_avg NUMERIC,
  owner_rating_checkin_avg NUMERIC,
  owner_rating_value_avg NUMERIC,
  owner_response_rate NUMERIC,
  owner_response_time_hours NUMERIC,
  renter_reviews_count INTEGER,
  renter_rating_avg NUMERIC,
  renter_rating_cleanliness_avg NUMERIC,
  renter_rating_communication_avg NUMERIC,
  renter_rating_accuracy_avg NUMERIC,
  renter_rating_checkin_avg NUMERIC,
  total_bookings_as_owner INTEGER,
  total_bookings_as_renter INTEGER,
  cancellation_count INTEGER,
  cancellation_rate NUMERIC,
  is_top_host BOOLEAN,
  is_super_host BOOLEAN,
  is_verified_renter BOOLEAN,
  badges JSONB,
  last_review_received_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to return existing stats
  RETURN QUERY
  SELECT us.*
  FROM public.user_stats us
  WHERE us.user_id = p_user_id;

  -- If no stats found, create default and return
  IF NOT FOUND THEN
    INSERT INTO public.user_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY
    SELECT us.*
    FROM public.user_stats us
    WHERE us.user_id = p_user_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO anon, authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION public.get_user_stats(UUID) IS 'Get user stats with automatic creation if missing';

