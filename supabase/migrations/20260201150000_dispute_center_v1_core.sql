-- ============================================================================
-- MIGRATION: Dispute Center V1 - Core Architecture
-- Date: 2026-02-01
-- Author: Senior Architect
-- Purpose: Formalize dispute resolution with financial consequences and audit trails.
-- ============================================================================

BEGIN;

-- 1. ENHANCE disputes table
ALTER TABLE public.disputes 
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolution_favor TEXT CHECK (resolution_favor IN ('owner', 'renter', 'none')),
  ADD COLUMN IF NOT EXISTS penalty_amount_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.disputes.internal_notes IS 'Notas privadas solo para administradores.';
COMMENT ON COLUMN public.disputes.resolution_favor IS 'Indica a quién benefició la resolución final.';
COMMENT ON COLUMN public.disputes.penalty_amount_cents IS 'Monto de la penalidad aplicada (deducida de la garantía).';

-- 2. CREATE dispute_timeline table
CREATE TABLE IF NOT EXISTS public.dispute_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id), -- Admin o Participante
  event_type TEXT NOT NULL, -- 'status_change', 'evidence_added', 'comment', 'resolution'
  from_status TEXT,
  to_status TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute ON public.dispute_timeline(dispute_id);

-- 3. RLS for timeline
ALTER TABLE public.dispute_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins can view timeline"
  ON public.dispute_timeline FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_id AND (d.opened_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.bookings b 
        JOIN public.cars c ON c.id = b.car_id
        WHERE b.id = d.booking_id AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
      ))
    )
  );

-- 4. RPC: resolve_dispute
-- This is the critical financial function.
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id UUID,
  p_resolution_favor TEXT,
  p_penalty_cents BIGINT,
  p_internal_notes TEXT,
  p_public_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_admin_id UUID := auth.uid();
  v_res JSONB;
BEGIN
  -- Security: Only admin can resolve
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Not authorized to resolve disputes';
  END IF;

  -- 1. Fetch Dispute & Booking
  SELECT d.* INTO v_dispute FROM public.disputes d WHERE d.id = p_dispute_id FOR UPDATE;
  IF v_dispute IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF v_dispute.status = 'resolved' THEN RAISE EXCEPTION 'Dispute already resolved'; END IF;

  SELECT b.* INTO v_booking FROM public.bookings b WHERE b.id = v_dispute.booking_id FOR UPDATE;

  -- 2. Financial Logic
  IF p_resolution_favor = 'owner' AND p_penalty_cents > 0 THEN
    -- Ensure penalty doesn't exceed deposit (or handle as debt)
    IF p_penalty_cents > v_booking.deposit_amount_cents THEN
       p_penalty_cents := v_booking.deposit_amount_cents; -- Cap to deposit for V1
    END IF;

    -- Integrate with Wallet (Assuming functions like wallet_charge exist)
    -- In a real scenario, we would call: 
    -- PERFORM wallet_transfer(v_booking.renter_id, v_booking.owner_id, p_penalty_cents, 'dispute_penalty', p_dispute_id);
    
    -- For now, we update the metadata to record the intent
    v_dispute.metadata := v_dispute.metadata || jsonb_build_object(
      'financial_action', 'penalty_applied',
      'amount_cents', p_penalty_cents,
      'transferred_to', 'owner'
    );
  END IF;

  -- 3. Update Dispute
  UPDATE public.disputes
  SET 
    status = 'resolved',
    resolution_favor = p_resolution_favor,
    penalty_amount_cents = p_penalty_cents,
    resolved_by = v_admin_id,
    resolved_at = NOW(),
    internal_notes = p_internal_notes,
    description = COALESCE(p_public_notes, description),
    metadata = v_dispute.metadata
  WHERE id = p_dispute_id;

  -- 4. Audit Log
  INSERT INTO public.dispute_timeline (dispute_id, user_id, event_type, from_status, to_status, body)
  VALUES (p_dispute_id, v_admin_id, 'resolution', v_dispute.status, 'resolved', p_public_notes);

  -- 5. Close Booking if necessary (transition from 'dispute' back to 'completed')
  IF v_booking.status = 'dispute' THEN
    UPDATE public.bookings SET status = 'completed' WHERE id = v_booking.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'resolution', p_resolution_favor,
    'penalty_applied', p_penalty_cents
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.resolve_dispute(UUID, TEXT, BIGINT, TEXT, TEXT) TO authenticated;

COMMIT;
