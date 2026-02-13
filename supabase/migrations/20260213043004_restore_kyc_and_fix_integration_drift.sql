-- ============================================================================
-- Migration: Restore KYC System & Fix Integration Drift
-- Date: 2026-02-13
--
-- Root cause: Stub migration 20260210070659 overwrote real KYC functions with
-- no-ops ({blocked: false}, {can_operate: true}). The original migration
-- 20260123103223 was applied but its ALTER TABLE columns were lost when
-- user_identity_levels was recreated by a later migration without them.
--
-- This migration:
-- P0: Restores KYC blocking system (columns, tables, RPCs)
-- P0: Adds missing profiles columns (selfie_verified_at, mercadopago_customer_id)
-- P1: Creates audit_logs table for delete-account/export-user-data
-- ============================================================================

-- ============================================================================
-- P0: KYC COLUMNS ON user_identity_levels
-- ============================================================================

ALTER TABLE user_identity_levels
  ADD COLUMN IF NOT EXISTS face_verification_attempts INTEGER DEFAULT 0;

ALTER TABLE user_identity_levels
  ADD COLUMN IF NOT EXISTS face_verification_last_failed_at TIMESTAMPTZ;

ALTER TABLE user_identity_levels
  ADD COLUMN IF NOT EXISTS kyc_blocked_at TIMESTAMPTZ;

ALTER TABLE user_identity_levels
  ADD COLUMN IF NOT EXISTS kyc_blocked_reason TEXT;

-- Indexes for querying blocked users efficiently
CREATE INDEX IF NOT EXISTS idx_user_identity_levels_kyc_blocked
  ON user_identity_levels(kyc_blocked_at)
  WHERE kyc_blocked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_identity_levels_face_attempts
  ON user_identity_levels(face_verification_attempts)
  WHERE face_verification_attempts > 0;

-- ============================================================================
-- P0: kyc_user_blocks TABLE (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kyc_user_blocks (
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

ALTER TABLE kyc_user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view all blocks
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all blocks" ON kyc_user_blocks;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Admins can view all blocks"
  ON kyc_user_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- RLS: Admins can manage blocks
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage blocks" ON kyc_user_blocks;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Admins can manage blocks"
  ON kyc_user_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- RLS: Users can view their own blocks
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own blocks" ON kyc_user_blocks;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own blocks"
  ON kyc_user_blocks FOR SELECT
  USING (user_id = auth.uid());

-- Service role full access
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access kyc_user_blocks" ON kyc_user_blocks;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Service role full access kyc_user_blocks"
  ON kyc_user_blocks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- P0: RESTORE is_kyc_blocked (drop stub, create real TABLE-returning version)
-- ============================================================================

-- Must DROP first because return type changed (JSONB → TABLE)
DROP FUNCTION IF EXISTS is_kyc_blocked(UUID);

CREATE FUNCTION is_kyc_blocked(p_user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION is_kyc_blocked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_kyc_blocked(UUID) TO service_role;

-- ============================================================================
-- P0: CREATE increment_face_verification_attempts
-- ============================================================================

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
  SELECT COALESCE(uil.face_verification_attempts, 0)
  INTO v_current_attempts
  FROM user_identity_levels uil
  WHERE uil.user_id = p_user_id;

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
    v_block_reason := format('Bloqueado: %s intentos de verificacion facial fallidos (ultimo score: %s%%)',
      v_current_attempts,
      COALESCE(p_face_match_score::TEXT, 'N/A')
    );
  END IF;

  -- Update user_identity_levels
  UPDATE user_identity_levels SET
    face_verification_attempts = v_current_attempts,
    face_verification_last_failed_at = v_now,
    kyc_blocked_at = CASE WHEN v_should_block THEN v_now ELSE user_identity_levels.kyc_blocked_at END,
    kyc_blocked_reason = CASE WHEN v_should_block THEN v_block_reason ELSE user_identity_levels.kyc_blocked_reason END
  WHERE user_identity_levels.user_id = p_user_id;

  -- If blocked, create audit record
  IF v_should_block THEN
    INSERT INTO kyc_user_blocks (user_id, reason, block_type, details, blocked_at)
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
      'Verificacion Bloqueada',
      'Tu cuenta ha sido bloqueada temporalmente debido a multiples intentos fallidos de verificacion facial. Por favor, contacta a soporte para asistencia.',
      jsonb_build_object('attempts', v_current_attempts, 'blocked_at', v_now)
    );
  END IF;

  RETURN QUERY SELECT v_current_attempts, v_should_block, v_block_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION increment_face_verification_attempts(UUID, NUMERIC) TO service_role;

-- ============================================================================
-- P0: CREATE reset_face_verification_attempts (admin tool)
-- ============================================================================

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
  UPDATE kyc_user_blocks SET
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
    'Verificacion Desbloqueada',
    'Tu cuenta ha sido desbloqueada. Ya podes intentar la verificacion facial nuevamente.'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION reset_face_verification_attempts(UUID, UUID, TEXT) TO service_role;

-- ============================================================================
-- P0: RESTORE can_user_operate (drop stub, create real version)
-- ============================================================================

-- Drop the stub that always returns {can_operate: true}
DROP FUNCTION IF EXISTS can_user_operate(UUID);

-- Real implementation: checks KYC block status
CREATE FUNCTION can_user_operate(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID;
  v_is_blocked BOOLEAN;
  v_block_reason TEXT;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('can_operate', false, 'reason', 'No user ID');
  END IF;

  -- Check KYC block
  SELECT
    uil.kyc_blocked_at IS NOT NULL,
    uil.kyc_blocked_reason
  INTO v_is_blocked, v_block_reason
  FROM user_identity_levels uil
  WHERE uil.user_id = v_uid;

  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'can_operate', false,
      'reason', 'kyc_blocked',
      'details', COALESCE(v_block_reason, 'Cuenta bloqueada por verificacion KYC')
    );
  END IF;

  RETURN jsonb_build_object('can_operate', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION can_user_operate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_operate(UUID) TO service_role;

-- ============================================================================
-- P0: MISSING COLUMNS ON profiles
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mercadopago_customer_id VARCHAR;

-- ============================================================================
-- P1: audit_logs TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and service_role can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role full access audit_logs"
  ON audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for querying by user and action
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
