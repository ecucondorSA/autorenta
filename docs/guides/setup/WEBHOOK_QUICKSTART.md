# ⚡ Webhook QuickStart - 5 Minutos

**Objetivo**: Configurar webhook de MercadoPago para confirmación instantánea de pagos

---

## 🚀 3 PASOS RÁPIDOS

### PASO 1: Abrir Panel de MercadoPago (1 minuto)

**URL directa**:
```
https://www.mercadopago.com.ar/developers/panel/app
```

O desde MercadoPago:
1. Login en https://www.mercadopago.com.ar
2. Perfil → **Desarrolladores**
3. Click en **Aplicaciones**
4. Selecciona tu app (ID: 202984680)

---

### PASO 2: Configurar Webhook (2 minutos)

En el menú lateral, busca **"Webhooks"** o **"IPN"**

**Completar formulario**:

📌 **URL del webhook**:
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

✅ **Eventos**:
- `payment.created`
- `payment.updated`

🔐 **Modo**:
- Producción (Live)

**Click en "Guardar"**

---

### PASO 3: Verificar (2 minutos)

**Test rápido con cURL**:

```bash
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "data": { "id": "test-123" }
  }'
```

**Debe retornar**:
```json
{
  "success": true,
  "message": "Webhook type ignored"
}
```

✅ Si ves esto → **Webhook configurado correctamente**

---

## 🎯 Test Real con Depósito

1. Ir a: https://production.autorenta-web.pages.dev/wallet

2. Hacer depósito de $100

3. Pagar con dinero en MercadoPago o tarjeta

4. ⏱️ **Esperar 5-10 segundos**

5. ✅ **Balance actualizado automáticamente**

**ANTES**: 3-18 minutos
**AHORA**: 5-10 segundos 🚀

---

## 📊 Verificar Logs

```bash
cd /home/edu/autorenta
supabase functions logs mercadopago-webhook --limit 10
```

Deberías ver:
```
MercadoPago Webhook received: { "type": "payment", ... }
Payment Data from SDK: { "status": "approved", ... }
Deposit confirmed successfully
```

---

## ❌ Troubleshooting Rápido

### Webhook retorna 404
→ Verifica URL (sin espacios)
→ Verifica que Edge Function esté desplegada: `supabase functions list`

### MercadoPago no envía webhooks
→ Verifica que esté en modo **Producción** (no Sandbox)
→ Verifica que hiciste el pago en **Producción** (no test)

### Webhook recibe pero no confirma
→ Ver logs: `supabase functions logs mercadopago-webhook`
→ Buscar errores: "Transaction not found", "Payment not approved"

---

## ✅ Checklist

- [ ] Webhook configurado en panel MP
- [ ] URL: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
- [ ] Eventos: `payment.created`, `payment.updated`
- [ ] Test con cURL retorna 200 OK
- [ ] Depósito real confirmado en <15 seg

---

## 📖 Guía Completa

Para más detalles, ver: `/home/edu/autorenta/CONFIGURAR_WEBHOOK_MERCADOPAGO.md`

---

**Tiempo total**: ~5 minutos
**Impacto**: Confirmación 95% más rápida (180s → 7s)
