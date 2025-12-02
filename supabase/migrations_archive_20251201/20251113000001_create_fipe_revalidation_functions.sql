-- Migración: Funciones de Re-validación FIPE
-- Fecha: 2025-11-13
-- Propósito: Funciones SQL para re-validar autos sin validación FIPE

-- Requiere: extensión http para llamar a Edge Functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================================
-- 1. FUNCIÓN: RE-VALIDAR UN AUTO INDIVIDUAL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.retry_fipe_validation_for_car(p_car_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand TEXT;
  v_model TEXT;
  v_year INTEGER;
  v_country TEXT;
  v_result JSONB;
  v_supabase_url TEXT;
  v_anon_key TEXT;
  v_http_response extensions.http_response;
BEGIN
  -- Obtener configuración de Supabase
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Validar configuración
  IF v_supabase_url IS NULL OR v_anon_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configuración de Supabase no encontrada. Verifica app.settings.'
    );
  END IF;

  -- Obtener datos del auto
  SELECT
    brand_text_backup,
    model_text_backup,
    year,
    COALESCE(country, 'AR')
  INTO v_brand, v_model, v_year, v_country
  FROM cars
  WHERE id = p_car_id;

  -- Validar que existe el auto
  IF v_brand IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Auto no encontrado con ID: ' || p_car_id::TEXT
    );
  END IF;

  -- Validar datos mínimos
  IF v_model IS NULL OR v_year IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Auto incompleto. Falta marca, modelo o año.'
    );
  END IF;

  -- Log del intento
  RAISE NOTICE 'Re-validando auto: % % %', v_brand, v_model, v_year;

  -- Llamar a Edge Function get-fipe-value
  BEGIN
    SELECT * INTO v_http_response
    FROM extensions.http((
      'POST',
      v_supabase_url || '/functions/v1/get-fipe-value',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || v_anon_key),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      jsonb_build_object(
        'brand', v_brand,
        'model', v_model,
        'year', v_year,
        'country', v_country
      )::TEXT
    )::extensions.http_request);

    -- Parsear respuesta
    v_result := v_http_response.content::JSONB;

  EXCEPTION WHEN OTHERS THEN
    -- Error de red o timeout
    RETURN jsonb_build_object(
      'success', false,
      'car_id', p_car_id,
      'error', 'Error al llamar Edge Function: ' || SQLERRM
    );
  END;

  -- Procesar respuesta
  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'car_id', p_car_id,
      'error', 'Respuesta vacía de Edge Function'
    );
  END IF;

  -- Si la validación fue exitosa, actualizar el auto
  IF (v_result->>'success')::BOOLEAN = true THEN
    UPDATE cars
    SET
      value_brl = (v_result->'data'->>'value_brl')::INTEGER,
      value_usd = (v_result->'data'->>'value_usd')::INTEGER,
      value_ars = (v_result->'data'->>'value_ars')::INTEGER,
      fipe_code = v_result->'data'->>'fipe_code',
      value_usd_source = 'fipe',
      fipe_last_sync = NOW(),
      fipe_validation_pending = false,
      updated_at = NOW()
    WHERE id = p_car_id;

    RAISE NOTICE 'Auto validado exitosamente: % USD', (v_result->'data'->>'value_usd');

    RETURN jsonb_build_object(
      'success', true,
      'car_id', p_car_id,
      'message', 'Auto validado exitosamente',
      'data', v_result->'data'
    );
  ELSE
    -- Si falló, actualizar solo el timestamp del último intento
    UPDATE cars
    SET
      fipe_last_sync = NOW(),
      updated_at = NOW()
    WHERE id = p_car_id;

    RAISE NOTICE 'Validación falló: %', v_result->>'error';

    RETURN jsonb_build_object(
      'success', false,
      'car_id', p_car_id,
      'error', v_result->>'error'
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Error inesperado
  RETURN jsonb_build_object(
    'success', false,
    'car_id', p_car_id,
    'error', 'Error inesperado: ' || SQLERRM
  );
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.retry_fipe_validation_for_car IS
  'Re-intenta la validación FIPE para un auto específico. ' ||
  'Llama a Edge Function get-fipe-value y actualiza el auto si tiene éxito. ' ||
  'Parámetros: p_car_id (UUID del auto). ' ||
  'Retorna: JSONB con {success, car_id, message/error, data}.';

-- ============================================================================
-- 2. FUNCIÓN: RE-VALIDAR EN BATCH (MÚLTIPLES AUTOS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.retry_fipe_validation_batch(
  p_limit INTEGER DEFAULT 10,
  p_delay_seconds INTEGER DEFAULT 5
)
RETURNS TABLE(
  car_id UUID,
  brand TEXT,
  model TEXT,
  year INTEGER,
  success BOOLEAN,
  error_message TEXT,
  value_usd INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car RECORD;
  v_result JSONB;
  v_count INTEGER := 0;
  v_start_time TIMESTAMP;
BEGIN
  v_start_time := NOW();

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Iniciando batch de re-validación FIPE';
  RAISE NOTICE 'Límite: % autos, Delay: % segundos', p_limit, p_delay_seconds;
  RAISE NOTICE '================================================';

  -- Iterar sobre autos pendientes de validación
  FOR v_car IN
    SELECT id, brand_text_backup, model_text_backup, year
    FROM cars
    WHERE fipe_validation_pending = true
      AND status IN ('active', 'pending', 'draft')
      AND brand_text_backup IS NOT NULL
      AND model_text_backup IS NOT NULL
      AND year IS NOT NULL
    ORDER BY created_at DESC
    LIMIT p_limit
  LOOP
    v_count := v_count + 1;

    RAISE NOTICE '[%/%] Procesando: % % %',
      v_count, p_limit, v_car.brand_text_backup, v_car.model_text_backup, v_car.year;

    -- Re-intentar validación
    v_result := public.retry_fipe_validation_for_car(v_car.id);

    -- Retornar resultado
    car_id := v_car.id;
    brand := v_car.brand_text_backup;
    model := v_car.model_text_backup;
    year := v_car.year;
    success := (v_result->>'success')::BOOLEAN;
    error_message := v_result->>'error';

    -- Extraer value_usd si está presente
    IF success THEN
      value_usd := (v_result->'data'->>'value_usd')::INTEGER;
    ELSE
      value_usd := NULL;
    END IF;

    RETURN NEXT;

    -- Delay entre requests (excepto en el último)
    IF v_count < p_limit THEN
      RAISE NOTICE 'Esperando % segundos...', p_delay_seconds;
      PERFORM pg_sleep(p_delay_seconds);
    END IF;
  END LOOP;

  -- Resumen final
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Batch completado';
  RAISE NOTICE 'Autos procesados: %', v_count;
  RAISE NOTICE 'Tiempo total: % segundos', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER;
  RAISE NOTICE '================================================';

  RETURN;
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.retry_fipe_validation_batch IS
  'Re-valida múltiples autos en batch con delay entre requests para respetar rate limits. ' ||
  'Parámetros: p_limit (default 10), p_delay_seconds (default 5). ' ||
  'Retorna: Tabla con resultados de cada auto procesado.';

-- ============================================================================
-- 3. FUNCIÓN: OBTENER ESTADÍSTICAS DE BATCH
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fipe_batch_stats()
RETURNS TABLE(
  total_pendientes BIGINT,
  ultimos_7_dias BIGINT,
  ultimos_30_dias BIGINT,
  mas_de_30_dias BIGINT,
  tiempo_estimado_5s TEXT,
  tiempo_estimado_10s TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) as total_pendientes,
    COUNT(*) FILTER (
      WHERE created_at > NOW() - INTERVAL '7 days'
    ) as ultimos_7_dias,
    COUNT(*) FILTER (
      WHERE created_at > NOW() - INTERVAL '30 days'
    ) as ultimos_30_dias,
    COUNT(*) FILTER (
      WHERE created_at <= NOW() - INTERVAL '30 days'
    ) as mas_de_30_dias,
    -- Tiempo estimado con 5s de delay
    CONCAT(
      ROUND((COUNT(*) * 5.0) / 60, 1),
      ' minutos'
    ) as tiempo_estimado_5s,
    -- Tiempo estimado con 10s de delay
    CONCAT(
      ROUND((COUNT(*) * 10.0) / 60, 1),
      ' minutos'
    ) as tiempo_estimado_10s
  FROM cars
  WHERE fipe_validation_pending = true
    AND status IN ('active', 'pending', 'draft')
    AND brand_text_backup IS NOT NULL
    AND model_text_backup IS NOT NULL
    AND year IS NOT NULL;
$$;

-- Comentario
COMMENT ON FUNCTION public.get_fipe_batch_stats IS
  'Retorna estadísticas de autos pendientes de validación FIPE. ' ||
  'Incluye conteos por antigüedad y tiempo estimado de procesamiento batch.';

-- ============================================================================
-- 4. FUNCIÓN: MARCAR AUTO COMO NO VALIDABLE (MANUALMENTE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_car_as_non_fipe_validatable(
  p_car_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar que existe el auto
  IF NOT EXISTS (SELECT 1 FROM cars WHERE id = p_car_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Auto no encontrado'
    );
  END IF;

  -- Marcar como no validable
  UPDATE cars
  SET
    fipe_validation_pending = false,
    value_usd_source = 'manual',
    fipe_last_sync = NOW(),
    updated_at = NOW()
  WHERE id = p_car_id;

  -- Log del cambio (opcional: podrías crear tabla de audit log)
  RAISE NOTICE 'Auto % marcado como no validable. Razón: %', p_car_id, COALESCE(p_reason, 'No especificada');

  RETURN jsonb_build_object(
    'success', true,
    'car_id', p_car_id,
    'message', 'Auto marcado como no validable por FIPE',
    'reason', p_reason
  );
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.mark_car_as_non_fipe_validatable IS
  'Marca un auto como no validable por FIPE (ej: modelo importado, clásico). ' ||
  'Desactiva el flag fipe_validation_pending y marca value_usd_source como manual. ' ||
  'Útil para casos excepcionales que no deben re-procesarse.';

-- ============================================================================
-- 5. PERMISOS Y SEGURIDAD
-- ============================================================================

-- Las funciones usan SECURITY DEFINER, se ejecutan con permisos del owner
-- Revocar ejecución pública y otorgar solo a roles específicos

REVOKE EXECUTE ON FUNCTION public.retry_fipe_validation_for_car FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.retry_fipe_validation_batch FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_car_as_non_fipe_validatable FROM PUBLIC;

-- Otorgar a roles autenticados (ajustar según necesidad)
GRANT EXECUTE ON FUNCTION public.retry_fipe_validation_for_car TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_fipe_validation_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fipe_batch_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_car_as_non_fipe_validatable TO authenticated;

-- Otorgar a service_role para ejecución desde Edge Functions
GRANT EXECUTE ON FUNCTION public.retry_fipe_validation_for_car TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_fipe_validation_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_car_as_non_fipe_validatable TO service_role;

-- ============================================================================
-- 6. CONFIGURACIÓN INICIAL
-- ============================================================================

-- Establecer configuración de Supabase (reemplazar con valores reales en producción)
-- Estos valores deben configurarse via CLI o Dashboard:
--   supabase secrets set SUPABASE_URL="https://xxx.supabase.co"
--   supabase secrets set SUPABASE_ANON_KEY="eyJxxx..."

-- Para desarrollo local:
DO $$
BEGIN
  -- Verificar si ya existe la configuración
  IF current_setting('app.settings.supabase_url', true) IS NULL THEN
    -- Crear parámetros de configuración si no existen
    EXECUTE 'ALTER DATABASE ' || current_database() ||
            ' SET app.settings.supabase_url = ''http://localhost:54321''';
    RAISE NOTICE 'Configuración local establecida. Ajustar en producción.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo establecer configuración. Configurar manualmente.';
END $$;

-- ============================================================================
-- 7. QUERIES DE EJEMPLO Y TESTING
-- ============================================================================

-- Comentadas para evitar ejecución automática
-- Descomentar para testing manual:

/*
-- Ver estadísticas de batch
SELECT * FROM get_fipe_batch_stats();

-- Re-validar un auto específico
SELECT retry_fipe_validation_for_car('550e8400-e29b-41d4-a716-446655440000');

-- Re-validar 5 autos con 3 segundos de delay
SELECT * FROM retry_fipe_validation_batch(5, 3);

-- Marcar un auto como no validable (ej: modelo clásico)
SELECT mark_car_as_non_fipe_validatable(
  '550e8400-e29b-41d4-a716-446655440000',
  'Modelo clásico 1970 - no existe en FIPE'
);

-- Ver autos pendientes ordenados por antigüedad
SELECT * FROM fipe_pending_validation_details
ORDER BY dias_desde_creacion DESC
LIMIT 20;
*/

-- ============================================================================
-- 8. RESULTADO Y VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  v_pending INTEGER;
  v_stats RECORD;
BEGIN
  -- Contar pendientes
  SELECT COUNT(*) INTO v_pending
  FROM cars
  WHERE fipe_validation_pending = true
    AND status IN ('active', 'pending', 'draft');

  -- Obtener stats de batch
  SELECT * INTO v_stats FROM get_fipe_batch_stats();

  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: Funciones de Re-validación FIPE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Funciones creadas:';
  RAISE NOTICE '  - retry_fipe_validation_for_car(uuid)';
  RAISE NOTICE '  - retry_fipe_validation_batch(limit, delay)';
  RAISE NOTICE '  - get_fipe_batch_stats()';
  RAISE NOTICE '  - mark_car_as_non_fipe_validatable(uuid, reason)';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Autos pendientes de validación: %', v_pending;
  IF v_pending > 0 THEN
    RAISE NOTICE 'Tiempo estimado (5s delay): %', v_stats.tiempo_estimado_5s;
    RAISE NOTICE 'Tiempo estimado (10s delay): %', v_stats.tiempo_estimado_10s;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Ejecutar batch: SELECT * FROM retry_fipe_validation_batch(10, 5);';
  END IF;
  RAISE NOTICE '================================================';
END $$;
