# PROMPT PARA DEBUGGING: Ordenamiento por Score en Marketplace

## Contexto del Problema

Estoy trabajando en un marketplace de alquiler de autos (AutoRenta) construido con:
- **Frontend**: Angular 17 (standalone components) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Funcionalidad**: Sistema de scoring dinámico para ordenar autos por relevancia

## Problema Principal

**El ordenamiento por score NO está funcionando correctamente**: Un auto a **1.8km** aparece **PRIMERO** en la lista, mientras que autos a **0m** aparecen **SEGUNDO y TERCERO**. Esto contradice la lógica de scoring que debería priorizar autos más cercanos.

### Evidencia Visual
- **Primer auto**: Ford Ka a **1.8km** (score debería ser menor)
- **Segundo auto**: Fiat Ducato a **0m** (score debería ser mayor)
- **Tercer auto**: Fiat Toro Volcano a **0m** (score debería ser mayor)

## Arquitectura del Sistema de Scoring

### 1. Base de Datos (PostgreSQL + PostGIS)

**Función RPC**: `public.get_available_cars()`
- Calcula un `score` dinámico basado en:
  - **Rating** (peso base: 0.40)
  - **Distancia** (peso dinámico: 0.70 si ≤5km, 0.60 si ≤15km, 0.105 si >15km)
  - **Precio** (peso base: 0.15)
  - **Auto-approval** (peso base: 0.10)

**Lógica de distancia**:
```sql
-- distance_component usa función exponencial:
-- 0km = 1.0, 1km = 0.98, 5km = 0.90, 15km = 0.75, 50km = 0.3, 100km+ = 0.05
CASE
  WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN 0.5
  ELSE GREATEST(0.05, 1.0 - POWER(LEAST((ST_DistanceSphere(...) / 1000.0) / 30.0, 1.0), 0.5))
END AS distance_component
```

**Peso dinámico de distancia**:
```sql
CASE
  WHEN distance_km <= 5 THEN 0.70  -- Máximo peso para distancias muy cercanas
  WHEN distance_km <= 15 THEN 0.60 -- Alto peso para distancias cercanas
  WHEN distance_km > 15 THEN w_distance_base * 0.3  -- Peso reducido para distancias lejanas
  ELSE w_distance_base
END AS w_distance_adj
```

### 2. Frontend (Angular 17)

**Componente**: `marketplace-v2.page.ts`

**Flujo de datos**:
1. `loadCars()` → Llama a `carsService.getAvailableCars()` con ubicación del usuario (o Buenos Aires por defecto)
2. `carsService.getAvailableCars()` → Llama a RPC `get_available_cars` con `p_lat` y `p_lng`
3. `carsWithDistance` → Calcula distancia en frontend usando Haversine para mostrar en UI
4. `visibleCars` → Ordena por `score` descendente (default) o por otros criterios

**Código de ordenamiento**:
```typescript
case 'score':
default:
  sortedCars.sort((a, b) => {
    const scoreA = (a as any).score ?? null;
    const scoreB = (b as any).score ?? null;

    if (scoreA === null && scoreB === null) return 0;
    if (scoreA === null) return 1; // null scores al final
    if (scoreB === null) return -1;

    return scoreB - scoreA; // Orden descendente
  });
```

## Cambios Realizados Hasta Ahora

### ✅ Fix 1: Ubicación por defecto
**Problema**: Sin ubicación del usuario, la RPC usaba `distance_component = 0.5` para todos los autos.
**Solución**: Usar Buenos Aires centro (-34.6037, -58.3816) como ubicación por defecto.

**Archivos modificados**:
- `apps/web/src/app/features/marketplace/marketplace-v2.page.ts` (líneas 503-528)
- `apps/web/src/app/features/marketplace/marketplace-v2.page.ts` (líneas 272-282)

### ✅ Fix 2: Pesos dinámicos de distancia
**Problema**: Distancias cercanas no tenían suficiente peso.
**Solución**: Aumentar peso para distancias ≤5km (0.70) y ≤15km (0.60).

**Archivos modificados**:
- `supabase/migrations/20251116_fix_scoring_weights.sql`
- `supabase/migrations/20251116_increase_close_distance_weight.sql`
- `supabase/migrations/20251116_aggressive_close_distance_priority.sql`

### ✅ Fix 3: Función exponencial más agresiva
**Problema**: `distance_component` no diferenciaba suficientemente entre 0m y 1.8km.
**Solución**: Usar función exponencial más agresiva (exponente 0.5, normalización por 30km).

## Evidencia del Problema

### Query SQL - Scores Actuales
```sql
SELECT
  brand,
  model,
  price_per_day,
  distance_km,
  score,
  ROW_NUMBER() OVER (ORDER BY score DESC) as rank
FROM get_available_cars(
  now()::timestamptz,
  (now() + interval '1 day')::timestamptz,
  -34.6037,
  -58.3816,
  20,
  0
)
ORDER BY score DESC
LIMIT 10;
```

**Resultado esperado** (pero NO es lo que vemos en UI):
- Ford Ka (1.8km): score 0.5878, rank 1 ❌
- Fiat Ducato (0m): score 0.5777, rank 2 ❌
- Fiat Toro Volcano (0m): score 0.5776, rank 3 ❌

**Problema**: El Ford Ka a 1.8km tiene score MÁS ALTO que autos a 0m, lo cual es incorrecto.

### Logs del Frontend
```
⚠️ NO USER LOCATION - Using default location (Buenos Aires centro) for scoring
🔍 Calling getAvailableCars with: { lat: -34.6037, lng: -58.3816, ... }
✅ RPC Success - Data length: 11
✅ Final sorted order: [
  { brand: 'Ford', distance: 1.8, score: 0.5878, price: 25000 },
  { brand: 'Fiat Ducato', distance: 0, score: 0.5777, price: 90 },
  { brand: 'Fiat Toro Volcano', distance: 0, score: 0.5776, price: 65 }
]
```

## Análisis del Problema

### Hipótesis 1: El precio está compensando la distancia
- **Ford Ka**: $25,000/día (MUY caro) pero a 1.8km
- **Fiat Ducato**: $90/día (barato) a 0m
- **Fiat Toro Volcano**: $65/día (más barato) a 0m

**Problema**: El `price_component` puede estar dando un boost al Ford Ka porque es "diferente" del promedio, pero esto NO debería compensar la distancia cercana.

### Hipótesis 2: El rating está afectando el score
- Todos los autos tienen `avg_rating = 0` (sin reviews)
- `rating_component = 0 / 5.0 = 0.0` para todos
- Esto NO debería afectar la diferencia entre autos

### Hipótesis 3: El cálculo de `distance_component` no es suficientemente diferenciador
- **0m**: `distance_component ≈ 1.0`
- **1.8km**: `distance_component ≈ 0.98` (diferencia muy pequeña)

**Problema**: La diferencia entre 0m y 1.8km en `distance_component` es solo 0.02, lo cual puede no ser suficiente cuando se multiplica por el peso.

### Hipótesis 4: El peso de distancia no se está aplicando correctamente
- **0m**: `w_distance_adj = 0.70` (peso máximo)
- **1.8km**: `w_distance_adj = 0.70` (también peso máximo, porque ≤5km)

**Problema**: Ambos tienen el mismo peso, pero el `distance_component` es ligeramente diferente (1.0 vs 0.98).

## Lo Que Necesito Resolver

### Objetivo
**Autos a 0m DEBEN aparecer ANTES que autos a 1.8km**, independientemente de precio o rating.

### Requisitos
1. **Prioridad absoluta a distancia cercana**: Un auto a 0m debe tener score significativamente mayor que uno a 1.8km.
2. **Mantener otros factores**: Rating, precio y auto-approval deben seguir influyendo, pero NO deben compensar la distancia cercana.
3. **Consistencia**: El ordenamiento en la UI debe coincidir con el ordenamiento de la RPC.

### Preguntas Específicas
1. ¿Por qué el Ford Ka a 1.8km tiene score 0.5878 mientras que el Fiat Ducato a 0m tiene score 0.5777?
2. ¿Cómo puedo ajustar la fórmula de scoring para que la distancia cercana (0-5km) tenga prioridad absoluta?
3. ¿Debo cambiar la función exponencial de `distance_component` o los pesos dinámicos?
4. ¿Hay algún problema con cómo el frontend está ordenando los resultados?

## Archivos Clave para Revisar

1. **`supabase/migrations/20251116_fix_scoring_weights.sql`** - Función RPC completa
2. **`apps/web/src/app/features/marketplace/marketplace-v2.page.ts`** - Lógica de ordenamiento frontend
3. **`apps/web/src/app/core/services/cars.service.ts`** - Mapeo de respuesta RPC
4. **`apps/web/src/app/core/services/distance-calculator.service.ts`** - Cálculo de distancia Haversine

## Comandos Útiles para Debugging

```bash
# Ver scores actuales en DB
psql "$DATABASE_URL" -c "
SELECT
  brand,
  model,
  price_per_day,
  score,
  (location->>'lat')::numeric as lat,
  (location->>'lng')::numeric as lng
FROM get_available_cars(
  now()::timestamptz,
  (now() + interval '1 day')::timestamptz,
  -34.6037,
  -58.3816,
  10,
  0
)
ORDER BY score DESC
LIMIT 5;
"

# Ver logs del frontend
# Abrir http://localhost:4200 y revisar console del navegador
# Buscar: "✅ Final sorted order"
```

## Resultado Esperado

Después del fix, el ordenamiento debería ser:
1. **Fiat Ducato** (0m, score ~0.65)
2. **Fiat Toro Volcano** (0m, score ~0.64)
3. **Ford Ka** (1.8km, score ~0.58)
4. Otros autos más lejanos...

## Estado Actual del Problema

**Última verificación (2025-11-17)**:
- Migración `20251117_prioritize_close_distance_scoring.sql` aplicada
- Cálculo manual muestra que auto a 0km debería tener score **0.679** vs auto a 1.77km con score **0.578**
- Pero la query real muestra que auto a 0km tiene score **0.5185** (más bajo)
- **Discrepancia**: El score calculado manualmente (0.679) no coincide con el score real de la función (0.5185)

**Posibles causas**:
1. La función en la base de datos no tiene los cambios más recientes
2. Hay un problema con la comparación `distance_km <= 1` cuando `distance_km = 0` exactamente
3. Hay algún otro factor (rating, bookings, etc.) que no estoy considerando en el cálculo manual

**Cambios aplicados en la migración**:
- Peso de distancia para 0-1km: **0.90** (aumentado desde 0.80)
- Peso de precio para 0-1km: **0.015** (0.15 * 0.1, reducido desde 0.15)
- Peso de auto_approval para 0-1km: **0.01** (0.10 * 0.1, reducido desde 0.10)
- Función exponencial: `1.0 - POWER(LEAST(distance_km / 30.0, 1.0), 0.5)`
- Tie-breaker: `ORDER BY score DESC, distance_km ASC NULLS LAST, created_at DESC`

---

**¿Puedes ayudarme a identificar y resolver este problema de ordenamiento por score?**

