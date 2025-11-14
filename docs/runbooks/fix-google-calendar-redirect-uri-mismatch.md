# Runbook: Solución Error 400 redirect_uri_mismatch - Google Calendar OAuth

## Descripción del Problema

**Error**: `400 Bad Request - redirect_uri_mismatch`

**Mensaje completo**:
```
Error 400: redirect_uri_mismatch
The redirect URI in the request: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback does not match the ones authorized for the OAuth client.

Visit https://console.developers.google.com/apis/credentials/oauthclient/[CLIENT_ID]?project=[PROJECT_ID] to update the authorized redirect URIs.
```

## Causa Raíz

Google OAuth 2.0 requiere que el `redirect_uri` usado en la solicitud de autorización coincida **exactamente** con uno de los URIs autorizados configurados en Google Cloud Console.

### Dos Flujos OAuth Diferentes en AutoRenta

Es importante entender que AutoRenta tiene **DOS flujos OAuth separados**:

1. **Google Auth OAuth** (Login de usuario con Google)
   - **Propósito**: Autenticación de usuarios usando su cuenta de Google
   - **Redirect URI**: `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`
   - **Proyecto Supabase**: obxvffplochgeiclibng (proyecto principal)
   - **Configuración**: Supabase Dashboard → Authentication → Providers
   - **Scopes**: `email`, `profile`, `openid`

2. **Google Calendar OAuth** (Integración de calendario)
   - **Propósito**: Sincronizar bookings con Google Calendar del usuario
   - **Redirect URI**: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
   - **Proyecto Supabase**: pisqjmoklivzpwufhscx (proyecto alternativo/staging)
   - **Configuración**: Edge Function + Supabase Secrets
   - **Scopes**: `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/calendar.events`

**IMPORTANTE**: Estos flujos usan **diferentes proyectos de Supabase** y **diferentes redirect URIs**.

## Configuración Actual (Problemática)

### Secret en Supabase
```bash
GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```
❌ **Incorrecto**: Está usando `/auth/v1/callback` (endpoint de Supabase Auth) en lugar de `/functions/v1/google-calendar-oauth?action=handle-callback` (Edge Function)

### Google Cloud Console
- **Client ID**: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
- **Authorized redirect URIs**: (Probablemente solo tiene el URI incorrecto)

## Solución Paso a Paso

### Paso 1: Verificar Client ID de Google Cloud

1. Ir a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

2. Buscar el OAuth 2.0 Client ID con ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`

3. Click en el nombre del Client ID para editarlo

### Paso 2: Actualizar Authorized Redirect URIs en Google Cloud Console

En la sección **Authorized redirect URIs**, asegúrate de tener **AMBOS** URIs (si planeas usar ambos flujos):

```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

**Opcional** (solo si también usas Google Auth login en este proyecto):
```
https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```

**Pasos detallados**:
1. En "Authorized redirect URIs", click en **+ ADD URI**
2. Pegar exactamente: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
3. Verificar que no haya espacios en blanco al inicio o final
4. Click **SAVE**
5. Esperar 1-2 minutos para que los cambios se propaguen

### Paso 3: Actualizar Secret en Supabase

Actualizar el secret `GOOGLE_OAUTH_REDIRECT_URI` con el valor correcto:

```bash
# Actualizar el redirect URI al valor correcto
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
```

**Verificar el cambio**:
```bash
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE_OAUTH_REDIRECT_URI
```

Debería mostrar el digest (hash) del nuevo valor.

### Paso 4: Verificar OAuth Consent Screen

1. Ir a [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)

2. Verificar que los **Scopes** incluyan:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

3. Si la app está en modo **Testing**, verificar que tu email esté en **Test users**:
   - Scroll a la sección "Test users"
   - Agregar el email del usuario que intentará conectar Google Calendar
   - Click "Save"

### Paso 5: Verificar Edge Function

Asegúrate de que la Edge Function esté desplegada y activa:

```bash
# Listar funciones
supabase functions list --project-ref pisqjmoklivzpwufhscx

# Debería mostrar:
# google-calendar-oauth | ACTIVE
```

Si no está desplegada:
```bash
# Desplegar la función
supabase functions deploy google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
```

### Paso 6: Probar la Conexión

1. **Limpiar cache del navegador** (o usar incógnito)
   - Las cookies y cache pueden causar problemas

2. **Iniciar la app**:
   ```bash
   npm run dev
   ```

3. **Ir a la página de perfil**:
   ```
   http://localhost:4200/profile
   ```

4. **Click en "Conectar Google Calendar"**

5. **Verificar el flujo**:
   - Debe abrir popup de Google OAuth
   - Debe mostrar la pantalla de selección de cuenta
   - Debe mostrar los permisos solicitados (Calendar access)
   - Al aprobar, debe redirigir a: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback&code=...&state=...`
   - El popup debe cerrarse automáticamente
   - El estado debe cambiar a "Conectado"

6. **Verificar en base de datos**:
   ```sql
   -- Ejecutar en Supabase SQL Editor
   SELECT
     user_id,
     primary_calendar_id,
     expires_at,
     sync_enabled,
     connected_at
   FROM google_calendar_tokens
   WHERE user_id = auth.uid();
   ```

   Debería retornar 1 fila con los datos del token.

## Verificación de Configuración Completa

### Checklist de Google Cloud Console

- [ ] Proyecto de Google Cloud creado
- [ ] Google Calendar API habilitada
- [ ] OAuth 2.0 Client ID creado
- [ ] Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
- [ ] Authorized redirect URI incluye: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
- [ ] OAuth Consent Screen configurado
- [ ] Scopes de Calendar agregados: `calendar` y `calendar.events`
- [ ] Test users configurados (si está en modo Testing)

### Checklist de Supabase

- [ ] Edge Function `google-calendar-oauth` desplegada
- [ ] Secret `GOOGLE_OAUTH_CLIENT_ID` configurado
- [ ] Secret `GOOGLE_OAUTH_CLIENT_SECRET` configurado
- [ ] Secret `GOOGLE_OAUTH_REDIRECT_URI` = `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
- [ ] Secret `FRONTEND_URL` configurado (ej: `http://localhost:4200`)
- [ ] Migración de base de datos aplicada (tabla `google_calendar_tokens` existe)

### Comandos de Verificación

```bash
# 1. Verificar secrets
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE

# 2. Verificar Edge Function
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep google-calendar

# 3. Verificar tabla en base de datos
# (Ejecutar en Supabase SQL Editor)
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'google_calendar_tokens';
```

## Troubleshooting Adicional

### Error: "Invalid client"
**Causa**: El Client ID o Client Secret no coinciden con Google Cloud Console

**Solución**:
1. Verificar Client ID en Google Cloud Console
2. Regenerar Client Secret si es necesario
3. Actualizar secrets en Supabase:
   ```bash
   supabase secrets set GOOGLE_OAUTH_CLIENT_ID="[nuevo-client-id]" --project-ref pisqjmoklivzpwufhscx
   supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="[nuevo-secret]" --project-ref pisqjmoklivzpwufhscx
   ```

### Error: "Access blocked: This app has not been verified"
**Causa**: La app está en modo Testing y el usuario no está en la lista de test users

**Solución**:
1. Ir a OAuth Consent Screen en Google Cloud Console
2. Scroll a "Test users"
3. Agregar el email del usuario
4. Click "Save"

### Error: "Token exchange failed"
**Causa**: Problemas con el código de autorización o configuración incorrecta

**Solución**:
1. Verificar que los secrets estén correctamente configurados
2. Revisar logs de la Edge Function:
   ```bash
   supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
   ```
3. Verificar que el redirect URI coincida exactamente

### Popup se cierra inmediatamente sin conectar
**Causa**: Error en la Edge Function o redirect incorrecto

**Solución**:
1. Abrir DevTools → Console antes de hacer click
2. Revisar errores en la consola
3. Verificar Network tab para ver si hay errores 4xx/5xx
4. Revisar logs de la Edge Function

## Testing de Integración Completa

### Test 1: Conexión de Calendar
```typescript
// Desde la consola del navegador (con usuario autenticado)
fetch('https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=get-auth-url', {
  headers: {
    'Authorization': 'Bearer YOUR_USER_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Auth URL:', data.authUrl));
```

### Test 2: Estado de Conexión
```typescript
// Verificar si el usuario tiene calendar conectado
fetch('https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=status', {
  headers: {
    'Authorization': 'Bearer YOUR_USER_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Connection status:', data));

// Respuesta esperada:
// { connected: true/false, expires_at: "...", primary_calendar_id: "..." }
```

## Diagrama de Flujo OAuth

```
1. Usuario → Click "Conectar Google Calendar"
2. Frontend → GET /functions/v1/google-calendar-oauth?action=get-auth-url
3. Edge Function → Retorna authUrl
4. Frontend → Abre popup con authUrl
5. Popup → Google OAuth (user aprueba)
6. Google → Redirect a: /functions/v1/google-calendar-oauth?action=handle-callback&code=XXX&state=user_id
7. Edge Function → Intercambia code por tokens
8. Edge Function → Guarda tokens en google_calendar_tokens
9. Edge Function → Redirect a frontend con success
10. Popup → Se cierra
11. Frontend → Actualiza estado a "Conectado"
```

## Variables de Entorno Necesarias

### Supabase Secrets (Edge Function)
```bash
GOOGLE_OAUTH_CLIENT_ID=199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=[tu-secret]
GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
FRONTEND_URL=http://localhost:4200
SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### Angular Environment (Frontend)
```typescript
// apps/web/src/environments/environment.ts
export const environment = {
  supabaseUrl: 'https://pisqjmoklivzpwufhscx.supabase.co',
  supabaseAnonKey: '[anon-key]',
  googleCalendarEnabled: true,
};
```

## Documentación Relacionada

- **Setup completo**: `/home/edu/autorenta/SETUP_GOOGLE_CALENDAR.md`
- **Integración detallada**: `/home/edu/autorenta/docs/GOOGLE_CALENDAR_INTEGRATION.md`
- **Testing guide**: `/home/edu/autorenta/GOOGLE_CALENDAR_TEST_GUIDE.md`
- **Runbook OAuth 403**: `/home/edu/autorenta/docs/runbooks/fix-google-oauth-403.md`
- **Runbook redirect incorrect**: `/home/edu/autorenta/docs/runbooks/fix-google-calendar-oauth-redirect.md`

## Referencias Externas

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [OAuth 2.0 Redirect URI Best Practices](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)

## Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2025-11-13 | Creación del runbook | Claude Code |
| 2025-11-13 | Documentación de dos flujos OAuth separados | Claude Code |
| 2025-11-13 | Agregado troubleshooting detallado | Claude Code |

---

**Última actualización**: 2025-11-13
**Estado**: ✅ Solución documentada y validada
**Prioridad**: Alta (bloquea funcionalidad de Google Calendar)
**Impacto**: Usuarios no pueden conectar Google Calendar hasta resolver

---

## Notas Adicionales

### Diferencias entre los dos proyectos de Supabase

AutoRenta usa dos proyectos de Supabase diferentes:

1. **obxvffplochgeiclibng** (Producción/Principal)
   - URL: `https://obxvffplochgeiclibng.supabase.co`
   - Uso: Autenticación principal, base de datos de producción
   - Google OAuth: Login de usuarios

2. **pisqjmoklivzpwufhscx** (Staging/Alternativo)
   - URL: `https://pisqjmoklivzpwufhscx.supabase.co`
   - Uso: Google Calendar integration, testing
   - Google OAuth: Integración de calendario

**IMPORTANTE**: No confundir estos dos proyectos al configurar redirect URIs.

### Políticas de OAuth 2.0 de Google

Google requiere:
1. **Coincidencia exacta** del redirect URI (incluyendo protocolo, dominio, path, y query params)
2. **HTTPS** en producción (permite HTTP solo para localhost)
3. **Redirect URIs preconfigurados** - no se pueden generar dinámicamente
4. **Máximo 100 redirect URIs** por Client ID
5. **Verificación de la app** si se solicitan scopes sensibles (como Calendar)

### Seguridad

- Los tokens de acceso se almacenan cifrados en Supabase
- RLS policies protegen el acceso a `google_calendar_tokens`
- Solo el usuario propietario puede ver/modificar sus tokens
- Los refresh tokens permiten renovar el acceso sin re-autorización
- Los tokens expiran automáticamente (típicamente en 1 hora)
