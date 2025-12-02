-- ============================================================================
-- AUTORENTA - RPC FUNCTIONS: BONUS PROTECTOR
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Funciones RPC para gestión del Protector de Bonus
-- ============================================================================
--
-- PROTECTOR DE BONUS:
-- - Add-on que protege la clase del conductor de subir tras siniestros
-- - Niveles: 1 (protege 1 siniestro), 2 (protege 2), 3 (protege 3)
-- - Precio escalonado: Nivel 1 = $15, Nivel 2 = $25, Nivel 3 = $40
-- - Válido por 1 año
--
-- FUNCIONES INCLUIDAS:
-- 1. purchase_bonus_protector(user_id, protection_level) - Compra protector
-- 2. apply_bonus_protector(user_id, claim_severity) - Aplica protector al registrar siniestro
-- 3. get_active_bonus_protector(user_id) - Obtiene protector activo
-- 4. list_bonus_protector_options() - Lista opciones de compra
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. LIST_BONUS_PROTECTOR_OPTIONS
-- ============================================================================
-- Lista las opciones de compra de protector de bonus

CREATE OR REPLACE FUNCTION list_bonus_protector_options()
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

COMMENT ON FUNCTION list_bonus_protector_options IS
  'Lista opciones de compra de protector de bonus con precios';

-- ============================================================================
-- 2. PURCHASE_BONUS_PROTECTOR
-- ============================================================================
-- Compra un protector de bonus

CREATE OR REPLACE FUNCTION purchase_bonus_protector(
  p_user_id UUID,
  p_protection_level INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_price_cents BIGINT;
  v_price_usd NUMERIC;
  v_available_balance_cents BIGINT;
  v_addon_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Validar nivel de protección
  IF p_protection_level < 1 OR p_protection_level > 3 THEN
    RAISE EXCEPTION 'Nivel de protección inválido: % (debe ser 1, 2 o 3)', p_protection_level;
  END IF;

  -- Obtener precio según nivel
  v_price_cents := CASE p_protection_level
    WHEN 1 THEN 1500  -- $15 USD
    WHEN 2 THEN 2500  -- $25 USD
    WHEN 3 THEN 4000  -- $40 USD
  END;

  v_price_usd := v_price_cents / 100.0;

  -- Verificar que el usuario no tenga ya un protector activo
  IF EXISTS (
    SELECT 1 FROM driver_protection_addons
    WHERE user_id = p_user_id
    AND addon_type = 'bonus_protector'
    AND used = FALSE
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'El usuario ya tiene un Protector de Bonus activo';
  END IF;

  -- Obtener wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet no encontrado para usuario %', p_user_id;
  END IF;

  -- Verificar fondos disponibles
  v_available_balance_cents := COALESCE(v_wallet.available_balance * 100, 0);

  IF v_available_balance_cents < v_price_cents THEN
    RAISE EXCEPTION 'Fondos insuficientes. Requerido: $%, Disponible: $%',
      v_price_usd, (v_available_balance_cents / 100.0);
  END IF;

  -- Descontar del wallet
  UPDATE user_wallets
  SET
    available_balance = available_balance - v_price_usd,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Calcular fecha de expiración (1 año)
  v_expires_at := NOW() + INTERVAL '365 days';

  -- Crear addon
  INSERT INTO driver_protection_addons (
    id,
    user_id,
    addon_type,
    purchase_date,
    expires_at,
    price_paid_cents,
    price_currency,
    protection_level,
    used,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'bonus_protector',
    NOW(),
    v_expires_at,
    v_price_cents,
    'USD',
    p_protection_level,
    FALSE,
    NOW()
  ) RETURNING id INTO v_addon_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id,
    user_id,
    type,
    status,
    amount,
    currency,
    reference_type,
    reference_id,
    provider,
    is_withdrawable,
    description,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'charge',
    'completed',
    v_price_usd,
    'USD',
    NULL,
    v_addon_id,
    'internal',
    TRUE,
    'Compra Protector de Bonus (Nivel ' || p_protection_level || ') - $' || v_price_usd,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Protector de Bonus comprado: Nivel %, Precio: $%, Expira: %',
    p_protection_level, v_price_usd, v_expires_at;

  RETURN v_addon_id;
END;
$$;

COMMENT ON FUNCTION purchase_bonus_protector IS
  'Compra protector de bonus (Nivel 1: $15, Nivel 2: $25, Nivel 3: $40)';

-- ============================================================================
-- 3. APPLY_BONUS_PROTECTOR
-- ============================================================================
-- Aplica protector de bonus al registrar un siniestro

CREATE OR REPLACE FUNCTION apply_bonus_protector(
  p_user_id UUID,
  p_claim_severity INT
)
RETURNS TABLE (
  class_before INT,
  class_after INT,
  protection_applied BOOLEAN,
  protector_exhausted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protector RECORD;
  v_profile RECORD;
  v_class_increase INT;
  v_protection_applied BOOLEAN;
  v_protector_exhausted BOOLEAN;
BEGIN
  -- Validar severidad
  IF p_claim_severity < 1 OR p_claim_severity > 3 THEN
    RAISE EXCEPTION 'Severidad inválida: % (debe ser 1, 2 o 3)', p_claim_severity;
  END IF;

  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de conductor no encontrado para usuario %', p_user_id;
  END IF;

  -- Obtener protector activo (si existe)
  SELECT * INTO v_protector
  FROM driver_protection_addons
  WHERE user_id = p_user_id
  AND addon_type = 'bonus_protector'
  AND used = FALSE
  AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calcular aumento de clase que correspondería
  v_class_increase := p_claim_severity;

  -- Verificar si hay protector disponible
  IF FOUND THEN
    -- Verificar si el nivel de protección es suficiente
    IF v_protector.protection_level >= p_claim_severity THEN
      -- PROTECCIÓN APLICADA: No aumentar clase
      v_protection_applied := TRUE;

      -- Reducir nivel de protección o marcar como usado
      IF v_protector.protection_level > p_claim_severity THEN
        -- Reducir nivel de protección
        UPDATE driver_protection_addons
        SET
          protection_level = protection_level - p_claim_severity
        WHERE id = v_protector.id;

        v_protector_exhausted := FALSE;
        RAISE NOTICE 'Protector aplicado. Nivel restante: %', (v_protector.protection_level - p_claim_severity);
      ELSE
        -- Protector completamente consumido
        UPDATE driver_protection_addons
        SET
          used = TRUE,
          used_at = NOW()
        WHERE id = v_protector.id;

        v_protector_exhausted := TRUE;
        RAISE NOTICE 'Protector completamente consumido';
      END IF;

      -- Retornar resultado (clase sin cambios)
      RETURN QUERY SELECT
        v_profile.class,
        v_profile.class, -- Sin cambio
        TRUE,
        v_protector_exhausted;

    ELSE
      -- Nivel insuficiente: aplicar protección parcial
      v_protection_applied := TRUE;

      -- Reducir severidad según nivel de protección disponible
      v_class_increase := p_claim_severity - v_protector.protection_level;

      -- Marcar protector como usado
      UPDATE driver_protection_addons
      SET
        used = TRUE,
        used_at = NOW()
      WHERE id = v_protector.id;

      v_protector_exhausted := TRUE;

      -- Aumentar clase (reducido)
      UPDATE driver_risk_profile
      SET
        class = LEAST(class + v_class_increase, 10),
        last_class_update = NOW(),
        updated_at = NOW()
      WHERE user_id = p_user_id;

      RAISE NOTICE 'Protector aplicado parcialmente. Clase aumenta +% (reducido de +%)',
        v_class_increase, p_claim_severity;

      RETURN QUERY SELECT
        v_profile.class,
        LEAST(v_profile.class + v_class_increase, 10),
        TRUE,
        TRUE;
    END IF;
  ELSE
    -- SIN PROTECTOR: Aumentar clase normalmente
    v_protection_applied := FALSE;
    v_protector_exhausted := FALSE;

    UPDATE driver_risk_profile
    SET
      class = LEAST(class + v_class_increase, 10),
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Sin protector. Clase aumenta +%', v_class_increase;

    RETURN QUERY SELECT
      v_profile.class,
      LEAST(v_profile.class + v_class_increase, 10),
      FALSE,
      FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION apply_bonus_protector IS
  'Aplica protector de bonus al registrar siniestro (protege clase de subir)';

-- ============================================================================
-- 4. GET_ACTIVE_BONUS_PROTECTOR
-- ============================================================================
-- Obtiene el protector de bonus activo del usuario

CREATE OR REPLACE FUNCTION get_active_bonus_protector(
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

COMMENT ON FUNCTION get_active_bonus_protector IS
  'Obtiene el protector de bonus activo del usuario (si existe)';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Authenticated users can list options, purchase and get their own protector
GRANT EXECUTE ON FUNCTION list_bonus_protector_options() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION purchase_bonus_protector(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_bonus_protector(UUID) TO authenticated;

-- Only service role can apply protector
GRANT EXECUTE ON FUNCTION apply_bonus_protector(UUID, INT) TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Bonus Protector RPCs creadas correctamente';
  RAISE NOTICE '   - list_bonus_protector_options()';
  RAISE NOTICE '   - purchase_bonus_protector(user_id, protection_level)';
  RAISE NOTICE '   - apply_bonus_protector(user_id, claim_severity)';
  RAISE NOTICE '   - get_active_bonus_protector(user_id)';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
