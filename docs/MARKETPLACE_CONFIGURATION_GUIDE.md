# 🏪 Guía Completa: Configuración de MercadoPago Marketplace

**Última actualización:** 2025-10-28
**Aplicación:** TestApp-07933fa3 (ID: 4340262352975191)
**Estado actual:** ⏳ Pendiente de configuración como Marketplace

---

## 📊 Estado Actual de la Aplicación

### ✅ Información Obtenida de la API

```json
{
  "id": 4340262352975191,
  "name": "TestApp-07933fa3",
  "site_id": "MLA",
  "sandbox_mode": true,
  "certification_status": "not_certified",
  "scopes": ["read", "write", "offline_access"],
  "max_requests_per_hour": 18000,
  "callback_urls": ["https://www.mercadopago.com"],
  "active": true
}
```

### ⚠️ Estado Marketplace

**Usuario actual:**
```json
{
  "id": 2302679571,
  "marketplace_status": false,  ← ❌ NO configurado como marketplace
  "merchant_orders_status": false
}
```

**Conclusión:** La app existe pero **NO está configurada como Marketplace** todavía.

---

## 🎯 Pasos para Configurar Marketplace

### **PASO 1: Configurar App en Dashboard (MANUAL)**

1. **Ir al dashboard de tu aplicación:**
   ```
   https://www.mercadopago.com.ar/developers/panel/app/4340262352975191
   ```

2. **Configurar modelo de negocio:**
   - Buscar sección: "Modelo de negocio"
   - Seleccionar: **"Marketplace"** o **"Pagos divididos"**
   - Guardar cambios

3. **Activar funcionalidades:**
   - ✅ Procesar pagos como marketplace
   - ✅ Split de pagos (división automática)
   - ✅ OAuth (vincular vendedores)

4. **Configurar URLs de callback:**
   - Production: `https://tu-dominio.com/auth/mercadopago/callback`
   - Test: `http://localhost:4200/auth/mercadopago/callback`

5. **Obtener Client Secret:**
   - En la misma página, buscar: "Credenciales"
   - Copiar: **Client Secret** (necesario para OAuth)
   - Guardar en `.env.local`:
     ```bash
     MERCADOPAGO_CLIENT_SECRET=tu-client-secret-aqui
     ```

---

### **PASO 2: Flujo OAuth para Vincular Vendedores**

Los **dueños de autos** deben autorizar tu app para que puedas cobrar en su nombre.

#### **2.1. URL de Autorización**

Redirigir al dueño a:
```
https://auth.mercadopago.com.ar/authorization?
  client_id=4340262352975191&
  response_type=code&
  platform_id=mp&
  redirect_uri=https://tu-dominio.com/auth/mercadopago/callback&
  state=RANDOM_TOKEN_SEGURIDAD
```

**Parámetros:**
- `client_id`: `4340262352975191` (tu Application ID)
- `response_type`: `code`
- `platform_id`: `mp`
- `redirect_uri`: URL donde MP enviará el código
- `state`: Token aleatorio para prevenir CSRF

#### **2.2. Callback - Intercambiar Código por Token**

MP redirige a tu app con:
```
https://tu-dominio.com/auth/mercadopago/callback?code=TG-xxxxx&state=RANDOM_TOKEN
```

Tu backend debe hacer:
```bash
POST https://api.mercadopago.com/oauth/token
Content-Type: application/json

{
  "client_id": "4340262352975191",
  "client_secret": "TU_CLIENT_SECRET",
  "grant_type": "authorization_code",
  "code": "TG-xxxxx",
  "redirect_uri": "https://tu-dominio.com/auth/mercadopago/callback"
}
```

**Respuesta:**
```json
{
  "access_token": "APP_USR-2302679571-101722-...",
  "token_type": "Bearer",
  "expires_in": 15552000,
  "scope": "read write offline_access",
  "user_id": 2302679571,        ← ⭐ ESTE ES EL collector_id
  "refresh_token": "TG-...",
  "public_key": "APP_USR-...",
  "live_mode": false
}
```

#### **2.3. Guardar Collector ID**

```sql
UPDATE profiles
SET
  mercadopago_collector_id = '2302679571',
  mercadopago_connected = true,
  mercadopago_connected_at = NOW()
WHERE id = 'user-uuid';
```

---

### **PASO 3: Crear Preference con Split**

Una vez que el dueño tiene `collector_id`, al crear un booking:

```typescript
// En supabase/functions/mercadopago-create-booking-preference/index.ts
// ✅ YA IMPLEMENTADO

const preferenceData = {
  items: [{ title: "Alquiler auto", quantity: 1, unit_price: 500 }],

  // ⭐ SPLIT PAYMENT CONFIG
  marketplace: "4340262352975191",           // Tu Application ID
  marketplace_fee: 50.00,                    // 10% = 50 ARS
  collector_id: owner.mercadopago_collector_id,  // User ID del dueño

  back_urls: { /* ... */ },
  notification_url: "https://tu-dominio.com/webhooks/mercadopago",
  metadata: {
    is_marketplace_split: true,
    owner_amount_ars: 450,
    platform_fee_ars: 50,
    collector_id: owner.mercadopago_collector_id
  }
};
```

**Resultado:**
- MercadoPago divide automáticamente el pago:
  - **90% (450 ARS)** → Cuenta del dueño (collector_id)
  - **10% (50 ARS)** → Tu cuenta (marketplace)

---

### **PASO 4: Webhook Valida el Split**

```typescript
// En supabase/functions/mercadopago-webhook/index.ts
// ✅ YA IMPLEMENTADO

// 1. Validar collector_id
if (paymentData.collector_id !== expectedCollectorId) {
  // Insertar en payment_issues
  await supabase.from('payment_issues').insert({
    booking_id,
    payment_id,
    issue_type: 'split_collector_mismatch',
    details: { expected, received }
  });
}

// 2. Validar montos
const totalAmount = paymentData.transaction_amount;
const platformFee = metadata.platform_fee_ars;
const ownerAmount = metadata.owner_amount_ars;

if (Math.abs((ownerAmount + platformFee) - totalAmount) > 0.01) {
  // Insertar en payment_issues
}

// 3. Registrar split exitoso
await supabase.rpc('register_payment_split', {
  p_booking_id,
  p_mp_payment_id,
  p_total_amount_cents,
  p_currency: 'ARS'
});
```

---

## 🔧 Implementación: Endpoints OAuth

### **Endpoint 1: Iniciar Conexión**

**Archivo:** `supabase/functions/mercadopago-oauth-connect/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { user_id } = await req.json();

  const clientId = Deno.env.get('MERCADOPAGO_APPLICATION_ID');
  const redirectUri = Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI');

  // Generar state token
  const state = crypto.randomUUID();

  // Guardar state en DB temporalmente (para validar en callback)
  // ... (implementar según tu lógica)

  const authUrl =
    `https://auth.mercadopago.com.ar/authorization?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `platform_id=mp&` +
    `redirect_uri=${encodeURIComponent(redirectUri!)}&` +
    `state=${state}`;

  return new Response(JSON.stringify({ auth_url: authUrl }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### **Endpoint 2: Callback OAuth**

**Archivo:** `supabase/functions/mercadopago-oauth-callback/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  // Validar state (prevenir CSRF)
  // ... (verificar state guardado en BD)

  // Intercambiar código por token
  const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('MERCADOPAGO_APPLICATION_ID'),
      client_secret: Deno.env.get('MERCADOPAGO_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
      redirect_uri: Deno.env.get('MERCADOPAGO_OAUTH_REDIRECT_URI')
    })
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return new Response(JSON.stringify({ error: tokenData.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Guardar collector_id en profiles
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await supabase
    .from('profiles')
    .update({
      mercadopago_collector_id: tokenData.user_id.toString(),
      mercadopago_connected: true,
      mercadopago_connected_at: new Date().toISOString(),
      mercadopago_refresh_token: tokenData.refresh_token
    })
    .eq('id', req.headers.get('x-user-id')); // Pasar user ID desde frontend

  if (error) {
    console.error('Error saving collector_id:', error);
    return new Response(JSON.stringify({ error: 'Failed to save' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Redirigir a frontend con éxito
  return Response.redirect(`${Deno.env.get('APP_URL')}/dashboard/connected`);
});
```

---

## 📋 Columnas a Agregar en `profiles`

```sql
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
COMMENT ON COLUMN profiles.mercadopago_collector_id IS 'User ID de MercadoPago del vendedor (para split payments)';
COMMENT ON COLUMN profiles.mercadopago_connected IS 'Indica si el usuario vinculó su cuenta de MercadoPago';
```

---

## 🧪 Testing con Test Users

### ⚠️ Limitaciones

**Test users NO pueden:**
- Completar flujo OAuth real
- Transferir dinero real entre cuentas
- Ver splits en sus cuentas de MP

**Para testing de split payments:**

1. **Opción A: Simular en código**
   ```typescript
   // Para test users, usar collector_id hardcodeado
   if (process.env.NODE_ENV === 'test') {
     collector_id = '2302679571'; // Test user ID
   }
   ```

2. **Opción B: Usar cuentas reales**
   - Crear cuenta real de MP
   - Configurar app en producción
   - Vincular vendedores reales
   - Hacer transacciones mínimas ($10 ARS)

---

## 📊 Checklist de Implementación

### ✅ Backend (Completado)
- [x] Migración SQL: Tablas `payment_splits` y `payment_issues`
- [x] RPC Function: `register_payment_split()`
- [x] Webhook: Validación de splits
- [x] Edge Function: Preference con marketplace ID
- [x] Secrets configurados en Supabase

### ⏳ OAuth Flow (Pendiente)
- [ ] Migración SQL: Columnas en `profiles` para OAuth
- [ ] Edge Function: `mercadopago-oauth-connect`
- [ ] Edge Function: `mercadopago-oauth-callback`
- [ ] Frontend: Página "Conectar MercadoPago"
- [ ] Frontend: Botón en dashboard de dueños
- [ ] Service: `MercadoPagoOAuthService`

### ⏳ Dashboard Manual (Pendiente)
- [ ] Configurar app como "Marketplace" en dashboard
- [ ] Obtener Client Secret
- [ ] Configurar Redirect URIs
- [ ] Agregar `MERCADOPAGO_CLIENT_SECRET` a secrets

### ⏳ Testing (Pendiente)
- [ ] Crear booking de prueba con split
- [ ] Verificar webhook recibe collector_id
- [ ] Validar registro en `payment_splits`
- [ ] Verificar issues si falla validación

---

## 🔑 Variables de Entorno Necesarias

```bash
# .env.local

# Existentes ✅
MERCADOPAGO_ACCESS_TOKEN=APP_USR-4340262352975191-101722-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-a89f4240-f154-43dc-9535-...
MERCADOPAGO_APPLICATION_ID=4340262352975191
MERCADOPAGO_MARKETPLACE_ID=2302679571

# Faltantes ⏳
MERCADOPAGO_CLIENT_SECRET=tu-client-secret-desde-dashboard
MERCADOPAGO_OAUTH_REDIRECT_URI=https://tu-dominio.com/auth/mercadopago/callback

# Opcionales
MERCADOPAGO_OAUTH_REDIRECT_URI_DEV=http://localhost:4200/auth/mercadopago/callback
```

---

## 📚 Referencias

- **Marketplace Docs:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/landing
- **Checkout Pro Split:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-split
- **OAuth Flow:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/integration/oauth
- **Dashboard App:** https://www.mercadopago.com.ar/developers/panel/app/4340262352975191
- **API Reference:** https://www.mercadopago.com.ar/developers/es/reference

---

## 🎯 Próximos Pasos

1. **AHORA (Manual):**
   - Ir al dashboard y configurar como Marketplace
   - Obtener Client Secret
   - Configurar Redirect URIs

2. **DESPUÉS (Código):**
   - Crear migración para columnas OAuth en profiles
   - Implementar edge functions OAuth
   - Crear UI para "Conectar MercadoPago"
   - Testing con cuentas reales

3. **PRODUCCIÓN:**
   - Usar credenciales reales (no test users)
   - Configurar dominio en callback URLs
   - Validar con transacciones reales mínimas

---

**Última actualización:** 2025-10-28
