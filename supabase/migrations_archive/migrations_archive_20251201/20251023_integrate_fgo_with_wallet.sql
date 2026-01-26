-- ============================================================================
-- AUTORENTAR - INTEGRACIÓN AUTOMÁTICA FGO CON WALLET
-- ============================================================================
-- Modifica wallet_deposit_ledger() para que automáticamente aporte al FGO
-- cada vez que un usuario realiza un depósito
-- ============================================================================

-- 1. ACTUALIZAR FUNCIÓN wallet_deposit_ledger CON INTEGRACIÓN FGO
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_deposit_ledger(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_provider TEXT DEFAULT 'mercadopago',
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ledger_id UUID;
  v_fgo_result JSONB;
  v_contribution_cents BIGINT;
  v_alpha DECIMAL(5,2);
BEGIN
  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'ledger_id', v_ledger_id,
      'ref', p_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Crear asiento de depósito en wallet_ledger
  INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_user_id, 'deposit', p_amount_cents, p_ref,
          jsonb_build_object('provider', p_provider) || p_meta)
  RETURNING id INTO v_ledger_id;

  -- 🆕 NUEVO: Aportar automáticamente al FGO (α%)
  BEGIN
    -- Obtener α actual
    SELECT alpha_percentage INTO v_alpha FROM fgo_metrics WHERE id = TRUE;

    -- Calcular aporte
    v_contribution_cents := FLOOR(p_amount_cents * v_alpha / 100);

    -- Solo aportar si el monto es > 0
    IF v_contribution_cents > 0 THEN
      -- Llamar a función de aporte al FGO
      SELECT fgo_contribute_from_deposit(
        p_user_id,
        p_amount_cents,
        v_ledger_id,
        'auto-fgo-' || p_ref  -- Referencia única automática
      ) INTO v_fgo_result;

      RAISE NOTICE 'FGO auto-contribution: % cents (alpha: %) for deposit %',
        v_contribution_cents, v_alpha, p_ref;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error pero no fallar el depósito
      RAISE WARNING 'FGO auto-contribution failed for deposit %: %', p_ref, SQLERRM;
      -- Continuar sin fallar (el depósito se registró correctamente)
  END;

  -- Retornar resultado con info del FGO
  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'status', 'completed',
    'user_id', p_user_id,
    'amount_cents', p_amount_cents,
    'fgo_contribution_cents', v_contribution_cents,
    'fgo_alpha_percentage', v_alpha
  );
END;
$$;

-- 2. MODIFICAR fgo_contribute_from_deposit PARA PERMITIR WALLET_LEDGER_ID NULL
-- ============================================================================
-- Esto evita el error de foreign key cuando se llama desde wallet_deposit_ledger

CREATE OR REPLACE FUNCTION fgo_contribute_from_deposit(
  p_user_id UUID,
  p_deposit_amount_cents BIGINT,
  p_wallet_ledger_id UUID DEFAULT NULL,  -- 🆕 Ahora es opcional
  p_ref VARCHAR DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_alpha DECIMAL(5,2);
  v_contribution_cents BIGINT;
  v_movement_id UUID;
  v_ref VARCHAR(128);
BEGIN
  -- Obtener α actual
  SELECT alpha_percentage INTO v_alpha
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular aporte (α% del depósito)
  v_contribution_cents := FLOOR(p_deposit_amount_cents * v_alpha / 100);

  -- No aportar si el monto es 0
  IF v_contribution_cents = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped',
      'reason', 'contribution amount is zero'
    );
  END IF;

  -- Generar referencia única si no se proporcionó
  IF p_ref IS NULL THEN
    IF p_wallet_ledger_id IS NOT NULL THEN
      v_ref := 'fgo-contrib-' || p_wallet_ledger_id;
    ELSE
      v_ref := 'fgo-contrib-' || gen_random_uuid();
    END IF;
  ELSE
    v_ref := p_ref;
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM fgo_movements WHERE ref = v_ref) THEN
    SELECT id INTO v_movement_id FROM fgo_movements WHERE ref = v_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'movement_id', v_movement_id,
      'ref', v_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Registrar movimiento al subfondo de liquidez
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    user_id,
    wallet_ledger_id,  -- 🆕 Puede ser NULL ahora
    ref,
    meta
  )
  VALUES (
    'user_contribution',
    'liquidity',
    v_contribution_cents,
    'credit',
    p_user_id,
    p_wallet_ledger_id,  -- 🆕 NULL-safe
    v_ref,
    jsonb_build_object(
      'deposit_amount_cents', p_deposit_amount_cents,
      'alpha_percentage', v_alpha
    )
  )
  RETURNING id INTO v_movement_id;

  -- Recalcular métricas
  PERFORM calculate_fgo_metrics();

  RETURN jsonb_build_object(
    'ok', true,
    'movement_id', v_movement_id,
    'ref', v_ref,
    'contribution_cents', v_contribution_cents,
    'alpha_percentage', v_alpha,
    'deposit_amount_cents', p_deposit_amount_cents
  );
END;
$$;

-- 3. MODIFICAR CONSTRAINT DE fgo_movements PARA PERMITIR wallet_ledger_id NULL
-- ============================================================================

ALTER TABLE fgo_movements
DROP CONSTRAINT IF EXISTS fgo_movements_wallet_ledger_id_fkey;

-- Recrear constraint permitiendo NULL
ALTER TABLE fgo_movements
ADD CONSTRAINT fgo_movements_wallet_ledger_id_fkey
FOREIGN KEY (wallet_ledger_id)
REFERENCES wallet_ledger(id)
ON DELETE SET NULL;

-- 4. CREAR VISTA PARA VER DEPÓSITOS CON APORTES AL FGO
-- ============================================================================

CREATE OR REPLACE VIEW v_deposits_with_fgo_contributions AS
SELECT
  wl.id as wallet_ledger_id,
  wl.ts as deposit_timestamp,
  wl.user_id,
  p.full_name as user_name,
  wl.amount_cents as deposit_cents,
  wl.amount_cents / 100.0 as deposit_usd,
  wl.ref as deposit_ref,
  -- Info del aporte al FGO
  fm.id as fgo_movement_id,
  fm.amount_cents as fgo_contribution_cents,
  fm.amount_cents / 100.0 as fgo_contribution_usd,
  (fm.meta->>'alpha_percentage')::DECIMAL as alpha_percentage,
  fm.ref as fgo_ref,
  fm.created_at as fgo_contribution_timestamp
FROM wallet_ledger wl
LEFT JOIN profiles p ON wl.user_id = p.id
LEFT JOIN fgo_movements fm ON fm.wallet_ledger_id = wl.id AND fm.movement_type = 'user_contribution'
WHERE wl.kind = 'deposit'
ORDER BY wl.ts DESC;

-- 5. ACTUALIZAR COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION wallet_deposit_ledger IS 'Registra depósito en wallet y automáticamente aporta α% al FGO';
COMMENT ON FUNCTION fgo_contribute_from_deposit IS 'Registra aporte al FGO desde depósito (wallet_ledger_id ahora es opcional)';
COMMENT ON VIEW v_deposits_with_fgo_contributions IS 'Vista que relaciona depósitos de wallet con sus aportes al FGO';

-- 6. GRANTS (Permisos)
-- ============================================================================

-- Usuarios autenticados pueden ver sus propios depósitos con aportes al FGO
GRANT SELECT ON v_deposits_with_fgo_contributions TO authenticated;

-- Service role puede ejecutar todo
GRANT EXECUTE ON FUNCTION wallet_deposit_ledger TO service_role;
GRANT EXECUTE ON FUNCTION fgo_contribute_from_deposit TO service_role;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- TEST DE INTEGRACIÓN (comentado - descomentar para probar)
/*
DO $$
DECLARE
  v_result JSONB;
  v_user_id UUID := 'b8cf21c8-c024-4067-9477-3cf7de1d5a60';  -- Eduardo
BEGIN
  -- Test: Depositar USD 200
  SELECT wallet_deposit_ledger(
    v_user_id,
    20000,  -- USD 200 en centavos
    'test-integration-deposit-200',
    'mercadopago'
  ) INTO v_result;

  RAISE NOTICE 'Deposit result: %', v_result;

  -- Verificar que se creó el aporte al FGO
  IF (v_result->>'fgo_contribution_cents')::BIGINT > 0 THEN
    RAISE NOTICE '✅ FGO contribution created automatically: % cents',
      v_result->>'fgo_contribution_cents';
  ELSE
    RAISE EXCEPTION '❌ FGO contribution was not created';
  END IF;

  -- Ver estado del FGO
  RAISE NOTICE 'FGO Status: %', (SELECT row_to_json(v) FROM v_fgo_status v);
END$$;
*/
