# Google Calendar Integration - AutoRenta

Integración completa de Google Calendar API para sincronizar bookings automáticamente.

## 🎯 Características

- ✅ **OAuth 2.0 Flow** - Usuarios conectan sus calendarios de forma segura
- ✅ **Calendarios por Auto** - Cada auto tiene su propio calendario secundario
- ✅ **Sync Bidireccional** - Bookings se sincronizan automáticamente
- ✅ **Locadores y Locatarios** - Ambos pueden ver sus bookings en Google Calendar
- ✅ **Información Completa** - Eventos incluyen precio, links, y recordatorios
- ✅ **Colores por Estado** - pending=amarillo, approved=verde, active=azul, completed=gris, cancelled=rojo

## 📋 Requisitos Previos

1. **Google Cloud Project** con Calendar API habilitada
2. **OAuth 2.0 Credentials** (Client ID + Client Secret)
3. **Supabase Project** con Edge Functions habilitadas

## 🚀 Setup - Paso a Paso

### Paso 1: Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Google Calendar API**:
   ```
   APIs & Services → Library → Search "Google Calendar API" → Enable
   ```

4. Crea credenciales OAuth 2.0:
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   ```

5. Configura OAuth consent screen:
   ```
   Type: External (para testing)
   App name: AutoRenta
   User support email: [tu email]
   Developer contact: [tu email]

   Scopes:
   - https://www.googleapis.com/auth/calendar
   - https://www.googleapis.com/auth/calendar.events
   ```

6. Configura Authorized redirect URIs:
   ```
   Development:
   https://[YOUR-SUPABASE-PROJECT].supabase.co/functions/v1/google-calendar-oauth?action=handle-callback

   Production:
   https://[YOUR-PRODUCTION-SUPABASE].supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
   ```

7. Copia tus credenciales:
   - **Client ID**: `xxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxxxx`

### Paso 2: Supabase Configuration

1. **Configurar secrets en Supabase:**
   ```bash
   # Via Supabase Dashboard
   Project Settings → Edge Functions → Secrets

   GOOGLE_OAUTH_CLIENT_ID=[tu-client-id]
   GOOGLE_OAUTH_CLIENT_SECRET=[tu-client-secret]
   GOOGLE_OAUTH_REDIRECT_URI=https://[project].supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
   FRONTEND_URL=http://localhost:4200  # Development
   ```

2. **Deploy migrations:**
   ```bash
   # Aplicar migration de database
   supabase db push

   # O manualmente:
   psql -h [supabase-host] -U postgres -d postgres < supabase/migrations/20251112_add_google_calendar_integration.sql
   ```

3. **Deploy Edge Functions:**
   ```bash
   # Deploy OAuth handler
   supabase functions deploy google-calendar-oauth

   # Deploy sync service
   supabase functions deploy sync-booking-to-calendar
   ```

### Paso 3: Angular Environment Variables

Agrega a `apps/web/src/environments/environment.ts` y `environment.development.ts`:

```typescript
export const environment = {
  // ... existing config ...

  // Google Calendar Integration
  googleCalendarEnabled: true,

  // Supabase URLs para Edge Functions
  supabaseUrl: 'https://[project].supabase.co',
  supabaseAnonKey: '[anon-key]',
};
```

### Paso 4: Verificar Instalación

```bash
# Test database tables
psql -h [host] -U postgres -d postgres -c "SELECT * FROM google_calendar_tokens LIMIT 1;"

# Test Edge Functions
curl -X GET "https://[project].supabase.co/functions/v1/google-calendar-oauth?action=status" \
  -H "Authorization: Bearer [user-token]"
```

## 🧪 Testing - Flujo Completo

### 1. Conectar Calendar (Como Locador)

```typescript
// En Profile Page
this.googleCalendarService.connectGoogleCalendar().subscribe({
  next: () => console.log('Calendar connected!'),
  error: (err) => console.error('Connection failed:', err)
});
```

**Flujo:**
1. Usuario hace click en "Conectar Google Calendar"
2. Se abre popup de Google OAuth
3. Usuario autoriza acceso a Calendar
4. Popup se cierra automáticamente
5. Token se guarda en `google_calendar_tokens`

### 2. Publicar Auto y Crear Calendar

Cuando un locador conecta su Google Calendar y publica un auto:
1. Edge Function crea un calendario secundario: "AutoRenta - [Marca] [Modelo]"
2. Calendar ID se guarda en `car_google_calendars`
3. Locador puede ver este calendario en Google Calendar

### 3. Aprobar Booking y Sync

Cuando un locador aprueba un booking:

```typescript
// bookings.service.ts
await this.approveBooking(bookingId);

// Sync to Google Calendar
this.googleCalendarService.syncBookingToCalendar(bookingId, 'create').subscribe({
  next: (result) => console.log('Synced:', result),
  error: (err) => console.error('Sync failed:', err)
});
```

**Resultado:**
- Evento creado en el calendario del auto (locador)
- Evento creado en calendario principal (locatario)
- Ambos reciben recordatorios 24h y 1h antes

### 4. Ver en Google Calendar

El locador verá:
```
Calendar: "AutoRenta - Toyota Corolla (2020)"
Event: "🚗 Booking: Toyota Corolla"
  - Fecha inicio: 2025-11-15 10:00
  - Fecha fin: 2025-11-20 10:00
  - Color: Verde (approved)
  - Descripción:
    📅 Booking AutoRenta
    🚗 Auto: Toyota Corolla (2020)
    📍 Booking ID: abc-123
    💰 Precio Total: $150,000
    📊 Estado: approved
    🔗 Ver detalles: [link]
```

El locatario verá en su calendario principal:
```
Event: "🚗 Mi Booking: Toyota Corolla"
  [misma información]
```

## 🔄 Estados y Colores

| Estado Booking | Color Google Calendar | Descripción |
|----------------|----------------------|-------------|
| `pending` | 🟡 Yellow (5) | Esperando aprobación del locador |
| `approved` | 🟢 Green (10) | Aprobado, pago pendiente |
| `active` | 🔵 Blue (9) | En curso, auto rentado |
| `completed` | ⚫ Gray (8) | Finalizado exitosamente |
| `cancelled` | 🔴 Red (11) | Cancelado |

## 📊 Database Schema

### `google_calendar_tokens`
```sql
user_id uuid PRIMARY KEY
access_token text NOT NULL
refresh_token text NOT NULL
expires_at timestamptz NOT NULL
primary_calendar_id text
sync_enabled boolean DEFAULT true
```

### `car_google_calendars`
```sql
car_id uuid PRIMARY KEY
google_calendar_id text UNIQUE NOT NULL
calendar_name text NOT NULL
owner_id uuid REFERENCES auth.users(id)
sync_enabled boolean DEFAULT true
```

### `bookings` (updated)
```sql
google_calendar_event_id text  -- Event ID en Google Calendar
calendar_synced_at timestamptz
calendar_sync_enabled boolean DEFAULT true
```

### `calendar_sync_log`
```sql
booking_id uuid
operation text  -- 'create', 'update', 'delete'
status text  -- 'success', 'failed'
google_calendar_event_id text
error_message text
```

## 🎨 UI Components

### Profile Page - Calendar Connection

```html
<!-- apps/web/src/app/features/profile/profile.page.html -->

<div class="calendar-integration-section">
  <h3>📅 Sincronización con Google Calendar</h3>

  @if (calendarConnected()) {
    <div class="connected-state">
      <span class="status-badge success">✓ Conectado</span>
      <p>Tus bookings se sincronizan automáticamente</p>
      <button (click)="disconnectCalendar()">Desconectar</button>
    </div>
  } @else {
    <div class="disconnected-state">
      <p>Conecta tu Google Calendar para ver tus bookings automáticamente</p>
      <button (click)="connectCalendar()" class="btn-primary">
        Conectar Google Calendar
      </button>
    </div>
  }
</div>
```

### Booking Detail - Sync Status

```html
<!-- Show sync status in booking detail -->
@if (booking().google_calendar_event_id) {
  <div class="calendar-sync-badge">
    <span class="icon">📅</span>
    <span>Sincronizado con Google Calendar</span>
    <a [href]="getCalendarEventUrl()" target="_blank">Ver en Calendar</a>
  </div>
}
```

## 🐛 Troubleshooting

### Error: "Missing authorization"
- Verificar que el usuario esté autenticado en Supabase
- Revisar que el token JWT no haya expirado

### Error: "Token exchange failed"
- Verificar `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET`
- Confirmar que redirect URI coincide exactamente con Google Cloud Console

### Error: "Failed to create car calendar"
- Verificar que el access_token no haya expirado
- Llamar `refreshToken()` si es necesario
- Revisar scopes de OAuth (debe incluir `calendar` y `calendar.events`)

### Calendario no se sincroniza
1. Verificar conexión: `SELECT * FROM google_calendar_tokens WHERE user_id = '[uuid]';`
2. Revisar logs: `SELECT * FROM calendar_sync_log WHERE status = 'failed' ORDER BY created_at DESC;`
3. Verificar que `booking.calendar_sync_enabled = true`

### Eventos duplicados
- Cada booking debe tener un `google_calendar_event_id` único
- Si hay duplicados, eliminar y recrear con operation='delete' + operation='create'

## 🔐 Security Considerations

1. **Tokens Storage**: Access tokens y refresh tokens se guardan encriptados en Supabase
2. **RLS Policies**: Users solo pueden ver sus propios tokens
3. **Service Role Key**: Solo las Edge Functions tienen acceso al service role key
4. **CORS**: Edge Functions validan origin del request
5. **Scopes Mínimos**: Solo solicitamos `calendar` y `calendar.events` (no `calendar.readonly`)

## 📚 API Reference

### GoogleCalendarService

```typescript
// Connect user's Google Calendar
connectGoogleCalendar(): Observable<void>

// Get connection status
getConnectionStatus(): Observable<CalendarConnectionStatus>

// Disconnect calendar
disconnectCalendar(): Observable<void>

// Sync booking to calendar
syncBookingToCalendar(bookingId: string, operation: 'create' | 'update' | 'delete'): Observable<SyncBookingResponse>

// Check if connected
isCalendarConnected(): Observable<boolean>

// Refresh expired token
refreshToken(): Observable<void>
```

### Edge Functions

#### `google-calendar-oauth`
```bash
GET /functions/v1/google-calendar-oauth?action=get-auth-url
GET /functions/v1/google-calendar-oauth?action=handle-callback&code=[code]&state=[user_id]
GET /functions/v1/google-calendar-oauth?action=status
GET /functions/v1/google-calendar-oauth?action=refresh-token
GET /functions/v1/google-calendar-oauth?action=disconnect
```

#### `sync-booking-to-calendar`
```bash
POST /functions/v1/sync-booking-to-calendar
Body: { booking_id: string, operation: 'create' | 'update' | 'delete' }
```

## 🎯 Roadmap

- [ ] UI Component para "Connect Calendar" en Profile
- [ ] Auto-sync on booking approval (trigger o webhook)
- [ ] Bulk sync de bookings existentes
- [ ] Calendar widget embed en dashboard
- [ ] Notificaciones push cuando se crea evento
- [ ] Soporte para múltiples calendarios (trabajo, personal)
- [ ] Import de eventos externos a AutoRenta

## 📄 License

Part of AutoRenta MVP - All rights reserved.

---

**Last Updated**: 2025-11-12
**Version**: 1.0.0
**Author**: AutoRenta Team
