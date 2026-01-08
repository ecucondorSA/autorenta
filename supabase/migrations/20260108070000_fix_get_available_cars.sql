-- ============================================================================
-- FIX: get_available_cars column names and extensions
-- Date: 2026-01-08
-- Description: Fix column names (start_at/end_at instead of start_date/end_date)
--              and ensure earthdistance extension is properly enabled
-- ============================================================================

-- Enable required extensions for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Drop and recreate function with correct column names
DROP FUNCTION IF EXISTS public.get_available_cars(
    TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE,
    FLOAT8, FLOAT8, INTEGER, INTEGER,
    BIGINT, BIGINT, TEXT[], BOOLEAN, BOOLEAN
);

CREATE OR REPLACE FUNCTION public.get_available_cars(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_lat FLOAT8 DEFAULT NULL,
    p_lng FLOAT8 DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_min_price BIGINT DEFAULT NULL,
    p_max_price BIGINT DEFAULT NULL,
    p_transmission TEXT[] DEFAULT NULL,
    p_verified_owner BOOLEAN DEFAULT FALSE,
    p_no_credit_card BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    brand TEXT,
    model TEXT,
    year INTEGER,
    plate TEXT,
    price_per_day BIGINT,
    currency TEXT,
    status TEXT,
    location JSONB,
    images TEXT[],
    features JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    avg_rating NUMERIC,
    score FLOAT8
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.owner_id,
        COALESCE(b.name, c.brand_text_backup) as brand,
        COALESCE(m.name, c.model_text_backup) as model,
        c.year,
        c.plate,
        c.price_per_day,
        c.currency,
        c.status,
        jsonb_build_object(
            'city', c.city,
            'state', c.province,
            'country', c.country,
            'lat', c.location_lat,
            'lng', c.location_lng
        ) as location,
        COALESCE(
            (
                SELECT array_agg(cp.url ORDER BY cp.position)
                FROM car_photos cp
                WHERE cp.car_id = c.id
                LIMIT 5
            ),
            ARRAY[]::TEXT[]
        ) as images,
        c.features,
        c.created_at,
        c.updated_at,
        p.rating_avg as avg_rating,
        -- Score Calculation using earthdistance
        (
            CASE
                WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND c.location_lat IS NOT NULL AND c.location_lng IS NOT NULL THEN
                    (100 - LEAST(100, (point(c.location_lng, c.location_lat) <@> point(p_lng, p_lat)) * 1.60934)) * 0.5
                ELSE 0
            END
            +
            (COALESCE(p.rating_avg, 3.0) * 10)
        )::FLOAT8 as score

    FROM cars c
    JOIN profiles p ON c.owner_id = p.id
    LEFT JOIN car_brands b ON c.brand_id = b.id
    LEFT JOIN car_models m ON c.model_id = m.id
    WHERE
        c.status = 'active'
        -- FIX: Use correct column names (start_at/end_at)
        AND NOT EXISTS (
            SELECT 1 FROM bookings bk
            WHERE bk.car_id = c.id
            AND bk.status IN ('confirmed', 'pending_payment', 'in_progress')
            AND bk.start_at <= p_end_date
            AND bk.end_at >= p_start_date
        )

        -- Dynamic Filters
        AND (p_min_price IS NULL OR c.price_per_day >= p_min_price)
        AND (p_max_price IS NULL OR c.price_per_day <= p_max_price)
        AND (p_transmission IS NULL OR c.transmission = ANY(p_transmission))
        AND (NOT p_verified_owner OR (p.email_verified AND p.phone_verified))
        AND (NOT p_no_credit_card OR (
            c.payment_methods @> '["debit_card"]' OR
            c.payment_methods @> '["cash"]' OR
            c.payment_methods @> '["transfer"]' OR
            c.payment_methods @> '["wallet"]'
        ))

        -- Geo Filter (rough box filter for performance)
        AND (
            p_lat IS NULL OR p_lng IS NULL OR
            (
                c.location_lat BETWEEN p_lat - 1.0 AND p_lat + 1.0
                AND
                c.location_lng BETWEEN p_lng - 1.0 AND p_lng + 1.0
            )
        )

    ORDER BY
        score DESC,
        c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_available_cars(
    TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE,
    FLOAT8, FLOAT8, INTEGER, INTEGER,
    BIGINT, BIGINT, TEXT[], BOOLEAN, BOOLEAN
) TO anon, authenticated;
