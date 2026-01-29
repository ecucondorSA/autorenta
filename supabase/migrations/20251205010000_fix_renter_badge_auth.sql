-- =====================================================
-- Migration: Fix Authorization for get_renter_profile_badge
-- Date: 2025-12-05
-- Description: Adds authorization check to prevent any authenticated
--              user from querying any other user's profile.
--
-- SECURITY FIX #8: Only allow access if:
--   1. Caller is the renter themselves (viewing own profile)
--   2. Caller is an owner with a pending/confirmed booking with this renter
--   3. Caller is an admin
-- =====================================================

CREATE OR REPLACE FUNCTION get_renter_profile_badge(p_renter_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_result JSON;
  v_class INTEGER;
  v_badge_level TEXT;
  v_has_protection BOOLEAN;
  v_total_rentals INTEGER;
  v_years_without_claims INTEGER;
  v_renter_name TEXT;
BEGIN
  -- =====================================================
  -- SECURITY FIX #8: Authorization Check
  -- =====================================================

  -- Get caller's user ID from JWT
  v_caller_id := auth.uid();

  -- Reject if not authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: usuario no autenticado'
      USING ERRCODE = 'P0001';
  END IF;

  -- Case 1: Caller is viewing their own profile
  IF v_caller_id = p_renter_id THEN
    v_is_authorized := TRUE;
  END IF;

  -- Case 2: Caller is an owner with active/pending booking with this renter
  IF NOT v_is_authorized THEN
    SELECT EXISTS(
      SELECT 1
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.renter_id = p_renter_id
        AND c.owner_id = v_caller_id
        AND b.status IN ('pending_approval', 'confirmed', 'in_progress', 'pending')
    ) INTO v_is_authorized;
  END IF;

  -- Case 3: Caller is an admin
  IF NOT v_is_authorized THEN
    SELECT EXISTS(
      SELECT 1
      FROM admin_users
      WHERE user_id = v_caller_id
        AND is_active = TRUE
    ) INTO v_is_authorized;
  END IF;

  -- Reject if none of the authorization cases match
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'No autorizado: no tienes permiso para ver este perfil'
      USING ERRCODE = 'P0001';
  END IF;

  -- =====================================================
  -- Original Logic (unchanged)
  -- =====================================================

  -- Get driver profile
  SELECT
    COALESCE(drp.class, 5),
    COALESCE(drp.good_years, 0)
  INTO v_class, v_years_without_claims
  FROM driver_risk_profile drp
  WHERE drp.user_id = p_renter_id;

  -- Default values if no profile
  IF v_class IS NULL THEN
    v_class := 5;
    v_years_without_claims := 0;
  END IF;

  -- Determine badge level (simplified, not exact class)
  -- Excelente: clase 0-2
  -- Bueno: clase 3-5
  -- Regular: clase 6-7
  -- Atención: clase 8-10
  v_badge_level := CASE
    WHEN v_class <= 2 THEN 'excelente'
    WHEN v_class <= 5 THEN 'bueno'
    WHEN v_class <= 7 THEN 'regular'
    ELSE 'atencion'
  END;

  -- Check if has active bonus protector
  SELECT EXISTS(
    SELECT 1 FROM bonus_protectors
    WHERE user_id = p_renter_id
    AND is_active = true
    AND remaining_uses > 0
    AND expires_at > NOW()
  ) INTO v_has_protection;

  -- Get total completed rentals
  SELECT COUNT(*)
  INTO v_total_rentals
  FROM bookings
  WHERE renter_id = p_renter_id
  AND status = 'completed';

  -- Get renter name
  SELECT
    COALESCE(p.first_name || ' ' || LEFT(COALESCE(p.last_name, ''), 1) || '.', 'Usuario')
  INTO v_renter_name
  FROM profiles p
  WHERE p.id = p_renter_id;

  -- Build result JSON
  v_result := json_build_object(
    'renter_id', p_renter_id,
    'renter_name', COALESCE(v_renter_name, 'Usuario'),
    'badge_level', v_badge_level,
    'has_protection', COALESCE(v_has_protection, false),
    'total_rentals', COALESCE(v_total_rentals, 0),
    'years_without_claims', v_years_without_claims
  );

  RETURN v_result;
END;
$$;

-- Update comment to reflect security changes
COMMENT ON FUNCTION get_renter_profile_badge IS
'Returns simplified renter profile badge for owners to see.
Does not expose exact driver class, only badge level (excelente/bueno/regular/atencion).

SECURITY: Requires authorization. Access granted only if:
  1. Caller is the renter (viewing own profile)
  2. Caller is an owner with pending/confirmed booking with this renter
  3. Caller is an admin

Raises exception P0001 if unauthorized.';
