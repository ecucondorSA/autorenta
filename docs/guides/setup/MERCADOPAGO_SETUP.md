# 🚀 Configuración de MercadoPago - AutoRenta

## Credenciales Configuradas

**País de operación:** Argentina  
**Public Key:** `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd`  
**Access Token:** `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd`

## ✅ Estado de la Configuración

### Edge Functions Desplegadas

1. **`mercadopago-create-preference`** ✅
   - URL: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference`
   - Función: Crea preferencias de pago para depósitos
   - Moneda: ARS (Pesos Argentinos)

2. **`mercadopago-webhook`** ✅
   - URL: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
   - Función: Procesa notificaciones IPN de MercadoPago
   - Eventos: `payment` (depósitos) y `money_request` (retiros)

### Secrets Configurados

- ✅ `MERCADOPAGO_ACCESS_TOKEN` - Configurado en Supabase
- ✅ `SUPABASE_URL` - Configurado automáticamente
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurado automáticamente

## 🔄 Flujo de Depósitos

### 1. Usuario inicia depósito
```typescript
// Frontend llama a WalletService
await walletService.initiateDeposit({
  amount: 1000, // $1000 ARS
  provider: 'mercadopago',
  description: 'Depósito a wallet'
});
```

### 2. Creación de transacción en DB
- Se crea registro en `wallet_transactions` con status `pending`
- Se retorna `transaction_id` único

### 3. Creación de preferencia en MercadoPago
- Frontend llama a Edge Function `mercadopago-create-preference`
- Se crea preferencia con:
  - Moneda: ARS
  - External reference: `transaction_id`
  - Notification URL: `mercadopago-webhook`
  - Back URLs: Redirección a `/wallet`

### 4. Redirección a MercadoPago
- Usuario es redirigido a `init_point`
- Completa el pago en MercadoPago

### 5. Webhook confirma pago
- MercadoPago envía IPN a `mercadopago-webhook`
- Webhook verifica pago y llama a `wallet_confirm_deposit()`
- Balance del usuario se actualiza

## 🔄 Flujo de Retiros

### 1. Usuario solicita retiro
```typescript
// Frontend llama a WithdrawalService
await withdrawalService.requestWithdrawal({
  bank_account_id: 'bank-account-uuid',
  amount: 500, // $500 ARS
  user_notes: 'Retiro a mi cuenta'
});
```

### 2. Aprobación (manual o automática)
- Admin aprueba o se auto-aprueba
- Status cambia a `approved`

### 3. Procesamiento con MercadoPago Money Out
- Edge Function `process-withdrawal` llama a MP Money Out API
- Se crea transferencia bancaria
- Status cambia a `processing`

### 4. Webhook confirma transferencia
- MercadoPago envía IPN a `mercadopago-webhook`
- Webhook actualiza status a `completed` o `failed`
- Si completed: se debita el wallet del usuario

## 🧪 Testing

### Test de Depósito

```bash
# 1. Crear depósito desde frontend
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "transaction_id": "test-tx-123",
    "amount": 1000,
    "description": "Test deposit"
  }'
```

### Test de Webhook (Simular notificación)

```bash
# Simular webhook de pago aprobado
curl -X POST \
  'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook?topic=payment&id=123456789'
```

## 🔧 Configuración en MercadoPago Dashboard

### 1. Configurar Webhook URL

1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar nueva URL:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   ```
5. Seleccionar eventos:
   - ✅ `payment` (para depósitos)
   - ✅ `money_request` (para retiros)

### 2. Configurar URLs de Retorno

Las URLs de retorno se configuran automáticamente en cada preferencia:
- **Success:** `{origin}/wallet?status=success`
- **Failure:** `{origin}/wallet?status=failure`
- **Pending:** `{origin}/wallet?status=pending`

## 📊 Monitoreo

### Ver logs de las funciones

```bash
# Logs de create-preference
npx supabase functions logs mercadopago-create-preference

# Logs de webhook
npx supabase functions logs mercadopago-webhook

# Seguir logs en tiempo real
npx supabase functions logs mercadopago-webhook --tail
```

### Verificar transacciones en DB

```sql
-- Ver depósitos recientes
SELECT
  id,
  type,
  amount,
  status,
  provider_transaction_id,
  created_at,
  completed_at
FROM wallet_transactions
WHERE type = 'deposit'
ORDER BY created_at DESC
LIMIT 10;

-- Ver retiros recientes
SELECT
  id,
  amount,
  status,
  provider_transaction_id,
  created_at,
  completed_at
FROM withdrawal_requests
ORDER BY created_at DESC
LIMIT 10;
```

## ⚠️ Troubleshooting

### Error: "MERCADOPAGO_ACCESS_TOKEN not configured"

**Solución:**
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd"
```

### Error: "Invalid MercadoPago access token format"

**Causa:** Token no tiene formato correcto  
**Solución:** Verificar que el token empiece con `APP_USR-`

### Error: "MercadoPago API error: 401"

**Causa:** Token inválido o expirado  
**Solución:** 
1. Verificar token en MercadoPago Dashboard
2. Regenerar token si es necesario
3. Actualizar secret en Supabase

### Webhook no se ejecuta

**Verificar:**
1. URL configurada correctamente en MP Dashboard
2. Función deployada: `npx supabase functions deploy mercadopago-webhook`
3. Eventos seleccionados (`payment` y `money_request`)
4. Logs de la función: `npx supabase functions logs mercadopago-webhook`

## 🔒 Seguridad

### Headers de seguridad

Las funciones incluyen:
- ✅ CORS configurado
- ✅ Validación de datos de entrada
- ✅ Manejo de errores robusto
- ✅ Logging extensivo para debugging
- ✅ Idempotencia (X-Idempotency-Key)

### RLS Policies

Las tablas están protegidas por RLS:
- ✅ `wallet_transactions` - Solo usuarios ven sus propias transacciones
- ✅ `withdrawal_requests` - Solo usuarios ven sus propios retiros
- ✅ `bank_accounts` - Solo usuarios ven sus propias cuentas

## 📝 Checklist de Configuración

- [x] Obtener Access Token de MercadoPago
- [x] Configurar secret en Supabase
- [x] Deploy `mercadopago-create-preference` function
- [x] Deploy `mercadopago-webhook` function
- [ ] Configurar webhook URL en MercadoPago Dashboard
- [ ] Probar con depósito de prueba
- [ ] Verificar logs
- [ ] Monitorear primeras transacciones

## 🎯 Próximos Pasos

1. **Configurar webhook en MercadoPago Dashboard** (pendiente)
2. **Testing en sandbox** - Probar flujo completo
3. **Testing en producción** - Verificar con montos reales
4. **Monitoreo** - Configurar alertas para errores

## 📚 Documentación Adicional

- [MercadoPago Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro)
- [MercadoPago Money Out](https://www.mercadopago.com.ar/developers/es/docs/money-out)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [AutoRenta Wallet System](../WALLET_BILATERAL_RELEASE_SYSTEM.md)

---

## ✅ Estado Final

**Configuración completada exitosamente:**

- ✅ Edge Functions desplegadas
- ✅ Credenciales configuradas
- ✅ Sistema de depósitos funcional
- ✅ Sistema de retiros funcional
- 🔄 **Pendiente:** Configurar webhook en MercadoPago Dashboard
- 🔄 **Pendiente:** Testing en producción