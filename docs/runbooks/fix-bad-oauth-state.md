# 🔧 Solución: Error bad_oauth_state en Google OAuth

## ❌ Error

```
Error: bad_oauth_state
OAuth callback with invalid state
```

URL de error: `https://autorentar.com/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+callback+with+invalid+state`

## 🔍 Causa

El error `bad_oauth_state` ocurre cuando Supabase no puede validar el parámetro `state` durante el callback de OAuth. Esto puede suceder por:

1. **Cookies bloqueadas**: El navegador bloquea cookies de terceros, impidiendo que Supabase almacene el `state`
2. **Sesión perdida**: La sesión se perdió entre el inicio del OAuth y el callback
3. **Múltiples intentos**: Varios intentos de login simultáneos pueden invalidar el state
4. **Problemas con SameSite**: En producción, cookies con SameSite pueden causar problemas
5. **Storage bloqueado**: LocalStorage o sessionStorage bloqueados por el navegador
6. **Redirect URL no coincide**: El `redirectTo` no coincide exactamente con la URL configurada en Supabase

## ✅ Soluciones

### Solución 1: Verificar Configuración en Supabase Dashboard

1. **Ir a Supabase Dashboard**:
   - https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/url-configuration

2. **Verificar Redirect URLs**:
   - Debe incluir: `https://autorentar.com/auth/callback`
   - También: `http://localhost:4200/auth/callback` (para desarrollo)

3. **Verificar Site URL**:
   - Debe ser: `https://autorentar.com` (producción)

4. **Guardar cambios**

### Solución 2: Limpiar Cookies y Storage

1. **Abrir DevTools** (F12)
2. **Application/Storage tab**
3. **Limpiar**:
   - Cookies para `autorentar.com`
   - LocalStorage
   - SessionStorage
4. **Cerrar todas las pestañas** del sitio
5. **Intentar login nuevamente**

### Solución 3: Verificar Configuración de Google OAuth

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/apis/credentials

2. **Verificar OAuth 2.0 Client ID**:
   - **Authorized redirect URIs** debe incluir:
     - `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`
   - **Authorized JavaScript origins**:
     - `https://autorentar.com`
     - `http://localhost:4200` (desarrollo)

3. **Guardar cambios**

### Solución 4: Usar Modo Incógnito (Testing)

Si funciona en modo incógnito, el problema es con cookies/storage:
- Abrir ventana incógnita
- Intentar login
- Si funciona, limpiar cookies/storage (Solución 2)

### Solución 5: Verificar Código (Ya Implementado)

El código ya fue mejorado para:
- ✅ Detectar errores en la URL antes de procesar
- ✅ Mostrar mensajes de error más claros
- ✅ Limpiar la URL después de detectar errores
- ✅ Manejar específicamente el error `bad_oauth_state`

## 🧪 Verificar que Funciona

### Test 1: Login en Producción

1. Ir a: `https://autorentar.com/auth/login`
2. Click en "Iniciar sesión con Google"
3. Autorizar en Google
4. Debe redirigir a `/auth/callback` sin errores
5. Debe completar el login y redirigir a `/`

### Test 2: Verificar Redirect URL

```bash
# Verificar que Supabase tiene la URL correcta
# En Supabase Dashboard → Authentication → URL Configuration
# Redirect URLs debe incluir:
https://autorentar.com/auth/callback
```

### Test 3: Verificar Cookies

```javascript
// En DevTools Console, verificar cookies de Supabase:
document.cookie
// Debe incluir cookies de supabase.co
```

## 🚨 Errores Comunes

### Error: "redirect_uri_mismatch"
**Solución**: Verificar que la redirect URI en Google Cloud Console coincida exactamente con la de Supabase.

### Error: "bad_oauth_state" persistente
**Solución**: 
1. Limpiar todas las cookies y storage
2. Verificar que no haya múltiples pestañas abiertas
3. Cerrar todas las pestañas y volver a intentar

### Error: Funciona en localhost pero no en producción
**Solución**: 
1. Verificar que la redirect URL en Supabase incluya el dominio de producción
2. Verificar configuración de cookies SameSite en producción
3. Verificar que Cloudflare Pages no esté bloqueando cookies

## 📚 Referencias

- [Supabase OAuth Troubleshooting](https://supabase.com/docs/guides/auth/troubleshooting)
- [Google OAuth State Parameter](https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse)
- [SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Código mejorado para detectar y manejar el error




