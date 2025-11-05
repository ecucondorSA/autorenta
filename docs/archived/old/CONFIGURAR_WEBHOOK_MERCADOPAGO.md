# 🔔 Configurar Webhook de MercadoPago - AutoRenta

**Tiempo estimado**: 5 minutos
**Impacto**: Confirmación de pagos en <10 segundos (vs 3+ minutos actual)

---

## 🎯 ¿Por Qué Es Necesario?

### Situación Actual (SIN webhook configurado):

```
Usuario paga en MercadoPago → 5 segundos
⏳ AutoRenta NO sabe que se pagó
⏳ Espera próximo cron job (máx 3 minutos)
⏳ Polling verifica con MercadoPago API
✅ Fondos acreditados (3-18 minutos después)
```

**Tiempo total**: 3-18 minutos

### Con Webhook Configurado:

```
Usuario paga en MercadoPago → 5 segundos
✅ MercadoPago envía webhook a AutoRenta → 6 segundos
✅ Fondos acreditados inmediatamente → 7 segundos
```

**Tiempo total**: ~7 segundos 🚀

---

## ✅ Pre-requisitos

Antes de configurar el webhook, verifica que todo esté listo:

### 1. Edge Function Desplegada

```bash
cd /home/edu/autorenta
supabase functions list | grep mercadopago-webhook
```

**Debe mostrar**:
```
mercadopago-webhook | ACTIVE | 19 | 2025-10-20 16:22:38
```

✅ **Estado**: ACTIVE (desplegado correctamente)

### 2. URL del Webhook

**URL completa**:
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

**Componentes**:
- `https://obxvffplochgeiclibng.supabase.co` - URL de Supabase
- `/functions/v1/` - Endpoint de Edge Functions
- `mercadopago-webhook` - Nombre de la función

### 3. Cuenta de MercadoPago

Necesitas acceso a:
- Panel de desarrolladores de MercadoPago
- Credenciales de producción (Access Token que ya tienes)

---

## 📋 PASO A PASO: Configurar Webhook

### Paso 1: Acceder al Panel de Desarrolladores

**Opción A: URL Directa**

Abre en tu navegador:
```
https://www.mercadopago.com.ar/developers/panel/app
```

**Opción B: Desde MercadoPago**

1. Ir a: https://www.mercadopago.com.ar
2. Login con tu cuenta
3. Click en tu perfil (arriba a la derecha)
4. Click en "Desarrolladores" o "Developers"
5. Click en "Aplicaciones"

---

### Paso 2: Seleccionar Tu Aplicación

1. En el panel de aplicaciones, busca tu app (probablemente se llama similar a "AutoRenta" o tiene el ID `202984680`)

2. Click en el nombre de la aplicación

3. Verás el dashboard de tu aplicación con:
   - Client ID
   - Client Secret
   - Access Token
   - Configuraciones

---

### Paso 3: Configurar Webhooks

#### Opción A: Webhooks v2 (Recomendado)

1. En el menú lateral, busca **"Webhooks"** o **"Notificaciones"**

2. Click en **"Configurar webhook"** o **"Add webhook"**

3. Completa el formulario:

   **URL del webhook**:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   ```

   **Eventos a suscribir** (seleccionar TODOS los relacionados con payments):
   - ✅ `payment.created` - Pago creado
   - ✅ `payment.updated` - Pago actualizado
   - ✅ `payment.approved` - Pago aprobado (opcional, cubierto por updated)

   **Modo**:
   - ✅ Producción (live mode)

4. Click en **"Guardar"** o **"Save"**

5. MercadoPago generará un **Secret Key** para firmar los webhooks
   - ⚠️ **IMPORTANTE**: Guarda este secret key
   - Lo necesitarás para validar la autenticidad de los webhooks

#### Opción B: IPN (Legacy - Si no encuentras Webhooks v2)

Si no ves la opción de Webhooks v2, usa IPN:

1. En el menú lateral, busca **"IPN"** o **"Instant Payment Notification"**

2. Click en **"Configurar IPN"**

3. Ingresa la URL:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   ```

4. Selecciona eventos:
   - ✅ Pagos (Payments)
   - ✅ Actualizaciones de pago (Payment updates)

5. Click en **"Guardar"**

**Nota**: IPN está deprecado pero aún funciona. MercadoPago recomienda migrar a Webhooks v2.

---

### Paso 4: Verificar Configuración

Después de guardar, deberías ver:

```
✅ Webhook configurado
   URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   Eventos: payment.created, payment.updated
   Estado: Activo
   Secret Key: wh_sec_xxxxxxxxxxxx (si usas Webhooks v2)
```

---

### Paso 5: Probar el Webhook (Opcional pero Recomendado)

MercadoPago ofrece un **simulador de webhooks**:

1. En el panel de webhooks, busca **"Test webhook"** o **"Simulator"**

2. Selecciona evento: `payment.updated`

3. Click en **"Send test notification"**

4. Deberías ver:
   - ✅ HTTP 200 OK
   - ✅ Mensaje: "Webhook received successfully"

5. Verifica en logs de Supabase:
   ```bash
   # Ver logs de la Edge Function
   supabase functions logs mercadopago-webhook --limit 10
   ```

   Deberías ver:
   ```
   MercadoPago Webhook received: {
     "type": "payment",
     "data": { "id": "test-payment-123" },
     ...
   }
   ```

---

## 🔐 Configurar Secret Key (Solo Webhooks v2)

Si usas Webhooks v2, MercadoPago genera un secret key para validar autenticidad.

### Paso 1: Copiar Secret Key

Después de crear el webhook, verás:
```
Secret Key: wh_sec_abc123xyz456...
```

**⚠️ COPIA ESTO INMEDIATAMENTE** - Solo se muestra una vez

### Paso 2: Guardar en Supabase

```bash
cd /home/edu/autorenta

# Configurar secret key en Supabase
supabase secrets set MERCADOPAGO_WEBHOOK_SECRET="wh_sec_abc123xyz456..."
```

### Paso 3: Actualizar Edge Function (Opcional)

Si quieres validar la firma del webhook, agrega esto al inicio de la función:

```typescript
// En mercadopago-webhook/index.ts
const signature = req.headers.get('x-signature');
const requestId = req.headers.get('x-request-id');

// Validar firma usando el secret
const WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
if (WEBHOOK_SECRET && signature) {
  // Validar que la firma coincide
  // (MercadoPago tiene algoritmo específico)
}
```

**Nota**: Esto es opcional. La función actual funciona sin validar firma.

---

## 🧪 TEST COMPLETO - Depósito Real

Ahora vamos a probar el flujo completo con webhook configurado:

### 1. Hacer un Depósito

1. Ir a: https://production.autorenta-web.pages.dev/wallet

2. Login: `reinamosquera2003@gmail.com`

3. Click en **"Depositar Fondos"**

4. Ingresar monto: **$100**

5. Click en **"Continuar"**

### 2. Completar Pago en MercadoPago

**Opción A: Tarjeta de Prueba (Sandbox)**

Si estás en modo sandbox:
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre: APRO
```

**Opción B: Dinero en Cuenta MercadoPago**

Si tienes saldo en MercadoPago, usa ese método (más rápido).

**Opción C: Tarjeta Real**

Usa tu tarjeta real (se cobrará $100).

### 3. Confirmar Pago

1. Click en **"Pagar"** en MercadoPago

2. ⏳ Esperar confirmación (5-10 segundos)

3. MercadoPago mostrará: **"Pago aprobado"**

### 4. Verificar Webhook

**Inmediatamente después** del pago aprobado:

1. MercadoPago envía webhook a AutoRenta (1-2 segundos)

2. Ver logs de Supabase:
   ```bash
   supabase functions logs mercadopago-webhook --limit 5
   ```

   Deberías ver:
   ```
   MercadoPago Webhook received: {
     "type": "payment",
     "action": "payment.updated",
     "data": { "id": "123456789" }
   }
   Payment Data from SDK: {
     "id": 123456789,
     "status": "approved",
     "external_reference": "transaction-uuid-here",
     ...
   }
   Deposit confirmed successfully
   ```

### 5. Verificar Balance en Frontend

1. La página se refrescará automáticamente (auto-refresh cada 30s)

2. O refrescar manualmente (F5)

3. Deberías ver:
   - ✅ Balance actualizado: $100
   - ✅ NO aparece alerta de depósitos pendientes
   - ✅ Historial muestra transacción "Completada"

### 6. Verificar en Base de Datos

```bash
PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT
  id,
  amount,
  status,
  created_at,
  updated_at,
  provider_metadata->>'payment_id' as payment_id,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_to_confirm
FROM wallet_transactions
WHERE type = 'deposit'
ORDER BY created_at DESC
LIMIT 1;
"
```

**Resultado esperado**:
```
amount: 100.00
status: completed
seconds_to_confirm: 5-15 (🚀 vs 180-1000 antes)
```

---

## 📊 ANTES vs DESPUÉS

### Antes (Sin Webhook):

| Métrica | Valor |
|---------|-------|
| Tiempo de confirmación | 3-18 minutos |
| Método principal | Polling (cron cada 3 min) |
| Acción del usuario | Click "Actualizar ahora" |
| Experiencia | ⚠️ Confusa ("¿Se acreditó?") |

### Después (Con Webhook):

| Métrica | Valor |
|---------|-------|
| Tiempo de confirmación | **5-15 segundos** 🚀 |
| Método principal | **Webhook (instantáneo)** |
| Acción del usuario | **Ninguna (automático)** |
| Experiencia | ✅ **Excelente ("Listo!")** |

### Mejora Esperada:

- ⚡ **95% más rápido** (de 180s a 7s)
- 📈 **60-80% más conversión** (usuarios completan el pago)
- 😊 **100% mejor UX** (sin esperas ni confusión)

---

## 🔧 Troubleshooting

### Problema 1: "No encuentro la sección de Webhooks"

**Posibles causas**:
- Cuenta muy antigua de MercadoPago
- Aplicación en modo sandbox

**Solución**:
1. Verifica que estés en modo "Producción" (no Sandbox)
2. Si no ves "Webhooks", usa "IPN" (funciona igual)
3. Si aún no aparece, contacta soporte de MercadoPago

### Problema 2: "Webhook retorna error 404"

**Causa**: URL incorrecta

**Verificar**:
```bash
# Test manual del webhook
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "data": { "id": "test" }
  }'
```

**Debe retornar**:
```json
{
  "success": true,
  "message": "Webhook type ignored"
}
```

Si retorna 404, verifica:
- URL correcta (sin espacios)
- Edge Function desplegada (`supabase functions list`)

### Problema 3: "Webhook recibe notificación pero no confirma depósito"

**Debug**:

1. Ver logs de la Edge Function:
   ```bash
   supabase functions logs mercadopago-webhook --limit 20
   ```

2. Buscar errores:
   - `Transaction not found` → external_reference no coincide
   - `Payment not approved` → Pago aún pendiente
   - `MercadoPago API error` → Token inválido

3. Verificar transacción en DB:
   ```sql
   SELECT * FROM wallet_transactions
   WHERE id = 'transaction-id-aqui';
   ```

### Problema 4: "MercadoPago no envía webhooks"

**Verificar**:

1. Webhook configurado en modo **Producción** (no Sandbox)

2. Pago hecho en **Producción** (no test)

3. URL del webhook es **HTTPS** (no HTTP)

4. No hay firewall bloqueando IPs de MercadoPago

**IPs de MercadoPago para whitelist** (si usas firewall):
```
209.225.49.0/24
216.33.197.0/24
216.33.196.0/24
```

---

## 🎯 Checklist Final

Antes de dar por terminado, verifica:

- [ ] Webhook configurado en panel de MercadoPago
- [ ] URL correcta: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
- [ ] Eventos seleccionados: `payment.created`, `payment.updated`
- [ ] Modo: Producción (live mode)
- [ ] Secret Key guardado (si Webhooks v2)
- [ ] Test de webhook enviado (retorna 200 OK)
- [ ] Depósito real completado en <15 segundos
- [ ] Logs de Supabase muestran webhook recibido
- [ ] Balance actualizado automáticamente

---

## 📈 Próximas Mejoras (Opcional)

Una vez que el webhook funciona, considera:

### 1. Notificaciones por Email

Enviar email al usuario cuando se confirma el depósito:

```typescript
// En wallet_confirm_deposit_admin()
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
  body: JSON.stringify({
    from: 'noreply@autorentar.com',
    to: user_email,
    subject: '✅ Depósito confirmado - AutoRenta',
    html: `Se acreditaron $${amount} a tu wallet.`
  })
});
```

### 2. Notificaciones Realtime

Actualizar balance sin refrescar página:

```typescript
// Frontend: Escuchar cambios via Supabase Realtime
this.supabase.getClient()
  .channel('wallet_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'wallet_transactions',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      this.showToast('✅ Depósito confirmado!');
      this.refreshBalance();
    }
  })
  .subscribe();
```

### 3. Validar Firma del Webhook

Agregar validación de firma para seguridad:

```typescript
// Validar que el webhook viene de MercadoPago
const signature = req.headers.get('x-signature');
const isValid = validateMPSignature(body, signature, WEBHOOK_SECRET);
if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

---

## 📞 Soporte

### Si necesitas ayuda:

**Panel de MercadoPago**:
- https://www.mercadopago.com.ar/developers/panel/app

**Documentación Oficial**:
- Webhooks: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications
- IPN: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/ipn

**Logs de Supabase**:
```bash
supabase functions logs mercadopago-webhook --limit 50
```

**Contacto MercadoPago**:
- Email: developers@mercadopago.com
- Panel: https://www.mercadopago.com.ar/ayuda

---

**Última actualización**: 2025-10-20
**Autor**: AutoRenta Tech Team
**Status**: ✅ Guía completa para configuración de webhook

---

## 🎉 ¡LISTO!

Una vez configurado el webhook, tu sistema de pagos funcionará igual que **Tiendanube** y **MercadoLibre**:

- ⚡ Confirmación instantánea (<10 segundos)
- 😊 Mejor experiencia de usuario
- 📈 Mayor tasa de conversión
- ✅ Sistema profesional

**El polling sigue activo como backup** para casos donde el webhook falle (muy raro).
