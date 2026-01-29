-- ============================================
-- Migration: Production Hardening
-- Purpose: Add critical infrastructure for production reliability
--   - Audit log for financial operations
--   - Dead letter queue for failed webhooks
--   - Idempotency keys table
--   - Health check support
-- ============================================

-- ============================================
-- 1. AUDIT LOG TABLE
-- Tracks all changes to financial entities
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  entity_type TEXT NOT NULL, -- 'booking', 'payment', 'wallet_transaction', 'withdrawal', 'refund'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change'

  -- Who made the change
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'webhook', 'cron', 'admin'

  -- What was the change
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[], -- List of fields that changed

  -- Context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT, -- For tracing
  source TEXT, -- 'api', 'webhook', 'cron', 'manual', 'edge_function'

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can read audit log
CREATE POLICY "Service role full access on audit_log"
  ON public.audit_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can read audit_log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_source TEXT DEFAULT 'api',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    entity_type, entity_id, action,
    actor_id, actor_type,
    old_values, new_values, changed_fields,
    source, metadata
  ) VALUES (
    p_entity_type, p_entity_id, p_action,
    COALESCE(p_actor_id, auth.uid()), p_actor_type,
    p_old_values, p_new_values, p_changed_fields,
    p_source, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. AUTOMATIC AUDIT TRIGGERS FOR BOOKINGS
-- ============================================

CREATE OR REPLACE FUNCTION public.audit_booking_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[];
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Detect changed fields
  v_changed_fields := ARRAY[]::TEXT[];

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed_fields := array_append(v_changed_fields, 'status');
    END IF;
    IF OLD.paid_at IS DISTINCT FROM NEW.paid_at THEN
      v_changed_fields := array_append(v_changed_fields, 'paid_at');
    END IF;
    IF OLD.cancelled_at IS DISTINCT FROM NEW.cancelled_at THEN
      v_changed_fields := array_append(v_changed_fields, 'cancelled_at');
    END IF;
    IF OLD.total_price IS DISTINCT FROM NEW.total_price THEN
      v_changed_fields := array_append(v_changed_fields, 'total_price');
    END IF;

    v_old_values := jsonb_build_object(
      'status', OLD.status,
      'paid_at', OLD.paid_at,
      'cancelled_at', OLD.cancelled_at,
      'total_price', OLD.total_price
    );
    v_new_values := jsonb_build_object(
      'status', NEW.status,
      'paid_at', NEW.paid_at,
      'cancelled_at', NEW.cancelled_at,
      'total_price', NEW.total_price
    );

    -- Only log if something changed
    IF array_length(v_changed_fields, 1) > 0 THEN
      PERFORM public.create_audit_log(
        'booking',
        NEW.id,
        'update',
        NULL,
        'system',
        v_old_values,
        v_new_values,
        v_changed_fields,
        'trigger',
        jsonb_build_object('trigger', 'audit_booking_changes')
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.create_audit_log(
      'booking',
      NEW.id,
      'create',
      NEW.renter_id,
      'user',
      NULL,
      jsonb_build_object(
        'status', NEW.status,
        'total_price', NEW.total_price,
        'renter_id', NEW.renter_id,
        'owner_id', NEW.owner_id,
        'car_id', NEW.car_id
      ),
      NULL,
      'trigger',
      jsonb_build_object('trigger', 'audit_booking_changes')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bookings
DROP TRIGGER IF EXISTS trigger_audit_booking ON public.bookings;
CREATE TRIGGER trigger_audit_booking
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_booking_changes();

-- ============================================
-- 3. DEAD LETTER QUEUE FOR WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.webhook_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original webhook data
  webhook_type TEXT NOT NULL, -- 'mercadopago', 'paypal', 'whatsapp'
  event_id TEXT, -- Original event/request ID
  payload JSONB NOT NULL,
  headers JSONB,

  -- Failure info
  error_message TEXT,
  error_code TEXT,
  failed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Retry tracking
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned', 'manual_review')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status ON public.webhook_dead_letter(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_type ON public.webhook_dead_letter(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_event ON public.webhook_dead_letter(event_id);

-- Enable RLS
ALTER TABLE public.webhook_dead_letter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on webhook_dead_letter"
  ON public.webhook_dead_letter FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to add to dead letter queue
CREATE OR REPLACE FUNCTION public.webhook_to_dlq(
  p_webhook_type TEXT,
  p_event_id TEXT,
  p_payload JSONB,
  p_headers JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Calculate next retry (exponential backoff: 1min, 2min, 4min, 8min, 16min)
  v_next_retry := NOW() + INTERVAL '1 minute';

  INSERT INTO public.webhook_dead_letter (
    webhook_type, event_id, payload, headers,
    error_message, error_code, next_retry_at
  ) VALUES (
    p_webhook_type, p_event_id, p_payload, p_headers,
    p_error_message, p_error_code, v_next_retry
  )
  ON CONFLICT (event_id) WHERE event_id IS NOT NULL
  DO UPDATE SET
    retry_count = webhook_dead_letter.retry_count + 1,
    last_retry_at = NOW(),
    next_retry_at = NOW() + (INTERVAL '1 minute' * POWER(2, webhook_dead_letter.retry_count)),
    error_message = EXCLUDED.error_message,
    status = CASE
      WHEN webhook_dead_letter.retry_count >= webhook_dead_letter.max_retries - 1
      THEN 'abandoned'
      ELSE 'retrying'
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get webhooks ready for retry
CREATE OR REPLACE FUNCTION public.get_webhooks_for_retry(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  webhook_type TEXT,
  event_id TEXT,
  payload JSONB,
  headers JSONB,
  retry_count INT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_dead_letter dlq
  SET
    status = 'retrying',
    last_retry_at = NOW(),
    updated_at = NOW()
  WHERE dlq.id IN (
    SELECT d.id
    FROM public.webhook_dead_letter d
    WHERE d.status IN ('pending', 'retrying')
      AND d.next_retry_at <= NOW()
      AND d.retry_count < d.max_retries
    ORDER BY d.next_retry_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    dlq.id,
    dlq.webhook_type,
    dlq.event_id,
    dlq.payload,
    dlq.headers,
    dlq.retry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark DLQ item as resolved
CREATE OR REPLACE FUNCTION public.resolve_dlq_item(
  p_id UUID,
  p_resolved_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.webhook_dead_letter
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. IDEMPOTENCY KEYS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key identification
  idempotency_key TEXT NOT NULL UNIQUE,
  operation_type TEXT NOT NULL, -- 'payment', 'refund', 'deposit', 'withdrawal'

  -- Request/Response
  request_hash TEXT, -- Hash of request body for validation
  response_status INT,
  response_body JSONB,

  -- Tracking
  user_id UUID REFERENCES auth.users(id),
  entity_id UUID, -- booking_id, transaction_id, etc.

  -- Lifecycle
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON public.idempotency_keys(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_user ON public.idempotency_keys(user_id);

-- Enable RLS
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on idempotency_keys"
  ON public.idempotency_keys FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to check and create idempotency key
CREATE OR REPLACE FUNCTION public.check_idempotency(
  p_key TEXT,
  p_operation_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_request_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  existing_response JSONB,
  existing_status TEXT,
  key_id UUID
) AS $$
DECLARE
  v_existing RECORD;
  v_new_id UUID;
BEGIN
  -- Check for existing key
  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE idempotency_key = p_key
    AND expires_at > NOW()
  FOR UPDATE;

  IF FOUND THEN
    -- Return existing result
    RETURN QUERY SELECT
      true,
      v_existing.response_body,
      v_existing.status,
      v_existing.id;
    RETURN;
  END IF;

  -- Create new key
  INSERT INTO public.idempotency_keys (
    idempotency_key, operation_type, user_id, entity_id, request_hash
  ) VALUES (
    p_key, p_operation_type, p_user_id, p_entity_id, p_request_hash
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT
    false,
    NULL::JSONB,
    'processing'::TEXT,
    v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete idempotency key
CREATE OR REPLACE FUNCTION public.complete_idempotency(
  p_key TEXT,
  p_status TEXT,
  p_response_status INT,
  p_response_body JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.idempotency_keys
  SET
    status = p_status,
    response_status = p_response_status,
    response_body = p_response_body,
    completed_at = NOW()
  WHERE idempotency_key = p_key;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. HEALTH CHECK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL, -- 'database', 'mercadopago', 'supabase_auth', etc.
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  latency_ms INT,
  details JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_component ON public.system_health(component, checked_at DESC);

-- Keep only last 1000 health checks per component
CREATE OR REPLACE FUNCTION public.cleanup_health_checks()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.system_health
  WHERE id IN (
    SELECT id FROM public.system_health
    WHERE component = NEW.component
    ORDER BY checked_at DESC
    OFFSET 1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_health ON public.system_health;
CREATE TRIGGER trigger_cleanup_health
  AFTER INSERT ON public.system_health
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_health_checks();

-- Function to record health check
CREATE OR REPLACE FUNCTION public.record_health_check(
  p_component TEXT,
  p_status TEXT,
  p_latency_ms INT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.system_health (component, status, latency_ms, details)
  VALUES (p_component, p_status, p_latency_ms, p_details)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest health status
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS TABLE (
  component TEXT,
  status TEXT,
  latency_ms INT,
  details JSONB,
  checked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (h.component)
    h.component,
    h.status,
    h.latency_ms,
    h.details,
    h.checked_at
  FROM public.system_health h
  ORDER BY h.component, h.checked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CLEANUP JOBS
-- ============================================

-- Clean up expired idempotency keys (run daily)
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < NOW()
  RETURNING 1 INTO v_deleted;

  RETURN COALESCE(v_deleted, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION public.create_audit_log TO service_role;
GRANT EXECUTE ON FUNCTION public.webhook_to_dlq TO service_role;
GRANT EXECUTE ON FUNCTION public.get_webhooks_for_retry TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_dlq_item TO service_role;
GRANT EXECUTE ON FUNCTION public.check_idempotency TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_idempotency TO service_role;
GRANT EXECUTE ON FUNCTION public.record_health_check TO service_role;
GRANT EXECUTE ON FUNCTION public.get_system_health TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_idempotency_keys TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.audit_log IS 'Audit trail for all financial operations. Immutable log of changes.';
COMMENT ON TABLE public.webhook_dead_letter IS 'Dead letter queue for failed webhook processing. Enables automatic retry with exponential backoff.';
COMMENT ON TABLE public.idempotency_keys IS 'Idempotency key storage for safe request retries. Auto-expires after 24 hours.';
COMMENT ON TABLE public.system_health IS 'Health check results for monitoring and alerting.';
