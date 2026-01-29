-- Migration: Add Payment Splits Tracking Tables
-- Descripción: Crea tablas para tracking de splits de MercadoPago Marketplace
-- Fecha: 2025-10-28
-- Relacionado: Fase 2 - Split Payment Implementation

-- ========================================
-- 1. Tabla payment_splits
-- ========================================

-- Tracking de splits de pagos marketplace
CREATE TABLE IF NOT EXISTS payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id VARCHAR(255) NOT NULL,

  -- Montos (en la moneda del pago, típicamente ARS)
  total_amount_cents INTEGER NOT NULL, -- Total del pago en centavos
  owner_amount_cents INTEGER NOT NULL, -- Monto para el dueño en centavos
  platform_fee_cents INTEGER NOT NULL, -- Fee de la plataforma en centavos
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',

  -- IDs de MercadoPago
  collector_id VARCHAR(255) NOT NULL, -- Collector ID del dueño del auto
  marketplace_id VARCHAR(255), -- Marketplace ID de la aplicación

  -- Estado del split
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Split creado pero no validado
    'validated',    -- Split validado correctamente
    'transferred',  -- Transferencia completada
    'failed',       -- Falló la validación
    'disputed'      -- En disputa
  )),

  -- Timestamps
  validated_at TIMESTAMPTZ, -- Cuándo se validó el split
  transferred_at TIMESTAMPTZ, -- Cuándo se transfirió el dinero
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata adicional (opcional)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para payment_splits
CREATE INDEX idx_payment_splits_booking ON payment_splits(booking_id);
CREATE INDEX idx_payment_splits_payment ON payment_splits(payment_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(status);
CREATE INDEX idx_payment_splits_collector ON payment_splits(collector_id);
CREATE INDEX idx_payment_splits_created_at ON payment_splits(created_at DESC);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX idx_payment_splits_payment_booking
ON payment_splits(payment_id, booking_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payment_splits_updated_at
BEFORE UPDATE ON payment_splits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios de documentación
COMMENT ON TABLE payment_splits IS 'Tracking de splits de pagos marketplace de MercadoPago';
COMMENT ON COLUMN payment_splits.total_amount_cents IS 'Monto total del pago en centavos';
COMMENT ON COLUMN payment_splits.owner_amount_cents IS 'Monto para el dueño del auto en centavos';
COMMENT ON COLUMN payment_splits.platform_fee_cents IS 'Fee de la plataforma en centavos';
COMMENT ON COLUMN payment_splits.collector_id IS 'Collector ID del dueño del auto en MercadoPago';
COMMENT ON COLUMN payment_splits.marketplace_id IS 'Marketplace ID de AutoRenta en MercadoPago';

-- ========================================
-- 2. Tabla payment_issues
-- ========================================

-- Registro de problemas con pagos y splits
CREATE TABLE IF NOT EXISTS payment_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id VARCHAR(255), -- Puede ser NULL si el issue es antes de crear el pago

  -- Tipo y detalles del issue
  issue_type VARCHAR(100) NOT NULL CHECK (issue_type IN (
    'split_collector_mismatch',  -- Collector ID no coincide
    'split_amount_mismatch',     -- Montos no coinciden
    'marketplace_not_configured', -- Marketplace no configurado
    'payment_failed',            -- Pago falló en MercadoPago
    'webhook_signature_invalid', -- Webhook con firma inválida
    'refund_requested',          -- Reembolso solicitado
    'chargeback',                -- Contracargo
    'other'                      -- Otros problemas
  )),
  details JSONB, -- Detalles específicos del problema (JSON)

  -- Estado de resolución
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT, -- Notas sobre cómo se resolvió

  -- Priority y severity
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1 = más alta

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para payment_issues
CREATE INDEX idx_payment_issues_booking ON payment_issues(booking_id);
CREATE INDEX idx_payment_issues_payment ON payment_issues(payment_id);
CREATE INDEX idx_payment_issues_type ON payment_issues(issue_type);
CREATE INDEX idx_payment_issues_severity ON payment_issues(severity);
CREATE INDEX idx_payment_issues_created_at ON payment_issues(created_at DESC);

-- Índice para buscar issues sin resolver rápidamente
CREATE INDEX idx_payment_issues_unresolved
ON payment_issues(booking_id, created_at DESC)
WHERE resolved = FALSE;

-- Índice compuesto para dashboard de admin
CREATE INDEX idx_payment_issues_admin_dashboard
ON payment_issues(resolved, severity, priority, created_at DESC);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payment_issues_updated_at
BEFORE UPDATE ON payment_issues
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios de documentación
COMMENT ON TABLE payment_issues IS 'Registro de problemas con pagos y splits para revisión manual';
COMMENT ON COLUMN payment_issues.issue_type IS 'Tipo de problema detectado (split_collector_mismatch, split_amount_mismatch, etc.)';
COMMENT ON COLUMN payment_issues.details IS 'Detalles específicos del problema en formato JSON';
COMMENT ON COLUMN payment_issues.severity IS 'Severidad del issue: low, medium, high, critical';
COMMENT ON COLUMN payment_issues.priority IS 'Prioridad (1-5, siendo 1 la más alta)';

-- ========================================
-- 3. Agregar columnas a bookings
-- ========================================

-- Agregar tracking de splits a bookings (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_split_completed'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_split_completed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_split_validated_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_split_validated_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'owner_payment_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN owner_payment_amount DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE bookings ADD COLUMN platform_fee DECIMAL(10,2);
  END IF;
END $$;

-- Comentarios para nuevas columnas
COMMENT ON COLUMN bookings.payment_split_completed IS 'Indica si el split de pago fue procesado';
COMMENT ON COLUMN bookings.payment_split_validated_at IS 'Timestamp de cuándo se validó el split';
COMMENT ON COLUMN bookings.owner_payment_amount IS 'Monto pagado al dueño del auto (ARS)';
COMMENT ON COLUMN bookings.platform_fee IS 'Fee cobrado por la plataforma (ARS)';

-- ========================================
-- 4. RPC Function: register_payment_split
-- ========================================

-- Función para registrar un split desde el webhook
CREATE OR REPLACE FUNCTION register_payment_split(
  p_booking_id UUID,
  p_mp_payment_id VARCHAR(255),
  p_total_amount_cents INTEGER,
  p_currency VARCHAR(10) DEFAULT 'ARS'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_booking RECORD;
  v_owner_amount_cents INTEGER;
  v_platform_fee_cents INTEGER;
  v_collector_id VARCHAR(255);
BEGIN
  -- Obtener información del booking
  SELECT b.*, p.mercadopago_collector_id
  INTO v_booking
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  JOIN profiles p ON c.owner_id = p.id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Calcular split (10% plataforma, 90% dueño)
  v_platform_fee_cents := FLOOR(p_total_amount_cents * 0.10);
  v_owner_amount_cents := p_total_amount_cents - v_platform_fee_cents;
  v_collector_id := v_booking.mercadopago_collector_id;

  -- Verificar si ya existe el split (idempotencia)
  SELECT id INTO v_split_id
  FROM payment_splits
  WHERE payment_id = p_mp_payment_id AND booking_id = p_booking_id;

  IF FOUND THEN
    -- Ya existe, actualizar
    UPDATE payment_splits
    SET
      total_amount_cents = p_total_amount_cents,
      owner_amount_cents = v_owner_amount_cents,
      platform_fee_cents = v_platform_fee_cents,
      currency = p_currency,
      updated_at = NOW()
    WHERE id = v_split_id;

    RETURN v_split_id;
  END IF;

  -- Crear nuevo registro de split
  INSERT INTO payment_splits (
    booking_id,
    payment_id,
    total_amount_cents,
    owner_amount_cents,
    platform_fee_cents,
    currency,
    collector_id,
    marketplace_id,
    status,
    validated_at
  )
  VALUES (
    p_booking_id,
    p_mp_payment_id,
    p_total_amount_cents,
    v_owner_amount_cents,
    v_platform_fee_cents,
    p_currency,
    v_collector_id,
    current_setting('app.mercadopago_marketplace_id', true), -- Desde env
    'validated', -- Se marca como validado inmediatamente
    NOW()
  )
  RETURNING id INTO v_split_id;

  RETURN v_split_id;
END;
$$;

-- Comentario de documentación
COMMENT ON FUNCTION register_payment_split IS 'Registra un split de pago marketplace desde el webhook de MercadoPago';

-- ========================================
-- 5. RLS Policies
-- ========================================

-- payment_splits: Solo admins y service role
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role puede todo (para webhooks)
CREATE POLICY "Service role full access on payment_splits"
ON payment_splits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Admins pueden ver todos los splits
CREATE POLICY "Admins can view all splits"
ON payment_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Dueños de autos pueden ver sus splits
CREATE POLICY "Car owners can view their splits"
ON payment_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN cars c ON b.car_id = c.id
    WHERE b.id = payment_splits.booking_id
    AND c.owner_id = auth.uid()
  )
);

-- payment_issues: Solo admins y service role
ALTER TABLE payment_issues ENABLE ROW LEVEL SECURITY;

-- Policy: Service role puede todo (para webhooks)
CREATE POLICY "Service role full access on payment_issues"
ON payment_issues
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Admins pueden ver todos los issues
CREATE POLICY "Admins can view all issues"
ON payment_issues
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins pueden actualizar issues (resolver)
CREATE POLICY "Admins can update issues"
ON payment_issues
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ========================================
-- 6. Grants
-- ========================================

-- Grant permissions to authenticated users
GRANT SELECT ON payment_splits TO authenticated;
GRANT SELECT ON payment_issues TO authenticated;

-- Grant all permissions to service_role (for webhooks and RPC functions)
GRANT ALL ON payment_splits TO service_role;
GRANT ALL ON payment_issues TO service_role;

-- ========================================
-- 7. Migration complete
-- ========================================

-- Insert migration record (if using custom migration tracking)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
    INSERT INTO schema_migrations (version, name)
    VALUES ('20251028', 'add_payment_splits_tracking')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
