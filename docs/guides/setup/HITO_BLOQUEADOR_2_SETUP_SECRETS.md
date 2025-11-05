# 🔐 BLOQUEADOR #2 - SETUP COMPLETO DE SECRETS

**Objetivo**: Configurar todos los secrets necesarios en Cloudflare Workers y Supabase Edge Functions para que el sistema de pagos funcione en producción.

**Status**: 🟡 EN PROCESO
**Duración Estimada**: 1.5-2 horas
**Complejidad**: Media (tareas procedurales)
**Responsabilidad**: Manual (requiere acceso a dashboards)

---

## 📋 CHECKLIST GENERAL

- [ ] Verificar acceso a Cloudflare Dashboard
- [ ] Verificar acceso a Supabase Dashboard
- [ ] Configurar Cloudflare Workers Secrets
- [ ] Configurar Supabase Edge Functions Secrets
- [ ] Validar que todos los secrets están accesibles
- [ ] Test end-to-end de webhook
- [ ] Documentar configuración
- [ ] ✅ HITO COMPLETADO

---

## 🔑 PARTE A: Cloudflare Workers Secrets (Payment Webhook)

**Archivo**: `functions/workers/payments_webhook/`
**Worker**: `autorenta-payments-worker`
**Función**: Mock payment webhook (development only)

⚠️ **IMPORTANTE**: El Cloudflare Worker es solo para **testing local**. En producción, el webhook real está en Supabase Edge Functions.

### Paso 1: Verificar configuración de wrangler

```bash
cd /home/edu/autorenta/functions/workers/payments_webhook
cat wrangler.toml
```

**Debe contener**:
```toml
name = "payments_webhook"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[env.production]]
name = "autorenta-payments-worker"
routes = [
  { pattern = "payments-webhook.example.com/webhooks/payments", zone_id = "YOUR_ZONE_ID" }
]

[[env.production.vars]]
ENVIRONMENT = "production"
```

### Paso 2: Configurar secrets en Cloudflare

```bash
# Login a Cloudflare
wrangler login

# Navegar al directorio del worker
cd /home/edu/autorenta/functions/workers/payments_webhook

# Establecer secrets para ambiente de PRODUCCIÓN
wrangler secret put --env production SUPABASE_URL
# Ingresar: https://obxvffplochgeiclibng.supabase.co

wrangler secret put --env production SUPABASE_SERVICE_ROLE_KEY
# Ingresar: [SERVICE_ROLE_KEY_FROM_SUPABASE]

wrangler secret put --env production MERCADOPAGO_ACCESS_TOKEN
# Ingresar: APP_USR-[TOKEN_FROM_MERCADOPAGO]

# Verificar secrets configurados
wrangler secret list --env production
```

**Salida esperada**:
```
⚡ Getting secrets for 'autorenta-payments-worker'
┌─────────────────────────┬────────────┐
│ Name                    │ Updated at │
├─────────────────────────┼────────────┤
│ SUPABASE_URL            │ 1 second   │
│ SUPABASE_SERVICE_ROLE_KEY │ 2 seconds │
│ MERCADOPAGO_ACCESS_TOKEN │ 3 seconds  │
└─────────────────────────┴────────────┘
```

### Paso 3: Verificar en Dashboard de Cloudflare

1. Ir a: https://dash.cloudflare.com/
2. Seleccionar cuenta
3. Ir a **Workers & Pages** → **Overview**
4. Buscar `payments_webhook`
5. Ir a **Settings** → **Environment variables & secrets**
6. Verificar que los 3 secrets están ahí ✅

---

## 🔑 PARTE B: Supabase Edge Functions Secrets

**Ubicación**: Supabase Project `obxvffplochgeiclibng`
**Functions**:
- `mercadopago-webhook` (recibe pagos)
- `mercadopago-create-preference` (crea preferencias)
- `mercadopago-create-booking-preference` (crea preferencias de bookings)

### Paso 1: Login a Supabase CLI

```bash
# Si no estás logueado
supabase login

# Link al proyecto
cd /home/edu/autorenta
supabase link --project-ref obxvffplochgeiclibng
```

**Respuesta esperada**:
```
✔ Linked to project obxvffplochgeiclibng
```

### Paso 2: Configurar secrets

```bash
# Opción A: Via CLI (recomendado)
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-[TOKEN]
supabase secrets set SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[KEY]

# Opción B: Via Dashboard
# 1. Ir a https://app.supabase.com/project/obxvffplochgeiclibng
# 2. Edge Functions → mercadopago-webhook
# 3. Hacer click en ⚙️ (settings)
# 4. Ir a "Secrets"
# 5. Agregar cada secret manualmente
```

### Paso 3: Verificar secrets configurados

```bash
supabase secrets list
```

**Salida esperada**:
```
╭─────────────────────────────┬──────────────────┬────────────╮
│ name                        │ value            │ created_at │
├─────────────────────────────┼──────────────────┼────────────┤
│ MERCADOPAGO_ACCESS_TOKEN    │ APP_USR-****     │ [date]     │
│ SUPABASE_URL                │ https://obxvffp* │ [date]     │
│ SUPABASE_SERVICE_ROLE_KEY   │ eyJhbGciOi****   │ [date]     │
╰─────────────────────────────┴──────────────────┴────────────╯
```

### Paso 4: Desplegar Edge Functions con secrets

```bash
# Deploy individual functions
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-create-preference
supabase functions deploy mercadopago-create-booking-preference

# Verificar deployment
supabase functions list

# Ver logs del deploy
supabase functions list --verbose
```

---

## 🔑 PARTE C: Environment Variables en App (Frontend)

### Paso 1: Verificar archivo de configuración

```bash
cat /home/edu/autorenta/apps/web/.env.production
```

**Debe contener** (públicos, sin secrets):
```
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=eyJhbGciOi...
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=https://[CLOUDFLARE_WORKER_URL]/webhooks/payments
NG_APP_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
NG_APP_MERCADOPAGO_PUBLIC_KEY=APP_USR-a89f4240...
```

⚠️ **IMPORTANTE**:
- ❌ NO incluir `MERCADOPAGO_ACCESS_TOKEN` aquí (es SECRET)
- ❌ NO incluir `SUPABASE_SERVICE_ROLE_KEY` aquí (es SECRET)
- ✅ Solo llaves PÚBLICAS (ANON_KEY, PUBLIC_KEY)

### Paso 2: Configurar Cloudflare Pages Environment

1. Ir a: https://dash.cloudflare.com/
2. **Pages** → **autorenta-web** → **Settings**
3. **Environment variables** → **Production**
4. Añadir variables públicas:
   - `NG_APP_SUPABASE_URL`
   - `NG_APP_SUPABASE_ANON_KEY`
   - `NG_APP_MAPBOX_ACCESS_TOKEN`
   - `NG_APP_MERCADOPAGO_PUBLIC_KEY`
   - Etc.

---

## 🧪 PARTE D: Testing & Validación

### Test 1: Verificar Cloudflare Worker

```bash
# Navegar al worker
cd /home/edu/autorenta/functions/workers/payments_webhook

# Deploy a Cloudflare
wrangler deploy --env production

# Test endpoint
curl -X POST https://[WORKER_URL]/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mercadopago",
    "action": "payment.updated",
    "data": {
      "id": "123456"
    }
  }'

# Resultado esperado
# {"status": "ok", "message": "Webhook processed"}
```

### Test 2: Verificar Supabase Edge Functions

```bash
# Ver todos los logs de la función
supabase functions logs mercadopago-webhook

# Invocar función localmente (opcional)
supabase functions execute mercadopago-webhook --no-verify-jwt \
  --payload '{"action":"payment.updated","data":{"id":"123"}}'
```

### Test 3: Verificar que Angular build puede acceder a variables

```bash
cd /home/edu/autorenta/apps/web

# Build con env de production
NODE_ENV=production npm run build

# Verificar que public/env.js fue generado
cat dist/web/public/env.js
```

**Debe contener**:
```javascript
window.APP_CONFIG = {
  NG_APP_SUPABASE_URL: "https://obxvffplochgeiclibng.supabase.co",
  NG_APP_MERCADOPAGO_PUBLIC_KEY: "APP_USR-...",
  // etc.
};
```

### Test 4: Validación End-to-End (E2E)

**Simular flujo completo**:

1. **Frontend**: Usuario intenta hacer un depósito
   ```bash
   # En app: Click en "Depositar" → $100 ARS
   ```

2. **Edge Function**: Crea preferencia de MercadoPago
   ```bash
   # Verifica que mercadopago-create-preference funciona
   # Debe retornar init_point para redirect a MercadoPago
   ```

3. **MercadoPago**: Usuario completa pago
   ```bash
   # En sandbox: https://www.mercadopago.com.ar/developers/es/docs
   # Test card: 4509 9535 6623 3704 (hasta 12/25, CVV 123)
   ```

4. **Webhook**: MercadoPago envía notificación
   ```bash
   # mercadopago-webhook recibe IPN
   # Verifica firma con MERCADOPAGO_ACCESS_TOKEN
   # Actualiza wallet_transactions → CONFIRMED
   # Llama a wallet_confirm_deposit() RPC
   ```

5. **Database**: Wallet se actualiza
   ```sql
   -- Verificar en Supabase
   SELECT * FROM wallet_transactions
   WHERE user_id = '[USER_ID]'
   ORDER BY created_at DESC
   LIMIT 1;

   -- Debe mostrar status = 'CONFIRMED'
   ```

6. **Frontend**: Usuario ve balance actualizado
   ```bash
   # App muestra nuevo balance
   # Wallet → "Saldo: $100 ARS"
   ```

---

## 📊 Matriz de Secrets

| Secret | Origen | Destino | Tipo | Rotación |
|--------|--------|---------|------|----------|
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago Dashboard | Supabase + Cloudflare | Servidor | Cada 90 días |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings | Cloudflare + Supabase | Servidor | Cada 6 meses |
| `SUPABASE_URL` | Supabase Dashboard | Cloudflare + Frontend | Público | N/A |
| `NG_APP_SUPABASE_ANON_KEY` | Supabase Dashboard | Frontend | Público | N/A |
| `NG_APP_MERCADOPAGO_PUBLIC_KEY` | MercadoPago Dashboard | Frontend | Público | N/A |

---

## 🔒 Checklist de Seguridad

- [ ] ✅ Todos los SECRET keys están en `.gitignore`
- [ ] ✅ No hay secrets en commit history
- [ ] ✅ SERVICE_ROLE_KEY no está expuesto en frontend
- [ ] ✅ ACCESS_TOKEN está rotado < 90 días
- [ ] ✅ Supabase RLS está activado
- [ ] ✅ Cloudflare Workers autenticación está configurada
- [ ] ✅ Logs no contienen secrets (redacted)
- [ ] ✅ Backup de secrets en gestor (1Password/HashiCorp Vault)

---

## 📈 Indicadores de Éxito

Una vez completado **Bloqueador #2**, deberías poder:

✅ **Crear depósito real**:
- Usuario se dirije a /wallet
- Hace click "Depositar"
- Se redirige a MercadoPago checkout
- Completa pago con tarjeta de prueba
- Webhook procesa pago
- Balance se actualiza

✅ **Ver logs limpios**:
```bash
supabase functions logs mercadopago-webhook
# Sin errores de "missing secret" o "undefined"
```

✅ **Deployment sin errores**:
```bash
wrangler deploy --env production
# ✔ Upload complete [...]
# ✔ Deployed to https://[WORKER_URL]
```

---

## 🎯 Próximos Pasos

Una vez completado Bloqueador #2:

1. **Bloqueador #3**: Validar webhook MercadoPago en producción (1h)
2. **Phase 2**: Implementar Split Payment para locadores (5-7h)
3. **Phase 2**: Tests E2E con Playwright (3-4h)
4. **Phase 3**: Resolver tabla booking_risk_snapshot

---

## 📞 Troubleshooting

### Error: "Secret not found"

```bash
# Causa: Secret no está configurado
# Solución: Verificar que el secret existe
wrangler secret list
supabase secrets list

# Si falta, crear nuevamente:
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
```

### Error: "Invalid token"

```bash
# Causa: Token expirado o mal copiado
# Verificación:
1. Copiar nuevamente desde MercadoPago Dashboard
2. Verificar que no hay espacios/saltos de línea
3. Rotar token en MercadoPago y actualizar secret
```

### Error: "Permission denied" en Supabase

```bash
# Causa: SERVICE_ROLE_KEY incorrecta
# Verificación:
1. Ir a Supabase Project Settings
2. Copiar "service_role" key (no anon key)
3. Verificar en Supabase CLI: supabase secrets list
4. Si está mal, actualizar: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

---

**Status**: 🟡 READY TO EXECUTE
**Tiempo estimado**: 1.5 - 2 horas (procedimientos manuales)
**Responsable**: Edu (acceso a dashboards necesario)

