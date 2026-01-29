-- Create car_stats table for caching car statistics
-- This table stores aggregated statistics for each car to avoid expensive queries

CREATE TABLE IF NOT EXISTS public.car_stats (
    car_id UUID PRIMARY KEY REFERENCES public.cars(id) ON DELETE CASCADE,
    reviews_count INTEGER DEFAULT 0,
    rating_avg NUMERIC(3,2) DEFAULT NULL,
    rating_accuracy_avg NUMERIC(3,2) DEFAULT NULL,
    rating_checkin_avg NUMERIC(3,2) DEFAULT NULL,
    rating_cleanliness_avg NUMERIC(3,2) DEFAULT NULL,
    rating_communication_avg NUMERIC(3,2) DEFAULT NULL,
    rating_location_avg NUMERIC(3,2) DEFAULT NULL,
    rating_value_avg NUMERIC(3,2) DEFAULT NULL,
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    acceptance_rate NUMERIC(5,2) DEFAULT NULL,
    cancellation_rate NUMERIC(5,2) DEFAULT NULL,
    avg_response_time_hours NUMERIC(6,2) DEFAULT NULL,
    last_review_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_car_stats_car_id ON public.car_stats(car_id);

-- Enable RLS
ALTER TABLE public.car_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read car stats (public data)
CREATE POLICY "car_stats_select_all" ON public.car_stats
    FOR SELECT
    USING (true);

-- RLS Policy: Only service role can insert/update
CREATE POLICY "car_stats_service_role_all" ON public.car_stats
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Function to update car stats
CREATE OR REPLACE FUNCTION public.update_car_stats(p_car_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reviews_count INTEGER;
    v_rating_avg NUMERIC;
    v_total_bookings INTEGER;
    v_completed_bookings INTEGER;
    v_cancelled_bookings INTEGER;
    v_last_review_at TIMESTAMPTZ;
BEGIN
    -- Count reviews and calculate average rating
    SELECT
        COUNT(*)::INTEGER,
        AVG(rating)::NUMERIC(3,2),
        MAX(created_at)
    INTO v_reviews_count, v_rating_avg, v_last_review_at
    FROM public.reviews
    WHERE car_id = p_car_id;

    -- Count bookings
    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER
    INTO v_total_bookings, v_completed_bookings, v_cancelled_bookings
    FROM public.bookings
    WHERE car_id = p_car_id;

    -- Upsert stats
    INSERT INTO public.car_stats (
        car_id,
        reviews_count,
        rating_avg,
        total_bookings,
        completed_bookings,
        cancelled_bookings,
        last_review_at,
        updated_at
    ) VALUES (
        p_car_id,
        COALESCE(v_reviews_count, 0),
        v_rating_avg,
        COALESCE(v_total_bookings, 0),
        COALESCE(v_completed_bookings, 0),
        COALESCE(v_cancelled_bookings, 0),
        v_last_review_at,
        NOW()
    )
    ON CONFLICT (car_id) DO UPDATE SET
        reviews_count = EXCLUDED.reviews_count,
        rating_avg = EXCLUDED.rating_avg,
        total_bookings = EXCLUDED.total_bookings,
        completed_bookings = EXCLUDED.completed_bookings,
        cancelled_bookings = EXCLUDED.cancelled_bookings,
        last_review_at = EXCLUDED.last_review_at,
        updated_at = NOW();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_car_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_car_stats(UUID) TO service_role;

-- Initialize stats for existing cars
INSERT INTO public.car_stats (car_id, reviews_count, rating_avg, total_bookings, completed_bookings, cancelled_bookings, updated_at)
SELECT
    c.id,
    COALESCE((SELECT COUNT(*) FROM public.reviews r WHERE r.car_id = c.id), 0)::INTEGER,
    (SELECT AVG(rating)::NUMERIC(3,2) FROM public.reviews r WHERE r.car_id = c.id),
    COALESCE((SELECT COUNT(*) FROM public.bookings b WHERE b.car_id = c.id), 0)::INTEGER,
    COALESCE((SELECT COUNT(*) FROM public.bookings b WHERE b.car_id = c.id AND b.status = 'completed'), 0)::INTEGER,
    COALESCE((SELECT COUNT(*) FROM public.bookings b WHERE b.car_id = c.id AND b.status = 'cancelled'), 0)::INTEGER,
    NOW()
FROM public.cars c
ON CONFLICT (car_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.car_stats IS 'Cached statistics for cars - reviews count, ratings, booking stats';
