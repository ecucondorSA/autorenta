# 🚀 Deployment Guide - Withdrawal Edge Functions

## Funciones Creadas

1. **`process-withdrawal`** - Procesa retiros aprobados usando MercadoPago Money Out
2. **`withdrawal-webhook`** - Recibe notificaciones IPN de MercadoPago

---

## 📋 Prerequisitos

### 1. Obtener Access Token de MercadoPago

1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Crear una aplicación
3. Ir a "Credenciales"
4. Copiar el **Access Token de Producción**

### 2. Verificar que tengas Supabase CLI instalado

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# O usar con npx
npx supabase --version
```

---

## 🔐 Configurar Secrets en Supabase

Necesitas configurar el Access Token de MercadoPago como secret:

```bash
# 1. Login a Supabase
npx supabase login

# 2. Link al proyecto
npx supabase link --project-ref obxvffplochgeiclibng

# 3. Configurar el secret de MercadoPago
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-XXXXXXXX-XXXXXXXX"
```

**IMPORTANTE**: Reemplaza `APP_USR-XXXXXXXX-XXXXXXXX` con tu Access Token real de MercadoPago.

### Variables de entorno disponibles automáticamente:

- `SUPABASE_URL` - Configurada automáticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Configurada automáticamente
- `MERCADOPAGO_ACCESS_TOKEN` - Debes configurarla (paso anterior)

---

## 📦 Deploy de las Edge Functions

### Opción 1: Deploy de ambas funciones

```bash
# Desde el directorio raíz del proyecto
cd /home/edu/autorenta/apps/web

# Deploy de process-withdrawal
npx supabase functions deploy process-withdrawal

# Deploy de withdrawal-webhook
npx supabase functions deploy withdrawal-webhook
```

### Opción 2: Deploy individual

```bash
# Solo process-withdrawal
npx supabase functions deploy process-withdrawal

# Solo withdrawal-webhook
npx supabase functions deploy withdrawal-webhook
```

---

## 🔗 URLs de las Funciones

Después del deploy, las funciones estarán disponibles en:

```
process-withdrawal:
https://obxvffplochgeiclibng.supabase.co/functions/v1/process-withdrawal

withdrawal-webhook:
https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
```

---

## ⚙️ Configurar Webhook en MercadoPago

1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar nueva URL:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
   ```
5. Seleccionar eventos:
   - ✅ `money_requests` (transferencias de dinero)

---

## 🧪 Testing

### Test 1: Process Withdrawal (Manual)

Crear un retiro de prueba y procesarlo manualmente:

```bash
# 1. Aprobar un retiro en la base de datos
# (Usar el ID de un retiro que esté en estado 'pending')

curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/process-withdrawal \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"withdrawal_request_id": "UUID_DEL_RETIRO"}'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Withdrawal processed successfully",
  "mercadopago_id": "123456789",
  "amount": 985.00
}
```

### Test 2: Webhook (Simular notificación)

```bash
curl -X POST \
  'https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook?topic=money_request&id=123456789'
```

---

## 🔄 Flujo Completo

### 1. Usuario solicita retiro
- Frontend llama a `wallet_request_withdrawal()`
- Se crea registro en `withdrawal_requests` con status `pending`

### 2. Admin aprueba (opcional)
- Admin llama a `wallet_approve_withdrawal()`
- Status cambia a `approved`

### 3. Procesamiento automático
```typescript
// Opción A: Llamar desde Angular después de aprobar
await fetch('https://obxvffplochgeiclibng.supabase.co/functions/v1/process-withdrawal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({ withdrawal_request_id: 'uuid' }),
});
```

```sql
-- Opción B: Trigger en la base de datos (cuando status = 'approved')
CREATE OR REPLACE FUNCTION trigger_process_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/process-withdrawal',
      body := json_build_object('withdrawal_request_id', NEW.id)::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_process_withdrawal
AFTER UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_process_withdrawal();
```

### 4. MercadoPago procesa
- Edge function llama a MP Money Out API
- MP crea la transferencia
- Status cambia a `processing`

### 5. Webhook confirma
- MP envía IPN a `withdrawal-webhook`
- Webhook actualiza status a `completed` o `failed`
- Si completed: `wallet_complete_withdrawal()` debita el wallet

---

## 📊 Monitoreo

### Ver logs de las funciones

```bash
# Logs de process-withdrawal
npx supabase functions logs process-withdrawal

# Logs de withdrawal-webhook
npx supabase functions logs withdrawal-webhook

# Seguir logs en tiempo real
npx supabase functions logs process-withdrawal --tail
```

### Verificar en base de datos

```sql
-- Ver retiros recientes
SELECT
  id,
  amount,
  fee_amount,
  net_amount,
  status,
  provider_transaction_id,
  created_at,
  approved_at,
  completed_at
FROM withdrawal_requests
ORDER BY created_at DESC
LIMIT 10;

-- Ver transacciones de wallet
SELECT
  id,
  type,
  amount,
  status,
  description,
  created_at
FROM wallet_transactions
WHERE type = 'withdrawal'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Troubleshooting

### Error: "MERCADOPAGO_ACCESS_TOKEN is not defined"

**Solución**: Configurar el secret:
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TU_TOKEN_AQUI"
```

### Error: "Withdrawal request not found or not approved"

**Causa**: El retiro no está en estado `approved`

**Solución**: Aprobar primero:
```sql
UPDATE withdrawal_requests
SET status = 'approved', approved_at = NOW()
WHERE id = 'UUID_DEL_RETIRO';
```

### Error: MercadoPago rechaza la transferencia

**Posibles causas**:
1. CBU/CVU/Alias inválido
2. Datos del titular no coinciden
3. Cuenta bancaria bloqueada
4. Saldo insuficiente en cuenta MP

**Ver logs**:
```bash
npx supabase functions logs process-withdrawal
```

### Webhook no se ejecuta

**Verificar**:
1. URL configurada correctamente en MP
2. Función deployada
3. Eventos seleccionados (`money_requests`)

---

## 🔒 Seguridad

### Headers de seguridad

Las funciones ya incluyen:
- ✅ CORS configurado
- ✅ Validación de datos
- ✅ Manejo de errores
- ✅ Logging extensivo
- ✅ Idempotencia (X-Idempotency-Key)

### RLS Policies

Las tablas ya tienen RLS configurado:
- ✅ `withdrawal_requests` - Solo usuarios ven sus propios retiros
- ✅ `bank_accounts` - Solo usuarios ven sus propias cuentas
- ✅ `user_wallets` - Solo usuarios ven su propio balance

---

## 📝 Checklist de Deployment

- [ ] Obtener Access Token de MercadoPago
- [ ] Configurar secret en Supabase
- [ ] Deploy `process-withdrawal` function
- [ ] Deploy `withdrawal-webhook` function
- [ ] Configurar webhook URL en MercadoPago
- [ ] Probar con retiro de prueba
- [ ] Verificar logs
- [ ] Monitorear primeras transacciones

---

## 🎯 Próximos Pasos

1. **Auto-aprobación** (opcional):
   - Crear trigger para aprobar automáticamente
   - O crear panel de admin en Angular

2. **Notificaciones**:
   - Email cuando retiro es completado
   - Email cuando retiro falla

3. **Límites y validaciones**:
   - Límite diario de retiros
   - Verificación de identidad
   - Validación de cuenta bancaria

---

## 📚 Documentación Adicional

- [MercadoPago Money Out Docs](https://www.mercadopago.com.ar/developers/es/docs/money-out)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Database RPC Functions](/database/create-withdrawal-system.sql)

---

## ✅ Estado del Sistema

Después del deployment:

- ✅ Base de datos configurada
- ✅ RPC functions deployadas
- ✅ Edge functions creadas
- 🔄 **Falta**: Deploy de edge functions
- 🔄 **Falta**: Configurar webhook en MP
- 🔄 **Falta**: Testing en producción
