# 💰 Implementación de Base de Datos - Wallet System

**Fecha**: 2025-10-17
**Rama**: `feature/wallet-system`
**Status**: ✅ Database Layer Completado

---

## 📋 Resumen

Se ha completado exitosamente la **capa de base de datos** del sistema de wallet, implementando:

- ✅ Tabla `wallet_transactions` con índices y RLS
- ✅ 4 funciones RPC para operaciones de wallet
- ✅ 1 función helper para confirmación de depósitos (webhooks)
- ✅ Migración ALTER de tabla `bookings` con campos de wallet
- ✅ 1 función helper para carga de fondos de wallet en bookings
- ✅ Triggers de validación y actualización automática

---

## 🗄️ Componentes Creados

### 1. Tabla `wallet_transactions`

**Archivo**: `apps/web/database/wallet/table_wallet_transactions.sql`

**Campos principales**:
```sql
- id UUID PRIMARY KEY
- user_id UUID REFERENCES profiles(id)
- type TEXT CHECK (IN 'deposit', 'lock', 'unlock', 'charge', 'refund', 'bonus')
- status TEXT CHECK (IN 'pending', 'completed', 'failed', 'refunded')
- amount NUMERIC(10, 2)
- currency TEXT (USD, UYU)
- reference_type TEXT (booking, deposit, reward)
- reference_id UUID
- provider TEXT (mercadopago, stripe, bank_transfer, internal)
- provider_transaction_id TEXT
- provider_metadata JSONB
- created_at, updated_at, completed_at TIMESTAMPTZ
```

**Índices creados** (6 total):
- `idx_wallet_transactions_user_id` - Búsquedas por usuario
- `idx_wallet_transactions_user_status` - Balance queries
- `idx_wallet_transactions_reference` - Búsquedas por booking
- `idx_wallet_transactions_provider` - Búsquedas por proveedor
- `idx_wallet_transactions_created_at` - Ordenamiento por fecha
- `idx_wallet_transactions_pending` - Monitoreo de pendientes

**RLS Policies** (4 total):
- `wallet_transactions_select_own` - Usuarios ven sus transacciones
- `wallet_transactions_insert_own` - Usuarios pueden crear depósitos
- `wallet_transactions_update_system` - Solo sistema puede actualizar
- `wallet_transactions_admin_all` - Admins ven todo

---

### 2. Función RPC: `wallet_get_balance()`

**Archivo**: `apps/web/database/wallet/rpc_wallet_get_balance.sql`

**Descripción**: Obtiene el balance de wallet del usuario autenticado.

**Returns**:
```typescript
{
  available_balance: NUMERIC(10, 2),  // Fondos disponibles
  locked_balance: NUMERIC(10, 2),     // Fondos bloqueados
  total_balance: NUMERIC(10, 2),      // Total (disponible + bloqueado)
  currency: TEXT                       // 'USD'
}
```

**Lógica de cálculo**:
- **Available**: `SUM(deposits + refunds + bonuses - charges)`
- **Locked**: `SUM(locks - unlocks)`
- **Total**: `available + locked`

**Uso desde frontend**:
```typescript
const { data, error } = await supabase.rpc('wallet_get_balance');
// data = { available_balance: 150.00, locked_balance: 50.00, total_balance: 200.00, currency: 'USD' }
```

---

### 3. Función RPC: `wallet_lock_funds()`

**Archivo**: `apps/web/database/wallet/rpc_wallet_lock_funds.sql`

**Descripción**: Bloquea fondos del wallet para una reserva (garantía).

**Parámetros**:
- `p_booking_id UUID` - ID de la reserva
- `p_amount NUMERIC(10, 2)` - Monto a bloquear
- `p_description TEXT` (opcional) - Descripción

**Returns**:
```typescript
{
  transaction_id: UUID | null,
  success: boolean,
  message: string,
  new_available_balance: NUMERIC(10, 2),
  new_locked_balance: NUMERIC(10, 2)
}
```

**Validaciones**:
- ✅ Usuario autenticado
- ✅ Monto > 0
- ✅ booking_id requerido
- ✅ Fondos suficientes en available_balance
- ✅ No haya lock existente para el mismo booking

**Ejemplo de éxito**:
```typescript
const { data } = await supabase.rpc('wallet_lock_funds', {
  p_booking_id: 'a6de0b79-0c9f-4b89-9e15-e2c82f4915e4',
  p_amount: 50.00,
  p_description: 'Garantía para Toyota Corolla'
});
// data = { transaction_id: '123...', success: true, message: 'Fondos bloqueados...', new_available_balance: 100, new_locked_balance: 50 }
```

**Ejemplo de fallo (fondos insuficientes)**:
```typescript
// data = { transaction_id: null, success: false, message: 'Fondos insuficientes. Disponible: $30, Requerido: $50', ... }
```

---

### 4. Función RPC: `wallet_unlock_funds()`

**Archivo**: `apps/web/database/wallet/rpc_wallet_unlock_funds.sql`

**Descripción**: Desbloquea fondos previamente bloqueados (devuelve a available_balance).

**Parámetros**:
- `p_booking_id UUID` - ID de la reserva
- `p_description TEXT` (opcional) - Descripción

**Returns**:
```typescript
{
  transaction_id: UUID | null,
  success: boolean,
  message: string,
  unlocked_amount: NUMERIC(10, 2),
  new_available_balance: NUMERIC(10, 2),
  new_locked_balance: NUMERIC(10, 2)
}
```

**Validaciones**:
- ✅ Usuario autenticado
- ✅ booking_id requerido
- ✅ Existe un lock activo para ese booking
- ✅ No haya unlock ya realizado

**Uso**:
```typescript
const { data } = await supabase.rpc('wallet_unlock_funds', {
  p_booking_id: 'a6de0b79-0c9f-4b89-9e15-e2c82f4915e4',
  p_description: 'Reserva completada exitosamente'
});
// data = { transaction_id: '789...', success: true, unlocked_amount: 50, new_available_balance: 150, new_locked_balance: 0 }
```

---

### 5. Función RPC: `wallet_initiate_deposit()`

**Archivo**: `apps/web/database/wallet/rpc_wallet_initiate_deposit.sql`

**Descripción**: Inicia un proceso de depósito en el wallet (crea transacción pending).

**Parámetros**:
- `p_amount NUMERIC(10, 2)` - Monto a depositar
- `p_provider TEXT` (opcional, default 'mercadopago') - Proveedor de pago
- `p_description TEXT` (opcional) - Descripción

**Returns**:
```typescript
{
  transaction_id: UUID,
  success: boolean,
  message: string,
  payment_provider: TEXT,
  payment_url: TEXT,        // URL para completar el pago
  status: TEXT              // 'pending'
}
```

**Validaciones**:
- ✅ Usuario autenticado
- ✅ Monto > 0
- ✅ Monto >= $10 (depósito mínimo)
- ✅ Monto <= $5,000 (depósito máximo)
- ✅ Proveedor válido (mercadopago, stripe, bank_transfer)

**Uso**:
```typescript
const { data } = await supabase.rpc('wallet_initiate_deposit', {
  p_amount: 100.00,
  p_provider: 'mercadopago',
  p_description: 'Recarga de saldo para alquileres'
});
// data = { transaction_id: '...', success: true, payment_url: 'https://checkout.mercadopago.com/...', status: 'pending' }
```

**Nota**: En producción, la `payment_url` debe generarse llamando a la API real de Mercado Pago/Stripe.

---

### 6. Función Helper: `wallet_confirm_deposit()`

**Archivo**: `apps/web/database/wallet/rpc_wallet_initiate_deposit.sql` (línea 135)

**Descripción**: Confirma un depósito pendiente (llamado por webhook del proveedor).

**Parámetros**:
- `p_transaction_id UUID` - ID de la transacción de depósito
- `p_provider_transaction_id TEXT` - ID de transacción del proveedor
- `p_provider_metadata JSONB` (opcional) - Metadata del proveedor

**Returns**:
```typescript
{
  success: boolean,
  message: string,
  new_available_balance: NUMERIC(10, 2)
}
```

**Security**: Solo accesible por `service_role` (webhook backend).

**Uso (desde webhook backend)**:
```typescript
// Cloudflare Worker o Edge Function
const { data } = await supabaseAdmin.rpc('wallet_confirm_deposit', {
  p_transaction_id: '123e4567-...',
  p_provider_transaction_id: 'MP-12345678',
  p_provider_metadata: {
    payment_method: 'credit_card',
    card_last_4: '1234'
  }
});
```

---

### 7. Migración: Campos de wallet en `bookings`

**Archivo**: `apps/web/database/wallet/alter_bookings_add_wallet_fields.sql`

**Campos agregados**:
```sql
- payment_method TEXT ('credit_card', 'wallet', 'partial_wallet')
- wallet_amount_cents BIGINT (monto pagado con wallet)
- wallet_lock_transaction_id UUID REFERENCES wallet_transactions(id)
- wallet_status TEXT ('none', 'locked', 'charged', 'refunded')
- wallet_charged_at TIMESTAMPTZ
- wallet_refunded_at TIMESTAMPTZ
```

**Índices creados** (3 total):
- `idx_bookings_payment_method`
- `idx_bookings_wallet_status`
- `idx_bookings_wallet_lock_tx`

**Trigger de validación**: `trg_validate_booking_wallet_amounts`
- Valida que `wallet_amount_cents` sea consistente con `payment_method`
- Si `credit_card` → wallet_amount = 0
- Si `wallet` → wallet_amount = total_cents
- Si `partial_wallet` → 0 < wallet_amount < total_cents

**Datos migrados**: 5 bookings existentes actualizados a `payment_method = 'credit_card'`.

---

### 8. Función Helper: `booking_charge_wallet_funds()`

**Archivo**: `apps/web/database/wallet/alter_bookings_add_wallet_fields.sql` (línea 117)

**Descripción**: Carga los fondos bloqueados del wallet a una reserva (convierte lock → charge).

**Parámetros**:
- `p_booking_id UUID` - ID de la reserva
- `p_description TEXT` (opcional) - Descripción

**Returns**:
```typescript
{
  success: boolean,
  message: string
}
```

**Validaciones**:
- ✅ Reserva existe
- ✅ payment_method es 'wallet' o 'partial_wallet'
- ✅ wallet_status es 'locked'

**Uso**:
```typescript
const { data } = await supabase.rpc('booking_charge_wallet_funds', {
  p_booking_id: 'a6de0b79-0c9f-4b89-9e15-e2c82f4915e4',
  p_description: 'Pago confirmado de reserva Toyota Corolla'
});
// data = { success: true, message: 'Fondos cargados exitosamente: $50.00' }
```

**Qué hace**:
1. Crea transacción tipo `charge` en `wallet_transactions`
2. Actualiza `booking.wallet_status = 'charged'`
3. Setea `booking.wallet_charged_at = NOW()`

---

## 📊 Ejecución de Migraciones

Todas las migraciones se ejecutaron exitosamente en Supabase:

```bash
✅ table_wallet_transactions.sql - Tabla creada con 6 índices y 4 policies
✅ rpc_wallet_get_balance.sql - Función creada y disponible
✅ rpc_wallet_lock_funds.sql - Función creada y disponible
✅ rpc_wallet_unlock_funds.sql - Función creada y disponible
✅ rpc_wallet_initiate_deposit.sql - 2 funciones creadas (initiate + confirm)
✅ alter_bookings_add_wallet_fields.sql - 6 campos + 3 índices + 2 funciones
```

**Total de objetos creados**:
- 1 tabla
- 6 funciones RPC/helper
- 9 índices
- 4 RLS policies
- 2 triggers
- 6 columnas nuevas en bookings

---

## 🔐 Seguridad (RLS)

### Tabla `wallet_transactions`

| Policy | Operación | Condición |
|--------|-----------|-----------|
| `wallet_transactions_select_own` | SELECT | `auth.uid() = user_id` |
| `wallet_transactions_insert_own` | INSERT | `auth.uid() = user_id` |
| `wallet_transactions_update_system` | UPDATE | `false` (solo via RPCs) |
| `wallet_transactions_admin_all` | ALL | `role = 'admin'` |

**Implicaciones**:
- ✅ Usuarios solo ven sus propias transacciones
- ✅ Usuarios pueden iniciar depósitos (INSERT)
- ✅ Actualizaciones solo via funciones RPC (previene manipulación manual)
- ✅ Admins tienen acceso completo para soporte

---

## 🧪 Flujos de Prueba

### Flujo 1: Depósito de Fondos

```typescript
// 1. Usuario inicia depósito
const { data: deposit } = await supabase.rpc('wallet_initiate_deposit', {
  p_amount: 100.00,
  p_provider: 'mercadopago'
});
// → Redirigir a deposit.payment_url

// 2. Usuario completa pago en MercadoPago

// 3. Webhook confirma el pago (backend)
const { data: confirm } = await supabaseAdmin.rpc('wallet_confirm_deposit', {
  p_transaction_id: deposit.transaction_id,
  p_provider_transaction_id: 'MP-12345678'
});

// 4. Usuario ve su nuevo balance
const { data: balance } = await supabase.rpc('wallet_get_balance');
// → { available_balance: 100, locked_balance: 0, total_balance: 100 }
```

### Flujo 2: Reserva con Wallet (100%)

```typescript
// 1. Usuario tiene $100 en wallet
const balance = await supabase.rpc('wallet_get_balance');
// → { available_balance: 100, locked_balance: 0 }

// 2. Usuario crea reserva de $50
const booking = await createBooking({
  car_id: '...',
  total_cents: 5000,  // $50
  payment_method: 'wallet',
  wallet_amount_cents: 5000
});

// 3. Sistema bloquea fondos
const { data: lock } = await supabase.rpc('wallet_lock_funds', {
  p_booking_id: booking.id,
  p_amount: 50.00
});
// → { success: true, new_available_balance: 50, new_locked_balance: 50 }

// 4. Al confirmar la reserva, se cargan los fondos
const { data: charge } = await supabase.rpc('booking_charge_wallet_funds', {
  p_booking_id: booking.id
});

// 5. Balance final
const finalBalance = await supabase.rpc('wallet_get_balance');
// → { available_balance: 50, locked_balance: 0 }
```

### Flujo 3: Reserva con Wallet Parcial

```typescript
// 1. Usuario tiene $30 en wallet
// 2. Usuario crea reserva de $50 (30 wallet + 20 tarjeta)
const booking = await createBooking({
  total_cents: 5000,
  payment_method: 'partial_wallet',
  wallet_amount_cents: 3000  // $30
});

// 3. Sistema bloquea los $30 del wallet
const { data: lock } = await supabase.rpc('wallet_lock_funds', {
  p_booking_id: booking.id,
  p_amount: 30.00
});

// 4. Usuario paga $20 restantes con tarjeta (via Stripe/MercadoPago)
// 5. Al confirmar pago de tarjeta, se cargan fondos del wallet
const { data: charge } = await supabase.rpc('booking_charge_wallet_funds', {
  p_booking_id: booking.id
});
```

### Flujo 4: Cancelación con Reembolso

```typescript
// 1. Usuario cancela reserva
const booking = await getBooking(booking_id);

// 2. Si wallet_status es 'locked' o 'charged', desbloquear/refund
if (booking.wallet_status === 'locked') {
  // Fondos aún no cargados, solo desbloquear
  await supabase.rpc('wallet_unlock_funds', {
    p_booking_id: booking.id
  });
} else if (booking.wallet_status === 'charged') {
  // Fondos ya cargados, crear transacción de refund
  await supabase.from('wallet_transactions').insert({
    user_id: booking.renter_id,
    type: 'refund',
    status: 'completed',
    amount: booking.wallet_amount_cents / 100,
    reference_type: 'booking',
    reference_id: booking.id
  });
}
```

---

## 📈 Próximos Pasos

### ⏳ Pendientes en Database Layer

1. **Crear función `wallet_refund_booking()`** - Helper para refunds automáticos
2. **Crear vista materializada `wallet_user_balances`** - Para dashboard de admin
3. **Agregar índice GIN en `provider_metadata`** - Para búsquedas por metadata
4. **Crear trigger para auto-expiry de depósitos pendientes** - Limpiar depósitos >24h pendientes

### 🔄 Siguiente Fase: Frontend Implementation

Ahora que la capa de base de datos está completa, el siguiente paso es implementar la capa de frontend siguiendo el plan vertical:

1. **Angular Service** (`wallet.service.ts`)
   - Wrappers para RPCs de Supabase
   - Signals para balance y transactions
   - Error handling y loading states

2. **UI Components**
   - `WalletDashboardComponent` - Ver balance y transacciones
   - `DepositModalComponent` - Iniciar depósitos
   - `WalletBalanceCardComponent` - Widget de balance

3. **Integración con Booking Flow**
   - Actualizar `booking-request.component` para permitir pago con wallet
   - Agregar selector de método de pago
   - Mostrar balance disponible en tiempo real

4. **Admin Dashboard**
   - Vista de todas las transacciones
   - Filtros por usuario, tipo, estado
   - Estadísticas de uso de wallet

---

## 🎯 Criterios de Éxito

- ✅ **Database Layer**: 100% completado
- ⏳ **Frontend Layer**: Pendiente
- ⏳ **Testing**: Pendiente
- ⏳ **Deployment**: Pendiente

**Progreso total**: 25% (1 de 4 fases completadas)

---

## 📚 Referencias

- **Plan Vertical Completo**: `WALLET_SYSTEM_VERTICAL_PLAN.md`
- **Archivos de Database**:
  - `apps/web/database/wallet/table_wallet_transactions.sql`
  - `apps/web/database/wallet/rpc_wallet_get_balance.sql`
  - `apps/web/database/wallet/rpc_wallet_lock_funds.sql`
  - `apps/web/database/wallet/rpc_wallet_unlock_funds.sql`
  - `apps/web/database/wallet/rpc_wallet_initiate_deposit.sql`
  - `apps/web/database/wallet/alter_bookings_add_wallet_fields.sql`

---

**Generado por**: Claude Code
**Fecha**: 2025-10-17
**Rama**: feature/wallet-system
**Status**: ✅ Database Layer Ready for Frontend
