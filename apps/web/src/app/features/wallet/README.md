# Wallet Feature

Sistema de billetera digital para AutoRenta que permite a usuarios depositar, retirar y usar fondos para alquileres.

## Arquitectura

```
wallet/
├── wallet.page.ts              # Página principal del wallet
├── wallet.routes.ts            # Rutas del módulo
├── components/
│   ├── wallet-balance/         # Display de balance
│   ├── wallet-deposit/         # Flujo de depósito
│   ├── wallet-withdraw/        # Flujo de retiro
│   └── wallet-history/         # Historial de transacciones
└── services/
    └── wallet.service.ts       # Servicio principal
```

## Flujo de Datos

### Depósito (Deposit)

```
Usuario → MercadoPago Brick → Edge Function → wallet_transactions → Balance actualizado
```

1. Usuario ingresa monto en `wallet-deposit`
2. Se muestra MercadoPago Payment Brick
3. Usuario completa pago con tarjeta
4. Edge Function `mercadopago-deposit-payment` procesa
5. Webhook confirma pago exitoso
6. Se crea transacción tipo `deposit` en `wallet_transactions`
7. Balance se actualiza automáticamente

### Retiro (Withdraw)

```
Usuario → Solicitud → Edge Function → Procesamiento manual → wallet_transactions
```

1. Usuario solicita retiro en `wallet-withdraw`
2. Se valida balance suficiente
3. Edge Function `wallet-withdraw` crea solicitud
4. Admin procesa transferencia manualmente
5. Se crea transacción tipo `withdrawal`
6. Balance se actualiza

### Pago con Wallet

```
Booking → wallet_lock_rental_and_deposit → Fondos bloqueados → Confirmación → Liberación
```

1. Usuario selecciona "Pagar con Wallet" en checkout
2. RPC `wallet_lock_rental_and_deposit` bloquea fondos:
   - Rental amount (va al owner al completar)
   - Security deposit (se devuelve al renter)
3. Booking se confirma
4. Al completar: `wallet_complete_booking` libera fondos

## Tipos de Transacción

| Tipo | Descripción | Efecto en Balance |
|------|-------------|-------------------|
| `deposit` | Depósito desde tarjeta | +amount |
| `withdrawal` | Retiro a cuenta bancaria | -amount |
| `lock` | Bloqueo para reserva | -amount (temporal) |
| `unlock` | Liberación de bloqueo | +amount |
| `rental_payment` | Pago de alquiler | -amount |
| `rental_income` | Ingreso por alquiler | +amount |
| `refund` | Reembolso | +amount |
| `credit` | Crédito promocional | +amount |

## Estados de Transacción

```
pending → completed
        → failed
        → cancelled
```

## Cálculo de Balance

El balance se calcula dinámicamente desde `wallet_transactions`:

```sql
SELECT SUM(
  CASE
    WHEN type IN ('deposit', 'credit', 'refund', 'rental_income', 'unlock')
      THEN amount
    WHEN type IN ('withdrawal', 'debit', 'lock', 'rental_payment')
      THEN -amount
    ELSE 0
  END
) as balance
FROM wallet_transactions
WHERE user_id = $1 AND status = 'completed';
```

## Edge Functions

| Function | Propósito | Rate Limit |
|----------|-----------|------------|
| `mercadopago-deposit-payment` | Procesa depósitos | 30/min |
| `wallet-withdraw` | Solicita retiros | 10/min |
| `wallet-get-balance` | Obtiene balance | 60/min |

## Componentes

### WalletBalanceComponent

Muestra balance actual con refresh automático.

```html
<app-wallet-balance
  [showActions]="true"
  (deposit)="openDeposit()"
  (withdraw)="openWithdraw()"
/>
```

### WalletDepositComponent

Flujo de depósito con MercadoPago.

```html
<app-wallet-deposit
  [minAmount]="1000"
  [maxAmount]="100000"
  (success)="onDepositSuccess($event)"
  (error)="onDepositError($event)"
/>
```

### WalletHistoryComponent

Lista paginada de transacciones.

```html
<app-wallet-history
  [limit]="20"
  [filterType]="'all'"
/>
```

## Servicios

### WalletService

```typescript
class WalletService {
  // Obtener balance actual
  getBalance(): Observable<WalletBalance>

  // Obtener historial
  getHistory(options: HistoryOptions): Observable<Transaction[]>

  // Verificar si puede pagar
  canAfford(amount: number): Observable<boolean>

  // Bloquear fondos para reserva
  lockForBooking(bookingId: string, rental: number, deposit: number): Observable<LockResult>
}
```

## Seguridad

1. **Rate Limiting**: Todas las operaciones tienen límites
2. **Fail-Closed**: Si rate limiter falla, se rechaza la operación
3. **Auditoría**: Todas las transacciones se registran en `wallet_audit_log`
4. **RLS**: Usuarios solo ven sus propias transacciones

## Testing

```bash
# Unit tests
npm run test -- --include="**/wallet/**"

# E2E tests
npm run test:e2e:wallet
```

## Troubleshooting

### Balance no se actualiza

1. Verificar webhook recibido en `mp_webhook_logs`
2. Verificar transacción en `wallet_transactions`
3. Ejecutar `admin_wallet_health_check()` para diagnóstico

### Depósito pendiente > 24h

```sql
SELECT * FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';
```

### Balance negativo (error crítico)

```sql
-- Detectar usuarios con balance negativo
SELECT * FROM admin_wallet_health_check();

-- Ver detalle
SELECT user_id, SUM(...) FROM wallet_transactions
GROUP BY user_id
HAVING SUM(...) < 0;
```

## Referencias

- [RPC Functions Reference](../../../../../docs/RPC_FUNCTIONS_REFERENCE.md)
- [Troubleshooting Guide](../../../../../docs/engineering/TROUBLESHOOTING.md)
- [Data Retention Policy](../../../../../docs/DATA_RETENTION_POLICY.md)
