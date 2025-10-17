# 📊 Booking Pricing Breakdown Feature

## Resumen

Esta feature implementa un sistema completo de desglose de precios para las reservas, con soporte para:

- **Desglose detallado**: Tarifa base, seguro, comisiones, descuentos
- **Gestión de expiración**: Countdown en tiempo real para reservas pendientes
- **Acciones por estado**: Botones contextuales según el estado de la reserva
- **Vistas especializadas**: `my_bookings` y `owner_bookings` con datos enriquecidos

## 🗂️ Arquitectura

### Base de Datos

**Migración**: `/supabase/migrations/20251016_add_booking_pricing_breakdown.sql`

**Nuevos campos en `bookings`**:
```sql
- days_count: INTEGER              -- Número de días de la reserva
- nightly_rate_cents: BIGINT       -- Tarifa por noche en centavos
- subtotal_cents: BIGINT           -- Subtotal en centavos
- insurance_cents: BIGINT          -- Seguro en centavos
- fees_cents: BIGINT               -- Comisiones en centavos
- discounts_cents: BIGINT          -- Descuentos en centavos
- total_cents: BIGINT              -- Total en centavos
- breakdown: JSONB                 -- Desglose completo en JSON

- payment_intent_id: UUID          -- Referencia al payment intent
- expires_at: TIMESTAMPTZ          -- Fecha de expiración del pago
- paid_at: TIMESTAMPTZ             -- Fecha del pago confirmado

- cancellation_policy_id: BIGINT  -- Política de cancelación aplicada
- cancellation_fee_cents: BIGINT   -- Cargo por cancelación
- cancelled_at: TIMESTAMPTZ        -- Fecha de cancelación
- cancellation_reason: TEXT        -- Motivo de cancelación
```

**Nuevo estado**: `expired` agregado al enum `booking_status`

### RPC Functions

#### `pricing_recalculate(p_booking_id UUID)`

Recalcula el desglose de precio de una reserva:

- Obtiene información del auto y la reserva
- Calcula días (mínimo 1)
- Convierte `price_per_day` a centavos
- Calcula subtotal = tarifa × días
- Aplica seguros, fees y descuentos (configurables)
- Construye JSON de breakdown
- Actualiza todos los campos de pricing en la reserva

**Uso**:
```sql
SELECT * FROM pricing_recalculate('a6de0b79-...');
```

#### `expire_pending_bookings()`

Expira reservas pendientes que pasaron su `expires_at`:

- Marca como `expired` todas las reservas `pending` vencidas
- Registra `cancelled_at` y `cancellation_reason`
- Retorna el número de reservas expiradas

**Uso** (ejecutar desde cron/scheduled task):
```sql
SELECT * FROM expire_pending_bookings();
```

### Views

#### `my_bookings`

Vista para reservas del usuario actual (renter):

```sql
SELECT
  b.*,
  c.title AS car_title,
  c.brand AS car_brand,
  c.model AS car_model,
  c.year AS car_year,
  c.city AS car_city,
  c.province AS car_province,
  (main_photo_url),
  pi.status AS payment_status,
  pi.provider AS payment_provider
FROM bookings b
WHERE b.renter_id = auth.uid();
```

#### `owner_bookings`

Vista para reservas de autos del owner actual:

```sql
SELECT
  b.*,
  c.title AS car_title,
  p.full_name AS renter_name,
  p.avatar_url AS renter_avatar,
  pi.status AS payment_status
FROM bookings b
JOIN cars c ON c.id = b.car_id
WHERE c.owner_id = auth.uid();
```

### Frontend

**TypeScript Interfaces** (`/apps/web/src/app/core/models/index.ts`):

```typescript
export interface BookingBreakdown {
  days: number;
  nightly_rate_cents: number;
  subtotal_cents: number;
  insurance_cents?: number;
  fees_cents?: number;
  discounts_cents?: number;
  total_cents: number;
  currency: string;
  lines?: Array<{ label: string; amount_cents: number }>;
}

export interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;

  // Pricing breakdown
  breakdown?: BookingBreakdown;
  total_cents?: number;

  // Payment
  payment_intent_id?: string;
  expires_at?: string;
  paid_at?: string;

  // Extended from views
  car_title?: string;
  car_brand?: string;
  car_model?: string;
  main_photo_url?: string;
  payment_status?: PaymentStatus;
  // ... más campos
}
```

**Service** (`/apps/web/src/app/core/services/bookings.service.ts`):

Nuevos métodos:

- `getMyBookings()`: Usa vista `my_bookings`
- `getOwnerBookings()`: Usa vista `owner_bookings`
- `recalculatePricing(bookingId)`: Llama RPC `pricing_recalculate`
- `cancelBooking(bookingId, reason?)`: Cancela una reserva
- `markAsPaid(bookingId, paymentIntentId)`: Marca como pagada
- `getTimeUntilExpiration(booking)`: Retorna ms hasta expiración
- `formatTimeRemaining(ms)`: Formatea tiempo restante
- `isExpired(booking)`: Verifica si está expirada

**Componentes**:

1. **BookingDetailPage** (`/apps/web/src/app/features/bookings/booking-detail/`)
   - Muestra desglose completo del precio
   - Countdown en tiempo real para pendientes
   - Acciones contextuales según estado
   - Auto-refresh del countdown cada segundo

2. **MyBookingsPage** (actualizado)
   - Lista de reservas con cards enriquecidas
   - Muestra foto del auto, título, marca/modelo
   - Status badges con colores
   - Link a detalle de cada reserva

## 📋 Ejemplo de Uso

### 1. Aplicar la migración

```bash
# Conectarse a Supabase
supabase db push

# O aplicar manualmente
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/20251016_add_booking_pricing_breakdown.sql
```

### 2. Crear una reserva de prueba

```sql
-- Crear booking (automáticamente se le calcula el pricing)
SELECT * FROM request_booking(
  p_car_id := '01234567-89ab-cdef-0123-456789abcdef',
  p_start := '2025-10-23T10:00:00Z',
  p_end := '2025-10-30T10:00:00Z'
);

-- El trigger automáticamente:
-- 1. Setea expires_at = now() + 30 minutes
-- 2. La función pricing_recalculate() calcula el desglose
```

### 3. Ver el desglose

```sql
SELECT
  id,
  status,
  days_count,
  nightly_rate_cents,
  subtotal_cents,
  total_cents,
  breakdown,
  expires_at
FROM my_bookings
WHERE id = 'a6de0b79-...';
```

**Ejemplo de `breakdown` JSON**:

```json
{
  "days": 7,
  "nightly_rate_cents": 1600,
  "subtotal_cents": 11200,
  "insurance_cents": 0,
  "fees_cents": 0,
  "discounts_cents": 0,
  "total_cents": 11200,
  "currency": "USD",
  "lines": [
    {"label": "Base rate", "amount_cents": 11200},
    {"label": "Insurance", "amount_cents": 0},
    {"label": "Service fee", "amount_cents": 0},
    {"label": "Discount", "amount_cents": 0}
  ]
}
```

### 4. Navegar en la UI

```
1. Login en /auth/login
2. Ir a /bookings (Mis reservas)
3. Ver lista de reservas con fotos y estado
4. Click en "Ver detalle →"
5. Ver desglose completo en /bookings/{id}
6. Ver countdown si está pending
7. Probar acciones según estado
```

## 🎨 UI por Estado de Reserva

### `pending` (Pendiente de pago)

**Se muestra**:
- Desglose de precio
- ⏱️ Countdown hasta expiración
- Advertencia: "Completá el pago antes de que expire"

**Acciones**:
- 💳 **Pagar ahora** → Mock payment flow
- ❌ **Cancelar reserva**

---

### `confirmed` (Confirmada, pagada)

**Se muestra**:
- Desglose de precio
- ✅ "Pago confirmado el {fecha}"
- Datos del auto y owner

**Acciones**:
- 📄 **Ver comprobante**
- 💬 **Chat con el dueño**

---

### `in_progress` (En curso)

**Se muestra**:
- Desglose
- Estado del rental

**Acciones**:
- Check-in/out
- Soporte
- Extender (si aplica)

---

### `completed` (Completada)

**Se muestra**:
- Desglose
- Resumen final

**Acciones**:
- ⭐ **Dejar reseña**
- 📄 **Ver factura**

---

### `cancelled` / `expired`

**Se muestra**:
- Desglose
- Motivo de cancelación
- Fecha de cancelación

**Acciones**:
- Ninguna (mostrar solo info)

---

## 🧪 Testing Manual

### Test Case 1: Crear y ver reserva pending

```bash
# 1. Login en la app
# 2. Seleccionar auto en /cars
# 3. Hacer booking con fechas 23/10 - 30/10
# 4. Ir a /bookings
# 5. Verificar que muestra la reserva con estado "pending"
# 6. Click en "Ver detalle"
# 7. Verificar:
#    - Desglose muestra: $16 × 7 días = $112
#    - Countdown está corriendo
#    - Botones "Pagar ahora" y "Cancelar" visibles
```

### Test Case 2: Simular pago

```bash
# 1. Desde detalle de reserva pending
# 2. Click en "Pagar ahora"
# 3. Verificar:
#    - Mock payment se ejecuta
#    - Estado cambia a "confirmed"
#    - Muestra "Pago confirmado"
#    - Botones cambian a "Ver comprobante" y "Chat"
```

### Test Case 3: Cancelar reserva

```bash
# 1. Desde detalle de reserva pending
# 2. Click en "Cancelar reserva"
# 3. Confirmar en diálogo
# 4. Verificar:
#    - Estado cambia a "cancelled"
#    - Muestra motivo: "Cancelled by user"
#    - Muestra fecha de cancelación
#    - No hay acciones disponibles
```

### Test Case 4: Expiración automática

```sql
-- Simular expiración manual (para testing rápido)
UPDATE bookings
SET expires_at = now() - INTERVAL '1 minute'
WHERE id = 'a6de0b79-...';

-- Ejecutar función de expiración
SELECT * FROM expire_pending_bookings();

-- Verificar en UI:
-- 1. Recargar /bookings/{id}
-- 2. Countdown desaparece
-- 3. Muestra advertencia "Esta reserva ha expirado"
-- 4. Estado = "expired"
```

---

## ⚙️ Configuración de Pricing

### Agregar seguro (10% del subtotal)

Editar `/supabase/migrations/20251016_add_booking_pricing_breakdown.sql`:

```sql
-- Línea ~136 en pricing_recalculate()
v_insurance_cents := ROUND(v_subtotal_cents * 0.10)::BIGINT;
```

### Agregar comisión de plataforma (5%)

```sql
-- Línea ~140
v_fees_cents := ROUND(v_subtotal_cents * 0.05)::BIGINT;
```

### Agregar descuentos por duración

```sql
-- Línea ~145
IF v_days >= 30 THEN
  v_discounts_cents := ROUND(v_subtotal_cents * 0.10)::BIGINT; -- 10% off
ELSIF v_days >= 7 THEN
  v_discounts_cents := ROUND(v_subtotal_cents * 0.05)::BIGINT; -- 5% off
END IF;
```

Después de modificar, re-aplicar la migración:

```bash
supabase db reset  # En dev
# O crear nueva migración incremental en prod
```

---

## 🔄 Scheduled Tasks

Para auto-expirar reservas pendientes, configurar en Supabase:

**Dashboard → Database → Cron Jobs**:

```sql
SELECT cron.schedule(
  'expire-pending-bookings',
  '*/5 * * * *',  -- Cada 5 minutos
  $$ SELECT expire_pending_bookings(); $$
);
```

O usar edge function con `deno-cron` si prefieres funciones serverless.

---

## 📊 Métricas y Monitoreo

### Queries útiles

**Reservas por estado**:
```sql
SELECT status, COUNT(*)
FROM bookings
GROUP BY status;
```

**Reservas expiradas hoy**:
```sql
SELECT * FROM bookings
WHERE status = 'expired'
AND cancelled_at::date = CURRENT_DATE;
```

**Revenue por mes (solo confirmadas)**:
```sql
SELECT
  DATE_TRUNC('month', paid_at) AS month,
  SUM(total_cents) / 100.0 AS total_revenue,
  currency
FROM bookings
WHERE status = 'confirmed'
GROUP BY month, currency
ORDER BY month DESC;
```

---

## 🐛 Troubleshooting

### Problema: Breakdown no se calcula automáticamente

**Solución**: Llamar manualmente `pricing_recalculate`:

```sql
SELECT * FROM pricing_recalculate('booking-id-aqui');
```

### Problema: Countdown no se actualiza

**Solución**: Verificar que `expires_at` esté seteado:

```sql
SELECT id, status, expires_at
FROM bookings
WHERE id = 'xxx';

-- Si es null, setear manualmente
UPDATE bookings
SET expires_at = now() + INTERVAL '30 minutes'
WHERE id = 'xxx';
```

### Problema: Vista my_bookings no retorna datos

**Solución**: Verificar RLS policies:

```sql
-- Como usuario autenticado
SELECT * FROM my_bookings;

-- Si retorna vacío, verificar:
SELECT auth.uid();  -- Debe retornar tu user ID

-- Verificar que tengas bookings
SELECT * FROM bookings WHERE renter_id = auth.uid();
```

---

## 🚀 Próximos Pasos

- [ ] Integrar con Mercado Pago (reemplazar mock)
- [ ] Agregar políticas de cancelación personalizadas
- [ ] Implementar reembolsos parciales
- [ ] Agregar descuentos por código promocional
- [ ] Crear dashboard de revenue para owners
- [ ] Implementar chat en tiempo real (WebSockets/Realtime)
- [ ] Agregar notificaciones por email/SMS
- [ ] Sistema de reviews post-booking

---

## 📚 Referencias

- **Migración**: `/supabase/migrations/20251016_add_booking_pricing_breakdown.sql`
- **Modelos**: `/apps/web/src/app/core/models/index.ts`
- **Service**: `/apps/web/src/app/core/services/bookings.service.ts`
- **Detalle UI**: `/apps/web/src/app/features/bookings/booking-detail/`
- **Lista UI**: `/apps/web/src/app/features/bookings/my-bookings/`

---

**Autor**: Claude Code
**Fecha**: 2025-10-16
**Versión**: 1.0.0
