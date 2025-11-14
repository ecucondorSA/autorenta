# 🔍 Debug: Google Calendar No Se Muestra

## 📋 Resumen del Problema

El calendario de Google Calendar está implementado pero **NO se muestra** en la interfaz. Mirando la captura de pantalla, veo:
- El componente muestra "Conectando Google Calendar..." 
- El spinner está en la ventana emergente del OAuth
- El calendario en sí no aparece en la página

## 🏗️ Arquitectura Implementada

### Componentes y Servicios

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (Angular)                         │
├─────────────────────────────────────────────────────────┤
│ 1. GoogleCalendarComponent                              │
│    - Renderiza el iframe del calendario                │
│    - Requiere: calendarId (Google Calendar ID)         │
│                                                         │
│ 2. GoogleCalendarService                                │
│    - connectGoogleCalendar(): OAuth flow               │
│    - getCarCalendarId(carId): obtiene calendar ID     │
│    - getCalendarAvailability(): verifica disponibilidad│
│                                                         │
│ 3. car-detail.page.ts                                   │
│    - Llama a loadCarCalendarId()                       │
│    - Signal: calendarId()                               │
│    - Signal: calendarAvailability()                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            Backend (Supabase Edge Functions)            │
├─────────────────────────────────────────────────────────┤
│ 1. google-calendar-oauth/index.ts                       │
│    - Maneja el OAuth flow con Google                   │
│    - Guarda tokens en: google_calendar_tokens          │
│                                                         │
│ 2. sync-booking-to-calendar/index.ts                    │
│    - Sincroniza bookings → Google Calendar             │
│    - Crea calendarios por auto si no existen          │
│                                                         │
│ 3. get-car-calendar-availability/index.ts               │
│    - Consulta disponibilidad desde Google Calendar    │
│    - Retorna fechas bloqueadas                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            Database (Supabase PostgreSQL)               │
├─────────────────────────────────────────────────────────┤
│ 1. google_calendar_tokens                               │
│    - user_id (FK → auth.users)                         │
│    - access_token, refresh_token                       │
│    - primary_calendar_id                               │
│    - expires_at                                         │
│                                                         │
│ 2. car_google_calendars                                 │
│    - car_id (FK → cars)                                │
│    - google_calendar_id (UNIQUE)                       │
│    - calendar_name                                      │
│    - owner_id (FK → auth.users)                        │
│    - sync_enabled                                       │
└─────────────────────────────────────────────────────────┘
```

## 🐛 Problemas Identificados

### 1. **Falta de Calendar ID** ⚠️

El componente `app-google-calendar` necesita un `calendarId` para funcionar:

```typescript
// car-detail.page.html (línea ~589)
<app-google-calendar
  [calendarId]="calendarId()!"  // ❌ PROBLEMA: Puede ser null
  [view]="'month'"
  [language]="'es'"
  [height]="500"
/>
```

**Flujo actual:**
1. Usuario carga la página de detalle del auto
2. `loadCarCalendarId(carId)` se ejecuta
3. Llama a `googleCalendarService.getCarCalendarId(carId)`
4. Consulta la tabla `car_google_calendars` por `car_id`
5. **Si no hay registro → `calendarId()` = null**
6. El componente muestra error: "Calendar ID is required"

### 2. **Calendario No Creado Automáticamente** ⚠️

Los calendarios se crean SOLO cuando:
- Un booking se sincroniza por primera vez (ver `sync-booking-to-calendar/index.ts`)
- NO se crean al conectar Google Calendar

```typescript
// sync-booking-to-calendar/index.ts (línea 118-160)
const { data: carCalendar } = await supabase
  .from('car_google_calendars')
  .select('google_calendar_id, calendar_name')
  .eq('car_id', booking.car_id)
  .single();

if (!carCalendar) {
  // 🎯 AQUÍ se crea el calendario secundario
  const newCalendar = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars',
    { /* ... */ }
  );
  
  await supabase.from('car_google_calendars').insert({
    car_id: booking.car_id,
    google_calendar_id: newCalendar.id,
    calendar_name: `Autorenta - ${carName}`,
    owner_id: ownerId,
  });
}
```

**Problema:** Si el auto nunca tuvo un booking sincronizado → No hay calendar ID

### 3. **OAuth Flow Incompleto** ⚠️

El botón "Conectar Google Calendar" abre el OAuth popup, pero:

```typescript
// google-calendar.service.ts
connectGoogleCalendar(): Observable<void> {
  return this.getAuthorizationUrl().pipe(
    switchMap((authUrl) => {
      const popup = window.open(authUrl, 'Google Calendar Authorization', /*...*/);
      
      // 🔄 Poll for popup closure
      return new Observable<void>((observer) => {
        const pollInterval = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollInterval);
            observer.next();
            observer.complete();  // ✅ Completa pero NO recarga datos
          }
        }, 500);
      });
    }),
  );
}
```

**Problema:** Después del OAuth, la página NO refresca la lista de autos ni crea calendarios

### 4. **Calendario Privado por Defecto** ⚠️

Los calendarios creados por la API son **privados** por defecto:

```typescript
// sync-booking-to-calendar/index.ts
const newCalendarData = {
  summary: `Autorenta - ${carName}`,
  timeZone: 'America/Argentina/Buenos_Aires',
  // ❌ FALTA: public: true
};
```

**Problema:** El iframe de Google Calendar no puede acceder a calendarios privados

El embed de Google Calendar funciona SOLO con:
- Calendarios públicos
- O calendarios del usuario autenticado (pero requiere API key diferente)

## 🔧 Soluciones Propuestas

### Solución 1: Crear Calendarios al Conectar (RECOMENDADO) ✅

Modificar el flujo de OAuth para crear calendarios automáticamente:

```typescript
// google-calendar-oauth/index.ts
async function handleCallback() {
  // ... obtener tokens ...
  
  // 🎯 NUEVO: Crear calendarios para todos los autos del usuario
  const { data: userCars } = await supabase
    .from('cars')
    .select('id, brand, model')
    .eq('owner_id', userId);
  
  for (const car of userCars) {
    // Verificar si ya tiene calendario
    const existing = await supabase
      .from('car_google_calendars')
      .select('car_id')
      .eq('car_id', car.id)
      .single();
    
    if (!existing) {
      // Crear calendario en Google
      const calendar = await createGoogleCalendar(
        `Autorenta - ${car.brand} ${car.model}`,
        accessToken
      );
      
      // Guardar en BD
      await supabase.from('car_google_calendars').insert({
        car_id: car.id,
        google_calendar_id: calendar.id,
        calendar_name: calendar.summary,
        owner_id: userId,
      });
    }
  }
}
```

### Solución 2: Hacer Calendarios Públicos 🌐

Modificar la creación de calendarios para hacerlos públicos:

```typescript
// sync-booking-to-calendar/index.ts
const newCalendarData = {
  summary: `Autorenta - ${carName}`,
  timeZone: 'America/Argentina/Buenos_Aires',
};

const createResponse = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars',
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(newCalendarData),
  }
);

const newCalendar = await createResponse.json();

// 🎯 NUEVO: Hacer el calendario público
await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/${newCalendar.id}/acl`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      role: 'reader',
      scope: { type: 'default' }, // público para todos
    }),
  }
);
```

### Solución 3: UI de Estado Vacío 📋

Mostrar mensaje cuando no hay calendario:

```typescript
// car-detail.page.html
@if (showCalendarSection()) {
  @if (calendarId()) {
    <!-- Mostrar calendario -->
    <app-google-calendar [calendarId]="calendarId()!" />
  } @else {
    <!-- Estado vacío -->
    <div class="empty-calendar-state">
      <svg><!-- Icon --></svg>
      <h3>Calendario no configurado</h3>
      <p>
        El propietario aún no ha conectado su Google Calendar.
        Los horarios disponibles se mostrarán aquí una vez configurado.
      </p>
      @if (isOwner()) {
        <button (click)="connectGoogleCalendar()">
          Conectar Google Calendar
        </button>
      }
    </div>
  }
}
```

### Solución 4: Fallback a API Directa 🔄

Si el iframe falla, usar la API de Google Calendar directamente:

```typescript
// google-calendar.component.ts
async loadCalendarEvents() {
  try {
    // Intentar cargar eventos via API
    const events = await this.googleCalendarService
      .getCarCalendarAvailability(this.carId, this.from, this.to)
      .toPromise();
    
    // Renderizar eventos en un calendario custom (FullCalendar.io)
    this.renderCustomCalendar(events);
  } catch (error) {
    this.showError();
  }
}
```

## 🎯 Plan de Acción Inmediato

### Paso 1: Verificar Estado Actual

```typescript
// Agregar logs temporales en car-detail.page.ts
private async loadCarCalendarId(carId: string): Promise<void> {
  console.log('🔍 Loading calendar ID for car:', carId);
  
  this.googleCalendarService.getCarCalendarId(carId).subscribe({
    next: (calendarId) => {
      console.log('✅ Calendar ID found:', calendarId);
      this.calendarId.set(calendarId);
      this.showCalendarSection.set(!!calendarId);
    },
    error: (error) => {
      console.error('❌ Error loading calendar ID:', error);
      this.showCalendarSection.set(false);
    },
  });
}
```

### Paso 2: Verificar Base de Datos

```sql
-- Verificar si hay tokens guardados
SELECT 
  user_id,
  primary_calendar_id,
  expires_at,
  connected_at
FROM google_calendar_tokens;

-- Verificar si hay calendarios de autos
SELECT 
  c.id as car_id,
  c.brand,
  c.model,
  cgc.google_calendar_id,
  cgc.calendar_name,
  cgc.sync_enabled
FROM cars c
LEFT JOIN car_google_calendars cgc ON c.id = cgc.car_id
WHERE c.owner_id = 'USER_ID_AQUI';
```

### Paso 3: Implementar Fix Rápido

**Opción A - UI de Estado Vacío (30 min):**
1. Modificar `car-detail.page.html` con `@if/@else`
2. Agregar botón "Conectar Calendario"
3. Mostrar mensaje explicativo

**Opción B - Crear Calendarios Automáticamente (2 horas):**
1. Modificar `google-calendar-oauth/index.ts`
2. Agregar función `createCalendarsForUserCars()`
3. Hacer calendarios públicos con ACL
4. Recargar datos después del OAuth

**Opción C - Usar API Directa (4 horas):**
1. Instalar `@fullcalendar/angular`
2. Crear componente custom de calendario
3. Renderizar eventos desde la API
4. No depender del iframe embed

## 📊 Estado Actual de Implementación

| Componente | Estado | Funciona | Falta |
|------------|--------|----------|-------|
| OAuth Flow | ✅ | Sí | Crear calendarios después |
| Tokens guardados | ✅ | Sí | Refresh automático |
| Edge Functions | ✅ | Sí | Manejo de errores |
| Sync Bookings | ✅ | Sí | Testing |
| UI Calendario | ❌ | **NO** | Calendar ID + iframe |
| Calendarios por auto | ⚠️ | Parcial | Creación automática |
| RLS Policies | ✅ | Sí | - |

## 🔬 Debug Checklist

Para resolver el problema, verificar en orden:

- [ ] ¿El usuario ha conectado su Google Calendar? (tabla `google_calendar_tokens`)
- [ ] ¿El token está expirado? (campo `expires_at`)
- [ ] ¿Hay calendarios creados para los autos? (tabla `car_google_calendars`)
- [ ] ¿El `calendarId()` signal tiene valor? (console.log en component)
- [ ] ¿El calendario es público? (verificar ACL en Google Calendar)
- [ ] ¿Hay errores de CORS o iframe? (console del navegador)
- [ ] ¿La URL del iframe es correcta? (verificar en Network tab)

## 📝 Notas Adicionales

### Diferencia entre calendarios:

1. **primary_calendar_id**: Calendario principal del usuario (su email)
2. **google_calendar_id** (en car_google_calendars): Calendario secundario creado para cada auto

El iframe debe usar el **google_calendar_id** específico del auto, no el primary.

### Permisos requeridos:

```typescript
// Scopes necesarios
const scopes = [
  'https://www.googleapis.com/auth/calendar',           // Leer/escribir calendarios
  'https://www.googleapis.com/auth/calendar.events',    // Leer/escribir eventos
];
```

### Testing local:

```bash
# Verificar si el servidor local está corriendo
pnpm run dev

# Ver logs de las edge functions
npx supabase functions serve --debug

# Ejecutar tests E2E del calendario
pnpm run test:e2e tests/e2e/google-calendar-full-flow.spec.ts
```

---

**Status:** 🔴 NO FUNCIONA  
**Prioridad:** 🔥 ALTA  
**Estimación de fix:** 2-4 horas  
**Recomendación:** Implementar Solución 1 (crear calendarios al conectar) + Solución 3 (UI estado vacío)
