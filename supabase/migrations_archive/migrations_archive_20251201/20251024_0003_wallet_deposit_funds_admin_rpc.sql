-- migration_name: 0003_wallet_deposit_funds_admin_rpc
-- Up Migration

-- This function allows an admin/system (via service_role_key) to deposit funds into a user's wallet.
-- It records the deposit in wallet_ledger and updates the user's wallet_balances.
CREATE OR REPLACE FUNCTION public.wallet_deposit_funds_admin(
    p_user_id UUID,
    p_amount_cents BIGINT,
    p_description TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    transaction_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    IF p_amount_cents <= 0 THEN
        RETURN QUERY SELECT FALSE, NULL, 'El monto debe ser positivo'::TEXT;
        RETURN;
    END IF;

    -- Iniciar transacción
    BEGIN
        INSERT INTO public.wallet_ledger (user_id, kind, amount_cents, description, reference_id)
        VALUES (p_user_id, 'deposit', p_amount_cents, p_description, p_reference_id)
        RETURNING id INTO v_transaction_id;

        -- Actualizar el balance disponible del usuario
        UPDATE public.user_wallets
        SET available_balance = available_balance + p_amount_cents,
            total_balance = total_balance + p_amount_cents,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        IF NOT FOUND THEN
            -- Si no existe la wallet, crearla. Esto no debería pasar si se valida antes.
            INSERT INTO public.user_wallets (user_id, available_balance, locked_balance, total_balance)
            VALUES (p_user_id, p_amount_cents, 0, p_amount_cents);
        END IF;

        -- Confirmar transacción
        RETURN QUERY SELECT TRUE, v_transaction_id, NULL::TEXT;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT FALSE, NULL, SQLERRM::TEXT;
    END;
END;
$$;

-- Down Migration
-- DROP FUNCTION public.wallet_deposit_funds_admin(UUID, BIGINT, TEXT, TEXT);
