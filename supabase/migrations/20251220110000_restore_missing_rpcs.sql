BEGIN;

-- Re-create bonus protector helper RPCs that the app expects
CREATE OR REPLACE FUNCTION public.list_bonus_protector_options()
RETURNS TABLE (
  protection_level INT,
  price_cents BIGINT,
  price_usd NUMERIC,
  description TEXT,
  validity_days INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    1 AS protection_level,
    1500::BIGINT AS price_cents,
    15.00::NUMERIC AS price_usd,
    'Protege 1 siniestro leve'::TEXT AS description,
    365 AS validity_days
  UNION ALL
  SELECT
    2,
    2500::BIGINT,
    25.00::NUMERIC,
    'Protege hasta 2 siniestros leves o 1 moderado',
    365
  UNION ALL
  SELECT
    3,
    4000::BIGINT,
    40.00::NUMERIC,
    'Protege hasta 3 siniestros leves, 2 moderados o 1 grave',
    365;
END;
$$;

COMMENT ON FUNCTION public.list_bonus_protector_options IS
  'Lista opciones de compra de protector de bonus con precios';

CREATE OR REPLACE FUNCTION public.get_active_bonus_protector(
  p_user_id UUID
)
RETURNS TABLE (
  addon_id UUID,
  protection_level INT,
  purchase_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiry INT,
  price_paid_usd NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dpa.id,
    dpa.protection_level,
    dpa.purchase_date,
    dpa.expires_at,
    EXTRACT(DAY FROM (dpa.expires_at - NOW()))::INT,
    (dpa.price_paid_cents / 100.0)::NUMERIC
  FROM driver_protection_addons dpa
  WHERE dpa.user_id = p_user_id
    AND dpa.addon_type = 'bonus_protector'
    AND dpa.used = FALSE
    AND dpa.expires_at > NOW()
  ORDER BY dpa.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_active_bonus_protector IS
  'Obtiene el protector de bonus activo del usuario (si existe)';

CREATE OR REPLACE FUNCTION public.get_owner_penalties(p_owner_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_cancellations_90d INTEGER;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  SELECT COUNT(*) INTO v_cancellations_90d
  FROM bookings
  WHERE owner_id = p_owner_id
    AND status = 'cancelled_owner'
    AND cancelled_at > NOW() - INTERVAL '90 days';

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_owner_id,
    'visibility_penalty_active', v_profile.visibility_penalty_until IS NOT NULL AND v_profile.visibility_penalty_until > NOW(),
    'visibility_penalty_until', v_profile.visibility_penalty_until,
    'visibility_penalty_days_remaining', CASE
      WHEN v_profile.visibility_penalty_until IS NOT NULL AND v_profile.visibility_penalty_until > NOW()
      THEN EXTRACT(DAY FROM v_profile.visibility_penalty_until - NOW())::INTEGER
      ELSE 0
    END,
    'cancellations_90d', v_cancellations_90d,
    'cancellations_until_suspension', GREATEST(0, 3 - v_cancellations_90d),
    'is_suspended', v_profile.suspended_at IS NOT NULL,
    'suspension_reason', v_profile.suspension_reason
  );
END;
$$;

COMMENT ON FUNCTION public.get_owner_penalties IS 'Resumen de penalizaciones activas de un owner';

CREATE OR REPLACE VIEW public.referral_stats_by_user AS
SELECT
  rc.user_id,
  rc.code,
  COUNT(r.id) AS total_referrals,
  COUNT(r.id) FILTER (WHERE r.status = 'registered') AS registered_count,
  COUNT(r.id) FILTER (WHERE r.status = 'verified') AS verified_count,
  COUNT(r.id) FILTER (WHERE r.status = 'first_car') AS first_car_count,
  COUNT(r.id) FILTER (WHERE r.status = 'first_booking') AS first_booking_count,
  COALESCE(SUM(rw.amount_cents) FILTER (WHERE rw.status = 'paid'), 0) AS total_earned_cents,
  COALESCE(SUM(rw.amount_cents) FILTER (WHERE rw.status IN ('pending', 'approved')), 0) AS pending_cents
FROM public.referral_codes rc
LEFT JOIN public.referrals r ON r.referral_code_id = rc.id
LEFT JOIN public.referral_rewards rw ON rw.referral_id = r.id AND rw.user_id = rc.user_id
WHERE rc.is_active = true
GROUP BY rc.user_id, rc.code;

COMMENT ON VIEW public.referral_stats_by_user IS 'Estadísticas de referidos por usuario';

GRANT EXECUTE ON FUNCTION public.list_bonus_protector_options() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_active_bonus_protector(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_penalties(UUID) TO authenticated;

COMMIT;
