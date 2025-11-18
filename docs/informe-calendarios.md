# 📅 Informe del Sistema de Calendarios - AutoRenta

**Fecha de análisis**: 2025-11-16
**Versión del sistema**: 0.1.0
**Estado**: ✅ Funcional con integración Google Calendar

---

## 📊 Resumen Ejecutivo

AutoRenta cuenta con un **sistema completo de calendarios** que integra:
- **FullCalendar** para visualización interactiva
- **Google Calendar API** para sincronización bidireccional
- **Flatpickr** para selección de fechas
- **Componentes personalizados** para gestión de disponibilidad

El sistema permite a los **locadores** gestionar la disponibilidad de sus autos y a los **locatarios** verificar fechas disponibles antes de reservar.

---

## 🏗️ Arquitectura del Sistema

### 1. **Componentes de Calendario**

#### 1.1. **CalendarPage** (`features/calendar/calendar.page.ts`)
- **Propósito**: Demo/visualización de FullCalendar
- **Tecnología**: FullCalendar v6.1.8 (Angular)
- **Plugins**: dayGrid, timeGrid, interaction
- **Ruta**: `/calendar-demo`
- **Estado**: ✅ Funcional (recientemente corregido)

**Características**:
- Vista mensual interactiva
- Click en fechas para selección
- Eventos de ejemplo (reserva demo)

#### 1.2. **MultiCarCalendarComponent** (`dashboard/components/multi-car-calendar/`)
- **Propósito**: Vista consolidada de múltiples autos del locador
- **Tecnología**: Custom calendar con date-fns
- **Ruta**: Dashboard del locador
- **Estado**: ✅ Funcional

**Características**:
- Vista mensual personalizada
- Múltiples autos en una vista
- Selección múltiple de autos
- Bloqueo masivo de fechas
- Estadísticas: total, con bookings, bloqueados, disponibles
- Navegación entre meses
- Estados visuales: disponible, reservado, bloqueado, pasado

#### 1.3. **AvailabilityCalendarPage** (`cars/availability-calendar/`)
- **Propósito**: Gestión de disponibilidad por auto individual
- **Tecnología**: Flatpickr con personalización
- **Ruta**: `/cars/:id/availability`
- **Estado**: ✅ Funcional

**Características**:
- Calendario inline interactivo
- Visualización de reservas confirmadas
- Bloqueo manual de fechas
- Desbloqueo individual o masivo
- Validación: no permite bloquear fechas con reservas
- Estadísticas: bookings, bloqueos manuales, total bloqueado

#### 1.4. **GoogleCalendarComponent** (`shared/components/google-calendar/`)
- **Propósito**: Embed de Google Calendar público
- **Tecnología**: iframe con Google Calendar embed API
- **Estado**: ✅ Funcional

**Características**:
- Soporte para calendarios primarios y secundarios
- Múltiples vistas: month, week, day, agenda
- Configuración de idioma (es, en, pt)
- Opciones de visualización personalizables
- Manejo de errores y estados de carga

#### 1.5. **CalendarEventsListComponent** (`shared/components/calendar-events-list/`)
- **Propósito**: Lista de eventos bloqueados desde Google Calendar
- **Tecnología**: Integración con GoogleCalendarService
- **Estado**: ✅ Funcional

**Características**:
- Muestra fechas bloqueadas en un rango
- Integración con Google Calendar
- Formato de fechas en español
- Estados: loading, error, empty, con eventos

#### 1.6. **CalendarManagementComponent** (`shared/components/calendar-management/`)
- **Propósito**: Gestión de calendarios sincronizados
- **Tecnología**: Integración con GoogleCalendarService
- **Estado**: ✅ Funcional

**Características**:
- Lista de calendarios por auto
- Estado de sincronización
- Última sincronización
- Enlace directo a Google Calendar
- Copiar ID de calendario
- Estadísticas: total, activos, sincronizados hoy

---

### 2. **Servicios**

#### 2.1. **GoogleCalendarService** (`core/services/google-calendar.service.ts`)
- **Propósito**: Integración completa con Google Calendar API v3
- **Estado**: ✅ Funcional y completo

**Funcionalidades principales**:

1. **OAuth 2.0 Flow**
   - `getAuthorizationUrl()`: Obtiene URL de autorización
   - `connectGoogleCalendar()`: Abre popup OAuth y maneja callback
   - `getConnectionStatus()`: Verifica estado de conexión
   - `disconnectCalendar()`: Desconecta calendario
   - `refreshToken()`: Refresca token expirado

2. **Sincronización de Bookings**
   - `syncBookingToCalendar()`: Sincroniza booking (create/update/delete)
   - `syncBookingWithNotification()`: Wrapper con notificaciones automáticas
   - Soporte para sincronización bidireccional:
     - Locador: calendario del auto
     - Locatario: calendario personal

3. **Verificación de Disponibilidad**
   - `getCarCalendarAvailability()`: Consulta fechas bloqueadas en rango
   - `getCarCalendarId()`: Obtiene ID de calendario por auto
   - `getUserCarCalendars()`: Lista todos los calendarios del usuario

**Arquitectura**:
- Frontend (Angular): UI y OAuth popup
- Backend (Supabase Edge Functions): OAuth flow y sync logic
- Database: `google_calendar_tokens`, `car_google_calendars`

#### 2.2. **CarAvailabilityService** (`core/services/car-availability.service.ts`)
- **Propósito**: Gestión de disponibilidad de autos
- **Estado**: ✅ Funcional

**Funcionalidades**:
- `getBlockedRangesWithDetails()`: Obtiene rangos bloqueados con detalles
- Distingue entre:
  - `booking`: Reservas confirmadas
  - `manual_block`: Bloqueos manuales del locador

#### 2.3. **CarBlockingService** (`core/services/car-blocking.service.ts`)
- **Propósito**: Gestión de bloqueos manuales de fechas
- **Estado**: ✅ Funcional

**Funcionalidades**:
- `blockDates()`: Bloquea rango de fechas
- `bulkBlockDates()`: Bloqueo masivo para múltiples autos
- `unblockById()`: Desbloquea por ID
- `clearAllBlocks()`: Elimina todos los bloqueos manuales

---

### 3. **Integraciones y Dependencias**

#### 3.1. **FullCalendar**
```json
"@fullcalendar/angular": "^6.1.8"
"@fullcalendar/core": "^6.1.8"
"@fullcalendar/daygrid": "^6.1.8"
"@fullcalendar/timegrid": "^6.1.8"
"@fullcalendar/interaction": "^6.1.8"
```
- **Uso**: CalendarPage (demo)
- **Estado**: ✅ Instalado y funcional
- **Nota**: Recientemente corregido para Angular standalone

#### 3.2. **Flatpickr**
```json
"flatpickr": "^4.6.13"
```
- **Uso**: AvailabilityCalendarPage
- **Estado**: ✅ Funcional
- **Configuración**: Localización en español, modo range, inline

#### 3.3. **date-fns**
```json
"date-fns": "^2.30.0"
```
- **Uso**: Todos los componentes de calendario
- **Estado**: ✅ Funcional
- **Localización**: Español (es)

#### 3.4. **Google Calendar API**
- **Integración**: Via Supabase Edge Functions
- **Endpoints**:
  - `/functions/v1/google-calendar-oauth`
  - `/functions/v1/sync-booking-to-calendar`
  - `/functions/v1/get-car-calendar-availability`
- **Estado**: ✅ Funcional

---

## 🔄 Flujos de Trabajo

### 1. **Flujo de Conexión Google Calendar**

```
Usuario → Click "Conectar Google Calendar"
  → GoogleCalendarService.connectGoogleCalendar()
  → Abre popup OAuth
  → Usuario autoriza en Google
  → Callback a Supabase Edge Function
  → Guarda tokens en DB
  → postMessage al frontend
  → Actualiza UI con estado conectado
```

### 2. **Flujo de Sincronización de Booking**

```
Booking creado/actualizado/eliminado
  → GoogleCalendarService.syncBookingToCalendar()
  → Supabase Edge Function
  → Google Calendar API
  → Crea/actualiza/elimina evento
  → Retorna estado de sincronización
  → Notificación al usuario (opcional)
```

### 3. **Flujo de Verificación de Disponibilidad**

```
Usuario selecciona fechas
  → GoogleCalendarService.getCarCalendarAvailability()
  → Supabase Edge Function
  → Consulta Google Calendar API
  → Retorna fechas bloqueadas
  → UI muestra disponibilidad
```

### 4. **Flujo de Bloqueo Manual**

```
Locador selecciona fechas
  → AvailabilityCalendarPage / MultiCarCalendarComponent
  → CarBlockingService.blockDates()
  → Guarda en DB (car_availability_blocks)
  → Actualiza calendario
  → Opcional: Sincroniza con Google Calendar
```

---

## 📁 Estructura de Archivos

```
apps/web/src/app/
├── features/
│   ├── calendar/
│   │   └── calendar.page.ts          # FullCalendar demo
│   ├── cars/
│   │   └── availability-calendar/
│   │       └── availability-calendar.page.ts  # Gestión por auto
│   └── dashboard/
│       └── components/
│           └── multi-car-calendar/
│               └── multi-car-calendar.component.ts  # Vista múltiple
├── shared/
│   └── components/
│       ├── google-calendar/
│       │   └── google-calendar.component.ts    # Embed Google Calendar
│       ├── calendar-events-list/
│       │   └── calendar-events-list.component.ts  # Lista de eventos
│       └── calendar-management/
│           └── calendar-management.component.ts  # Gestión de calendarios
└── core/
    └── services/
        ├── google-calendar.service.ts          # Servicio principal
        ├── car-availability.service.ts         # Disponibilidad
        └── car-blocking.service.ts             # Bloqueos manuales
```

---

## 🗄️ Base de Datos

### Tablas Relacionadas

1. **`google_calendar_tokens`**
   - Almacena tokens OAuth de usuarios
   - Campos: `user_id`, `access_token`, `refresh_token`, `expires_at`

2. **`car_google_calendars`**
   - Asocia calendarios de Google con autos
   - Campos: `car_id`, `google_calendar_id`, `sync_enabled`, `last_synced_at`

3. **`car_availability_blocks`**
   - Bloqueos manuales de fechas
   - Campos: `car_id`, `start_date`, `end_date`, `reason`, `notes`

4. **`bookings`**
   - Reservas confirmadas (también bloquean fechas)
   - Campos: `car_id`, `start_date`, `end_date`, `status`

---

## 🎯 Casos de Uso

### Para Locadores

1. **Ver disponibilidad de todos sus autos**
   - Dashboard → MultiCarCalendarComponent
   - Vista consolidada con estadísticas

2. **Gestionar disponibilidad de un auto específico**
   - `/cars/:id/availability`
   - Bloquear/desbloquear fechas manualmente

3. **Conectar Google Calendar**
   - Sincronización automática de bookings
   - Calendario por auto

4. **Ver calendarios sincronizados**
   - CalendarManagementComponent
   - Estado de sincronización

### Para Locatarios

1. **Ver fechas disponibles**
   - Integrado en car-detail page
   - CalendarEventsListComponent muestra fechas bloqueadas

2. **Verificar disponibilidad en tiempo real**
   - GoogleCalendarService.getCarCalendarAvailability()
   - Verifica contra Google Calendar si está conectado

---

## 🔧 Configuración y Rutas

### Rutas Configuradas

```typescript
// Demo FullCalendar
{ path: 'calendar-demo', loadComponent: () => CalendarPage }

// Gestión de disponibilidad por auto
{ path: 'cars/:id/availability', loadComponent: () => AvailabilityCalendarPage }

// Configuración de calendario (perfil)
{ path: 'profile/calendar', loadComponent: () => CalendarSettingsPage }
```

### Variables de Entorno

```typescript
// Supabase
SUPABASE_URL
SUPABASE_ANON_KEY

// Google Calendar (backend)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

---

## ✅ Estado de Funcionalidades

| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| FullCalendar demo | ✅ Funcional | Recientemente corregido |
| Multi-car calendar | ✅ Funcional | Vista consolidada |
| Availability calendar | ✅ Funcional | Por auto individual |
| Google Calendar OAuth | ✅ Funcional | Popup + callback |
| Sincronización bookings | ✅ Funcional | Bidireccional |
| Verificación disponibilidad | ✅ Funcional | Tiempo real |
| Bloqueo manual | ✅ Funcional | Individual y masivo |
| Calendar management | ✅ Funcional | UI completa |
| Google Calendar embed | ✅ Funcional | iframe |

---

## 🐛 Problemas Conocidos y Limitaciones

### Problemas Resueltos Recientemente

1. ✅ **FullCalendar con Angular standalone**
   - **Problema**: `FullCalendarComponent` no es standalone
   - **Solución**: Usar `FullCalendarModule` en imports
   - **Estado**: Resuelto (2025-11-16)

2. ✅ **Errores de sintaxis en cars-conversion.page.ts**
   - **Problema**: Faltaban comillas en imports
   - **Solución**: Corregido sintaxis completa
   - **Estado**: Resuelto (2025-11-16)

### Limitaciones Actuales

1. **FullCalendar**: Solo usado en demo, no en producción
2. **Google Calendar**: Requiere OAuth flow (no automático)
3. **Sincronización**: Depende de tokens válidos (pueden expirar)

---

## 🚀 Mejoras Futuras Sugeridas

1. **Integración FullCalendar en producción**
   - Reemplazar Flatpickr en AvailabilityCalendarPage
   - Mejor UX con drag & drop

2. **Sincronización automática**
   - Webhooks de Google Calendar
   - Actualización en tiempo real

3. **Notificaciones push**
   - Cuando se bloquea fecha en Google Calendar externo
   - Alertas de conflictos

4. **Analytics de disponibilidad**
   - Reportes de ocupación
   - Predicción de demanda

5. **Sincronización con otros calendarios**
   - Outlook Calendar
   - Apple Calendar (iCal)

---

## 📚 Documentación Adicional

- **Google Calendar Service**: Ver código completo en `google-calendar.service.ts`
- **Edge Functions**: Ver en `supabase/functions/google-calendar-oauth/`
- **Tests E2E**: `tests/e2e/google-calendar-oauth.spec.ts`

---

## 📝 Notas Técnicas

### Angular Standalone Components
- Todos los componentes de calendario son standalone
- Compatible con Angular 20
- Imports directos de módulos (FullCalendarModule)

### Manejo de Estados
- Uso extensivo de Signals (Angular signals)
- Computed signals para valores derivados
- ChangeDetectionStrategy.OnPush donde aplica

### Seguridad
- Tokens OAuth almacenados en backend
- RLS policies en Supabase
- Validación de origen en postMessage

---

**Generado por**: Claude Code
**Última actualización**: 2025-11-16






