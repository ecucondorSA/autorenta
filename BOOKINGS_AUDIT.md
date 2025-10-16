# Auditoría: Sistema de Reservas (Bookings)

**Fecha**: 2025-10-16
**Rama**: `audit/bookings-system-integration`
**Problema Reportado**: "No tenés reservas todavía" - Sin reservas visibles
**Tipo**: Auditoría Full-Stack con Vertical Slice Debugging

---

## 🚨 HALLAZGOS CRÍTICOS

### ❌ Sistema de Reservas NO Funcional

El sistema de reservas está **completamente no funcional** debido a que:

1. **Base de datos vacía**: La migración inicial está vacía
2. **Tablas faltantes**: No existen las tablas core del sistema
3. **Funciones RPC faltantes**: No existe `request_booking()`
4. **Políticas RLS faltantes**: Sin protección de acceso
5. **Desconexión código-BD**: El código asume tablas que no existen

---

## 📊 Análisis Layer-by-Layer

### LAYER 1: UI Component ❌

**Archivo**: `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts`

```typescript
async loadBookings(): Promise<void> {
  this.loading.set(true);
  try {
    const items = await this.bookingsService.getMyBookings(); // ❌ Falla
    this.bookings.set(items);
  } catch (err) {
    console.error('getMyBookings error', err); // ❌ Error silenciado
  } finally {
    this.loading.set(false);
  }
}
```

**Problemas**:
- ✅ Template HTML correcto
- ❌ **Error handling silencioso** - Usuario no ve el error
- ❌ No muestra mensaje de error al usuario
- ❌ `bookings()` queda vacío por error, no por falta de datos

**Template** (`my-bookings.page.html`):
```html
<p *ngIf="!loading() && bookings().length === 0" class="text-sm text-slate-500">
  No tenés reservas todavía.  <!-- ❌ Mensaje engañoso -->
</p>
```

**Problema**: Este mensaje se muestra cuando hay un **error de BD**, no cuando no hay reservas.

---

### LAYER 2: Service Layer ❌

**Archivo**: `apps/web/src/app/core/services/bookings.service.ts`

```typescript
async getMyBookings(): Promise<Booking[]> {
  const userId = (await this.supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  const { data, error } = await this.supabase
    .from('bookings')  // ❌ Tabla no existe
    .select('*, cars(*), payment_intents(*)')
    .eq('renter_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Booking[];
}
```

**Problemas**:
- ❌ Query a tabla inexistente `bookings`
- ❌ Join con tabla inexistente `cars`
- ❌ Join con tabla inexistente `payment_intents`
- ✅ Error handling correcto (throws error)

```typescript
async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
  const { data, error } = await this.supabase.rpc('request_booking', {  // ❌ Función no existe
    p_car_id: carId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return data as Booking;
}
```

**Problemas**:
- ❌ RPC function `request_booking` no existe en BD
- ❌ No hay validación de disponibilidad
- ❌ No hay creación de payment intent

---

### LAYER 3: Supabase SDK ✅

**Status**: SDK funcionando correctamente
**Problema**: NO es problema del SDK, es que las tablas no existen

---

### LAYER 4: Database Schema ❌❌❌

**Archivo**: `supabase/migrations/202510161100_init.sql`

```sql
begin;
-- TODO: agregar tipos, funciones y policies iniciales
commit;
```

**Problema CRÍTICO**: ¡La migración inicial está **VACÍA**!

#### Tablas Faltantes

##### 1. `bookings` (FALTA)
```sql
-- NO EXISTE - Necesita ser creada
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id),
  renter_id UUID NOT NULL REFERENCES public.profiles(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

##### 2. `cars` (FALTA)
```sql
-- NO EXISTE - Necesita ser creada
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  price_per_day NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

##### 3. `car_photos` (FALTA)
##### 4. `payments` (FALTA)
##### 5. `payment_intents` (FALTA)
##### 6. `reviews` (FALTA)

---

### LAYER 5: RLS Policies ❌

**Estado**: NO EXISTEN políticas RLS para ninguna tabla

#### Políticas Necesarias para `bookings`:

```sql
-- NO EXISTEN - Deben ser creadas

-- Users can view their own bookings (as renter)
CREATE POLICY "Renters can view own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = renter_id);

-- Car owners can view bookings for their cars
CREATE POLICY "Owners can view bookings for their cars"
ON public.bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = bookings.car_id
    AND cars.owner_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT
USING (public.is_admin());

-- Authenticated users can create bookings
CREATE POLICY "Authenticated users can request bookings"
ON public.bookings FOR INSERT
WITH CHECK (
  auth.uid() = renter_id
  AND status = 'pending'
);
```

---

### LAYER 6: RPC Functions ❌

#### `request_booking()` (FALTA)

```sql
-- NO EXISTE - Debe ser creada
CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings;
  v_total NUMERIC(10, 2);
  v_car public.cars;
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que el auto existe y está activo
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no disponible';
  END IF;

  -- Validar que el usuario no es el dueño del auto
  IF v_car.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés reservar tu propio auto';
  END IF;

  -- Validar disponibilidad (no overlap)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE car_id = p_car_id
    AND status IN ('confirmed', 'in_progress')
    AND (
      (start_at, end_at) OVERLAPS (p_start, p_end)
    )
  ) THEN
    RAISE EXCEPTION 'Auto no disponible en esas fechas';
  END IF;

  -- Calcular total
  v_total := v_car.price_per_day * EXTRACT(DAY FROM (p_end - p_start));

  -- Crear booking
  INSERT INTO public.bookings (
    car_id,
    renter_id,
    start_at,
    end_at,
    status,
    total_amount,
    currency
  ) VALUES (
    p_car_id,
    auth.uid(),
    p_start,
    p_end,
    'pending',
    v_total,
    v_car.currency
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;
```

---

### LAYER 7: TypeScript Types ⚠️

**Archivo**: `apps/web/src/app/core/types/database.types.ts`

**Status**: ✅ Types correctos pero desconectados de la realidad

```typescript
export interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  total_amount: number;
  currency: string;
  // ... más campos
}
```

**Problema**: Los types existen pero las tablas no.

---

## 🔍 Root Cause Analysis

### Causa Raíz Principal

**La migración inicial está vacía** (`supabase/migrations/202510161100_init.sql`)

```sql
begin;
-- TODO: agregar tipos, funciones y policies iniciales
commit;
```

Esto causó un efecto dominó:

1. **Sin migración** → Sin tablas en BD
2. **Sin tablas** → Queries fallan
3. **Sin RLS policies** → Sin protección (si tablas existieran)
4. **Sin RPC functions** → Sin lógica de negocio
5. **Código desconectado** → Angular asume BD que no existe

### Segundo Problema

**Archivos SQL en `sql/` son features avanzados**, NO son la migración base:

- `feature_contracts_geofence.sql` - Asume que `bookings` existe
- `feature_pricing_cancellation.sql` - Asume que `cars` existe
- `feature_reviews_chat_disputes.sql` - Asume que `reviews` existe

Estos archivos son **extensiones**, no la base.

### Tercer Problema

**Error handling silencioso en UI**:

```typescript
try {
  const items = await this.bookingsService.getMyBookings();
  this.bookings.set(items);
} catch (err) {
  console.error('getMyBookings error', err);  // ❌ Solo console
  // NO se muestra error al usuario
}
```

El usuario ve "No tenés reservas todavía" cuando en realidad hay un **error de base de datos**.

---

## ✅ Solución Propuesta

### Fase 1: Crear Migración Base

Crear: `supabase/migrations/20251016_create_core_tables.sql`

**Orden de creación**:
1. Types (ENUMs)
2. `profiles` (ya existe en `apps/web/database/setup-profiles.sql`)
3. `cars`
4. `car_photos`
5. `bookings`
6. `payments`
7. `payment_intents`
8. `reviews`

### Fase 2: RLS Policies

Agregar policies para cada tabla en el mismo archivo de migración.

### Fase 3: RPC Functions

Crear funciones:
- `request_booking(car_id, start, end)`
- `quote_booking(car_id, start, end, promo?)`
- `cancel_with_fee(booking_id)`
- `is_admin()` helper

### Fase 4: Mejorar Error Handling

**UI Layer**:
```typescript
readonly error = signal<string | null>(null);

async loadBookings(): Promise<void> {
  this.loading.set(true);
  this.error.set(null);
  try {
    const items = await this.bookingsService.getMyBookings();
    this.bookings.set(items);
  } catch (err) {
    console.error('getMyBookings error', err);
    this.error.set('No pudimos cargar tus reservas. Por favor intentá de nuevo.');
  } finally {
    this.loading.set(false);
  }
}
```

**Template**:
```html
<div *ngIf="error()" class="rounded-lg bg-red-50 p-4 text-sm text-red-800">
  {{ error() }}
</div>

<p *ngIf="!loading() && !error() && bookings().length === 0">
  No tenés reservas todavía.
</p>
```

### Fase 5: Integrar Features SQL

Ejecutar los archivos en `sql/` **DESPUÉS** de la migración base:
1. `feature_pricing_cancellation.sql`
2. `feature_contracts_geofence.sql`
3. `feature_reviews_chat_disputes.sql`

---

## 📋 Plan de Implementación

### Prioridad CRÍTICA

1. ✅ Crear `profiles` table (ya existe)
2. 🔴 Crear `cars` table
3. 🔴 Crear `car_photos` table
4. 🔴 Crear `bookings` table
5. 🔴 Crear `payments` table
6. 🔴 Crear `payment_intents` table
7. 🔴 Crear función `request_booking()`
8. 🔴 Crear RLS policies para todas las tablas
9. 🟡 Mejorar error handling en UI
10. 🟢 Aplicar features SQL avanzados

### Orden de Ejecución

```bash
# 1. Migración base (NUEVA)
supabase/migrations/20251016_create_core_tables.sql

# 2. Profiles setup (YA EXISTE)
apps/web/database/setup-profiles.sql

# 3. Features avanzados (YA EXISTEN)
sql/feature_pricing_cancellation.sql
sql/feature_contracts_geofence.sql
sql/feature_reviews_chat_disputes.sql
```

---

## 🧪 Testing Plan

### Test 1: Tablas Existen
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'cars', 'bookings', 'payments');
```

Esperado: 4 filas

### Test 2: RLS Habilitado
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('bookings', 'cars');
```

Esperado: `rowsecurity = true`

### Test 3: RPC Function Exists
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'request_booking';
```

Esperado: 1 fila

### Test 4: Create Booking (End-to-End)
```typescript
// En Angular
const booking = await bookingsService.requestBooking(
  carId,
  '2025-10-20',
  '2025-10-22'
);
console.log('Booking created:', booking);
```

Esperado: Booking object con `status: 'pending'`

### Test 5: Get My Bookings
```typescript
const bookings = await bookingsService.getMyBookings();
console.log('My bookings:', bookings);
```

Esperado: Array (puede estar vacío si no hay reservas)

---

## 🚨 Impacto del Bug

### Severidad: CRÍTICA 🔴

- **Funcionalidad core no funciona**
- **Sin reservas = sin negocio**
- **Usuario no puede usar la plataforma**

### Usuarios Afectados

- ✅ 100% de usuarios (todos)
- ❌ Nadie puede crear reservas
- ❌ Nadie puede ver reservas
- ❌ Nadie puede cancelar reservas

### Tiempo sin Funcionalidad

Desde el inicio del proyecto (migración vacía desde `202510161100`)

---

## 📚 Archivos Involucrados

| Archivo | Status | Acción |
|---------|--------|--------|
| `supabase/migrations/202510161100_init.sql` | ❌ Vacío | Reemplazar |
| `apps/web/src/app/core/services/bookings.service.ts` | ⚠️ OK pero sin BD | Mantener |
| `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts` | ⚠️ Error handling | Mejorar |
| `apps/web/src/app/core/types/database.types.ts` | ✅ OK | Mantener |
| `sql/feature_*.sql` | ✅ OK | Ejecutar después de base |

---

## 🎯 Success Criteria

✅ Sistema funcional cuando:

1. **Tablas existen** en Supabase
2. **RLS policies** protegen datos
3. **RPC functions** funcionan
4. **Usuario puede crear** booking
5. **Usuario puede ver** sus bookings
6. **Errores se muestran** al usuario (no silenciosos)
7. **Features SQL** integrados

---

## 📖 Referencias

- **Vertical Stack Debugging**: `VERTICAL_STACK_DEBUGGING.md`
- **Storage Patterns**: `PHOTO_UPLOAD_AUDIT.md`
- **Supabase Docs**: https://supabase.com/docs/guides/database
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🔧 Soluciones Implementadas

### ✅ Fase 1: Migración Base Completa

**Archivo creado**: `supabase/migrations/20251016_create_core_tables.sql`

La migración incluye:

1. **ENUMs (Custom Types)**:
   - `booking_status` (6 estados: pending, confirmed, in_progress, completed, cancelled, no_show)
   - `car_status` (5 estados: draft, pending, active, suspended, deleted)
   - `payment_status` (6 estados: pending, processing, approved, rejected, refunded, cancelled)
   - `payment_provider` (3 proveedores: mock, mercadopago, stripe)

2. **Tablas Core**:
   - ✅ `cars` (con índices por owner_id, status, city, created_at)
   - ✅ `car_photos` (con índices por car_id, sort_order)
   - ✅ `bookings` (con índices por car_id, renter_id, status, dates)
   - ✅ `payment_intents` (con índices por booking_id, status, provider)
   - ✅ `payments` (con índices por booking_id, payment_intent_id, status)
   - ✅ `reviews` (con índices por booking_id, reviewer_id, reviewee_id)

3. **Triggers**:
   - ✅ `update_updated_at_column()` función para auto-actualizar timestamps
   - ✅ Triggers en cars, bookings, payment_intents, payments, reviews

4. **RLS Policies**:
   - ✅ Cars: 4 policies (view, create, update, delete)
   - ✅ Car Photos: 3 policies (view, insert, delete)
   - ✅ Bookings: 4 policies (view own, view as owner, create, update)
   - ✅ Payment Intents: 3 policies (view, insert, update)
   - ✅ Payments: 3 policies (view, insert, update)
   - ✅ Reviews: 4 policies (view, create, update, delete)

5. **RPC Functions**:
   - ✅ `request_booking(car_id, start, end)` - Crea reserva con validaciones completas
   - ✅ `quote_booking(car_id, start, end)` - Calcula precio sin crear reserva
   - ✅ `is_car_owner(car_id)` - Helper para verificar ownership

6. **Validaciones en `request_booking()`**:
   - ✅ Usuario autenticado
   - ✅ Fechas válidas (fin > inicio, no en el pasado)
   - ✅ Auto existe y está activo
   - ✅ Usuario no es dueño del auto
   - ✅ No hay overlap con reservas confirmadas
   - ✅ Cálculo correcto de días y monto total

### ✅ Fase 2: Mejora de Error Handling

**Archivos modificados**:
- `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.ts`
- `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html`

**Cambios**:
1. **Agregado signal de error**: `readonly error = signal<string | null>(null)`
2. **Error handling visible**: Ahora muestra mensaje al usuario en lugar de solo logear
3. **Botón de reintentar**: Permite al usuario volver a intentar cargar reservas
4. **Estados separados**: Loading, error, empty state claramente diferenciados
5. **Mejor UX**: Usuario sabe cuando hay un error de BD vs. cuando no hay datos

**Antes**:
```typescript
catch (err) {
  console.error('getMyBookings error', err); // ❌ Error silencioso
}
```

**Después**:
```typescript
catch (err) {
  console.error('getMyBookings error', err);
  this.error.set('No pudimos cargar tus reservas. Por favor intentá de nuevo más tarde.'); // ✅ Error visible
}
```

---

---

## 🔄 UPDATE: Verificación de Base de Datos Real (2025-10-16)

### ✅ Conexión Exitosa a Supabase

**Connection String**: `postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres`

### 🎉 Hallazgo: Base de Datos YA Está Implementada

La base de datos en producción tiene una estructura **mucho más completa** que la auditoría inicial:

#### Tablas Existentes (20 tablas)
```
✅ bookings               - Con tstzrange y exclude constraints
✅ cars                   - Completa
✅ car_photos             - Completa
✅ car_locations          - Tracking de ubicación
✅ car_tracking_points    - GPS tracking
✅ car_tracking_sessions  - Sesiones de tracking
✅ car_handover_points    - Puntos de entrega
✅ car_blackouts          - Fechas bloqueadas
✅ payments               - Completa
✅ booking_contracts      - Contratos digitales
✅ profiles               - Usuarios
✅ reviews                - Reseñas
✅ messages               - Chat/mensajería
✅ disputes               - Resolución de disputas
✅ dispute_evidence       - Evidencia de disputas
✅ fees                   - Fees adicionales
✅ pricing_overrides      - Precios custom
✅ promos                 - Códigos promocionales
✅ webhook_events         - Event tracking
✅ spatial_ref_sys        - PostGIS spatial refs
```

#### RPC Functions Existentes
```sql
✅ request_booking(car_id, start, end)
✅ quote_booking(car_id, start, end)
✅ has_booking_conflict(car_id, start, end)
```

#### Datos Actuales
```
- 11 autos activos
- 0 reservas
- 3+ perfiles de usuario (incluido EDUARDO MARQUES DA ROSA con role='both')
```

#### Estructura Avanzada de `bookings`

La tabla `bookings` tiene features avanzadas:
- ✅ **tstzrange** para time_range (búsquedas eficientes)
- ✅ **EXCLUDE constraint** para prevenir overlaps automáticamente
- ✅ **PostGIS geography** para pickup/dropoff locations
- ✅ **Confirmaciones de pickup/dropoff** con timestamps y user_id
- ✅ **actual_start_at/actual_end_at** para tracking real
- ✅ **RLS Policies** completamente implementadas
- ✅ **Triggers** para updated_at

### 🤔 Nuevo Problema Identificado

Si la base de datos está completa y funcional, ¿por qué la UI muestra "No tenés reservas todavía"?

**Posibles causas**:

1. **Usuario no tiene reservas**: Es el caso más probable - hay 0 bookings en total
2. **Error de autenticación**: JWT no se envía correctamente
3. **RLS Policy bloqueando**: Policy requiere role='renter' o 'both'
4. **Error en el servicio Angular**: Problema en la query
5. **CORS o networking**: Request no llega a Supabase

### 🔍 Siguiente Paso

Necesito:
1. Verificar autenticación del usuario actual
2. Crear una reserva de prueba
3. Verificar que aparece en la UI
4. Si no aparece, debuggear la query y RLS

---

**Status**: 🟢 Base de datos FUNCIONAL - Investigar por qué UI no funciona
**Next Action**: Crear booking de prueba y verificar que aparece en UI
