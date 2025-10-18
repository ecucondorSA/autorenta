-- ============================================================================
-- AUTO-PROCESS WITHDRAWALS - VERSIÓN SIMPLE
-- ============================================================================
-- Cuando un retiro es aprobado, automáticamente se procesa con MercadoPago
-- usando Database Webhooks de Supabase
-- ============================================================================

-- Habilitar pg_net extension (para hacer llamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función que se ejecuta cuando se aprueba un retiro
CREATE OR REPLACE FUNCTION auto_process_approved_withdrawal()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_response_id BIGINT;
BEGIN
  -- Solo procesar cuando cambia a 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    RAISE NOTICE 'Auto-processing withdrawal: %', NEW.id;

    -- Llamar a Edge Function usando pg_net
    SELECT INTO v_response_id net.http_post(
      url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-money-out',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'withdrawal_request_id', NEW.id
      )
    );

    RAISE NOTICE 'HTTP request queued with ID: %', v_response_id;

  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_auto_process_withdrawal ON withdrawal_requests;

CREATE TRIGGER trigger_auto_process_withdrawal
  AFTER UPDATE OF status ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_approved_withdrawal();

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================

-- 1. Ejecutar este SQL en Supabase SQL Editor
-- 2. Cuando un admin apruebe un retiro, automáticamente se procesará
-- 3. Ver logs en: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions

-- ============================================================================
-- TESTING
-- ============================================================================

-- Aprobar un retiro existente (esto disparará el trigger automáticamente):
-- SELECT * FROM wallet_approve_withdrawal('uuid-del-retiro');

-- Verificar que se llamó a pg_net:
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;

-- ============================================================================
-- DESACTIVAR/ACTIVAR
-- ============================================================================

-- Desactivar temporalmente:
-- ALTER TABLE withdrawal_requests DISABLE TRIGGER trigger_auto_process_withdrawal;

-- Reactivar:
-- ALTER TABLE withdrawal_requests ENABLE TRIGGER trigger_auto_process_withdrawal;

-- Eliminar:
-- DROP TRIGGER IF EXISTS trigger_auto_process_withdrawal ON withdrawal_requests;
-- DROP FUNCTION IF EXISTS auto_process_approved_withdrawal();
