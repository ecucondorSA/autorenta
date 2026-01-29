-- =============================================
-- FASE 10: CRON Jobs Adicionales
-- =============================================

-- Habilitar pg_cron si no está habilitado
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ========== CRON 1: Expirar Créditos Wallet ==========
-- Ejecutar diariamente a las 3:00 AM UTC
SELECT cron.unschedule('expire-wallet-credits');
SELECT cron.schedule(
  'expire-wallet-credits',
  '0 3 * * *',  -- 3:00 AM UTC diariamente
  $$SELECT expire_wallet_credits()$$
);

-- ========== CRON 2: Notificar Créditos por Vencer ==========
-- Ejecutar diariamente a las 9:00 AM UTC (6:00 AM Argentina)
SELECT cron.unschedule('notify-credits-expiring');
SELECT cron.schedule(
  'notify-credits-expiring',
  '0 9 * * *',  -- 9:00 AM UTC diariamente
  $$
  DO $$
  DECLARE
    v_credit RECORD;
  BEGIN
    -- Notificar créditos que vencen en 30 días
    FOR v_credit IN (
      SELECT * FROM get_expiring_credits(30)
      WHERE NOT EXISTS (
        SELECT 1 FROM user_notifications un
        WHERE un.user_id = get_expiring_credits.user_id
          AND un.type = 'credits_expiring_30d'
          AND un.created_at > NOW() - INTERVAL '25 days'
      )
    ) LOOP
      INSERT INTO user_notifications (user_id, type, title, body, data)
      VALUES (
        v_credit.user_id,
        'credits_expiring_30d',
        'Créditos por Vencer',
        'Tienes créditos que vencerán en ' || v_credit.days_until_expiry || ' días. ¡Úsalos antes de que expiren!',
        jsonb_build_object(
          'amount', v_credit.amount_cents,
          'expires_at', v_credit.expires_at,
          'days_remaining', v_credit.days_until_expiry
        )
      );
    END LOOP;

    -- Notificar créditos que vencen en 7 días (más urgente)
    FOR v_credit IN (
      SELECT * FROM get_expiring_credits(7)
      WHERE NOT EXISTS (
        SELECT 1 FROM user_notifications un
        WHERE un.user_id = get_expiring_credits.user_id
          AND un.type = 'credits_expiring_7d'
          AND un.created_at > NOW() - INTERVAL '2 days'
      )
    ) LOOP
      INSERT INTO user_notifications (user_id, type, title, body, data)
      VALUES (
        v_credit.user_id,
        'credits_expiring_7d',
        '¡Créditos por Vencer!',
        '¡Atención! Tienes créditos que vencerán en ' || v_credit.days_until_expiry || ' días. ¡Úsalos ahora!',
        jsonb_build_object(
          'amount', v_credit.amount_cents,
          'expires_at', v_credit.expires_at,
          'days_remaining', v_credit.days_until_expiry,
          'urgent', true
        )
      );
    END LOOP;
  END $$;
  $$
);

-- ========== CRON 3: Suspender Cuentas por Deuda ==========
-- Ejecutar diariamente a las 4:00 AM UTC
SELECT cron.unschedule('suspend-accounts-for-debt');
SELECT cron.schedule(
  'suspend-accounts-for-debt',
  '0 4 * * *',  -- 4:00 AM UTC diariamente
  $$SELECT * FROM suspend_accounts_for_debt()$$
);

-- ========== CRON 4: Auto-procesar Infracciones de Tránsito ==========
-- Ejecutar diariamente a las 5:00 AM UTC
-- Procesa infracciones no disputadas después de 48h
SELECT cron.unschedule('auto-process-traffic-infractions');
SELECT cron.schedule(
  'auto-process-traffic-infractions',
  '0 5 * * *',  -- 5:00 AM UTC diariamente
  $$SELECT auto_process_expired_infractions()$$
);

-- ========== CRON 5: Limpiar Locks de Wallet Expirados ==========
-- Ejecutar cada hora
SELECT cron.unschedule('expire-wallet-locks');
SELECT cron.schedule(
  'expire-wallet-locks',
  '0 * * * *',  -- Cada hora
  $$SELECT expire_wallet_locks()$$
);

-- ========== CRON 6: Renovar Créditos Elegibles ==========
-- Ejecutar semanalmente los domingos a las 2:00 AM UTC
SELECT cron.unschedule('renew-eligible-credits');
SELECT cron.schedule(
  'renew-eligible-credits',
  '0 2 * * 0',  -- 2:00 AM UTC cada domingo
  $$
  DO $$
  DECLARE
    v_user RECORD;
    v_result jsonb;
  BEGIN
    -- Buscar usuarios con créditos que vencen en 30 días y son elegibles
    FOR v_user IN (
      SELECT DISTINCT wt.user_id
      FROM wallet_transactions wt
      WHERE wt.type = 'credit'
        AND wt.status = 'completed'
        AND wt.expires_at IS NOT NULL
        AND wt.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND wt.expired_at IS NULL
    ) LOOP
      -- Verificar elegibilidad
      IF (check_credit_renewal_eligibility(v_user.user_id)->>'eligible')::boolean THEN
        v_result := renew_user_credits(v_user.user_id);

        -- Notificar renovación
        IF (v_result->>'success')::boolean THEN
          INSERT INTO user_notifications (user_id, type, title, body, data)
          VALUES (
            v_user.user_id,
            'credits_renewed',
            '¡Créditos Renovados!',
            'Tus créditos han sido renovados automáticamente por 1 año adicional. ¡Gracias por ser un usuario frecuente!',
            v_result
          );
        END IF;
      END IF;
    END LOOP;
  END $$;
  $$
);

-- ========== CRON 7: Actualizar Niveles de Renter ==========
-- Ejecutar diariamente a las 1:00 AM UTC
SELECT cron.unschedule('update-renter-levels');
SELECT cron.schedule(
  'update-renter-levels',
  '0 1 * * *',  -- 1:00 AM UTC diariamente
  $$
  DO $$
  DECLARE
    v_user RECORD;
  BEGIN
    -- Actualizar nivel de renters activos (con al menos 1 booking)
    FOR v_user IN (
      SELECT DISTINCT renter_id as user_id
      FROM bookings
      WHERE created_at > NOW() - INTERVAL '1 year'
    ) LOOP
      PERFORM get_renter_level(v_user.user_id);
    END LOOP;
  END $$;
  $$
);

-- ========== CRON 8: Limpiar Contador de Cancelaciones de Owners ==========
-- Ejecutar diariamente a las 0:00 AM UTC
-- Recalcula el contador de cancelaciones de los últimos 90 días
SELECT cron.unschedule('update-owner-cancellation-count');
SELECT cron.schedule(
  'update-owner-cancellation-count',
  '0 0 * * *',  -- 0:00 AM UTC diariamente
  $$
  UPDATE profiles p
  SET cancellation_count_90d = (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.owner_id = p.id
      AND b.status = 'cancelled_owner'
      AND b.cancelled_at > NOW() - INTERVAL '90 days'
  ),
  last_cancellation_check = NOW()
  WHERE p.id IN (
    SELECT DISTINCT owner_id FROM bookings WHERE status = 'cancelled_owner'
  );
  $$
);

-- ========== CRON 9: Expirar Penalizaciones de Visibilidad ==========
-- Ejecutar diariamente a las 6:00 AM UTC
SELECT cron.unschedule('clear-expired-visibility-penalties');
SELECT cron.schedule(
  'clear-expired-visibility-penalties',
  '0 6 * * *',  -- 6:00 AM UTC diariamente
  $$
  UPDATE profiles
  SET visibility_penalty_until = NULL
  WHERE visibility_penalty_until IS NOT NULL
    AND visibility_penalty_until < NOW();
  $$
);

-- ========== VISTA: Estado de CRON Jobs ==========
CREATE OR REPLACE VIEW cron_job_status AS
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;

-- Grants para vista
GRANT SELECT ON cron_job_status TO service_role;

-- ========== Función para ver historial de ejecución ==========
CREATE OR REPLACE FUNCTION get_cron_job_history(
  p_job_name TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  job_name TEXT,
  status TEXT,
  return_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::TEXT as job_name,
    d.status::TEXT,
    d.return_message::TEXT,
    d.start_time,
    d.end_time,
    d.end_time - d.start_time as duration
  FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid = d.jobid
  WHERE (p_job_name IS NULL OR j.jobname = p_job_name)
  ORDER BY d.start_time DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cron_job_history(TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION get_cron_job_history(TEXT, INTEGER) IS 'Obtiene el historial de ejecución de CRON jobs';

-- ========== Resumen de CRON Jobs Registrados ==========
/*
Los siguientes CRON jobs han sido configurados:

1. expire-wallet-credits        - 3:00 AM UTC diario  - Expira créditos vencidos
2. notify-credits-expiring      - 9:00 AM UTC diario  - Notifica créditos por vencer (30d y 7d)
3. suspend-accounts-for-debt    - 4:00 AM UTC diario  - Suspende cuentas con deuda >30 días
4. auto-process-traffic-infractions - 5:00 AM UTC diario - Auto-cobra multas no disputadas
5. expire-wallet-locks          - Cada hora           - Libera locks de wallet expirados
6. renew-eligible-credits       - 2:00 AM UTC domingo - Renueva créditos de usuarios elegibles
7. update-renter-levels         - 1:00 AM UTC diario  - Actualiza niveles de renters
8. update-owner-cancellation-count - 0:00 AM UTC diario - Recalcula cancelaciones de owners
9. clear-expired-visibility-penalties - 6:00 AM UTC diario - Limpia penalizaciones expiradas

Para ver el estado de los jobs:
  SELECT * FROM cron_job_status;

Para ver el historial de ejecución:
  SELECT * FROM get_cron_job_history('expire-wallet-credits', 10);
*/
