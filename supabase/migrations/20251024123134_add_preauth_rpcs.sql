-- Function to capture a pre-authorization and update wallet_ledger
CREATE OR REPLACE FUNCTION capture_preauth(
    p_intent_id UUID,
    p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_mp_payment_id TEXT;
    v_user_wallet_account_number TEXT;
    v_autorenta_revenue_account_number TEXT := 'AR00000000000001'; -- Placeholder for AutoRenta's revenue account
    v_current_status TEXT;
BEGIN
    -- Get intent details and user's wallet account number
    SELECT
        pi.user_id,
        pi.mp_payment_id,
        pi.status,
        p.wallet_account_number
    INTO
        v_user_id,
        v_mp_payment_id,
        v_current_status,
        v_user_wallet_account_number
    FROM
        payment_intents pi
    JOIN
        profiles p ON pi.user_id = p.id
    WHERE
        pi.id = p_intent_id;

    -- Check if intent exists and is in 'authorized' state
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Payment intent % not found.', p_intent_id;
    END IF;

    IF v_current_status <> 'authorized' THEN
        RAISE EXCEPTION 'Payment intent % is not in authorized state (current status: %).', p_intent_id, v_current_status;
    END IF;

    -- Update payment_intents status to 'captured'
    UPDATE payment_intents
    SET
        status = 'captured',
        captured_at = NOW()
    WHERE
        id = p_intent_id;

    -- Insert debit entry for the user
    INSERT INTO wallet_ledger (
        wallet_account_number,
        type,
        amount,
        currency,
        description,
        reference_id,
        related_wallet_account_number
    ) VALUES (
        v_user_wallet_account_number,
        'debit',
        p_amount,
        'ARS',
        'Cargo por pre-autorización capturada',
        p_intent_id,
        v_autorenta_revenue_account_number
    );

    -- Insert credit entry for AutoRenta's revenue account
    INSERT INTO wallet_ledger (
        wallet_account_number,
        type,
        amount,
        currency,
        description,
        reference_id,
        related_wallet_account_number
    ) VALUES (
        v_autorenta_revenue_account_number,
        'credit',
        p_amount,
        'ARS',
        'Ingreso por pre-autorización capturada',
        p_intent_id,
        v_user_wallet_account_number
    );
END;
$$;

-- Function to cancel a pre-authorization
CREATE OR REPLACE FUNCTION cancel_preauth(
    p_intent_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Get current status of the intent
    SELECT status INTO v_current_status
    FROM payment_intents
    WHERE id = p_intent_id;

    -- Check if intent exists
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Payment intent % not found.', p_intent_id;
    END IF;

    -- Check if intent is in 'authorized' state (only authorized can be cancelled)
    IF v_current_status <> 'authorized' THEN
        RAISE EXCEPTION 'Payment intent % is not in authorized state (current status: %).', p_intent_id, v_current_status;
    END IF;

    -- Update payment_intents status to 'cancelled'
    UPDATE payment_intents
    SET
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE
        id = p_intent_id;

    -- No wallet_ledger entries needed for cancellation as funds were only held on card, not debited from wallet.
    -- If there were any locked funds in user_wallets, they would be released here, but current preauth flow doesn't involve wallet locks.
END;
$$;
