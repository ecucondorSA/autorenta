# Plan de Optimización de Realtime - AutoRenta

**Fecha:** 2025-11-13
**Estado:** Pendiente de Diagnóstico
**Prioridad:** Alta

---

## 📋 **Resumen Ejecutivo**

Este documento proporciona un plan accionable para optimizar el rendimiento de Supabase Realtime, reducir latencia en broadcasts y mejorar la experiencia del usuario en AutoRenta.

---

## 🎯 **Objetivos**

1. **Reducir latencia** en broadcasts de Realtime (<100ms)
2. **Eliminar bloqueos** en escrituras simultáneas
3. **Optimizar políticas RLS** para consultas rápidas
4. **Reducir carga** en el servidor de base de datos

---

## 📊 **Fase 1: Diagnóstico** (AHORA - 30 min)

### Paso 1.1: Ejecutar Consultas SQL

**Acción:**
1. Ir a [Supabase Dashboard > SQL Editor](https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql)
2. Ejecutar el script `diagnostics/REALTIME_DIAGNOSIS_MANUAL.sql`
3. Copiar resultados de cada sección

**Qué buscar:**
- ✅ Funciones con `realtime.broadcast_changes` o `realtime.send`
- ✅ Triggers `AFTER INSERT/UPDATE/DELETE` en tablas de alto tráfico
- ⚠️ Sesiones con `duration_seconds > 5`
- ⚠️ Locks no granted (`granted = false`)
- ❌ Columnas RLS sin índice (user_id, booking_id, car_id)
- ❌ Tablas con `dead_row_pct > 20%`

### Paso 1.2: Identificar Cuellos de Botella

**Preguntas clave:**
1. ¿Qué tablas tienen más `total_changes`?
2. ¿Cuáles tienen `index_usage_pct < 50%`?
3. ¿Hay triggers que hacen JOINs complejos antes de broadcast?
4. ¿Las políticas RLS usan subqueries sin índices?

---

## 🚀 **Fase 2: Mitigaciones Rápidas** (HOY - 2 horas)

### 2.1. Crear Índices Faltantes

**Índices Críticos para RLS:**

```sql
-- Índices en columnas user_id (si no existen)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_locatario_id
    ON bookings(locatario_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_locador_id
    ON bookings(locador_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_user_id
    ON cars(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_user_id
    ON wallet_transactions(user_id);

-- Índices en claves foráneas (si no existen)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_car_id
    ON bookings(car_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_car_images_car_id
    ON car_images(car_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_booking_id
    ON reviews(booking_id);

-- Índices compuestos para queries comunes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_dates
    ON bookings(status, start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_status_location
    ON cars(status, location_lat, location_lng)
    WHERE status = 'active';
```

**Por qué:**
- `CONCURRENTLY`: No bloquea escrituras durante la creación
- `IF NOT EXISTS`: Seguro de ejecutar sin errores
- Columnas RLS: Aceleran `WHERE user_id = auth.uid()`
- Columnas FK: Aceleran JOINs en triggers y queries

### 2.2. Optimizar Triggers de Realtime

**Problema:** Triggers que emiten payloads grandes o hacen JOINs complejos.

**Solución: Trigger Minimalista**

```sql
-- Ejemplo: trigger en tabla 'bookings'
-- ANTES (MAL - emite todo el row + joins):
CREATE OR REPLACE FUNCTION notify_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'booking', row_to_json(NEW),
      'car', (SELECT row_to_json(c) FROM cars c WHERE c.id = NEW.car_id),
      'locador', (SELECT row_to_json(p) FROM profiles p WHERE p.id = NEW.locador_id)
    ),
    'bookings',
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DESPUÉS (BIEN - solo campos esenciales):
CREATE OR REPLACE FUNCTION notify_booking_change_v2()
RETURNS TRIGGER AS $$
DECLARE
  changed_columns text[];
BEGIN
  -- Solo broadcast si cambios relevantes
  IF (TG_OP = 'UPDATE') THEN
    changed_columns := ARRAY(
      SELECT key FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
    );

    -- No emitir si solo cambió 'updated_at'
    IF changed_columns = ARRAY['updated_at'] THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Payload mínimo
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id,
      'event_type', TG_OP,
      'status', NEW.status,
      'changed_columns', changed_columns
    ),
    'bookings:' || NEW.id::text,  -- Topic granular
    null
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reemplazar trigger
DROP TRIGGER IF EXISTS on_booking_change ON bookings;
CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_change_v2();
```

**Beneficios:**
- ✅ Payload reducido (< 500 bytes vs varios KB)
- ✅ No JOINs en trigger (0 locks adicionales)
- ✅ Solo broadcast en cambios relevantes
- ✅ Topic granular (`bookings:123` vs `bookings`)

### 2.3. Configurar Topics Granulares

**En el Frontend (Angular):**

```typescript
// ANTES (MAL - todos los clientes reciben todos los mensajes):
supabase
  .channel('bookings')  // Canal global
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings'
  }, (payload) => {
    // Todos los updates de todas las bookings
  })
  .subscribe();

// DESPUÉS (BIEN - solo mis bookings):
const userId = await this.authService.getUserId();
supabase
  .channel(`bookings:user:${userId}`)  // Canal específico
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings',
    filter: `locatario_id=eq.${userId}`  // Filtro RLS
  }, (payload) => {
    // Solo mis bookings
  })
  .subscribe();
```

**Beneficios:**
- ✅ Menos clientes procesando cada mensaje
- ✅ Menos tráfico de red
- ✅ Mejor rendimiento en mobile

---

## 🔧 **Fase 3: Optimizaciones Medias** (MAÑANA - 4 horas)

### 3.1. Refactorizar Políticas RLS Pesadas

**Identificar políticas lentas:**

```sql
-- Ver políticas que usan subqueries
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text ILIKE '%SELECT%' OR qual::text ILIKE '%EXISTS%');
```

**Ejemplo de refactor:**

```sql
-- ANTES (LENTO - subquery en cada row):
CREATE POLICY "Users can view their bookings" ON bookings
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth.uid() = id
    )
  );

-- DESPUÉS (RÁPIDO - comparación directa):
CREATE POLICY "Users can view their bookings" ON bookings
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- O si necesitas lógica compleja, usa función STABLE:
CREATE OR REPLACE FUNCTION auth.user_can_view_booking(booking_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = booking_id
      AND (locatario_id = auth.uid() OR locador_id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "Users can view their bookings" ON bookings
  FOR SELECT USING (
    auth.user_can_view_booking(id)
  );
```

### 3.2. Implementar Throttling en Frontend

**Para evitar sobrecarga en conexiones:**

```typescript
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Debounce updates de UI
this.bookingUpdates$
  .pipe(
    debounceTime(500),  // Esperar 500ms antes de procesar
    distinctUntilChanged()  // Solo si cambió
  )
  .subscribe(update => {
    this.updateUI(update);
  });
```

### 3.3. Vacuum y Analyze

**Si hay `dead_row_pct > 10%`:**

```sql
-- Vacuum agresivo en tablas problemáticas
VACUUM ANALYZE bookings;
VACUUM ANALYZE notifications;
VACUUM ANALYZE wallet_transactions;
```

---

## 🏗️ **Fase 4: Arquitectura Asíncrona** (PRÓXIMA SEMANA - 1 día)

### 4.1. Cola de Mensajes Lightweight

**Problema:** Triggers síncronos bloquean la escritura.

**Solución:** Trigger escribe en cola, worker procesa async.

```sql
-- Tabla de cola (muy ligera)
CREATE TABLE IF NOT EXISTS realtime.message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_message_queue_created_at ON realtime.message_queue(created_at);

-- Trigger minimalista (sin JOINs ni lógica)
CREATE OR REPLACE FUNCTION enqueue_realtime_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO realtime.message_queue (event_type, table_name, record_id)
  VALUES (TG_OP, TG_TABLE_NAME, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas de alto tráfico
CREATE TRIGGER booking_realtime_queue
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_realtime_message();
```

**Edge Function Worker:**

```typescript
// supabase/functions/process-realtime-queue/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Procesar cola en lotes
  const { data: messages } = await supabase
    .from('realtime.message_queue')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100);

  for (const msg of messages || []) {
    // Expandir datos (con JOINs si necesario)
    const { data: fullRecord } = await supabase
      .from(msg.table_name)
      .select('*, related_data(*)')
      .eq('id', msg.record_id)
      .single();

    // Broadcast con datos completos
    await supabase.realtime.send(
      fullRecord,
      `${msg.table_name}:${msg.record_id}`,
      null
    );

    // Eliminar de cola
    await supabase
      .from('realtime.message_queue')
      .delete()
      .eq('id', msg.id);
  }

  return new Response('OK', { status: 200 });
});
```

**Invocar con pg_cron cada 10 segundos:**

```sql
SELECT cron.schedule(
  'process-realtime-queue',
  '*/10 * * * * *',  -- Cada 10 segundos
  $$SELECT net.http_post(
    'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/process-realtime-queue',
    '{}'::jsonb
  )$$
);
```

---

## 📈 **Métricas de Éxito**

| Métrica | Antes | Meta | Medición |
|---------|-------|------|----------|
| Latencia broadcast | ? | <100ms | Realtime logs |
| Queries bloqueadas | ? | 0 | `pg_locks` |
| Index usage | ? | >80% | `pg_stat_user_tables` |
| Dead rows | ? | <5% | `pg_stat_user_tables` |
| Payload size | ? | <1KB | Realtime dashboard |

---

## ✅ **Checklist de Implementación**

### Hoy (Mitigaciones Rápidas)
- [ ] Ejecutar diagnóstico SQL manual
- [ ] Crear índices faltantes en `user_id`, `car_id`, `booking_id`
- [ ] Optimizar trigger más usado (ej: `bookings`)
- [ ] Implementar topic granular en 1 componente crítico

### Mañana (Optimizaciones Medias)
- [ ] Refactorizar 3 políticas RLS lentas
- [ ] Añadir debounce a subscripciones Realtime
- [ ] Vacuum tables con `dead_row_pct > 10%`
- [ ] Documentar hallazgos del diagnóstico

### Próxima Semana (Arquitectura)
- [ ] Implementar cola de mensajes
- [ ] Crear Edge Function worker
- [ ] Configurar pg_cron job
- [ ] Monitorear métricas por 48h

---

## 🆘 **Troubleshooting**

### Si broadcasts siguen lentos después de Fase 2:
1. Revisar Realtime logs en Dashboard
2. Verificar que índices se usan: `EXPLAIN ANALYZE SELECT...`
3. Identificar triggers que hacen JOINs pesados
4. Considerar deshabilitar Realtime en tablas de muy alto volumen

### Si aparecen deadlocks:
1. Verificar orden de locks en transacciones
2. Reducir scope de triggers (solo columnas relevantes)
3. Usar `DEFERRABLE INITIALLY DEFERRED` en FKs

---

## 📞 **Próximos Pasos**

**¿Qué quieres hacer ahora?**

1. **Ejecutar diagnóstico manual** → Ir a SQL Editor y correr `REALTIME_DIAGNOSIS_MANUAL.sql`
2. **Aplicar índices ya** → Ejecutar sección 2.1 (índices críticos)
3. **Optimizar trigger específico** → Dime qué tabla tiene más tráfico
4. **Plan completo paso a paso** → Te guío en cada comando

**Responde con el número (1, 2, 3 o 4) y continuamos.**
