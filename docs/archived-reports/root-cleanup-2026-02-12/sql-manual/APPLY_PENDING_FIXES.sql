-- ============================================================================
-- CONSOLIDATED FIXES - Apply via Supabase Dashboard SQL Editor
-- Date: 2026-02-03
-- ============================================================================

-- ============================================================================
-- 1. Ensure check_level_requirements RPC exists and is accessible
-- ============================================================================
DROP FUNCTION IF EXISTS public.check_level_requirements(INTEGER);

CREATE OR REPLACE FUNCTION public.check_level_requirements(p_required_level INTEGER DEFAULT 1)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_current_level INTEGER;
    v_email_verified BOOLEAN;
    v_phone_verified BOOLEAN;
    v_id_verified BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'allowed', false,
            'current_level', 0,
            'required_level', p_required_level,
            'reason', 'Usuario no autenticado'
        );
    END IF;

    -- Get profile verification status
    SELECT
        COALESCE(email_verified, false),
        COALESCE(phone_verified, false),
        COALESCE(id_verified, false)
    INTO v_email_verified, v_phone_verified, v_id_verified
    FROM public.profiles
    WHERE id = v_user_id;

    -- Calculate current level
    v_current_level := 0;
    IF v_email_verified OR v_phone_verified THEN
        v_current_level := 1;
    END IF;
    IF v_id_verified THEN
        v_current_level := 2;
    END IF;

    RETURN json_build_object(
        'allowed', v_current_level >= p_required_level,
        'current_level', v_current_level,
        'required_level', p_required_level,
        'email_verified', v_email_verified,
        'phone_verified', v_phone_verified,
        'id_verified', v_id_verified
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_level_requirements(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_level_requirements(INTEGER) TO anon;

-- ============================================================================
-- 2. Add missing columns to cars table (if not exist)
-- ============================================================================
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS mileage INTEGER;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS value_usd NUMERIC(12,2);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS uses_dynamic_pricing BOOLEAN DEFAULT false;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS min_rental_days INTEGER DEFAULT 1;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS max_rental_days INTEGER DEFAULT 30;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT true;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT true;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS auto_approval BOOLEAN DEFAULT false;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_street TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_street_number TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS availability_start_date DATE;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS availability_end_date DATE;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS brand_id UUID;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS model_id UUID;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS brand_text_backup TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS model_text_backup TEXT;

-- ============================================================================
-- 3. Add rating_count to profiles if missing
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- ============================================================================
-- 4. Create car_stats table if not exists
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

GRANT SELECT ON public.car_stats TO authenticated, anon;

-- ============================================================================
-- 5. Create exchange_rates table if not exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id SERIAL PRIMARY KEY,
    pair TEXT NOT NULL UNIQUE,
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
-- 6. RLS Policies for cars table
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published cars" ON public.cars;
CREATE POLICY "Anyone can view published cars"
    ON public.cars FOR SELECT
    USING (status = 'published' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert their cars" ON public.cars;
CREATE POLICY "Owners can insert their cars"
    ON public.cars FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their cars" ON public.cars;
CREATE POLICY "Owners can update their cars"
    ON public.cars FOR UPDATE
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their cars" ON public.cars;
CREATE POLICY "Owners can delete their cars"
    ON public.cars FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================================================
-- 7. RLS Policies for car_photos table
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view car photos" ON public.car_photos;
CREATE POLICY "Anyone can view car photos"
    ON public.car_photos FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Car owners can insert photos" ON public.car_photos;
CREATE POLICY "Car owners can insert photos"
    ON public.car_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cars
            WHERE cars.id = car_photos.car_id
            AND cars.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Car owners can update photos" ON public.car_photos;
CREATE POLICY "Car owners can update photos"
    ON public.car_photos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cars
            WHERE cars.id = car_photos.car_id
            AND cars.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Car owners can delete photos" ON public.car_photos;
CREATE POLICY "Car owners can delete photos"
    ON public.car_photos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cars
            WHERE cars.id = car_photos.car_id
            AND cars.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- 8. Create v_car_reviews view if not exists
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
-- 9. Create FK from cars.owner_id to profiles.id (for PostgREST JOINs)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cars_owner_id_profiles_fkey'
        AND table_name = 'cars'
    ) THEN
        ALTER TABLE public.cars
        ADD CONSTRAINT cars_owner_id_profiles_fkey
        FOREIGN KEY (owner_id) REFERENCES public.profiles(id);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create FK cars_owner_id_profiles_fkey: %', SQLERRM;
END $$;

-- ============================================================================
-- 10. FORCE PostgREST Schema Reload
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- Verify function exists
SELECT
    proname as function_name,
    proargnames as arg_names,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'check_level_requirements';
