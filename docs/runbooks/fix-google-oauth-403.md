# 🔧 Solución: Error 403 Google OAuth - Access Denied

## ❌ Error

```
Error 403: access_denied
The developer hasn't given you access to this app. It's currently being tested and it hasn't been verified by Google.
```

## 🔍 Causa

La aplicación de Google OAuth está en **modo de prueba** y el usuario intentando iniciar sesión **no está en la lista de usuarios de prueba**.

## ✅ Solución Rápida

### Opción 1: Agregar Usuario a Lista de Prueba (Recomendado para desarrollo)

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/
   - Seleccionar el proyecto de AutoRenta

2. **Navegar a OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen
   ```

3. **Agregar Usuarios de Prueba**:
   - En la sección **"Test users"**
   - Click en **"+ ADD USERS"**
   - Agregar el email del usuario que intenta iniciar sesión
   - Ejemplo: `usuario@gmail.com`
   - Click **"ADD"**

4. **Guardar cambios**

5. **Probar nuevamente**:
   - El usuario agregado ahora podrá iniciar sesión con Google

### Opción 2: Publicar la App (Para producción)

⚠️ **Nota**: Publicar la app requiere verificación de Google, que puede tardar varios días.

1. **Ir a OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen
   ```

2. **Cambiar a Producción**:
   - Click en **"PUBLISH APP"**
   - Confirmar publicación

3. **Completar Verificación de Google** (si es requerido):
   - Google puede pedir información adicional
   - Proceso puede tardar 1-7 días
   - Mientras tanto, usar Opción 1 (usuarios de prueba)

## 📋 Checklist de Configuración Completa

### 1. OAuth Consent Screen Configurado

- [ ] Tipo: **External** (o Internal si es organización)
- [ ] App name: **AutoRenta**
- [ ] User support email: **autorentardev@gmail.com**
- [ ] Developer contact: **autorentardev@gmail.com**
- [ ] Scopes agregados:
  - [ ] `email`
  - [ ] `profile`
  - [ ] `openid`
  - [ ] `https://www.googleapis.com/auth/calendar` (si se usa Google Calendar)
  - [ ] `https://www.googleapis.com/auth/calendar.events` (si se usa Google Calendar)

### 2. OAuth 2.0 Client ID Configurado

- [ ] Application type: **Web application**
- [ ] Name: **AutoRenta Web**
- [ ] Authorized JavaScript origins:
  - [ ] `http://localhost:4200` (desarrollo)
  - [ ] `https://autorenta-web.pages.dev` (producción)
- [ ] Authorized redirect URIs:
  - [ ] `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback` (Supabase Auth)
  - [ ] `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth?action=handle-callback` (si se usa Calendar)

### 3. Supabase Dashboard Configurado

- [ ] Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/providers
- [ ] Habilitar **Google** provider
- [ ] Client ID configurado (de Google Cloud Console)
- [ ] Client Secret configurado (de Google Cloud Console)
- [ ] Redirect URL verificado: `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`

### 4. Usuarios de Prueba (Modo Testing)

- [ ] Agregar emails de usuarios que necesitan acceso
- [ ] Incluir: `autorentardev@gmail.com` y otros emails de prueba

## 🧪 Verificar Configuración

### Test 1: Verificar OAuth Consent Screen

```bash
# Verificar que el consent screen esté configurado
# Ir a: https://console.cloud.google.com/apis/credentials/consent
# Debe mostrar estado: "Testing" o "In production"
```

### Test 2: Verificar Supabase Provider

```bash
# Verificar en Supabase Dashboard
# Authentication → Providers → Google
# Debe estar "Enabled" y mostrar Client ID
```

### Test 3: Probar Login

1. Ir a: `http://localhost:4200/auth/login`
2. Click en "Iniciar sesión con Google"
3. Debe redirigir a Google sin error 403

## 🚨 Errores Comunes

### Error: "redirect_uri_mismatch"
**Solución**: Verificar que la redirect URI en Google Cloud Console coincida exactamente con la de Supabase.

### Error: "invalid_client"
**Solución**: Verificar que Client ID y Client Secret en Supabase Dashboard sean correctos.

### Error: "access_denied" (403)
**Solución**: Agregar usuario a lista de prueba (ver Opción 1 arriba).

## 📚 Referencias

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Providers](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [OAuth Consent Screen Guide](https://support.google.com/cloud/answer/10311615)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Solución documentada




