-- ============================================================================
-- AUTO-PROCESS WITHDRAWALS - PROCESAMIENTO INSTANTÁNEO
-- ============================================================================
-- Cuando un usuario solicita un retiro, se procesa INMEDIATAMENTE
-- SIN necesidad de aprobación de admin
-- ============================================================================

-- Habilitar pg_net extension (para hacer llamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función que auto-aprueba y procesa retiros instantáneamente
CREATE OR REPLACE FUNCTION auto_approve_and_process_withdrawal()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_response_id BIGINT;
  v_user_balance NUMERIC;
  v_total_debit NUMERIC;
BEGIN
  -- Solo procesar cuando se crea un nuevo retiro (status = 'pending')
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN

    RAISE NOTICE 'Auto-processing new withdrawal: %', NEW.id;

    -- Verificar que el usuario tenga fondos suficientes
    SELECT available_balance INTO v_user_balance
    FROM user_wallets
    WHERE user_id = NEW.user_id;

    v_total_debit := NEW.amount + NEW.fee_amount;

    IF v_user_balance < v_total_debit THEN
      RAISE NOTICE 'Insufficient balance for withdrawal: %, required: %, available: %',
        NEW.id, v_total_debit, v_user_balance;
      -- No procesar, dejar en pending
      RETURN NEW;
    END IF;

    -- Auto-aprobar el retiro
    UPDATE withdrawal_requests
    SET
      status = 'approved',
      approved_at = NOW(),
      approved_by = NEW.user_id -- Auto-aprobado por el sistema
    WHERE id = NEW.id;

    RAISE NOTICE 'Withdrawal auto-approved: %', NEW.id;

    -- Llamar a Edge Function para procesar con MercadoPago
    SELECT INTO v_response_id net.http_post(
      url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-money-out',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'withdrawal_request_id', NEW.id
      ),
      timeout_milliseconds := 30000
    );

    RAISE NOTICE 'Processing queued with HTTP request ID: %', v_response_id;

  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta DESPUÉS de INSERT
DROP TRIGGER IF EXISTS trigger_instant_process_withdrawal ON withdrawal_requests;

CREATE TRIGGER trigger_instant_process_withdrawal
  AFTER INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_and_process_withdrawal();

-- ============================================================================
-- VALIDACIONES Y LÍMITES DE SEGURIDAD (OPCIONAL)
-- ============================================================================

-- Función para validar límites antes de crear retiro
CREATE OR REPLACE FUNCTION validate_withdrawal_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily_total NUMERIC;
  v_daily_limit NUMERIC := 50000; -- Límite diario: $50,000 ARS
  v_max_single NUMERIC := 10000;  -- Límite por retiro: $10,000 ARS
  v_min_single NUMERIC := 100;    -- Mínimo por retiro: $100 ARS
BEGIN
  -- Validar monto mínimo
  IF NEW.amount < v_min_single THEN
    RAISE EXCEPTION 'El monto mínimo de retiro es $%', v_min_single;
  END IF;

  -- Validar monto máximo por retiro
  IF NEW.amount > v_max_single THEN
    RAISE EXCEPTION 'El monto máximo de retiro es $%', v_max_single;
  END IF;

  -- Calcular total de retiros del día
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_total
  FROM withdrawal_requests
  WHERE user_id = NEW.user_id
    AND DATE(created_at) = CURRENT_DATE
    AND status NOT IN ('failed', 'rejected', 'cancelled');

  -- Validar límite diario
  IF (v_daily_total + NEW.amount) > v_daily_limit THEN
    RAISE EXCEPTION 'Límite diario de retiros excedido. Límite: $%, usado hoy: $%',
      v_daily_limit, v_daily_total;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger de validación (se ejecuta ANTES de INSERT)
DROP TRIGGER IF EXISTS trigger_validate_withdrawal ON withdrawal_requests;

CREATE TRIGGER trigger_validate_withdrawal
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_limits();

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================

-- 1. Ejecutar este SQL en Supabase SQL Editor
-- 2. Cuando un usuario solicite retiro, se procesará AUTOMÁTICAMENTE
-- 3. No se requiere aprobación de admin
-- 4. Ver logs en: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions

-- ============================================================================
-- TESTING
-- ============================================================================

-- Solicitar un retiro (se procesará automáticamente):
-- SELECT * FROM wallet_request_withdrawal(
--   p_bank_account_id := 'uuid-de-cuenta-bancaria',
--   p_amount := 1000,
--   p_user_notes := 'Retiro automático de prueba'
-- );

-- Verificar que se procesó automáticamente:
-- SELECT id, status, approved_at, processed_at, completed_at
-- FROM withdrawal_requests
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC
-- LIMIT 1;

-- Ver requests HTTP enviados:
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;

-- ============================================================================
-- CONFIGURACIÓN DE LÍMITES
-- ============================================================================

-- Para modificar los límites, editar la función validate_withdrawal_limits():
--
-- v_daily_limit: Límite total de retiros por día por usuario
-- v_max_single: Monto máximo por retiro individual
-- v_min_single: Monto mínimo por retiro individual

-- Para DESACTIVAR los límites, eliminar el trigger de validación:
-- DROP TRIGGER IF EXISTS trigger_validate_withdrawal ON withdrawal_requests;

-- ============================================================================
-- DESACTIVAR/ACTIVAR PROCESAMIENTO AUTOMÁTICO
-- ============================================================================

-- Desactivar procesamiento automático (los retiros quedarán en 'pending'):
-- ALTER TABLE withdrawal_requests DISABLE TRIGGER trigger_instant_process_withdrawal;

-- Reactivar procesamiento automático:
-- ALTER TABLE withdrawal_requests ENABLE TRIGGER trigger_instant_process_withdrawal;

-- Eliminar completamente:
-- DROP TRIGGER IF EXISTS trigger_instant_process_withdrawal ON withdrawal_requests;
-- DROP TRIGGER IF EXISTS trigger_validate_withdrawal ON withdrawal_requests;
-- DROP FUNCTION IF EXISTS auto_approve_and_process_withdrawal();
-- DROP FUNCTION IF EXISTS validate_withdrawal_limits();

-- ============================================================================
-- NOTAS DE SEGURIDAD
-- ============================================================================

-- ⚠️ IMPORTANTE: Procesamiento instantáneo sin aprobación tiene riesgos:
--
-- 1. FRAUDE: Un usuario malicioso podría intentar múltiples retiros rápidos
--    Mitigación: Límites diarios y por transacción implementados
--
-- 2. FONDOS INSUFICIENTES: Si la verificación de balance falla
--    Mitigación: El trigger verifica balance antes de aprobar
--
-- 3. CUENTA BANCARIA INVÁLIDA: CBU/CVU/Alias incorrecto
--    Mitigación: MercadoPago rechazará y marcará como 'failed'
--
-- 4. SIN REVERSIÓN: Una vez procesado, no se puede cancelar
--    Mitigación: Implementar período de gracia (próxima versión)
--
-- 5. MONITOREO: Es crucial monitorear transacciones sospechosas
--    Recomendación: Implementar alertas para patrones anormales

-- ============================================================================
-- MEJORAS FUTURAS (OPCIONAL)
-- ============================================================================

-- 1. PERÍODO DE GRACIA (hold period):
--    - Retiros menores a $X: instantáneos
--    - Retiros mayores a $X: hold de 24 horas
--
-- 2. VERIFICACIÓN DE IDENTIDAD:
--    - Requerir verificación para montos altos
--    - Limitar montos para usuarios no verificados
--
-- 3. DETECCIÓN DE FRAUDE:
--    - Análisis de patrones de retiro
--    - Bloqueo automático de cuentas sospechosas
--
-- 4. NOTIFICACIONES:
--    - Email al usuario cuando se procesa retiro
--    - Alertas a admin para retiros grandes
--
-- 5. WHITELIST DE CUENTAS:
--    - Cuentas bancarias pre-verificadas
--    - Procesamiento más rápido para cuentas confiables

-- ============================================================================
-- MONITOREO Y ALERTAS
-- ============================================================================

-- Query para detectar actividad sospechosa:
--
-- SELECT
--   user_id,
--   COUNT(*) as withdrawal_count,
--   SUM(amount) as total_amount,
--   MIN(created_at) as first_withdrawal,
--   MAX(created_at) as last_withdrawal
-- FROM withdrawal_requests
-- WHERE created_at > NOW() - INTERVAL '24 hours'
-- GROUP BY user_id
-- HAVING COUNT(*) > 5 OR SUM(amount) > 20000
-- ORDER BY total_amount DESC;

-- Query para ver retiros fallidos recientes:
--
-- SELECT
--   wr.id,
--   wr.user_id,
--   wr.amount,
--   wr.status,
--   wr.failure_reason,
--   wr.created_at,
--   ba.account_number
-- FROM withdrawal_requests wr
-- JOIN bank_accounts ba ON wr.bank_account_id = ba.id
-- WHERE wr.status = 'failed'
--   AND wr.created_at > NOW() - INTERVAL '7 days'
-- ORDER BY wr.created_at DESC;
