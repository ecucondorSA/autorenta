# 💰 Guía de Configuración del Sistema Wallet

## ✅ Estado Actual (Completado)

### P0 - Tareas Automatizadas ✅

- [x] **Base de datos**: Tabla `wallet_transactions` creada con 16 columnas, 7 índices, 4 políticas RLS
- [x] **RPC Functions**:
  - `wallet_get_balance()` - Obtener saldo del usuario
  - `wallet_initiate_deposit()` - Iniciar depósito
  - `wallet_confirm_deposit()` - Confirmar depósito (webhook)
  - `wallet_lock_funds()` - Bloquear fondos para reservas
  - `wallet_unlock_funds()` - Liberar fondos bloqueados
  - `booking_charge_wallet_funds()` - Cobrar fondos de una reserva
- [x] **Bookings**: Campos de wallet agregados (payment_method, wallet_amount_cents, wallet_status, etc.)
- [x] **Frontend**: Componentes implementados (WalletPage, BalanceCard, DepositModal, TransactionHistory)
- [x] **Routing**: Ruta `/wallet` configurada con AuthGuard
- [x] **Navegación**: Links agregados en header y sidebar móvil
- [x] **Dev Server**: Corriendo en `http://localhost:4200` con wallet compilado

### Lo que YA funciona:

- ✅ Acceder a `/wallet` (requiere login)
- ✅ Ver balance ($0 inicialmente)
- ✅ Ver historial de transacciones (vacío)
- ✅ Abrir modal de depósito
- ✅ Validación de montos ($10 - $5,000)

### Lo que AÚN NO funciona:

- ❌ Procesar pagos con MercadoPago (faltan credenciales)
- ❌ Recibir confirmaciones de pago (Edge Functions no desplegadas)

---

## 🔧 Tareas Manuales Pendientes

### 1️⃣ Obtener Credenciales de MercadoPago

#### Paso 1: Crear Cuenta de Desarrollador

1. Ir a: https://www.mercadopago.com.ar/developers/panel
2. Iniciar sesión o crear cuenta
3. Crear una nueva aplicación:
   - Nombre: **"AutoRenta Wallet"**
   - Tipo: **Payments**

#### Paso 2: Obtener Access Token

**Para Testing:**
```
Panel → Credenciales de prueba → Access Token
Formato: TEST-1234567890123456-123456-abcdef1234567890abcdef1234567890-123456789
```

**Para Producción:**
```
Panel → Credenciales de producción → Access Token
Formato: APP-1234567890123456-123456-abcdef1234567890abcdef1234567890-123456789
```

⚠️ **IMPORTANTE**: Nunca commitear estos tokens en Git

---

### 2️⃣ Configurar Secrets en Supabase

```bash
# Navegar al proyecto
cd /home/edu/autorenta

# Login en Supabase CLI (si es necesario)
npx supabase login

# Link al proyecto remoto (si es necesario)
npx supabase link --project-ref obxvffplochgeiclibng

# Configurar secrets
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TEST-tu-token-aqui"
npx supabase secrets set APP_BASE_URL="http://localhost:4200"

# Para producción, cambiar a:
# npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP-tu-token-aqui"
# npx supabase secrets set APP_BASE_URL="https://autorenta.vercel.app"
```

**Verificar secrets configurados:**
```bash
npx supabase secrets list
```

---

### 3️⃣ Desplegar Edge Functions

```bash
cd /home/edu/autorenta

# Deploy de la función de crear preferencia de pago
npx supabase functions deploy mercadopago-create-preference --no-verify-jwt

# Deploy de la función de webhook
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
```

**Verificar despliegue:**
```bash
npx supabase functions list
```

**URLs esperadas:**
- Create Preference: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference`
- Webhook: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`

---

### 4️⃣ Configurar Webhook en MercadoPago

#### Paso 1: Acceder al Panel de Webhooks

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app/{TU_APP_ID}/webhooks
2. Click en **"Configurar notificaciones"**

#### Paso 2: Configurar URL del Webhook

**Para Testing:**
```
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
Eventos: payment.created, payment.updated
Versión API: v1
```

**Para Producción:**
```
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
Eventos: payment.created, payment.updated
Versión API: v1
```

#### Paso 3: Verificar Webhook

MercadoPago enviará un evento de prueba. Verificar en:
```bash
npx supabase functions logs mercadopago-webhook
```

---

## 🧪 Testing del Sistema Completo

### Test 1: Flujo de Depósito Completo

1. **Iniciar sesión** en la aplicación
2. **Navegar** a `/wallet`
3. **Click** en "Depositar Fondos"
4. **Ingresar** monto: $100
5. **Click** en "Continuar con MercadoPago"
6. **Completar** el pago en MercadoPago (usar tarjeta de prueba)
7. **Regresar** a `/wallet`
8. **Verificar** que el balance se actualizó a $100

### Test 2: Verificar Transacción en Base de Datos

```bash
PGPASSWORD='ECUCONDOR08122023' psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT id, type, status, amount, currency, provider FROM wallet_transactions ORDER BY created_at DESC LIMIT 5;"
```

**Resultado esperado:**
```
                  id                  |  type   |  status   | amount | currency |   provider
--------------------------------------+---------+-----------+--------+----------+--------------
 abc123...                           | deposit | completed | 100.00 | USD      | mercadopago
```

### Test 3: Verificar Balance

```bash
PGPASSWORD='ECUCONDOR08122023' psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT * FROM wallet_get_balance();"
```

**Resultado esperado:**
```
 available_balance | locked_balance | total_balance | currency
-------------------+----------------+---------------+----------
            100.00 |           0.00 |        100.00 | USD
```

---

## 🔒 Tarjetas de Prueba de MercadoPago

### Aprobadas

| Tarjeta          | Número           | CVV | Fecha |
|------------------|------------------|-----|-------|
| Visa             | 4509 9535 6623 3704 | 123 | 11/25 |
| Mastercard       | 5031 7557 3453 0604 | 123 | 11/25 |

### Rechazadas

| Tarjeta          | Número           | CVV | Fecha | Motivo |
|------------------|------------------|-----|-------|--------|
| Visa             | 4509 9535 6623 3704 | 123 | 11/25 | Fondos insuficientes |
| Mastercard       | 5031 4332 1540 6351 | 123 | 11/25 | Rechazada |

**Más información:** https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing

---

## ⚠️ Problemas Conocidos (P1/P2)

### P1: Validación de Firma del Webhook (CRÍTICO PARA PRODUCCIÓN)

**Estado:** ❌ No implementado

**Riesgo:** Un atacante podría enviar webhooks falsos y acreditar fondos sin pago real

**Solución requerida:** Implementar validación HMAC-SHA256

**Archivo:** `/home/edu/autorenta/supabase/functions/mercadopago-webhook/index.ts`

**Código a agregar (antes de línea 105):**

```typescript
import { createHmac } from 'node:crypto';

function validateMercadoPagoSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  mercadoPagoSecret: string
): boolean {
  if (!xSignature || !xRequestId) {
    return false;
  }

  const parts = xSignature.split(',');
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!ts || !hash) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac('sha256', mercadoPagoSecret)
    .update(manifest)
    .digest('hex');

  return hash === expectedHash;
}

// Usar en el handler:
const isValidSignature = validateMercadoPagoSignature(
  req.headers.get('x-signature'),
  req.headers.get('x-request-id'),
  paymentId,
  Deno.env.get('MERCADOPAGO_SECRET') || ''
);

if (!isValidSignature) {
  return new Response('Invalid signature', { status: 401 });
}
```

**Referencia:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#editor_3

---

### P2: Limpieza de Transacciones Huérfanas

**Problema:** Si un usuario inicia un depósito pero nunca paga, la transacción queda en `pending` indefinidamente.

**Solución A: Cron Job en PostgreSQL**

```sql
-- Ejecutar cada día a las 2 AM
SELECT cron.schedule(
  'cleanup-pending-wallet-transactions',
  '0 2 * * *',
  $$
  UPDATE wallet_transactions
  SET status = 'failed'
  WHERE status = 'pending'
    AND type = 'deposit'
    AND created_at < NOW() - INTERVAL '24 hours';
  $$
);
```

**Solución B: Botón "Reintentar" en UI**

Agregar en `transaction-history.component.html`:

```html
<button
  *ngIf="transaction.status === 'pending' && transaction.type === 'deposit'"
  (click)="retryDeposit(transaction.id)"
  class="text-sm text-blue-600 hover:underline"
>
  Reintentar pago
</button>
```

---

## 📋 Checklist de Producción

Antes de lanzar a producción, verificar:

- [ ] Credenciales de producción de MercadoPago configuradas
- [ ] Edge Functions desplegadas en producción
- [ ] Webhook configurado en MercadoPago
- [ ] Validación de firma implementada en webhook
- [ ] APP_BASE_URL apunta a dominio de producción
- [ ] Testeado flujo completo con tarjeta de prueba
- [ ] Transacciones pendientes monitoreadas
- [ ] RLS policies verificadas
- [ ] Logs de Edge Functions monitoreados
- [ ] Plan de rollback documentado

---

## 🆘 Troubleshooting

### Error: "Failed to fetch" al depositar

**Causa:** Edge Function no desplegada o credenciales faltantes

**Solución:**
1. Verificar que las funciones estén desplegadas: `npx supabase functions list`
2. Verificar secrets: `npx supabase secrets list`
3. Ver logs: `npx supabase functions logs mercadopago-create-preference`

### Error: Balance no se actualiza después del pago

**Causa:** Webhook no configurado o no procesando correctamente

**Solución:**
1. Verificar que el webhook esté activo en MercadoPago panel
2. Ver logs del webhook: `npx supabase functions logs mercadopago-webhook`
3. Verificar transacciones en DB:
   ```sql
   SELECT * FROM wallet_transactions WHERE status = 'pending' ORDER BY created_at DESC;
   ```

### Error: "Insufficient funds" al hacer booking

**Causa:** El usuario no tiene suficiente saldo disponible

**Solución:**
1. Verificar balance: `SELECT * FROM wallet_get_balance();`
2. Verificar que los fondos no estén bloqueados (locked_balance)
3. Pedir al usuario que deposite más fondos

---

## 📚 Referencias

- **MercadoPago Docs:** https://www.mercadopago.com.ar/developers/es/docs
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Audit Document:** `/home/edu/autorenta/WALLET_VERTICAL_AUDIT.md`

---

## 🎯 Próximos Pasos Recomendados

1. **Integrar Wallet con Checkout:**
   - Modificar `checkout.page.ts` para agregar opción "Pagar con Wallet"
   - Actualizar `request_booking` RPC para soportar `payment_method: 'wallet'`
   - Implementar lógica de pago parcial (wallet + tarjeta)

2. **Dashboard de Admin:**
   - Vista de todas las transacciones
   - Exportación a CSV
   - Estadísticas de depósitos/retiros

3. **Notificaciones:**
   - Email cuando el depósito se confirma
   - Push notification para transacciones importantes
   - Recordatorio si el depósito está pending > 1 hora

---

**Última actualización:** 2025-10-17
**Estado del sistema:** ✅ Configuración base completa, pendiente configuración de MercadoPago
