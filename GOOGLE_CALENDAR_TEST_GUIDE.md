# Guía de Prueba: Integración de Google Calendar

## ✅ Estado del Deployment

**Fecha**: 2025-11-13
**Estado**: ✅ Completado

### Edge Functions Desplegadas
- ✅ `google-calendar-oauth` - https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth
- ✅ `sync-booking-to-calendar` - https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-booking-to-calendar

### Google OAuth Configurado
- ✅ Client ID: `199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
- ✅ Client Secret: Configurado en Supabase Secrets
- ✅ Redirect URI: `https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback`

### Migración de Base de Datos
- ✅ Tablas creadas: `google_calendar_tokens`, `car_google_calendars`, `calendar_sync_log`
- ✅ RLS policies aplicadas
- ✅ Helper functions creadas

---

## 🧪 Cómo Probar la Integración

### Opción 1: Prueba desde la UI (Recomendado)

1. **Abrir la aplicación**
   ```
   http://localhost:4200
   ```

2. **Iniciar sesión**
   - Si no tienes cuenta, crea una nueva
   - Verifica que estés autenticado (deberías ver tu perfil en el navbar)

3. **Ir a la página de perfil**
   - Click en tu avatar o nombre en el navbar
   - Deberías ver una sección "🗓️ Google Calendar" en el sidebar izquierdo

4. **Conectar Google Calendar**
   - Click en el botón **"Conectar Google Calendar"**
   - Se abrirá un popup con la pantalla de login de Google
   - Inicia sesión con tu cuenta de Google
   - Acepta los permisos solicitados
   - El popup se cerrará automáticamente
   - La página de perfil debería mostrar "✓ Conectado"

5. **Verificar conexión**
   - Deberías ver tu email de Google en la sección de Google Calendar
   - El estado debería cambiar a "✓ Conectado"
   - El botón debería cambiar a "Desconectar"

### Opción 2: Prueba con Script de Consola

Si el popup no se abre o hay problemas, usa este script de diagnóstico:

1. **Abrir DevTools**
   - Presiona `F12` o `Cmd/Ctrl + Shift + I`
   - Ve a la pestaña "Console"

2. **Copiar y pegar el script**
   ```bash
   # Ver el contenido del script:
   cat /tmp/test-google-calendar-v2.js
   ```

3. **Ejecutar en la consola del navegador**
   - Copia todo el contenido del script
   - Pégalo en la consola y presiona Enter

4. **Seguir las instrucciones**
   - El script te mostrará cada paso del proceso
   - Te indicará si hay errores y cómo solucionarlos

---

## 🔍 Troubleshooting

### Problema: El popup no se abre

**Posible causa**: El navegador está bloqueando popups

**Solución**:
1. Verifica que los popups estén permitidos para `localhost:4200`
2. En Chrome: Click en el ícono de popup bloqueado en la barra de direcciones
3. Selecciona "Permitir popups de localhost:4200"
4. Intenta de nuevo

### Problema: Error "No active session"

**Posible causa**: No estás autenticado

**Solución**:
1. Verifica que hayas iniciado sesión
2. Refresca la página
3. Intenta conectar de nuevo

### Problema: Error "Failed to get authorization URL"

**Posible causa**: La Edge Function no está respondiendo o los secrets no están configurados

**Solución**:
1. Verifica que las Edge Functions estén desplegadas:
   ```bash
   supabase functions list --project-ref pisqjmoklivzpwufhscx
   ```

2. Verifica que los secrets estén configurados:
   ```bash
   supabase secrets list --project-ref pisqjmoklivzpwufhscx
   ```

3. Deberías ver:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REDIRECT_URI`

### Problema: Error "Invalid redirect_uri"

**Posible causa**: El redirect URI en Google Cloud Console no coincide

**Solución**:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Selecciona tu proyecto
3. Click en las credenciales OAuth 2.0
4. Verifica que los URIs de redirección incluyan:
   - `https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback`

### Problema: Popup se cierra pero no se conecta

**Posible causa**: El callback no está guardando el token correctamente

**Solución**:
1. Abre la consola del navegador
2. Ve a la pestaña "Network"
3. Filtra por "google-calendar-oauth"
4. Intenta conectar de nuevo
5. Verifica si hay errores en las requests
6. Revisa los logs de la Edge Function:
   ```bash
   supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx
   ```

---

## 📊 Verificar Datos en la Base de Datos

Después de conectar exitosamente, verifica que los datos se guardaron:

```sql
-- Ver tokens guardados
SELECT
  user_id,
  primary_calendar_id,
  expires_at,
  created_at
FROM google_calendar_tokens
WHERE user_id = 'tu-user-id';

-- Ver log de sincronizaciones
SELECT * FROM calendar_sync_log
ORDER BY synced_at DESC
LIMIT 10;

-- Ver calendarios de autos (después de sincronizar un booking)
SELECT * FROM car_google_calendars;
```

---

## 🎯 Próximos Pasos

Una vez que la conexión funcione:

1. **Probar sincronización de bookings**
   - Crea un nuevo booking
   - Verifica que aparezca en tu Google Calendar
   - El evento debería tener:
     - Título: "Reserva AutoRenta: [modelo del auto]"
     - Descripción: Detalles del booking
     - Fecha/hora: Según las fechas del booking

2. **Probar desconexión**
   - Click en "Desconectar"
   - Confirma la desconexión
   - Verifica que el estado cambie a "No conectado"
   - Verifica que el token se elimine de la base de datos

3. **Probar reconexión**
   - Conecta de nuevo después de desconectar
   - Debería funcionar sin problemas

---

## 📝 Logs y Debugging

### Ver logs de Edge Functions en tiempo real

```bash
# Logs de OAuth function
supabase functions logs google-calendar-oauth --project-ref pisqjmoklivzpwufhscx --tail

# Logs de sync function
supabase functions logs sync-booking-to-calendar --project-ref pisqjmoklivzpwufhscx --tail
```

### Verificar secrets configurados

```bash
supabase secrets list --project-ref pisqjmoklivzpwufhscx
```

Deberías ver:
- `GOOGLE_OAUTH_CLIENT_ID=199395590437-8e29faaapojqolscpqatotvn366pevdr.apps.googleusercontent.com`
- `GOOGLE_OAUTH_CLIENT_SECRET=***` (oculto)
- `GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/callback`

---

## ✅ Checklist de Verificación

- [ ] Edge Functions desplegadas y respondiendo
- [ ] Secrets de Google OAuth configurados
- [ ] Redirect URI configurado en Google Cloud Console
- [ ] Migración de base de datos aplicada
- [ ] UI muestra sección de Google Calendar
- [ ] Botón "Conectar Google Calendar" visible
- [ ] Popup de Google se abre al hacer click
- [ ] Se puede completar el login de Google
- [ ] Estado cambia a "Conectado" después del login
- [ ] Token se guarda en la base de datos
- [ ] Se puede desconectar sin problemas
- [ ] Bookings se sincronizan a Google Calendar

---

## 🐛 Reportar Problemas

Si encuentras algún problema que no se resuelve con este troubleshooting:

1. **Captura pantallas** del error
2. **Copia los logs** de la consola del navegador
3. **Verifica los logs** de las Edge Functions
4. **Documenta los pasos** para reproducir el error

---

## 📚 Documentación Adicional

- [Google Calendar API](https://developers.google.com/calendar/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2)
