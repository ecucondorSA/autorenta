-- Migration: EV Clauses and KYC Blocking System
-- Description: Adds EV-specific contract clauses validation and KYC blocking mechanism
-- Date: 2026-01-23

-- =============================================================================
-- PART 1: KYC BLOCKING SYSTEM
-- =============================================================================

-- Add KYC blocking fields to user_identity_levels
ALTER TABLE user_identity_levels ADD COLUMN IF NOT EXISTS
  face_verification_attempts INTEGER DEFAULT 0;

ALTER TABLE user_identity_levels ADD COLUMN IF NOT EXISTS
  face_verification_last_failed_at TIMESTAMPTZ;

ALTER TABLE user_identity_levels ADD COLUMN IF NOT EXISTS
  kyc_blocked_at TIMESTAMPTZ;

ALTER TABLE user_identity_levels ADD COLUMN IF NOT EXISTS
  kyc_blocked_reason TEXT;

-- Index for querying blocked users efficiently
CREATE INDEX IF NOT EXISTS idx_user_identity_levels_kyc_blocked
  ON user_identity_levels(kyc_blocked_at)
  WHERE kyc_blocked_at IS NOT NULL;

-- Index for monitoring failed attempts
CREATE INDEX IF NOT EXISTS idx_user_identity_levels_face_attempts
  ON user_identity_levels(face_verification_attempts)
  WHERE face_verification_attempts > 0;

-- Create user_blocks table for audit trail
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  block_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unblocked_at TIMESTAMPTZ,
  unblocked_by UUID REFERENCES auth.users(id),
  unblock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Admin can view all blocks
CREATE POLICY "Admins can view all blocks"
  ON user_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin can manage blocks
CREATE POLICY "Admins can manage blocks"
  ON user_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can view their own blocks
CREATE POLICY "Users can view own blocks"
  ON user_blocks FOR SELECT
  USING (user_id = auth.uid());

-- RPC to check if user is KYC blocked
CREATE OR REPLACE FUNCTION is_kyc_blocked(p_user_id UUID)
RETURNS TABLE(
  blocked BOOLEAN,
  reason TEXT,
  attempts INTEGER,
  last_failed_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uil.kyc_blocked_at IS NOT NULL AS blocked,
    uil.kyc_blocked_reason AS reason,
    COALESCE(uil.face_verification_attempts, 0) AS attempts,
    uil.face_verification_last_failed_at AS last_failed_at,
    uil.kyc_blocked_at AS blocked_at
  FROM user_identity_levels uil
  WHERE uil.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to increment face verification attempts and optionally block
CREATE OR REPLACE FUNCTION increment_face_verification_attempts(
  p_user_id UUID,
  p_face_match_score NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  new_attempts INTEGER,
  is_now_blocked BOOLEAN,
  block_reason TEXT
) AS $$
DECLARE
  v_current_attempts INTEGER;
  v_should_block BOOLEAN;
  v_block_reason TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Get current attempts
  SELECT COALESCE(face_verification_attempts, 0)
  INTO v_current_attempts
  FROM user_identity_levels
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_identity_levels (user_id, face_verification_attempts)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_current_attempts := 0;
  END IF;

  v_current_attempts := v_current_attempts + 1;
  v_should_block := v_current_attempts >= 5;

  IF v_should_block THEN
    v_block_reason := format('Bloqueado: %s intentos de verificación facial fallidos (último score: %s%%)',
      v_current_attempts,
      COALESCE(p_face_match_score::TEXT, 'N/A')
    );
  END IF;

  -- Update user_identity_levels
  UPDATE user_identity_levels SET
    face_verification_attempts = v_current_attempts,
    face_verification_last_failed_at = v_now,
    kyc_blocked_at = CASE WHEN v_should_block THEN v_now ELSE kyc_blocked_at END,
    kyc_blocked_reason = CASE WHEN v_should_block THEN v_block_reason ELSE kyc_blocked_reason END
  WHERE user_id = p_user_id;

  -- If blocked, create audit record
  IF v_should_block THEN
    INSERT INTO user_blocks (user_id, reason, block_type, details, blocked_at)
    VALUES (
      p_user_id,
      'kyc_failure',
      'face_mismatch',
      jsonb_build_object(
        'face_match_score', p_face_match_score,
        'total_attempts', v_current_attempts,
        'blocked_at', v_now
      ),
      v_now
    );

    -- Create notification for user
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      p_user_id,
      'kyc_blocked',
      'Verificación Bloqueada',
      'Tu cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos de verificación facial. Por favor, contacta a soporte para asistencia.',
      jsonb_build_object('attempts', v_current_attempts, 'blocked_at', v_now)
    );
  END IF;

  RETURN QUERY SELECT v_current_attempts, v_should_block, v_block_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to reset face verification attempts (for admin use)
CREATE OR REPLACE FUNCTION reset_face_verification_attempts(
  p_user_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT 'Manual reset by admin'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reset verification attempts';
  END IF;

  -- Reset attempts and unblock
  UPDATE user_identity_levels SET
    face_verification_attempts = 0,
    face_verification_last_failed_at = NULL,
    kyc_blocked_at = NULL,
    kyc_blocked_reason = NULL
  WHERE user_id = p_user_id;

  -- Update block record
  UPDATE user_blocks SET
    unblocked_at = now(),
    unblocked_by = p_admin_id,
    unblock_reason = p_reason
  WHERE user_id = p_user_id
    AND unblocked_at IS NULL
    AND block_type = 'face_mismatch';

  -- Notify user
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    p_user_id,
    'kyc_unblocked',
    'Verificación Desbloqueada',
    'Tu cuenta ha sido desbloqueada. Ya puedes intentar la verificación facial nuevamente.'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 2: EV CONTRACT CLAUSES
-- =============================================================================

-- Function to validate EV contract clauses
CREATE OR REPLACE FUNCTION validate_contract_clauses_ev(
  p_clauses JSONB,
  p_is_ev_vehicle BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  is_valid BOOLEAN,
  missing_clauses TEXT[]
) AS $$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_required_base TEXT[] := ARRAY['culpaGrave', 'indemnidad', 'retencion', 'mora'];
  v_required_ev TEXT[] := ARRAY['gpsTracking', 'geofencing', 'batteryManagement', 'chargingObligations', 'evDamagePolicy'];
  v_clause TEXT;
BEGIN
  -- Check base clauses
  FOREACH v_clause IN ARRAY v_required_base LOOP
    IF NOT (p_clauses->>v_clause)::boolean THEN
      v_missing := array_append(v_missing, v_clause);
    END IF;
  END LOOP;

  -- Check EV clauses if vehicle is electric
  IF p_is_ev_vehicle THEN
    FOREACH v_clause IN ARRAY v_required_ev LOOP
      IF NOT COALESCE((p_clauses->>v_clause)::boolean, false) THEN
        v_missing := array_append(v_missing, v_clause);
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY SELECT
    array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0,
    v_missing;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add EV clauses metadata to booking_contracts
ALTER TABLE booking_contracts ADD COLUMN IF NOT EXISTS
  ev_clauses_accepted JSONB DEFAULT NULL;

COMMENT ON COLUMN booking_contracts.ev_clauses_accepted IS
  'EV-specific clauses: gpsTracking, geofencing, batteryManagement, chargingObligations, evDamagePolicy';

-- Add trigger to validate EV clauses on contract acceptance
CREATE OR REPLACE FUNCTION validate_ev_contract_clauses_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_is_ev BOOLEAN;
  v_validation RECORD;
BEGIN
  -- Check if this is an EV vehicle
  SELECT c.fuel_type = 'electric' INTO v_is_ev
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = NEW.booking_id;

  -- If EV, validate EV clauses are present
  IF v_is_ev AND NEW.accepted_by_renter = TRUE THEN
    SELECT * INTO v_validation
    FROM validate_contract_clauses_ev(
      COALESCE(NEW.clauses_accepted, '{}') || COALESCE(NEW.ev_clauses_accepted, '{}'),
      TRUE
    );

    IF NOT v_validation.is_valid THEN
      RAISE EXCEPTION 'Missing required EV clauses: %', array_to_string(v_validation.missing_clauses, ', ');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS validate_ev_contract_clauses ON booking_contracts;
CREATE TRIGGER validate_ev_contract_clauses
  BEFORE INSERT OR UPDATE ON booking_contracts
  FOR EACH ROW
  WHEN (NEW.accepted_by_renter = TRUE)
  EXECUTE FUNCTION validate_ev_contract_clauses_trigger();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_kyc_blocked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_face_verification_attempts(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION reset_face_verification_attempts(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_contract_clauses_ev(JSONB, BOOLEAN) TO authenticated;
