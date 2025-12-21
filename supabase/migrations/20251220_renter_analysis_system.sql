-- =====================================================
-- RENTER ANALYSIS SYSTEM
-- Sistema completo para análisis de perfil del locatario
-- Permite a propietarios tomar decisiones informadas
-- =====================================================

-- Función principal: Obtener análisis completo del renter
CREATE OR REPLACE FUNCTION get_renter_analysis(p_renter_id UUID, p_booking_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_profile RECORD;
  v_stats RECORD;
  v_risk RECORD;
  v_reviews JSONB;
  v_recent_bookings JSONB;
  v_verification RECORD;
  v_warnings JSONB := '[]'::JSONB;
  v_is_authorized BOOLEAN := FALSE;
  v_caller_id UUID := auth.uid();
BEGIN
  -- Autorización:
  -- A) Si hay booking_id, el caller debe ser owner del auto.
  -- B) Si no hay booking_id, debe existir relación owner<->renter o ser admin.
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado para ver este análisis';
  END IF;

  IF p_booking_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = p_booking_id
        AND c.owner_id = v_caller_id
    ) INTO v_is_authorized;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.renter_id = p_renter_id
        AND c.owner_id = v_caller_id
        AND b.status IN ('pending','confirmed','in_progress','completed','cancelled','expired')
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized AND to_regclass('public.admin_users') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = v_caller_id AND is_active = TRUE
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'No autorizado para ver este análisis';
  END IF;

  -- 1. Obtener perfil básico del renter
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.id_verified,
    p.phone_verified,
    p.email_verified,
    p.phone,
    EXTRACT(YEAR FROM AGE(NOW(), p.created_at))::INT AS years_as_member
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_renter_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Renter no encontrado');
  END IF;

  -- 2. Estadísticas de bookings
  -- Preferimos cancelled_by_role cuando está disponible, con fallback a cancellation_reason
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_rentals,
    COUNT(*) FILTER (
      WHERE status = 'cancelled'
        AND (
          cancelled_by_role = 'renter'
          OR (
            cancelled_by_role IS NULL AND (
              cancellation_reason ILIKE '%user%' OR
              cancellation_reason ILIKE '%renter%' OR
              cancellation_reason ILIKE '%locatario%' OR
              cancellation_reason ILIKE '%cancelled by user%' OR
              cancellation_reason ILIKE '%cancelled by renter%'
            )
          )
        )
    ) AS cancellations_by_renter,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS total_cancellations,
    COUNT(*) AS total_bookings,
    COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) AS avg_booking_value,
    MAX(end_at) AS last_rental_date
  INTO v_stats
  FROM bookings
  WHERE renter_id = p_renter_id;

  -- 3. Perfil de riesgo (si existe)
  SELECT
    drp.class AS risk_class,
    drp.good_years AS years_without_claims,
    drp.updated_at AS risk_updated_at,
    FALSE AS has_bonus_protection
  INTO v_risk
  FROM driver_risk_profile drp
  WHERE drp.user_id = p_renter_id;

  -- Bonus protector (si existe tabla driver_protection_addons)
  IF to_regclass('public.driver_protection_addons') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM driver_protection_addons dpa
      WHERE dpa.user_id = p_renter_id
        AND dpa.addon_type = 'bonus_protector'
        AND dpa.is_active = true
        AND (dpa.expires_at IS NULL OR dpa.expires_at > NOW())
        AND dpa.claims_used < dpa.max_protected_claims
    ) INTO v_risk.has_bonus_protection;
  END IF;

  -- 4. Reviews recibidas como renter (de propietarios)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'rating', r.rating,
        'comment', r.comment,
        'created_at', r.created_at,
        'reviewer_name', LEFT(p.full_name, POSITION(' ' IN p.full_name || ' ')) || SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name || ' ') + 1 FOR 1) || '.',
        'car_name', c.brand || ' ' || c.model
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_reviews
  FROM reviews r
  JOIN profiles p ON r.reviewer_id = p.id
  JOIN bookings b ON r.booking_id = b.id
  JOIN cars c ON b.car_id = c.id
  WHERE r.reviewee_id = p_renter_id
  AND r.reviewer_id != p_renter_id -- Reviews de owners hacia el renter
  LIMIT 10;

  -- 5. Bookings recientes (últimos 5)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'car_name', c.brand || ' ' || c.model,
        'start_at', b.start_at,
        'end_at', b.end_at,
        'status', b.status,
        'total_amount', b.total_amount
      )
      ORDER BY b.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_recent_bookings
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  WHERE b.renter_id = p_renter_id
  AND b.status IN ('completed', 'cancelled', 'confirmed')
  LIMIT 5;

  -- 6. Estado de verificación
  SELECT
    COALESCE(v_profile.id_verified, FALSE) AS id_verified,
    COALESCE(v_profile.phone_verified, FALSE) AS phone_verified,
    COALESCE(v_profile.email_verified, FALSE) AS email_verified,
    EXISTS (
      SELECT 1 FROM user_documents ud
      WHERE ud.user_id = p_renter_id
        AND ud.kind IN ('driver_license', 'license_front', 'license_back')
        AND ud.status = 'verified'
    ) AS license_verified
  INTO v_verification;

  -- 7. Generar advertencias si corresponde
  -- Alta tasa de cancelaciones
  IF v_stats.total_bookings > 2 AND
     v_stats.cancellations_by_renter::FLOAT / NULLIF(v_stats.total_bookings, 0) > 0.3 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'high_cancellation_rate',
      'severity', 'warning',
      'message', 'Este locatario tiene una tasa de cancelación alta (' ||
                 ROUND((v_stats.cancellations_by_renter::FLOAT / v_stats.total_bookings * 100)::NUMERIC, 0) || '%)'
    );
  END IF;

  -- Usuario nuevo (menos de 30 días)
  IF v_profile.created_at > NOW() - INTERVAL '30 days' THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'new_user',
      'severity', 'info',
      'message', 'Usuario nuevo en la plataforma (menos de 30 días)'
    );
  END IF;

  -- Sin verificación de identidad
  IF NOT COALESCE(v_profile.id_verified, FALSE) THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'unverified_identity',
      'severity', 'warning',
      'message', 'El locatario no ha verificado su identidad'
    );
  END IF;

  -- Sin alquileres previos
  IF v_stats.completed_rentals = 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'first_rental',
      'severity', 'info',
      'message', 'Este sería el primer alquiler del locatario'
    );
  END IF;

  -- Clase de riesgo alta
  IF v_risk.risk_class IS NOT NULL AND v_risk.risk_class >= 7 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'high_risk_class',
      'severity', 'alert',
      'message', 'Perfil de riesgo elevado según historial de conducción'
    );
  END IF;

  -- 8. Calcular score general (0-100)
  DECLARE
    v_score INT := 50; -- Base score
  BEGIN
    -- Bonus por alquileres completados (+2 por cada uno, máx +20)
    v_score := v_score + LEAST(v_stats.completed_rentals * 2, 20);

    -- Bonus por años como miembro (+5 por año, máx +15)
    v_score := v_score + LEAST(v_profile.years_as_member * 5, 15);

    -- Bonus por verificaciones (+5 cada una)
    IF v_verification.id_verified THEN v_score := v_score + 5; END IF;
    IF v_verification.phone_verified THEN v_score := v_score + 3; END IF;
    IF v_verification.license_verified THEN v_score := v_score + 5; END IF;

    -- Bonus por años sin siniestros (+3 por año, máx +12)
    IF v_risk.years_without_claims IS NOT NULL THEN
      v_score := v_score + LEAST(v_risk.years_without_claims * 3, 12);
    END IF;

    -- Penalización por cancelaciones (-10 por cada una del renter)
    v_score := v_score - (v_stats.cancellations_by_renter * 10);

    -- Penalización por clase de riesgo alta
    IF v_risk.risk_class IS NOT NULL AND v_risk.risk_class >= 7 THEN
      v_score := v_score - ((v_risk.risk_class - 6) * 5);
    END IF;

    -- Clamp entre 0 y 100
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Construir resultado final
    v_result := jsonb_build_object(
      'renter_id', p_renter_id,
      'profile', jsonb_build_object(
        'full_name', v_profile.full_name,
        'avatar_url', v_profile.avatar_url,
        'member_since', v_profile.created_at,
        'years_as_member', v_profile.years_as_member,
        'phone', CASE
          WHEN p_booking_id IS NOT NULL THEN v_profile.phone
          ELSE NULL
        END -- Solo mostrar teléfono si hay booking específico
      ),
      'verification', jsonb_build_object(
        'id_verified', COALESCE(v_verification.id_verified, FALSE),
        'phone_verified', COALESCE(v_verification.phone_verified, FALSE),
        'email_verified', COALESCE(v_verification.email_verified, FALSE),
        'license_verified', COALESCE(v_verification.license_verified, FALSE),
        'verification_score', (
          (CASE WHEN v_verification.id_verified THEN 1 ELSE 0 END) +
          (CASE WHEN v_verification.phone_verified THEN 1 ELSE 0 END) +
          (CASE WHEN v_verification.email_verified THEN 1 ELSE 0 END) +
          (CASE WHEN v_verification.license_verified THEN 1 ELSE 0 END)
        )
      ),
      'stats', jsonb_build_object(
        'completed_rentals', v_stats.completed_rentals,
        'total_bookings', v_stats.total_bookings,
        'cancellations_by_renter', v_stats.cancellations_by_renter,
        'cancellation_rate', CASE
          WHEN v_stats.total_bookings > 0
          THEN ROUND((v_stats.cancellations_by_renter::FLOAT / v_stats.total_bookings * 100)::NUMERIC, 1)
          ELSE 0
        END,
        'avg_booking_value', ROUND(v_stats.avg_booking_value::NUMERIC, 2),
        'last_rental_date', v_stats.last_rental_date
      ),
      'risk_profile', jsonb_build_object(
        'risk_level', CASE
          WHEN v_risk.risk_class IS NULL THEN 'unknown'
          WHEN v_risk.risk_class <= 2 THEN 'excellent'
          WHEN v_risk.risk_class <= 5 THEN 'good'
          WHEN v_risk.risk_class <= 7 THEN 'regular'
          ELSE 'attention'
        END,
        'years_without_claims', COALESCE(v_risk.years_without_claims, 0),
        'has_bonus_protection', COALESCE(v_risk.has_bonus_protection, FALSE)
      ),
      'reviews', v_reviews,
      'reviews_summary', jsonb_build_object(
        'count', jsonb_array_length(v_reviews),
        'avg_rating', (
          SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)
          FROM reviews r
          WHERE r.reviewee_id = p_renter_id
          AND r.reviewer_id != p_renter_id
        )
      ),
      'recent_bookings', v_recent_bookings,
      'warnings', v_warnings,
      'trust_score', v_score,
      'trust_level', CASE
        WHEN v_score >= 80 THEN 'excellent'
        WHEN v_score >= 60 THEN 'good'
        WHEN v_score >= 40 THEN 'regular'
        ELSE 'new_or_risky'
      END
    );
  END;

  RETURN v_result;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION get_renter_analysis(UUID, UUID) TO authenticated;

-- Comentario
COMMENT ON FUNCTION get_renter_analysis IS 'Obtiene análisis completo del perfil de un locatario para que el propietario tome decisiones informadas sobre aprobación de reservas';
