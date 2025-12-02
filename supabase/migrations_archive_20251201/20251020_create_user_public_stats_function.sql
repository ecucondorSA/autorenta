-- Migration: Create function to get user public stats
-- Date: 2025-10-20
-- Purpose: Obtener estadísticas públicas de un usuario para perfil público

CREATE OR REPLACE FUNCTION get_user_public_stats(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  owner_rating NUMERIC;
  owner_reviews_cnt INTEGER;
  owner_trips_cnt INTEGER;
  renter_rating NUMERIC;
  renter_reviews_cnt INTEGER;
  renter_trips_cnt INTEGER;
  total_cars_cnt INTEGER;
BEGIN
  -- Owner stats (reviews received as owner)
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO owner_rating, owner_reviews_cnt
  FROM reviews
  WHERE reviewee_id = target_user_id
    AND reviewee_role = 'owner';

  -- Owner trips (bookings for cars they own)
  SELECT COUNT(*)
  INTO owner_trips_cnt
  FROM bookings
  WHERE car_id IN (
    SELECT id FROM cars WHERE owner_id = target_user_id
  )
  AND status = 'completed';

  -- Renter stats (reviews received as renter)
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO renter_rating, renter_reviews_cnt
  FROM reviews
  WHERE reviewee_id = target_user_id
    AND reviewee_role = 'renter';

  -- Renter trips (bookings they made)
  SELECT COUNT(*)
  INTO renter_trips_cnt
  FROM bookings
  WHERE renter_id = target_user_id
    AND status = 'completed';

  -- Total active cars
  SELECT COUNT(*)
  INTO total_cars_cnt
  FROM cars
  WHERE owner_id = target_user_id
    AND status = 'active';

  -- Build result JSON
  result := json_build_object(
    'owner_rating_avg', owner_rating,
    'owner_reviews_count', owner_reviews_cnt,
    'owner_trips_count', owner_trips_cnt,
    'renter_rating_avg', renter_rating,
    'renter_reviews_count', renter_reviews_cnt,
    'renter_trips_count', renter_trips_cnt,
    'total_cars', total_cars_cnt
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_public_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_public_stats(UUID) TO anon;

-- Comment
COMMENT ON FUNCTION get_user_public_stats IS 'Returns public statistics for a user profile including ratings, reviews, and trip counts';
