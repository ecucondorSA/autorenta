-- ============================================================================
-- P0-SECURITY: Claims Table for Settlement System
-- ============================================================================
-- This migration creates the claims table for managing damage/incident claims
-- Includes support for:
-- - Claim lifecycle management (draft → submitted → under_review → approved/rejected → paid)
-- - Optimistic locking to prevent double-processing
-- - Anti-fraud tracking fields
-- ============================================================================

-- Create claim status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
    CREATE TYPE claim_status AS ENUM (
      'draft',
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'paid',
      'processing'
    );
  END IF;
END $$;

-- Create damage type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'damage_type') THEN
    CREATE TYPE damage_type AS ENUM (
      'scratch',
      'dent',
      'broken_glass',
      'tire_damage',
      'mechanical',
      'interior',
      'missing_item',
      'other'
    );
  END IF;
END $$;

-- Create damage severity enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'damage_severity') THEN
    CREATE TYPE damage_severity AS ENUM (
      'minor',
      'moderate',
      'severe'
    );
  END IF;
END $$;

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core relationships
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Claim details
  damages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- damages structure: [{type, description, estimatedCostUsd, photos[], severity}]

  total_estimated_cost_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status claim_status NOT NULL DEFAULT 'draft',
  notes TEXT,

  -- P0-SECURITY: Optimistic locking fields
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,

  -- P0-SECURITY: Anti-fraud tracking
  fraud_warnings JSONB DEFAULT '[]'::jsonb,
  owner_claims_30d INTEGER DEFAULT 0,

  -- Resolution fields
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Waterfall execution results
  waterfall_result JSONB,
  -- waterfall_result structure: {holdCaptured, walletDebited, extraCharged, fgoPaid, remainingUncovered}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding claims by booking
CREATE INDEX IF NOT EXISTS idx_claims_booking_id ON claims(booking_id);

-- Index for finding claims by reporter (owner)
CREATE INDEX IF NOT EXISTS idx_claims_reported_by ON claims(reported_by);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- P0-SECURITY: Index for lock queries (find processing claims)
CREATE INDEX IF NOT EXISTS idx_claims_status_locked
ON claims(status, locked_at)
WHERE status = 'processing';

-- Index for anti-fraud queries (recent claims by owner)
CREATE INDEX IF NOT EXISTS idx_claims_reported_by_created
ON claims(reported_by, created_at DESC);

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_claims_status_created
ON claims(status, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view claims for their bookings (as renter or owner)
CREATE POLICY "Users can view claims for their bookings"
ON claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = claims.booking_id
    AND (b.user_id = auth.uid() OR b.owner_id = auth.uid())
  )
  OR
  -- Admins can view all claims
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Policy: Only booking owners can create claims
CREATE POLICY "Booking owners can create claims"
ON claims FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_id
    AND b.owner_id = auth.uid()
  )
);

-- Policy: Claim reporters can update their own draft claims
CREATE POLICY "Reporters can update draft claims"
ON claims FOR UPDATE
USING (
  reported_by = auth.uid()
  AND status = 'draft'
)
WITH CHECK (
  reported_by = auth.uid()
  AND status IN ('draft', 'submitted')
);

-- Policy: Admins can update any claim
CREATE POLICY "Admins can update any claim"
ON claims FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Policy: Only admins can delete claims (soft delete preferred)
CREATE POLICY "Admins can delete claims"
ON claims FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS claims_updated_at ON claims;
CREATE TRIGGER claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION update_claims_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to submit a claim (moves from draft to submitted)
CREATE OR REPLACE FUNCTION submit_claim(p_claim_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim claims;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Get and validate claim
  SELECT * INTO v_claim FROM claims WHERE id = p_claim_id;

  IF v_claim IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim not found');
  END IF;

  IF v_claim.reported_by != v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  IF v_claim.status != 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim is not in draft status');
  END IF;

  -- Validate claim has damages
  IF v_claim.damages IS NULL OR jsonb_array_length(v_claim.damages) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim must have at least one damage item');
  END IF;

  -- Update status
  UPDATE claims
  SET status = 'submitted'
  WHERE id = p_claim_id;

  RETURN jsonb_build_object(
    'ok', true,
    'claim_id', p_claim_id,
    'new_status', 'submitted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_claim TO authenticated;

-- Function to get claim statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_claims_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'under_review', COUNT(*) FILTER (WHERE status = 'under_review'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'paid', COUNT(*) FILTER (WHERE status = 'paid'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'total_estimated_usd', COALESCE(SUM(total_estimated_cost_usd), 0),
    'avg_claim_usd', COALESCE(AVG(total_estimated_cost_usd), 0),
    'claims_last_30d', COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')
  ) INTO v_stats
  FROM claims;

  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_claims_stats TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE claims IS 'Damage/incident claims for bookings. Supports full settlement lifecycle with anti-fraud protection.';
COMMENT ON COLUMN claims.damages IS 'Array of damage items: [{type, description, estimatedCostUsd, photos[], severity}]';
COMMENT ON COLUMN claims.locked_at IS 'P0-SECURITY: Timestamp when claim was locked for processing (optimistic locking)';
COMMENT ON COLUMN claims.locked_by IS 'P0-SECURITY: User who locked the claim for processing';
COMMENT ON COLUMN claims.fraud_warnings IS 'P0-SECURITY: Array of fraud warning flags from anti-fraud validation';
COMMENT ON COLUMN claims.waterfall_result IS 'Result of waterfall execution: {holdCaptured, walletDebited, extraCharged, fgoPaid, remainingUncovered}';
