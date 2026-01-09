SET search_path = public, auth, extensions;
-- ============================================================================
-- BOOKING SYSTEM P0 FIXES - DATA CLEANUP
-- ============================================================================
-- Migration Date: 2025-01-25
-- Purpose: Clean up invalid data from booking system issues
-- ============================================================================

-- ============================================================================
-- 1. FIX INVALID BOOKING STATUSES
-- ============================================================================

-- Note: This section attempts to fix invalid booking statuses.
-- If 'pending_confirmation' is not a valid enum value, this section is skipped.
-- This is safe because it means there are no bookings with that invalid status.
DO $$
DECLARE
  enum_value_exists BOOLEAN;
BEGIN
  -- Check if 'pending_confirmation' exists in the booking_status enum
  SELECT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'pending_confirmation' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
  ) INTO enum_value_exists;
  
  IF enum_value_exists THEN
    -- Update bookings with invalid status 'pending_confirmation' to 'pending'
    UPDATE bookings 
    SET status = 'pending' 
    WHERE status = 'pending_confirmation';
    
    IF FOUND THEN
      RAISE NOTICE '✅ Updated bookings with invalid status pending_confirmation';
    ELSE
      RAISE NOTICE '✅ No bookings with pending_confirmation status found';
    END IF;
  ELSE
    RAISE NOTICE '✅ Skipping pending_confirmation update (value not in enum, no invalid data)';
  END IF;
END;
$$;

-- Report results
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM bookings
  WHERE status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired');

  IF invalid_count > 0 THEN
    RAISE WARNING '⚠️  Found % bookings with invalid status', invalid_count;
  ELSE
    RAISE NOTICE '✅ All booking statuses are valid';
  END IF;
END;
$$;

-- ============================================================================
-- 2. CLEAN ORPHANED RISK SNAPSHOTS
-- ============================================================================

-- Delete risk snapshots that reference non-existent bookings (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    DELETE FROM booking_risk_snapshot
    WHERE booking_id NOT IN (SELECT id FROM bookings);

    RAISE NOTICE '✅ Cleaned orphaned risk snapshots';
  ELSE
    RAISE NOTICE 'ℹ️  Skipping orphaned snapshots cleanup: table does not exist';
  END IF;
END;
$$;

-- Report results
DO $$
DECLARE
  orphaned_count INTEGER;
  total_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    SELECT COUNT(*) INTO total_count FROM booking_risk_snapshot;

    SELECT COUNT(*) INTO orphaned_count
    FROM booking_risk_snapshot brs
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = brs.booking_id);

    IF orphaned_count > 0 THEN
      RAISE WARNING '⚠️  Found % orphaned risk snapshots (total: %)', orphaned_count, total_count;
    ELSE
      RAISE NOTICE '✅ No orphaned risk snapshots (total: %)', total_count;
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping snapshot report: table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 3. ADD MISSING COLUMNS TO BOOKINGS (IF NOT EXISTS)
-- ============================================================================

-- Ensure risk_snapshot_id column exists and has proper FK
DO $$
BEGIN
  -- Check if booking_risk_snapshot table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    -- Only add column if table exists and has booking_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'risk_snapshot_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'booking_risk_snapshot' AND column_name = 'booking_id'
    ) THEN
      ALTER TABLE bookings
        ADD COLUMN risk_snapshot_id UUID REFERENCES booking_risk_snapshot(booking_id);

      CREATE INDEX IF NOT EXISTS idx_bookings_risk_snapshot_id
        ON bookings(risk_snapshot_id)
        WHERE risk_snapshot_id IS NOT NULL;

      RAISE NOTICE '✅ Added risk_snapshot_id column to bookings';
    ELSE
      RAISE NOTICE '✅ risk_snapshot_id column already exists';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping risk_snapshot_id: booking_risk_snapshot table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 4. VALIDATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Check for bookings referencing non-existent risk snapshots
DO $$
DECLARE
  invalid_refs INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'risk_snapshot_id'
  ) THEN
    SELECT COUNT(*) INTO invalid_refs
    FROM bookings b
    WHERE b.risk_snapshot_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM booking_risk_snapshot brs WHERE brs.booking_id = b.risk_snapshot_id);

    IF invalid_refs > 0 THEN
      RAISE WARNING '⚠️  Found % bookings with invalid risk_snapshot_id references', invalid_refs;

      -- Optionally null out invalid references
      -- UPDATE bookings SET risk_snapshot_id = NULL
      -- WHERE risk_snapshot_id IS NOT NULL
      --   AND NOT EXISTS (SELECT 1 FROM booking_risk_snapshot WHERE booking_id = bookings.risk_snapshot_id);
    ELSE
      RAISE NOTICE '✅ All risk_snapshot_id references are valid';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping FK validation: booking_risk_snapshot table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Summary of booking statuses
DO $$
DECLARE
  pending_count INTEGER;
  confirmed_count INTEGER;
  active_count INTEGER;
  completed_count INTEGER;
  cancelled_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'pending') INTO pending_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'confirmed') INTO confirmed_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'in_progress') INTO active_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'completed') INTO completed_count FROM bookings;
  SELECT COUNT(*) FILTER (WHERE status = 'cancelled') INTO cancelled_count FROM bookings;
  SELECT COUNT(*) INTO total_count FROM bookings;

  RAISE NOTICE '📊 Booking Status Summary:';
  RAISE NOTICE '   Pending: %', pending_count;
  RAISE NOTICE '   Confirmed: %', confirmed_count;
  RAISE NOTICE '   In Progress: %', active_count;
  RAISE NOTICE '   Completed: %', completed_count;
  RAISE NOTICE '   Cancelled: %', cancelled_count;
  RAISE NOTICE '   TOTAL: %', total_count;
END;
$$;

-- Summary of risk snapshots
DO $$
DECLARE
  snapshot_count INTEGER;
  linked_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) THEN
    SELECT COUNT(*) INTO snapshot_count FROM booking_risk_snapshot;
    SELECT COUNT(*) INTO linked_count FROM bookings WHERE risk_snapshot_id IS NOT NULL;

    RAISE NOTICE '📊 Risk Snapshot Summary:';
    RAISE NOTICE '   Total snapshots: %', snapshot_count;
    RAISE NOTICE '   Linked bookings: %', linked_count;
  ELSE
    RAISE NOTICE 'ℹ️  Skipping snapshot summary: table does not exist';
  END IF;
END;
$$;

-- ============================================================================
-- 6. FINAL VALIDATION
-- ============================================================================

DO $$
DECLARE
  errors INTEGER := 0;
  table_exists BOOLEAN;
BEGIN
  -- Check if booking_risk_snapshot table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'booking_risk_snapshot'
  ) INTO table_exists;

  -- Check 1: No invalid statuses
  SELECT COUNT(*) INTO errors
  FROM bookings
  WHERE status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired');

  IF errors > 0 THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: % bookings with invalid status', errors;
  END IF;

  -- Check 2: No orphaned snapshots (only if table exists)
  IF table_exists THEN
    SELECT COUNT(*) INTO errors
    FROM booking_risk_snapshot brs
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = brs.booking_id);

    IF errors > 0 THEN
      RAISE EXCEPTION '❌ VALIDATION FAILED: % orphaned risk snapshots', errors;
    END IF;
  END IF;

  -- Check 3: No invalid risk_snapshot_id references (only if table exists)
  IF table_exists THEN
    SELECT COUNT(*) INTO errors
    FROM bookings b
    WHERE b.risk_snapshot_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM booking_risk_snapshot brs WHERE brs.booking_id = b.risk_snapshot_id);

    IF errors > 0 THEN
      RAISE EXCEPTION '❌ VALIDATION FAILED: % invalid risk_snapshot_id references', errors;
    END IF;
  END IF;

  RAISE NOTICE '✅ ALL VALIDATIONS PASSED';
  RAISE NOTICE '✅ P0 fixes migration completed successfully';
END;
$$;
-- ============================================================================
-- MERCADO PAGO MARKETPLACE - SPLIT PAYMENTS
-- ============================================================================
-- Migración para soportar split payments de Mercado Pago
-- Fecha: 2025-01-26
-- Versión: 1.0
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNAS A USERS PARA MARKETPLACE
-- ============================================================================

-- Columnas para propietarios (sellers)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mercadopago_collector_id TEXT,
ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mp_onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mp_access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS mp_refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS mp_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_mp_collector ON users(mercadopago_collector_id) 
WHERE mercadopago_collector_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_marketplace_approved ON users(marketplace_approved) 
WHERE marketplace_approved = true;

COMMENT ON COLUMN users.mercadopago_collector_id IS 'ID de vendedor en Mercado Pago (recibe pagos split)';
COMMENT ON COLUMN users.marketplace_approved IS 'Si el usuario completó onboarding de MP marketplace';
COMMENT ON COLUMN users.mp_onboarding_completed_at IS 'Timestamp de cuando completó onboarding';
COMMENT ON COLUMN users.mp_access_token_encrypted IS 'Access token de MP encriptado (para API calls)';
COMMENT ON COLUMN users.mp_refresh_token_encrypted IS 'Refresh token de MP encriptado';
COMMENT ON COLUMN users.mp_token_expires_at IS 'Expiración del access token';

-- ============================================================================
-- 2. TABLA DE ESTADOS DE ONBOARDING (OAuth flow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mp_onboarding_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT, -- Para PKCE (opcional)
  redirect_uri TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_mp_onboarding_user ON mp_onboarding_states(user_id);
CREATE INDEX idx_mp_onboarding_state ON mp_onboarding_states(state);
CREATE INDEX idx_mp_onboarding_expires ON mp_onboarding_states(expires_at) 
WHERE completed = false;

COMMENT ON TABLE mp_onboarding_states IS 'Estados temporales para OAuth flow de Mercado Pago';

-- ============================================================================
-- 3. AGREGAR COLUMNAS A BOOKINGS PARA SPLIT TRACKING
-- ============================================================================

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_split_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS mp_split_payment_id TEXT,
ADD COLUMN IF NOT EXISTS mp_collector_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_split_completed ON bookings(payment_split_completed);
CREATE INDEX IF NOT EXISTS idx_bookings_mp_split_payment ON bookings(mp_split_payment_id) 
WHERE mp_split_payment_id IS NOT NULL;

COMMENT ON COLUMN bookings.payment_split_completed IS 'Si el split payment fue completado en MP';
COMMENT ON COLUMN bookings.owner_payment_amount IS 'Monto que recibió el propietario (sin comisión)';
COMMENT ON COLUMN bookings.platform_fee IS 'Comisión de Autorentar';
COMMENT ON COLUMN bookings.mp_split_payment_id IS 'ID del payment en Mercado Pago';
COMMENT ON COLUMN bookings.mp_collector_id IS 'Collector ID del propietario al momento del pago';

-- ============================================================================
-- 4. TABLA DE PAYMENT SPLITS (auditoría y tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL,
  mercadopago_payment_id TEXT,
  
  -- Montos
  total_amount DECIMAL(10,2) NOT NULL,
  owner_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  
  -- IDs de las partes
  owner_id UUID NOT NULL REFERENCES users(id),
  owner_collector_id TEXT NOT NULL,
  renter_id UUID NOT NULL REFERENCES users(id),
  
  -- Estado del split
  split_status TEXT NOT NULL DEFAULT 'pending',
  -- Valores: pending, processing, completed, failed, refunded
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata adicional
  currency TEXT DEFAULT 'ARS',
  payment_method TEXT,
  error_message TEXT,
  webhook_data JSONB,
  
  -- Constraints
  CONSTRAINT valid_split_status CHECK (
    split_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),
  CONSTRAINT valid_amounts CHECK (
    total_amount = owner_amount + platform_fee
    AND total_amount > 0
    AND owner_amount > 0
    AND platform_fee >= 0
  )
);

-- Índices para performance
CREATE INDEX idx_payment_splits_booking ON payment_splits(booking_id);
CREATE INDEX idx_payment_splits_payment ON payment_splits(payment_id);
CREATE INDEX idx_payment_splits_mp_payment ON payment_splits(mercadopago_payment_id) 
WHERE mercadopago_payment_id IS NOT NULL;
CREATE INDEX idx_payment_splits_owner ON payment_splits(owner_id);
CREATE INDEX idx_payment_splits_renter ON payment_splits(renter_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(split_status);
CREATE INDEX idx_payment_splits_created ON payment_splits(created_at DESC);

COMMENT ON TABLE payment_splits IS 'Registro de todos los split payments de Mercado Pago';
COMMENT ON COLUMN payment_splits.split_status IS 'pending|processing|completed|failed|refunded';

-- ============================================================================
-- 5. TABLA DE LOGS DE WEBHOOKS (debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  payment_id TEXT,
  booking_id UUID REFERENCES bookings(id),
  split_id UUID REFERENCES payment_splits(id),
  
  -- Payload completo
  payload JSONB NOT NULL,
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  
  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- HTTP info
  user_agent TEXT,
  ip_address INET
);

CREATE INDEX idx_mp_webhook_type ON mp_webhook_logs(webhook_type);
CREATE INDEX idx_mp_webhook_payment ON mp_webhook_logs(payment_id) 
WHERE payment_id IS NOT NULL;
CREATE INDEX idx_mp_webhook_processed ON mp_webhook_logs(processed);
CREATE INDEX idx_mp_webhook_received ON mp_webhook_logs(received_at DESC);

COMMENT ON TABLE mp_webhook_logs IS 'Logs de todos los webhooks de Mercado Pago para debugging';

-- ============================================================================
-- 6. FUNCIÓN: Obtener propietarios aptos para marketplace
-- ============================================================================

CREATE OR REPLACE FUNCTION get_marketplace_approved_owners()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  collector_id TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  total_bookings BIGINT,
  total_earnings DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    u.mercadopago_collector_id,
    u.mp_onboarding_completed_at,
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(SUM(b.owner_payment_amount), 0) as total_earnings
  FROM users u
  LEFT JOIN bookings b ON b.owner_id = u.id 
    AND b.payment_split_completed = true
  WHERE u.marketplace_approved = true
    AND u.mercadopago_collector_id IS NOT NULL
  GROUP BY u.id, u.full_name, u.email, u.mercadopago_collector_id, u.mp_onboarding_completed_at
  ORDER BY u.mp_onboarding_completed_at DESC;
END;
$$;

COMMENT ON FUNCTION get_marketplace_approved_owners IS 'Lista propietarios aprobados en marketplace con stats';

-- ============================================================================
-- 7. FUNCIÓN: Calcular split de pago
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payment_split(
  p_total_amount DECIMAL,
  p_platform_fee_percent DECIMAL DEFAULT 0.15
)
RETURNS TABLE (
  total_amount DECIMAL,
  owner_amount DECIMAL,
  platform_fee DECIMAL,
  platform_fee_percent DECIMAL
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_platform_fee DECIMAL;
  v_owner_amount DECIMAL;
BEGIN
  -- Validaciones
  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be positive';
  END IF;
  
  IF p_platform_fee_percent < 0 OR p_platform_fee_percent > 1 THEN
    RAISE EXCEPTION 'Platform fee percent must be between 0 and 1';
  END IF;
  
  -- Calcular split
  v_platform_fee := ROUND(p_total_amount * p_platform_fee_percent, 2);
  v_owner_amount := p_total_amount - v_platform_fee;
  
  -- Retornar
  RETURN QUERY SELECT 
    p_total_amount,
    v_owner_amount,
    v_platform_fee,
    p_platform_fee_percent;
END;
$$;

COMMENT ON FUNCTION calculate_payment_split IS 'Calcula la división de pago entre owner y plataforma';

-- Ejemplo de uso:
-- SELECT * FROM calculate_payment_split(100000, 0.15);
-- total_amount | owner_amount | platform_fee | platform_fee_percent 
-- 100000       | 85000        | 15000        | 0.15

-- ============================================================================
-- 8. FUNCIÓN: Registrar split payment
-- ============================================================================

CREATE OR REPLACE FUNCTION register_payment_split(
  p_booking_id UUID,
  p_payment_id TEXT,
  p_total_amount DECIMAL,
  p_owner_amount DECIMAL,
  p_platform_fee DECIMAL,
  p_owner_collector_id TEXT,
  p_mercadopago_payment_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_owner_id UUID;
  v_renter_id UUID;
  v_currency TEXT;
BEGIN
  -- Obtener datos del booking
  SELECT owner_id, renter_id, currency 
  INTO v_owner_id, v_renter_id, v_currency
  FROM bookings 
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;
  
  -- Validar montos
  IF p_total_amount != (p_owner_amount + p_platform_fee) THEN
    RAISE EXCEPTION 'Split amounts do not match total';
  END IF;
  
  -- Insertar split record
  INSERT INTO payment_splits (
    booking_id,
    payment_id,
    mercadopago_payment_id,
    total_amount,
    owner_amount,
    platform_fee,
    owner_id,
    owner_collector_id,
    renter_id,
    currency,
    split_status
  ) VALUES (
    p_booking_id,
    p_payment_id,
    p_mercadopago_payment_id,
    p_total_amount,
    p_owner_amount,
    p_platform_fee,
    v_owner_id,
    p_owner_collector_id,
    v_renter_id,
    v_currency,
    'pending'
  )
  RETURNING id INTO v_split_id;
  
  RETURN v_split_id;
END;
$$;

COMMENT ON FUNCTION register_payment_split IS 'Registra un split payment en la BD';

-- ============================================================================
-- 9. FUNCIÓN: Completar split payment
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_payment_split(
  p_split_id UUID,
  p_mercadopago_payment_id TEXT,
  p_webhook_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_owner_amount DECIMAL;
  v_platform_fee DECIMAL;
BEGIN
  -- Obtener datos del split
  SELECT booking_id, owner_amount, platform_fee
  INTO v_booking_id, v_owner_amount, v_platform_fee
  FROM payment_splits
  WHERE id = p_split_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split not found: %', p_split_id;
  END IF;
  
  -- Actualizar split
  UPDATE payment_splits
  SET 
    split_status = 'completed',
    completed_at = now(),
    mercadopago_payment_id = p_mercadopago_payment_id,
    webhook_data = p_webhook_data
  WHERE id = p_split_id;
  
  -- Actualizar booking
  UPDATE bookings
  SET 
    payment_split_completed = true,
    owner_payment_amount = v_owner_amount,
    platform_fee = v_platform_fee,
    mp_split_payment_id = p_mercadopago_payment_id,
    status = CASE 
      WHEN status = 'pending_payment' THEN 'confirmed'::booking_status
      ELSE status 
    END,
    payment_status = 'paid',
    paid_at = COALESCE(paid_at, now())
  WHERE id = v_booking_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION complete_payment_split IS 'Marca un split como completado y actualiza booking';

-- ============================================================================
-- 10. TRIGGER: Limpiar estados expirados de onboarding
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_onboarding_states()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM mp_onboarding_states
  WHERE expires_at < now() - INTERVAL '1 day'
    AND completed = false;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_onboarding ON mp_onboarding_states;

CREATE TRIGGER trigger_cleanup_onboarding
  AFTER INSERT ON mp_onboarding_states
  EXECUTE FUNCTION cleanup_expired_onboarding_states();

-- ============================================================================
-- 11. RLS (Row Level Security) POLICIES
-- ============================================================================

-- mp_onboarding_states: Solo el usuario puede ver sus propios estados
ALTER TABLE mp_onboarding_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding states" ON mp_onboarding_states;
CREATE POLICY "Users can view own onboarding states" 
  ON mp_onboarding_states FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding states" ON mp_onboarding_states;
CREATE POLICY "Users can insert own onboarding states" 
  ON mp_onboarding_states FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- payment_splits: Propietario y conductor pueden ver sus splits
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own splits" ON payment_splits;
CREATE POLICY "Users can view own splits" 
  ON payment_splits FOR SELECT 
  USING (
    auth.uid() = owner_id 
    OR auth.uid() = renter_id
  );

-- mp_webhook_logs: Solo admins pueden ver
ALTER TABLE mp_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook logs" ON mp_webhook_logs;
CREATE POLICY "Admins can view webhook logs" 
  ON mp_webhook_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- 12. VIEWS ÚTILES
-- ============================================================================

-- Vista: Estadísticas de marketplace por propietario
CREATE OR REPLACE VIEW marketplace_owner_stats AS
SELECT 
  u.id as owner_id,
  u.full_name,
  u.email,
  u.mercadopago_collector_id,
  u.marketplace_approved,
  u.mp_onboarding_completed_at,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.payment_split_completed THEN b.id END) as paid_bookings,
  COALESCE(SUM(b.owner_payment_amount), 0) as total_earned,
  COALESCE(SUM(b.platform_fee), 0) as total_platform_fees,
  MAX(b.paid_at) as last_payment_at
FROM users u
LEFT JOIN bookings b ON b.owner_id = u.id
WHERE u.marketplace_approved = true
GROUP BY u.id, u.full_name, u.email, u.mercadopago_collector_id, 
         u.marketplace_approved, u.mp_onboarding_completed_at;

COMMENT ON VIEW marketplace_owner_stats IS 'Estadísticas de earnings por propietario marketplace';

-- Vista: Split payments recientes
CREATE OR REPLACE VIEW recent_payment_splits AS
SELECT 
  ps.id,
  ps.booking_id,
  ps.payment_id,
  ps.total_amount,
  ps.owner_amount,
  ps.platform_fee,
  ps.split_status,
  ps.created_at,
  ps.completed_at,
  b.car_title,
  owner.full_name as owner_name,
  renter.full_name as renter_name
FROM payment_splits ps
JOIN bookings b ON b.id = ps.booking_id
JOIN users owner ON owner.id = ps.owner_id
JOIN users renter ON renter.id = ps.renter_id
ORDER BY ps.created_at DESC
LIMIT 100;

COMMENT ON VIEW recent_payment_splits IS 'Últimos 100 split payments con info de booking';

-- ============================================================================
-- 13. DATOS DE EJEMPLO (OPCIONAL - Solo para testing)
-- ============================================================================

-- NOTA: Comentado por defecto, descomentar solo en dev/staging

-- INSERT INTO mp_onboarding_states (user_id, state, expires_at)
-- VALUES (
--   (SELECT id FROM users LIMIT 1),
--   'test_state_' || gen_random_uuid(),
--   now() + INTERVAL '10 minutes'
-- );

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración Mercado Pago Marketplace completada exitosamente';
  RAISE NOTICE 'Tablas creadas: mp_onboarding_states, payment_splits, mp_webhook_logs';
  RAISE NOTICE 'Funciones creadas: 4';
  RAISE NOTICE 'Views creadas: 2';
  RAISE NOTICE 'RLS policies: Configuradas';
END $$;




-- ============================================================================
-- Add Advanced Car Publishing Fields
-- Epic: #87 - Advanced Car Publishing Features
-- Created: 2025-01-27
-- Purpose: Add missing fields for complete vehicle data capture
-- ============================================================================

BEGIN;

-- Add vehicle documentation fields
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS plate TEXT,
  ADD COLUMN IF NOT EXISTS vin TEXT;

-- Add complete address fields
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS location_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS location_postal_code TEXT;

-- Add payment and delivery options (stored as JSONB arrays)
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_options JSONB DEFAULT '[]'::jsonb;

-- Add terms and conditions
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Create indexes for searchable fields
CREATE INDEX IF NOT EXISTS idx_cars_plate ON public.cars(plate) WHERE plate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_vin ON public.cars(vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_location_neighborhood ON public.cars(location_neighborhood) WHERE location_neighborhood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_location_postal_code ON public.cars(location_postal_code) WHERE location_postal_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.cars.plate IS 'Patente del vehículo (ej: ABC123)';
COMMENT ON COLUMN public.cars.vin IS 'Número de chasis/VIN del vehículo';
COMMENT ON COLUMN public.cars.location_neighborhood IS 'Barrio o zona de la ubicación';
COMMENT ON COLUMN public.cars.location_postal_code IS 'Código postal de la ubicación';
COMMENT ON COLUMN public.cars.payment_methods IS 'Array JSON de métodos de pago aceptados: ["cash", "transfer", "card"]';
COMMENT ON COLUMN public.cars.delivery_options IS 'Array JSON de opciones de entrega: ["pickup", "delivery"]';
COMMENT ON COLUMN public.cars.terms_and_conditions IS 'Términos y condiciones específicos del vehículo';

-- Set default values for existing records
UPDATE public.cars
SET
  payment_methods = COALESCE(payment_methods, '[]'::jsonb),
  delivery_options = COALESCE(delivery_options, '["pickup"]'::jsonb)
WHERE
  payment_methods IS NULL OR
  delivery_options IS NULL;

COMMIT;
