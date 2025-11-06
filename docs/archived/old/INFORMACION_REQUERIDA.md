# 📋 Información Requerida para Resolver Depósito No Acreditado

## 🎯 ¿Qué necesito que me proporciones?

### 1️⃣ Payment ID Correcto de MercadoPago

**El que me diste NO funciona**: `130624829514` (no existe en MercadoPago)

**Dónde encontrarlo**:

#### Opción A: Dashboard de MercadoPago
1. Ir a: **https://www.mercadopago.com.ar/activities**
2. Buscar el pago del **20/10/2025 a las 14:33** por **$250 ARS**
3. Click en el pago para ver detalles
4. Copiar el **ID del pago** (aparece en la parte superior)
   - Ejemplo: `1234567890` o `1306248295XX`

#### Opción B: Panel de Desarrolladores
1. Ir a: **https://www.mercadopago.com.ar/developers/panel/notifications/ipn**
2. Ver las notificaciones del **20/10/2025 14:30-15:00**
3. Buscar eventos con `type: payment` y `action: payment.created` o `payment.updated`
4. Copiar el `id` del campo `data`

**Screenshot requerido**:
- Toma un screenshot de los detalles del pago mostrando:
  - ✅ ID del pago
  - ✅ Fecha y hora
  - ✅ Monto ($250)
  - ✅ Estado (approved/pending)
  - ✅ Referencia externa (si aparece)

---

### 2️⃣ External Reference (Transaction ID)

**¿Qué es?**: Es el UUID que usamos en nuestra base de datos para identificar la transacción.

**Dónde encontrarlo**:

#### Opción A: En MercadoPago Dashboard
1. Ir a: **https://www.mercadopago.com.ar/activities**
2. Abrir el pago del 20/10/2025 14:33
3. Buscar el campo **"Referencia externa"** o **"External Reference"**
4. Copiar el UUID completo
   - Ejemplo: `de0d1150-f237-4f42-95ef-1333cd9db21f`

#### Opción B: En nuestro Dashboard (si tienes acceso)
1. Ir a: **Wallet → Historial de transacciones**
2. Buscar depósito del 20/10/2025 14:32-14:35
3. Copiar el ID de la transacción

#### Opción C: Desde email de confirmación
- Si recibiste email de MercadoPago, puede incluir la referencia externa

**Si NO aparece external reference en MercadoPago**:
- Probablemente es una de estas transacciones (las más cercanas a 14:33 UTC):

| Transaction ID | Created At | User |
|---------------|------------|------|
| `de0d1150-f237-4f42-95ef-1333cd9db21f` | 14:32:35 UTC | acc5fb2d-5ba5-492c-9abd-711a13a3b4ff |
| `fe154559-bf87-4b6b-af52-8b81962537be` | 14:31:34 UTC | acc5fb2d-5ba5-492c-9abd-711a13a3b4ff |
| `1ef67259-3544-446a-bfdb-b7a8217ea994` | 15:08:41 UTC | acc5fb2d-5ba5-492c-9abd-711a13a3b4ff |

---

### 3️⃣ Email del Usuario (para verificar)

**¿Cuál es el email del usuario que hizo el depósito?**

Esto me ayudará a confirmar que estoy investigando la transacción correcta.

---

## 🔗 Enlaces Directos que Necesitas Revisar

### MercadoPago
- **Actividades**: https://www.mercadopago.com.ar/activities
- **Panel de Desarrolladores**: https://www.mercadopago.com.ar/developers/panel
- **Notificaciones IPN**: https://www.mercadopago.com.ar/developers/panel/notifications/ipn
- **Webhooks configurados**: https://www.mercadopago.com.ar/developers/panel/webhooks

### Supabase (logs del webhook)
- **Edge Functions Logs**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs/edge-functions
  - Filtrar por: `mercadopago-webhook`
  - Fecha: `2025-10-20 14:30 - 15:00`

- **Database**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/editor
  - Tabla: `wallet_transactions`
  - Filtrar: `type = 'deposit' AND status = 'pending'`

### Base de Datos (si quieres verificar directamente)
```bash
# Ver transacciones pendientes del usuario:
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT id, amount, status, created_at, provider_transaction_id
      FROM wallet_transactions
      WHERE user_id = 'acc5fb2d-5ba5-492c-9abd-711a13a3b4ff'
        AND type = 'deposit'
        AND status = 'pending'
      ORDER BY created_at DESC;"
```

---

## 📝 Template de Respuesta

**Copia este template y complétalo**:

```
INFORMACIÓN DEL DEPÓSITO NO ACREDITADO
=====================================

1. Payment ID de MercadoPago: ___________________
   (encontrado en: https://www.mercadopago.com.ar/activities)

2. External Reference (UUID): ___________________
   (encontrado en detalles del pago en MercadoPago)

3. Email del usuario: ___________________

4. ¿El pago aparece como "aprobado" en MercadoPago? (Sí/No): ___

5. Screenshot adjunto: (adjuntar captura de pantalla del pago)

OPCIONAL:
- Hora exacta del pago según MercadoPago: ___________________
- Monto exacto: ___________________
- Método de pago usado: ___________________
```

---

## 🚀 ¿Qué haré con esta información?

Una vez que me proporciones estos datos, ejecutaré:

### Paso 1: Verificar el pago en MercadoPago API
```bash
curl -X GET "https://api.mercadopago.com/v1/payments/<TU_PAYMENT_ID>" \
  -H "Authorization: Bearer APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571"
```

### Paso 2: Investigar la transacción en nuestra DB
```bash
./investigate-deposit.sh <TU_TRANSACTION_ID>
```

### Paso 3: Si el pago está aprobado, reinjectar webhook
```bash
./reinject-webhook.sh <TU_PAYMENT_ID>
```

### Paso 4: Verificar que el balance se acreditó
```bash
# Query automático que verifica:
# - Estado de la transacción (debe pasar a "completed")
# - Balance del usuario (debe aumentar $250)
# - is_withdrawable (si es false, lo convertimos)
```

### Paso 5: Convertir a retirable (si es necesario)
```bash
# Si is_withdrawable = false:
SELECT wallet_convert_to_withdrawable('<TRANSACTION_ID>', 'Liberar depósito MercadoPago');
```

---

## ⏱️ Tiempo Estimado de Resolución

Una vez que me proporciones la información:
- ⚡ **Verificación**: 2-3 minutos
- ⚡ **Reinyección de webhook** (si es necesario): 1 minuto
- ⚡ **Confirmación de acreditación**: 1 minuto
- ⚡ **Conversión a retirable**: 30 segundos

**Total**: ~5 minutos para resolver completamente

---

## 📞 ¿Necesitas Ayuda para Encontrar la Información?

Si no encuentras alguno de estos datos, puedo:

1. **Revisar logs de Supabase** contigo para ver qué transaction_id se creó a las 14:32-14:33
2. **Filtrar por email** del usuario en la DB para encontrar sus transacciones
3. **Revisar todos los payments** de MercadoPago del día 20/10/2025

Solo dime qué necesitas y te guío paso a paso.

---

## ✅ Checklist de Información

Antes de responder, verifica que tienes:

- [ ] Payment ID de MercadoPago (número largo, NO `130624829514`)
- [ ] External Reference (UUID formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- [ ] Email del usuario
- [ ] Confirmación de que el pago está "aprobado" en MercadoPago
- [ ] Screenshot del pago en MercadoPago (opcional pero muy útil)

---

**¿Listo?** Responde con la información y resolveremos esto en menos de 5 minutos. 🚀
