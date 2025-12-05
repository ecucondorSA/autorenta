-- =====================================================
-- RPC: get_renter_profile_badge
-- Devuelve perfil simplificado del locatario para que
-- el locador pueda ver un resumen (sin exponer clase exacta)
-- =====================================================

CREATE OR REPLACE FUNCTION get_renter_profile_badge(p_renter_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_class INTEGER;
  v_badge_level TEXT;
  v_has_protection BOOLEAN;
  v_total_rentals INTEGER;
  v_years_without_claims INTEGER;
  v_renter_name TEXT;
BEGIN
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_renter_profile_badge(UUID) TO authenticated;

COMMENT ON FUNCTION get_renter_profile_badge IS
'Returns simplified renter profile badge for owners to see.
Does not expose exact driver class, only badge level (excelente/bueno/regular/atencion).
Also shows if renter has active bonus protection.';
