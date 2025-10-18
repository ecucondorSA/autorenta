# 🚀 Guía de Deployment de Wallet vía Supabase Dashboard

## 📝 Resumen

Esta guía te ayudará a desplegar el sistema de Wallet completo usando solo el Dashboard de Supabase, sin necesidad de CLI.

---

## 🔐 Paso 1: Configurar Secrets

### 1.1 Acceder a Edge Functions Settings

⚠️ **IMPORTANTE**: Los secrets para Edge Functions deben configurarse en **Settings → Edge Functions**, NO en Vault.

1. **Ir a**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/functions
2. Buscar la sección **"Function Secrets"** o **"Environment Variables"**
3. Click en **"Add new secret"** o **"New secret"**

### 1.2 Agregar Secret de MercadoPago

**Configuración:**
```
Name: MERCADOPAGO_ACCESS_TOKEN
Secret: APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
```

1. Pegar el **Name**: `MERCADOPAGO_ACCESS_TOKEN`
2. Pegar el **Secret**: `APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571`
3. Click en **"Add secret"** o **"Save"**

### 1.3 Agregar Secret de APP_BASE_URL

**Configuración:**
```
Name: APP_BASE_URL
Secret: http://localhost:4200
```

1. Click en **"Add new secret"** nuevamente
2. Pegar el **Name**: `APP_BASE_URL`
3. Pegar el **Secret**: `http://localhost:4200`
4. Click en **"Add secret"** o **"Save"**

### 1.4 Verificar Secrets Configurados

Deberías ver una lista con:
- ✅ `MERCADOPAGO_ACCESS_TOKEN`
- ✅ `APP_BASE_URL`
- ✅ `SUPABASE_URL` (auto-inyectado por Supabase)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-inyectado por Supabase)

✅ **Nota importante**: Los secrets están disponibles inmediatamente en las funciones, NO necesitas redesplegar

---

## 🚀 Paso 2: Desplegar Edge Functions

### 2.1 Acceder a Edge Functions

1. **Ir a**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions
2. Click en **"Deploy a new function"** o **"Create a new function"**

---

### 2.2 Desplegar Función 1: mercadopago-create-preference

#### Opción A: Upload ZIP (Recomendado)

1. **En tu terminal local**, crear ZIP de la función:
   ```bash
   cd /home/edu/autorenta/supabase/functions
   zip -r mercadopago-create-preference.zip mercadopago-create-preference/
   ```

2. **En el Dashboard**:
   - Click en **"Upload ZIP"** o **"Deploy from ZIP"**
   - Seleccionar el archivo `mercadopago-create-preference.zip`
   - Function name: `mercadopago-create-preference`
   - Click en **"Deploy"**

#### Opción B: Copy-Paste Code (Alternativa)

1. **Function name**: `mercadopago-create-preference`

2. **Code**: Copiar TODO el contenido del archivo:
   `/home/edu/autorenta/supabase/functions/mercadopago-create-preference/index.ts`

3. **Settings**:
   - Verify JWT: ❌ **Deshabilitado** (unchecked)
   - Import map: Dejar vacío o default

4. Click en **"Deploy function"**

---

### 2.3 Desplegar Función 2: mercadopago-webhook

#### Opción A: Upload ZIP

1. **En tu terminal local**:
   ```bash
   cd /home/edu/autorenta/supabase/functions
   zip -r mercadopago-webhook.zip mercadopago-webhook/
   ```

2. **En el Dashboard**:
   - Click en **"Upload ZIP"** o **"Deploy from ZIP"**
   - Seleccionar el archivo `mercadopago-webhook.zip`
   - Function name: `mercadopago-webhook`
   - Click en **"Deploy"**

#### Opción B: Copy-Paste Code

1. **Function name**: `mercadopago-webhook`

2. **Code**: Copiar TODO el contenido del archivo:
   `/home/edu/autorenta/supabase/functions/mercadopago-webhook/index.ts`

3. **Settings**:
   - Verify JWT: ❌ **Deshabilitado** (unchecked)
   - Import map: Dejar vacío o default

4. Click en **"Deploy function"**

---

### 2.4 Verificar Deployment

1. **Ir a**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions

2. Deberías ver:
   ```
   ✅ mercadopago-create-preference  (Active)
   ✅ mercadopago-webhook            (Active)
   ```

3. **Copiar las URLs** (necesarias para el siguiente paso):
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference
   https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   ```

---

## 🔔 Paso 3: Configurar Webhook en MercadoPago

### 3.1 Acceder al Panel de Webhooks

1. **Ir a**: https://www.mercadopago.com.ar/developers/panel/app/5634498766947505
2. O navegar: **Tu cuenta** → **Tus aplicaciones** → **autorentar** → **Webhooks**

### 3.2 Configurar URL del Webhook

1. Click en **"Configurar notificaciones"** o **"Add endpoint"**

2. **Configuración**:
   ```
   URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook

   Eventos seleccionados:
   ✅ payment (Pagos)
      ✅ payment.created
      ✅ payment.updated

   Versión: v1

   Modo: Pruebas (Test mode)
   ```

3. Click en **"Guardar"** o **"Save"**

### 3.3 Verificar Webhook

MercadoPago enviará un evento de prueba automáticamente. Verifica que el webhook esté activo:

1. En el panel de MP, debería aparecer:
   ```
   ✅ https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   Status: Active
   ```

2. **Ver logs del webhook** (opcional):
   - Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions/mercadopago-webhook/logs
   - Deberías ver el evento de prueba de MercadoPago

---

## ✅ Paso 4: Verificar Todo el Sistema

### 4.1 Checklist de Configuración

```
✅ Database:
   ✅ Tabla wallet_transactions creada
   ✅ 6 funciones RPC desplegadas

✅ Frontend:
   ✅ Ruta /wallet configurada
   ✅ Links de navegación agregados
   ✅ Dev server corriendo en http://localhost:4200

✅ Secrets:
   ✅ MERCADOPAGO_ACCESS_TOKEN configurado
   ✅ APP_BASE_URL configurado

✅ Edge Functions:
   ✅ mercadopago-create-preference desplegada
   ✅ mercadopago-webhook desplegada

✅ MercadoPago:
   ✅ Aplicación "autorentar" creada
   ✅ Webhook configurado
```

### 4.2 Test Manual del Sistema

1. **Acceder a la app**:
   - Ir a: http://localhost:4200
   - Iniciar sesión (o crear cuenta)

2. **Navegar a Wallet**:
   - Click en "Wallet" en el header
   - Deberías ver:
     ```
     Balance Disponible: $0.00
     Balance Bloqueado: $0.00
     Balance Total: $0.00
     ```

3. **Iniciar Depósito**:
   - Click en "Depositar Fondos"
   - Ingresar monto: `$100.00`
   - Click en "Continuar con MercadoPago"

4. **Completar Pago en MercadoPago**:
   - Se abrirá checkout de MercadoPago
   - Usar tarjeta de prueba:
     ```
     Número: 5031 7557 3453 0604
     Vencimiento: 11/25
     CVV: 123
     Nombre: TEST USER
     ```

5. **Verificar Acreditación**:
   - Deberías ser redirigido a `/wallet?payment=success`
   - El balance debería actualizarse a `$100.00`
   - Revisar historial de transacciones

---

## 🧪 Paso 5: Debugging (Si algo falla)

### 5.1 Ver Logs de Edge Functions

**Función Create Preference:**
```
URL: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions/mercadopago-create-preference/logs
```

**Función Webhook:**
```
URL: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions/mercadopago-webhook/logs
```

### 5.2 Errores Comunes

#### Error: "Failed to fetch"
**Causa**: Edge Function no desplegada o secrets faltantes
**Solución**:
1. Verificar que ambas funciones estén "Active"
2. Verificar secrets en Settings → Edge Functions → Function Secrets
3. Verificar que JWT esté deshabilitado en ambas funciones

#### Error: Balance no se actualiza
**Causa**: Webhook no recibiendo notificaciones
**Solución**:
1. Verificar URL del webhook en MercadoPago
2. Ver logs del webhook en Supabase
3. Verificar que el pago esté "approved" en MP

#### Error: "Invalid access token"
**Causa**: Token de MercadoPago incorrecto
**Solución**:
1. Verificar que el token sea de la app "autorentar"
2. Verificar que el secret se llame exactamente `MERCADOPAGO_ACCESS_TOKEN`
3. Actualizar el secret y redesplegar funciones

### 5.3 Verificar Transacciones en DB

```sql
-- Ver transacciones pendientes
SELECT id, type, status, amount, currency, created_at
FROM wallet_transactions
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Ver balance del usuario
SELECT * FROM wallet_get_balance();
```

Ejecutar en: https://supabase.com/dashboard/project/obxvffplochgeiclibng/editor

---

## 📊 Paso 6: Monitoreo y Logs

### 6.1 Logs en Tiempo Real

**Ver logs de ambas funciones:**
```
https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs/edge-functions
```

**Filtros útiles**:
- Error logs: Filtrar por "error" o "Error"
- Webhook logs: Filtrar por "MercadoPago Webhook"
- Payment logs: Filtrar por "Payment Data"

### 6.2 Logs de MercadoPago

**Panel de webhooks:**
```
https://www.mercadopago.com.ar/developers/panel/app/5634498766947505/webhooks
```

Ver:
- Eventos enviados
- Respuestas recibidas (200 OK, 4xx, 5xx)
- Reintentos automáticos

---

## 🎯 Próximos Pasos

### Funcionalidad Actual ✅
- ✅ Depósitos con MercadoPago
- ✅ Visualización de balance
- ✅ Historial de transacciones
- ✅ Webhook de confirmación

### Por Implementar 🚧
- 🚧 Pagar reservas con wallet
- 🚧 Bloqueo de fondos para garantías
- 🚧 Retiros/transferencias
- 🚧 Validación de firma en webhook (P1)
- 🚧 Limpieza de transacciones huérfanas (P2)

### Para Producción 🔐
- [ ] Cambiar `APP_BASE_URL` a dominio de producción
- [ ] Usar credenciales de producción de MercadoPago
- [ ] Implementar validación de firma HMAC-SHA256
- [ ] Configurar monitoreo de errores (Sentry)
- [ ] Agregar rate limiting a Edge Functions
- [ ] Documentar plan de rollback

---

## 📚 Referencias

- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **MercadoPago Webhooks**: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
- **Tarjetas de Prueba MP**: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing
- **WALLET_SETUP_GUIDE.md**: Guía completa del sistema
- **WALLET_VERTICAL_AUDIT.md**: Análisis técnico detallado

---

## 🆘 Soporte

Si algo no funciona:
1. Revisar logs de Edge Functions
2. Verificar secrets configurados
3. Consultar sección de Debugging arriba
4. Revisar `WALLET_SETUP_GUIDE.md` para troubleshooting avanzado

---

**Última actualización**: 2025-10-18
**Estado**: Sistema completo desplegado y funcionando ✅
