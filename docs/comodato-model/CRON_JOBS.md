# CRON JOBS - Tareas Programadas

## Resumen
Este documento contiene las funciones y configuración de tareas programadas necesarias para el modelo de comunidad.

---

# 1. FUNCIONES PARA CRON

## 1.1 Cálculo Mensual de Rewards

Ejecutar el **día 1 de cada mes** para calcular los puntos del mes anterior.

```sql
CREATE OR REPLACE FUNCTION cron_calculate_all_rewards()
RETURNS INT AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM now() - INTERVAL '1 month')::INT;
  v_month INT := EXTRACT(MONTH FROM now() - INTERVAL '1 month')::INT;
  v_count INT := 0;
  v_owner RECORD;
BEGIN
  -- Calcular rewards para cada owner activo
  FOR v_owner IN
    SELECT owner_id FROM community_memberships WHERE status = 'active'
  LOOP
    BEGIN
      PERFORM calculate_monthly_community_rewards(v_owner.owner_id, v_year, v_month);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error calculando rewards para owner %: %', v_owner.owner_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 1.2 Distribución de Rewards

Ejecutar el **día 5 de cada mes** para distribuir el pool del mes anterior.

```sql
CREATE OR REPLACE FUNCTION cron_distribute_rewards()
RETURNS INT AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM now() - INTERVAL '1 month')::INT;
  v_month INT := EXTRACT(MONTH FROM now() - INTERVAL '1 month')::INT;
BEGIN
  -- Distribuir pool
  PERFORM distribute_reward_pool(v_year, v_month);

  -- Pagar a wallets
  RETURN payout_community_rewards(v_year, v_month);
END;
$$ LANGUAGE plpgsql;
```

---

## 1.3 Reset de Días Consecutivos

Ejecutar **cada medianoche** para resetear el contador de días consecutivos.

```sql
CREATE OR REPLACE FUNCTION cron_reset_consecutive_days()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- Resetear contador solo si no hay booking activo
  UPDATE owner_usage_limits SET
    consecutive_days_current = 0,
    updated_at = now()
  WHERE consecutive_days_current > 0
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.car_id = owner_usage_limits.car_id
        AND b.status IN ('active', 'in_progress')
        AND b.agreement_type = 'comodato'
        AND b.end_at >= CURRENT_DATE
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 1.4 Crear Pool del Mes Nuevo

Ejecutar el **día 1 de cada mes** para crear el pool del mes actual.

```sql
CREATE OR REPLACE FUNCTION cron_create_monthly_pool()
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO reward_pool (
    period_year,
    period_month,
    contributions_cents,
    status
  )
  VALUES (
    EXTRACT(YEAR FROM now())::INT,
    EXTRACT(MONTH FROM now())::INT,
    0,
    'open'
  )
  ON CONFLICT (period_year, period_month) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 1.5 Reset Anual de Ganancias YTD

Ejecutar el **1 de enero** para resetear contadores anuales.

```sql
CREATE OR REPLACE FUNCTION cron_yearly_reset()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- Resetear ganancias YTD en autos
  UPDATE cars SET
    ytd_earnings_cents = 0,
    earnings_limit_reached = false,
    updated_at = now()
  WHERE sharing_mode = 'comodato';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Resetear en límites también
  UPDATE owner_usage_limits SET
    ytd_earnings_cents = 0
  WHERE year = EXTRACT(YEAR FROM now())::INT - 1;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 1.6 Verificación de Uso Personal

Ejecutar **cada semana** para detectar owners sin verificación reciente.

```sql
CREATE OR REPLACE FUNCTION cron_check_personal_use()
RETURNS TABLE(car_id UUID, owner_id UUID, days_since_verification INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as car_id,
    c.owner_id,
    COALESCE(
      EXTRACT(DAY FROM now() - c.last_personal_use_verified_at)::INT,
      999
    ) as days_since_verification
  FROM cars c
  WHERE c.sharing_mode = 'comodato'
    AND (
      c.last_personal_use_verified_at IS NULL
      OR c.last_personal_use_verified_at < now() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;
```

---

# 2. CONFIGURACIÓN pg_cron

Si usas pg_cron en Supabase:

```sql
-- Habilitar extensión
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Día 1 de cada mes a las 00:01 - Crear pool y calcular rewards
SELECT cron.schedule(
  'create-monthly-pool',
  '1 0 1 * *',
  $$SELECT cron_create_monthly_pool()$$
);

SELECT cron.schedule(
  'calculate-monthly-rewards',
  '5 0 1 * *',
  $$SELECT cron_calculate_all_rewards()$$
);

-- Día 5 de cada mes a las 00:01 - Distribuir rewards
SELECT cron.schedule(
  'distribute-rewards',
  '1 0 5 * *',
  $$SELECT cron_distribute_rewards()$$
);

-- Cada medianoche - Reset días consecutivos
SELECT cron.schedule(
  'reset-consecutive-days',
  '0 0 * * *',
  $$SELECT cron_reset_consecutive_days()$$
);

-- 1 de enero a las 00:01 - Reset anual
SELECT cron.schedule(
  'yearly-reset',
  '1 0 1 1 *',
  $$SELECT cron_yearly_reset()$$
);

-- Ver jobs programados
SELECT * FROM cron.job;
```

---

# 3. EDGE FUNCTIONS ALTERNATIVAS

Si no puedes usar pg_cron, crear Edge Functions:

## 3.1 `calculate-rewards/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Calcular mes anterior
  const now = new Date()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()

  // Llamar función de cálculo
  const { data, error } = await supabase.rpc('cron_calculate_all_rewards')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({
    success: true,
    year,
    month,
    owners_processed: data
  }))
})
```

## 3.2 `distribute-rewards/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('cron_distribute_rewards')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({
    success: true,
    owners_paid: data
  }))
})
```

---

# 4. PROGRAMAR EDGE FUNCTIONS

Usando un servicio externo como cron-job.org o Supabase Scheduled Functions:

```json
{
  "jobs": [
    {
      "name": "calculate-rewards",
      "schedule": "0 0 1 * *",
      "endpoint": "https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/calculate-rewards"
    },
    {
      "name": "distribute-rewards",
      "schedule": "0 0 5 * *",
      "endpoint": "https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/distribute-rewards"
    }
  ]
}
```

---

# 5. MONITOREO Y LOGS

## 5.1 Tabla de Logs de Cron

```sql
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN NOT NULL,
  result JSONB,
  error_message TEXT,
  duration_ms INT
);

CREATE INDEX idx_cron_logs_job ON cron_execution_logs(job_name);
CREATE INDEX idx_cron_logs_date ON cron_execution_logs(executed_at);
```

## 5.2 Wrapper con Logging

```sql
CREATE OR REPLACE FUNCTION logged_cron_calculate_rewards()
RETURNS INT AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_result INT;
  v_success BOOLEAN := true;
  v_error TEXT;
BEGIN
  BEGIN
    v_result := cron_calculate_all_rewards();
  EXCEPTION WHEN OTHERS THEN
    v_success := false;
    v_error := SQLERRM;
    v_result := 0;
  END;

  INSERT INTO cron_execution_logs (job_name, success, result, error_message, duration_ms)
  VALUES (
    'calculate_rewards',
    v_success,
    jsonb_build_object('owners_processed', v_result),
    v_error,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

---

# 6. ALERTAS

## 6.1 Verificar Ejecución de Jobs

```sql
-- Verificar que los jobs se ejecutaron en los últimos 35 días
SELECT
  job_name,
  MAX(executed_at) as last_execution,
  COUNT(*) FILTER (WHERE NOT success) as failed_count,
  COUNT(*) as total_count
FROM cron_execution_logs
WHERE executed_at > now() - INTERVAL '35 days'
GROUP BY job_name;

-- Alertar si falta ejecución del mes
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM cron_execution_logs
    WHERE job_name = 'calculate_rewards'
    AND EXTRACT(MONTH FROM executed_at) = EXTRACT(MONTH FROM now())
    AND success = true
  ) THEN 'ALERTA: Rewards no calculados este mes'
  ELSE 'OK'
END as status;
```
