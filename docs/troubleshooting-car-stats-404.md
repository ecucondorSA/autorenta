# ⚠️ Error 404: car_stats table not found

## Problema

La aplicación está intentando acceder a la tabla `car_stats` que no existe en la base de datos remota de Supabase.

```
GET https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/car_stats?select=... 404 (Not Found)
```

## Solución Rápida

### Opción 1: Script Automatizado (Recomendado)

```bash
# Aplicar migración
./scripts/apply-car-stats-migration.sh
```

### Opción 2: Manual

```bash
# 1. Aplicar todas las migraciones pendientes
npx supabase db push --include-all

# 2. Verificar que la tabla existe
npx supabase db execute "SELECT COUNT(*) FROM public.car_stats"

# 3. Regenerar tipos de TypeScript
npm run sync:types
```

## Qué hace la migración

La migración `20251114_create_missing_tables.sql` crea:

1. **Tabla `car_stats`**: Estadísticas agregadas de cada auto
   - reviews_count
   - rating_avg
   - total_bookings
   - completed_bookings
   - cancelled_bookings
   - etc.

2. **Índices**: Para optimizar queries
   - idx_car_stats_car_id
   - idx_car_stats_rating
   - idx_car_stats_bookings

3. **RLS Policies**: 
   - Anyone can view car stats (público)
   - Car owners can update (dueños)

4. **Función `get_car_stats()`**: Obtiene o crea stats automáticamente

5. **Inicialización**: Crea stats para todos los autos existentes

## Verificación

```bash
# Ver stats de todos los autos
npx supabase db execute "SELECT car_id, reviews_count, rating_avg, total_bookings FROM public.car_stats LIMIT 10"

# Ver stats de un auto específico
npx supabase db execute "SELECT * FROM public.car_stats WHERE car_id = 'e4b6542a-8bb9-466d-83bc-54b999a7aec9'"

# Contar autos con reviews
npx supabase db execute "SELECT COUNT(*) as cars_with_reviews FROM public.car_stats WHERE reviews_count > 0"
```

## Troubleshooting

### Error: "relation car_stats does not exist"

```bash
# Verificar que la migración existe
ls -la supabase/migrations/20251114_create_missing_tables.sql

# Aplicar todas las migraciones
npx supabase db push --include-all
```

### Error: "permission denied for table car_stats"

```bash
# Verificar RLS policies
npx supabase db execute "SELECT * FROM pg_policies WHERE tablename = 'car_stats'"

# Re-aplicar RLS policies
npx supabase db execute "$(cat supabase/migrations/20251114_create_missing_tables.sql)"
```

### Error: "duplicate key value violates unique constraint"

```bash
# Limpiar datos duplicados (si existen)
npx supabase db execute "
DELETE FROM public.car_stats 
WHERE car_id IN (
  SELECT car_id FROM public.car_stats 
  GROUP BY car_id HAVING COUNT(*) > 1
)
"

# Re-inicializar stats
npx supabase db execute "
INSERT INTO public.car_stats (car_id, reviews_count, rating_avg, total_bookings)
SELECT id, 0, 0.00, 0
FROM public.cars
ON CONFLICT (car_id) DO NOTHING
"
```

## Después de aplicar la migración

1. **Regenerar tipos**: `npm run sync:types`
2. **Reiniciar dev server**: `pnpm run dev`
3. **Verificar en la app**: Navegar a lista de autos y verificar que no hay errores 404
4. **Verificar stats**: Abrir detalle de un auto y verificar que muestra estadísticas

## Servicios que usan car_stats

- `reviews.service.ts`: Carga estadísticas de reviews
- `car-locations.service.ts`: Filtra autos por rating
- `cars-map.component.ts`: Muestra stats en el mapa

## Archivos relacionados

- Migración: `supabase/migrations/20251114_create_missing_tables.sql`
- Script: `scripts/apply-car-stats-migration.sh`
- Servicio: `apps/web/src/app/core/services/reviews.service.ts`
