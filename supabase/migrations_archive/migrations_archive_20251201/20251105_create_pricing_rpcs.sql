-- ============================================================================
-- AUTORENTA - RPC FUNCTIONS: PRICING CALCULATIONS
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Funciones RPC para cálculo de fees y garantías ajustadas por clase
-- ============================================================================
--
-- FUNCIONES INCLUIDAS:
-- 1. compute_fee_with_class(user_id, base_fee, telematic_score) - Fee ajustado
-- 2. compute_guarantee_with_class(user_id, base_guarantee_usd, has_card) - Garantía ajustada
-- 3. preview_booking_pricing(user_id, car_id, start_at, end_at, has_card) - Preview completo
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. COMPUTE_FEE_WITH_CLASS
-- ============================================================================
-- Calcula el fee de plataforma ajustado por clase de conductor y score telemático

CREATE OR REPLACE FUNCTION compute_fee_with_class(
  p_user_id UUID,
  p_base_fee_cents BIGINT,
  p_telematic_score INT DEFAULT 50
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_class_multiplier DECIMAL(5,3);
  v_telematic_multiplier DECIMAL(5,3);
  v_final_multiplier DECIMAL(5,3);
  v_adjusted_fee_cents BIGINT;
BEGIN
  -- Validar base_fee
  IF p_base_fee_cents <= 0 THEN
    RAISE EXCEPTION 'Base fee debe ser mayor a 0';
  END IF;

  -- Validar telematic_score
  IF p_telematic_score < 0 OR p_telematic_score > 100 THEN
    RAISE EXCEPTION 'Telematic score debe estar entre 0 y 100';
  END IF;

  -- Obtener perfil del conductor
  SELECT
    drp.class,
    drp.driver_score,
    pcf.fee_multiplier
  INTO v_profile
  FROM driver_risk_profile drp
  LEFT JOIN pricing_class_factors pcf ON drp.class = pcf.class
  WHERE drp.user_id = p_user_id;

  -- Si no existe perfil, usar clase base (5)
  IF NOT FOUND THEN
    RAISE NOTICE 'Perfil no encontrado para usuario %. Usando clase base (5)', p_user_id;

    SELECT fee_multiplier INTO v_class_multiplier
    FROM pricing_class_factors
    WHERE class = 5;
  ELSE
    v_class_multiplier := v_profile.fee_multiplier;
  END IF;

  -- Calcular multiplicador telemático (±5% según score)
  -- Score 0 → ×1.05 (recargo 5%)
  -- Score 50 → ×1.00 (neutral)
  -- Score 100 → ×0.95 (descuento 5%)
  v_telematic_multiplier := 1.00 - ((p_telematic_score - 50.0) / 1000.0);

  -- Multiplicador final = clase × telemática
  v_final_multiplier := v_class_multiplier * v_telematic_multiplier;

  -- Calcular fee ajustado
  v_adjusted_fee_cents := ROUND(p_base_fee_cents * v_final_multiplier);

  RAISE NOTICE 'Fee ajustado: % → % (Clase: %, Score: %, Mult: %)',
    p_base_fee_cents, v_adjusted_fee_cents, v_profile.class, p_telematic_score, v_final_multiplier;

  RETURN v_adjusted_fee_cents;
END;
$$;

COMMENT ON FUNCTION compute_fee_with_class IS
  'Calcula fee ajustado por clase de conductor y score telemático. Retorna en centavos';

-- ============================================================================
-- 2. COMPUTE_GUARANTEE_WITH_CLASS
-- ============================================================================
-- Calcula la garantía ajustada por clase de conductor

CREATE OR REPLACE FUNCTION compute_guarantee_with_class(
  p_user_id UUID,
  p_base_guarantee_cents BIGINT,
  p_has_card BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_class_multiplier DECIMAL(5,3);
  v_card_multiplier DECIMAL(5,3);
  v_final_multiplier DECIMAL(5,3);
  v_adjusted_guarantee_cents BIGINT;
BEGIN
  -- Validar base_guarantee
  IF p_base_guarantee_cents <= 0 THEN
    RAISE EXCEPTION 'Base guarantee debe ser mayor a 0';
  END IF;

  -- Obtener perfil del conductor
  SELECT
    drp.class,
    drp.driver_score,
    pcf.guarantee_multiplier
  INTO v_profile
  FROM driver_risk_profile drp
  LEFT JOIN pricing_class_factors pcf ON drp.class = pcf.class
  WHERE drp.user_id = p_user_id;

  -- Si no existe perfil, usar clase base (5)
  IF NOT FOUND THEN
    RAISE NOTICE 'Perfil no encontrado para usuario %. Usando clase base (5)', p_user_id;

    SELECT guarantee_multiplier INTO v_class_multiplier
    FROM pricing_class_factors
    WHERE class = 5;
  ELSE
    v_class_multiplier := v_profile.guarantee_multiplier;
  END IF;

  -- Multiplicador por tarjeta (si tiene tarjeta, menos garantía)
  v_card_multiplier := CASE
    WHEN p_has_card THEN 0.90  -- 10% menos si tiene tarjeta
    ELSE 1.00
  END;

  -- Multiplicador final = clase × tarjeta
  v_final_multiplier := v_class_multiplier * v_card_multiplier;

  -- Calcular garantía ajustada
  v_adjusted_guarantee_cents := ROUND(p_base_guarantee_cents * v_final_multiplier);

  RAISE NOTICE 'Garantía ajustada: % → % (Clase: %, Tarjeta: %, Mult: %)',
    p_base_guarantee_cents, v_adjusted_guarantee_cents, v_profile.class, p_has_card, v_final_multiplier;

  RETURN v_adjusted_guarantee_cents;
END;
$$;

COMMENT ON FUNCTION compute_guarantee_with_class IS
  'Calcula garantía ajustada por clase de conductor y tenencia de tarjeta. Retorna en centavos';

-- ============================================================================
-- 3. PREVIEW_BOOKING_PRICING
-- ============================================================================
-- Genera preview completo de pricing para un booking (fee + garantía ajustados)

CREATE OR REPLACE FUNCTION preview_booking_pricing(
  p_user_id UUID,
  p_car_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_has_card BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  user_id UUID,
  car_id UUID,
  driver_class INT,
  driver_score INT,
  days INT,
  base_price_cents BIGINT,
  base_fee_cents BIGINT,
  adjusted_fee_cents BIGINT,
  fee_discount_pct DECIMAL(5,2),
  base_guarantee_cents BIGINT,
  adjusted_guarantee_cents BIGINT,
  guarantee_discount_pct DECIMAL(5,2),
  total_amount_cents BIGINT,
  currency TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car RECORD;
  v_profile RECORD;
  v_days INT;
  v_base_price_cents BIGINT;
  v_base_fee_cents BIGINT;
  v_adjusted_fee_cents BIGINT;
  v_base_guarantee_cents BIGINT;
  v_adjusted_guarantee_cents BIGINT;
  v_total_cents BIGINT;
  v_fee_discount DECIMAL(5,2);
  v_guarantee_discount DECIMAL(5,2);
BEGIN
  -- Validar fechas
  IF p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'Fecha de fin debe ser posterior a fecha de inicio';
  END IF;

  -- Obtener información del auto
  SELECT * INTO v_car
  FROM cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no encontrado o no disponible';
  END IF;

  -- Calcular días
  v_days := EXTRACT(DAY FROM (p_end_at - p_start_at))::INT;
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  -- Calcular precio base (asumiendo price_per_day en centavos)
  -- Si price_per_day está en unidades, multiplicar por 100
  v_base_price_cents := v_car.price_per_day * v_days * 100; -- Convertir a centavos

  -- Calcular fee base (15% de plataforma)
  v_base_fee_cents := ROUND(v_base_price_cents * 0.15);

  -- Calcular garantía base (ejemplo: 10% del valor del auto o mínimo $500)
  -- TODO: Integrar con RiskCalculatorService
  v_base_guarantee_cents := GREATEST(
    ROUND((v_car.price_per_day * 100 * 10) * 0.10), -- 10% del valor
    50000 -- Mínimo $500 USD (50000 centavos)
  );

  -- Obtener perfil del conductor
  SELECT
    drp.class,
    drp.driver_score
  INTO v_profile
  FROM driver_risk_profile drp
  WHERE drp.user_id = p_user_id;

  IF NOT FOUND THEN
    -- Sin perfil, usar valores base
    v_profile.class := 5;
    v_profile.driver_score := 50;
  END IF;

  -- Calcular fee ajustado
  v_adjusted_fee_cents := compute_fee_with_class(
    p_user_id,
    v_base_fee_cents,
    v_profile.driver_score
  );

  -- Calcular garantía ajustada
  v_adjusted_guarantee_cents := compute_guarantee_with_class(
    p_user_id,
    v_base_guarantee_cents,
    p_has_card
  );

  -- Calcular descuentos/recargos
  v_fee_discount := ((v_base_fee_cents - v_adjusted_fee_cents)::DECIMAL / v_base_fee_cents) * 100;
  v_guarantee_discount := ((v_base_guarantee_cents - v_adjusted_guarantee_cents)::DECIMAL / v_base_guarantee_cents) * 100;

  -- Total
  v_total_cents := v_base_price_cents + v_adjusted_fee_cents;

  -- Retornar resultado
  RETURN QUERY SELECT
    p_user_id,
    p_car_id,
    v_profile.class,
    v_profile.driver_score,
    v_days,
    v_base_price_cents,
    v_base_fee_cents,
    v_adjusted_fee_cents,
    v_fee_discount,
    v_base_guarantee_cents,
    v_adjusted_guarantee_cents,
    v_guarantee_discount,
    v_total_cents,
    v_car.currency;
END;
$$;

COMMENT ON FUNCTION preview_booking_pricing IS
  'Genera preview completo de pricing con fee y garantía ajustados por clase de conductor';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION compute_fee_with_class(UUID, BIGINT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION compute_guarantee_with_class(UUID, BIGINT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION preview_booking_pricing(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Pricing RPCs creadas correctamente';
  RAISE NOTICE '   - compute_fee_with_class(user_id, base_fee_cents, telematic_score)';
  RAISE NOTICE '   - compute_guarantee_with_class(user_id, base_guarantee_cents, has_card)';
  RAISE NOTICE '   - preview_booking_pricing(user_id, car_id, start_at, end_at, has_card)';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
