# Estructura de Base de Datos AutorentA - Supabase PostgreSQL

**Última verificación**: 2025-10-16
**Proyecto**: obxvffplochgeiclibng
**URL**: https://obxvffplochgeiclibng.supabase.co

---

## ✅ Estado Actual

La base de datos **ya tiene una estructura completa** implementada con:
- ✅ 20 tablas en schema `public`
- ✅ 16 tipos enum personalizados
- ✅ 4 extensiones PostgreSQL instaladas
- ✅ 11 funciones RPC personalizadas
- ✅ RLS (Row Level Security) activado en todas las tablas
- ✅ Triggers y constraints implementados

---

## 📊 Tablas Principales

### 1. **profiles** - Perfiles de Usuario
```sql
Columnas:
- id (uuid, PK) → auth.users(id)
- role (user_role) → 'renter', 'owner', 'admin'
- full_name (text)
- phone (text)
- dni (text, unique)
- country (text, default 'AR')
- created_at, updated_at (timestamptz)

Políticas RLS:
- Lectura: usuarios propios + admins
- Actualización: solo propietario del perfil + admins
```

### 2. **cars** - Autos Publicados
```sql
Columnas principales:
- id (uuid, PK)
- owner_id (uuid, FK → profiles)
- title, brand, model, year
- plate (text, unique), vin (text)
- transmission (enum: manual/automatic)
- fuel (enum: nafta/gasoil/hibrido/electrico)
- seats (1-9), doors (2-6), color
- features (jsonb) → { "airbag": true, "abs": true, "ac": true, ... }
- description (text)
- status (enum: draft/active/suspended/maintenance)
- price_per_day (numeric)
- currency (char(3), default 'ARS')
- rating_avg (numeric), rating_count (int)
- location_city, location_state, location_province, location_country
- location_lat, location_lng (coordenadas)
- mileage (int)
- cancel_policy (enum)
- created_at, updated_at

Índices:
- owner_id, status, location_city

Políticas RLS:
- Lectura: autos activos públicos, propietario ve todos sus autos
- Escritura: solo propietario + admins
```

### 3. **car_photos** - Fotos de Autos
```sql
Columnas:
- id (uuid, PK)
- car_id (uuid, FK → cars, ON DELETE CASCADE)
- url (text) → ruta en Storage
- position (int) → orden de visualización
- created_at

Índices:
- car_id, position

Políticas RLS:
- Lectura pública si el auto está activo
- Escritura: solo propietario del auto
```

### 4. **car_locations** - Ubicación en Tiempo Real
```sql
Columnas:
- car_id (uuid, PK, FK → cars)
- location (geography(Point, 4326)) → PostGIS
- is_online (boolean)
- updated_at

Índices:
- GiST en location (geoespacial)

Políticas RLS:
- Lectura: owner, renter con reserva activa, admins
- Escritura: owner + admins
```

### 5. **car_blackouts** - Bloqueos de Disponibilidad
```sql
Columnas:
- id (uuid, PK)
- car_id (uuid, FK → cars)
- starts_at, ends_at (timestamptz)
- reason (text)
- created_by (uuid, FK → profiles)
- created_at

Constraint: ends_at > starts_at

Uso: Para bloquear fechas por mantenimiento, vacaciones, etc.
```

### 6. **bookings** - Reservas
```sql
Columnas:
- id (uuid, PK)
- car_id (uuid, FK → cars, ON DELETE RESTRICT)
- renter_id (uuid, FK → profiles, ON DELETE RESTRICT)
- start_at, end_at (timestamptz)
- time_range (tstzrange) → generada automáticamente
- status (enum: pending/confirmed/in_progress/completed/cancelled/no_show)
- pickup_location, dropoff_location (geography(Point))
- total_amount (numeric)
- currency (char(3), default 'ARS')
- notes (text)
- metadata (jsonb)
- created_at, updated_at

Constraint especial:
- EXCLUDE para evitar solapamiento de reservas por auto
- Solo aplica a bookings con status: pending/confirmed/in_progress/completed

Índices:
- GiST en (car_id, time_range)
- car_id, renter_id, status

Políticas RLS:
- Lectura: renter, owner del auto, admins
- Inserción: usuario se reserva a sí mismo
- Actualización: renter y owner pueden actualizar
```

### 7. **payments** - Pagos
```sql
Columnas:
- id (uuid, PK)
- booking_id (uuid, FK → bookings, ON DELETE CASCADE)
- provider (enum: mercadopago/stripe/otro)
- provider_payment_id (text) → ID externo del PSP
- provider_intent_id (text)
- status (enum: requires_payment/processing/succeeded/failed/refunded/partial_refund/chargeback)
- amount (numeric)
- fee_amount (numeric)
- net_amount (numeric) → generado: amount - fee_amount
- currency (char(3))
- receipt_url (text)
- raw (jsonb) → payload completo del PSP
- created_at

Políticas RLS:
- Lectura: renter, owner, admins
- Escritura: solo admins (normalmente via service_role)
```

### 8. **webhook_events** - Eventos de Webhooks (Idempotencia)
```sql
Columnas:
- id (uuid, PK)
- provider (payment_provider)
- event_type (text)
- idempotency_key (text, unique per provider)
- payload (jsonb)
- status (enum: pending/processed/error)
- error_message (text)
- processed_at (timestamptz)
- received_at (timestamptz)

Constraint: UNIQUE (provider, idempotency_key)

Uso: Evita procesar el mismo webhook múltiples veces
```

### 9. **reviews** - Reseñas
```sql
Columnas:
- id (uuid, PK)
- booking_id (uuid, FK → bookings)
- reviewer_id (uuid, FK → profiles)
- reviewee_id (uuid, FK → profiles)
- rating (int, 1-5)
- comment (text)
- created_at

Constraint: UNIQUE (booking_id, reviewer_id)

Trigger: recompute_car_rating() → actualiza rating_avg y rating_count en tabla cars

Función auxiliar: user_can_review(booking_id)
```

### 10. **booking_contracts** - Contratos de Reserva
```sql
Documentos legales asociados a bookings
```

### 11. **car_handover_points** - Puntos de Entrega
```sql
Ubicaciones donde se puede entregar/recoger el auto
```

### 12. **car_tracking_sessions** - Sesiones de Tracking
```sql
Seguimiento del auto durante la reserva
```

### 13. **car_tracking_points** - Puntos de Tracking
```sql
Historial de ubicaciones del auto
```

### 14. **disputes** - Disputas
```sql
Gestión de conflictos entre renter y owner
```

### 15. **dispute_evidence** - Evidencia de Disputas
```sql
Archivos y pruebas relacionadas a disputas
```

### 16. **fees** - Cargos Adicionales
```sql
Cargos extra aplicados a bookings (combustible, daños, etc.)
```

### 17. **messages** - Mensajes
```sql
Sistema de mensajería entre usuarios
```

### 18. **pricing_overrides** - Override de Precios
```sql
Precios especiales por fecha (ej: precio mayor en feriados)
```

### 19. **promos** - Promociones
```sql
Códigos de descuento y promociones
```

### 20. **spatial_ref_sys** - Sistemas de Referencia Espacial
```sql
Tabla de PostGIS para coordenadas geográficas
```

---

## 🔧 Extensiones PostgreSQL Instaladas

| Extensión | Versión | Propósito |
|-----------|---------|-----------|
| **pgcrypto** | 1.3 | gen_random_uuid(), encriptación |
| **postgis** | 3.3.7 | Geolocalización (geography, Point, distancias) |
| **btree_gist** | 1.7 | Exclusion constraint en bookings (no overlap) |
| **uuid-ossp** | 1.1 | uuid_generate_v4() (alternativa) |

---

## 📋 Tipos Enum Personalizados

```sql
1. user_role → 'renter', 'owner', 'admin'
2. car_status → 'draft', 'active', 'suspended', 'maintenance'
3. transmission → 'manual', 'automatic'
4. fuel_type → 'nafta', 'gasoil', 'hibrido', 'electrico'
5. booking_status → 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
6. payment_provider → 'mercadopago', 'stripe', 'otro'
7. payment_status → 'requires_payment', 'processing', 'succeeded', 'failed', 'refunded', 'partial_refund', 'chargeback'
8. webhook_status → 'pending', 'processed', 'error'
9. dispute_status → 'open', 'in_review', 'resolved', 'rejected'
10. rating_role → 'owner_rates_renter', 'renter_rates_owner'
11. cancel_policy → (valores no listados aún)
```

---

## ⚙️ Funciones RPC Personalizadas

### Funciones de Negocio:

1. **can_manage_car(car_id uuid) → boolean**
   - Verifica si el usuario actual puede administrar un auto

2. **is_admin() → boolean**
   - Verifica si el usuario actual es admin

3. **user_can_review(booking_id uuid) → boolean**
   - Verifica si el usuario puede dejar una reseña

4. **has_booking_conflict(car_id uuid, start_at timestamp, end_at timestamp) → boolean**
   - Verifica si hay conflicto de fechas

5. **estimate_total_amount(car_id uuid, start_date date, end_date date) → numeric**
   - Calcula el monto total de una reserva

6. **quote_booking(...)**
   - Genera una cotización de reserva

7. **cancel_with_fee(...)**
   - Cancela una reserva aplicando fee según política

8. **compute_cancel_fee(...)**
   - Calcula el fee de cancelación

9. **search_cars_by_city_and_dates(city text, start_at timestamp, end_at timestamp)**
   - Busca autos disponibles por ciudad y fechas

10. **search_cars_by_location(lat double, lng double, radius_km double)**
    - Busca autos cerca de una ubicación (PostGIS)

11. **autoclose_tracking_if_returned()**
    - Cierra sesiones de tracking automáticamente

### Funciones Auxiliares:

- **set_updated_at()** → Trigger function para updated_at
- **recompute_car_rating()** → Trigger para recalcular rating de autos

---

## 🔐 Row Level Security (RLS)

**Todas las tablas tienen RLS activado.**

### Patrones de políticas:

#### Perfiles:
- ✅ Usuarios ven su propio perfil + admins ven todos
- ✅ Solo el usuario puede actualizar su perfil

#### Autos:
- ✅ Público ve autos activos
- ✅ Owner ve todos sus autos (draft, suspended, etc.)
- ✅ Solo owner puede crear/modificar/eliminar

#### Fotos:
- ✅ Público ve fotos de autos activos
- ✅ Solo owner puede subir/editar

#### Reservas:
- ✅ Renter y owner ven la reserva
- ✅ Renter crea reserva para sí mismo
- ✅ Ambos pueden actualizar (cambiar estado)

#### Pagos:
- ✅ Solo renter y owner ven pagos
- ✅ Escritura típicamente via service_role (backend)

#### Webhooks:
- ✅ Solo admins (normalmente service_role desde Worker)

---

## 🎯 Constraints y Validaciones

### Checks:
- `cars.year` → entre 1980 y año actual + 1
- `cars.seats` → entre 1 y 9
- `cars.doors` → entre 2 y 6
- `cars.price_per_day` → >= 0
- `bookings.end_at` → > start_at
- `bookings.total_amount` → >= 0
- `reviews.rating` → entre 1 y 5

### Exclusion Constraint (Anti-Overlap):
```sql
-- En bookings:
EXCLUDE USING gist (car_id WITH =, time_range WITH &&)
WHERE (status IN ('pending','confirmed','in_progress','completed'))
```
**Previene doble-reserva del mismo auto en las mismas fechas.**

### Foreign Keys:
- Mayoría con `ON DELETE CASCADE` (fotos, locations, etc.)
- Bookings con `ON DELETE RESTRICT` (no se puede borrar auto/usuario con reservas)

---

## 🗄️ Storage Buckets (Sugeridos)

Aunque la estructura SQL está lista, necesitas crear estos buckets en Supabase Storage:

1. **car-photos** (público)
   - Fotos de autos
   - Política: lectura pública, escritura solo owners

2. **documents** (privado)
   - Contratos, licencias de conducir, DNI
   - Política: lectura/escritura restringida por RLS

3. **dispute-evidence** (privado)
   - Fotos de daños, evidencias de disputas

---

## 📝 Queries de Ejemplo

### Buscar autos disponibles en Buenos Aires del 20 al 25 de octubre:
```sql
SELECT * FROM search_cars_by_city_and_dates(
  'Buenos Aires',
  '2025-10-20 00:00:00',
  '2025-10-25 00:00:00'
);
```

### Buscar autos cerca de una ubicación (10km):
```sql
SELECT * FROM search_cars_by_location(
  -34.6037,  -- lat Buenos Aires
  -58.3816,  -- lng Buenos Aires
  10         -- radio en km
);
```

### Cotizar una reserva:
```sql
SELECT * FROM quote_booking(
  car_id := 'uuid-del-auto',
  start_at := '2025-10-20',
  end_at := '2025-10-25'
);
```

### Verificar disponibilidad:
```sql
SELECT has_booking_conflict(
  'uuid-del-auto',
  '2025-10-20 00:00:00'::timestamptz,
  '2025-10-25 00:00:00'::timestamptz
);
-- Retorna true si hay conflicto, false si está disponible
```

---

## 🚀 Próximos Pasos

Dado que la estructura ya existe, las siguientes tareas son:

1. ✅ **Configurar variables de entorno** - COMPLETADO
2. ✅ **Verificar MCP connection** - COMPLETADO
3. 🔄 **Poblar datos de prueba**:
   - Crear perfiles de usuarios
   - Publicar autos de ejemplo
   - Crear reservas de prueba
4. 🔄 **Integrar con Angular**:
   - Actualizar modelos TypeScript en `core/models`
   - Adaptar servicios para usar las funciones RPC
   - Implementar búsqueda con filtros
5. 🔄 **Configurar Storage buckets**
6. 🔄 **Implementar upload de fotos**
7. 🔄 **Integrar Mercado Pago** (reemplazar mock)

---

## 📞 Conexión

```bash
# PostgreSQL directo:
PGPASSWORD="5jEWdz26QWsA1hE4" psql \
  -h aws-1-us-east-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.obxvffplochgeiclibng \
  -d postgres
```

```typescript
// Supabase JS Client:
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://obxvffplochgeiclibng.supabase.co',
  'eyJhbGci...' // anon key
)
```

---

**Última actualización**: 2025-10-16
**Documento generado por**: Claude Code MCP Verification
