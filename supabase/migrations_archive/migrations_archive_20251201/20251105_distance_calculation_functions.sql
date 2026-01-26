-- Migration: Distance calculation functions (Haversine formula)
-- Date: 2025-11-05
-- Purpose: Provide RPC functions for distance-based pricing and car filtering

-- ============================================================================
-- FUNCTION 1: Calculate distance between two points using Haversine formula
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_distance_km(
  p_lat1 NUMERIC,
  p_lng1 NUMERIC,
  p_lat2 NUMERIC,
  p_lng2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_earth_radius_km CONSTANT NUMERIC := 6371; -- Earth radius in kilometers
  v_dlat NUMERIC;
  v_dlng NUMERIC;
  v_a NUMERIC;
  v_c NUMERIC;
  v_lat1_rad NUMERIC;
  v_lat2_rad NUMERIC;
BEGIN
  -- Handle NULL inputs
  IF p_lat1 IS NULL OR p_lng1 IS NULL OR p_lat2 IS NULL OR p_lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert to radians
  v_lat1_rad := radians(p_lat1);
  v_lat2_rad := radians(p_lat2);
  v_dlat := radians(p_lat2 - p_lat1);
  v_dlng := radians(p_lng2 - p_lng1);

  -- Haversine formula
  v_a := sin(v_dlat / 2) ^ 2 +
         cos(v_lat1_rad) * cos(v_lat2_rad) *
         sin(v_dlng / 2) ^ 2;

  v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));

  -- Return distance in kilometers, rounded to 2 decimal places
  RETURN ROUND(v_earth_radius_km * v_c, 2);
END;
$$;

COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance between two GPS coordinates using Haversine formula. Returns distance in kilometers.';

-- ============================================================================
-- FUNCTION 2: Get cars within a specific radius from user location
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cars_within_radius(
  p_user_lat NUMERIC,
  p_user_lng NUMERIC,
  p_radius_km NUMERIC,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  title TEXT,
  brand_text_backup TEXT,
  model_text_backup TEXT,
  year INTEGER,
  price_per_day NUMERIC,
  currency TEXT,
  value_usd NUMERIC,
  location_city TEXT,
  location_state TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_formatted_address TEXT,
  distance_km NUMERIC,
  status TEXT,
  photos_count BIGINT,
  avg_rating NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.owner_id,
    c.title,
    c.brand_text_backup,
    c.model_text_backup,
    c.year,
    c.price_per_day,
    c.currency,
    c.value_usd,
    c.location_city,
    c.location_state,
    c.location_lat,
    c.location_lng,
    c.location_formatted_address,
    calculate_distance_km(p_user_lat, p_user_lng, c.location_lat, c.location_lng) AS distance_km,
    c.status::TEXT,
    (SELECT COUNT(*) FROM car_photos WHERE car_id = c.id) AS photos_count,
    (SELECT AVG(rating) FROM reviews WHERE car_id = c.id) AS avg_rating
  FROM cars c
  WHERE
    c.status = 'active'
    AND c.location_lat IS NOT NULL
    AND c.location_lng IS NOT NULL
    -- Only include cars within the specified radius
    AND calculate_distance_km(p_user_lat, p_user_lng, c.location_lat, c.location_lng) <= p_radius_km
    -- Check availability if dates provided
    AND (
      p_start_date IS NULL
      OR p_end_date IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.car_id = c.id
          AND b.status IN ('pending', 'confirmed', 'in_progress')
          AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start_date, p_end_date, '[]')
      )
    )
  ORDER BY distance_km ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_cars_within_radius IS 'Get available cars within a specific radius from user location. Returns cars ordered by distance. Optionally filters by availability dates.';

-- ============================================================================
-- FUNCTION 3: Calculate distance-based pricing metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_distance_based_pricing(
  p_distance_km NUMERIC,
  p_base_guarantee_usd INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_tier TEXT;
  v_guarantee_multiplier NUMERIC;
  v_delivery_fee_per_km NUMERIC := 0.5; -- ARS per km (from environment config)
  v_min_delivery_distance NUMERIC := 5; -- km
  v_delivery_fee_cents BIGINT;
  v_guarantee_usd INTEGER;
BEGIN
  -- Handle NULL distance
  IF p_distance_km IS NULL THEN
    RETURN jsonb_build_object(
      'tier', NULL,
      'distance_km', NULL,
      'guarantee_multiplier', 1.0,
      'guarantee_usd', p_base_guarantee_usd,
      'delivery_fee_cents', 0,
      'message', 'No distance data available'
    );
  END IF;

  -- Determine tier and multiplier based on distance
  IF p_distance_km < 20 THEN
    v_tier := 'local';
    v_guarantee_multiplier := 1.0;
  ELSIF p_distance_km < 100 THEN
    v_tier := 'regional';
    v_guarantee_multiplier := 1.15;
  ELSE
    v_tier := 'long_distance';
    v_guarantee_multiplier := 1.3;
  END IF;

  -- Calculate adjusted guarantee
  v_guarantee_usd := CEIL(p_base_guarantee_usd * v_guarantee_multiplier);

  -- Calculate delivery fee (only if > min distance)
  IF p_distance_km > v_min_delivery_distance THEN
    v_delivery_fee_cents := ROUND(p_distance_km * v_delivery_fee_per_km * 100);
  ELSE
    v_delivery_fee_cents := 0;
  END IF;

  -- Return JSON with all calculated values
  RETURN jsonb_build_object(
    'tier', v_tier,
    'distance_km', p_distance_km,
    'guarantee_multiplier', v_guarantee_multiplier,
    'guarantee_base_usd', p_base_guarantee_usd,
    'guarantee_adjusted_usd', v_guarantee_usd,
    'delivery_fee_cents', v_delivery_fee_cents,
    'delivery_fee_per_km_ars', v_delivery_fee_per_km,
    'message', CASE
      WHEN v_tier = 'local' THEN 'Auto cercano - Sin recargo en garantía'
      WHEN v_tier = 'regional' THEN 'Distancia media - Garantía +15%'
      ELSE 'Larga distancia - Garantía +30%'
    END
  );
END;
$$;

COMMENT ON FUNCTION calculate_distance_based_pricing IS 'Calculate distance-based pricing metadata including tier, guarantee multiplier, and delivery fee. Returns JSON with all calculated values.';

-- ============================================================================
-- FUNCTION 4: Get distance between renter and car for a booking
-- ============================================================================

CREATE OR REPLACE FUNCTION get_booking_distance(
  p_booking_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_distance_km NUMERIC;
  v_car_lat NUMERIC;
  v_car_lng NUMERIC;
  v_renter_lat NUMERIC;
  v_renter_lng NUMERIC;
BEGIN
  -- Get car location from booking
  SELECT c.location_lat, c.location_lng
  INTO v_car_lat, v_car_lng
  FROM bookings b
  INNER JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  -- Get renter home location
  SELECT p.home_latitude, p.home_longitude
  INTO v_renter_lat, v_renter_lng
  FROM bookings b
  INNER JOIN profiles p ON b.renter_id = p.id
  WHERE b.id = p_booking_id;

  -- Calculate distance
  IF v_car_lat IS NOT NULL AND v_car_lng IS NOT NULL
     AND v_renter_lat IS NOT NULL AND v_renter_lng IS NOT NULL THEN
    v_distance_km := calculate_distance_km(v_renter_lat, v_renter_lng, v_car_lat, v_car_lng);
  ELSE
    v_distance_km := NULL;
  END IF;

  RETURN v_distance_km;
END;
$$;

COMMENT ON FUNCTION get_booking_distance IS 'Get distance between renter home location and car location for a specific booking. Returns NULL if either location is not set.';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- These functions are IMMUTABLE or STABLE and safe to expose via RPC
-- Grant execute to authenticated users (anon key can also call these)
GRANT EXECUTE ON FUNCTION calculate_distance_km TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_cars_within_radius TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_distance_based_pricing TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_booking_distance TO authenticated;

-- Create test data for validation
DO $$
DECLARE
  v_test_distance NUMERIC;
  v_test_pricing JSONB;
BEGIN
  -- Test Haversine: Buenos Aires to Córdoba (approx 700 km)
  v_test_distance := calculate_distance_km(-34.6037, -58.3816, -31.4201, -64.1888);
  RAISE NOTICE 'Test distance BA to Córdoba: % km (expected ~700 km)', v_test_distance;

  -- Test pricing tiers
  v_test_pricing := calculate_distance_based_pricing(15, 500); -- Local
  RAISE NOTICE 'Local tier pricing: %', v_test_pricing;

  v_test_pricing := calculate_distance_based_pricing(50, 500); -- Regional
  RAISE NOTICE 'Regional tier pricing: %', v_test_pricing;

  v_test_pricing := calculate_distance_based_pricing(150, 500); -- Long distance
  RAISE NOTICE 'Long distance tier pricing: %', v_test_pricing;
END;
$$;
