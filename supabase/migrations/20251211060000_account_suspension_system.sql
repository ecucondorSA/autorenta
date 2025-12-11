-- =============================================
-- FASE 6: Sistema de Suspensión por Deuda
-- =============================================

-- 6.1 Agregar columnas de suspensión a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS debt_warning_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS debt_start_date TIMESTAMPTZ;

-- Trigger para actualizar debt_start_date cuando balance se vuelve negativo
CREATE OR REPLACE FUNCTION update_debt_start_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el balance pasa a negativo y no había fecha de inicio de deuda
  IF NEW.wallet_balance < 0 AND (OLD.wallet_balance >= 0 OR OLD.wallet_balance IS NULL) THEN
    NEW.debt_start_date := NOW();
    NEW.debt_warning_sent_at := NULL; -- Reset warning
  -- Si el balance vuelve a positivo, limpiar fecha de deuda
  ELSIF NEW.wallet_balance >= 0 AND OLD.wallet_balance < 0 THEN
    NEW.debt_start_date := NULL;
    NEW.debt_warning_sent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_debt_start_date ON profiles;
CREATE TRIGGER trg_update_debt_start_date
  BEFORE UPDATE OF wallet_balance ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_start_date();

-- 6.2 Función para suspender cuentas con deuda >30 días (CRON)
CREATE OR REPLACE FUNCTION suspend_accounts_for_debt()
RETURNS TABLE(
  user_id UUID,
  debt_amount BIGINT,
  days_in_debt INTEGER,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH users_to_process AS (
    SELECT
      p.id,
      p.wallet_balance,
      EXTRACT(DAY FROM NOW() - p.debt_start_date)::INTEGER as days_in_debt,
      p.suspended_at,
      p.debt_warning_sent_at
    FROM profiles p
    WHERE p.wallet_balance < 0
      AND p.debt_start_date IS NOT NULL
      AND p.suspended_at IS NULL
  ),
  -- Enviar warning a usuarios con >20 días de deuda sin warning previo
  warnings_sent AS (
    UPDATE profiles p
    SET debt_warning_sent_at = NOW()
    FROM users_to_process u
    WHERE p.id = u.id
      AND u.days_in_debt >= 20
      AND u.days_in_debt < 30
      AND u.debt_warning_sent_at IS NULL
    RETURNING p.id, p.wallet_balance, u.days_in_debt, 'warning_sent'::TEXT as action
  ),
  -- Suspender usuarios con >30 días de deuda
  suspensions AS (
    UPDATE profiles p
    SET
      suspended_at = NOW(),
      suspension_reason = 'Deuda pendiente por más de 30 días. Balance: ' || (p.wallet_balance / 100.0)::TEXT || ' ARS'
    FROM users_to_process u
    WHERE p.id = u.id
      AND u.days_in_debt >= 30
    RETURNING p.id, p.wallet_balance, u.days_in_debt, 'suspended'::TEXT as action
  )
  SELECT
    w.id as user_id,
    w.wallet_balance as debt_amount,
    w.days_in_debt,
    w.action as action_taken
  FROM warnings_sent w
  UNION ALL
  SELECT
    s.id as user_id,
    s.wallet_balance as debt_amount,
    s.days_in_debt,
    s.action as action_taken
  FROM suspensions s;

  -- Crear notificaciones para usuarios suspendidos
  INSERT INTO user_notifications (user_id, type, title, body, data)
  SELECT
    p.id,
    'account_suspended',
    'Cuenta Suspendida',
    'Tu cuenta ha sido suspendida por deuda pendiente. Por favor, regulariza tu situación para continuar usando la plataforma.',
    jsonb_build_object(
      'debt_amount', ABS(p.wallet_balance),
      'suspended_at', p.suspended_at
    )
  FROM profiles p
  WHERE p.suspended_at IS NOT NULL
    AND p.suspended_at > NOW() - INTERVAL '1 minute'
    AND NOT EXISTS (
      SELECT 1 FROM user_notifications un
      WHERE un.user_id = p.id
        AND un.type = 'account_suspended'
        AND un.created_at > NOW() - INTERVAL '1 day'
    );
END;
$$;

-- 6.3 Función para reactivar cuenta cuando paga la deuda
CREATE OR REPLACE FUNCTION unsuspend_account(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_result jsonb;
BEGIN
  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Verificar que está suspendido
  IF v_profile.suspended_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'La cuenta no está suspendida');
  END IF;

  -- Verificar que no tiene deuda
  IF v_profile.wallet_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se puede reactivar la cuenta mientras tenga deuda pendiente',
      'debt_amount', ABS(v_profile.wallet_balance)
    );
  END IF;

  -- Reactivar cuenta
  UPDATE profiles
  SET
    suspended_at = NULL,
    suspension_reason = NULL,
    debt_start_date = NULL,
    debt_warning_sent_at = NULL
  WHERE id = p_user_id;

  -- Crear notificación
  INSERT INTO user_notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'account_reactivated',
    'Cuenta Reactivada',
    '¡Tu cuenta ha sido reactivada! Ya puedes volver a usar la plataforma.',
    jsonb_build_object('reactivated_at', NOW())
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cuenta reactivada exitosamente',
    'reactivated_at', NOW()
  );
END;
$$;

-- 6.4 Función para verificar si usuario puede operar (helper)
CREATE OR REPLACE FUNCTION can_user_operate(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_operate', false, 'reason', 'user_not_found');
  END IF;

  -- Verificar suspensión
  IF v_profile.suspended_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'can_operate', false,
      'reason', 'account_suspended',
      'suspension_reason', v_profile.suspension_reason,
      'suspended_at', v_profile.suspended_at,
      'debt_amount', CASE WHEN v_profile.wallet_balance < 0 THEN ABS(v_profile.wallet_balance) ELSE 0 END
    );
  END IF;

  -- Verificar deuda crítica (>20 días)
  IF v_profile.wallet_balance < 0 AND v_profile.debt_start_date IS NOT NULL THEN
    DECLARE
      v_days_in_debt INTEGER := EXTRACT(DAY FROM NOW() - v_profile.debt_start_date)::INTEGER;
    BEGIN
      IF v_days_in_debt >= 20 THEN
        RETURN jsonb_build_object(
          'can_operate', true,
          'warning', 'debt_warning',
          'message', 'Tienes una deuda pendiente. Tu cuenta será suspendida en ' || (30 - v_days_in_debt) || ' días si no regularizas tu situación.',
          'debt_amount', ABS(v_profile.wallet_balance),
          'days_until_suspension', 30 - v_days_in_debt
        );
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object('can_operate', true);
END;
$$;

-- 6.5 Función para obtener usuarios con deuda (para admin)
CREATE OR REPLACE FUNCTION get_users_with_debt(
  p_min_days INTEGER DEFAULT 0,
  p_only_suspended BOOLEAN DEFAULT false
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  wallet_balance BIGINT,
  debt_start_date TIMESTAMPTZ,
  days_in_debt INTEGER,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.email,
    p.full_name,
    p.wallet_balance,
    p.debt_start_date,
    COALESCE(EXTRACT(DAY FROM NOW() - p.debt_start_date)::INTEGER, 0) as days_in_debt,
    p.suspended_at,
    p.suspension_reason
  FROM profiles p
  WHERE p.wallet_balance < 0
    AND (p_only_suspended = false OR p.suspended_at IS NOT NULL)
    AND (
      p_min_days = 0
      OR (
        p.debt_start_date IS NOT NULL
        AND EXTRACT(DAY FROM NOW() - p.debt_start_date) >= p_min_days
      )
    )
  ORDER BY p.wallet_balance ASC, p.debt_start_date ASC;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION suspend_accounts_for_debt() TO service_role;
GRANT EXECUTE ON FUNCTION unsuspend_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_operate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_debt(INTEGER, BOOLEAN) TO service_role;

COMMENT ON FUNCTION suspend_accounts_for_debt() IS 'CRON: Suspende cuentas con deuda >30 días, envía warnings a >20 días';
COMMENT ON FUNCTION unsuspend_account(UUID) IS 'Reactiva una cuenta suspendida cuando el usuario paga su deuda';
COMMENT ON FUNCTION can_user_operate(UUID) IS 'Verifica si un usuario puede operar (no suspendido, sin deuda crítica)';
COMMENT ON FUNCTION get_users_with_debt(INTEGER, BOOLEAN) IS 'Admin: Lista usuarios con deuda pendiente';
