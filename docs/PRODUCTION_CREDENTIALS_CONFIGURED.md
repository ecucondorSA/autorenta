# ✅ Credenciales de Producción Configuradas

**Fecha:** 2025-10-28
**Marketplace:** MARKETPLACE AUTORENTAR
**Estado:** ✅ Configurado y Desplegado

---

## 📊 Información de la Cuenta

### **Usuario (Titular del Marketplace)**
```
Nombre: EDUARDO MARQUES
Email: eduardo_marques022@hotmail.com
CUIT: 20954660207
País: Argentina (MLA)
Tipo: Cuenta REAL (no test) ✅
```

### **Aplicación**
```
Nombre: MARKETPLACE AUTORENTAR
Application ID: 5481180656166782
Marketplace ID (User ID): 202984680
Estado: Activa ✅
Scopes: read, write, offline_access, payments
Max Requests/Hour: 18,000
```

---

## 🔑 Credenciales Configuradas

### **En .env.local** ✅
```bash
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-5481180656166782-102806-***
MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-c2e7a3be-34d9-4731-b049-4e89abdd097e
MERCADOPAGO_CLIENT_ID_PROD=5481180656166782
MERCADOPAGO_CLIENT_SECRET_PROD=*** (configurado)
MERCADOPAGO_APPLICATION_ID_PROD=5481180656166782
MERCADOPAGO_MARKETPLACE_ID_PROD=202984680
```

### **En Supabase Secrets** ✅
```
✅ MERCADOPAGO_ACCESS_TOKEN (hash: 470f7980de...)
✅ MERCADOPAGO_PUBLIC_KEY (hash: ed7bdc645...)
✅ MERCADOPAGO_CLIENT_SECRET (hash: c8b138b74...)
✅ MERCADOPAGO_APPLICATION_ID (hash: ee4fc939f...)
✅ MERCADOPAGO_MARKETPLACE_ID (hash: 1462c9757...)
```

---

## 🚀 Edge Functions Desplegadas

### **1. mercadopago-webhook** ✅
- **URL:** `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
- **Función:** Procesa webhooks de MercadoPago (IPN)
- **Validaciones:**
  - ✅ Verifica firma HMAC
  - ✅ Valida collector_id del split
  - ✅ Valida montos (owner + platform = total)
  - ✅ Registra splits en `payment_splits`
  - ✅ Registra issues en `payment_issues`

### **2. mercadopago-create-booking-preference** ✅
- **URL:** `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-booking-preference`
- **Función:** Crea preferences de Checkout Pro con split
- **Parámetros de Split:**
  - `marketplace`: 5481180656166782 (Application ID)
  - `marketplace_fee`: 10% del total
  - `collector_id`: ID del dueño del auto

---

## ⚠️ Estado Actual del Marketplace

### **Configurado en Sistema** ✅
- [x] Credenciales de producción
- [x] Secrets en Supabase
- [x] Edge Functions desplegadas
- [x] Webhook con validación de splits
- [x] Tablas SQL (`payment_splits`, `payment_issues`)
- [x] RPC Function (`register_payment_split`)

### **Pendiente en Dashboard de MercadoPago** ⏳
- [ ] Configurar app como "Marketplace" (actualmente: `marketplace_status: false`)
- [ ] Cambiar `sandbox_mode: true` a `false`
- [ ] Actualizar `callback_urls` con URLs reales
- [ ] Obtener certificación (opcional)

---

## 🔧 Próximos Pasos Manuales

### **1. Configurar Marketplace en Dashboard**

**URL:** https://www.mercadopago.com.ar/developers/panel/app/5481180656166782

**Pasos:**
1. Login con `eduardo_marques022@hotmail.com`
2. Ir a "Configuración" o "Settings"
3. Buscar "Modelo de negocio" o "Business Model"
4. Seleccionar: **"Marketplace"** o **"Pagos divididos"**
5. Activar: **"Procesar pagos como marketplace"**
6. Guardar cambios

**Resultado esperado:**
```json
{
  "marketplace_status": true,  // Cambiará a true
  "business_model": "marketplace"
}
```

### **2. Configurar Callback URLs**

En la misma página del dashboard:

**Producción:**
```
https://autorentar.com.ar/auth/mercadopago/callback
```

**Desarrollo (opcional):**
```
http://localhost:4200/auth/mercadopago/callback
```

### **3. Cambiar Sandbox Mode**

Si ya no necesitas testing:
- Cambiar `sandbox_mode` de `true` a `false`

**⚠️ Advertencia:** Solo hacer esto cuando estés listo para recibir pagos reales.

---

## 🧪 Testing con Credenciales de Producción

### **Opción A: Test con Montos Pequeños**
1. Crear booking de prueba
2. Usar monto mínimo: $10 ARS
3. Pagar con tarjeta real
4. Verificar webhook recibe el pago
5. Validar registro en `payment_splits`

### **Opción B: Continuar con Sandbox**
- Mantener `sandbox_mode: true`
- Usar credenciales de test para development
- Cambiar a producción cuando esté listo

---

## 📋 Flujo OAuth para Vendedores (Pendiente)

### **Implementar Endpoints**

#### **1. Edge Function: OAuth Connect**
**Archivo:** `supabase/functions/mercadopago-oauth-connect/index.ts`

**Función:** Genera URL de autorización para vendedores

**URL generada:**
```
https://auth.mercadopago.com.ar/authorization?
  client_id=5481180656166782&
  response_type=code&
  platform_id=mp&
  redirect_uri=https://autorentar.com.ar/auth/mercadopago/callback&
  state=RANDOM_TOKEN
```

#### **2. Edge Function: OAuth Callback**
**Archivo:** `supabase/functions/mercadopago-oauth-callback/index.ts`

**Función:** Recibe código y obtiene `collector_id`

**Request a MP:**
```json
POST https://api.mercadopago.com/oauth/token
{
  "client_id": "5481180656166782",
  "client_secret": "igIjYgarnXFG3lz0BFat5h3haAeur7Qb",
  "grant_type": "authorization_code",
  "code": "TG-xxxxx",
  "redirect_uri": "https://autorentar.com.ar/auth/mercadopago/callback"
}
```

**Guardar en DB:**
```sql
UPDATE profiles
SET
  mercadopago_collector_id = '123456789',
  mercadopago_connected = true,
  mercadopago_connected_at = NOW()
WHERE id = 'user-uuid';
```

---

## 🗂️ Migración SQL Pendiente

### **Agregar Columnas OAuth en profiles**

```sql
-- Archivo: supabase/migrations/20251028_add_oauth_columns_to_profiles.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mercadopago_collector_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercadopago_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mercadopago_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mercadopago_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_access_token_expires_at TIMESTAMPTZ;

-- Índice para búsquedas rápidas
CREATE INDEX idx_profiles_mp_collector
ON profiles(mercadopago_collector_id)
WHERE mercadopago_connected = TRUE;

-- Comentarios
COMMENT ON COLUMN profiles.mercadopago_collector_id
  IS 'User ID de MercadoPago del vendedor (para split payments)';

COMMENT ON COLUMN profiles.mercadopago_connected
  IS 'Indica si el usuario vinculó su cuenta de MercadoPago';
```

---

## 📊 Verificar Configuración

### **Test 1: Credenciales Funcionan**
```bash
curl -X GET "https://api.mercadopago.com/users/me" \
  -H "Authorization: Bearer APP_USR-5481180656166782-102806-***" | jq
```

**Resultado esperado:**
```json
{
  "id": 202984680,
  "email": "eduardo_marques022@hotmail.com",
  "site_id": "MLA"
}
```

### **Test 2: Secrets en Supabase**
```bash
npx supabase secrets list --project-ref obxvffplochgeiclibng | grep MERCADOPAGO
```

**Resultado esperado:** 5 secrets configurados ✅

### **Test 3: Edge Functions Desplegadas**
```bash
npx supabase functions list --project-ref obxvffplochgeiclibng
```

**Resultado esperado:**
```
mercadopago-webhook ✅
mercadopago-create-booking-preference ✅
```

---

## 🔐 Seguridad

### **Variables Sensibles**
- ✅ Access Token: Guardado en `.env.local` (no en repo)
- ✅ Client Secret: Guardado en Supabase secrets encriptados
- ✅ `.env.local` en `.gitignore`

### **Recomendaciones**
- 🔄 Rotar credenciales cada 90 días
- 📊 Monitorear requests en dashboard de MP
- 🚨 Configurar alertas de transacciones sospechosas
- 🔒 Nunca compartir Client Secret en código público

---

## ✅ Checklist de Implementación

### **Completado** ✅
- [x] Obtener credenciales de producción de MP
- [x] Configurar en `.env.local`
- [x] Configurar secrets en Supabase
- [x] Verificar credenciales con API de MP
- [x] Redesplegar Edge Functions
- [x] Tablas SQL creadas (`payment_splits`, `payment_issues`)
- [x] RPC Function `register_payment_split()` creada
- [x] Webhook con validación de splits implementado

### **Pendiente** ⏳
- [ ] Configurar app como Marketplace en dashboard MP
- [ ] Actualizar callback URLs en dashboard MP
- [ ] Crear migración SQL para columnas OAuth
- [ ] Implementar Edge Function: `mercadopago-oauth-connect`
- [ ] Implementar Edge Function: `mercadopago-oauth-callback`
- [ ] Crear UI para "Conectar MercadoPago" (dueños)
- [ ] Testing con booking real de $10 ARS
- [ ] Verificar split funciona correctamente
- [ ] Documentar proceso de onboarding de vendedores

---

## 📚 Referencias

- **Dashboard App:** https://www.mercadopago.com.ar/developers/panel/app/5481180656166782
- **Docs Marketplace:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/landing
- **Docs OAuth:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/integration/oauth
- **API Reference:** https://www.mercadopago.com.ar/developers/es/reference

---

**Última actualización:** 2025-10-28
**Próxima acción:** Configurar Marketplace en dashboard de MercadoPago
