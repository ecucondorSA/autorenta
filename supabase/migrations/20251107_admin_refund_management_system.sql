-- ============================================================================
-- ADMIN REFUND MANAGEMENT SYSTEM
-- Created: 2025-11-07
-- Purpose: P0 Production Blocker - Admin refund processing interface
-- Issue: #124
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADMIN AUDIT LOG TABLE
-- ============================================================================

-- Admin audit log for immutable tracking of all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Admin performing the action
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Action details
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'refund_processed',
      'refund_rejected',
      'withdrawal_approved',
      'withdrawal_rejected',
      'car_approved',
      'car_suspended',
      'user_suspended',
      'user_verified',
      'manual_adjustment'
    )
  ),

  -- Target of the action
  target_type TEXT NOT NULL CHECK (
    target_type IN ('booking', 'withdrawal', 'car', 'user', 'wallet', 'payment')
  ),
  target_id UUID NOT NULL,

  -- Action metadata
  amount NUMERIC(10, 2), -- For financial actions
  currency TEXT DEFAULT 'ARS',
  reason TEXT, -- Admin reason/notes
  metadata JSONB, -- Additional context

  -- Immutable timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit log
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- Prevent updates/deletes on audit log (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is immutable - modifications not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON TABLE public.admin_audit_log IS 'Immutable audit trail of all admin actions';
COMMENT ON COLUMN public.admin_audit_log.action_type IS 'Type of admin action performed';
COMMENT ON COLUMN public.admin_audit_log.target_type IS 'Type of entity the action was performed on';
COMMENT ON COLUMN public.admin_audit_log.target_id IS 'ID of the entity';

-- ============================================================================
-- SECTION 2: REFUND REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to booking
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,

  -- User receiving refund
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Refund amount
  refund_amount NUMERIC(10, 2) NOT NULL CHECK (refund_amount > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',

  -- Refund destination
  destination TEXT NOT NULL CHECK (destination IN ('wallet', 'original_payment_method')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected')
  ),

  -- Admin actions
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,

  -- Reason and notes
  request_reason TEXT,
  rejection_reason TEXT,
  admin_notes TEXT,

  -- Provider tracking (for payment method refunds)
  provider TEXT, -- 'mercadopago', 'stripe', etc.
  provider_refund_id TEXT,
  provider_metadata JSONB,

  -- Wallet transaction (for wallet refunds)
  wallet_transaction_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Indexes for refund_requests
CREATE INDEX idx_refund_requests_booking_id ON public.refund_requests(booking_id);
CREATE INDEX idx_refund_requests_user_id ON public.refund_requests(user_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX idx_refund_requests_created_at ON public.refund_requests(created_at DESC);

-- Prevent duplicate refund requests for same booking
CREATE UNIQUE INDEX idx_refund_requests_booking_unique
  ON public.refund_requests(booking_id)
  WHERE status NOT IN ('rejected', 'failed');

-- Updated_at trigger for refund_requests
CREATE TRIGGER set_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.refund_requests IS 'Tracks all refund requests and their processing status';
COMMENT ON COLUMN public.refund_requests.destination IS 'Where refund goes: wallet (instant) or original_payment_method (2-5 days)';
COMMENT ON INDEX idx_refund_requests_booking_unique IS 'Prevents duplicate active refunds for same booking';

-- ============================================================================
-- SECTION 3: ENHANCE BOOKINGS TABLE FOR REFUNDS
-- ============================================================================

-- Add refund tracking fields to bookings if they don't exist
DO $$
BEGIN
  -- Refund amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN refund_amount NUMERIC(10, 2);
  END IF;

  -- Refund status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'refund_status'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN refund_status TEXT
      CHECK (refund_status IN ('none', 'pending', 'completed', 'failed', 'partial'));
  END IF;

  -- Refund processed at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'refund_processed_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN refund_processed_at TIMESTAMPTZ;
  END IF;

  -- Refund processed by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'refund_processed_by'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN refund_processed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Set default refund_status for existing bookings
UPDATE public.bookings
SET refund_status = 'none'
WHERE refund_status IS NULL;

-- ============================================================================
-- SECTION 4: RPC FUNCTION - admin_process_refund
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_process_refund(
  p_booking_id UUID,
  p_refund_amount NUMERIC,
  p_destination TEXT, -- 'wallet' or 'original_payment_method'
  p_reason TEXT DEFAULT NULL,
  p_admin_password TEXT DEFAULT NULL -- For additional security (optional)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_is_admin BOOLEAN;
  v_booking RECORD;
  v_refund_request_id UUID;
  v_wallet_tx_id UUID;
  v_result JSON;
BEGIN
  -- ============================================
  -- STEP 1: Authorization Check
  -- ============================================

  -- Get current user
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verify admin permissions
  SELECT is_admin INTO v_admin_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_admin_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administrador';
  END IF;

  -- ============================================
  -- STEP 2: Validate Booking and Amount
  -- ============================================

  -- Get booking details
  SELECT
    b.id,
    b.renter_id,
    b.total_amount,
    b.total_cents,
    b.currency,
    b.status,
    b.payment_status,
    b.refund_status,
    b.refund_amount
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking no encontrado: %', p_booking_id;
  END IF;

  -- Validate refund amount doesn't exceed total
  IF p_refund_amount > COALESCE(v_booking.total_amount, v_booking.total_cents / 100.0, 0) THEN
    RAISE EXCEPTION 'Monto de reembolso (%) excede el total del booking (%)',
      p_refund_amount,
      COALESCE(v_booking.total_amount, v_booking.total_cents / 100.0);
  END IF;

  -- Prevent duplicate refunds
  IF v_booking.refund_status IN ('completed', 'pending') THEN
    RAISE EXCEPTION 'Este booking ya tiene un reembolso procesado o pendiente';
  END IF;

  -- Check for existing active refund request
  IF EXISTS (
    SELECT 1 FROM public.refund_requests
    WHERE booking_id = p_booking_id
    AND status NOT IN ('rejected', 'failed')
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud de reembolso activa para este booking';
  END IF;

  -- ============================================
  -- STEP 3: Create Refund Request
  -- ============================================

  INSERT INTO public.refund_requests (
    booking_id,
    user_id,
    refund_amount,
    currency,
    destination,
    status,
    request_reason,
    approved_by,
    approved_at,
    admin_notes
  ) VALUES (
    p_booking_id,
    v_booking.renter_id,
    p_refund_amount,
    COALESCE(v_booking.currency, 'ARS'),
    p_destination,
    'approved', -- Auto-approved by admin
    p_reason,
    v_admin_id,
    now(),
    'Procesado directamente por admin'
  )
  RETURNING id INTO v_refund_request_id;

  -- ============================================
  -- STEP 4: Process Refund Based on Destination
  -- ============================================

  IF p_destination = 'wallet' THEN
    -- Instant wallet refund
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      currency,
      status,
      description,
      reference_type,
      reference_id
    ) VALUES (
      v_booking.renter_id,
      'refund',
      p_refund_amount,
      COALESCE(v_booking.currency, 'ARS'),
      'completed',
      'Reembolso por booking ' || p_booking_id ||
        CASE WHEN p_reason IS NOT NULL THEN ' - ' || p_reason ELSE '' END,
      'booking',
      p_booking_id
    )
    RETURNING id INTO v_wallet_tx_id;

    -- Update refund request with wallet tx
    UPDATE public.refund_requests
    SET
      wallet_transaction_id = v_wallet_tx_id,
      status = 'completed',
      processed_by = v_admin_id,
      processed_at = now(),
      completed_at = now()
    WHERE id = v_refund_request_id;

    -- Update booking refund status
    UPDATE public.bookings
    SET
      refund_status = 'completed',
      refund_amount = p_refund_amount,
      refund_processed_at = now(),
      refund_processed_by = v_admin_id
    WHERE id = p_booking_id;

  ELSIF p_destination = 'original_payment_method' THEN
    -- Mark as processing - external webhook will complete
    UPDATE public.refund_requests
    SET
      status = 'processing',
      processed_by = v_admin_id,
      processed_at = now()
    WHERE id = v_refund_request_id;

    -- Update booking
    UPDATE public.bookings
    SET
      refund_status = 'pending',
      refund_amount = p_refund_amount,
      refund_processed_by = v_admin_id
    WHERE id = p_booking_id;

    -- Note: Actual payment provider refund should be triggered by
    -- a separate Edge Function calling MercadoPago/Stripe API
  END IF;

  -- ============================================
  -- STEP 5: Create Audit Log Entry
  -- ============================================

  INSERT INTO public.admin_audit_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    amount,
    currency,
    reason,
    metadata
  ) VALUES (
    v_admin_id,
    'refund_processed',
    'booking',
    p_booking_id,
    p_refund_amount,
    COALESCE(v_booking.currency, 'ARS'),
    p_reason,
    jsonb_build_object(
      'refund_request_id', v_refund_request_id,
      'destination', p_destination,
      'wallet_transaction_id', v_wallet_tx_id,
      'booking_total', COALESCE(v_booking.total_amount, v_booking.total_cents / 100.0)
    )
  );

  -- ============================================
  -- STEP 6: Return Result
  -- ============================================

  v_result := json_build_object(
    'success', true,
    'refund_request_id', v_refund_request_id,
    'booking_id', p_booking_id,
    'amount', p_refund_amount,
    'destination', p_destination,
    'status', CASE
      WHEN p_destination = 'wallet' THEN 'completed'
      ELSE 'processing'
    END,
    'wallet_transaction_id', v_wallet_tx_id,
    'message', CASE
      WHEN p_destination = 'wallet' THEN 'Reembolso completado instantáneamente a wallet'
      ELSE 'Reembolso en proceso - se procesará en 2-5 días hábiles'
    END
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    RAISE EXCEPTION 'Error procesando reembolso: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.admin_process_refund IS 'Admin RPC to process refunds with authorization and audit logging';

-- ============================================
-- SECTION 5: RPC FUNCTION - admin_get_refund_requests
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_get_refund_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  refund_amount NUMERIC,
  currency TEXT,
  destination TEXT,
  status TEXT,
  booking_total NUMERIC,
  car_title TEXT,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Authorization check
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administrador';
  END IF;

  -- Return refund requests with joined data
  RETURN QUERY
  SELECT
    rr.id,
    rr.booking_id,
    rr.user_id,
    p.full_name as user_name,
    u.email as user_email,
    rr.refund_amount,
    rr.currency,
    rr.destination,
    rr.status,
    COALESCE(b.total_amount, b.total_cents / 100.0) as booking_total,
    c.title as car_title,
    rr.created_at,
    rr.approved_at,
    rr.processed_at,
    rr.rejection_reason,
    rr.admin_notes
  FROM public.refund_requests rr
  INNER JOIN public.bookings b ON b.id = rr.booking_id
  INNER JOIN public.cars c ON c.id = b.car_id
  INNER JOIN public.profiles p ON p.id = rr.user_id
  INNER JOIN auth.users u ON u.id = rr.user_id
  WHERE
    (p_status IS NULL OR rr.status = p_status)
  ORDER BY rr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.admin_get_refund_requests IS 'Admin RPC to retrieve refund requests with filtering';

-- ============================================================================
-- SECTION 6: RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Admin audit log: Only admins can read
CREATE POLICY admin_audit_log_select_policy ON public.admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Refund requests: Admins can read all, users can read their own
CREATE POLICY refund_requests_select_policy ON public.refund_requests
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Refund requests: Only admins can insert/update
CREATE POLICY refund_requests_insert_policy ON public.refund_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY refund_requests_update_policy ON public.refund_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on RPC functions to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION public.admin_process_refund TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_refund_requests TO authenticated;

-- Grant access to tables
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.refund_requests TO authenticated;

COMMIT;
