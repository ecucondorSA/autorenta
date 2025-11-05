# 🔧 Checklist de Diagnóstico de Webhooks MercadoPago

## ⚠️ PROBLEMA ACTUAL
Los webhooks de MercadoPago NO están llegando a nuestro sistema.
**Evidencia**: 2+ pagos aprobados que no se procesaron automáticamente.

---

## 1️⃣ Verificar URL del Webhook en MercadoPago

### Acceder al Panel de MercadoPago:
1. Ir a: https://www.mercadopago.com.ar/developers/panel/ipn/configuration
2. Verificar que la URL esté configurada correctamente

### ✅ URL Correcta:
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

### ❌ Problemas Comunes:
- URL apuntando a localhost/desarrollo
- URL con typo
- URL sin HTTPS
- URL antigua (antes del deploy)

---

## 2️⃣ Verificar Logs de Supabase Edge Function

### Comando para ver logs en tiempo real:
```bash
supabase functions logs mercadopago-webhook --tail
```

### Qué buscar:
- ✅ Requests POST llegando desde MercadoPago
- ❌ Errores 500/503
- ❌ Timeouts
- ❌ Errores de autenticación
- ❌ Sin requests (webhook no configurado)

---

## 3️⃣ Probar Webhook Manualmente

### Test 1: Verificar que el endpoint responde
```bash
curl -X POST \
  "https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "live_mode": true,
    "type": "payment",
    "date_created": "2025-10-20T15:00:00.000-04:00",
    "user_id": 123,
    "api_version": "v1",
    "action": "payment.created",
    "data": {
      "id": "PAYMENT_ID_AQUI"
    }
  }'
```

**Resultado esperado**: `200 OK` con respuesta JSON

### Test 2: Simular webhook real con payment_id real
```bash
# Usar el payment_id del pago que no se procesó
curl -X POST \
  "https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "live_mode": true,
    "type": "payment",
    "date_created": "2025-10-20T15:00:00.000-04:00",
    "user_id": 2302679571,
    "api_version": "v1",
    "action": "payment.updated",
    "data": {
      "id": "PAYMENT_ID_DEL_NUEVO_PAGO"
    }
  }'
```

---

## 4️⃣ Verificar Variables de Entorno en Supabase

```bash
supabase secrets list
```

### Variables requeridas:
- ✅ `MERCADOPAGO_ACCESS_TOKEN`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Verificar que el token de MercadoPago sea válido:
```bash
curl -X GET \
  "https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1DAYS&end_date=NOW" \
  -H "Authorization: Bearer APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571"
```

**Resultado esperado**: Lista de pagos recientes

---

## 5️⃣ Verificar Firewall/Rate Limiting

### MercadoPago puede estar bloqueado por:
- Supabase rate limiting
- Cloudflare (si está en frente)
- Configuración de CORS incorrecta

### Revisar en Supabase Dashboard:
- Settings → API → Edge Functions → Rate Limiting
- Settings → API → CORS Configuration

---

## 6️⃣ Activar Modo de Prueba de MercadoPago

### En el panel de MercadoPago:
1. Ir a: https://www.mercadopago.com.ar/developers/panel/ipn/configuration
2. Activar "Modo de Prueba"
3. Hacer un pago de prueba con tarjeta de test
4. Verificar que llegue el webhook

### Tarjeta de prueba:
- **Número**: 5031 7557 3453 0604
- **CVV**: 123
- **Fecha**: 11/25

---

## 7️⃣ Consultar Logs de MercadoPago

### En el panel de MercadoPago:
1. Ir a: https://www.mercadopago.com.ar/developers/panel/ipn/history
2. Ver historial de intentos de webhook
3. Verificar:
   - ✅ HTTP Status Code (debe ser 200)
   - ❌ 4xx/5xx = error en nuestro endpoint
   - ❌ Timeout = endpoint muy lento
   - ❌ "No enviado" = problema en MP

---

## ✅ SOLUCIÓN TEMPORAL: Sistema de Polling Automático

Si los webhooks están fallando sistemáticamente, implementar:

### Opción A: Cron Job cada 5 minutos
```sql
-- En Supabase SQL Editor
SELECT cron.schedule(
  'retry-failed-deposits',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  SELECT net.http_post(
    url:='https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-retry-failed-deposits',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

### Opción B: GitHub Actions (más confiable)
Crear workflow que ejecute cada 5 minutos el retry function.

---

## 🚨 ACCIÓN INMEDIATA REQUERIDA

1. **Verificar URL del webhook en MercadoPago** (5 minutos)
2. **Ver logs de Supabase** para confirmar si llegan requests (5 minutos)
3. **Probar webhook manualmente** con payment_id real (5 minutos)
4. **Si nada funciona**: Implementar cron job como fallback (15 minutos)

---

## 📊 Datos del Nuevo Pago Pendiente

**Por favor proporcionar**:
- Payment ID de MercadoPago
- Fecha/hora del pago
- Monto
- Usuario (email o nombre)
- Screenshot del panel de MercadoPago (si es posible)

Con esta información podemos:
1. Re-inyectar el webhook manualmente
2. Confirmar el depósito usando el retry function
3. Diagnosticar por qué falló
