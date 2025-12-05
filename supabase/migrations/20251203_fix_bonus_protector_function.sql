-- Migration: Fix Bonus Protector Purchase Function
-- Date: 2025-12-03
-- Description: Fixes the purchase_bonus_protector function to match table schema
--
-- Issues found during testing:
-- 1. Function used 'status' column but table uses 'is_active' (boolean)
-- 2. Function used 'purchased_at' but table uses 'purchase_date'
-- 3. Function used 'BONUS_PROTECTOR' but constraint requires 'bonus_protector' (lowercase)
-- 4. Function used 'transaction_type' but wallet_transactions uses 'type'
-- 5. Function used 'amount_cents' but table uses 'amount' (in dollars)
-- 6. Function used 'notes' but table uses 'description'
-- 7. Function used 'debit' type but constraint requires 'charge' with negative amount
-- 8. Function used 'addon_purchase' reference_type but constraint requires valid types

DROP FUNCTION IF EXISTS purchase_bonus_protector(uuid,integer);

CREATE FUNCTION public.purchase_bonus_protector(p_user_id uuid, p_protection_level integer)
 RETURNS TABLE(addon_id uuid, price_paid_cents bigint, price_paid_usd numeric, expiration_date timestamp with time zone, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_addon_id UUID;
  v_price_cents BIGINT;
  v_wallet_balance BIGINT;
  v_expiry_date TIMESTAMPTZ;
  v_existing_addon_id UUID;
  v_max_claims INT;
BEGIN
  -- Validate protection level
  IF p_protection_level NOT IN (1, 2, 3) THEN
    RETURN QUERY SELECT NULL::UUID, 0::BIGINT, 0::DECIMAL(15, 2), NULL::TIMESTAMPTZ, FALSE,
      'Nivel de protección inválido (debe ser 1, 2 o 3)'::TEXT;
    RETURN;
  END IF;

  -- Set price and max claims based on level
  -- Level 1: $15 USD, 1 claim | Level 2: $25 USD, 2 claims | Level 3: $40 USD, 3 claims
  v_price_cents := CASE p_protection_level WHEN 1 THEN 1500 WHEN 2 THEN 2500 WHEN 3 THEN 4000 END;
  v_max_claims := p_protection_level;

  -- Check wallet balance
  SELECT available_balance_cents INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet_balance IS NULL OR v_wallet_balance < v_price_cents THEN
    RETURN QUERY SELECT NULL::UUID, v_price_cents, (v_price_cents / 100.0)::DECIMAL(15, 2), NULL::TIMESTAMPTZ, FALSE,
      'Fondos insuficientes en wallet'::TEXT;
    RETURN;
  END IF;

  -- Check for existing active protection
  SELECT d.id INTO v_existing_addon_id
  FROM driver_protection_addons d
  WHERE d.user_id = p_user_id
    AND d.addon_type = 'bonus_protector'  -- lowercase per constraint
    AND d.is_active = TRUE
    AND d.expires_at > NOW();

  IF v_existing_addon_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_addon_id, 0::BIGINT, 0::DECIMAL(15, 2), NULL::TIMESTAMPTZ, FALSE,
      'Ya tienes un Protector Bonus activo'::TEXT;
    RETURN;
  END IF;

  -- Calculate expiration (1 year)
  v_expiry_date := NOW() + INTERVAL '1 year';

  -- Create protection addon
  INSERT INTO driver_protection_addons (
    id, user_id, addon_type, protection_level,
    price_paid_cents, currency, is_active,
    purchase_date, expires_at,
    max_protected_claims, claims_used
  )
  VALUES (
    gen_random_uuid(), p_user_id, 'bonus_protector', p_protection_level,
    v_price_cents, 'USD', TRUE,
    NOW(), v_expiry_date,
    v_max_claims, 0
  )
  RETURNING id INTO v_addon_id;

  -- Deduct from wallet
  UPDATE user_wallets
  SET available_balance_cents = available_balance_cents - v_price_cents,
      balance_cents = balance_cents - v_price_cents,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction (charge type requires negative amount)
  INSERT INTO wallet_transactions (
    id, user_id, type, amount, currency, status,
    reference_id, reference_type, description, completed_at
  )
  VALUES (
    gen_random_uuid(), p_user_id, 'charge', -(v_price_cents / 100.0), 'USD', 'completed',
    v_addon_id, 'credit_protected', 'Compra de Protector Bonus Nivel ' || p_protection_level, NOW()
  );

  RETURN QUERY SELECT v_addon_id, v_price_cents, (v_price_cents / 100.0)::DECIMAL(15, 2),
    v_expiry_date, TRUE, 'Protector Bonus comprado exitosamente'::TEXT;
END;
$function$;

COMMENT ON FUNCTION purchase_bonus_protector IS 'Compra un Protector de Bonus para proteger la clase del conductor.
Niveles:
- Nivel 1 ($15 USD): Protege 1 siniestro
- Nivel 2 ($25 USD): Protege 2 siniestros
- Nivel 3 ($40 USD): Protege 3 siniestros
Duración: 1 año desde la compra';
