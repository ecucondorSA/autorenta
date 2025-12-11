-- =============================================================================
-- DISPUTE SYSTEM FUNCTIONS
-- =============================================================================
-- open_dispute: Opens a dispute within 24h of checkout
-- resolve_dispute: Admin resolves with funds distribution decision
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FUNCTION: open_dispute
-- Opens a dispute on a booking within 24h of checkout (pending_review status)
-- Can be called by owner or renter
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_dispute(
  p_booking_id UUID,
  p_reporter_id UUID,
  p_reason TEXT,
  p_evidence_urls TEXT[] DEFAULT NULL,
  p_claimed_amount_cents BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_is_owner BOOLEAN;
  v_is_renter BOOLEAN;
BEGIN
  -- Get booking details
  SELECT b.*, c.owner_id
  INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Verify reporter is owner or renter
  v_is_owner := (v_booking.owner_id = p_reporter_id);
  v_is_renter := (v_booking.renter_id = p_reporter_id);

  IF NOT v_is_owner AND NOT v_is_renter THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo el dueño o arrendatario pueden abrir disputa');
  END IF;

  -- Verify booking is in pending_review status
  IF v_booking.status != 'pending_review' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo se puede abrir disputa en reservas pendientes de revisión',
      'current_status', v_booking.status::TEXT
    );
  END IF;

  -- Verify within 24h of checkout (returned_at)
  IF v_booking.returned_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no ha sido devuelta aún');
  END IF;

  IF NOW() > v_booking.returned_at + INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El plazo de 24 horas para abrir disputa ha expirado',
      'returned_at', v_booking.returned_at,
      'deadline', v_booking.returned_at + INTERVAL '24 hours'
    );
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debe proporcionar una razón de al menos 10 caracteres');
  END IF;

  -- Update booking to disputed status
  UPDATE bookings
  SET
    status = 'disputed',
    dispute_opened_at = NOW(),
    dispute_reason = p_reason,
    dispute_evidence_urls = p_evidence_urls,
    dispute_amount_cents = p_claimed_amount_cents,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'opened_by', CASE WHEN v_is_owner THEN 'owner' ELSE 'renter' END,
    'opened_at', NOW(),
    'reason', p_reason,
    'claimed_amount_cents', p_claimed_amount_cents
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- FUNCTION: resolve_dispute
-- Admin resolves a dispute with decision on funds
-- resolution types: 'favor_owner', 'favor_renter', 'split', 'no_action'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_booking_id UUID,
  p_admin_id UUID,
  p_resolution TEXT,
  p_resolution_notes TEXT DEFAULT NULL,
  p_charge_renter_cents BIGINT DEFAULT 0,
  p_refund_renter_cents BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_owner_id UUID;
  v_deposit_amount BIGINT;
  v_owner_payout_cents BIGINT;
  v_platform_fee_cents BIGINT;
  v_renter_portion BIGINT;
  v_owner_portion BIGINT;
BEGIN
  -- Validate resolution type
  IF p_resolution NOT IN ('favor_owner', 'favor_renter', 'split', 'no_action') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Resolución inválida. Use: favor_owner, favor_renter, split, no_action'
    );
  END IF;

  -- Get booking and owner
  SELECT b.*, c.owner_id
  INTO v_booking
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  v_owner_id := v_booking.owner_id;

  -- Verify booking is in disputed status
  IF v_booking.status != 'disputed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo se pueden resolver reservas en disputa',
      'current_status', v_booking.status::TEXT
    );
  END IF;

  -- Get deposit amount
  v_deposit_amount := COALESCE(v_booking.deposit_amount_cents, 0);

  -- Process based on resolution
  IF p_resolution = 'favor_owner' THEN
    -- Owner gets the deposit (or claimed amount)
    -- Charge renter's wallet/card for the dispute amount
    IF p_charge_renter_cents > 0 THEN
      -- Create wallet debit for renter
      INSERT INTO wallet_transactions (
        user_id, type, amount, status,
        reference_type, reference_id, description
      )
      VALUES (
        v_booking.renter_id, 'debit', p_charge_renter_cents, 'completed',
        'dispute', p_booking_id,
        'Cargo por resolución de disputa a favor del dueño'
      );

      -- Credit owner (after platform fee)
      v_platform_fee_cents := (p_charge_renter_cents * 20) / 100;
      v_owner_payout_cents := p_charge_renter_cents - v_platform_fee_cents;

      INSERT INTO wallet_transactions (
        user_id, type, amount, status,
        reference_type, reference_id, description
      )
      VALUES (
        v_owner_id, 'credit', v_owner_payout_cents, 'completed',
        'dispute', p_booking_id,
        'Compensación por disputa resuelta a su favor'
      );
    END IF;

    -- Release any locked deposit to owner
    IF v_deposit_amount > 0 AND v_booking.deposit_lock_id IS NOT NULL THEN
      UPDATE wallet_transactions
      SET status = 'released',
          description = description || ' - Liberado a favor del dueño por disputa'
      WHERE id = v_booking.deposit_lock_id;

      -- Credit deposit to owner
      v_platform_fee_cents := (v_deposit_amount * 20) / 100;
      v_owner_payout_cents := v_deposit_amount - v_platform_fee_cents;

      INSERT INTO wallet_transactions (
        user_id, type, amount, status,
        reference_type, reference_id, description
      )
      VALUES (
        v_owner_id, 'credit', v_owner_payout_cents, 'completed',
        'deposit_claim', p_booking_id,
        'Depósito reclamado por disputa resuelta a favor'
      );
    END IF;

  ELSIF p_resolution = 'favor_renter' THEN
    -- Renter gets deposit back
    IF v_deposit_amount > 0 AND v_booking.deposit_lock_id IS NOT NULL THEN
      UPDATE wallet_transactions
      SET status = 'released',
          description = description || ' - Liberado a favor del arrendatario'
      WHERE id = v_booking.deposit_lock_id;
    END IF;

    -- If there's a refund due
    IF p_refund_renter_cents > 0 THEN
      INSERT INTO wallet_transactions (
        user_id, type, amount, status,
        reference_type, reference_id, description
      )
      VALUES (
        v_booking.renter_id, 'credit', p_refund_renter_cents, 'completed',
        'dispute_refund', p_booking_id,
        'Reembolso por disputa resuelta a su favor'
      );
    END IF;

  ELSIF p_resolution = 'split' THEN
    -- Split the disputed amount
    IF v_deposit_amount > 0 AND v_booking.deposit_lock_id IS NOT NULL THEN
      -- Release lock
      UPDATE wallet_transactions
      SET status = 'released',
          description = description || ' - Liberado parcialmente (split)'
      WHERE id = v_booking.deposit_lock_id;

      -- Split 50/50 by default
      v_renter_portion := v_deposit_amount / 2;
      v_owner_portion := v_deposit_amount - v_renter_portion;

      -- Credit renter their portion
      IF v_renter_portion > 0 THEN
        INSERT INTO wallet_transactions (
          user_id, type, amount, status,
          reference_type, reference_id, description
        )
        VALUES (
          v_booking.renter_id, 'credit', v_renter_portion, 'completed',
          'dispute_split', p_booking_id,
          'Porción del depósito por resolución split'
        );
      END IF;

      -- Credit owner their portion (after platform fee)
      IF v_owner_portion > 0 THEN
        v_platform_fee_cents := (v_owner_portion * 20) / 100;
        v_owner_payout_cents := v_owner_portion - v_platform_fee_cents;

        INSERT INTO wallet_transactions (
          user_id, type, amount, status,
          reference_type, reference_id, description
        )
        VALUES (
          v_owner_id, 'credit', v_owner_payout_cents, 'completed',
          'dispute_split', p_booking_id,
          'Porción del depósito por resolución split'
        );
      END IF;
    END IF;

  ELSIF p_resolution = 'no_action' THEN
    -- Just release the deposit back to renter, no additional charges
    IF v_deposit_amount > 0 AND v_booking.deposit_lock_id IS NOT NULL THEN
      UPDATE wallet_transactions
      SET status = 'released',
          description = description || ' - Liberado sin cargo (no action)'
      WHERE id = v_booking.deposit_lock_id;
    END IF;
  END IF;

  -- Update booking to completed with resolution
  UPDATE bookings
  SET
    status = 'completed',
    dispute_resolved_at = NOW(),
    dispute_resolution = p_resolution || COALESCE(': ' || p_resolution_notes, ''),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'resolution', p_resolution,
    'resolved_at', NOW(),
    'charge_renter_cents', p_charge_renter_cents,
    'refund_renter_cents', p_refund_renter_cents,
    'notes', p_resolution_notes
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- FUNCTION: get_dispute_details
-- Get full details of a disputed booking for admin panel
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dispute_details(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'booking_id', b.id,
    'status', b.status,
    'car', jsonb_build_object(
      'id', c.id,
      'make', c.make,
      'model', c.model,
      'year', c.year,
      'plate', c.plate
    ),
    'owner', jsonb_build_object(
      'id', owner.id,
      'name', owner.full_name,
      'email', owner.email
    ),
    'renter', jsonb_build_object(
      'id', renter.id,
      'name', renter.full_name,
      'email', renter.email
    ),
    'dates', jsonb_build_object(
      'start', b.start_date,
      'end', b.end_date,
      'returned_at', b.returned_at
    ),
    'amounts', jsonb_build_object(
      'total_cents', b.total_price_cents,
      'deposit_cents', b.deposit_amount_cents,
      'late_penalty_cents', b.late_return_penalty_cents
    ),
    'dispute', jsonb_build_object(
      'opened_at', b.dispute_opened_at,
      'reason', b.dispute_reason,
      'evidence_urls', b.dispute_evidence_urls,
      'claimed_amount_cents', b.dispute_amount_cents,
      'resolved_at', b.dispute_resolved_at,
      'resolution', b.dispute_resolution
    ),
    'hours_since_opened', EXTRACT(EPOCH FROM (NOW() - b.dispute_opened_at)) / 3600
  )
  INTO v_result
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  JOIN profiles owner ON owner.id = c.owner_id
  JOIN profiles renter ON renter.id = b.renter_id
  WHERE b.id = p_booking_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION open_dispute(UUID, UUID, TEXT, TEXT[], BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_dispute(UUID, UUID, TEXT, TEXT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION get_dispute_details(UUID) TO service_role;

COMMENT ON FUNCTION open_dispute IS 'Opens a dispute on a booking within 24h of checkout. Can be called by owner or renter.';
COMMENT ON FUNCTION resolve_dispute IS 'Admin resolves a dispute with decision on funds distribution.';
COMMENT ON FUNCTION get_dispute_details IS 'Get full details of a disputed booking for admin panel.';
