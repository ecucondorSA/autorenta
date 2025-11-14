# Google Calendar Integration - Manual Setup Guide

## ⚠️ Estado Actual

**Database Migration**: ❌ No aplicada (problemas de conexión)
**Edge Functions**: ❌ No desplegadas
**Google OAuth**: ❌ No configurado
**Archivos creados**: ✅ Todos listos

---

## 📁 Archivos Creados

```
✅ supabase/migrations/20251112_add_google_calendar_integration.sql
✅ apply_google_calendar_migration.sql (versión simplificada)
✅ supabase/functions/google-calendar-oauth/index.ts
✅ supabase/functions/sync-booking-to-calendar/index.ts
✅ apps/web/src/app/core/services/google-calendar.service.ts
✅ docs/GOOGLE_CALENDAR_INTEGRATION.md (documentación completa)
```

---

## 🚀 Pasos de Instalación (Ejecutar en Orden)

### Paso 1: Aplicar Migration de Database

**Opción A: Desde Supabase Dashboard (Recomendado)**

1. Ve a: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql/new
2. Copia el contenido COMPLETO de: `apply_google_calendar_migration.sql`
3. Pega en el editor SQL
4. Click "Run"
5. Verifica que veas mensajes "✓ Created..." sin errores

**Opción B: Desde CLI (si resuelves conexión)**

```bash
supabase db push --password Ab.12345 --include-all
```

**Verificar que la migration se aplicó:**
```sql
-- Ejecuta en SQL Editor:
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('google_calendar_tokens', 'car_google_calendars', 'calendar_sync_log');

-- Deberías ver 3 filas
```

---

### Paso 2: Crear Proyecto en Google Cloud Console

1. Ve a: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Nombre: `AutoRenta`
4. Click "Create"

**Habilitar Google Calendar API:**
```
1. APIs & Services → Library
2. Busca: "Google Calendar API"
3. Click "Enable"
```

**Crear OAuth 2.0 Credentials:**
```
1. APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Si pide, configura OAuth consent screen primero:
   - User Type: External
   - App name: AutoRenta
   - User support email: [tu email]
   - Developer contact: [tu email]
   - Scopes: Agregar:
     • https://www.googleapis.com/auth/calendar
     • https://www.googleapis.com/auth/calendar.events
   - Test users: Agrega tu email
   - Save

4. Ahora crea OAuth Client ID:
   - Application type: Web application
   - Name: AutoRenta Web
   - Authorized redirect URIs:
     • https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
     • http://localhost:4200/profile (para testing)
   - Click "Create"

5. COPIA y GUARDA:
   - Client ID: xxxxx.apps.googleusercontent.com
   - Client Secret: xxxxx
```

---

### Paso 3: Deploy Edge Functions

```bash
# Deploy OAuth handler
supabase functions deploy google-calendar-oauth --project-ref pisqjmoklivzpwufhscx

# Deploy sync service
supabase functions deploy sync-booking-to-calendar --project-ref pisqjmoklivzpwufhscx
```

**Verificar deployment:**
```bash
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep "google-calendar"
```

Deberías ver:
```
google-calendar-oauth                | ACTIVE
sync-booking-to-calendar             | ACTIVE
```

---

### Paso 4: Configurar Secrets en Supabase

**Opción A: Desde Dashboard (Recomendado)**

1. Ve a: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/settings/functions
2. Secrets → Add Secret
3. Agrega estos 3 secrets:

```
Name: GOOGLE_OAUTH_CLIENT_ID
Value: [tu Client ID de Google Cloud]

Name: GOOGLE_OAUTH_CLIENT_SECRET
Value: [tu Client Secret de Google Cloud]

Name: GOOGLE_OAUTH_REDIRECT_URI
Value: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback

Name: FRONTEND_URL
Value: http://localhost:4200
```

**Opción B: Desde CLI**

```bash
# Set secrets
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="[tu-client-id]" --project-ref pisqjmoklivzpwufhscx
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="[tu-secret]" --project-ref pisqjmoklivzpwufhscx
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
supabase secrets set FRONTEND_URL="http://localhost:4200" --project-ref pisqjmoklivzpwufhscx

# Verify
supabase secrets list --project-ref pisqjmoklivzpwufhscx
```

---

### Paso 5: Testing

**Test 1: Verificar Database**
```sql
-- Ejecuta en SQL Editor:
SELECT
  'google_calendar_tokens' as table_name,
  COUNT(*) as row_count
FROM google_calendar_tokens
UNION ALL
SELECT 'car_google_calendars', COUNT(*) FROM car_google_calendars
UNION ALL
SELECT 'calendar_sync_log', COUNT(*) FROM calendar_sync_log;

-- Debería retornar 3 filas con 0 registros (aún no hay datos)
```

**Test 2: Verificar Edge Functions**
```bash
# Test OAuth endpoint
curl "https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=status" \
  -H "Authorization: Bearer [tu-user-token]"

# Debería retornar: {"connected":false,"expires_at":null,"primary_calendar_id":null}
```

**Test 3: Conectar Google Calendar (desde Angular)**

1. Inicia la app: `npm run dev`
2. Ve a: http://localhost:4200/profile
3. Agrega botón "Conectar Google Calendar" (ver paso 6)
4. Click en el botón → debería abrir popup de Google
5. Autoriza → popup se cierra → refresh page
6. Verifica en SQL Editor:
```sql
SELECT * FROM google_calendar_tokens WHERE user_id = auth.uid();
```

---

### Paso 6: UI Components (Opcional - para testing)

Agrega este botón temporalmente en `apps/web/src/app/features/profile/profile.page.html`:

```html
<!-- Agregar en cualquier parte del profile -->
<div class="google-calendar-section" style="margin: 20px; padding: 20px; border: 1px solid #ccc;">
  <h3>🗓️ Google Calendar</h3>

  <div *ngIf="!calendarConnected">
    <p>Conecta tu Google Calendar para sincronizar bookings automáticamente</p>
    <button
      (click)="connectGoogleCalendar()"
      style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Conectar Google Calendar
    </button>
  </div>

  <div *ngIf="calendarConnected">
    <p style="color: green;">✓ Conectado exitosamente</p>
    <button
      (click)="disconnectGoogleCalendar()"
      style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Desconectar
    </button>
  </div>
</div>
```

Y en `profile.page.ts`:

```typescript
import { GoogleCalendarService } from '../../core/services/google-calendar.service';

export class ProfilePage {
  private googleCalendarService = inject(GoogleCalendarService);
  calendarConnected = signal(false);

  ngOnInit() {
    // Check connection status
    this.googleCalendarService.getConnectionStatus().subscribe({
      next: (status) => this.calendarConnected.set(status.connected),
      error: (err) => console.error('Error checking calendar status:', err)
    });
  }

  connectGoogleCalendar() {
    this.googleCalendarService.connectGoogleCalendar().subscribe({
      next: () => {
        console.log('Calendar connected!');
        this.calendarConnected.set(true);
      },
      error: (err) => console.error('Error connecting calendar:', err)
    });
  }

  disconnectGoogleCalendar() {
    this.googleCalendarService.disconnectCalendar().subscribe({
      next: () => {
        console.log('Calendar disconnected');
        this.calendarConnected.set(false);
      },
      error: (err) => console.error('Error disconnecting:', err)
    });
  }
}
```

---

## 🧪 Testing Completo

### Scenario 1: Locador conecta calendar y aprueba booking

```typescript
// 1. Locador conecta Google Calendar (desde profile)
googleCalendarService.connectGoogleCalendar().subscribe()

// 2. Aprueba un booking
bookingsService.approveBooking(bookingId).subscribe()

// 3. Sync a Google Calendar
googleCalendarService.syncBookingToCalendar(bookingId, 'create').subscribe({
  next: (result) => console.log('Synced:', result),
  // result: { success: true, event_id: "xxx", synced_to_locador: true, synced_to_locatario: false }
})

// 4. Verifica en Google Calendar:
// - Debería ver calendario "AutoRenta - [Marca] [Modelo]"
// - Evento con título "🚗 Booking: [Marca] [Modelo]"
// - Color verde (approved)
```

### Scenario 2: Locatario conecta calendar

```typescript
// 1. Locatario conecta Google Calendar
googleCalendarService.connectGoogleCalendar().subscribe()

// 2. Cuando locador aprueba, Edge Function sync automáticamente crea evento
// 3. Locatario ve evento en su calendario principal
// 4. Título: "🚗 Mi Booking: [Marca] [Modelo]"
```

---

## 🐛 Troubleshooting

### Error: "Missing authorization"
```
Causa: Usuario no está autenticado
Fix: Verificar que `auth.getSession()` retorna session válida
```

### Error: "Token exchange failed"
```
Causa: Client ID o Secret incorrectos
Fix: Verificar secrets en Supabase Dashboard
```

### Error: "Failed to create car calendar"
```
Causa: Access token expirado
Fix: Llamar googleCalendarService.refreshToken()
```

### Eventos no se sincronizan
```
1. Verificar que usuario tenga token:
   SELECT * FROM google_calendar_tokens WHERE user_id = '[uuid]';

2. Revisar logs:
   SELECT * FROM calendar_sync_log
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;

3. Verificar que booking tenga sync_enabled=true:
   SELECT calendar_sync_enabled FROM bookings WHERE id = '[booking-id]';
```

---

## 📚 Documentación Adicional

- **Documentación completa**: `docs/GOOGLE_CALENDAR_INTEGRATION.md`
- **Google Calendar API**: https://developers.google.com/calendar
- **OAuth 2.0 Flow**: https://developers.google.com/identity/protocols/oauth2

---

## ✅ Checklist de Instalación

```
[ ] Paso 1: Migration aplicada en Supabase (verificar tablas existen)
[ ] Paso 2: Proyecto creado en Google Cloud Console
[ ] Paso 3: Google Calendar API habilitada
[ ] Paso 4: OAuth credentials creadas (Client ID + Secret)
[ ] Paso 5: Edge Functions desplegadas (2 functions)
[ ] Paso 6: Secrets configurados en Supabase (4 secrets)
[ ] Paso 7: Testing: Conectar calendar desde profile
[ ] Paso 8: Testing: Aprobar booking y verificar sync
[ ] Paso 9: Testing: Ver evento en Google Calendar
```

---

## 🎯 Estado Final Esperado

Cuando todo esté configurado correctamente:

1. ✅ 4 tablas nuevas en database
2. ✅ 2 Edge Functions activas
3. ✅ OAuth flow funcionando (popup de Google)
4. ✅ Bookings sincronizando automáticamente
5. ✅ Calendarios por auto creados automáticamente
6. ✅ Locadores y locatarios ven eventos en Google Calendar
7. ✅ Recordatorios 24h y 1h antes automáticos

---

**Última actualización**: 2025-11-12
**Autor**: Claude Code
**Versión**: 1.0

¿Necesitas ayuda con algún paso? Consulta `docs/GOOGLE_CALENDAR_INTEGRATION.md` para más detalles.
