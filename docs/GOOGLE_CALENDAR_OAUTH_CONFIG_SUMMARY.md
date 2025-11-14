# Google Calendar OAuth - Configuración Completa

## Resumen Ejecutivo

Esta guía proporciona la configuración completa necesaria para resolver el error `400 redirect_uri_mismatch` en la integración de Google Calendar.

## Arquitectura de Integración

```
┌─────────────────────────────────────────────────────────────────┐
│                         AUTORENTA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐           ┌──────────────────┐           │
│  │  Angular Frontend│           │  Supabase Edge   │           │
│  │  localhost:4200  │◄─────────►│    Functions     │           │
│  │                  │           │  pisqjmoklivzpwu │           │
│  └──────────────────┘           └────────┬─────────┘           │
│                                           │                     │
│                                           │                     │
│                                           ▼                     │
│                                  ┌─────────────────┐            │
│                                  │  Google Cloud   │            │
│                                  │  OAuth 2.0      │            │
│                                  │  Client ID      │            │
│                                  └─────────────────┘            │
│                                           │                     │
│                                           │                     │
│                                           ▼                     │
│                                  ┌─────────────────┐            │
│                                  │  Google         │            │
│                                  │  Calendar API   │            │
│                                  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo OAuth Completo

```
1. Usuario hace click en "Conectar Google Calendar"
   └─> Frontend llama: GET /functions/v1/google-calendar-oauth?action=get-auth-url

2. Edge Function genera URL de autorización
   └─> Retorna: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...

3. Frontend abre popup con URL de Google
   └─> Popup muestra: "AutoRenta quiere acceder a tu Google Calendar"

4. Usuario aprueba acceso
   └─> Google redirige a: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback&code=XXX

5. Edge Function recibe el código
   └─> Intercambia código por access_token y refresh_token

6. Edge Function guarda tokens
   └─> Tabla: google_calendar_tokens (user_id, access_token, refresh_token, expires_at)

7. Edge Function redirige a frontend
   └─> http://localhost:4200/profile?calendar_connected=true

8. Popup se cierra automáticamente
   └─> Frontend actualiza UI: "✓ Conectado"
```

## Configuración Necesaria

### 1. Google Cloud Console

**URL**: https://console.cloud.google.com/apis/credentials

#### OAuth 2.0 Client ID

| Campo | Valor |
|-------|-------|
| **Client ID** | `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com` |
| **Client Secret** | `[TU_SECRET]` (obtener de Google Cloud Console) |
| **Application type** | Web application |
| **Name** | AutoRenta Calendar Integration |

#### Authorized redirect URIs (CRÍTICO)

**Debe incluir EXACTAMENTE**:
```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

❌ **NO usar**:
```
https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```
(Este es para Google Auth login, no para Calendar)

#### OAuth Consent Screen

| Campo | Valor |
|-------|-------|
| **User Type** | External |
| **App name** | AutoRenta |
| **User support email** | autorentardev@gmail.com |
| **Developer contact** | autorentardev@gmail.com |
| **Publishing status** | Testing (agregar test users) |

**Scopes requeridos**:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Test users** (si está en modo Testing):
- Agregar el email del usuario que conectará el calendar

### 2. Supabase Configuration

**Proyecto**: pisqjmoklivzpwufhscx
**URL**: https://pisqjmoklivzpwufhscx.supabase.co

#### Secrets (Edge Functions)

```bash
# Configurar vía CLI
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com" --project-ref pisqjmoklivzpwufhscx

supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="[TU_SECRET]" --project-ref pisqjmoklivzpwufhscx

supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx

supabase secrets set FRONTEND_URL="http://localhost:4200" --project-ref pisqjmoklivzpwufhscx

# También necesarios (ya deberían estar configurados)
supabase secrets set SUPABASE_URL="https://pisqjmoklivzpwufhscx.supabase.co" --project-ref pisqjmoklivzpwufhscx

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]" --project-ref pisqjmoklivzpwufhscx
```

#### Edge Functions Desplegadas

```bash
# Desplegar google-calendar-oauth
supabase functions deploy google-calendar-oauth --project-ref pisqjmoklivzpwufhscx

# Desplegar sync-booking-to-calendar
supabase functions deploy sync-booking-to-calendar --project-ref pisqjmoklivzpwufhscx

# Verificar
supabase functions list --project-ref pisqjmoklivzpwufhscx
```

**Output esperado**:
```
google-calendar-oauth        | ACTIVE
sync-booking-to-calendar     | ACTIVE
```

#### Database Schema

**Tabla**: `google_calendar_tokens`
```sql
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  primary_calendar_id text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sync_enabled boolean DEFAULT true
);

-- RLS Policies
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON google_calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON google_calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. Angular Configuration

**Archivo**: `apps/web/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  supabaseAnonKey: '[ANON_KEY]',
  googleCalendarEnabled: true,
};
```

**Servicio**: `apps/web/src/app/core/services/google-calendar.service.ts`

Ya está implementado y listo para usar.

## Comandos de Verificación

### Verificar Google Cloud Console

```bash
# No hay comando CLI, verificar manualmente en:
# https://console.cloud.google.com/apis/credentials
```

Checklist:
- [ ] OAuth 2.0 Client ID existe
- [ ] Redirect URI correcto configurado
- [ ] Scopes de Calendar agregados
- [ ] Test users agregados (si está en Testing)

### Verificar Supabase Secrets

```bash
# Listar todos los secrets de Google OAuth
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE
```

**Output esperado**:
```
GOOGLE_OAUTH_CLIENT_ID     | [hash]
GOOGLE_OAUTH_CLIENT_SECRET | [hash]
GOOGLE_OAUTH_REDIRECT_URI  | [hash]
```

### Verificar Edge Functions

```bash
# Listar functions
supabase functions list --project-ref pisqjmoklivzpwufhscx

# Ver logs de google-calendar-oauth
supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
```

### Verificar Database

```sql
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que la tabla existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'google_calendar_tokens';

-- 2. Verificar RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'google_calendar_tokens';

-- 3. Ver tokens conectados
SELECT
  user_id,
  primary_calendar_id,
  expires_at,
  sync_enabled,
  connected_at
FROM google_calendar_tokens;
```

## Testing End-to-End

### Paso 1: Conectar Calendar

1. Iniciar app:
   ```bash
   npm run dev
   ```

2. Navegar a: http://localhost:4200/profile

3. Click en "Conectar Google Calendar"

4. Debe abrir popup de Google

5. Seleccionar cuenta y aprobar permisos

6. Popup debe cerrarse automáticamente

7. UI debe mostrar: "✓ Conectado"

### Paso 2: Verificar en Base de Datos

```sql
SELECT * FROM google_calendar_tokens WHERE user_id = auth.uid();
```

Debería retornar 1 fila con:
- `access_token` (cifrado)
- `refresh_token` (cifrado)
- `expires_at` (fecha futura)
- `primary_calendar_id` (email del usuario)
- `connected_at` (timestamp actual)

### Paso 3: Probar Sincronización

Cuando un locador aprueba un booking:

```typescript
// En bookings.service.ts
this.googleCalendarService.syncBookingToCalendar(bookingId, 'create').subscribe({
  next: (result) => {
    console.log('Booking synced to Google Calendar:', result);
    // result: { success: true, event_id: "...", synced_to_locador: true, synced_to_locatario: false }
  },
  error: (err) => console.error('Sync failed:', err)
});
```

### Paso 4: Verificar en Google Calendar

1. Ir a: https://calendar.google.com

2. Buscar calendario: "AutoRenta - [Marca] [Modelo]"

3. Verificar evento: "🚗 Booking: [Marca] [Modelo]"

4. Detalles del evento:
   - Fecha/hora correcta
   - Descripción con info del booking
   - Color verde (approved)
   - Recordatorios 24h y 1h antes

## Troubleshooting por Error

| Error | Causa | Solución |
|-------|-------|----------|
| `redirect_uri_mismatch` | Redirect URI no coincide | Ver paso 1 arriba |
| `invalid_client` | Client ID o Secret incorrectos | Verificar secrets en Supabase |
| `access_denied` (403) | Usuario no en test users | Agregar en OAuth Consent Screen |
| `Token exchange failed` | Secret incorrecto | Regenerar secret en Google Cloud |
| Popup se cierra inmediatamente | Error en Edge Function | Revisar logs de la función |
| No se guarda el token | RLS policy bloqueando | Verificar RLS policies |

## Diagrama de Configuración Actual vs. Esperada

### ❌ Configuración ACTUAL (Incorrecta)

```
Google Cloud Console:
  Authorized redirect URIs:
    - https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback ❌

Supabase Secrets:
  GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback ❌
```

**Problema**: Usando endpoint de Supabase Auth en lugar de Edge Function

### ✅ Configuración ESPERADA (Correcta)

```
Google Cloud Console:
  Authorized redirect URIs:
    - https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback ✅

Supabase Secrets:
  GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback ✅
```

**Beneficio**: Edge Function puede procesar el código y guardar tokens

## Comparación: Dos Flujos OAuth

### Flujo 1: Google Auth (Login de Usuario)

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Autenticar usuario con Google |
| **Proyecto Supabase** | obxvffplochgeiclibng |
| **Redirect URI** | `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback` |
| **Scopes** | `email`, `profile`, `openid` |
| **Manejo** | Supabase Auth automático |
| **Configuración** | Supabase Dashboard → Auth → Providers |

### Flujo 2: Google Calendar (Integración)

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Conectar Google Calendar del usuario |
| **Proyecto Supabase** | pisqjmoklivzpwufhscx |
| **Redirect URI** | `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback` |
| **Scopes** | `calendar`, `calendar.events` |
| **Manejo** | Edge Function custom |
| **Configuración** | Supabase Secrets + Google Cloud Console |

**IMPORTANTE**: Son flujos completamente separados con diferentes redirect URIs.

## Siguientes Pasos

1. **Aplicar la solución rápida**: Ver `QUICK_FIX_GOOGLE_CALENDAR_OAUTH.md`

2. **Probar la integración**: Conectar calendar desde profile

3. **Sincronizar un booking**: Aprobar booking y verificar sync

4. **Monitorear logs**: Revisar Edge Function logs para errores

5. **Documentar**: Actualizar esta guía si encuentras otros casos

## Referencias

- **Runbook completo**: `/home/edu/autorenta/docs/runbooks/fix-google-calendar-redirect-uri-mismatch.md`
- **Setup inicial**: `/home/edu/autorenta/SETUP_GOOGLE_CALENDAR.md`
- **Testing guide**: `/home/edu/autorenta/GOOGLE_CALENDAR_TEST_GUIDE.md`
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Functions**: https://supabase.com/docs/guides/functions

---

**Última actualización**: 2025-11-13
**Autor**: Claude Code
**Estado**: ✅ Documentación completa
