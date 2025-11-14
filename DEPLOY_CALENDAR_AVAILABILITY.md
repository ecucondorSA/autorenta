# Deploy Google Calendar Availability Endpoint

## 📦 Nuevo Endpoint Implementado

**Edge Function**: `get-car-calendar-availability`
**Ruta**: `GET /functions/v1/get-car-calendar-availability`
**Propósito**: Consultar disponibilidad de un auto desde Google Calendar

## 🚀 Deployment Steps

### Paso 1: Deploy Edge Function

```bash
# Deploy la nueva Edge Function
supabase functions deploy get-car-calendar-availability --project-ref pisqjmoklivzpwufhscx

# Verificar que se deployó correctamente
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep "get-car-calendar-availability"
```

**Output esperado:**
```
get-car-calendar-availability | ACTIVE | 1 | 2025-11-12 20:00:00
```

### Paso 2: Verificar Secrets Configurados

La función requiere estos secrets (deberían estar configurados del setup anterior):

```bash
# Verificar secrets
supabase secrets list --project-ref pisqjmoklivzpwufhscx

# Deberías ver:
# - GOOGLE_OAUTH_CLIENT_ID
# - GOOGLE_OAUTH_CLIENT_SECRET
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

Si faltan, configúralos:
```bash
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="[tu-client-id]" --project-ref pisqjmoklivzpwufhscx
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="[tu-secret]" --project-ref pisqjmoklivzpwufhscx
```

### Paso 3: Test del Endpoint

#### Test 1: Sin Google Calendar (fallback a DB local)

```bash
# Get user token from Supabase Dashboard
USER_TOKEN="[tu-jwt-token]"
CAR_ID="[uuid-de-un-auto]"

curl "https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/get-car-calendar-availability?car_id=$CAR_ID&from=2025-11-15&to=2025-11-20" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "apikey: [supabase-anon-key]"
```

**Response esperado (sin Google Calendar):**
```json
{
  "available": true,
  "blocked_dates": [],
  "events": [],
  "car_id": "xxx-xxx-xxx",
  "from": "2025-11-15",
  "to": "2025-11-20",
  "google_calendar_checked": false
}
```

#### Test 2: Con Google Calendar Conectado

**Pre-requisitos:**
1. Locador debe tener Google Calendar conectado
2. Auto debe tener calendario creado en `car_google_calendars`
3. Debe haber al menos un booking sincronizado

```bash
curl "https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/get-car-calendar-availability?car_id=$CAR_ID&from=2025-11-15&to=2025-11-20" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "apikey: [supabase-anon-key]"
```

**Response esperado (con eventos):**
```json
{
  "available": false,
  "blocked_dates": [
    "2025-11-16",
    "2025-11-17",
    "2025-11-18"
  ],
  "events": [
    {
      "date": "2025-11-16",
      "event_id": "google-calendar-event-id",
      "title": "🚗 Booking: Toyota Corolla",
      "description": "Booking details..."
    }
  ],
  "car_id": "xxx-xxx-xxx",
  "from": "2025-11-15",
  "to": "2025-11-20",
  "google_calendar_checked": true
}
```

### Paso 4: Test desde Frontend

```bash
# Iniciar app
npm run dev

# Ir a página de booking
# Abrir calendario
# Seleccionar fechas

# Verificar en Console:
# - "Loaded X blocked dates from Google Calendar"
# - Array de eventos bloqueados
```

## 🧪 Testing Scenarios

### Scenario 1: Auto Sin Google Calendar

**Setup:**
- Locador NO tiene Google Calendar conectado
- Auto NO tiene entrada en `car_google_calendars`

**Resultado:**
- ✅ Función consulta solo DB local (`bookings` table)
- ✅ Retorna `google_calendar_checked: false`
- ✅ Blocked dates vienen solo de bookings en DB

**Verificar:**
```sql
-- No debería haber token
SELECT * FROM google_calendar_tokens WHERE user_id = '[locador-uuid]';
-- Result: 0 rows

-- No debería haber calendario
SELECT * FROM car_google_calendars WHERE car_id = '[car-uuid]';
-- Result: 0 rows

-- Bookings en DB
SELECT fecha_inicio, fecha_fin, status FROM bookings
WHERE car_id = '[car-uuid]' AND status IN ('approved', 'active');
```

### Scenario 2: Auto Con Google Calendar

**Setup:**
1. Locador conecta Google Calendar: `profile.page.ts → connectGoogleCalendar()`
2. Locador publica auto → se crea calendario automáticamente
3. Locador aprueba booking → se sincroniza a Google Calendar

**Resultado:**
- ✅ Función consulta Google Calendar API
- ✅ Retorna `google_calendar_checked: true`
- ✅ Blocked dates incluyen eventos de Google Calendar
- ✅ Events array tiene detalles de cada booking

**Verificar:**
```sql
-- Debe haber token válido
SELECT expires_at, sync_enabled FROM google_calendar_tokens
WHERE user_id = '[locador-uuid]';
-- Result: expires_at > now(), sync_enabled = true

-- Debe haber calendario para el auto
SELECT google_calendar_id, calendar_name FROM car_google_calendars
WHERE car_id = '[car-uuid]';
-- Result: google_calendar_id, calendar_name

-- Bookings deben tener event_id
SELECT google_calendar_event_id FROM bookings
WHERE car_id = '[car-uuid]' AND status = 'approved';
-- Result: google_calendar_event_id = "abc123..."
```

### Scenario 3: Token Expirado (Auto-Refresh)

**Setup:**
- Token en DB expiró (`expires_at < now()`)
- Refresh token es válido

**Resultado:**
- ✅ Función detecta token expirado
- ✅ Llama a Google OAuth para refrescar
- ✅ Actualiza token en DB
- ✅ Continúa con query normal

**Verificar logs:**
```bash
supabase functions logs get-car-calendar-availability --project-ref pisqjmoklivzpwufhscx

# Debería ver:
# "Token expired, refreshing..."
# "Token refreshed successfully"
```

### Scenario 4: Error de Google Calendar API

**Setup:**
- Simular error (ej: calendar_id inválido, token revocado)

**Resultado:**
- ✅ Función hace fallback a DB local
- ✅ Retorna `google_calendar_checked: false`
- ✅ Error se loggea pero no rompe la función

**Verificar logs:**
```bash
supabase functions logs get-car-calendar-availability --project-ref pisqjmoklivzpwufhscx

# Debería ver:
# "Google Calendar API error: ..."
# "Falling back to local DB check"
```

## 📊 Architecture Flow

```
User selects dates in calendar
         ↓
Frontend: InlineCalendarModalComponent.ngOnInit()
         ↓
loadGoogleCalendarBlockedDates()
         ↓
GoogleCalendarService.getCarCalendarAvailability(carId, from, to)
         ↓
Edge Function: get-car-calendar-availability
         ↓
   ┌─────────────────────────────┐
   │  1. Validate parameters     │
   │  2. Get car & owner info    │
   │  3. Check Google Calendar   │
   │     token exists            │
   └─────────────────────────────┘
                ↓
        ┌───────────────┐
        │ Token exists? │
        └───────────────┘
         Yes ↓      ↓ No
             ↓      └─→ Query local DB (bookings table)
             ↓              ↓
   ┌─────────────────────┐ Return { blocked_dates, google_calendar_checked: false }
   │ Token expired?      │
   └─────────────────────┘
    Yes ↓         ↓ No
        ↓         └─→ Use current access_token
   ┌─────────────────────┐
   │ Refresh token       │
   │ Update DB           │
   └─────────────────────┘
                ↓
   ┌─────────────────────────────┐
   │ Get car_google_calendars    │
   │ google_calendar_id          │
   └─────────────────────────────┘
                ↓
        ┌───────────────┐
        │ Calendar      │
        │ exists?       │
        └───────────────┘
         Yes ↓      ↓ No
             ↓      └─→ Query local DB
             ↓
   ┌─────────────────────────────┐
   │ Query Google Calendar API   │
   │ GET /calendars/{id}/events  │
   │ ?timeMin=...&timeMax=...    │
   └─────────────────────────────┘
                ↓
   ┌─────────────────────────────┐
   │ Process events              │
   │ - Extract dates             │
   │ - Build blocked_dates array │
   │ - Build events array        │
   └─────────────────────────────┘
                ↓
   Return {
     available: boolean,
     blocked_dates: string[],
     events: BlockedDate[],
     google_calendar_checked: true
   }
                ↓
Frontend: googleCalendarDates.set(blocked_dates)
                ↓
allBlockedDates() = [...localBlockedDates, ...googleCalendarDates]
                ↓
Calendar UI shows blocked dates in gray
```

## 🔧 Troubleshooting

### Error: "Missing authorization"

**Causa**: No se envió JWT token en header
**Fix:**
```typescript
// Verificar que getAuthHeaders() incluye:
headers: {
  'Authorization': `Bearer ${session.access_token}`,
  'apikey': environment.supabaseAnonKey
}
```

### Error: "Car not found"

**Causa**: `car_id` no existe en DB
**Fix:** Verificar que el UUID es correcto

```sql
SELECT id, marca, modelo FROM cars WHERE id = '[car-id]';
```

### Error: "Failed to refresh Google Calendar token"

**Causa**: Refresh token expiró o fue revocado
**Fix:** Usuario debe reconectar Google Calendar

```typescript
// Reconectar:
googleCalendarService.disconnectCalendar().subscribe();
googleCalendarService.connectGoogleCalendar().subscribe();
```

### Error: "Failed to fetch Google Calendar events"

**Causa**: Google Calendar API error (rate limit, permissions, etc)
**Fix:**
1. Verificar que `google_calendar_id` es válido
2. Verificar scopes de OAuth (debe incluir `calendar.events`)
3. Check rate limits de Google Calendar API

### No se cargan blocked dates en UI

**Debug:**
```typescript
// En InlineCalendarModalComponent, agregar logs:
ngOnInit() {
  console.log('Car ID:', this.carId);
  console.log('Enable sync:', this.enableGoogleCalendarSync);

  this.checkGoogleCalendarConnection();
}

private checkGoogleCalendarConnection() {
  this.googleCalendar.isCalendarConnected().subscribe({
    next: (connected) => {
      console.log('Google Calendar connected:', connected);
      // ...
    }
  });
}
```

**Verificar:**
1. `carId` está definido y es string válido
2. `enableGoogleCalendarSync` es `true`
3. Service retorna `connected: true`
4. `loadGoogleCalendarBlockedDates()` se llama
5. Response tiene `blocked_dates` array

## 📚 Related Files

```
Backend:
- supabase/functions/get-car-calendar-availability/index.ts

Frontend:
- apps/web/src/app/core/services/google-calendar.service.ts
- apps/web/src/app/shared/components/inline-calendar-modal/inline-calendar-modal.component.ts
- apps/web/src/app/shared/components/inline-calendar-modal/inline-calendar-modal.component.html

Database:
- google_calendar_tokens table
- car_google_calendars table
- bookings table

Documentation:
- SETUP_GOOGLE_CALENDAR.md
- DATE_PICKER_IMPROVEMENTS.md
- docs/GOOGLE_CALENDAR_INTEGRATION.md
```

## ✅ Deployment Checklist

```
[ ] Edge Function deployada
[ ] Secrets configurados (GOOGLE_OAUTH_CLIENT_ID, SECRET)
[ ] Test endpoint con curl (sin Google Calendar)
[ ] Test endpoint con curl (con Google Calendar)
[ ] Frontend carga blocked dates correctamente
[ ] UI muestra badge "Sincronizado con Google Calendar"
[ ] Contador de fechas bloqueadas funciona
[ ] Fechas bloqueadas se deshabilitan en calendario
[ ] Error handling funciona (fallback a local DB)
[ ] Logs no muestran errores en production
```

---

**Last Updated**: 2025-11-12
**Version**: 1.0
**Status**: ✅ Ready for deployment
