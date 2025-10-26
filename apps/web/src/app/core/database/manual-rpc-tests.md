# Manual RPC Tests - AutoRenta Database

Este documento contiene tests manuales para ejecutar en Supabase SQL Editor y verificar el correcto funcionamiento de las funciones RPC críticas.

## 🎯 Objetivo

Verificar que todas las funciones RPC estén correctamente implementadas, optimizadas y retornen los datos esperados.

## 📋 Pre-requisitos

1. Acceso al Supabase SQL Editor
2. Base de datos con datos de prueba (ver sección "Datos de Prueba")
3. Usuario autenticado para tests de RLS

---

## 1. Verificar que las RPCs existen

### Test: Lista de funciones RPC

```sql
-- Verificar que todas las RPCs críticas existan
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION'
AND routine_schema = 'public'
AND routine_name IN (
    'get_available_cars',
    'is_car_available',
    'request_booking',
    'pricing_recalculate'
)
ORDER BY routine_name;
```

**Resultado Esperado:**
- Debe retornar 4 filas (una por cada RPC)
- `routine_type` debe ser 'FUNCTION'
- Cada función debe tener `routine_definition` no vacío

---

## 2. RPC: get_available_cars

### Test 2.1: Búsqueda básica por ciudad

```sql
-- Buscar autos disponibles en Buenos Aires
SELECT * FROM get_available_cars(
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00',
    p_city := 'Buenos Aires',
    p_category := NULL
);
```

**Resultado Esperado:**
- Array de autos disponibles en Buenos Aires
- Cada auto debe tener: `id`, `brand`, `model`, `year`, `price_per_day`, `city`
- Solo autos con `is_available = true`
- Solo autos SIN bookings conflictivos en esas fechas

### Test 2.2: Filtrar por categoría

```sql
-- Buscar solo sedans en Córdoba
SELECT * FROM get_available_cars(
    p_start_date := '2025-11-10 10:00:00+00',
    p_end_date := '2025-11-15 18:00:00+00',
    p_city := 'Córdoba',
    p_category := 'sedan'
);
```

**Resultado Esperado:**
- Solo autos de categoría 'sedan'
- Todos en la ciudad de Córdoba

### Test 2.3: Sin resultados (ningún auto disponible)

```sql
-- Buscar en fechas donde todos los autos están reservados
SELECT * FROM get_available_cars(
    p_start_date := '2025-12-24 10:00:00+00', -- Navidad
    p_end_date := '2025-12-26 18:00:00+00',
    p_city := 'Buenos Aires',
    p_category := NULL
);
```

**Resultado Esperado:**
- Array vacío o muy pocos resultados
- No debe generar error

### Test 2.4: Performance con índices

```sql
-- Verificar que usa índices (ejecutar con EXPLAIN ANALYZE)
EXPLAIN ANALYZE
SELECT * FROM get_available_cars(
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00',
    p_city := 'Buenos Aires',
    p_category := 'suv'
);
```

**Resultado Esperado:**
- Execution Time < 100ms (con 1000+ autos y 10k+ bookings)
- Debe usar `idx_cars_city`, `idx_cars_category`, `idx_bookings_car_dates`
- NO debe hacer Sequential Scan en bookings

---

## 3. RPC: is_car_available

### Test 3.1: Auto disponible (sin conflictos)

```sql
-- Verificar auto disponible
-- Reemplazar 'car-uuid-here' con un UUID real de tu DB
SELECT is_car_available(
    p_car_id := 'car-uuid-here',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00'
) AS is_available;
```

**Resultado Esperado:**
- Retorna `true` si no hay bookings conflictivos
- Retorna `false` si hay overlap

### Test 3.2: Auto ocupado (conflicto de fechas)

```sql
-- Intentar reservar en fechas ocupadas
-- Primero, encontrar un booking existente:
SELECT car_id, start_at, end_at 
FROM bookings 
WHERE status IN ('pending', 'confirmed')
LIMIT 1;

-- Luego, verificar disponibilidad en esas mismas fechas:
SELECT is_car_available(
    p_car_id := '<car_id from above>',
    p_start_date := '<start_at from above>',
    p_end_date := '<end_at from above>'
) AS should_be_false;
```

**Resultado Esperado:**
- Debe retornar `false` (auto ocupado)

### Test 3.3: Casos borde - Overlap parcial

```sql
-- Booking existente: 1-5 Nov
-- Nuevo booking: 3-7 Nov (overlap)
SELECT is_car_available(
    p_car_id := '<car_id>',
    p_start_date := '2025-11-03 10:00:00+00',
    p_end_date := '2025-11-07 18:00:00+00'
) AS should_be_false_overlap;
```

**Resultado Esperado:**
- Debe retornar `false` (overlap detectado)

### Test 3.4: Reservas consecutivas (sin overlap)

```sql
-- Booking existente termina: 5 Nov 18:00
-- Nuevo booking inicia: 6 Nov 10:00 (OK)
SELECT is_car_available(
    p_car_id := '<car_id>',
    p_start_date := '2025-11-06 10:00:00+00',
    p_end_date := '2025-11-10 18:00:00+00'
) AS should_be_true;
```

**Resultado Esperado:**
- Debe retornar `true` (no hay overlap)

---

## 4. RPC: request_booking

### Test 4.1: Crear booking exitoso

```sql
-- Crear booking en fechas disponibles
SELECT * FROM request_booking(
    p_car_id := '<available-car-uuid>',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00',
    p_total_amount := 50000
);
```

**Resultado Esperado:**
- Retorna objeto con:
  ```json
  {
    "booking_id": "uuid",
    "status": "pending",
    "created_at": "timestamp"
  }
  ```
- Booking insertado en tabla `bookings`

### Test 4.2: Fallo por auto no disponible

```sql
-- Intentar booking en fechas ocupadas
SELECT * FROM request_booking(
    p_car_id := '<busy-car-uuid>',
    p_start_date := '<overlapping-start>',
    p_end_date := '<overlapping-end>',
    p_total_amount := 50000
);
```

**Resultado Esperado:**
- Error: `Car is not available for the selected dates`
- Código de error: `P0001` (raise_exception)
- NO se crea el booking

### Test 4.3: Validación de fechas

```sql
-- Fecha fin antes que fecha inicio (inválido)
SELECT * FROM request_booking(
    p_car_id := '<car-uuid>',
    p_start_date := '2025-11-10 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00', -- ANTES del inicio
    p_total_amount := 50000
);
```

**Resultado Esperado:**
- Error: `End date must be after start date`
- NO se crea el booking

### Test 4.4: Verificar RLS (Row Level Security)

```sql
-- Ejecutar como usuario autenticado
SET LOCAL "request.jwt.claims" TO '{"sub": "test-user-uuid"}';

-- Crear booking
SELECT * FROM request_booking(
    p_car_id := '<car-uuid>',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00',
    p_total_amount := 50000
);

-- Verificar que el booking tiene el user_id correcto
SELECT id, user_id, car_id, status
FROM bookings
WHERE id = '<booking_id from above>';
```

**Resultado Esperado:**
- `user_id` debe ser `test-user-uuid`
- Usuario solo puede ver sus propios bookings

---

## 5. RPC: pricing_recalculate

### Test 5.1: Cálculo básico de precio

```sql
-- Calcular precio para 5 días
SELECT * FROM pricing_recalculate(
    p_car_id := '<car-uuid>',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00'
);
```

**Resultado Esperado:**
```json
{
  "base_price": 10000,
  "total_days": 5,
  "total_amount": 50000,
  "discount_applied": 0
}
```
- `total_amount = base_price * total_days` (si no hay descuento)

### Test 5.2: Descuento por renta larga (7+ días)

```sql
-- Calcular precio para 10 días (descuento 5%)
SELECT * FROM pricing_recalculate(
    p_car_id := '<car-uuid>',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-11 18:00:00+00'
);
```

**Resultado Esperado:**
- `discount_applied > 0`
- `total_amount < (base_price * total_days)`
- Ejemplo: 10 días = 5% descuento

### Test 5.3: Descuento máximo (30+ días)

```sql
-- Calcular precio para 30 días (descuento 10%)
SELECT * FROM pricing_recalculate(
    p_car_id := '<car-uuid>',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-12-01 18:00:00+00'
);
```

**Resultado Esperado:**
- `discount_applied` = 10% del precio base
- `total_amount` = precio con descuento aplicado

### Test 5.4: Auto inexistente

```sql
-- Intentar calcular precio de auto que no existe
SELECT * FROM pricing_recalculate(
    p_car_id := '00000000-0000-0000-0000-000000000000',
    p_start_date := '2025-11-01 10:00:00+00',
    p_end_date := '2025-11-05 18:00:00+00'
);
```

**Resultado Esperado:**
- Error: `Car not found`
- NO retorna datos

---

## 📊 Datos de Prueba

Para ejecutar estos tests, necesitas datos de prueba en tu base de datos:

### Insertar autos de prueba

```sql
-- Auto 1: Toyota Corolla en Buenos Aires
INSERT INTO cars (id, owner_id, brand, model, year, category, city, province, price_per_day, is_available)
VALUES (
    'test-car-1',
    'test-owner-1',
    'Toyota',
    'Corolla',
    2023,
    'sedan',
    'Buenos Aires',
    'Buenos Aires',
    10000,
    true
);

-- Auto 2: Honda CR-V en Córdoba
INSERT INTO cars (id, owner_id, brand, model, year, category, city, province, price_per_day, is_available)
VALUES (
    'test-car-2',
    'test-owner-2',
    'Honda',
    'CR-V',
    2024,
    'suv',
    'Córdoba',
    'Córdoba',
    15000,
    true
);
```

### Insertar booking de prueba

```sql
-- Booking existente (para tests de conflicto)
INSERT INTO bookings (id, user_id, car_id, start_at, end_at, total_amount, status)
VALUES (
    'test-booking-1',
    'test-user-1',
    'test-car-1',
    '2025-11-10 10:00:00+00',
    '2025-11-15 18:00:00+00',
    50000,
    'confirmed'
);
```

---

## ✅ Checklist de Verificación

Marcar cada test al completarlo:

### Verificación de Schema
- [ ] Las 4 RPCs existen en information_schema
- [ ] Todas son de tipo 'FUNCTION'
- [ ] Tienen definiciones no vacías

### get_available_cars
- [ ] Retorna autos disponibles por ciudad
- [ ] Filtra correctamente por categoría
- [ ] Maneja casos sin resultados
- [ ] Usa índices (< 100ms con datos grandes)

### is_car_available
- [ ] Retorna `true` cuando disponible
- [ ] Retorna `false` cuando ocupado
- [ ] Detecta overlaps parciales
- [ ] Permite reservas consecutivas

### request_booking
- [ ] Crea booking exitoso en fechas libres
- [ ] Falla con error apropiado si no disponible
- [ ] Valida fechas (fin > inicio)
- [ ] RLS protege bookings por usuario

### pricing_recalculate
- [ ] Calcula precio base correctamente
- [ ] Aplica descuento para 7+ días
- [ ] Aplica descuento máximo para 30+ días
- [ ] Maneja auto inexistente con error

---

## 🔍 Troubleshooting

### Si una RPC no existe:

```sql
-- Ver todas las funciones disponibles
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

### Si los tests son muy lentos:

```sql
-- Verificar que los índices existan
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('bookings', 'cars')
ORDER BY tablename, indexname;
```

### Si RLS bloquea las queries:

```sql
-- Desactivar RLS temporalmente (solo para testing)
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
-- Ejecutar tests...
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

---

## 📝 Notas

- Todos los tests deben ejecutarse en Supabase SQL Editor
- Reemplazar `<car-uuid>`, `<user-uuid>`, etc. con IDs reales de tu DB
- Los tests de performance requieren datos significativos (1000+ cars, 10k+ bookings)
- RLS debe estar habilitado en producción

---

## 🚀 Próximos Pasos

Después de completar estos tests manuales:

1. Documentar resultados en un spreadsheet
2. Reportar cualquier RPC faltante o con bugs
3. Ejecutar tests de performance con datos reales
4. Validar que los índices estén correctamente configurados
