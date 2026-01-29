-- ============================================
-- MIGRATION: Account Deletion System
-- Proposito: Soporte para eliminacion de cuentas (GDPR/Play Store compliance)
-- ============================================

-- Tabla para solicitudes de eliminacion de cuenta (usuarios no autenticados)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para buscar por token
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_token
  ON account_deletion_requests(token) WHERE used_at IS NULL;

-- Indice para limpiar solicitudes expiradas
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_expires
  ON account_deletion_requests(expires_at) WHERE used_at IS NULL;

-- RLS: Solo service role puede acceder
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- No hay politicas para usuarios normales - solo service role

-- Agregar campo is_deleted a profiles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Agregar campo deleted_at a profiles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indice para filtrar usuarios eliminados
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted
  ON profiles(is_deleted) WHERE is_deleted = TRUE;

-- Funcion para confirmar eliminacion via token
CREATE OR REPLACE FUNCTION confirm_account_deletion(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_user_id UUID;
BEGIN
  -- Buscar solicitud valida
  SELECT * INTO v_request
  FROM account_deletion_requests
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Token invalido o expirado'
    );
  END IF;

  v_user_id := v_request.user_id;

  -- Marcar token como usado
  UPDATE account_deletion_requests
  SET used_at = NOW()
  WHERE id = v_request.id;

  -- Verificar que no hay reservas activas
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE (renter_id = v_user_id OR owner_id = v_user_id)
      AND status IN ('pending', 'confirmed', 'in_progress')
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No se puede eliminar cuenta con reservas activas'
    );
  END IF;

  -- Cancelar reservas pendientes
  UPDATE bookings
  SET status = 'cancelled',
      cancellation_reason = 'Cuenta eliminada por el usuario',
      cancelled_at = NOW()
  WHERE (renter_id = v_user_id OR owner_id = v_user_id)
    AND status = 'pending';

  -- Eliminar favoritos
  DELETE FROM favorites WHERE user_id = v_user_id;

  -- Eliminar push subscriptions
  DELETE FROM push_subscriptions WHERE user_id = v_user_id;

  -- Anonimizar mensajes
  UPDATE messages
  SET content = '[Mensaje eliminado - Cuenta cerrada]'
  WHERE sender_id = v_user_id;

  -- Desactivar autos
  UPDATE cars
  SET status = 'deleted',
      deleted_at = NOW()
  WHERE owner_id = v_user_id;

  -- Anonimizar perfil
  UPDATE profiles
  SET full_name = 'Usuario Eliminado',
      phone = NULL,
      avatar_url = NULL,
      bio = NULL,
      document_number = NULL,
      selfie_url = NULL,
      document_front_url = NULL,
      document_back_url = NULL,
      license_front_url = NULL,
      license_back_url = NULL,
      address = NULL,
      city = NULL,
      state = NULL,
      postal_code = NULL,
      country = NULL,
      mercadopago_access_token = NULL,
      mercadopago_refresh_token = NULL,
      mercadopago_user_id = NULL,
      mercadopago_public_key = NULL,
      deleted_at = NOW(),
      is_deleted = TRUE
  WHERE id = v_user_id;

  -- Log para auditoria
  INSERT INTO audit_logs (user_id, action, details)
  VALUES (
    v_user_id,
    'account_deleted_via_token',
    jsonb_build_object(
      'email', v_request.email,
      'reason', v_request.reason,
      'request_created_at', v_request.created_at
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Cuenta eliminada correctamente'
  );
END;
$$;

-- Cron job para limpiar solicitudes expiradas (ejecutar diariamente)
-- SELECT cron.schedule(
--   'cleanup-expired-deletion-requests',
--   '0 3 * * *',
--   $$DELETE FROM account_deletion_requests WHERE expires_at < NOW() - INTERVAL '7 days'$$
-- );

-- Comentario para documentacion
COMMENT ON TABLE account_deletion_requests IS
'Solicitudes de eliminacion de cuenta para usuarios que no pueden acceder a su cuenta.
Tokens validos por 24 horas. Cumplimiento GDPR/CCPA y Google Play Store.';

COMMENT ON FUNCTION confirm_account_deletion IS
'Confirma y ejecuta la eliminacion de cuenta usando un token enviado por email.
Retorna JSON con success/error.';
