# 🚀 Instrucciones de Despliegue - Vehicle-Aware Pricing

## Paso 1: Abrir SQL Editor de Supabase

1. Ve a: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx
2. En el menú izquierdo, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"** (botón superior derecho)

## Paso 2: Copiar y Ejecutar el SQL

### Opción A: Desde el archivo (recomendado)

1. Abre el archivo: `/home/edu/autorenta/DEPLOY_VEHICLE_PRICING.sql`
2. Selecciona TODO el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en el SQL Editor de Supabase (Ctrl+V)
5. Haz clic en **"Run"** (o presiona Ctrl+Enter)

### Opción B: Desde la terminal

```bash
# Copiar al portapapeles (si tienes xclip instalado)
cat /home/edu/autorenta/DEPLOY_VEHICLE_PRICING.sql | xclip -selection clipboard

# Luego pega en el SQL Editor de Supabase
```

## Paso 3: Verificar Resultados

Al final de la ejecución, deberías ver en la consola de resultados:

```
table_name           | count
---------------------|-------
vehicle_categories   | 4
vehicle_pricing_models | ~60
cars_with_category   | (100% de tus autos)

category  | cars_count | avg_value_usd
----------|------------|---------------
Económico | X          | ~$7,000
Estándar  | X          | ~$16,000
Premium   | X          | ~$27,000
Lujo      | X          | ~$45,000
```

## Paso 4: Verificación Manual (opcional)

Si quieres verificar manualmente, ejecuta estas queries en SQL Editor:

```sql
-- 1. Verificar categorías
SELECT code, name_es, base_daily_rate_pct, depreciation_rate_annual
FROM vehicle_categories
ORDER BY display_order;

-- 2. Verificar modelos de pricing
SELECT brand, model, base_value_usd,
       (SELECT name_es FROM vehicle_categories WHERE id = category_id) AS category
FROM vehicle_pricing_models
WHERE brand IN ('Toyota', 'Fiat', 'Mercedes-Benz')
ORDER BY base_value_usd;

-- 3. Verificar que todos los autos tienen categoría
SELECT COUNT(*) AS total_cars,
       COUNT(category_id) AS cars_with_category,
       CASE
         WHEN COUNT(*) = COUNT(category_id) THEN '✅ OK'
         ELSE '❌ ERROR'
       END AS status
FROM cars;

-- 4. Probar función de pricing para un auto (reemplaza car_id y region_id)
SELECT calculate_vehicle_base_price(
  'tu-car-id-aqui'::UUID,
  'tu-region-id-aqui'::UUID
);
```

## Paso 5: Siguiente - Desplegar FIPE Edge Function

Una vez verificado que las migraciones funcionan, ejecuta:

```bash
./tools/setup-fipe-token.sh
supabase functions deploy sync-fipe-values
```

## ⚠️ Si hay Errores

### Error: "table already exists"
- Esto es OK, significa que la tabla ya fue creada
- La migración usa `CREATE TABLE IF NOT EXISTS` así que es seguro

### Error: "function already exists"
- Ejecuta: `DROP FUNCTION nombre_funcion CASCADE;`
- Luego vuelve a ejecutar la migración

### Error: "column already exists"
- Ejecuta: `ALTER TABLE cars DROP COLUMN IF EXISTS category_id CASCADE;`
- Luego vuelve a ejecutar la migración

### Error de timeout
- Divide el archivo SQL en partes más pequeñas
- Ejecuta las migraciones una por una desde los archivos en `supabase/migrations/20251111_*.sql`

## 📞 Ayuda

Si tienes problemas, comparte:
1. El error exacto que te sale
2. Captura de pantalla del SQL Editor
3. Resultado de: `SELECT version();` en SQL Editor
