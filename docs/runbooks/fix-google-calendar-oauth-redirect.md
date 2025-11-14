# 🔧 Solución: Error 403 Google Calendar OAuth - Redirect URI Incorrecto

## ❌ Error

```
Error 403: access_denied
redirect_uri: https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```

**Problema**: El `redirect_uri` en la solicitud OAuth es incorrecto. Está usando el endpoint de Supabase Auth (`/auth/v1/callback`) en lugar del endpoint de la Edge Function de Google Calendar.

## 🔍 Causa

El `redirect_uri` configurado en el secret de Supabase o en Google Cloud Console no coincide con el que debe usar la función `google-calendar-oauth`.

**Redirect URI Correcto**:
```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

**Redirect URI Incorrecto** (el que está configurado):
```
https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback
```

## ✅ Solución

### Paso 1: Verificar Secret en Supabase

```bash
# Verificar el secret actual
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE_OAUTH_REDIRECT_URI
```

Si muestra el URI incorrecto (`/auth/v1/callback`), corregirlo:

```bash
# Configurar el redirect URI correcto
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
```

### Paso 2: Verificar en Google Cloud Console

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/apis/credentials

2. **Buscar el OAuth 2.0 Client ID**:
   - Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`

3. **Editar el Client ID**:
   - Click en el Client ID para editarlo

4. **Verificar Authorized redirect URIs**:
   - Debe incluir EXACTAMENTE:
     ```
     https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
     ```

5. **Si no está, agregarlo**:
   - Click en "+ ADD URI"
   - Pegar: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
   - Click "SAVE"

6. **Eliminar el URI incorrecto** (si existe):
   - Si ves `/auth/v1/callback`, eliminarlo (solo se usa para autenticación de usuario, no para Calendar)

### Paso 3: Verificar OAuth Consent Screen

1. **Ir a OAuth Consent Screen**:
   - https://console.cloud.google.com/apis/credentials/consent

2. **Verificar Scopes**:
   - Debe incluir:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`

3. **Verificar Test Users** (si está en modo Testing):
   - Agregar el email del usuario que intenta conectar

### Paso 4: Verificar Edge Function

```bash
# Verificar que la función esté desplegada
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep google-calendar-oauth

# Debe mostrar: google-calendar-oauth | ACTIVE
```

### Paso 5: Probar Nuevamente

1. Limpiar cookies y storage del navegador
2. Intentar conectar Google Calendar nuevamente
3. Debe redirigir correctamente sin error 403

## 📋 Checklist de Configuración Correcta

### Supabase Secrets
- [ ] `GOOGLE_OAUTH_CLIENT_ID` configurado
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET` configurado
- [ ] `GOOGLE_OAUTH_REDIRECT_URI` = `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`

### Google Cloud Console
- [ ] OAuth 2.0 Client ID creado
- [ ] Authorized redirect URI incluye: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
- [ ] OAuth Consent Screen configurado con scopes de Calendar
- [ ] Test users agregados (si está en modo Testing)

### Edge Function
- [ ] `google-calendar-oauth` desplegada y activa
- [ ] Secrets configurados correctamente

## 🚨 Nota Importante

**Dos Flujos OAuth Diferentes**:

1. **Google Auth OAuth** (para login de usuario):
   - Redirect URI: `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`
   - Scopes: `email`, `profile`, `openid`
   - Se configura en Supabase Dashboard → Authentication → Providers

2. **Google Calendar OAuth** (para conectar calendario):
   - Redirect URI: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback`
   - Scopes: `calendar`, `calendar.events`
   - Se configura en Supabase Secrets y Google Cloud Console

**NO confundir estos dos flujos**. Cada uno tiene su propio redirect URI.

## 📚 Referencias

- [Google Calendar OAuth Setup](./SETUP_GOOGLE_CALENDAR.md)
- [Google Calendar Integration](./docs/GOOGLE_CALENDAR_INTEGRATION.md)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Solución documentada




