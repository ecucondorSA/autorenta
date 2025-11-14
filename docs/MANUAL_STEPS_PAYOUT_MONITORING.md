# Manual Steps: Payout Monitoring Setup

## Status
- ✅ Edge Function `monitor-pending-payouts` deployada
- ⚠️ Cron job pendiente de configuración manual

## Problema
El `npx supabase db push` falla debido a una migration antigua (20250125_booking_p0_fixes.sql) que tiene un error.

## Solución Manual

### Paso 1: Aplicar Cron Job via SQL Editor

1. Ir a Supabase Dashboard: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/editor
2. Abrir SQL Editor
3. Copiar y ejecutar el siguiente SQL:

```sql
-- Habilitar pg_cron extension (si no está habilitado)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar job existente si existe (para re-deployment)
SELECT cron.unschedule('monitor-pending-payouts-hourly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly'
);

-- Crear cron job para ejecutar cada hora
SELECT cron.schedule(
  'monitor-pending-payouts-hourly',
  '0 * * * *', -- cada hora en minuto 0
  $$
  SELECT net.http_post(
    url := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/monitor-pending-payouts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Tabla para logging
CREATE TABLE IF NOT EXISTS cron_execution_log (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT,
  response JSONB,
  error TEXT
);

GRANT SELECT, INSERT ON cron_execution_log TO authenticated;
```

### Paso 2: Configurar Service Role Key

El cron job necesita autenticarse. Ejecutar:

```sql
-- Obtener el service role key desde Supabase Dashboard → Settings → API
-- Luego ejecutar (reemplazar YOUR_SERVICE_ROLE_KEY):
ALTER DATABASE postgres SET app.settings.service_role_key TO 'YOUR_SERVICE_ROLE_KEY';
```

O usando Vault (más seguro):

```sql
-- Crear secret en Vault
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');

-- Configurar database setting
ALTER DATABASE postgres SET app.settings.service_role_key TO 'vault://service_role_key';
```

### Paso 3: Verificar que el Cron Job está Activo

```sql
-- Ver jobs configurados
SELECT jobid, schedule, command, nodename, database, username, active
FROM cron.job
WHERE jobname = 'monitor-pending-payouts-hourly';
```

Debería retornar una fila con `active = true`.

### Paso 4: Ver Historial de Ejecuciones

```sql
-- Ver últimas 10 ejecuciones del cron
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly')
ORDER BY start_time DESC LIMIT 10;
```

### Paso 5: Probar Ejecución Inmediata

Para no esperar una hora, puedes cambiar temporalmente el schedule:

```sql
-- Cambiar a ejecutar cada minuto (solo para test)
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly'),
  schedule := '* * * * *'
);

-- Esperar 1-2 minutos y verificar logs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly')
ORDER BY start_time DESC LIMIT 5;

-- Restaurar a cada hora
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly'),
  schedule := '0 * * * *'
);
```

## Ver Logs de la Edge Function

Para ver los logs de las ejecuciones:

```bash
npx supabase functions logs monitor-pending-payouts --tail
```

O en Dashboard: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/functions

## Test Manual de la Función

```bash
# Test local
curl -X POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/monitor-pending-payouts \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Error: "function cron.schedule does not exist"
pg_cron no está habilitado. Contactar soporte de Supabase para habilitar en plan Pro.

### Error: "current_setting parameter not found"
Service role key no configurado. Ver Paso 2.

### Cron no se ejecuta
1. Verificar que `active = true` en `cron.job`
2. Ver logs en `cron.job_run_details`
3. Verificar que el service role key esté correcto

## Próximos Pasos

Una vez configurado el cron job:
1. ✅ Monitor de payouts activo
2. ⏭️ Continuar con validación MP onboarding
3. ⏭️ Dashboard de métricas admin

## Fecha
2025-11-13
