-- =============================================
-- FASE 8: Sistema de Niveles de Renter
-- =============================================

-- 8.1 Agregar columnas de nivel a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS renter_level TEXT DEFAULT 'basic' CHECK (renter_level IN ('basic', 'verified', 'premium')),
ADD COLUMN IF NOT EXISTS renter_level_updated_at TIMESTAMPTZ;

-- 8.2 Función para calcular nivel de renter
CREATE OR REPLACE FUNCTION get_renter_level(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_current_level TEXT;
  v_requirements_met jsonb := '[]'::jsonb;
  v_requirements_missing jsonb := '[]'::jsonb;
  v_total_rentals INTEGER;
  v_average_rating NUMERIC;
  v_disputes_lost INTEGER;
BEGIN
  -- Obtener perfil
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Contar alquileres completados
  SELECT COUNT(*) INTO v_total_rentals
  FROM bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  -- Obtener rating promedio
  SELECT COALESCE(AVG(rating), 0) INTO v_average_rating
  FROM reviews
  WHERE reviewee_id = p_user_id;

  -- Contar disputas perdidas
  SELECT COUNT(*) INTO v_disputes_lost
  FROM disputes
  WHERE renter_id = p_user_id AND status = 'resolved_owner_favor';

  -- ========== NIVEL BÁSICO ==========
  -- Requisitos: email verificado + teléfono verificado
  v_current_level := 'basic';

  IF v_profile.email_verified_at IS NOT NULL THEN
    v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'Email verificado', 'met', true);
  ELSE
    v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'Email verificado', 'met', false);
  END IF;

  IF v_profile.phone IS NOT NULL AND v_profile.phone != '' THEN
    v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'Teléfono registrado', 'met', true);
  ELSE
    v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'Teléfono registrado', 'met', false);
  END IF;

  -- ========== NIVEL VERIFICADO ==========
  -- Requisitos: básico + DNI + licencia + selfie verificados
  IF v_profile.dni_verified_at IS NOT NULL THEN
    v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'DNI verificado', 'met', true);
    IF v_profile.license_verified_at IS NOT NULL THEN
      v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'Licencia verificada', 'met', true);
      IF v_profile.selfie_verified_at IS NOT NULL THEN
        v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'Selfie verificada', 'met', true);
        v_current_level := 'verified';
      ELSE
        v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'Selfie verificada', 'met', false);
      END IF;
    ELSE
      v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'Licencia verificada', 'met', false);
    END IF;
  ELSE
    v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'DNI verificado', 'met', false);
  END IF;

  -- ========== NIVEL PREMIUM ==========
  -- Requisitos: verificado + 5 alquileres + rating >= 4.5 + sin disputas perdidas
  IF v_current_level = 'verified' THEN
    IF v_total_rentals >= 5 THEN
      v_requirements_met := v_requirements_met || jsonb_build_object('requirement', '5+ alquileres completados', 'met', true, 'current', v_total_rentals);
      IF v_average_rating >= 4.5 THEN
        v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'Rating >= 4.5', 'met', true, 'current', ROUND(v_average_rating, 2));
        IF v_disputes_lost = 0 THEN
          v_requirements_met := v_requirements_met || jsonb_build_object('requirement', 'Sin disputas perdidas', 'met', true);
          v_current_level := 'premium';
        ELSE
          v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'Sin disputas perdidas', 'met', false, 'current', v_disputes_lost);
        END IF;
      ELSE
        v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', 'Rating >= 4.5', 'met', false, 'current', ROUND(v_average_rating, 2));
      END IF;
    ELSE
      v_requirements_missing := v_requirements_missing || jsonb_build_object('requirement', '5+ alquileres completados', 'met', false, 'current', v_total_rentals);
    END IF;
  END IF;

  -- Actualizar nivel en profile si cambió
  IF v_profile.renter_level IS DISTINCT FROM v_current_level THEN
    UPDATE profiles
    SET renter_level = v_current_level,
        renter_level_updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'level', v_current_level,
    'level_label', CASE v_current_level
      WHEN 'basic' THEN 'Básico'
      WHEN 'verified' THEN 'Verificado'
      WHEN 'premium' THEN 'Premium'
    END,
    'benefits', CASE v_current_level
      WHEN 'basic' THEN jsonb_build_array(
        'Acceso a la plataforma',
        'Depósito estándar requerido'
      )
      WHEN 'verified' THEN jsonb_build_array(
        'Acceso a la plataforma',
        'Más confianza de los owners',
        'Acceso a autos de gama media',
        'Depósito estándar requerido'
      )
      WHEN 'premium' THEN jsonb_build_array(
        'Acceso a todos los autos',
        'Depósito reducido (bonus-malus)',
        'Prioridad en reservas',
        'Soporte prioritario',
        'Promociones exclusivas'
      )
    END,
    'requirements_met', v_requirements_met,
    'requirements_missing', v_requirements_missing,
    'stats', jsonb_build_object(
      'total_rentals', v_total_rentals,
      'average_rating', ROUND(v_average_rating, 2),
      'disputes_lost', v_disputes_lost
    )
  );
END;
$$;

-- =============================================
-- FASE 9: Penalización Owner por Cancelar
-- =============================================

-- 9.1 Agregar columnas de penalización a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS visibility_penalty_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_count_90d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_cancellation_check TIMESTAMPTZ;

-- 9.2 Función para que owner cancele booking con penalización
CREATE OR REPLACE FUNCTION owner_cancel_booking(
  p_booking_id UUID,
  p_owner_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_cancellations_90d INTEGER;
  v_penalty_days INTEGER := 30;
  v_refund_amount BIGINT;
  v_total_amount BIGINT;
BEGIN
  -- Obtener booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Verificar que el owner es el dueño del booking
  IF v_booking.owner_id != p_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permiso para cancelar esta reserva');
  END IF;

  -- Solo se puede cancelar si está pendiente o confirmada
  IF v_booking.status NOT IN ('pending', 'confirmed', 'pending_payment') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo se pueden cancelar reservas pendientes o confirmadas',
      'current_status', v_booking.status
    );
  END IF;

  -- Calcular monto a reembolsar (100% al renter como créditos)
  v_total_amount := COALESCE(v_booking.total_amount_cents, 0);
  v_refund_amount := v_total_amount;

  -- Contar cancelaciones en últimos 90 días
  SELECT COUNT(*) INTO v_cancellations_90d
  FROM bookings
  WHERE owner_id = p_owner_id
    AND status = 'cancelled_owner'
    AND cancelled_at > NOW() - INTERVAL '90 days';

  -- Actualizar booking a cancelado_owner
  UPDATE bookings
  SET status = 'cancelled_owner',
      cancelled_at = NOW(),
      cancellation_reason = COALESCE(p_reason, 'Cancelado por el propietario'),
      cancelled_by_role = 'owner'
  WHERE id = p_booking_id;

  -- Si el renter ya había pagado, reembolsar como créditos
  IF v_booking.payment_status = 'approved' AND v_refund_amount > 0 THEN
    -- Liberar cualquier lock del depósito
    UPDATE wallet_transactions
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE booking_id = p_booking_id
      AND status = 'locked';

    -- Crear crédito de reembolso
    INSERT INTO wallet_transactions (
      user_id, type, amount_cents, status, description,
      booking_id, metadata
    ) VALUES (
      v_booking.renter_id,
      'credit',
      v_refund_amount,
      'completed',
      'Reembolso por cancelación del propietario - Reserva #' || LEFT(p_booking_id::TEXT, 8),
      p_booking_id,
      jsonb_build_object(
        'reason', 'owner_cancellation',
        'original_amount', v_total_amount
      )
    );

    -- Actualizar balance del renter
    UPDATE profiles
    SET wallet_balance = wallet_balance + v_refund_amount
    WHERE id = v_booking.renter_id;
  END IF;

  -- Aplicar penalización al owner
  -- -10% visibilidad por 30 días por cada cancelación
  UPDATE profiles
  SET
    visibility_penalty_until = GREATEST(
      COALESCE(visibility_penalty_until, NOW()),
      NOW() + (v_penalty_days || ' days')::INTERVAL
    ),
    cancellation_count_90d = v_cancellations_90d + 1
  WHERE id = p_owner_id;

  -- Si 3+ cancelaciones en 90 días, suspensión temporal
  IF v_cancellations_90d + 1 >= 3 THEN
    UPDATE profiles
    SET suspended_at = NOW(),
        suspension_reason = 'Demasiadas cancelaciones en los últimos 90 días (' || (v_cancellations_90d + 1) || ' cancelaciones)'
    WHERE id = p_owner_id;

    -- Notificar suspensión
    INSERT INTO user_notifications (user_id, type, title, body, data)
    VALUES (
      p_owner_id,
      'account_suspended',
      'Cuenta Temporalmente Suspendida',
      'Tu cuenta ha sido suspendida temporalmente por múltiples cancelaciones. Por favor contacta a soporte.',
      jsonb_build_object(
        'reason', 'multiple_cancellations',
        'cancellation_count', v_cancellations_90d + 1
      )
    );
  END IF;

  -- Notificar al renter
  INSERT INTO user_notifications (user_id, type, title, body, data)
  VALUES (
    v_booking.renter_id,
    'booking_cancelled_by_owner',
    'Reserva Cancelada',
    'El propietario ha cancelado tu reserva. Se te ha acreditado el monto total como créditos.',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'refund_amount', v_refund_amount,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva cancelada exitosamente',
    'booking_id', p_booking_id,
    'refund_to_renter', v_refund_amount,
    'penalty_applied', jsonb_build_object(
      'visibility_penalty_days', v_penalty_days,
      'cancellations_90d', v_cancellations_90d + 1,
      'suspended', v_cancellations_90d + 1 >= 3
    )
  );
END;
$$;

-- 9.3 Función para obtener penalizaciones de owner
CREATE OR REPLACE FUNCTION get_owner_penalties(p_owner_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_cancellations_90d INTEGER;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Contar cancelaciones recientes
  SELECT COUNT(*) INTO v_cancellations_90d
  FROM bookings
  WHERE owner_id = p_owner_id
    AND status = 'cancelled_owner'
    AND cancelled_at > NOW() - INTERVAL '90 days';

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_owner_id,
    'visibility_penalty_active', v_profile.visibility_penalty_until IS NOT NULL AND v_profile.visibility_penalty_until > NOW(),
    'visibility_penalty_until', v_profile.visibility_penalty_until,
    'visibility_penalty_days_remaining', CASE
      WHEN v_profile.visibility_penalty_until IS NOT NULL AND v_profile.visibility_penalty_until > NOW()
      THEN EXTRACT(DAY FROM v_profile.visibility_penalty_until - NOW())::INTEGER
      ELSE 0
    END,
    'cancellations_90d', v_cancellations_90d,
    'cancellations_until_suspension', GREATEST(0, 3 - v_cancellations_90d),
    'is_suspended', v_profile.suspended_at IS NOT NULL,
    'suspension_reason', v_profile.suspension_reason
  );
END;
$$;

-- 9.4 Función para aplicar penalidad de visibilidad en búsquedas (helper)
CREATE OR REPLACE FUNCTION get_owner_visibility_factor(p_owner_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_owner_id;

  IF NOT FOUND THEN
    RETURN 1.0;
  END IF;

  -- Si tiene penalización activa, reducir visibilidad 10%
  IF v_profile.visibility_penalty_until IS NOT NULL AND v_profile.visibility_penalty_until > NOW() THEN
    RETURN 0.9;
  END IF;

  RETURN 1.0;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION get_renter_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owner_cancel_booking(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_penalties(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_visibility_factor(UUID) TO authenticated;

COMMENT ON FUNCTION get_renter_level(UUID) IS 'Calcula y retorna el nivel del renter (basic, verified, premium)';
COMMENT ON FUNCTION owner_cancel_booking(UUID, UUID, TEXT) IS 'Owner cancela booking con reembolso al renter y penalización al owner';
COMMENT ON FUNCTION get_owner_penalties(UUID) IS 'Obtiene las penalizaciones activas de un owner';
COMMENT ON FUNCTION get_owner_visibility_factor(UUID) IS 'Helper: retorna factor de visibilidad (0.9 si penalizado, 1.0 normal)';
