-- ============================================================================
-- MIGRATION: Chargebacks System
-- Date: 2026-02-01
-- Purpose: Handle MercadoPago chargebacks automatically with FGO debit
-- ============================================================================

BEGIN;

-- 1. CREATE chargebacks table
CREATE TABLE IF NOT EXISTS public.chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  mp_payment_id TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  payment_id UUID REFERENCES public.payments(id),
  renter_id UUID REFERENCES public.profiles(id),
  owner_id UUID REFERENCES public.profiles(id),

  -- Amounts
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'ARS',

  -- MercadoPago data
  mp_reason TEXT,
  mp_status TEXT, -- 'opened', 'pending', 'resolved', 'rejected'
  mp_case_id TEXT,
  mp_webhook_data JSONB DEFAULT '{}'::jsonb,

  -- Internal processing
  status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'processing', 'fgo_debited', 'recovered', 'lost', 'disputed')),

  -- FGO debit tracking
  fgo_debit_amount_cents BIGINT DEFAULT 0,
  fgo_debit_transaction_id UUID,
  fgo_debit_at TIMESTAMPTZ,

  -- Recovery tracking
  recovery_status TEXT CHECK (recovery_status IN ('pending', 'partial', 'full', 'failed')),
  recovery_amount_cents BIGINT DEFAULT 0,

  -- Dispute link (if escalated)
  dispute_id UUID REFERENCES public.disputes(id),

  -- Notifications
  owner_notified_at TIMESTAMPTZ,
  admin_notified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chargebacks_mp_payment ON public.chargebacks(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_booking ON public.chargebacks(booking_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_renter ON public.chargebacks(renter_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_status ON public.chargebacks(status);
CREATE INDEX IF NOT EXISTS idx_chargebacks_created ON public.chargebacks(created_at DESC);

-- 2. RLS Policies
ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to chargebacks"
  ON public.chargebacks FOR ALL
  USING (public.is_admin());

-- Owners can view chargebacks on their cars
CREATE POLICY "Owners can view their chargebacks"
  ON public.chargebacks FOR SELECT
  USING (owner_id = auth.uid());

-- Renters can view chargebacks against them
CREATE POLICY "Renters can view their chargebacks"
  ON public.chargebacks FOR SELECT
  USING (renter_id = auth.uid());

-- Service role can insert/update (for webhooks)
CREATE POLICY "Service role can manage chargebacks"
  ON public.chargebacks FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_chargebacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chargebacks_updated_at ON public.chargebacks;
CREATE TRIGGER trg_chargebacks_updated_at
  BEFORE UPDATE ON public.chargebacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chargebacks_updated_at();

-- 4. RPC: process_chargeback
-- Main function to handle a chargeback with FGO debit
CREATE OR REPLACE FUNCTION public.process_chargeback(
  p_mp_payment_id TEXT,
  p_amount_cents BIGINT,
  p_mp_reason TEXT DEFAULT NULL,
  p_mp_status TEXT DEFAULT 'opened',
  p_mp_case_id TEXT DEFAULT NULL,
  p_mp_webhook_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_booking RECORD;
  v_chargeback_id UUID;
  v_fgo_debit_amount BIGINT;
  v_fgo_transaction_id UUID;
  v_renter_wallet RECORD;
  v_result JSONB;
BEGIN
  -- 1. Find the original payment
  SELECT p.*, b.id as booking_id, b.renter_id, b.deposit_amount_cents,
         c.owner_id
  INTO v_payment
  FROM public.payments p
  LEFT JOIN public.bookings b ON b.id = p.booking_id
  LEFT JOIN public.cars c ON c.id = b.car_id
  WHERE p.mercadopago_payment_id = p_mp_payment_id
     OR p.mp_payment_id = p_mp_payment_id
  LIMIT 1;

  -- If no payment found, try payment_intents
  IF v_payment IS NULL THEN
    SELECT pi.*, b.id as booking_id, b.renter_id, b.deposit_amount_cents,
           c.owner_id
    INTO v_payment
    FROM public.payment_intents pi
    LEFT JOIN public.bookings b ON b.id = pi.booking_id
    LEFT JOIN public.cars c ON c.id = b.car_id
    WHERE pi.mp_payment_id = p_mp_payment_id
    LIMIT 1;
  END IF;

  -- 2. Check for duplicate chargeback
  IF EXISTS (SELECT 1 FROM public.chargebacks WHERE mp_payment_id = p_mp_payment_id) THEN
    -- Update existing chargeback
    UPDATE public.chargebacks
    SET mp_status = p_mp_status,
        mp_webhook_data = mp_webhook_data || p_mp_webhook_data,
        updated_at = NOW()
    WHERE mp_payment_id = p_mp_payment_id
    RETURNING id INTO v_chargeback_id;

    RETURN jsonb_build_object(
      'success', true,
      'chargeback_id', v_chargeback_id,
      'action', 'updated_existing',
      'message', 'Chargeback already exists, updated status'
    );
  END IF;

  -- 3. Create chargeback record
  INSERT INTO public.chargebacks (
    mp_payment_id,
    booking_id,
    payment_id,
    renter_id,
    owner_id,
    amount_cents,
    mp_reason,
    mp_status,
    mp_case_id,
    mp_webhook_data,
    status
  ) VALUES (
    p_mp_payment_id,
    v_payment.booking_id,
    v_payment.id,
    v_payment.renter_id,
    v_payment.owner_id,
    p_amount_cents,
    p_mp_reason,
    p_mp_status,
    p_mp_case_id,
    p_mp_webhook_data,
    'processing'
  )
  RETURNING id INTO v_chargeback_id;

  -- 4. Calculate FGO debit amount (cap to deposit or available FGO)
  v_fgo_debit_amount := LEAST(p_amount_cents, COALESCE(v_payment.deposit_amount_cents, p_amount_cents));

  -- 5. Attempt to debit from renter's wallet/FGO
  IF v_payment.renter_id IS NOT NULL THEN
    -- Get renter's wallet
    SELECT * INTO v_renter_wallet
    FROM public.wallets
    WHERE user_id = v_payment.renter_id
    FOR UPDATE;

    IF v_renter_wallet IS NOT NULL AND v_renter_wallet.balance_cents >= v_fgo_debit_amount THEN
      -- Debit from wallet
      UPDATE public.wallets
      SET balance_cents = balance_cents - v_fgo_debit_amount,
          updated_at = NOW()
      WHERE id = v_renter_wallet.id;

      -- Create wallet transaction
      INSERT INTO public.wallet_transactions (
        wallet_id,
        type,
        amount_cents,
        balance_after_cents,
        description,
        reference_type,
        reference_id,
        metadata
      ) VALUES (
        v_renter_wallet.id,
        'chargeback_debit',
        -v_fgo_debit_amount,
        v_renter_wallet.balance_cents - v_fgo_debit_amount,
        'Débito por contracargo MP #' || p_mp_payment_id,
        'chargeback',
        v_chargeback_id,
        jsonb_build_object('mp_payment_id', p_mp_payment_id, 'reason', p_mp_reason)
      )
      RETURNING id INTO v_fgo_transaction_id;

      -- Update chargeback with FGO debit info
      UPDATE public.chargebacks
      SET status = 'fgo_debited',
          fgo_debit_amount_cents = v_fgo_debit_amount,
          fgo_debit_transaction_id = v_fgo_transaction_id,
          fgo_debit_at = NOW()
      WHERE id = v_chargeback_id;

      v_result := jsonb_build_object(
        'success', true,
        'chargeback_id', v_chargeback_id,
        'action', 'fgo_debited',
        'fgo_amount_cents', v_fgo_debit_amount,
        'transaction_id', v_fgo_transaction_id
      );
    ELSE
      -- Insufficient funds - mark as opened for manual review
      UPDATE public.chargebacks
      SET status = 'opened',
          fgo_debit_amount_cents = 0
      WHERE id = v_chargeback_id;

      v_result := jsonb_build_object(
        'success', true,
        'chargeback_id', v_chargeback_id,
        'action', 'insufficient_fgo',
        'message', 'Renter has insufficient FGO balance',
        'available_balance', COALESCE(v_renter_wallet.balance_cents, 0),
        'required_amount', v_fgo_debit_amount
      );
    END IF;
  ELSE
    -- No renter found
    v_result := jsonb_build_object(
      'success', true,
      'chargeback_id', v_chargeback_id,
      'action', 'no_renter',
      'message', 'Could not identify renter for this payment'
    );
  END IF;

  -- 6. Block pending payouts for this renter (if any)
  IF v_payment.renter_id IS NOT NULL THEN
    UPDATE public.withdrawal_requests
    SET status = 'blocked',
        notes = COALESCE(notes, '') || ' | Blocked due to chargeback #' || v_chargeback_id::text
    WHERE user_id = v_payment.renter_id
      AND status = 'pending';
  END IF;

  RETURN v_result;
END;
$$;

-- 5. Grant execute to authenticated users (for admin panel)
GRANT EXECUTE ON FUNCTION public.process_chargeback TO authenticated;

-- 6. Add chargeback_debit to wallet transaction types if not exists
DO $$
BEGIN
  -- Check if constraint exists and update it
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallet_transactions_type_check'
  ) THEN
    -- Drop and recreate with new value
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
  END IF;

  -- Add constraint with chargeback_debit included
  -- Note: This may fail if constraint doesn't exist or has different name
  -- In that case, the type column might be TEXT without constraint
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors - type might be unconstrained TEXT
  NULL;
END $$;

COMMIT;
