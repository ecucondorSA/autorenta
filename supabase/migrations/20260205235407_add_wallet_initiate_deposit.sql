-- Create wallet_initiate_deposit RPC for deposit flow
-- Creates a pending wallet_transaction and returns the transaction ID
-- Used by deposit page before redirecting to MercadoPago Checkout Pro

CREATE OR REPLACE FUNCTION public.wallet_initiate_deposit(
  p_user_id UUID,
  p_amount BIGINT,
  p_provider TEXT DEFAULT 'mercadopago'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Create pending deposit transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    status,
    amount,
    currency,
    reference_type,
    provider,
    description,
    category,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    'deposit',
    'pending',
    p_amount,
    'USD',
    'top_up',
    p_provider,
    'Depósito vía ' || p_provider,
    'deposit',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$function$;
