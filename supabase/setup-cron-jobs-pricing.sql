-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  🔄 SETUP DE CRON JOBS PARA PRICING DINÁMICO EN TIEMPO REAL         ║
-- ║  Ejecutar en Supabase Dashboard > SQL Editor                        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. HABILITAR EXTENSIÓN pg_cron (si no está habilitada)
-- ═══════════════════════════════════════════════════════════════

-- Verificar si pg_cron está instalado
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Habilitar pg_cron (ejecutar solo si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ═══════════════════════════════════════════════════════════════
-- 2. VERIFICAR TABLAS EXISTEN
-- ═══════════════════════════════════════════════════════════════

-- Verificar que todas las tablas de pricing existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pricing_regions') THEN
    RAISE EXCEPTION 'Tabla pricing_regions NO existe. Ejecuta setup-dynamic-pricing.sql primero';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pricing_demand_snapshots') THEN
    RAISE EXCEPTION 'Tabla pricing_demand_snapshots NO existe. Ejecuta setup-dynamic-pricing.sql primero';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exchange_rates') THEN
    RAISE EXCEPTION 'Tabla exchange_rates NO existe. Ejecuta migration 004 primero';
  END IF;
  
  RAISE NOTICE '✅ Todas las tablas necesarias existen';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. HABILITAR SUPABASE REALTIME EN LAS TABLAS
-- ═══════════════════════════════════════════════════════════════

-- Habilitar Realtime para exchange_rates
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS exchange_rates;

-- Habilitar Realtime para pricing_demand_snapshots
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS pricing_demand_snapshots;

-- Habilitar Realtime para pricing_special_events
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS pricing_special_events;

-- Verificar que las tablas están en la publicación
SELECT 
  schemaname, 
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('exchange_rates', 'pricing_demand_snapshots', 'pricing_special_events');

-- Debería retornar 3 filas
-- Si no retorna nada, Realtime NO está habilitado

-- ═══════════════════════════════════════════════════════════════
-- 4. CREAR/VERIFICAR RPC FUNCTION PARA UPDATE DE DEMANDA
-- ═══════════════════════════════════════════════════════════════

-- Esta función actualiza el snapshot de demanda para todas las regiones
CREATE OR REPLACE FUNCTION public.update_all_demand_snapshots()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_region RECORD;
BEGIN
  -- Iterar sobre todas las regiones activas
  FOR v_region IN (SELECT id FROM public.pricing_regions WHERE active = true) LOOP
    PERFORM public.update_demand_snapshot(v_region.id);
  END LOOP;
  
  RAISE NOTICE 'Updated demand snapshots for all regions';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_all_demand_snapshots() TO postgres;
GRANT EXECUTE ON FUNCTION public.update_all_demand_snapshots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_all_demand_snapshots() TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 5. CONFIGURAR CRON JOB: UPDATE DEMAND SNAPSHOTS (cada 15 min)
-- ═══════════════════════════════════════════════════════════════

-- Eliminar job anterior si existe (para reconfiguración)
SELECT cron.unschedule('update-demand-snapshots-every-15min');

-- Crear Cron Job: Actualizar demanda cada 15 minutos
SELECT cron.schedule(
  'update-demand-snapshots-every-15min',  -- Job name
  '*/15 * * * *',                          -- Cron expression (cada 15 minutos)
  $$SELECT public.update_all_demand_snapshots()$$
);

-- ═══════════════════════════════════════════════════════════════
-- 6. INSERTAR DATOS INICIALES (si no existen)
-- ═══════════════════════════════════════════════════════════════

-- Insertar regiones si no existen
INSERT INTO public.pricing_regions (name, country_code, currency, base_price_per_hour, active)
VALUES 
  ('Montevideo', 'UY', 'USD', 5.00, true),
  ('Buenos Aires', 'AR', 'USD', 4.50, true),
  ('São Paulo', 'BR', 'USD', 6.00, true)
ON CONFLICT DO NOTHING;

-- Insertar factores de día de la semana por defecto
INSERT INTO public.pricing_day_factors (region_id, day_of_week, factor)
SELECT 
  r.id,
  d.day_num,
  CASE 
    WHEN d.day_num IN (0, 6) THEN 0.15  -- Fines de semana +15%
    ELSE 0.0                              -- Días laborables normal
  END
FROM public.pricing_regions r
CROSS JOIN (
  SELECT generate_series(0, 6) AS day_num
) d
ON CONFLICT DO NOTHING;

-- Insertar factores de hora por defecto
INSERT INTO public.pricing_hour_factors (region_id, hour_start, hour_end, factor, description)
SELECT 
  r.id,
  h.start_hour,
  h.end_hour,
  h.factor,
  h.description
FROM public.pricing_regions r
CROSS JOIN (
  VALUES
    (0, 5, -0.15, 'Madrugada - Descuento'),
    (6, 9, 0.10, 'Mañana - Pico'),
    (10, 16, 0.0, 'Tarde - Normal'),
    (17, 21, 0.10, 'Noche - Pico'),
    (22, 23, 0.0, 'Noche tardía - Normal')
) AS h(start_hour, end_hour, factor, description)
ON CONFLICT DO NOTHING;

-- Insertar factores de usuario
INSERT INTO public.pricing_user_factors (user_type, factor, min_rentals, description)
VALUES
  ('new', 0.0, 0, 'Usuario nuevo'),
  ('verified', -0.05, 0, 'Usuario verificado (-5%)'),
  ('frequent', -0.10, 10, 'Usuario frecuente 10+ rentals (-10%)')
ON CONFLICT DO NOTHING;

-- Insertar tasa de cambio inicial de Binance (si no existe)
INSERT INTO public.exchange_rates (
  pair, 
  source, 
  binance_rate, 
  platform_rate, 
  margin_percent,
  last_updated,
  is_active
)
VALUES (
  'USDTARS',
  'manual_initial',
  1015.50,                           -- Tasa de Binance
  1116.55,                           -- Tasa + 10% margen
  10.0,
  NOW(),
  true
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 7. EJECUTAR UPDATE INICIAL INMEDIATO
-- ═══════════════════════════════════════════════════════════════

-- Ejecutar update de demanda ahora (no esperar 15 minutos)
SELECT public.update_all_demand_snapshots();

-- ═══════════════════════════════════════════════════════════════
-- 8. VERIFICACIÓN DE SETUP
-- ═══════════════════════════════════════════════════════════════

-- Ver Cron Jobs configurados
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname LIKE '%demand%';

-- Ver última ejecución del Cron Job
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-demand-snapshots-every-15min')
ORDER BY start_time DESC
LIMIT 5;

-- Ver snapshots de demanda creados
SELECT 
  ds.id,
  r.name AS region_name,
  ds.available_cars,
  ds.active_bookings,
  ds.pending_requests,
  ds.demand_ratio,
  ds.surge_factor,
  ds.timestamp,
  AGE(NOW(), ds.timestamp) AS age
FROM public.pricing_demand_snapshots ds
JOIN public.pricing_regions r ON ds.region_id = r.id
ORDER BY ds.timestamp DESC
LIMIT 10;

-- Ver tasas de cambio
SELECT 
  id,
  pair,
  source,
  binance_rate,
  platform_rate,
  margin_percent,
  last_updated,
  AGE(NOW(), last_updated) AS age,
  is_active
FROM public.exchange_rates
WHERE is_active = true
ORDER BY last_updated DESC
LIMIT 5;

-- Ver regiones configuradas
SELECT 
  id,
  name,
  country_code,
  currency,
  base_price_per_hour,
  active,
  created_at
FROM public.pricing_regions
WHERE active = true;

-- ═══════════════════════════════════════════════════════════════
-- 9. POLÍTICAS RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════

-- Solo lectura para usuarios autenticados
CREATE POLICY IF NOT EXISTS "Allow read exchange_rates"
ON public.exchange_rates FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Allow read demand_snapshots"
ON public.pricing_demand_snapshots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Allow read special_events"
ON public.pricing_special_events FOR SELECT
TO authenticated
USING (active = true);

-- ═══════════════════════════════════════════════════════════════
-- ✅ VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_cron_count INT;
  v_realtime_count INT;
  v_regions_count INT;
  v_snapshots_count INT;
  v_rates_count INT;
BEGIN
  -- Verificar Cron Job existe
  SELECT COUNT(*) INTO v_cron_count
  FROM cron.job
  WHERE jobname = 'update-demand-snapshots-every-15min' AND active = true;
  
  IF v_cron_count = 0 THEN
    RAISE WARNING '⚠️  Cron Job NO está activo';
  ELSE
    RAISE NOTICE '✅ Cron Job activo';
  END IF;
  
  -- Verificar Realtime habilitado
  SELECT COUNT(*) INTO v_realtime_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename IN ('exchange_rates', 'pricing_demand_snapshots', 'pricing_special_events');
  
  IF v_realtime_count < 3 THEN
    RAISE WARNING '⚠️  Realtime NO está habilitado en todas las tablas (% de 3)', v_realtime_count;
  ELSE
    RAISE NOTICE '✅ Realtime habilitado en 3 tablas';
  END IF;
  
  -- Verificar regiones
  SELECT COUNT(*) INTO v_regions_count FROM public.pricing_regions WHERE active = true;
  RAISE NOTICE '✅ % regiones activas', v_regions_count;
  
  -- Verificar snapshots
  SELECT COUNT(*) INTO v_snapshots_count 
  FROM public.pricing_demand_snapshots 
  WHERE timestamp > NOW() - INTERVAL '1 hour';
  RAISE NOTICE '✅ % snapshots en última hora', v_snapshots_count;
  
  -- Verificar tasas
  SELECT COUNT(*) INTO v_rates_count 
  FROM public.exchange_rates 
  WHERE is_active = true;
  RAISE NOTICE '✅ % tasas de cambio activas', v_rates_count;
  
  -- Resumen
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ SETUP COMPLETO';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'Cron Jobs: % activos', v_cron_count;
  RAISE NOTICE 'Realtime: % tablas habilitadas', v_realtime_count;
  RAISE NOTICE 'Regiones: %', v_regions_count;
  RAISE NOTICE 'Snapshots: %', v_snapshots_count;
  RAISE NOTICE 'Tasas: %', v_rates_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔴 WebSocket Realtime: Listo';
  RAISE NOTICE '⏰ Cron Job: Ejecuta cada 15 minutos';
  RAISE NOTICE '💱 Exchange rates: Actualiza vía Edge Function';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Sistema listo para producción';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 📝 NOTAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════

-- 1. EDGE FUNCTION para actualizar exchange_rates:
--    Debes deployar y configurar:
--    - supabase/functions/update-exchange-rates/index.ts
--    - Schedule: cada 5 minutos vía Supabase Cron o servicio externo

-- 2. MONITOREO:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-demand-snapshots-every-15min')
--    ORDER BY start_time DESC LIMIT 10;

-- 3. TROUBLESHOOTING:
--    - Si Cron Job no ejecuta: verificar permisos de postgres role
--    - Si Realtime no funciona: verificar que Realtime está habilitado en Project Settings
--    - Si Edge Function no actualiza: verificar logs en Supabase Dashboard

-- 4. TESTING MANUAL:
--    -- Simular nueva tasa de Binance
--    INSERT INTO exchange_rates (pair, source, binance_rate, platform_rate, margin_percent, is_active)
--    VALUES ('USDTARS', 'manual_test', 1020.00, 1122.00, 10.0, true);
--    
--    -- Frontend debería actualizar en < 1 segundo vía WebSocket

-- ═══════════════════════════════════════════════════════════════
-- ✅ SCRIPT COMPLETADO
-- ═══════════════════════════════════════════════════════════════
