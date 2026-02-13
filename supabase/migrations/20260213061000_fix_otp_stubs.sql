-- ============================================================================
-- AUTORENTA - Fix OTP Verification RPCs
-- ============================================================================
-- Reemplaza los stubs de OTP con lógica real conectada a phone_otp_codes
-- ============================================================================

-- send_phone_otp: Genera y guarda un código OTP
CREATE OR REPLACE FUNCTION public.send_phone_otp(
  p_phone_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_otp TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Verificar autenticación
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- 2. Generar OTP de 6 dígitos
  v_otp := floor(random() * (999999 - 100000 + 1) + 100000)::TEXT;
  v_expires_at := NOW() + INTERVAL '10 minutes';

  -- 3. Guardar OTP en la base de datos (Upsert por user_id y phone)
  -- Nota: Asumimos que existe un índice único o restricción en (user_id, phone) para el upsert
  INSERT INTO public.phone_otp_codes (
    user_id,
    phone,
    code,
    channel,
    expires_at,
    verified,
    attempts
  ) VALUES (
    v_user_id,
    p_phone_number,
    v_otp,
    'sms', -- Default channel for RPC
    v_expires_at,
    false,
    0
  )
  ON CONFLICT (user_id, phone) 
  DO UPDATE SET 
    code = EXCLUDED.code,
    expires_at = EXCLUDED.expires_at,
    verified = false,
    attempts = 0,
    updated_at = NOW();

  -- 4. Loguear intento de entrega
  INSERT INTO public.otp_delivery_logs (
    user_id,
    phone,
    channel,
    status,
    metadata
  ) VALUES (
    v_user_id,
    p_phone_number,
    'sms',
    'pending',
    jsonb_build_object('source', 'rpc_call')
  );

  -- 5. Retornar éxito
  -- NOTA: En producción NO deberíamos retornar el código OTP al frontend si es para verificación.
  -- Pero lo retornamos en modo STUB/DEV si una variable de entorno lo permite, o simplemente no lo retornamos.
  -- Aquí retornamos success para que el frontend sepa que debe esperar el SMS/WhatsApp.
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Código OTP generado exitosamente',
    'expires_at', v_expires_at
  );
END;
$$;

-- verify_phone_otp: Verifica el código OTP
CREATE OR REPLACE FUNCTION public.verify_phone_otp(
  p_phone_number TEXT,
  p_otp_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_otp_record RECORD;
  v_max_attempts INTEGER := 5;
BEGIN
  -- 1. Verificar autenticación
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- 2. Buscar el registro de OTP activo
  SELECT * INTO v_otp_record
  FROM public.phone_otp_codes
  WHERE user_id = v_user_id
    AND phone = p_phone_number
    AND verified = false
  LIMIT 1;

  IF v_otp_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay un código pendiente para este teléfono');
  END IF;

  -- 3. Verificar expiración
  IF v_otp_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'El código ha expirado');
  END IF;

  -- 4. Verificar intentos
  IF v_otp_record.attempts >= v_max_attempts THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demasiados intentos fallidos. Solicite un nuevo código');
  END IF;

  -- 5. Validar código
  IF v_otp_record.code = p_otp_code THEN
    -- ÉXITO: Marcar como verificado
    UPDATE public.phone_otp_codes
    SET verified = true,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE id = v_otp_record.id;

    -- Actualizar perfil del usuario
    UPDATE public.profiles
    SET phone = p_phone_number,
        phone_verified = true,
        phone_verified_at = NOW(),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Teléfono verificado correctamente');
  ELSE
    -- FALLO: Incrementar intentos
    UPDATE public.phone_otp_codes
    SET attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = v_otp_record.id;

    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Código incorrecto', 
      'remaining_attempts', v_max_attempts - (v_otp_record.attempts + 1)
    );
  END IF;
END;
$$;
