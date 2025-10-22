# 🔬 WALLET DEBUG LAB - Investigación Agresiva

## 🎯 Problema Principal
**Error**: `TypeError: Failed to fetch` al hacer clic en "Depositar fondos"

## 📍 Ubicación del Error
- **Archivo**: `wallet.service.ts:249`
- **Método**: `initiateDeposit()`
- **Llamada**: `fetch()` a Edge Function `mercadopago-create-preference`

## 🔍 Análisis del Flujo

### Flujo Actual (con error)
```
Usuario → Click "Depositar"
  ↓
WalletService.initiateDeposit()
  ↓
RPC: wallet_initiate_deposit() ✅ (funciona, crea transacción pending)
  ↓
fetch(`${supabaseUrl}/functions/v1/mercadopago-create-preference`) ❌ FALLA AQUÍ
  ↓
TypeError: Failed to fetch
```

## 🔧 Credenciales Proporcionadas

### MercadoPago
- **Access Token**: `APP_USR-5634498766947505-101722-d3835455c900aa4b9030901048ed75e3-202984680`
- **App Secret**: `APP_USR-1eff8810-b857-40c6-b290-86891ce23da5`
- **User ID**: `202984680`
- **App ID**: `5634498766947505`
- **Producto**: Checkout Pro
- **API**: Orders

### Supabase
- **URL**: `postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres`
- **Project Ref**: `obxvffplochgeiclibng`
- **Password**: `ECUCONDOR08122023`
- **Project URL**: `https://obxvffplochgeiclibng.supabase.co`

## 🐛 Posibles Causas del Error

### 1. Edge Function No Desplegada ❌
```bash
# Verificar si existe
supabase functions list

# Desplegar
cd /home/edu/autorenta
supabase functions deploy mercadopago-create-preference
```

### 2. Variables de Entorno No Configuradas ❌
```bash
# Configurar en Supabase Dashboard o CLI
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-5634498766947505-101722-d3835455c900aa4b9030901048ed75e3-202984680
supabase secrets set APP_BASE_URL=https://autorenta-web.pages.dev
```

### 3. CORS Bloqueando Requests ❌
- Edge Function tiene `corsHeaders` configurado con `*`
- Debería funcionar

### 4. URL Incorrecta ❌
```typescript
// Actual
const supabaseUrl = (this.supabase.getClient() as any).supabaseUrl;
// Si es undefined → fetch falla

// Fix: Hardcodear temporalmente
const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
```

### 5. Auth Token Inválido ❌
```typescript
// Verificar en línea 242
const accessToken = session.data.session?.access_token;
// Si es undefined → request sin auth → 401
```

## 🛠️ Plan de Acción

### Paso 1: Verificar Edge Function Desplegada
```bash
supabase functions list
supabase functions deploy mercadopago-create-preference --no-verify-jwt
```

### Paso 2: Configurar Secrets en Supabase
```bash
supabase login
supabase link --project-ref obxvffplochgeiclibng
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-5634498766947505-101722-d3835455c900aa4b9030901048ed75e3-202984680"
supabase secrets set APP_BASE_URL="https://autorenta-web.pages.dev"
```

### Paso 3: Agregar Logging Agresivo en Frontend
```typescript
// wallet.service.ts línea 248
console.log('🔍 DEBUG: Iniciando llamada a Edge Function');
console.log('🔍 supabaseUrl:', supabaseUrl);
console.log('🔍 accessToken:', accessToken ? 'PRESENTE' : 'AUSENTE');
console.log('🔍 transaction_id:', result.transaction_id);

const mpResponse = await fetch(...)
console.log('🔍 mpResponse.status:', mpResponse.status);
console.log('🔍 mpResponse.ok:', mpResponse.ok);
```

### Paso 4: Probar Edge Function Directamente
```bash
# Con curl
curl -X POST \
  'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "transaction_id": "test-tx-123",
    "amount": 100,
    "description": "Test deposit"
  }'
```

### Paso 5: Crear Endpoint de Health Check
```typescript
// mercadopago-create-preference/index.ts
// Agregar al inicio
if (req.method === 'GET') {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        HAS_MP_TOKEN: !!Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'),
        HAS_SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## 📊 Checklist de Diagnóstico

- [ ] Edge Function desplegada en Supabase
- [ ] Secrets configurados (MERCADOPAGO_ACCESS_TOKEN, APP_BASE_URL)
- [ ] supabaseUrl es válido en frontend
- [ ] accessToken está presente en request
- [ ] CORS permite requests desde autorenta-web.pages.dev
- [ ] Health check endpoint responde

## 🎯 Soluciones a Implementar

### Solución 1: Hardcodear URL Temporalmente (Quick Fix)
```typescript
// wallet.service.ts:248
const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
```

### Solución 2: Mejorar Error Handling
```typescript
try {
  const mpResponse = await fetch(...);

  if (!mpResponse.ok) {
    const text = await mpResponse.text();
    console.error('Edge Function error:', text);
    throw new Error(`Edge Function returned ${mpResponse.status}: ${text}`);
  }

  const mpData = await mpResponse.json();
  // ...
} catch (fetchError) {
  console.error('Fetch error details:', fetchError);

  if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
    throw this.createError(
      'EDGE_FUNCTION_UNREACHABLE',
      'No se pudo conectar con el servicio de pagos. Verifica que la Edge Function esté desplegada.',
      { originalError: fetchError, supabaseUrl, hasToken: !!accessToken }
    );
  }

  throw fetchError;
}
```

### Solución 3: Agregar Retry Logic
```typescript
async fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} after fetch error`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## 🔥 Modo Agresivo: Testing sin Edge Function

Si Edge Function sigue fallando, podemos:

1. **Llamar directamente a MercadoPago API desde frontend** (temporal)
2. **Usar Cloudflare Worker** en lugar de Supabase Edge Function
3. **Crear API proxy en Next.js** (si migramos a Next.js)

```typescript
// TEMPORAL: Llamada directa a MercadoPago desde frontend
const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MP_ACCESS_TOKEN_FROM_ENV}`, // ⚠️ INSEGURO
  },
  body: JSON.stringify({
    items: [{ title: 'Depósito', quantity: 1, unit_price: amount }],
    external_reference: transaction_id,
  }),
});
```

## 🎓 Lecciones Aprendidas

1. **Siempre verificar deployment** antes de asumir que funciona
2. **Agregar health checks** a todas las Edge Functions
3. **Logging agresivo** en desarrollo
4. **Fallbacks** para servicios externos

## 📝 Próximos Pasos

1. ✅ Crear rama de laboratorio (`lab/wallet-debug-aggressive`)
2. ⏳ Desplegar Edge Function con secrets
3. ⏳ Agregar logging detallado
4. ⏳ Probar health check
5. ⏳ Solucionar error
6. ⏳ Merge a main solo con fixes
