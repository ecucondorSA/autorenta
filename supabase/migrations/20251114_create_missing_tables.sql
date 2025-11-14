-- ============================================
-- Migration: Create Missing Tables
-- Date: 2025-11-14
-- Description: Creates car_stats table and ensures car_blocked_dates exists
-- ============================================

-- ============================================
-- 1. CREATE car_stats TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.car_stats (
  car_id UUID PRIMARY KEY REFERENCES public.cars(id) ON DELETE CASCADE,
  reviews_count INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_cleanliness_avg NUMERIC(3,2) DEFAULT 0,
  rating_communication_avg NUMERIC(3,2) DEFAULT 0,
  rating_accuracy_avg NUMERIC(3,2) DEFAULT 0,
  rating_location_avg NUMERIC(3,2) DEFAULT 0,
  rating_checkin_avg NUMERIC(3,2) DEFAULT 0,
  rating_value_avg NUMERIC(3,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  cancellation_rate NUMERIC(4,2) DEFAULT 0,
  last_review_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_car_stats_car_id ON public.car_stats(car_id);
CREATE INDEX IF NOT EXISTS idx_car_stats_rating ON public.car_stats(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_car_stats_bookings ON public.car_stats(total_bookings DESC);

-- Enable RLS
ALTER TABLE public.car_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access for all car stats
CREATE POLICY "Anyone can view car stats" ON public.car_stats
    FOR SELECT USING (true);

-- Only car owners can update their car stats (usually done via triggers)
CREATE POLICY "Car owners can update their car stats" ON public.car_stats
    FOR ALL USING (
        car_id IN (
            SELECT id FROM public.cars WHERE owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT ON public.car_stats TO anon, authenticated;
GRANT ALL ON public.car_stats TO service_role;

-- Add comment
COMMENT ON TABLE public.car_stats IS 'Statistics and ratings for cars';

-- ============================================
-- 2. INITIALIZE car_stats FOR EXISTING CARS
-- ============================================

-- Insert default stats for all existing cars that don't have stats
INSERT INTO public.car_stats (car_id, reviews_count, rating_avg, total_bookings)
SELECT 
    c.id,
    0,
    0.00,
    0
FROM public.cars c
WHERE NOT EXISTS (
    SELECT 1 FROM public.car_stats cs WHERE cs.car_id = c.id
)
ON CONFLICT (car_id) DO NOTHING;

-- ============================================
-- 3. CREATE FUNCTION TO GET OR CREATE CAR STATS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_car_stats(p_car_id UUID)
RETURNS TABLE (
    car_id UUID,
    reviews_count INTEGER,
    rating_avg NUMERIC,
    rating_cleanliness_avg NUMERIC,
    rating_communication_avg NUMERIC,
    rating_accuracy_avg NUMERIC,
    rating_location_avg NUMERIC,
    rating_checkin_avg NUMERIC,
    rating_value_avg NUMERIC,
    total_bookings INTEGER,
    completed_bookings INTEGER,
    cancelled_bookings INTEGER,
    cancellation_rate NUMERIC,
    last_review_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try to return existing stats
    RETURN QUERY
    SELECT cs.*
    FROM public.car_stats cs
    WHERE cs.car_id = p_car_id;
    
    -- If no stats found, create default and return
    IF NOT FOUND THEN
        INSERT INTO public.car_stats (car_id)
        VALUES (p_car_id)
        ON CONFLICT (car_id) DO NOTHING;
        
        RETURN QUERY
        SELECT cs.*
        FROM public.car_stats cs
        WHERE cs.car_id = p_car_id;
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_car_stats(UUID) TO anon, authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION public.get_car_stats(UUID) IS 'Get car stats with automatic creation if missing';

-- ============================================
-- 4. VERIFY car_blocked_dates EXISTS
-- ============================================

-- The car_blocked_dates table should already exist from migration 20251114_create_car_blocked_dates_table.sql
-- This is just a verification

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'car_blocked_dates'
    ) THEN
        RAISE EXCEPTION 'car_blocked_dates table does not exist. Run 20251114_create_car_blocked_dates_table.sql first';
    END IF;
END $$;

-- Success message
SELECT 'car_stats table created successfully. car_blocked_dates verified.' AS status;
