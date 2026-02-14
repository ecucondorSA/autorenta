-- ============================================================================
-- AUTORENTAR - Fix Bonus Protector Purchase
-- ============================================================================
-- Esta migración resuelve los TODOs financieros en purchase_bonus_protector
-- Implementa:
-- 1. Verificación de saldo suficiente
-- 2. Descuento de saldo en user_wallets
-- 3. Registro en wallet_ledger (doble partida)
-- ============================================================================

DROP FUNCTION IF EXISTS public.purchase_bonus_protector(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.purchase_bonus_protector(
    p_user_id UUID,
    p_protection_level INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_option_record RECORD;
    v_addon_id TEXT;
    v_expires_at TIMESTAMPTZ;
    v_available_balance BIGINT;
    v_price_cents BIGINT;
    v_ledger_id UUID;
BEGIN
    -- 1. AUTENTICACIÓN Y AUTORIZACIÓN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Can only purchase for yourself';
    END IF;

    -- 2. VALIDACIÓN DE INPUTS
    IF p_protection_level NOT BETWEEN 1 AND 3 THEN
        RAISE EXCEPTION 'Invalid protection level. Must be 1, 2, or 3';
    END IF;

    -- 3. VERIFICAR PROTECTOR ACTIVO
    IF EXISTS (
        SELECT 1 FROM public.active_bonus_protectors 
        WHERE user_id = p_user_id 
          AND is_active = TRUE 
          AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active bonus protector';
    END IF;

    -- 4. OBTENER DETALLES DE LA OPCIÓN
    SELECT * INTO v_option_record
    FROM public.bonus_protector_options
    WHERE protection_level = p_protection_level;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Protection level not found';
    END IF;

    v_price_cents := (v_option_record.price_usd * 100)::BIGINT;

    -- 5. VERIFICAR SALDO SUFICIENTE
    SELECT available_balance_cents INTO v_available_balance
    FROM public.user_wallets
    WHERE user_id = p_user_id;

    IF v_available_balance < v_price_cents THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', 
            v_price_cents / 100.0, v_available_balance / 100.0;
    END IF;

    -- 6. GENERAR ID DE ADDON
    v_addon_id := 'bp_' || p_protection_level || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
    v_expires_at := NOW() + (v_option_record.validity_days || ' days')::INTERVAL;

    -- 7. REGISTRO CONTABLE (WALLET LEDGER)
    INSERT INTO public.wallet_ledger (
        user_id,
        kind,
        amount_cents,
        currency,
        reference_type,
        reference_id,
        metadata
    ) VALUES (
        p_user_id,
        'fee', -- Kind para cargos de servicio/addons
        v_price_cents,
        'USD',
        'reward', -- Referencia a sistema de rewards/bonos
        v_addon_id,
        jsonb_build_object(
            'description', 'Purchase of Bonus Protector Level ' || p_protection_level,
            'protection_level', p_protection_level,
            'validity_days', v_option_record.validity_days
        )
    ) RETURNING id INTO v_ledger_id;

    -- 8. ACTUALIZAR SALDO DE WALLET
    -- El trigger handle_ledger_entry_update debería actualizar el balance, 
    -- pero para asegurar atomicidad y consistencia en esta función crítica:
    UPDATE public.user_wallets
    SET 
        available_balance_cents = available_balance_cents - v_price_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 9. ACTIVAR PROTECTOR
    INSERT INTO public.active_bonus_protectors (
        user_id,
        addon_id,
        protection_level,
        expires_at,
        price_paid_usd,
        remaining_protected_claims
    ) VALUES (
        p_user_id,
        v_addon_id,
        p_protection_level,
        v_expires_at,
        v_option_record.price_usd,
        CASE 
            WHEN p_protection_level = 1 THEN 1
            WHEN p_protection_level = 2 THEN 2
            WHEN p_protection_level = 3 THEN 3
        END
    );

    -- 10. NOTIFICACIÓN (Placeholder para sistema de notificaciones)
    -- En el futuro se puede llamar a una RPC de envío de emails
    -- PERFORM public.send_notification(p_user_id, 'bonus_protector_purchased', v_addon_id);

    RETURN v_addon_id;
END;
$$;
