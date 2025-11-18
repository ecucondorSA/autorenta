-- ============================================================================
-- Migration: Create Review Functions for Locatario Flow
-- Date: 2025-11-17
-- Description: Create create_review and update_user_stats_v2_for_booking functions
-- ============================================================================

-- ============================================
-- 1. CREATE REVIEW FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_review(
  p_booking_id UUID,
  p_reviewer_id UUID,
  p_reviewee_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_review_type TEXT DEFAULT 'renter_to_owner',
  p_car_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id UUID;
  v_booking RECORD;
  v_existing_review_count INTEGER;
BEGIN
  -- Validar que el booking está completado
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not completed or not found';
  END IF;

  -- Validar período de review (14 días máximo después de completado)
  IF v_booking.updated_at + INTERVAL '14 days' < NOW() THEN
    RAISE EXCEPTION 'Review period has expired (14 days after booking completion)';
  END IF;

  -- Validar que no existe review previa para este booking por este reviewer
  SELECT COUNT(*) INTO v_existing_review_count
  FROM reviews
  WHERE booking_id = p_booking_id AND reviewer_id = p_reviewer_id;

  IF v_existing_review_count > 0 THEN
    RAISE EXCEPTION 'Review already exists for this booking by this reviewer';
  END IF;

  -- Validar rating entre 1-5
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Validar review_type
  IF p_review_type NOT IN ('renter_to_owner', 'owner_to_renter') THEN
    RAISE EXCEPTION 'Invalid review_type. Must be renter_to_owner or owner_to_renter';
  END IF;

  -- Si no se especificó car_id, obtenerlo del booking
  IF p_car_id IS NULL THEN
    SELECT car_id INTO p_car_id FROM bookings WHERE id = p_booking_id;
  END IF;

  -- Crear la review
  INSERT INTO reviews (
    booking_id,
    reviewer_id,
    reviewee_id,
    car_id,
    rating,
    comment,
    review_type,
    is_visible
  ) VALUES (
    p_booking_id,
    p_reviewer_id,
    p_reviewee_id,
    p_car_id,
    p_rating,
    p_comment,
    p_review_type,
    true
  ) RETURNING id INTO v_review_id;

  -- Actualizar estadísticas del usuario evaluado
  PERFORM update_user_stats_v2_for_booking(p_booking_id);

  -- Log de la review creada
  RAISE NOTICE 'Review created: ID=%, Booking=%, Type=%, Rating=%',
    v_review_id, p_booking_id, p_review_type, p_rating;

  RETURN v_review_id;
END;
$$;

-- ============================================
-- 2. UPDATE USER STATS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats_v2_for_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_reviewee_id UUID;
  v_total_reviews INTEGER;
  v_avg_rating NUMERIC;
BEGIN
  -- Obtener información del booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Determinar quién es el reviewee basado en el tipo de review
  -- Para reviews de renter_to_owner, reviewee es el owner del auto
  -- Para reviews de owner_to_renter, reviewee es el renter
  SELECT
    CASE
      WHEN r.review_type = 'renter_to_owner' THEN c.owner_id
      WHEN r.review_type = 'owner_to_renter' THEN v_booking.renter_id
    END INTO v_reviewee_id
  FROM reviews r
  JOIN cars c ON r.car_id = c.id
  WHERE r.booking_id = p_booking_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  -- Si no hay review, no hacer nada
  IF v_reviewee_id IS NULL THEN
    RETURN;
  END IF;

  -- Calcular estadísticas para el reviewee
  SELECT
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as avg_rating
  INTO v_total_reviews, v_avg_rating
  FROM reviews
  WHERE reviewee_id = v_reviewee_id
    AND is_visible = true;

  -- Actualizar las estadísticas del usuario
  UPDATE profiles
  SET
    rating_avg = v_avg_rating,
    rating_count = v_total_reviews,
    updated_at = NOW()
  WHERE id = v_reviewee_id;

  -- Log de actualización
  RAISE NOTICE 'User stats updated: User=%, Reviews=%, Avg Rating=%',
    v_reviewee_id, v_total_reviews, v_avg_rating;
END;
$$;

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION create_review(UUID, UUID, UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_stats_v2_for_booking(UUID) TO authenticated;

-- ============================================
-- 4. ADD COMMENTS
-- ============================================

COMMENT ON FUNCTION create_review(UUID, UUID, UUID, INTEGER, TEXT, TEXT, UUID) IS
'Creates a review for a completed booking with validation of timing and uniqueness';

COMMENT ON FUNCTION update_user_stats_v2_for_booking(UUID) IS
'Updates user rating statistics after a review is created';

-- ============================================
-- 5. SUCCESS MESSAGE
-- ============================================

SELECT
    'Review functions created: ' ||
    'create_review() and update_user_stats_v2_for_booking() ' ||
    'are now available for the locatario review flow' AS status;
