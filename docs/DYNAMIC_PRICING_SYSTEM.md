# Sistema de Precios Dinámicos - AutoRenta

## 📋 Resumen

Sistema completo de precios dinámicos inspirado en Uber/Airbnb, implementado para AutoRenta en Argentina.

**Estado**: ✅ **75% Implementado** (Backend + Frontend + UI Components)

**Fecha de implementación**: 2025-11-11

---

## 🎯 Características Implementadas

### ✅ Backend (100%)
- [x] Campos de dynamic pricing en tabla `bookings`
- [x] RPC `lock_price_for_booking()` para bloquear precios por 15 minutos
- [x] RPC `request_booking()` actualizado con validación de price locks
- [x] Cron job para actualizar demand snapshots cada 15 minutos
- [x] Campo `uses_dynamic_pricing` en tabla `cars`
- [x] Sistema completo de pricing factors (día, hora, usuario, demanda, eventos)

### ✅ Frontend Services (100%)
- [x] `dynamic-pricing.model.ts`: Interfaces y helpers completos
- [x] `DynamicPricingService`: 10 métodos para manejar price locks
- [x] `BookingsService`: Soporte para dynamic pricing en creación de bookings
- [x] `PublishCarFormService`: Guardar opt-in de dynamic pricing

### ✅ UI Components (100%)
- [x] `DynamicPriceLockPanelComponent`: Panel con countdown timer
- [x] `DynamicPriceBreakdownModalComponent`: Modal de desglose detallado
- [x] `DynamicPricingBadgeComponent`: Badge para indicar precio dinámico

### ⏳ Pendiente (25%)
- [ ] Feature flags para rollout gradual
- [ ] Tests E2E del flujo completo
- [ ] Tests unitarios de servicios
- [ ] Integración UI en páginas existentes

---

## 🏗️ Arquitectura

### Flujo de Datos

```
┌─────────────────┐
│  Usuario inicia │
│    checkout     │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│ 1. Frontend llama                   │
│    lockPrice(carId, userId, dates)  │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 2. RPC lock_price_for_booking       │
│    - Verifica car.uses_dynamic_...  │
│    - Calcula precio con 5 factores  │
│    - Genera UUID token              │
│    - Expira en 15 minutos           │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 3. Frontend recibe PriceLock        │
│    - Muestra countdown timer        │
│    - Compara con precio fijo        │
│    - Permite ver breakdown          │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 4. Usuario confirma booking         │
│    createBookingAtomic() con lock   │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│ 5. RPC request_booking              │
│    - Valida lock no expirado        │
│    - Valida token auténtico         │
│    - Crea booking con snapshot      │
└─────────────────────────────────────┘
```

---

## 🗄️ Schema de Base de Datos

### Tabla `bookings` (Campos Nuevos)

```sql
ALTER TABLE bookings ADD COLUMN has_dynamic_pricing BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN dynamic_price_snapshot JSONB;
ALTER TABLE bookings ADD COLUMN price_locked_until TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN price_lock_token UUID;
```

**Ejemplo de `dynamic_price_snapshot`**:
```json
{
  "pricePerHour": 12.50,
  "totalPrice": 300.00,
  "currency": "USD",
  "breakdown": {
    "basePrice": 10.00,
    "dayFactor": 0.10,
    "hourFactor": 0.20,
    "userFactor": -0.10,
    "demandFactor": 0.25,
    "eventFactor": 0.00,
    "totalMultiplier": 1.45
  },
  "details": {
    "userRentals": 5,
    "dayOfWeek": 6,
    "hourOfDay": 18
  },
  "surgeActive": true,
  "surgeMessage": "⚡ Alta demanda (+25%)",
  "lockedUntil": "2025-11-11T15:30:00Z",
  "lockToken": "a1b2c3d4-...",
  "carId": "...",
  "userId": "..."
}
```

### Tabla `cars` (Campo Nuevo)

```sql
ALTER TABLE cars ADD COLUMN uses_dynamic_pricing BOOLEAN DEFAULT false;
```

### Tablas de Pricing (Ya Existentes)

- `pricing_regions`: Regiones con precio base por hora
- `pricing_day_factors`: Factores por día de la semana
- `pricing_hour_factors`: Factores por hora del día
- `pricing_user_factors`: Factores por tipo de usuario
- `pricing_demand_snapshots`: Snapshots de demanda (actualizados cada 15 min)
- `pricing_special_events`: Eventos especiales (feriados, conciertos, etc.)

---

## 🔧 RPCs Implementados

### `lock_price_for_booking()`

Bloquea un precio por 15 minutos antes de que el usuario complete la reserva.

**Firma**:
```sql
FUNCTION lock_price_for_booking(
  p_car_id UUID,
  p_user_id UUID,
  p_rental_start TIMESTAMPTZ,
  p_rental_hours INT
) RETURNS JSONB
```

**Retorno (si dynamic pricing)**:
```json
{
  "uses_dynamic_pricing": true,
  "price": {
    "price_per_hour": 12.50,
    "total_price": 300.00,
    "currency": "USD",
    "breakdown": { ... }
  },
  "locked_until": "2025-11-11T15:30:00Z",
  "lock_token": "uuid...",
  "car_id": "uuid...",
  "user_id": "uuid...",
  "created_at": "2025-11-11T15:15:00Z"
}
```

**Retorno (si fixed pricing)**:
```json
{
  "uses_dynamic_pricing": false,
  "fixed_price": 50.00,
  "message": "This car uses fixed pricing"
}
```

---

### `request_booking()` (Actualizado)

Crea una reserva con validación de price lock.

**Nuevos parámetros**:
```sql
p_use_dynamic_pricing BOOLEAN DEFAULT FALSE,
p_price_lock_token UUID DEFAULT NULL,
p_dynamic_price_snapshot JSONB DEFAULT NULL
```

**Validaciones**:
- Si `use_dynamic_pricing = true`:
  - Valida que `price_lock_token` exista
  - Valida que `locked_until` no haya expirado
  - Valida que token coincida con snapshot
  - Valida que `car_id` y `user_id` coincidan

---

## ⏰ Cron Job

### Schedule
**Frecuencia**: Cada 15 minutos (`:00`, `:15`, `:30`, `:45`)

**Función**: `update_all_demand_snapshots()`

**Qué hace**:
1. Para cada región activa:
   - Cuenta autos disponibles
   - Cuenta bookings activos
   - Cuenta requests pendientes (últimas 2 horas)
2. Calcula demand ratio = (bookings + requests) / available_cars
3. Determina surge factor:
   - Ratio > 1.5: +25% (alta demanda)
   - Ratio > 1.2: +15% (demanda moderada)
   - Ratio < 0.8: -10% (descuento por baja demanda)
   - Else: 0% (normal)
4. Inserta snapshot en `pricing_demand_snapshots`
5. Registra salud en `pricing_cron_health`

### Monitoreo

```sql
-- Ver últimas ejecuciones
SELECT * FROM pricing_cron_health
ORDER BY last_run_at DESC
LIMIT 10;

-- Ver snapshots actuales
SELECT
  pr.name,
  pds.timestamp,
  pds.surge_factor,
  pds.demand_ratio
FROM pricing_demand_snapshots pds
JOIN pricing_regions pr ON pds.region_id = pr.id
ORDER BY pds.timestamp DESC;
```

---

## 💰 Factores de Precio

El precio final se calcula como:

```
precio_final = precio_base * (1 + Σ factores)
```

### 1. **Day Factor** (-15% a +25%)
- Domingo: +10%
- Lunes-Jueves: 0%
- Viernes: +5%
- Sábado: +10%

### 2. **Hour Factor** (-15% a +20%)
- 00:00-05:59: -15% (madrugada)
- 06:00-09:59: +10% (pico mañana)
- 10:00-16:59: 0% (normal)
- 17:00-21:59: +20% (pico noche)
- 22:00-23:59: +10% (noche tardía)

### 3. **User Factor** (-15% a +5%)
- Nuevo (0 rentals): +5%
- Verificado: -10%
- Frecuente (10+ rentals): -15%

### 4. **Demand Factor** (-10% a +25%)
- Alta demanda (ratio > 1.5): +25%
- Media-alta (ratio > 1.2): +15%
- Baja demanda (ratio < 0.8): -10%
- Normal: 0%

### 5. **Event Factor** (0% a +30%)
- Eventos especiales activos en la región

### Límites (Caps)
- **Mínimo**: 80% del precio base
- **Máximo**: 160% del precio base

---

## 🎨 Componentes UI

### 1. `DynamicPriceLockPanelComponent`

**Features**:
- ⏱️ Countdown timer en tiempo real (MM:SS)
- ⚠️ Alerta cuando quedan < 2 minutos
- 🔄 Botón para refrescar el lock
- 💰 Comparación con precio fijo (ahorro/sobrecosto)
- ⚡ Badge de surge pricing

**Props**:
```typescript
@Input() priceLock: PriceLock | null
@Input() comparison: PriceComparison | null
@Input() surgeInfo: SurgePricingInfo | null

@Output() refresh = EventEmitter<void>
@Output() viewBreakdown = EventEmitter<void>
```

---

### 2. `DynamicPriceBreakdownModalComponent`

**Muestra**:
- 💵 Precio base por hora
- 📊 5 factores individuales con iconos
- ✖️ Multiplicador total
- 💲 Precio final
- 📅 Contexto (día, hora, rentals del usuario)

**Props**:
```typescript
@Input() isOpen: boolean
@Input() snapshot: DynamicPriceSnapshot | null

@Output() close = EventEmitter<void>
```

---

### 3. `DynamicPricingBadgeComponent`

Badge simple para mostrar en cards de autos.

**Props**:
```typescript
@Input() surgeActive: boolean
@Input() surgeFactor?: number
```

---

## 📦 Archivos Creados/Modificados

### Migraciones SQL (5 archivos)
1. `20251111_dynamic_pricing_bookings.sql`
2. `20251111_lock_price_rpc.sql`
3. `20251111_update_request_booking_dynamic_pricing.sql`
4. `20251111_create_demand_snapshot_cron.sql`
5. `20251111_add_uses_dynamic_pricing_to_cars_v2.sql`

### TypeScript (9 archivos)
1. `dynamic-pricing.model.ts` ⭐ NUEVO
2. `dynamic-pricing.service.ts` ✏️ MODIFICADO
3. `bookings.service.ts` ✏️ MODIFICADO
4. `publish-car-form.service.ts` ✏️ MODIFICADO
5. `models/index.ts` ✏️ MODIFICADO
6. `dynamic-price-lock-panel.component.ts` ⭐ NUEVO
7. `dynamic-price-breakdown-modal.component.ts` ⭐ NUEVO
8. `dynamic-pricing-badge.component.ts` ⭐ NUEVO

### Documentación (2 archivos)
1. `DYNAMIC_PRICING_UI_INTEGRATION.md` ⭐ NUEVO
2. `DYNAMIC_PRICING_SYSTEM.md` ⭐ NUEVO (este archivo)

---

## 🚀 Guía de Uso

### Para Locadores (Dueños de Autos)

1. **Publicar auto con precio dinámico**:
   - Al publicar auto, seleccionar "Precio dinámico"
   - El campo `uses_dynamic_pricing` se guarda como `true`
   - El precio base (`price_per_day`) se usa como referencia

2. **Ver earnings potenciales**:
   - En horas pico: hasta +60% más
   - En eventos especiales: hasta +30% adicional
   - Usuarios frecuentes: precio algo reducido pero más reservas

### Para Locatarios (Usuarios)

1. **Ver precio dinámico**:
   - Al buscar autos, ver badge "Precio Dinámico"
   - Al hacer click, ver precio actual
   - Badge rojo si hay surge pricing activo

2. **Proceso de reserva**:
   - Seleccionar auto y fechas
   - Sistema bloquea precio por 15 minutos
   - Ver countdown timer
   - Completar pago antes de que expire
   - Si expira, precio se recalcula

3. **Ver desglose**:
   - Click en "Ver desglose" en panel
   - Modal muestra todos los factores
   - Transparencia total del cálculo

---

## 🧪 Testing

### Verificar Migraciones

```sql
-- Verificar campos en bookings
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name LIKE '%dynamic%';

-- Verificar RPC existe
SELECT proname FROM pg_proc
WHERE proname = 'lock_price_for_booking';

-- Verificar cron job
SELECT * FROM cron.job
WHERE jobname = 'update-demand-snapshots-every-15min';
```

### Probar Price Lock

```sql
-- Bloquear precio de prueba
SELECT * FROM lock_price_for_booking(
  'car-uuid'::UUID,
  'user-uuid'::UUID,
  NOW() + INTERVAL '1 day',
  24
);
```

### Probar Cron Job Manualmente

```sql
-- Ejecutar manualmente
SELECT update_all_demand_snapshots();

-- Ver resultado
SELECT * FROM pricing_cron_health
ORDER BY last_run_at DESC
LIMIT 1;
```

---

## 🐛 Troubleshooting

### Problema: Precio no se bloquea

**Causas posibles**:
1. Auto no tiene `uses_dynamic_pricing = true`
2. Auto no está en una región válida
3. Usuario no autenticado

**Solución**:
```sql
-- Verificar auto
SELECT id, uses_dynamic_pricing, region_id
FROM cars WHERE id = 'car-uuid';

-- Si region_id es NULL, asignar región
UPDATE cars SET region_id = (
  SELECT id FROM pricing_regions LIMIT 1
) WHERE id = 'car-uuid';
```

---

### Problema: Lock expira muy rápido

**Causa**: Lock de 15 minutos es insuficiente

**Solución**: Modificar en `lock_price_rpc.sql`:
```sql
v_lock_expires := NOW() + INTERVAL '30 minutes';
```

Luego re-aplicar migración.

---

### Problema: Cron job no ejecuta

**Verificar**:
```sql
-- Ver si está programado
SELECT * FROM cron.job;

-- Ver logs de ejecución
SELECT * FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'update-demand-snapshots-every-15min'
)
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📊 Métricas y Monitoreo

### KPIs a Monitorear

1. **Adoption Rate**: % de autos con dynamic pricing activado
2. **Price Lock Success Rate**: % de locks que resultan en booking
3. **Average Price Multiplier**: Multiplicador promedio aplicado
4. **Surge Frequency**: % del tiempo con surge pricing activo
5. **User Satisfaction**: Rating promedio en bookings con dynamic pricing

### Queries Útiles

```sql
-- Adoption rate
SELECT
  COUNT(*) FILTER (WHERE uses_dynamic_pricing) * 100.0 / COUNT(*) as adoption_pct
FROM cars WHERE status = 'active';

-- Bookings con dynamic pricing
SELECT
  COUNT(*) FILTER (WHERE has_dynamic_pricing) * 100.0 / COUNT(*) as dynamic_booking_pct
FROM bookings
WHERE created_at > NOW() - INTERVAL '30 days';

-- Average multiplier
SELECT
  AVG((dynamic_price_snapshot->'breakdown'->>'totalMultiplier')::NUMERIC) as avg_multiplier
FROM bookings
WHERE has_dynamic_pricing = true
  AND created_at > NOW() - INTERVAL '30 days';
```

---

## 🔮 Roadmap Futuro

### Fase 5: Testing & Launch (Pendiente)
- [ ] Feature flags en Supabase
- [ ] Tests E2E con Playwright
- [ ] Tests unitarios con Jest
- [ ] Beta launch con 10% de autos
- [ ] A/B testing

### Mejoras Futuras
- [ ] Machine Learning para predecir demanda
- [ ] Notificaciones de precio bajo
- [ ] "Price alerts" para usuarios
- [ ] Integración con APIs de clima/eventos
- [ ] Dashboard de analytics para locadores

---

## 📞 Contacto y Soporte

**Documentación**: `/docs/DYNAMIC_PRICING_*.md`

**Problemas conocidos**: Ver Issues en GitHub con label `dynamic-pricing`

**Preguntas**: Crear issue con template "Question"

---

**Última actualización**: 2025-11-11
**Versión**: 1.0
**Estado**: Beta (75% completo)
