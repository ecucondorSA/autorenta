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




