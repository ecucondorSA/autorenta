# 📋 Instrucciones para Aplicar Migraciones - Nov 2025

## 🎯 Migraciones a Aplicar

1. **20251104_fix_booking_overlap_validation.sql** - Fix para race condition en bookings
2. **20251104_create_booking_waitlist.sql** - Sistema de cola de espera (waitlist)

---

## 📝 Método 1: Supabase Dashboard (Recomendado)

### Paso 1: Abrir SQL Editor
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `obxvffplochgeiclibng`
3. Navega a **SQL Editor** en el menú lateral

### Paso 2: Aplicar Migración 1 (Fix Overlap Validation)
1. Abre el archivo: `supabase/migrations/20251104_fix_booking_overlap_validation.sql`
2. Copia TODO el contenido del archivo
3. Pega en el SQL Editor de Supabase
4. Haz clic en **RUN** (o presiona `Ctrl+Enter`)
5. Verifica que no haya errores

### Paso 3: Aplicar Migración 2 (Waitlist System)
1. Abre el archivo: `supabase/migrations/20251104_create_booking_waitlist.sql`
2. Copia TODO el contenido del archivo
3. Pega en el SQL Editor de Supabase
4. Haz clic en **RUN** (o presiona `Ctrl+Enter`)
5. Verifica que no haya errores

---

## 🔧 Método 2: Supabase CLI (Alternativo)

Si tienes el CLI configurado:

```bash
# Desde el directorio raíz del proyecto
cd /home/edu/autorenta

# Aplicar migraciones pendientes
npx supabase db push

# O aplicar una migración específica
npx supabase migration up 20251104_fix_booking_overlap_validation
npx supabase migration up 20251104_create_booking_waitlist
```

---

## ✅ Verificación Post-Migración

Después de aplicar las migraciones, verifica que todo esté correcto:

### 1. Verificar funciones RPC actualizadas

```sql
-- Verificar que is_car_available incluye 'pending'
SELECT prosrc FROM pg_proc 
WHERE proname = 'is_car_available';

-- Debe mostrar: status IN ('pending', 'confirmed', 'in_progress')
```

### 2. Verificar que request_booking incluye 'pending'

```sql
-- Verificar que request_booking incluye 'pending'
SELECT prosrc FROM pg_proc 
WHERE proname = 'request_booking';

-- Debe mostrar: status IN ('pending', 'confirmed', 'in_progress')
```

### 3. Verificar tabla booking_waitlist

```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'booking_waitlist';

-- Debe retornar: booking_waitlist
```

### 4. Verificar funciones de waitlist

```sql
-- Verificar funciones de waitlist
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'add_to_waitlist',
  'remove_from_waitlist',
  'get_my_waitlist',
  'get_waitlist_count',
  'cleanup_expired_waitlist'
);

-- Debe retornar las 5 funciones
```

### 5. Verificar trigger de waitlist

```sql
-- Verificar trigger
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_waitlist_on_booking_change';

-- Debe retornar el trigger
```

---

## 🔄 Configurar Cron Job (Opcional pero Recomendado)

Para limpiar bookings expirados automáticamente:

### En Supabase Dashboard:
1. Ve a **Database** → **Cron Jobs**
2. Crea un nuevo cron job:
   - **Name**: `expire_pending_bookings`
   - **Schedule**: `*/5 * * * *` (cada 5 minutos)
   - **SQL**: 
     ```sql
     SELECT expire_pending_bookings();
     SELECT cleanup_expired_waitlist();
     ```

Esto ejecutará automáticamente:
- `expire_pending_bookings()` - Expira bookings pending pasados de tiempo
- `cleanup_expired_waitlist()` - Limpia waitlist expiradas

---

## 🐛 Troubleshooting

### Error: "function already exists"
Si alguna función ya existe, la migración la reemplazará automáticamente con `CREATE OR REPLACE FUNCTION`.

### Error: "permission denied"
Asegúrate de estar usando el rol correcto. Las funciones usan `SECURITY DEFINER` para ejecutarse con permisos elevados.

### Error: "constraint already exists"
Si el constraint `bookings_no_overlap` ya existe, no es necesario crearlo de nuevo. Las migraciones solo actualizan las funciones que verifican disponibilidad.

---

## 📊 Estado Esperado Después de Migraciones

### Funciones Actualizadas:
- ✅ `is_car_available()` - Ahora incluye 'pending' en validación
- ✅ `request_booking()` - Ahora incluye 'pending' en validación
- ✅ `get_available_cars()` - Ahora incluye 'pending' en validación

### Nuevas Funciones:
- ✅ `add_to_waitlist()` - Agregar usuario a waitlist
- ✅ `remove_from_waitlist()` - Remover usuario de waitlist
- ✅ `get_my_waitlist()` - Obtener waitlist del usuario
- ✅ `get_waitlist_count()` - Contar usuarios en waitlist
- ✅ `cleanup_expired_waitlist()` - Limpiar waitlist expiradas

### Nuevas Tablas:
- ✅ `booking_waitlist` - Tabla de usuarios en espera

### Nuevos Triggers:
- ✅ `trigger_notify_waitlist_on_booking_change` - Notifica waitlist cuando booking expira

---

## 🎉 Una vez completado

1. ✅ Las validaciones de disponibilidad ahora incluyen bookings 'pending'
2. ✅ Los usuarios pueden agregarse a waitlist cuando hay conflicto
3. ✅ Los usuarios reciben notificaciones automáticas cuando bookings expiran
4. ✅ El sistema previene race conditions correctamente

---

**Última actualización**: 2025-11-04



