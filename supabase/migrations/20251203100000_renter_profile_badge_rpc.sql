-- =====================================================
-- RPC: get_renter_profile_badge
-- Devuelve perfil simplificado del locatario para que
-- el locador pueda ver un resumen (sin exponer clase exacta)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_renter_profile_badge(p_renter_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_class INTEGER;
  v_badge_level TEXT;
  v_has_protection BOOLEAN := FALSE;
  v_total_rentals INTEGER;
  v_years_without_claims INTEGER;
  v_renter_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = 'P0001';
  END IF;

  -- 1) Si el caller es el renter, permitido
  IF v_caller_id = p_renter_id THEN
    v_is_authorized := TRUE;
  END IF;

  -- 2) Si es owner con relación en bookings, permitido
  IF NOT v_is_authorized THEN
    SELECT EXISTS(
      SELECT 1
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.renter_id = p_renter_id
        AND c.owner_id = v_caller_id
        AND b.status IN ('pending','confirmed','in_progress','completed','cancelled','expired')
    ) INTO v_is_authorized;
  END IF;

  -- 3) Admin (si existe tabla admin_users)
  IF NOT v_is_authorized AND to_regclass('public.admin_users') IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM admin_users
      WHERE user_id = v_caller_id AND is_active = TRUE
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = 'P0001';
  END IF;

  -- Driver risk profile
  SELECT COALESCE(drp.class, 5), COALESCE(drp.good_years, 0)
  INTO v_class, v_years_without_claims
  FROM driver_risk_profile drp
  WHERE drp.user_id = p_renter_id;

  v_badge_level := CASE
    WHEN v_class <= 2 THEN 'excelente'
    WHEN v_class <= 5 THEN 'bueno'
    WHEN v_class <= 7 THEN 'regular'
    ELSE 'atencion'
  END;

  -- Bonus protector (si existe tabla driver_protection_addons)
  IF to_regclass('public.driver_protection_addons') IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM driver_protection_addons
      WHERE user_id = p_renter_id
        AND addon_type = 'bonus_protector'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND claims_used < max_protected_claims
    ) INTO v_has_protection;
  END IF;

  -- Total completed rentals
  SELECT COUNT(*)
  INTO v_total_rentals
  FROM bookings
  WHERE renter_id = p_renter_id
    AND status = 'completed';

  -- Renter name (schema real)
  SELECT COALESCE(p.full_name, 'Usuario')
  INTO v_renter_name
  FROM profiles p
  WHERE p.id = p_renter_id;

  RETURN json_build_object(
    'renter_id', p_renter_id,
    'renter_name', v_renter_name,
    'badge_level', v_badge_level,
    'has_protection', COALESCE(v_has_protection, false),
    'total_rentals', COALESCE(v_total_rentals, 0),
    'years_without_claims', COALESCE(v_years_without_claims, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_renter_profile_badge(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_renter_profile_badge IS
'Returns simplified renter profile badge for owners to see.
Does not expose exact driver class, only badge level (excelente/bueno/regular/atencion).
Also shows if renter has active bonus protection when available.';
