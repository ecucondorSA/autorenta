# Quick Fix: Google Calendar OAuth Error 400 redirect_uri_mismatch

## El Error

```
Error 400: redirect_uri_mismatch
redirect_uri: https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

## La Solución Rápida (3 pasos)

### Paso 1: Actualizar Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Busca el Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
3. Click en el nombre para editar
4. En "Authorized redirect URIs", agrega:
   ```
   https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
   ```
5. Click **SAVE**

### Paso 2: Actualizar Secret en Supabase

```bash
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback" --project-ref pisqjmoklivzpwufhscx
```

### Paso 3: Verificar y Probar

```bash
# Verificar secret
supabase secrets list --project-ref pisqjmoklivzpwufhscx | grep GOOGLE_OAUTH_REDIRECT_URI

# Verificar Edge Function
supabase functions list --project-ref pisqjmoklivzpwufhscx | grep google-calendar
```

Luego prueba conectando Google Calendar desde http://localhost:4200/profile

## Checklist de Verificación

- [ ] Redirect URI agregado en Google Cloud Console
- [ ] Secret `GOOGLE_OAUTH_REDIRECT_URI` actualizado en Supabase
- [ ] Edge Function `google-calendar-oauth` está activa
- [ ] Test users agregados en Google OAuth Consent Screen (si está en modo Testing)
- [ ] Probado desde la app y funciona

## URIs Correctos

### Para Google Calendar (Staging - pisqjmoklivzpwufhscx)
```
https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback
```

### Para Google Auth Login (Producción - obxvffplochgeiclibng)
```
https://obxvffplochgeiclibng.supabase.co/auth/v1/callback
```

**IMPORTANTE**: No confundir estos dos URIs. Son para flujos OAuth diferentes.

## Si Sigue Fallando

1. **Limpiar cache del navegador** (o usar incógnito)
2. **Esperar 1-2 minutos** después de cambiar en Google Cloud Console
3. **Verificar que no haya espacios** al inicio/final del redirect URI
4. **Revisar logs de Edge Function**:
   ```bash
   supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
   ```
5. **Verificar test users** en Google Cloud Console (OAuth Consent Screen)

## Documentación Completa

Para más detalles, ver:
- `/home/edu/autorenta/docs/runbooks/fix-google-calendar-redirect-uri-mismatch.md`
- `/home/edu/autorenta/SETUP_GOOGLE_CALENDAR.md`

---

**Última actualización**: 2025-11-13
