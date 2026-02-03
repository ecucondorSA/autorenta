-- ============================================================================
-- FIX: get_available_cars - Include actual lat/lng coordinates
-- Date: 2026-02-03
-- Bug: location.lat and location.lng were hardcoded as NULL
-- ============================================================================

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
    price_per_day NUMERIC,
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
        COALESCE(c.brand_text_backup, c.ai_recognized_brand, 'Unknown')::TEXT as brand,
        COALESCE(c.model_text_backup, c.ai_recognized_model, 'Unknown')::TEXT as model,
        c.year,
        ''::TEXT as plate,
        c.price_per_day::NUMERIC,
        c.currency::TEXT,
        c.status::TEXT,
        jsonb_build_object(
            'city', COALESCE(c.location_city, c.city),
            'state', COALESCE(c.location_state, c.province),
            'country', COALESCE(c.location_country, c.country),
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
        COALESCE(c.rating_avg, 0)::NUMERIC as avg_rating,
        (COALESCE(c.rating_avg, 3.0) * 0.1 + 0.5)::FLOAT8 as score
    FROM cars c
    LEFT JOIN profiles p ON c.owner_id = p.id
    WHERE c.status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM bookings bk
          WHERE bk.car_id = c.id
            AND bk.status IN ('pending', 'confirmed', 'in_progress')
            AND bk.start_at < p_end_date
            AND bk.end_at > p_start_date
      )
      AND (p_min_price IS NULL OR c.price_per_day >= p_min_price)
      AND (p_max_price IS NULL OR c.price_per_day <= p_max_price)
      AND (p_transmission IS NULL OR c.transmission::TEXT = ANY(p_transmission))
      AND (NOT p_verified_owner OR (p.email_verified = TRUE AND p.phone_verified = TRUE))
    ORDER BY score DESC, c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_available_cars IS 'Returns available cars with location coordinates for map display';
