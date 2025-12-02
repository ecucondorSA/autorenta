-- ============================================================================
-- DIRECT BINANCE API SYNC - SIN EDGE FUNCTION
-- ============================================================================
-- Actualización directa desde PostgreSQL usando pg_net
-- Más confiable que llamar Edge Functions
-- ============================================================================

-- ============================================================================
-- FUNCIÓN: sync_binance_rates_direct
-- ============================================================================
-- Consulta Binance API directamente y actualiza exchange_rates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_binance_rates_direct()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_binance_url text;
  v_response_id bigint;
  v_response_status int;
  v_response_body jsonb;
  v_binance_rate numeric;
  v_platform_rate numeric;
  v_margin_percent numeric := 10.0; -- Margen del 10%
  v_margin_absolute numeric;
  v_result jsonb;
  v_pairs text[] := ARRAY['USDTARS', 'USDTBRL'];
  v_pair text;
  v_success_count int := 0;
  v_error_count int := 0;
BEGIN
  v_result := '{"success": false, "updated": [], "errors": []}'::jsonb;

  -- Iterar sobre cada par de monedas
  FOREACH v_pair IN ARRAY v_pairs
  LOOP
    BEGIN
      -- URL de Binance API
      v_binance_url := 'https://api.binance.com/api/v3/ticker/price?symbol=' || v_pair;

      -- Hacer request HTTP GET usando pg_net
      SELECT INTO v_response_id
        net.http_get(
          url := v_binance_url,
          headers := '{"Content-Type": "application/json"}'::jsonb
        );

      -- Esperar respuesta (polling cada 100ms por máximo 5 segundos)
      FOR i IN 1..50 LOOP
        SELECT status_code, content::jsonb
        INTO v_response_status, v_response_body
        FROM net._http_response
        WHERE id = v_response_id;

        EXIT WHEN v_response_status IS NOT NULL;
        PERFORM pg_sleep(0.1);
      END LOOP;

      -- Verificar respuesta
      IF v_response_status = 200 AND v_response_body IS NOT NULL THEN
        -- Extraer precio de Binance
        v_binance_rate := (v_response_body->>'price')::numeric;

        -- Calcular tasa de plataforma con margen
        v_platform_rate := v_binance_rate * (1 + v_margin_percent / 100.0);
        v_margin_absolute := v_platform_rate - v_binance_rate;

        -- Actualizar o insertar en exchange_rates usando RPC
        PERFORM upsert_exchange_rate(
          p_pair := v_pair,
          p_binance_rate := v_binance_rate,
          p_margin_percent := v_margin_percent,
          p_volatility_24h := NULL
        );

        -- Agregar a resultados exitosos
        v_result := jsonb_set(
          v_result,
          '{updated}',
          (v_result->'updated') || jsonb_build_object(
            'pair', v_pair,
            'binance_rate', v_binance_rate,
            'platform_rate', v_platform_rate,
            'margin_percent', v_margin_percent
          )
        );

        v_success_count := v_success_count + 1;

        RAISE NOTICE 'Updated %: Binance % → Platform % (+% %%)',
          v_pair, v_binance_rate, v_platform_rate, v_margin_percent;

      ELSE
        -- Error en la respuesta
        RAISE WARNING 'Failed to fetch %: HTTP %', v_pair, v_response_status;

        v_result := jsonb_set(
          v_result,
          '{errors}',
          (v_result->'errors') || jsonb_build_object(
            'pair', v_pair,
            'error', 'HTTP ' || COALESCE(v_response_status::text, 'timeout')
          )
        );

        v_error_count := v_error_count + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Error inesperado
        RAISE WARNING 'Exception syncing %: % %', v_pair, SQLERRM, SQLSTATE;

        v_result := jsonb_set(
          v_result,
          '{errors}',
          (v_result->'errors') || jsonb_build_object(
            'pair', v_pair,
            'error', SQLERRM
          )
        );

        v_error_count := v_error_count + 1;
    END;
  END LOOP;

  -- Marcar como exitoso si al menos 1 par se actualizó
  IF v_success_count > 0 THEN
    v_result := jsonb_set(v_result, '{success}', 'true'::jsonb);
  END IF;

  v_result := jsonb_set(v_result, '{success_count}', to_jsonb(v_success_count));
  v_result := jsonb_set(v_result, '{error_count}', to_jsonb(v_error_count));
  v_result := jsonb_set(v_result, '{timestamp}', to_jsonb(now()));

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', now()
    );
END;
$$;

-- ============================================================================
-- COMENTARIO
-- ============================================================================

COMMENT ON FUNCTION public.sync_binance_rates_direct() IS
'Sincroniza tasas de cambio directamente desde Binance API usando pg_net.
No requiere Edge Functions ni autenticación.
Retorna JSON con resultados de la sincronización.';

-- ============================================================================
-- REEMPLAZAR CRON JOB PARA USAR FUNCIÓN DIRECTA
-- ============================================================================

-- Desactivar el job anterior
UPDATE cron.job
SET active = false
WHERE jobname = 'sync-binance-rates-every-15-min';

-- Crear nuevo job con función directa
SELECT cron.schedule(
  'sync-binance-direct-every-15-min',
  '*/15 * * * *',
  $$SELECT public.sync_binance_rates_direct();$$
);

-- ============================================================================
-- TRIGGER INICIAL: Ejecutar inmediatamente
-- ============================================================================

SELECT public.sync_binance_rates_direct();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname LIKE '%binance%'
ORDER BY jobid DESC;

-- ============================================================================
-- FIN
-- ============================================================================
