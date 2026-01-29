-- =============================================
-- BOOKING PAYMENT EVENTS - AUDIT TRAIL
-- Event Sourcing para historial de pagos
-- =============================================

-- Enum para tipos de eventos de pago
DO $$ BEGIN
  CREATE TYPE payment_event_type AS ENUM (
    -- Lifecycle events
    'payment_initiated',
    'payment_processing',
    'payment_approved',
    'payment_rejected',
    'payment_failed',
    'payment_cancelled',

    -- Hold/Authorization events
    'hold_created',
    'hold_captured',
    'hold_released',
    'hold_expired',
    'hold_reauthorized',

    -- Refund events
    'refund_initiated',
    'refund_processing',
    'refund_completed',
    'refund_failed',
    'partial_refund_completed',

    -- Split payment events
    'split_initiated',
    'split_owner_payment',
    'split_platform_fee',
    'split_completed',

    -- Wallet events
    'wallet_lock_created',
    'wallet_lock_released',
    'wallet_funds_transferred',

    -- Dispute events
    'dispute_opened',
    'dispute_evidence_submitted',
    'dispute_resolved',

    -- System events
    'webhook_received',
    'status_sync',
    'manual_intervention'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabla principal de eventos de pago
CREATE TABLE IF NOT EXISTS booking_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Evento
  event_type payment_event_type NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Estado antes/después (para debugging)
  previous_status TEXT,
  new_status TEXT,

  -- Proveedor de pago
  payment_provider TEXT, -- 'mercadopago', 'paypal', 'wallet', etc.
  provider_transaction_id TEXT, -- ID externo del proveedor
  provider_response JSONB, -- Respuesta raw del proveedor (sanitizada)

  -- Montos involucrados
  amount_cents BIGINT,
  currency TEXT DEFAULT 'USD',

  -- Actor
  actor_id UUID, -- Usuario que disparó el evento (null si es sistema)
  actor_type TEXT DEFAULT 'system', -- 'renter', 'owner', 'admin', 'system', 'webhook'

  -- Metadatos
  ip_address INET,
  user_agent TEXT,
  idempotency_key TEXT,
  correlation_id TEXT, -- Para trazar requests relacionados

  -- Error info (si aplica)
  error_code TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ, -- Cuando se completó el procesamiento

  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_cents IS NULL OR amount_cents >= 0)
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_payment_events_booking
  ON booking_payment_events(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_type
  ON booking_payment_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_tx
  ON booking_payment_events(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_correlation
  ON booking_payment_events(correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_created
  ON booking_payment_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_actor
  ON booking_payment_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- RLS Policies
ALTER TABLE booking_payment_events ENABLE ROW LEVEL SECURITY;

-- Solo admins y service_role pueden leer eventos de pago
CREATE POLICY "Admin and service can read payment events"
  ON booking_payment_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
    OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Solo service_role puede insertar (desde Edge Functions)
CREATE POLICY "Service role can insert payment events"
  ON booking_payment_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Nadie puede update/delete (inmutabilidad)
-- No policies for UPDATE/DELETE = denied by default

-- =============================================
-- FUNCIONES HELPER
-- =============================================

-- Función para registrar un evento de pago
CREATE OR REPLACE FUNCTION log_payment_event(
  p_booking_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_payment_provider TEXT DEFAULT NULL,
  p_provider_transaction_id TEXT DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL,
  p_amount_cents BIGINT DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD',
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_previous_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_event_type_enum payment_event_type;
BEGIN
  -- Cast string to enum
  v_event_type_enum := p_event_type::payment_event_type;

  -- Insert event
  INSERT INTO booking_payment_events (
    booking_id,
    event_type,
    event_data,
    previous_status,
    new_status,
    payment_provider,
    provider_transaction_id,
    provider_response,
    amount_cents,
    currency,
    actor_id,
    actor_type,
    error_code,
    error_message,
    correlation_id,
    idempotency_key,
    processed_at
  ) VALUES (
    p_booking_id,
    v_event_type_enum,
    p_event_data,
    p_previous_status,
    p_new_status,
    p_payment_provider,
    p_provider_transaction_id,
    p_provider_response,
    p_amount_cents,
    p_currency,
    p_actor_id,
    p_actor_type,
    p_error_code,
    p_error_message,
    p_correlation_id,
    p_idempotency_key,
    NOW()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Función para obtener historial de pagos de una reserva
CREATE OR REPLACE FUNCTION get_booking_payment_history(p_booking_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_data JSONB,
  previous_status TEXT,
  new_status TEXT,
  payment_provider TEXT,
  provider_transaction_id TEXT,
  amount_cents BIGINT,
  currency TEXT,
  actor_type TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id AS event_id,
    event_type::TEXT,
    event_data,
    previous_status,
    new_status,
    payment_provider,
    provider_transaction_id,
    amount_cents,
    currency,
    actor_type,
    error_code,
    error_message,
    created_at
  FROM booking_payment_events
  WHERE booking_id = p_booking_id
  ORDER BY created_at ASC;
$$;

-- Función para obtener resumen de eventos por tipo
CREATE OR REPLACE FUNCTION get_payment_events_summary(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  total_amount_cents BIGINT,
  avg_processing_time_ms NUMERIC,
  error_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    event_type::TEXT,
    COUNT(*) AS event_count,
    SUM(amount_cents) AS total_amount_cents,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000) AS avg_processing_time_ms,
    COUNT(*) FILTER (WHERE error_code IS NOT NULL) AS error_count
  FROM booking_payment_events
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY event_type
  ORDER BY event_count DESC;
$$;

-- Grant permisos
GRANT EXECUTE ON FUNCTION log_payment_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_events_summary TO authenticated;

-- =============================================
-- COMENTARIOS
-- =============================================
COMMENT ON TABLE booking_payment_events IS
  'Event sourcing table for payment audit trail. Immutable log of all payment-related events.';

COMMENT ON FUNCTION log_payment_event IS
  'Records a payment event. Called from Edge Functions during payment processing.';

COMMENT ON FUNCTION get_booking_payment_history IS
  'Returns chronological payment history for a booking. Admin/service only.';

COMMENT ON FUNCTION get_payment_events_summary IS
  'Returns aggregated statistics of payment events. For admin dashboards.';
