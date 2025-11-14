# Google Calendar OAuth E2E Tests

Tests end-to-end completos para la integración de Google Calendar OAuth.

## 🎯 Objetivo

Verificar el flujo completo de autenticación OAuth con Google Calendar:
1. Usuario hace clic en "Conectar Google Calendar"
2. Se abre popup con autorización de Google
3. Callback redirige y cierra el popup automáticamente
4. Mensaje de éxito aparece en la página de perfil
5. Estado de conexión se actualiza correctamente

## 🧪 Tests Incluidos

### Tests Funcionales

1. **Display Test**: Verifica que la sección de Google Calendar sea visible
2. **Popup Test**: Verifica que el popup OAuth se abra con dimensiones correctas (600x700)
3. **Callback Test**: Simula callback y verifica mensaje de éxito
4. **Connected State**: Verifica indicadores de estado conectado
5. **API Call Test**: Intercepta y verifica llamadas a la Edge Function
6. **Callback Parameters**: Verifica que los parámetros del callback se manejen correctamente
7. **Email Display**: Verifica que el email del calendario se muestre cuando está conectado
8. **Disconnect Flow**: Verifica el flujo de desconexión

### Tests Visuales

- **Calendar Section Snapshot**: Captura visual del estado desconectado

## 🚀 Ejecución

### Ejecutar todos los tests de calendario

```bash
pnpm run test:e2e:calendar
```

### Modo UI (interactivo)

```bash
pnpm run test:e2e:calendar:ui
```

### Modo headed (ver navegador)

```bash
pnpm run test:e2e:calendar:headed
```

### Modo debug (paso a paso)

```bash
pnpm run test:e2e:calendar:debug
```

## 📋 Pre-requisitos

### 1. Servidor de desarrollo corriendo

```bash
pnpm run dev
```

El test espera que la aplicación esté corriendo en `http://localhost:4200`

### 2. Usuario de prueba configurado

Los tests usan credenciales de prueba:
- Email: `test@example.com`
- Password: `testpassword123`

**Importante**: Debes crear este usuario en tu Supabase antes de ejecutar los tests.

### 3. Variables de entorno configuradas

Asegúrate de que las siguientes variables estén configuradas en `.env.development.local`:

```bash
NG_APP_SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co
NG_APP_SUPABASE_ANON_KEY=tu_anon_key
```

Y en Supabase Secrets (para la Edge Function):

```bash
GOOGLE_OAUTH_CLIENT_ID=tu_client_id
GOOGLE_OAUTH_CLIENT_SECRET=tu_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/google-calendar-oauth
FRONTEND_URL=http://localhost:4200
```

## 🔍 Verificación del Flujo

### Paso 1: Test Manual (Recomendado primero)

Antes de ejecutar los tests automatizados, verifica manualmente:

1. Inicia sesión en `http://localhost:4200`
2. Ve a tu perfil
3. Haz clic en "Conectar Google Calendar"
4. Autoriza en Google
5. Verifica que:
   - El popup se cierra automáticamente
   - Aparece mensaje "✅ Google Calendar conectado exitosamente"
   - El estado cambia a "Google Calendar Conectado"
   - Se muestra tu email del calendario

### Paso 2: Tests Automatizados

Una vez que el flujo manual funciona, ejecuta:

```bash
# Ver los tests en acción
pnpm run test:e2e:calendar:headed

# Ejecutar en modo headless (CI)
pnpm run test:e2e:calendar
```

## 📊 Reportes

Ver el último reporte de tests:

```bash
pnpm run test:e2e:report
```

Los reportes incluyen:
- Screenshots de cada paso
- Videos de tests fallidos
- Traces completos para debugging

## 🐛 Troubleshooting

### Test falla en login

**Problema**: No puede encontrar el formulario de login
**Solución**: Verifica que los selectores `input[type="email"]` y `input[type="password"]` coincidan con tu página de login

### Popup no se abre

**Problema**: El test no detecta el popup
**Solución**: 
- Asegúrate de que `popup.set(true)` esté configurado en Playwright
- Verifica que el navegador permita popups

### Callback no redirige

**Problema**: El popup no se cierra después del callback
**Solución**:
- Verifica que `FRONTEND_URL` esté configurado correctamente en Supabase
- Verifica que la Edge Function esté deployada
- Revisa los logs: `npx supabase functions logs google-calendar-oauth`

### Estado no se actualiza

**Problema**: Después de conectar, el estado sigue como "desconectado"
**Solución**:
- Verifica que los tokens se guarden en la tabla `google_calendar_tokens`
- Revisa la consola del navegador para errores
- Verifica que el método `checkCalendarConnection()` se ejecute

## 🔧 Configuración Avanzada

### Timeouts personalizados

Edita `playwright.config.ts` para ajustar timeouts:

```typescript
export default defineConfig({
  timeout: 30000, // 30 segundos por test
  expect: {
    timeout: 10000, // 10 segundos para expects
  },
});
```

### Configurar usuario de prueba diferente

Edita el archivo de test:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4200/login');
  await page.fill('input[type="email"]', 'tu_email@ejemplo.com');
  await page.fill('input[type="password"]', 'tu_password');
  // ...
});
```

## 📝 Notas Importantes

1. **Tests No Destructivos**: Los tests no modifican datos permanentes (se puede reconectar/desconectar sin problemas)
2. **Mock OAuth**: Para CI/CD, considera mockear la respuesta de Google OAuth
3. **Rate Limits**: Google OAuth tiene límites de tasa - no ejecutes tests muy frecuentemente
4. **Tokens Reales**: Los tests usan tokens reales de Google si están configurados

## 🎓 Aprendizaje

Este test demuestra:
- Manejo de popups en Playwright
- Interceptación de requests HTTP
- Manejo de diálogos (confirmaciones)
- Verificación de parámetros de URL
- Visual regression testing
- Manejo de estados asíncronos

## 🔗 Referencias

- [Playwright Popup Handling](https://playwright.dev/docs/pages#handling-popups)
- [Google OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
