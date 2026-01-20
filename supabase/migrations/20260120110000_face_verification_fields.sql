-- ============================================================================
-- MIGRACIÓN: Campos adicionales para verificación facial
-- Fecha: 2026-01-20
-- Propósito: Soportar verificación facial con Amazon Rekognition
-- ============================================================================

-- 1. Agregar campos a user_identity_levels
ALTER TABLE public.user_identity_levels
ADD COLUMN IF NOT EXISTS face_match_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS liveness_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS face_verification_method TEXT,
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN public.user_identity_levels.face_match_score IS 'Score de similitud facial (0-100) de Rekognition o heurístico';
COMMENT ON COLUMN public.user_identity_levels.liveness_score IS 'Score de liveness detection (0-100)';
COMMENT ON COLUMN public.user_identity_levels.face_verification_method IS 'Método usado: rekognition o vision_heuristic';
COMMENT ON COLUMN public.user_identity_levels.face_verified_at IS 'Timestamp de verificación facial exitosa';

-- 2. Agregar campos a profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN public.profiles.face_verified IS 'Si el usuario pasó la verificación facial';
COMMENT ON COLUMN public.profiles.face_verified_at IS 'Timestamp de verificación facial';

-- 3. Índice para buscar usuarios verificados
CREATE INDEX IF NOT EXISTS idx_profiles_face_verified
  ON public.profiles(face_verified)
  WHERE face_verified = true;

-- 4. Actualizar vista de progreso de verificación si existe
-- (Agregar face_verified al cálculo de nivel de verificación)
CREATE OR REPLACE FUNCTION public.get_verification_progress(p_user_id UUID)
RETURNS TABLE (
  level INT,
  level_name TEXT,
  progress_percent INT,
  steps JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_identity RECORD;
  v_steps JSONB;
  v_completed INT := 0;
  v_total INT := 6;
BEGIN
  -- Get profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- Get identity levels
  SELECT * INTO v_identity FROM public.user_identity_levels WHERE user_id = p_user_id;

  -- Build steps array
  v_steps := '[]'::JSONB;

  -- Step 1: Email verified
  IF v_profile.email_verified THEN
    v_completed := v_completed + 1;
    v_steps := v_steps || jsonb_build_object('step', 'email', 'completed', true, 'label', 'Email verificado');
  ELSE
    v_steps := v_steps || jsonb_build_object('step', 'email', 'completed', false, 'label', 'Verificar email');
  END IF;

  -- Step 2: Phone verified
  IF v_profile.phone_verified THEN
    v_completed := v_completed + 1;
    v_steps := v_steps || jsonb_build_object('step', 'phone', 'completed', true, 'label', 'Teléfono verificado');
  ELSE
    v_steps := v_steps || jsonb_build_object('step', 'phone', 'completed', false, 'label', 'Verificar teléfono');
  END IF;

  -- Step 3: Document verified
  IF v_identity.document_verified_at IS NOT NULL OR v_identity.id_verified_at IS NOT NULL THEN
    v_completed := v_completed + 1;
    v_steps := v_steps || jsonb_build_object('step', 'document', 'completed', true, 'label', 'Documento verificado');
  ELSE
    v_steps := v_steps || jsonb_build_object('step', 'document', 'completed', false, 'label', 'Verificar documento');
  END IF;

  -- Step 4: Face verified (NEW)
  IF v_profile.face_verified OR v_identity.face_verified_at IS NOT NULL THEN
    v_completed := v_completed + 1;
    v_steps := v_steps || jsonb_build_object('step', 'face', 'completed', true, 'label', 'Rostro verificado');
  ELSE
    v_steps := v_steps || jsonb_build_object('step', 'face', 'completed', false, 'label', 'Verificar rostro');
  END IF;

  -- Step 5: Driver license verified
  IF v_identity.driver_license_verified_at IS NOT NULL THEN
    v_completed := v_completed + 1;
    v_steps := v_steps || jsonb_build_object('step', 'license', 'completed', true, 'label', 'Licencia verificada');
  ELSE
    v_steps := v_steps || jsonb_build_object('step', 'license', 'completed', false, 'label', 'Verificar licencia');
  END IF;

  -- Step 6: MercadoPago connected
  IF v_profile.mercadopago_customer_id IS NOT NULL THEN
    v_completed := v_completed + 1;
    v_steps := v_steps || jsonb_build_object('step', 'payment', 'completed', true, 'label', 'Método de pago');
  ELSE
    v_steps := v_steps || jsonb_build_object('step', 'payment', 'completed', false, 'label', 'Agregar método de pago');
  END IF;

  -- Calculate level
  level := CASE
    WHEN v_completed >= 6 THEN 3  -- Verificado Plus
    WHEN v_completed >= 4 THEN 2  -- Verificado
    WHEN v_completed >= 2 THEN 1  -- Básico
    ELSE 0                        -- Sin verificar
  END;

  level_name := CASE level
    WHEN 3 THEN 'Verificado Plus'
    WHEN 2 THEN 'Verificado'
    WHEN 1 THEN 'Básico'
    ELSE 'Sin verificar'
  END;

  progress_percent := (v_completed * 100) / v_total;
  steps := v_steps;

  RETURN NEXT;
END;
$$;

-- Grant
GRANT EXECUTE ON FUNCTION public.get_verification_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verification_progress TO service_role;
