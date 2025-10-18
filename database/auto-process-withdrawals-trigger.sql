-- ============================================================================
-- AUTO-PROCESS WITHDRAWALS TRIGGER
-- ============================================================================
-- Cuando un retiro es aprobado (status = 'approved'), automáticamente
-- llama a la Edge Function para procesarlo con MercadoPago
--
-- IMPORTANTE: Requiere la extensión pg_net para hacer llamadas HTTP
-- ============================================================================

-- 1. Habilitar extensión pg_net (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear función que llama a la Edge Function
CREATE OR REPLACE FUNCTION trigger_auto_process_withdrawal()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_supabase_url TEXT;
  v_request_id UUID;
BEGIN
  -- Solo procesar si cambió de pending/rejected a approved
  IF NEW.status = 'approved' AND OLD.status IN ('pending', 'rejected') THEN

    v_request_id := NEW.id;

    -- Obtener URL de Supabase (desde configuración o hardcodeada)
    v_supabase_url := 'https://obxvffplochgeiclibng.supabase.co';

    -- Log del trigger
    RAISE NOTICE 'Auto-processing withdrawal request: %', v_request_id;

    -- Llamar a la Edge Function usando pg_net
    -- Nota: pg_net es asíncrono, no esperamos respuesta
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/mercadopago-money-out',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'withdrawal_request_id', v_request_id::text
      ),
      timeout_milliseconds := 30000 -- 30 segundos timeout
    );

    RAISE NOTICE 'Edge Function called for withdrawal: %', v_request_id;

  END IF;

  RETURN NEW;
END;
$$;

-- 3. Crear trigger en la tabla withdrawal_requests
DROP TRIGGER IF EXISTS auto_process_withdrawal_trigger ON withdrawal_requests;

CREATE TRIGGER auto_process_withdrawal_trigger
AFTER UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_process_withdrawal();

-- ============================================================================
-- ALTERNATIVA: Si pg_net no está disponible
-- ============================================================================
-- Comentado por defecto, descomentar si pg_net no funciona
--
-- Esta alternativa solo actualiza un campo flag que luego un cron job
-- o worker externo puede procesar

/*
CREATE OR REPLACE FUNCTION trigger_auto_process_withdrawal_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IN ('pending', 'rejected') THEN
    -- Marcar para procesamiento automático
    NEW.needs_processing := TRUE;
    NEW.processing_queued_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_process_withdrawal_flag_trigger ON withdrawal_requests;

CREATE TRIGGER auto_process_withdrawal_flag_trigger
BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_process_withdrawal_flag();

-- Agregar columnas necesarias para la alternativa:
-- ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS needs_processing BOOLEAN DEFAULT FALSE;
-- ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS processing_queued_at TIMESTAMPTZ;
*/

-- ============================================================================
-- CONFIGURACIÓN ADICIONAL
-- ============================================================================

-- Configurar service role key como setting (solo admin puede hacer esto)
-- Ejecutar desde Supabase SQL Editor:
--
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'tu-service-role-key-aqui';
--
-- O desde el trigger, puedes obtenerlo del entorno de Supabase

COMMENT ON FUNCTION trigger_auto_process_withdrawal IS
'Trigger que automáticamente procesa retiros aprobados llamando a la Edge Function mercadopago-money-out';

-- ============================================================================
-- TESTING
-- ============================================================================

-- Para probar el trigger:
--
-- 1. Crear un retiro de prueba:
-- SELECT * FROM wallet_request_withdrawal(
--   p_bank_account_id := 'uuid-de-cuenta-bancaria',
--   p_amount := 1000,
--   p_user_notes := 'Prueba de retiro automático'
-- );
--
-- 2. Aprobar el retiro (esto debería disparar el trigger):
-- SELECT * FROM wallet_approve_withdrawal('uuid-del-retiro');
--
-- 3. Verificar logs en Supabase Edge Functions
-- 4. Verificar que el status cambió a 'processing' y luego 'completed'

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. SEGURIDAD:
--    - El trigger usa SECURITY DEFINER para poder llamar a pg_net
--    - Asegúrate de que solo admins puedan aprobar retiros
--    - El service role key debe estar protegido
--
-- 2. PERFORMANCE:
--    - pg_net es asíncrono, no bloquea la transacción
--    - Si hay muchas aprobaciones simultáneas, considera usar una cola
--
-- 3. ERROR HANDLING:
--    - Si pg_net falla, el retiro queda en 'approved' y no se procesa
--    - Considera agregar un cron job que reprocese retiros approved antiguos
--
-- 4. MONITOREO:
--    - Monitorea logs de Edge Functions para errores
--    - Crea alertas si retiros quedan stuck en 'approved'

-- ============================================================================
-- DESACTIVAR TRIGGER (si es necesario)
-- ============================================================================

-- Para desactivar temporalmente:
-- ALTER TABLE withdrawal_requests DISABLE TRIGGER auto_process_withdrawal_trigger;
--
-- Para reactivar:
-- ALTER TABLE withdrawal_requests ENABLE TRIGGER auto_process_withdrawal_trigger;
--
-- Para eliminar completamente:
-- DROP TRIGGER IF EXISTS auto_process_withdrawal_trigger ON withdrawal_requests;
-- DROP FUNCTION IF EXISTS trigger_auto_process_withdrawal();
