-- ============================================================================
-- CREATE: Missing tables and views for frontend queries
-- Date: 2026-02-03
-- ============================================================================

-- ============================================================================
-- 1. v_car_reviews view (car reviews with user info)
-- ============================================================================
DROP VIEW IF EXISTS public.v_car_reviews CASCADE;

CREATE VIEW public.v_car_reviews AS
SELECT
    r.id,
    r.booking_id,
    r.reviewer_id,
    r.reviewee_id,
    b.car_id,
    r.rating,
    r.comment,
    r.is_car_review,
    r.created_at,
    p.full_name AS reviewer_name,
    p.avatar_url AS reviewer_avatar,
    c.title AS car_title,
    c.brand AS car_brand,
    c.model AS car_model
FROM public.reviews r
JOIN public.bookings b ON b.id = r.booking_id
JOIN public.cars c ON c.id = b.car_id
LEFT JOIN public.profiles p ON p.id = r.reviewer_id
WHERE r.is_car_review = true;

ALTER VIEW public.v_car_reviews SET (security_invoker = true);
GRANT SELECT ON public.v_car_reviews TO authenticated, anon;

-- ============================================================================
-- 2. car_stats table (car statistics cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.car_stats (
    car_id UUID PRIMARY KEY REFERENCES public.cars(id) ON DELETE CASCADE,
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_booking_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.car_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view car stats" ON public.car_stats;
CREATE POLICY "Anyone can view car stats"
    ON public.car_stats FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role can manage car stats" ON public.car_stats;
CREATE POLICY "Service role can manage car stats"
    ON public.car_stats FOR ALL
    USING (auth.role() = 'service_role');

GRANT SELECT ON public.car_stats TO authenticated, anon;

-- ============================================================================
-- 3. exchange_rates table (currency exchange rates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id SERIAL PRIMARY KEY,
    pair TEXT NOT NULL UNIQUE,  -- e.g., 'USDAR', 'USDBRL'
    rate NUMERIC(18,8) NOT NULL,
    source TEXT DEFAULT 'binance',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON public.exchange_rates(pair);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view exchange rates" ON public.exchange_rates;
CREATE POLICY "Anyone can view exchange rates"
    ON public.exchange_rates FOR SELECT
    USING (true);

GRANT SELECT ON public.exchange_rates TO authenticated, anon;

-- Insert default rates if empty
INSERT INTO public.exchange_rates (pair, rate, source)
VALUES
    ('USDAR', 1050.00, 'default'),
    ('USDBRL', 5.50, 'default'),
    ('USDEUR', 0.92, 'default')
ON CONFLICT (pair) DO NOTHING;

-- ============================================================================
-- 4. Fix RLS on user_verifications if needed
-- ============================================================================
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verifications" ON public.user_verifications;
CREATE POLICY "Users can view own verifications"
    ON public.user_verifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own verifications" ON public.user_verifications;
CREATE POLICY "Users can insert own verifications"
    ON public.user_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.user_verifications TO authenticated;

-- ============================================================================
-- Notify PostgREST to reload schema
-- ============================================================================
NOTIFY pgrst, 'reload schema';
