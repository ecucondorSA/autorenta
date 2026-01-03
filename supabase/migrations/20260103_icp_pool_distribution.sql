-- =====================================================
-- ICP (Índice de Contribución al Pool) System
-- Pool distribution based on real contribution metrics
-- =====================================================

-- 1. Table: Monthly ICP snapshots per car
-- =====================================================
CREATE TABLE IF NOT EXISTS public.car_icp_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Period
    year_month VARCHAR(7) NOT NULL, -- '2026-01' format

    -- Component scores (0.0 - 2.0 range typically)
    availability_score DECIMAL(4,3) NOT NULL DEFAULT 0,    -- Days available / days in month (0-1)
    demand_score DECIMAL(4,3) NOT NULL DEFAULT 0,          -- Booking ratio (0.5-1.5)
    quality_score DECIMAL(4,3) NOT NULL DEFAULT 1.0,       -- Rating & behavior (0.8-1.2)
    category_score DECIMAL(4,3) NOT NULL DEFAULT 1.0,      -- Vehicle category (1.0-1.1)

    -- Final ICP = availability × demand × quality × category
    icp_score DECIMAL(8,4) NOT NULL DEFAULT 0,

    -- Raw metrics for transparency
    days_available INT NOT NULL DEFAULT 0,
    days_in_month INT NOT NULL DEFAULT 30,
    total_bookings INT NOT NULL DEFAULT 0,
    total_views INT NOT NULL DEFAULT 0,
    days_booked INT NOT NULL DEFAULT 0,
    cancellations_by_owner INT NOT NULL DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT NULL,
    rating_count INT NOT NULL DEFAULT 0,

    -- Pool distribution
    pool_share_percent DECIMAL(6,4) DEFAULT 0,  -- % of total pool
    pool_payout_cents BIGINT DEFAULT 0,          -- Actual payout in cents
    payout_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed
    paid_at TIMESTAMPTZ DEFAULT NULL,

    -- Audit
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one record per car per month
    UNIQUE(car_id, year_month)
);

-- Indexes
CREATE INDEX idx_car_icp_owner ON public.car_icp_monthly(owner_id);
CREATE INDEX idx_car_icp_month ON public.car_icp_monthly(year_month);
CREATE INDEX idx_car_icp_payout_status ON public.car_icp_monthly(payout_status);

-- 2. Table: Monthly pool totals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pool_monthly_totals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month VARCHAR(7) NOT NULL UNIQUE,

    -- Pool accumulation
    total_pool_cents BIGINT NOT NULL DEFAULT 0,
    total_bookings INT NOT NULL DEFAULT 0,

    -- Distribution
    total_icp_sum DECIMAL(12,4) NOT NULL DEFAULT 0,
    cars_participating INT NOT NULL DEFAULT 0,
    owners_participating INT NOT NULL DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'accumulating', -- accumulating, calculated, distributed
    calculated_at TIMESTAMPTZ DEFAULT NULL,
    distributed_at TIMESTAMPTZ DEFAULT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Function: Calculate ICP for all cars in a month
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_monthly_icp(p_year_month VARCHAR(7))
RETURNS TABLE(
    cars_processed INT,
    total_icp DECIMAL,
    pool_total_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_days_in_month INT;
    v_car RECORD;
    v_cars_processed INT := 0;
    v_total_icp DECIMAL := 0;
    v_pool_total BIGINT := 0;
    v_availability DECIMAL;
    v_demand DECIMAL;
    v_quality DECIMAL;
    v_category DECIMAL;
    v_icp DECIMAL;
BEGIN
    -- Parse year_month to dates
    v_start_date := (p_year_month || '-01')::DATE;
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_days_in_month := EXTRACT(DAY FROM v_end_date)::INT;

    -- Get pool total for the month
    SELECT COALESCE(total_pool_cents, 0) INTO v_pool_total
    FROM pool_monthly_totals
    WHERE year_month = p_year_month;

    IF v_pool_total IS NULL THEN
        v_pool_total := 0;
    END IF;

    -- Process each comodato car
    FOR v_car IN
        SELECT
            c.id AS car_id,
            c.owner_id,
            c.category,
            c.price_per_day,
            -- Availability: days marked available
            COALESCE((
                SELECT COUNT(DISTINCT d::DATE)
                FROM generate_series(v_start_date, v_end_date, '1 day'::INTERVAL) d
                WHERE NOT EXISTS (
                    SELECT 1 FROM car_availability ca
                    WHERE ca.car_id = c.id
                    AND ca.date = d::DATE
                    AND ca.is_blocked = true
                )
                AND c.status = 'published'
            ), 0) AS days_available,
            -- Bookings in month
            COALESCE((
                SELECT COUNT(*) FROM bookings b
                WHERE b.car_id = c.id
                AND b.status IN ('confirmed', 'completed', 'in_progress')
                AND b.start_at >= v_start_date
                AND b.start_at < v_end_date + INTERVAL '1 day'
            ), 0) AS total_bookings,
            -- Days actually booked
            COALESCE((
                SELECT SUM(
                    LEAST(b.end_at::DATE, v_end_date) -
                    GREATEST(b.start_at::DATE, v_start_date) + 1
                )
                FROM bookings b
                WHERE b.car_id = c.id
                AND b.status IN ('confirmed', 'completed', 'in_progress')
                AND b.start_at <= v_end_date
                AND b.end_at >= v_start_date
            ), 0) AS days_booked,
            -- Cancellations by owner
            COALESCE((
                SELECT COUNT(*) FROM bookings b
                WHERE b.car_id = c.id
                AND b.status = 'cancelled'
                AND b.cancelled_by = 'owner'
                AND b.cancelled_at >= v_start_date
                AND b.cancelled_at < v_end_date + INTERVAL '1 day'
            ), 0) AS owner_cancellations,
            -- Average rating
            COALESCE(c.rating_avg, 0) AS avg_rating,
            COALESCE(c.rating_count, 0) AS rating_count,
            -- Views (from analytics if available)
            COALESCE((
                SELECT COUNT(*) FROM car_views cv
                WHERE cv.car_id = c.id
                AND cv.viewed_at >= v_start_date
                AND cv.viewed_at < v_end_date + INTERVAL '1 day'
            ), 1) AS total_views
        FROM cars c
        WHERE c.agreement_type = 'comodato'
        AND c.status = 'published'
    LOOP
        -- 1. AVAILABILITY SCORE (0-1)
        -- Days available / days in month
        v_availability := LEAST(1.0, v_car.days_available::DECIMAL / v_days_in_month);

        -- 2. DEMAND SCORE (0.5-1.5)
        -- Based on booking conversion and actual usage
        IF v_car.days_available > 0 THEN
            -- Occupancy rate: days booked / days available
            v_demand := 0.5 + (v_car.days_booked::DECIMAL / v_car.days_available);
            -- Cap at 1.5
            v_demand := LEAST(1.5, v_demand);
        ELSE
            v_demand := 0.5; -- Minimum if not available
        END IF;

        -- 3. QUALITY SCORE (0.8-1.2)
        -- Based on rating and cancellations
        v_quality := 1.0;

        -- Rating adjustment (-0.1 to +0.1)
        IF v_car.rating_count >= 3 THEN
            v_quality := v_quality + ((v_car.avg_rating - 4.0) * 0.05);
        END IF;

        -- Cancellation penalty (-0.1 per cancellation, max -0.2)
        v_quality := v_quality - LEAST(0.2, v_car.owner_cancellations * 0.1);

        -- Clamp to range
        v_quality := GREATEST(0.8, LEAST(1.2, v_quality));

        -- 4. CATEGORY SCORE (1.0-1.1)
        -- Slight premium for higher-value vehicles
        CASE
            WHEN v_car.category = 'luxury' OR v_car.price_per_day > 15000 THEN
                v_category := 1.10;
            WHEN v_car.category = 'premium' OR v_car.price_per_day > 10000 THEN
                v_category := 1.05;
            ELSE
                v_category := 1.00;
        END CASE;

        -- CALCULATE FINAL ICP
        v_icp := v_availability * v_demand * v_quality * v_category;

        -- Insert or update ICP record
        INSERT INTO car_icp_monthly (
            car_id,
            owner_id,
            year_month,
            availability_score,
            demand_score,
            quality_score,
            category_score,
            icp_score,
            days_available,
            days_in_month,
            total_bookings,
            total_views,
            days_booked,
            cancellations_by_owner,
            avg_rating,
            rating_count,
            calculated_at
        ) VALUES (
            v_car.car_id,
            v_car.owner_id,
            p_year_month,
            v_availability,
            v_demand,
            v_quality,
            v_category,
            v_icp,
            v_car.days_available,
            v_days_in_month,
            v_car.total_bookings,
            v_car.total_views,
            v_car.days_booked,
            v_car.owner_cancellations,
            v_car.avg_rating,
            v_car.rating_count,
            NOW()
        )
        ON CONFLICT (car_id, year_month) DO UPDATE SET
            availability_score = EXCLUDED.availability_score,
            demand_score = EXCLUDED.demand_score,
            quality_score = EXCLUDED.quality_score,
            category_score = EXCLUDED.category_score,
            icp_score = EXCLUDED.icp_score,
            days_available = EXCLUDED.days_available,
            days_in_month = EXCLUDED.days_in_month,
            total_bookings = EXCLUDED.total_bookings,
            total_views = EXCLUDED.total_views,
            days_booked = EXCLUDED.days_booked,
            cancellations_by_owner = EXCLUDED.cancellations_by_owner,
            avg_rating = EXCLUDED.avg_rating,
            rating_count = EXCLUDED.rating_count,
            calculated_at = NOW();

        v_cars_processed := v_cars_processed + 1;
        v_total_icp := v_total_icp + v_icp;
    END LOOP;

    -- Update pool totals
    INSERT INTO pool_monthly_totals (year_month, total_icp_sum, cars_participating, status, calculated_at)
    VALUES (p_year_month, v_total_icp, v_cars_processed, 'calculated', NOW())
    ON CONFLICT (year_month) DO UPDATE SET
        total_icp_sum = v_total_icp,
        cars_participating = v_cars_processed,
        status = 'calculated',
        calculated_at = NOW(),
        updated_at = NOW();

    -- Calculate pool share for each car
    IF v_total_icp > 0 THEN
        UPDATE car_icp_monthly
        SET
            pool_share_percent = (icp_score / v_total_icp) * 100,
            pool_payout_cents = ROUND((icp_score / v_total_icp) * v_pool_total)
        WHERE year_month = p_year_month;
    END IF;

    RETURN QUERY SELECT v_cars_processed, v_total_icp, v_pool_total;
END;
$$;

-- 4. Function: Distribute pool payouts to owner wallets
-- =====================================================
CREATE OR REPLACE FUNCTION distribute_monthly_pool(p_year_month VARCHAR(7))
RETURNS TABLE(
    owners_paid INT,
    total_distributed_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payout RECORD;
    v_owners_paid INT := 0;
    v_total_distributed BIGINT := 0;
BEGIN
    -- Process each pending payout
    FOR v_payout IN
        SELECT
            owner_id,
            SUM(pool_payout_cents) AS total_payout
        FROM car_icp_monthly
        WHERE year_month = p_year_month
        AND payout_status = 'pending'
        AND pool_payout_cents > 0
        GROUP BY owner_id
    LOOP
        -- Credit owner's wallet
        UPDATE wallets
        SET
            balance_cents = balance_cents + v_payout.total_payout,
            updated_at = NOW()
        WHERE user_id = v_payout.owner_id;

        -- Record transaction
        INSERT INTO wallet_transactions (
            wallet_id,
            amount_cents,
            type,
            status,
            description,
            metadata
        )
        SELECT
            w.id,
            v_payout.total_payout,
            'pool_reward',
            'completed',
            'Recompensa Pool Comunidad ' || p_year_month,
            jsonb_build_object(
                'year_month', p_year_month,
                'source', 'icp_distribution'
            )
        FROM wallets w
        WHERE w.user_id = v_payout.owner_id;

        v_owners_paid := v_owners_paid + 1;
        v_total_distributed := v_total_distributed + v_payout.total_payout;
    END LOOP;

    -- Mark payouts as paid
    UPDATE car_icp_monthly
    SET
        payout_status = 'paid',
        paid_at = NOW()
    WHERE year_month = p_year_month
    AND payout_status = 'pending';

    -- Update pool status
    UPDATE pool_monthly_totals
    SET
        status = 'distributed',
        distributed_at = NOW(),
        owners_participating = v_owners_paid,
        updated_at = NOW()
    WHERE year_month = p_year_month;

    RETURN QUERY SELECT v_owners_paid, v_total_distributed;
END;
$$;

-- 5. Function: Accumulate pool from bookings (called by payment processing)
-- =====================================================
CREATE OR REPLACE FUNCTION accumulate_pool_contribution(
    p_amount_cents BIGINT,
    p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year_month VARCHAR(7);
BEGIN
    v_year_month := TO_CHAR(NOW(), 'YYYY-MM');

    INSERT INTO pool_monthly_totals (year_month, total_pool_cents, total_bookings)
    VALUES (v_year_month, p_amount_cents, 1)
    ON CONFLICT (year_month) DO UPDATE SET
        total_pool_cents = pool_monthly_totals.total_pool_cents + p_amount_cents,
        total_bookings = pool_monthly_totals.total_bookings + 1,
        updated_at = NOW();
END;
$$;

-- 6. View: Owner ICP Dashboard
-- =====================================================
CREATE OR REPLACE VIEW v_owner_icp_dashboard AS
SELECT
    icp.owner_id,
    icp.year_month,
    icp.car_id,
    c.brand || ' ' || c.model AS car_name,

    -- Scores
    icp.availability_score,
    icp.demand_score,
    icp.quality_score,
    icp.category_score,
    icp.icp_score,

    -- Raw metrics
    icp.days_available,
    icp.days_in_month,
    icp.days_booked,
    icp.total_bookings,
    icp.cancellations_by_owner,
    icp.avg_rating,

    -- Pool info
    icp.pool_share_percent,
    icp.pool_payout_cents,
    icp.payout_status,

    -- Pool total for context
    pmt.total_pool_cents AS month_pool_total,
    pmt.cars_participating AS total_cars_in_pool

FROM car_icp_monthly icp
JOIN cars c ON c.id = icp.car_id
LEFT JOIN pool_monthly_totals pmt ON pmt.year_month = icp.year_month;

-- 7. RLS Policies
-- =====================================================
ALTER TABLE car_icp_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_monthly_totals ENABLE ROW LEVEL SECURITY;

-- Owners can see their own ICP data
CREATE POLICY "owners_view_own_icp" ON car_icp_monthly
    FOR SELECT USING (owner_id = auth.uid());

-- Admins can see all
CREATE POLICY "admins_view_all_icp" ON car_icp_monthly
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Pool totals are public (transparency)
CREATE POLICY "public_view_pool_totals" ON pool_monthly_totals
    FOR SELECT USING (true);

-- 8. Create car_views table if not exists (for demand tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.car_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100),
    source VARCHAR(50) -- 'search', 'direct', 'recommendation'
);

CREATE INDEX IF NOT EXISTS idx_car_views_car ON car_views(car_id);
CREATE INDEX IF NOT EXISTS idx_car_views_date ON car_views(viewed_at);

-- 9. Scheduled job for monthly calculation (pg_cron)
-- =====================================================
-- Run on 1st of each month at 3 AM
SELECT cron.schedule(
    'calculate-monthly-icp',
    '0 3 1 * *',
    $$
    SELECT calculate_monthly_icp(TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM'));
    SELECT distribute_monthly_pool(TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM'));
    $$
);

-- 10. Comments for documentation
-- =====================================================
COMMENT ON TABLE car_icp_monthly IS 'Monthly ICP (Índice de Contribución al Pool) scores per car for comodato distribution';
COMMENT ON COLUMN car_icp_monthly.availability_score IS 'Days available / days in month (0-1)';
COMMENT ON COLUMN car_icp_monthly.demand_score IS 'Booking demand factor (0.5-1.5)';
COMMENT ON COLUMN car_icp_monthly.quality_score IS 'Owner behavior factor (0.8-1.2)';
COMMENT ON COLUMN car_icp_monthly.category_score IS 'Vehicle category factor (1.0-1.1)';
COMMENT ON COLUMN car_icp_monthly.icp_score IS 'Final ICP = availability × demand × quality × category';

COMMENT ON FUNCTION calculate_monthly_icp IS 'Calculates ICP scores for all comodato cars in a given month';
COMMENT ON FUNCTION distribute_monthly_pool IS 'Distributes pool payouts to owner wallets based on ICP';
