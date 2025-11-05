-- ============================================================================
-- AUTORENTA - RPC FUNCTIONS: DRIVER PROFILE MANAGEMENT
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Funciones RPC para gestión de perfiles de conductor
-- ============================================================================
--
-- FUNCIONES INCLUIDAS:
-- 1. initialize_driver_profile(user_id) - Crea perfil inicial
-- 2. get_driver_profile(user_id) - Obtiene perfil completo
-- 3. update_driver_class_on_event(user_id, claim_with_fault, severity) - Actualiza clase
-- 4. get_class_benefits(class) - Obtiene beneficios de una clase
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. INITIALIZE_DRIVER_PROFILE
-- ============================================================================
-- Crea un perfil inicial para un conductor nuevo (clase 5, score 50)

CREATE OR REPLACE FUNCTION initialize_driver_profile(
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Verificar si ya existe un perfil
  SELECT EXISTS (
    SELECT 1 FROM driver_risk_profile WHERE user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'El usuario ya tiene un perfil de conductor';
  END IF;

  -- Crear perfil inicial
  INSERT INTO driver_risk_profile (
    user_id,
    class,
    driver_score,
    good_years,
    total_claims,
    claims_with_fault,
    last_class_update,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    5,     -- Clase base
    50,    -- Score neutral
    0,     -- Sin años buenos
    0,     -- Sin siniestros
    0,     -- Sin siniestros con culpa
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Perfil de conductor creado para usuario %', p_user_id;
  RETURN p_user_id;
END;
$$;

COMMENT ON FUNCTION initialize_driver_profile IS
  'Crea perfil inicial de conductor con clase 5 (base) y score 50 (neutral)';

-- ============================================================================
-- 2. GET_DRIVER_PROFILE
-- ============================================================================
-- Obtiene el perfil completo del conductor con factores de precio

CREATE OR REPLACE FUNCTION get_driver_profile(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  class INT,
  driver_score INT,
  good_years INT,
  total_claims INT,
  claims_with_fault INT,
  last_claim_at TIMESTAMPTZ,
  last_claim_with_fault BOOLEAN,
  last_class_update TIMESTAMPTZ,
  fee_multiplier DECIMAL(5,3),
  guarantee_multiplier DECIMAL(5,3),
  class_description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    drp.user_id,
    drp.class,
    drp.driver_score,
    drp.good_years,
    drp.total_claims,
    drp.claims_with_fault,
    drp.last_claim_at,
    drp.last_claim_with_fault,
    drp.last_class_update,
    pcf.fee_multiplier,
    pcf.guarantee_multiplier,
    pcf.description AS class_description,
    drp.created_at,
    drp.updated_at
  FROM driver_risk_profile drp
  LEFT JOIN pricing_class_factors pcf ON drp.class = pcf.class
  WHERE drp.user_id = p_user_id;

  -- Si no existe el perfil, retornar NULL (el caller debe inicializarlo)
  IF NOT FOUND THEN
    RAISE NOTICE 'Perfil de conductor no encontrado para usuario %', p_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_driver_profile IS
  'Obtiene perfil completo del conductor con factores de ajuste de precio';

-- ============================================================================
-- 3. UPDATE_DRIVER_CLASS_ON_EVENT
-- ============================================================================
-- Actualiza la clase del conductor después de un siniestro

CREATE OR REPLACE FUNCTION update_driver_class_on_event(
  p_user_id UUID,
  p_claim_with_fault BOOLEAN,
  p_severity INT DEFAULT 1
)
RETURNS TABLE (
  old_class INT,
  new_class INT,
  class_change INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_old_class INT;
  v_new_class INT;
  v_class_increase INT;
BEGIN
  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de conductor no encontrado para usuario %', p_user_id;
  END IF;

  v_old_class := v_profile.class;

  -- Actualizar contadores
  UPDATE driver_risk_profile
  SET
    total_claims = total_claims + 1,
    claims_with_fault = CASE
      WHEN p_claim_with_fault THEN claims_with_fault + 1
      ELSE claims_with_fault
    END,
    last_claim_at = NOW(),
    last_claim_with_fault = p_claim_with_fault,
    good_years = 0, -- Resetear años buenos
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Calcular aumento de clase solo si hay culpa
  IF p_claim_with_fault THEN
    v_class_increase := CASE
      WHEN p_severity = 1 THEN 1  -- Leve: +1 clase
      WHEN p_severity = 2 THEN 2  -- Moderado: +2 clases
      WHEN p_severity = 3 THEN 3  -- Grave: +3 clases
      ELSE 1
    END;

    -- Calcular nueva clase (máximo 10)
    v_new_class := LEAST(v_old_class + v_class_increase, 10);

    -- Actualizar clase
    UPDATE driver_risk_profile
    SET
      class = v_new_class,
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Clase actualizada: % → % (Δ +%)', v_old_class, v_new_class, v_class_increase;
  ELSE
    -- Sin culpa: no cambiar clase
    v_new_class := v_old_class;
    RAISE NOTICE 'Siniestro sin culpa registrado. Clase sin cambios: %', v_old_class;
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT v_old_class, v_new_class, (v_new_class - v_old_class);
END;
$$;

COMMENT ON FUNCTION update_driver_class_on_event IS
  'Actualiza clase del conductor tras siniestro. Severidad: 1 (leve/+1), 2 (moderado/+2), 3 (grave/+3)';

-- ============================================================================
-- 4. GET_CLASS_BENEFITS
-- ============================================================================
-- Obtiene los beneficios de una clase específica

CREATE OR REPLACE FUNCTION get_class_benefits(
  p_class INT
)
RETURNS TABLE (
  class INT,
  description TEXT,
  fee_multiplier DECIMAL(5,3),
  guarantee_multiplier DECIMAL(5,3),
  fee_discount_pct DECIMAL(5,2),
  guarantee_discount_pct DECIMAL(5,2),
  is_discount BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_class < 0 OR p_class > 10 THEN
    RAISE EXCEPTION 'Clase inválida: % (debe estar entre 0 y 10)', p_class;
  END IF;

  RETURN QUERY
  SELECT
    pcf.class,
    pcf.description,
    pcf.fee_multiplier,
    pcf.guarantee_multiplier,
    ROUND((1.00 - pcf.fee_multiplier) * 100, 2) AS fee_discount_pct,
    ROUND((1.00 - pcf.guarantee_multiplier) * 100, 2) AS guarantee_discount_pct,
    (pcf.fee_multiplier < 1.00) AS is_discount
  FROM pricing_class_factors pcf
  WHERE pcf.class = p_class
  AND pcf.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION get_class_benefits IS
  'Obtiene beneficios de una clase: descuentos/recargos en fee y garantía';

-- ============================================================================
-- 5. IMPROVE_DRIVER_CLASS_ANNUAL
-- ============================================================================
-- Mejora la clase del conductor tras un año sin siniestros con culpa
-- (Será llamado por job periódico anual)

CREATE OR REPLACE FUNCTION improve_driver_class_annual()
RETURNS TABLE (
  user_id UUID,
  old_class INT,
  new_class INT,
  good_years INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_new_class INT;
BEGIN
  -- Iterar sobre todos los conductores
  FOR rec IN
    SELECT
      drp.user_id,
      drp.class,
      drp.good_years,
      drp.last_claim_with_fault,
      drp.last_claim_at
    FROM driver_risk_profile drp
    WHERE
      -- Solo mejorar si no está en clase 0 (ya es excelente)
      drp.class > 0
      -- Solo mejorar si no tuvo siniestros con culpa en el último año
      AND (
        drp.last_claim_with_fault IS FALSE
        OR drp.last_claim_at IS NULL
        OR drp.last_claim_at < NOW() - INTERVAL '1 year'
      )
  LOOP
    -- Incrementar años buenos
    UPDATE driver_risk_profile
    SET
      good_years = good_years + 1,
      updated_at = NOW()
    WHERE driver_risk_profile.user_id = rec.user_id;

    -- Bajar clase (mejorar) cada año sin siniestros
    v_new_class := GREATEST(rec.class - 1, 0);

    UPDATE driver_risk_profile
    SET
      class = v_new_class,
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE driver_risk_profile.user_id = rec.user_id;

    -- Retornar resultado
    RETURN QUERY SELECT
      rec.user_id,
      rec.class,
      v_new_class,
      rec.good_years + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION improve_driver_class_annual IS
  'Job anual: mejora clase (baja 1) para conductores sin siniestros con culpa en último año';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Authenticated users can initialize and get their own profile
GRANT EXECUTE ON FUNCTION initialize_driver_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_driver_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_benefits(INT) TO authenticated, anon;

-- Only service role can update classes and run annual improvements
GRANT EXECUTE ON FUNCTION update_driver_class_on_event(UUID, BOOLEAN, INT) TO service_role;
GRANT EXECUTE ON FUNCTION improve_driver_class_annual() TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Driver Profile RPCs creadas correctamente';
  RAISE NOTICE '   - initialize_driver_profile(user_id)';
  RAISE NOTICE '   - get_driver_profile(user_id)';
  RAISE NOTICE '   - update_driver_class_on_event(user_id, claim_with_fault, severity)';
  RAISE NOTICE '   - get_class_benefits(class)';
  RAISE NOTICE '   - improve_driver_class_annual()';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
