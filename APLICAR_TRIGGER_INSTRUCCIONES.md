# 🔌 APLICAR TRIGGER CON POOLING - Instrucciones

## ❌ Problema Encontrado

No se puede aplicar el trigger automáticamente porque:
- El Transaction Pooler de Supabase no soporta algunos comandos DDL (CREATE TRIGGER)
- La conexión directa está bloqueada por firewall o timeout

## ✅ SOLUCIÓN: Aplicar manualmente en Supabase Dashboard

### Opción 1: Supabase SQL Editor (RECOMENDADO - 2 minutos)

1. **Abrir SQL Editor:**
   ```
   https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new
   ```

2. **Copiar el contenido del archivo:**
   ```bash
   cat /home/edu/autorenta/supabase/migrations/20251027_trigger_chat_notifications.sql
   ```

3. **Pegar en el editor y ejecutar** (botón RUN)

4. **Verificar éxito:**
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notify_new_chat_message';
   ```
   Debería devolver 1 fila

---

### Opción 2: psql desde tu máquina local

Si tienes psql instalado:

```bash
cd /home/edu/autorenta

PGPASSWORD='ECUCONDOR08122023' psql \
  'postgresql://postgres:ECUCONDOR08122023@db.obxvffplochgeiclibng.supabase.co:5432/postgres?sslmode=require' \
  -f supabase/migrations/20251027_trigger_chat_notifications.sql
```

**Nota:** Puede tardar si hay firewall o restricciones de red.

---

### Opción 3: Supabase CLI

Si tienes Supabase CLI instalado:

```bash
cd /home/edu/autorenta

# Link al proyecto
supabase link --project-ref obxvffplochgeiclibng

# Aplicar migración
supabase db push
```

---

## 🧪 VERIFICAR QUE EL TRIGGER ESTÁ APLICADO

### En Supabase SQL Editor:

```sql
-- 1. Verificar trigger
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_notify_new_chat_message';

-- 2. Verificar función
SELECT proname, prolang, prosecdef
FROM pg_proc
WHERE proname = 'notify_new_chat_message';

-- 3. Probar trigger (insertar mensaje de prueba)
-- IMPORTANTE: Reemplazar los UUIDs con valores reales de tu DB
INSERT INTO public.messages (sender_id, recipient_id, booking_id, body)
VALUES (
  'tu-user-id-real',       -- Reemplazar
  'otro-user-id-real',      -- Reemplazar
  'booking-id-real',        -- Reemplazar
  'Mensaje de prueba para verificar trigger'
);

-- 4. Verificar que se creó la notificación
SELECT * FROM public.notifications
WHERE type = 'new_chat_message'
ORDER BY created_at DESC
LIMIT 1;
```

Si el último query devuelve una notificación, **¡el trigger funciona!** ✅

---

## 📋 CONTENIDO DEL SQL A APLICAR

El archivo está en:
```
/home/edu/autorenta/supabase/migrations/20251027_trigger_chat_notifications.sql
```

**Tamaño:** ~120 líneas  
**Tiempo de ejecución:** ~1 segundo

**Lo que hace:**
1. Crea función `notify_new_chat_message()`
2. Crea trigger `trigger_notify_new_chat_message` en tabla `messages`
3. Cada vez que se inserta un mensaje, crea notificación automáticamente

---

## 🔐 CREDENCIALES UTILIZADAS

- **Host:** `db.obxvffplochgeiclibng.supabase.co`
- **Puerto:** `5432` (directo) o `6543` (pooler)
- **Usuario:** `postgres`
- **Contraseña:** `ECUCONDOR08122023`
- **Database:** `postgres`

**Pooler URL (Transaction mode):**
```
postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Nota:** El pooler NO soporta DDL commands (CREATE TRIGGER), usar conexión directa o Dashboard.

---

## ✅ DESPUÉS DE APLICAR

Una vez aplicado el trigger:

1. ✅ Cada mensaje nuevo creará automáticamente una notificación
2. ✅ La notificación incluirá:
   - Nombre del remitente
   - Contexto del auto (si hay booking_id)
   - Link directo al chat
   - Preview del mensaje (100 caracteres)

3. ✅ Los propietarios verán notificaciones persistentes incluso si están offline

---

## 🆘 SI HAY PROBLEMAS

### Error: "relation already exists"
**Solución:** El trigger ya está aplicado, no hacer nada.

### Error: "permission denied"
**Solución:** Usar Dashboard con usuario admin.

### Error: "function does not exist"
**Solución:** Verificar que se ejecutó TODO el SQL (función + trigger).

---

**Fecha:** 2025-10-27  
**Estado:** Pendiente de aplicación manual
