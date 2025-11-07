# Cómo aplicar la migración 20251106_fix_pending_payment_overlap.sql

Esta migración corrige el problema de disponibilidad de bookings incluyendo el estado `'pending_payment'` en todas las validaciones.

## Opción 1: Supabase Dashboard (RECOMENDADO)

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new
2. Copiar y pegar el contenido de `20251106_fix_pending_payment_overlap.sql`
3. Hacer click en "Run" (o RUN query)
4. Verificar que aparezcan los mensajes de éxito:
   ```
   ✅ Migración completada exitosamente
   📋 Funciones actualizadas: is_car_available, request_booking, get_available_cars
   🔒 Constraint actualizado: bookings_no_overlap
   ⚡ Índice creado: idx_bookings_car_overlap
   ```

## Opción 2: psql desde terminal

```bash
# Asegúrate de tener la variable SUPABASE_DB_PASSWORD configurada
export SUPABASE_DB_PASSWORD="tu-password-aqui"

# Ejecutar migración
cat supabase/migrations/20251106_fix_pending_payment_overlap.sql | \
PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
"postgresql://postgres.obxvffplochgeiclibng@db.obxvffplochgeiclibng.supabase.co:5432/postgres"
```

## Opción 3: Supabase CLI

```bash
# Asegúrate de tener Supabase CLI instalado
supabase link --project-ref obxvffplochgeiclibng

# Aplicar migración
supabase db push
```

## Verificación post-migración

Después de aplicar la migración, verifica que funcione correctamente:

```sql
-- 1. Verificar que la función is_car_available existe
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'is_car_available';

-- 2. Verificar que el constraint se actualizó
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'bookings_no_overlap';

-- 3. Verificar que el índice existe
SELECT indexname
FROM pg_indexes
WHERE indexname = 'idx_bookings_car_overlap';
```

## ¿Qué hace esta migración?

1. **Actualiza `is_car_available()`**: Ahora incluye `'pending_payment'` en estados que bloquean disponibilidad
2. **Actualiza `request_booking()`**: Valida overlaps considerando también `'pending_payment'`
3. **Actualiza constraint `bookings_no_overlap`**: Previene overlaps a nivel de base de datos
4. **Crea `get_available_cars()`**: Nueva función para listar autos disponibles
5. **Crea índice optimizado**: Mejora performance de queries de overlap

## Solución de problemas

### Error: "function already exists"
No hay problema, la migración usa `CREATE OR REPLACE FUNCTION`, sobrescribirá las funciones existentes.

### Error: "constraint already exists"
El script primero hace `DROP CONSTRAINT IF EXISTS`, así que no debería ocurrir. Si ocurre, ejecuta manualmente:
```sql
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
```
Y vuelve a ejecutar la migración.

### Error: "permission denied"
Asegúrate de estar conectado con el usuario `postgres` que tiene permisos de superusuario.

## Contacto

Si encuentras problemas, revisa:
- Logs de Supabase Dashboard: https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs
- GitHub Issues: https://github.com/ecucondorSA/autorenta/issues
