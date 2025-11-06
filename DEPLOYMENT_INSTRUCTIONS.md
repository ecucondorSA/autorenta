# 🚀 Deployment Instructions - PayPal Integration

**Última actualización**: 2025-11-05
**Autor**: Claude Code
**Estado**: Ready for Deployment

---

## 📋 Pre-Deployment Checklist

Antes de hacer el deployment, verifica que tienes:

- [ ] Acceso a Supabase CLI (`npx supabase`)
- [ ] Credenciales de PayPal (Sandbox y Production)
- [ ] Acceso a la base de datos de Supabase
- [ ] Permisos de administrador en Supabase
- [ ] Backup de la base de datos actual

---

## 🗄️ Parte 1: Deploy de Migraciones de Base de Datos

### Paso 1: Listar Migraciones Pendientes

```bash
cd /home/edu/autorenta

# Ver estado de migraciones
npx supabase migration list --project-ref obxvffplochgeiclibng
```

### Paso 2: Ejecutar Migraciones

Las siguientes migraciones deben ejecutarse EN ORDEN:

```bash
# 1. Refactorizar payment_intents a provider-agnostic
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_refactor_payment_intents_to_provider_agnostic.sql

# 2. Agregar columnas de PayPal a profiles
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_add_paypal_provider_and_profile_columns.sql

# 3. Crear tabla platform_config
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_create_platform_config_table.sql

# 4. Actualizar funciones RPC para multi-provider
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_update_rpc_functions_for_multi_provider.sql

# 5. Crear función prepare_booking_payment
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_create_prepare_booking_payment_rpc.sql

# 6. Crear indices de rendimiento
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_create_payment_performance_indices.sql

# 7. Configurar políticas RLS para PayPal
npx supabase migration up \
  --project-ref obxvffplochgeiclibng \
  --file supabase/migrations/20251106_create_paypal_rls_policies.sql
```

### Paso 3: Verificar Migraciones

```bash
# Verificar que las migraciones se aplicaron correctamente
PGPASSWORD='ECUCONDOR08122023' psql \
  'postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres' \
  -c "SELECT * FROM platform_config;"

# Verificar columnas de PayPal en profiles
PGPASSWORD='ECUCONDOR08122023' psql \
  'postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres' \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE 'paypal%';"

# Verificar que payment_provider enum incluye 'paypal'
PGPASSWORD='ECUCONDOR08122023' psql \
  'postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres' \
  -c "SELECT unnest(enum_range(NULL::payment_provider));"
```

**Resultado Esperado**:
- platform_config table con 3 filas (fees de 15%)
- Columnas paypal_merchant_id, paypal_connected, marketplace_approved_paypal en profiles
- Enum payment_provider incluye 'paypal'

---

## ☁️ Parte 2: Deploy de Edge Functions

### Paso 1: Configurar Secrets de Supabase

```bash
# PayPal Sandbox Credentials (para testing)
npx supabase secrets set PAYPAL_CLIENT_ID="YOUR_SANDBOX_CLIENT_ID" --project-ref obxvffplochgeiclibng
npx supabase secrets set PAYPAL_CLIENT_SECRET="YOUR_SANDBOX_CLIENT_SECRET" --project-ref obxvffplochgeiclibng
npx supabase secrets set PAYPAL_API_BASE_URL="https://api-m.sandbox.paypal.com" --project-ref obxvffplochgeiclibng

# Resend API Key (para emails)
npx supabase secrets set RESEND_API_KEY="YOUR_RESEND_API_KEY" --project-ref obxvffplochgeiclibng

# App Base URL
npx supabase secrets set APP_BASE_URL="https://autorentar.com" --project-ref obxvffplochgeiclibng

# PayPal Webhook ID (obtener después de crear webhook en PayPal Developer Dashboard)
# Este paso se hace DESPUÉS del primer deploy
# npx supabase secrets set PAYPAL_WEBHOOK_ID="YOUR_WEBHOOK_ID" --project-ref obxvffplochgeiclibng
```

**IMPORTANTE**: Para producción, cambiar `PAYPAL_API_BASE_URL` a `https://api-m.paypal.com` y usar credenciales de producción.

### Paso 2: Deploy de Edge Functions

```bash
cd /home/edu/autorenta

# Deploy paypal-create-order
npx supabase functions deploy paypal-create-order --project-ref obxvffplochgeiclibng

# Deploy paypal-capture-order
npx supabase functions deploy paypal-capture-order --project-ref obxvffplochgeiclibng

# Deploy paypal-webhook
npx supabase functions deploy paypal-webhook --project-ref obxvffplochgeiclibng

# Deploy paypal-create-deposit-order (wallet)
npx supabase functions deploy paypal-create-deposit-order --project-ref obxvffplochgeiclibng

# Deploy send-booking-confirmation-email
npx supabase functions deploy send-booking-confirmation-email --project-ref obxvffplochgeiclibng
```

### Paso 3: Verificar Edge Functions

```bash
# Listar funciones deployadas
npx supabase functions list --project-ref obxvffplochgeiclibng

# Test paypal-create-order (debe retornar error por falta de auth)
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-create-order \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"test"}'

# Debería retornar 401 Unauthorized (expected)
```

---

## 🔧 Parte 3: Configurar Webhook de PayPal

### Paso 1: Crear Webhook en PayPal Developer Dashboard

1. Ir a https://developer.paypal.com/dashboard/applications/sandbox
2. Seleccionar tu aplicación
3. Scroll down a "Webhooks"
4. Click "Add Webhook"
5. Ingresar:
   - **Webhook URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-webhook`
   - **Event types**: Seleccionar:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.PENDING`
     - `PAYMENT.CAPTURE.REFUNDED`
6. Click "Save"
7. Copiar **Webhook ID** generado

### Paso 2: Configurar Webhook ID en Supabase

```bash
npx supabase secrets set PAYPAL_WEBHOOK_ID="YOUR_WEBHOOK_ID" --project-ref obxvffplochgeiclibng

# Redeploy webhook function para que use el nuevo secret
npx supabase functions deploy paypal-webhook --project-ref obxvffplochgeiclibng
```

### Paso 3: Test de Webhook

```bash
# PayPal Developer Dashboard > Webhooks > [Tu Webhook] > Test
# Seleccionar event type: PAYMENT.CAPTURE.COMPLETED
# Click "Send Test"
# Verificar logs en Supabase Functions Dashboard
```

---

## 🌐 Parte 4: Configurar Frontend (Cloudflare Pages)

### Paso 1: Configurar Variables de Entorno

En Cloudflare Pages Dashboard (https://dash.cloudflare.com/):

1. Ir a tu proyecto `autorenta-web`
2. Settings > Environment Variables
3. Agregar para **Production**:

```
NG_APP_PAYPAL_CLIENT_ID=YOUR_PRODUCTION_PAYPAL_CLIENT_ID
```

4. Agregar para **Preview** (opcional, si quieres testing):

```
NG_APP_PAYPAL_CLIENT_ID=YOUR_SANDBOX_PAYPAL_CLIENT_ID
```

### Paso 2: Deploy del Frontend

```bash
cd /home/edu/autorenta/apps/web

# Build production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist/autorenta-web --project-name=autorenta-web
```

O via GitHub Actions (automático):

```bash
# Commit y push
git add .
git commit -m "feat: Add PayPal integration"
git push origin main

# GitHub Actions ejecutará automáticamente:
# 1. npm run build
# 2. Deploy a Cloudflare Pages
```

---

## ✅ Parte 5: Testing Post-Deployment

### 5.1 Test Backend

```bash
# Test prepare_booking_payment RPC
PGPASSWORD='ECUCONDOR08122023' psql \
  'postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres' \
  -c "SELECT prepare_booking_payment('BOOKING_ID_REAL', 'paypal'::payment_provider, false);"

# Debería retornar JSON con success: true y datos del booking
```

### 5.2 Test PayPal Create Order (vía Postman o curl)

```bash
# Obtener token de autenticación válido desde tu app
# Luego:

curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-create-order \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "REAL_BOOKING_ID",
    "use_split_payment": false
  }'

# Debería retornar:
# {
#   "success": true,
#   "order_id": "ABC123...",
#   "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=..."
# }
```

### 5.3 Test Frontend E2E

1. Abrir https://autorentar.com
2. Login
3. Seleccionar un auto
4. Crear booking
5. Navegar a `/bookings/:id/checkout`
6. Seleccionar PayPal
7. Completar pago en sandbox
8. Verificar redirección a `/bookings/:id/confirmation`
9. Verificar estado "success"
10. Verificar booking.status = 'confirmed' en DB

### 5.4 Verificar Webhook

```bash
# Ver logs del webhook
npx supabase functions logs paypal-webhook --project-ref obxvffplochgeiclibng --tail

# En otra terminal, completar un pago de prueba
# Deberías ver logs del webhook procesando PAYMENT.CAPTURE.COMPLETED
```

---

## 🔄 Rollback Plan

Si algo sale mal, sigue estos pasos:

### Rollback de Edge Functions

```bash
# Listar versiones de funciones
npx supabase functions list --project-ref obxvffplochgeiclibng

# Si necesitas volver a versión anterior (no recomendado, mejor fixear)
# Contactar soporte de Supabase o redeploy versión anterior desde Git
```

### Rollback de Migraciones

```bash
# ADVERTENCIA: No hay rollback automático en Supabase
# Si necesitas hacer rollback manual:

# 1. Backup de la DB
PGPASSWORD='ECUCONDOR08122023' pg_dump \
  'postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres' \
  > backup_pre_paypal.sql

# 2. Restaurar backup (si todo falla)
# PGPASSWORD='ECUCONDOR08122023' psql ... < backup_pre_paypal.sql

# 3. Alternativa: Ejecutar migraciones de rollback manualmente
# Ver CLAUDE.md > Troubleshooting > Database Rollback
```

### Rollback de Frontend

```bash
# Via Cloudflare Pages Dashboard
# Ir a Deployments > [Seleccionar deployment anterior] > Rollback

# O via CLI
cd /home/edu/autorenta/apps/web
git checkout COMMIT_HASH_ANTERIOR
npm run deploy:pages
```

---

## 📊 Post-Deployment Monitoring

### Métricas a Vigilar

1. **Edge Functions**:
   - Invocations count
   - Error rate
   - Response time (p95, p99)

2. **Database**:
   - payment_intents inserts
   - payment_splits inserts
   - bookings status transitions

3. **PayPal**:
   - Order creation success rate
   - Capture success rate
   - Webhook delivery rate

### Logs

```bash
# Edge Functions logs
npx supabase functions logs paypal-create-order --project-ref obxvffplochgeiclibng --tail
npx supabase functions logs paypal-webhook --project-ref obxvffplochgeiclibng --tail

# Database logs (via Supabase Dashboard)
# https://app.supabase.com/project/obxvffplochgeiclibng/logs/explorer
```

---

## 🎯 Success Criteria

El deployment es exitoso si:

- [ ] Todas las migraciones se aplicaron sin errores
- [ ] Edge Functions deployadas (5 funciones)
- [ ] Webhook de PayPal configurado y recibiendo eventos
- [ ] Frontend actualizado con PayPal Client ID
- [ ] Test E2E de pago con PayPal Sandbox exitoso
- [ ] Email de confirmación enviado correctamente
- [ ] Booking status transiciona a 'confirmed'
- [ ] payment_splits se crean correctamente (si split payment)
- [ ] No hay errores en logs de Edge Functions

---

## 🆘 Troubleshooting

### Error: "PayPal Client ID not configured"

**Solución**: Verificar que `NG_APP_PAYPAL_CLIENT_ID` está configurado en Cloudflare Pages y hacer rebuild.

### Error: "PAYPAL_CLIENT_SECRET not found"

**Solución**: Ejecutar `npx supabase secrets set PAYPAL_CLIENT_SECRET=...`

### Error: "Webhook signature verification failed"

**Solución**: Verificar que `PAYPAL_WEBHOOK_ID` está configurado correctamente.

### Error: "prepare_booking_payment() does not exist"

**Solución**: Ejecutar migración `20251106_create_prepare_booking_payment_rpc.sql` manualmente.

### Payments pendientes no se confirman

**Solución**: Verificar que el webhook está recibiendo eventos. Ver logs del webhook.

---

## 📚 Recursos Adicionales

- **PayPal Developer Dashboard**: https://developer.paypal.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com/project/obxvffplochgeiclibng
- **Cloudflare Pages**: https://dash.cloudflare.com
- **Documentación Completa**: `/home/edu/autorenta/PAYPAL_INTEGRATION_COMPLETE.md`
- **Troubleshooting**: `/home/edu/autorenta/CHECKOUT_INTEGRATION_GUIDE.md`

---

**IMPORTANTE**: Hacer deployment en horario de bajo tráfico (ej: domingos 2am-6am ART) para minimizar impacto en usuarios.

**Última actualización**: 2025-11-05
