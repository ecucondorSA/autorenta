-- ============================================
-- MIGRACIÓN: Columnas OAuth de MercadoPago en profiles
-- Fecha: 2025-10-28
-- Propósito: Permitir vinculación de cuentas MP para split payments
-- ============================================

-- ============================================
-- 1. AGREGAR COLUMNAS OAUTH
-- ============================================

-- Columnas para OAuth de MercadoPago
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mercadopago_collector_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercadopago_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mercadopago_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mercadopago_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_access_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mercadopago_public_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercadopago_account_type VARCHAR(50), -- 'personal' | 'business'
ADD COLUMN IF NOT EXISTS mercadopago_country VARCHAR(10) DEFAULT 'AR',
ADD COLUMN IF NOT EXISTS mercadopago_site_id VARCHAR(10) DEFAULT 'MLA', -- MLA = Argentina
ADD COLUMN IF NOT EXISTS mercadopago_oauth_state TEXT; -- State temporal para validar callback

-- Comentarios para documentación
COMMENT ON COLUMN profiles.mercadopago_collector_id IS 'User ID de MercadoPago del vendedor (para split payments)';
COMMENT ON COLUMN profiles.mercadopago_connected IS 'Indica si el usuario vinculó su cuenta de MercadoPago';
COMMENT ON COLUMN profiles.mercadopago_connected_at IS 'Fecha de vinculación de la cuenta de MercadoPago';
COMMENT ON COLUMN profiles.mercadopago_refresh_token IS 'Refresh token de OAuth (encriptado en app)';
COMMENT ON COLUMN profiles.mercadopago_access_token IS 'Access token de OAuth (temporal, se renueva)';
COMMENT ON COLUMN profiles.mercadopago_access_token_expires_at IS 'Expiración del access token';
COMMENT ON COLUMN profiles.mercadopago_public_key IS 'Public key del vendedor para checkout';
COMMENT ON COLUMN profiles.mercadopago_account_type IS 'Tipo de cuenta: personal o business';
COMMENT ON COLUMN profiles.mercadopago_country IS 'País de la cuenta MercadoPago';
COMMENT ON COLUMN profiles.mercadopago_site_id IS 'Site ID de MercadoPago (MLA=Argentina, MLB=Brasil, etc)';

-- ============================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índice para búsquedas rápidas por collector_id
CREATE INDEX IF NOT EXISTS idx_profiles_mp_collector
ON profiles(mercadopago_collector_id)
WHERE mercadopago_connected = TRUE;

-- Índice para búsquedas de cuentas conectadas
CREATE INDEX IF NOT EXISTS idx_profiles_mp_connected
ON profiles(mercadopago_connected)
WHERE mercadopago_connected = TRUE;

-- Índice compuesto para validaciones de split payments
CREATE INDEX IF NOT EXISTS idx_profiles_mp_split_validation
ON profiles(id, mercadopago_collector_id, mercadopago_connected)
WHERE mercadopago_connected = TRUE;

-- ============================================
-- 3. RLS POLICIES PARA COLUMNAS OAUTH
-- ============================================

-- Los usuarios pueden leer su propio estado de OAuth
-- (Ya está cubierto por la política "Users can view own profile")

-- Los usuarios pueden actualizar su propio estado de OAuth
-- (Ya está cubierto por la política "Users can update own profile")

-- Nota: Las columnas sensibles (tokens) deben manejarse con cuidado
-- En el frontend, NO exponer los tokens directamente

-- ============================================
-- 4. FUNCIÓN RPC: Conectar MercadoPago
-- ============================================

CREATE OR REPLACE FUNCTION connect_mercadopago(
  p_collector_id VARCHAR,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_public_key VARCHAR,
  p_account_type VARCHAR DEFAULT 'personal',
  p_country VARCHAR DEFAULT 'AR',
  p_site_id VARCHAR DEFAULT 'MLA'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del owner de la función
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Obtener user_id del contexto de autenticación
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Verificar que el collector_id no esté ya en uso por otro usuario
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE mercadopago_collector_id = p_collector_id
    AND id != v_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Esta cuenta de MercadoPago ya está vinculada a otro usuario'
    );
  END IF;

  -- Actualizar profile con datos de OAuth
  UPDATE profiles
  SET
    mercadopago_collector_id = p_collector_id,
    mercadopago_connected = TRUE,
    mercadopago_connected_at = NOW(),
    mercadopago_access_token = p_access_token,
    mercadopago_refresh_token = p_refresh_token,
    mercadopago_access_token_expires_at = p_expires_at,
    mercadopago_public_key = p_public_key,
    mercadopago_account_type = p_account_type,
    mercadopago_country = p_country,
    mercadopago_site_id = p_site_id,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Verificar si se actualizó
  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Cuenta de MercadoPago conectada exitosamente',
      'collector_id', p_collector_id
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'error', 'No se pudo actualizar el perfil'
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION connect_mercadopago IS 'Conecta la cuenta de MercadoPago del usuario para split payments';

-- ============================================
-- 5. FUNCIÓN RPC: Desconectar MercadoPago
-- ============================================

CREATE OR REPLACE FUNCTION disconnect_mercadopago()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Verificar si el usuario tiene autos publicados
  -- (Podría ser necesario mantener la conexión si hay bookings activos)
  IF EXISTS (
    SELECT 1 FROM cars
    WHERE owner_id = v_user_id
    AND status IN ('active', 'pending')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes desconectar MercadoPago mientras tengas autos activos',
      'warning', 'Debes pausar o eliminar tus autos primero'
    );
  END IF;

  -- Limpiar datos de OAuth
  UPDATE profiles
  SET
    mercadopago_collector_id = NULL,
    mercadopago_connected = FALSE,
    mercadopago_connected_at = NULL,
    mercadopago_access_token = NULL,
    mercadopago_refresh_token = NULL,
    mercadopago_access_token_expires_at = NULL,
    mercadopago_public_key = NULL,
    mercadopago_account_type = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Cuenta de MercadoPago desconectada exitosamente'
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'error', 'No se pudo desconectar la cuenta'
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION disconnect_mercadopago IS 'Desconecta la cuenta de MercadoPago del usuario';

-- ============================================
-- 6. FUNCIÓN RPC: Verificar Estado de Conexión
-- ============================================

CREATE OR REPLACE FUNCTION check_mercadopago_connection()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_token_expired BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'connected', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Obtener datos de conexión
  SELECT
    mercadopago_connected,
    mercadopago_collector_id,
    mercadopago_connected_at,
    mercadopago_access_token_expires_at,
    mercadopago_account_type,
    mercadopago_country
  INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  -- Si no está conectado
  IF v_profile.mercadopago_connected IS NOT TRUE THEN
    RETURN json_build_object(
      'connected', false,
      'message', 'No hay cuenta de MercadoPago conectada'
    );
  END IF;

  -- Verificar si el token expiró
  v_token_expired := v_profile.mercadopago_access_token_expires_at < NOW();

  RETURN json_build_object(
    'connected', true,
    'collector_id', v_profile.mercadopago_collector_id,
    'connected_at', v_profile.mercadopago_connected_at,
    'account_type', v_profile.mercadopago_account_type,
    'country', v_profile.mercadopago_country,
    'token_expired', v_token_expired,
    'needs_refresh', v_token_expired
  );
END;
$$;

COMMENT ON FUNCTION check_mercadopago_connection IS 'Verifica el estado de la conexión con MercadoPago';

-- ============================================
-- 7. ACTUALIZAR VISTA my_cars (si existe)
-- ============================================

-- Si tienes una vista de "mis autos", agregar campos de MP
DROP VIEW IF EXISTS my_cars CASCADE;

CREATE OR REPLACE VIEW my_cars AS
SELECT
  c.*,
  p.mercadopago_collector_id,
  p.mercadopago_connected,
  p.mercadopago_connected_at,
  CASE
    WHEN p.mercadopago_connected = TRUE THEN 'connected'
    ELSE 'not_connected'
  END as mp_status
FROM cars c
INNER JOIN profiles p ON p.id = c.owner_id;

COMMENT ON VIEW my_cars IS 'Vista de autos con información de conexión de MercadoPago del dueño';

-- ============================================
-- 8. TRIGGER: Validar datos de OAuth
-- ============================================

CREATE OR REPLACE FUNCTION validate_mercadopago_oauth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si se marca como conectado, validar que tenga collector_id
  IF NEW.mercadopago_connected = TRUE AND NEW.mercadopago_collector_id IS NULL THEN
    RAISE EXCEPTION 'mercadopago_collector_id es requerido cuando mercadopago_connected = true';
  END IF;

  -- Si se desconecta, limpiar tokens
  IF NEW.mercadopago_connected = FALSE THEN
    NEW.mercadopago_access_token := NULL;
    NEW.mercadopago_refresh_token := NULL;
    NEW.mercadopago_access_token_expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_mercadopago_oauth
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_mercadopago_oauth();

COMMENT ON TRIGGER trg_validate_mercadopago_oauth ON profiles IS 'Valida datos de OAuth de MercadoPago antes de guardar';

-- ============================================
-- 9. DATOS DE EJEMPLO (SOLO PARA DESARROLLO)
-- ============================================

-- Descomentar solo en desarrollo para testing
-- UPDATE profiles
-- SET
--   mercadopago_collector_id = '202984680',
--   mercadopago_connected = TRUE,
--   mercadopago_connected_at = NOW(),
--   mercadopago_account_type = 'personal',
--   mercadopago_country = 'AR',
--   mercadopago_site_id = 'MLA'
-- WHERE email = 'eduardo_marques022@hotmail.com';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
