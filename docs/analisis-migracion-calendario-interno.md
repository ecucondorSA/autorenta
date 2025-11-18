# 📋 Análisis para Migración a Calendario Interno

**Fecha**: 2025-11-16
**Objetivo**: Responder preguntas críticas antes de migrar de Google Calendar a sistema interno

---

## 🔍 Estado Actual del Sistema

### Tablas de Base de Datos Existentes

#### 1. **`car_blocked_dates`** ✅ (YA EXISTE - Sistema Interno)
```sql
- id: UUID PRIMARY KEY
- car_id: UUID (FK a cars)
- blocked_from: DATE
- blocked_to: DATE
- reason: TEXT ('maintenance', 'personal_use', 'vacation', 'other')
- notes: TEXT (opcional)
- created_at: TIMESTAMPTZ
- created_by: UUID (FK a auth.users)
```

**Estado**: ✅ **Ya está en uso** por `CarBlockingService`
**Uso actual**: Bloqueos manuales del locador
**RLS**: Implementado (solo owner puede ver/editar sus bloqueos)

#### 2. **`bookings`** ✅ (YA EXISTE - Sistema Interno)
```sql
- id: UUID PRIMARY KEY
- car_id: UUID
- start_date: DATE
- end_date: DATE
- status: TEXT ('pending', 'approved', 'active', 'completed', 'cancelled')
- google_calendar_event_id: TEXT (nullable) ⚠️
- calendar_synced_at: TIMESTAMPTZ (nullable) ⚠️
- calendar_sync_enabled: BOOLEAN (default true) ⚠️
```

**Estado**: ✅ **Sistema principal de reservas**
**Uso actual**: Todas las reservas se guardan aquí
**Campos Google**: Solo para tracking de sincronización (opcionales)

#### 3. **`google_calendar_tokens`** ⚠️ (Solo para Google)
```sql
- user_id: UUID PRIMARY KEY
- access_token: TEXT
- refresh_token: TEXT
- expires_at: TIMESTAMPTZ
- primary_calendar_id: TEXT
- sync_enabled: BOOLEAN
```

**Estado**: ⚠️ **Solo para integración Google**
**Uso**: OAuth tokens de usuarios conectados

#### 4. **`car_google_calendars`** ⚠️ (Solo para Google)
```sql
- car_id: UUID PRIMARY KEY
- google_calendar_id: TEXT UNIQUE
- calendar_name: TEXT
- owner_id: UUID
- sync_enabled: BOOLEAN
- last_synced_at: TIMESTAMPTZ
```

**Estado**: ⚠️ **Solo para integración Google**
**Uso**: Asocia calendarios de Google con autos

#### 5. **`calendar_sync_log`** ⚠️ (Solo para Google - Auditoría)
```sql
- booking_id: UUID
- operation: TEXT ('create', 'update', 'delete')
- status: TEXT ('success', 'failed')
- google_calendar_event_id: TEXT
- error_message: TEXT
```

**Estado**: ⚠️ **Solo para auditoría de sync Google**

---

## 📊 Respuestas a Tus Preguntas

### 1. Alcance Exacto

#### ❓ ¿Eliminar TODA la integración Google o mantener como opción secundaria?

**Recomendación**: **Eliminar completamente** por estas razones:

**Razones para eliminar completamente**:
- ✅ Ya existe sistema interno funcional (`car_blocked_dates` + `bookings`)
- ✅ `CarBlockingService` ya funciona sin Google
- ✅ `CarAvailabilityService` ya consulta `bookings` + `car_blocked_dates`
- ✅ Menos complejidad (sin OAuth, sin tokens, sin Edge Functions)
- ✅ Menos puntos de falla (sin dependencia externa)
- ✅ Mejor performance (consultas directas a DB)

**Si mantener como secundaria**:
- ⚠️ Duplicación de lógica (dos fuentes de verdad)
- ⚠️ Complejidad adicional (verificar ambas fuentes)
- ⚠️ Mantenimiento de código Google Calendar
- ⚠️ Confusión para usuarios (¿cuál es la fuente de verdad?)

**Conclusión**: **Eliminar completamente** es la mejor opción.

---

### 2. Persistencia Nueva

#### ❓ ¿Dónde van a vivir los eventos/bloqueos?

**✅ RESPUESTA: Ya existe y está funcionando**

**Tabla principal**: `car_blocked_dates` (ya existe, ya funciona)

**Estructura actual**:
```typescript
// Ya implementado en CarBlockingService
interface BlockedDateRange {
  id: string;
  car_id: string;
  blocked_from: string; // YYYY-MM-DD
  blocked_to: string;   // YYYY-MM-DD
  reason: 'maintenance' | 'personal_use' | 'vacation' | 'other';
  notes?: string;
  created_at: string;
  created_by: string;
}
```

**Fuentes de disponibilidad actuales**:
1. **`bookings`**: Reservas confirmadas (bloquean fechas automáticamente)
2. **`car_blocked_dates`**: Bloqueos manuales del locador

**Servicio que consolida ambas fuentes**:
- `CarAvailabilityService.getBlockedRangesWithDetails()` ya combina:
  - Bookings (tipo: `'booking'`)
  - Bloqueos manuales (tipo: `'manual_block'`)

**Conclusión**: **No necesitas nueva tabla**. El sistema interno ya está completo.

---

#### ❓ ¿Necesitamos importar eventos de Google?

**Recomendación**: **NO importar** por estas razones:

**Razones para NO importar**:
- ✅ Los bookings ya están en `bookings` (se sincronizaron cuando se crearon)
- ✅ Los bloqueos manuales en Google no tienen equivalente en AutoRenta
- ✅ Partir limpio evita inconsistencias
- ✅ Los usuarios pueden recrear bloqueos manuales si los necesitan

**Si decides importar**:
- ⚠️ Necesitarías mapear eventos de Google a `car_blocked_dates`
- ⚠️ Diferenciar entre bookings y bloqueos manuales
- ⚠️ Manejar duplicados (si ya existen en DB)
- ⚠️ Validar fechas y rangos

**Conclusión**: **Partir limpios desde la base local** es más seguro.

---

### 3. Experiencia de Usuario

#### ❓ En Owners: ¿Qué UI reemplaza "Conectar Google Calendar"?

**Recomendación**: **Eliminar el botón y mostrar gestión directa**

**Ubicaciones actuales del botón "Conectar Google Calendar"**:
1. `profile/profile.page.html` - Sección de calendario
2. `profile/calendar/calendar-settings.page.ts` - Página de configuración
3. `shared/components/google-calendar-connect/` - Componente reutilizable

**Reemplazo sugerido**:

**Opción A: Wizard de bloqueo rápido** (Recomendado)
```html
<!-- En lugar de "Conectar Google Calendar" -->
<div class="calendar-management">
  <h3>📅 Gestión de Disponibilidad</h3>
  <p>Bloquea fechas para mantenimiento, vacaciones u otros motivos</p>

  <button (click)="openBlockDatesWizard()" class="btn-primary">
    Bloquear Fechas
  </button>

  <!-- Vista rápida de próximos bloqueos -->
  <app-upcoming-blocks [carId]="carId"></app-upcoming-blocks>
</div>
```

**Opción B: Redirigir a calendario de disponibilidad**
```html
<!-- Botón que lleva directamente a /cars/:id/availability -->
<a [routerLink]="['/cars', carId, 'availability']" class="btn-primary">
  Gestionar Disponibilidad
</a>
```

**Componentes existentes que ya funcionan**:
- ✅ `AvailabilityCalendarPage` - Gestión por auto individual
- ✅ `MultiCarCalendarComponent` - Vista consolidada múltiples autos
- ✅ `BlockDateModalComponent` - Modal para crear bloqueos

**Conclusión**: **Usar componentes existentes**, solo eliminar referencias a Google.

---

#### ❓ En Renters: ¿Seguimos mostrando disponibilidad en detalle de auto?

**✅ RESPUESTA: Sí, y ya funciona sin Google**

**Componente actual**: `CalendarEventsListComponent`

**Flujo actual**:
```typescript
// calendar-events-list.component.ts
// ACTUALMENTE usa GoogleCalendarService.getCarCalendarAvailability()
// PERO puede cambiarse a CarAvailabilityService
```

**Cambio necesario**:
```typescript
// ANTES (Google Calendar)
this.googleCalendarService.getCarCalendarAvailability(carId, from, to)

// DESPUÉS (Sistema interno)
this.carAvailabilityService.getBlockedRangesWithDetails(carId, from, to)
```

**Ubicación en car-detail**:
- `features/cars/detail/car-detail.page.html`
- Ya muestra `app-calendar-events-list`

**Conclusión**: **Sí, mantener**, solo cambiar la fuente de datos de Google a sistema interno.

---

### 4. Compatibilidad

#### ❓ ¿Conservar histórico de reservas sincronizadas con Google?

**Recomendación**: **Sí, conservar campos pero marcarlos como legacy**

**Campos en `bookings` a conservar**:
```sql
-- Conservar pero marcar como legacy
google_calendar_event_id: TEXT (nullable)
calendar_synced_at: TIMESTAMPTZ (nullable)
calendar_sync_enabled: BOOLEAN (default false) -- Cambiar default a false
```

**Razones para conservar**:
- ✅ Auditoría histórica (saber qué bookings se sincronizaron)
- ✅ Debugging (si hay problemas con bookings antiguos)
- ✅ Migración gradual (si algún usuario necesita ver eventos antiguos)

**Acción recomendada**:
```sql
-- Migration: Marcar sync como deshabilitado por defecto
ALTER TABLE bookings
ALTER COLUMN calendar_sync_enabled SET DEFAULT false;

-- Opcional: Comentar que estos campos son legacy
COMMENT ON COLUMN bookings.google_calendar_event_id IS 'Legacy: Event ID from Google Calendar (deprecated)';
```

**Conclusión**: **Conservar campos**, pero marcar como legacy y deshabilitar sync por defecto.

---

#### ❓ ¿Hay integraciones externas que dependan de Google Calendar?

**✅ SÍ, hay varias integraciones que hay que apagar/redirigir**

#### A. Supabase Edge Functions

**Funciones a desactivar/eliminar**:
1. **`google-calendar-oauth`** (`supabase/functions/google-calendar-oauth/`)
   - OAuth flow completo
   - Callback handler
   - Token refresh
   - **Acción**: Eliminar o desactivar

2. **`sync-booking-to-calendar`** (`supabase/functions/sync-booking-to-calendar/`)
   - Sincroniza bookings a Google Calendar
   - **Acción**: Eliminar o desactivar

3. **`get-car-calendar-availability`** (`supabase/functions/get-car-calendar-availability/`)
   - Consulta Google Calendar API para disponibilidad
   - **Acción**: Redirigir a consulta local o eliminar

4. **`make-calendar-public`** (`supabase/functions/make-calendar-public/`)
   - Hace calendarios públicos en Google
   - **Acción**: Eliminar

#### B. Cloudflare Workers

**Worker a desactivar**:
1. **`google-calendar-sync`** (`functions/workers/google-calendar-sync/`)
   - Sincronización automática vía Cron
   - Webhook endpoint para notificaciones
   - **Acción**: Desactivar Cron Trigger y eliminar Worker

#### C. Servicios Frontend

**Servicios a modificar/eliminar**:
1. **`GoogleCalendarService`** (`core/services/google-calendar.service.ts`)
   - **Acción**: Eliminar completamente o marcar como deprecated
   - **Alternativa**: Crear `InternalCalendarService` que use `CarAvailabilityService`

2. **Componentes que usan GoogleCalendarService**:
   - `calendar-events-list.component.ts` - Cambiar a `CarAvailabilityService`
   - `calendar-management.component.ts` - Eliminar o simplificar
   - `google-calendar-connect.component.ts` - Eliminar
   - `google-calendar.component.ts` - Opcional: mantener solo para embed público

#### D. Tests E2E

**Tests a actualizar/eliminar**:
1. `tests/e2e/google-calendar-oauth.spec.ts` - Eliminar
2. `tests/e2e/google-calendar-full-flow.spec.ts` - Eliminar o adaptar

#### E. Secrets/Configuración

**Secrets a eliminar** (Supabase + Cloudflare):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_CALENDAR_API_KEY` (Cloudflare Worker)

**Conclusión**: **Hay múltiples integraciones** que requieren desactivación/eliminación.

---

## 📝 Plan de Migración Sugerido

### Fase 1: Preparación (Sin tocar código)

1. ✅ **Auditoría completa** (este documento)
2. ✅ **Backup de datos** (exportar `google_calendar_tokens`, `car_google_calendars`)
3. ✅ **Documentar dependencias** (mapear todos los usos de Google Calendar)

### Fase 2: Cambios en Base de Datos

1. ✅ **Marcar campos como legacy** en `bookings`
2. ✅ **Deshabilitar sync por defecto** (`calendar_sync_enabled = false`)
3. ⚠️ **Opcional**: Agregar comentarios SQL explicando deprecación

### Fase 3: Cambios en Servicios

1. ✅ **Actualizar `CalendarEventsListComponent`**:
   - Cambiar de `GoogleCalendarService` a `CarAvailabilityService`

2. ✅ **Eliminar/Deprecar `GoogleCalendarService`**:
   - Marcar como `@deprecated`
   - O eliminar completamente

3. ✅ **Verificar `CarAvailabilityService`**:
   - Ya funciona correctamente
   - Solo asegurar que consolida `bookings` + `car_blocked_dates`

### Fase 4: Cambios en UI

1. ✅ **Eliminar botones "Conectar Google Calendar"**:
   - `profile/profile.page.html`
   - `profile/calendar/calendar-settings.page.ts`
   - `shared/components/google-calendar-connect/`

2. ✅ **Reemplazar con gestión directa**:
   - Botón "Gestionar Disponibilidad" → `/cars/:id/availability`
   - O wizard de bloqueo rápido

3. ✅ **Actualizar `CalendarManagementComponent`**:
   - Eliminar o simplificar (ya no hay calendarios Google que gestionar)
   - Mostrar solo bloqueos locales

### Fase 5: Desactivar Integraciones Externas

1. ✅ **Desactivar Edge Functions**:
   - `google-calendar-oauth`
   - `sync-booking-to-calendar`
   - `get-car-calendar-availability`
   - `make-calendar-public`

2. ✅ **Desactivar Cloudflare Worker**:
   - `google-calendar-sync` (Cron Trigger + Worker)

3. ✅ **Eliminar Secrets**:
   - Google OAuth credentials de Supabase
   - Google Calendar API key de Cloudflare

### Fase 6: Limpieza

1. ✅ **Eliminar código no usado**:
   - `GoogleCalendarService` completo
   - Componentes de conexión Google
   - Tests E2E de Google Calendar

2. ✅ **Actualizar documentación**:
   - Eliminar referencias a Google Calendar
   - Actualizar guías de uso

---

## 🎯 Resumen de Respuestas

| Pregunta | Respuesta |
|----------|-----------|
| **Alcance** | Eliminar TODA la integración Google (no mantener como secundaria) |
| **Persistencia** | Ya existe: `car_blocked_dates` + `bookings` (no necesita nueva tabla) |
| **Importar eventos** | NO importar, partir limpios desde base local |
| **UI Owners** | Eliminar botón Google, mostrar gestión directa (usar componentes existentes) |
| **UI Renters** | Sí, mantener disponibilidad (solo cambiar fuente de datos) |
| **Conservar histórico** | Sí, conservar campos pero marcar como legacy |
| **Integraciones externas** | Sí, hay 4 Edge Functions + 1 Worker + múltiples componentes |

---

## ✅ Conclusión

**El sistema interno ya está completo y funcionando**. Solo necesitas:

1. **Eliminar código Google Calendar** (servicios, componentes, Edge Functions)
2. **Cambiar fuente de datos** en componentes que usan Google
3. **Actualizar UI** para eliminar referencias a Google
4. **Desactivar integraciones externas** (Workers, Edge Functions)

**No necesitas crear nuevas tablas ni importar datos**. El sistema actual con `car_blocked_dates` + `bookings` es suficiente.

---

**¿Procedemos con la migración según este plan?**






