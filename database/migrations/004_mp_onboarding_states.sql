-- ============================================================================
-- MERCADO PAGO ONBOARDING STATES
-- ============================================================================
-- Tabla para rastrear el estado del onboarding de Mercado Pago de los locadores
-- Requerido para permitir split-payments y cobros a través de la plataforma
--
-- Fecha: 2025-10-28
-- Autor: Claude Code - Autorentar Production Readiness
-- ============================================================================

-- Crear tabla de estados de onboarding
CREATE TABLE IF NOT EXISTS public.mp_onboarding_states (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos de Mercado Pago
  collector_id BIGINT,              -- ID del vendedor en MP
  public_key TEXT,                  -- Public key del vendedor
  access_token TEXT,                -- Access token para API de MP
  refresh_token TEXT,               -- Token para renovar access_token
  token_expires_at TIMESTAMPTZ,     -- Cuándo expira el access_token

  -- Estado del proceso
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired')),

  -- OAuth flow
  auth_code TEXT,                   -- Código de autorización temporal
  redirect_url TEXT,                -- URL de retorno después del OAuth

  -- Metadata
  completed_at TIMESTAMPTZ,         -- Cuándo se completó el onboarding
  last_sync_at TIMESTAMPTZ,         -- Última sincronización con MP
  error_message TEXT,               -- Mensaje de error si falla

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_user_id ON public.mp_onboarding_states(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_status ON public.mp_onboarding_states(status);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_collector_id ON public.mp_onboarding_states(collector_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.mp_onboarding_states ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio estado
CREATE POLICY "Users can view own onboarding state"
  ON public.mp_onboarding_states
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden insertar su propio estado (primera vez)
CREATE POLICY "Users can insert own onboarding state"
  ON public.mp_onboarding_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio estado
CREATE POLICY "Users can update own onboarding state"
  ON public.mp_onboarding_states
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los admins pueden ver todos los estados
CREATE POLICY "Admins can view all onboarding states"
  ON public.mp_onboarding_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Los admins pueden actualizar cualquier estado
CREATE POLICY "Admins can update all onboarding states"
  ON public.mp_onboarding_states
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_mp_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mp_onboarding_updated_at
  BEFORE UPDATE ON public.mp_onboarding_states
  FOR EACH ROW
  EXECUTE FUNCTION update_mp_onboarding_updated_at();

-- Auto-establecer completed_at cuando el status cambia a 'completed'
CREATE OR REPLACE FUNCTION set_mp_onboarding_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mp_onboarding_completed_at
  BEFORE UPDATE ON public.mp_onboarding_states
  FOR EACH ROW
  EXECUTE FUNCTION set_mp_onboarding_completed_at();

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Verificar si un usuario puede listar autos (onboarding completo)
CREATE OR REPLACE FUNCTION can_list_cars(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.mp_onboarding_states
  WHERE user_id = p_user_id;

  -- Si no tiene registro, retornar false
  IF v_status IS NULL THEN
    RETURN false;
  END IF;

  -- Solo puede listar si el estado es 'completed'
  RETURN v_status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Iniciar proceso de onboarding
CREATE OR REPLACE FUNCTION initiate_mp_onboarding(
  p_redirect_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_state_id UUID;
  v_existing_status TEXT;
BEGIN
  -- Obtener usuario actual
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar si ya tiene un onboarding
  SELECT status, id INTO v_existing_status, v_state_id
  FROM public.mp_onboarding_states
  WHERE user_id = v_user_id;

  -- Si ya tiene onboarding completado, retornar error
  IF v_existing_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding ya completado',
      'status', 'completed'
    );
  END IF;

  -- Si existe pero no está completado, actualizar
  IF v_state_id IS NOT NULL THEN
    UPDATE public.mp_onboarding_states
    SET
      status = 'in_progress',
      redirect_url = p_redirect_url,
      updated_at = NOW()
    WHERE id = v_state_id;
  ELSE
    -- Crear nuevo registro
    INSERT INTO public.mp_onboarding_states (user_id, status, redirect_url)
    VALUES (v_user_id, 'in_progress', p_redirect_url)
    RETURNING id INTO v_state_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'user_id', v_user_id,
    'status', 'in_progress'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Completar onboarding (llamado por edge function después de OAuth)
CREATE OR REPLACE FUNCTION complete_mp_onboarding(
  p_user_id UUID,
  p_collector_id BIGINT,
  p_public_key TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_in INTEGER DEFAULT 15552000 -- 180 días por defecto
)
RETURNS JSONB AS $$
DECLARE
  v_state_id UUID;
BEGIN
  -- Buscar el estado de onboarding
  SELECT id INTO v_state_id
  FROM public.mp_onboarding_states
  WHERE user_id = p_user_id;

  IF v_state_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró estado de onboarding para el usuario';
  END IF;

  -- Actualizar con datos de Mercado Pago
  UPDATE public.mp_onboarding_states
  SET
    status = 'completed',
    collector_id = p_collector_id,
    public_key = p_public_key,
    access_token = p_access_token,
    refresh_token = p_refresh_token,
    token_expires_at = NOW() + (p_expires_in || ' seconds')::INTERVAL,
    completed_at = NOW(),
    last_sync_at = NOW(),
    error_message = NULL
  WHERE id = v_state_id;

  RETURN jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'status', 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (solo para desarrollo/testing)
-- ============================================================================

-- Comentar en producción
-- INSERT INTO public.mp_onboarding_states (user_id, status, collector_id, access_token, refresh_token)
-- SELECT
--   id,
--   'completed',
--   123456789,
--   'TEST-ACCESS-TOKEN',
--   'TEST-REFRESH-TOKEN'
-- FROM auth.users
-- WHERE email = 'test@autorentar.com'
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE public.mp_onboarding_states IS 'Estados de onboarding de Mercado Pago para locadores';
COMMENT ON COLUMN public.mp_onboarding_states.collector_id IS 'ID del vendedor en Mercado Pago (requerido para split-payments)';
COMMENT ON COLUMN public.mp_onboarding_states.status IS 'Estado del proceso: pending (inicial), in_progress (OAuth iniciado), completed (listo para operar), rejected (rechazado por MP), expired (tokens expirados)';
COMMENT ON FUNCTION can_list_cars IS 'Verifica si un usuario completó el onboarding de MP y puede publicar autos';
COMMENT ON FUNCTION initiate_mp_onboarding IS 'Inicia el proceso de onboarding de Mercado Pago';
COMMENT ON FUNCTION complete_mp_onboarding IS 'Completa el onboarding después de OAuth exitoso';
