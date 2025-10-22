# 🛡️ Sistema de Garantías (Security Deposits) - AutoRenta

## 📋 Overview

Sistema completo de manejo de garantías (depósitos de seguridad) integrado con el wallet ledger para alquileres de autos.

**Características**:
- ✅ Bloqueo de fondos sin salir del wallet
- ✅ Liberación automática al finalizar sin daños
- ✅ Deducción parcial o total por daños
- ✅ Trazabilidad completa en ledger
- ✅ Estados claros de garantía en booking

---

## 🔄 Flujo Completo de Garantías

### Fase 1: Al Confirmar Booking

```typescript
// Usuario confirma booking
await bookingsService.lockSecurityDeposit(
  bookingId,
  50000, // ARS 500.00 de garantía
  'Garantía por alquiler de Chevrolet Onix'
);
```

**¿Qué sucede?**
1. Verifica que el usuario tenga saldo disponible suficiente
2. Bloquea los fondos en `user_wallets.locked_balance`
3. Los fondos permanecen en el wallet pero no pueden usarse
4. Registra transacción `lock` en `wallet_transactions`
5. Actualiza `booking.wallet_status = 'locked'`
6. Guarda `booking.wallet_lock_transaction_id`

**Saldo del usuario**:
- Antes: `available_balance: 100000` (ARS 1000)
- Después: `available_balance: 50000, locked_balance: 50000` (ARS 500 disponible + ARS 500 bloqueado)

---

### Fase 2A: Finalizar sin Daños (Caso Feliz)

```typescript
// Al devolver el auto sin daños
await bookingsService.releaseSecurityDeposit(
  bookingId,
  'Auto devuelto en perfectas condiciones'
);
```

**¿Qué sucede?**
1. Desbloquea los fondos de `locked_balance`
2. Devuelve fondos a `available_balance`
3. Registra transacción `unlock` en `wallet_transactions`
4. Actualiza `booking.wallet_status = 'refunded'`
5. Usuario recupera 100% de la garantía

**Saldo del usuario**:
- Antes: `available_balance: 50000, locked_balance: 50000`
- Después: `available_balance: 100000, locked_balance: 0` (ARS 1000 totalmente disponible)

**Registros en Ledger**: Ninguno (solo unlock en wallet_transactions)

---

### Fase 2B: Deducción Parcial por Daños

```typescript
// Daño menor (ej: rayón en la puerta)
await bookingsService.deductFromSecurityDeposit(
  bookingId,
  15000, // ARS 150.00 de daños
  'Rayón en puerta trasera izquierda, 10cm'
);
```

**¿Qué sucede?**
1. Verifica que el monto de daño no exceda la garantía bloqueada
2. **Cobra al usuario** (ledger entry `rental_charge`):
   - Deduce ARS 150 del balance del renter
   - Ref: `damage-deduction-{booking_id}-charge`
3. **Paga al owner** (ledger entry `rental_payment`):
   - Acredita ARS 150 al owner
   - Ref: `damage-deduction-{booking_id}-payment`
4. **Libera resto de garantía**:
   - Desbloquea ARS 350 restantes (500 - 150)
   - Devuelve a `available_balance`
5. Actualiza `booking.wallet_status = 'partially_charged'`

**Saldo del renter**:
- Antes: `available_balance: 50000, locked_balance: 50000`
- Después: `available_balance: 35000, locked_balance: 0` (ARS 350 disponible, perdió ARS 150)

**Saldo del owner**:
- Antes: `available_balance: 200000`
- Después: `available_balance: 215000` (+ARS 150 por daños)

**Registros en Ledger**:
- 1 entrada `rental_charge` para renter (-ARS 150)
- 1 entrada `rental_payment` para owner (+ARS 150)

---

### Fase 2C: Deducción Total (Daño Grave)

```typescript
// Daño mayor que usa toda la garantía
await bookingsService.deductFromSecurityDeposit(
  bookingId,
  50000, // ARS 500.00 (toda la garantía)
  'Abolladura severa en paragolpes frontal'
);
```

**¿Qué sucede?**
1. Cobra **toda** la garantía al renter
2. Paga **toda** la garantía al owner
3. **No libera fondos** (remaining_deposit = 0)
4. Actualiza `booking.wallet_status = 'charged'`

**Saldo del renter**:
- Antes: `available_balance: 50000, locked_balance: 50000`
- Después: `available_balance: 0, locked_balance: 0` (perdió toda la garantía)

**Saldo del owner**:
- Antes: `available_balance: 200000`
- Después: `available_balance: 250000` (+ARS 500 completo)

---

## 🎯 Estados de Garantía (wallet_status)

| Estado | Descripción | ¿Cuándo? |
|--------|-------------|----------|
| `null` | Sin garantía | Booking recién creado |
| `locked` | Garantía bloqueada | Al confirmar booking |
| `refunded` | Garantía devuelta completa | Finalizado sin daños |
| `partially_charged` | Deducción parcial | Daños menores |
| `charged` | Garantía completa usada | Daños graves |

---

## 📊 Ejemplo Completo de Flujo

### Escenario: Alquiler con daño menor

**Setup inicial**:
- Renter balance: ARS 1000
- Owner balance: ARS 2000
- Garantía requerida: ARS 500

**1. Confirmación de booking**:
```typescript
await bookingsService.lockSecurityDeposit(bookingId, 50000);
```
- Renter: `available: 500, locked: 500`
- Owner: `available: 2000`

**2. Durante el alquiler**:
- Renter no puede usar los ARS 500 bloqueados
- Owner aún no recibe nada

**3. Devolución con daño menor (rayón ARS 150)**:
```typescript
await bookingsService.deductFromSecurityDeposit(bookingId, 15000, 'Rayón 10cm');
```
- **Renter final**: `available: 350, locked: 0` (perdió ARS 150)
- **Owner final**: `available: 2150` (ganó ARS 150)
- **Remaining deposit**: ARS 350 devuelto al renter

**Historial en Ledger del Renter**:
```
[rental_charge] -ARS 150 | Ref: damage-deduction-xxx-charge
  Meta: { damage_description: "Rayón 10cm" }
```

**Historial en Ledger del Owner**:
```
[rental_payment] +ARS 150 | Ref: damage-deduction-xxx-payment
  Meta: { damage_description: "Rayón 10cm" }
```

---

## 🔧 Métodos Disponibles

### 1. `lockSecurityDeposit()`
**Uso**: Al confirmar booking
```typescript
const result = await bookingsService.lockSecurityDeposit(
  bookingId: string,
  depositAmountCents: number,
  description?: string
);

// Returns: { ok: boolean; transaction_id?: string; error?: string }
```

**Validaciones**:
- ✅ Booking existe
- ✅ Usuario tiene saldo suficiente
- ✅ Monto > 0

---

### 2. `releaseSecurityDeposit()`
**Uso**: Al finalizar sin daños
```typescript
const result = await bookingsService.releaseSecurityDeposit(
  bookingId: string,
  description?: string
);

// Returns: { ok: boolean; error?: string }
```

**Validaciones**:
- ✅ Booking existe
- ✅ Garantía está bloqueada (`wallet_status = 'locked'`)

---

### 3. `deductFromSecurityDeposit()`
**Uso**: Al detectar daños
```typescript
const result = await bookingsService.deductFromSecurityDeposit(
  bookingId: string,
  damageAmountCents: number,
  damageDescription: string
);

// Returns: { ok: boolean; remaining_deposit?: number; error?: string }
```

**Validaciones**:
- ✅ Booking existe
- ✅ Garantía está bloqueada
- ✅ Monto de daño ≤ garantía bloqueada
- ✅ `damageDescription` es requerido

---

## 💡 Mejores Prácticas

### 1. Montos de Garantía Recomendados

| Categoría Auto | Valor Diario | Garantía Recomendada |
|----------------|--------------|----------------------|
| Económico | < ARS 40,000 | ARS 50,000 (1.25x) |
| Estándar | ARS 40,000-60,000 | ARS 80,000 (1.3x) |
| Premium | ARS 60,000-100,000 | ARS 120,000 (1.5x) |
| Lujo | > ARS 100,000 | ARS 200,000 (2x) |

### 2. Documentación de Daños

Siempre incluir en `damageDescription`:
- Ubicación exacta del daño
- Tamaño/severidad
- Timestamp
- Fotos (URL en meta)

```typescript
await bookingsService.deductFromSecurityDeposit(
  bookingId,
  25000,
  JSON.stringify({
    location: 'Puerta trasera izquierda',
    severity: 'Moderado',
    size: '15cm x 3cm',
    photos: ['https://...', 'https://...'],
    timestamp: new Date().toISOString()
  })
);
```

### 3. Proceso de Inspección

**Al iniciar alquiler**:
1. Tomar fotos del auto (antes)
2. Bloquear garantía
3. Guardar fotos en `booking.meta`

**Al finalizar alquiler**:
1. Tomar fotos del auto (después)
2. Comparar con fotos iniciales
3. Si hay daños → `deductFromSecurityDeposit()`
4. Si no hay daños → `releaseSecurityDeposit()`

---

## 🚨 Casos de Borde

### ¿Qué pasa si el daño excede la garantía?

```typescript
// Garantía: ARS 500
// Daño: ARS 800

const result = await bookingsService.deductFromSecurityDeposit(
  bookingId,
  80000, // ARS 800
  'Daño severo'
);

// result.ok = false
// result.error = "Damage amount (800) exceeds locked deposit (500)"
```

**Solución**:
1. Deducir el máximo de la garantía (ARS 500)
2. Crear reclamación por la diferencia (ARS 300)
3. Proceso externo de cobro adicional

---

### ¿Qué pasa si se cancela el booking?

El método existente `cancelBooking()` ya maneja esto:

```typescript
async cancelBooking(bookingId: string, reason?: string) {
  // ...
  if (booking.wallet_status === 'locked') {
    // Libera la garantía automáticamente
    await this.walletService.unlockFunds({ booking_id: bookingId });
  }
  // ...
}
```

✅ La garantía se libera automáticamente al cancelar

---

## 📈 Reportes y Consultas

### Ver todas las garantías actualmente bloqueadas

```sql
SELECT
  b.id as booking_id,
  u.email as renter_email,
  wt.amount / 100.0 as locked_amount_ars,
  b.start_date,
  b.end_date
FROM bookings b
JOIN wallet_transactions wt ON b.wallet_lock_transaction_id = wt.id
JOIN auth.users u ON b.user_id = u.id
WHERE b.wallet_status = 'locked'
  AND wt.type = 'lock'
ORDER BY b.start_date DESC;
```

### Total de garantías procesadas este mes

```sql
SELECT
  COUNT(DISTINCT booking_id) as total_bookings_with_damages,
  SUM(amount_cents) / 100.0 as total_damages_ars,
  AVG(amount_cents) / 100.0 as avg_damage_ars
FROM wallet_ledger
WHERE kind = 'rental_charge'
  AND meta->>'damage_description' IS NOT NULL
  AND ts >= DATE_TRUNC('month', NOW());
```

### Top daños más frecuentes

```sql
SELECT
  meta->>'damage_description' as damage_type,
  COUNT(*) as occurrences,
  AVG(amount_cents) / 100.0 as avg_cost_ars,
  SUM(amount_cents) / 100.0 as total_cost_ars
FROM wallet_ledger
WHERE kind = 'rental_charge'
  AND meta->>'damage_description' IS NOT NULL
GROUP BY meta->>'damage_description'
ORDER BY occurrences DESC
LIMIT 10;
```

---

## 🎓 Tutorial Paso a Paso

### Implementar garantías en tu booking flow

**Archivo**: `booking-detail.component.ts`

```typescript
import { BookingsService } from '@app/core/services/bookings.service';

export class BookingDetailComponent {
  private bookingsService = inject(BookingsService);

  // Al confirmar booking
  async confirmBooking() {
    // 1. Calcular garantía (ejemplo: 1.5x el precio diario)
    const depositAmount = Math.round(this.booking.total_price * 1.5);

    // 2. Bloquear garantía
    const result = await this.bookingsService.lockSecurityDeposit(
      this.booking.id,
      depositAmount,
      `Garantía para ${this.booking.car_title}`
    );

    if (!result.ok) {
      alert(`Error: ${result.error}`);
      return;
    }

    // 3. Continuar con confirmación
    this.booking.wallet_status = 'locked';
    this.showSuccessMessage('Garantía bloqueada correctamente');
  }

  // Al finalizar alquiler sin daños
  async completeRentalNoDamages() {
    const result = await this.bookingsService.releaseSecurityDeposit(
      this.booking.id,
      'Auto devuelto en perfectas condiciones'
    );

    if (result.ok) {
      this.showSuccessMessage('Garantía devuelta completamente');
    }
  }

  // Al detectar daños
  async reportDamage(damageAmount: number, description: string) {
    const result = await this.bookingsService.deductFromSecurityDeposit(
      this.booking.id,
      damageAmount * 100, // Convertir a centavos
      description
    );

    if (result.ok) {
      const remaining = (result.remaining_deposit || 0) / 100;
      this.showSuccessMessage(
        `Daño cobrado: ARS ${damageAmount}. Garantía restante: ARS ${remaining}`
      );
    }
  }
}
```

---

## ✅ Testing

### Test 1: Bloquear y Liberar Garantía

```typescript
describe('Security Deposit - Happy Path', () => {
  it('should lock and release deposit successfully', async () => {
    // Lock deposit
    const lockResult = await bookingsService.lockSecurityDeposit(
      bookingId,
      50000
    );
    expect(lockResult.ok).toBe(true);
    expect(lockResult.transaction_id).toBeDefined();

    // Check wallet
    const wallet = await getWallet(userId);
    expect(wallet.available_balance).toBe(50000);
    expect(wallet.locked_balance).toBe(50000);

    // Release deposit
    const releaseResult = await bookingsService.releaseSecurityDeposit(bookingId);
    expect(releaseResult.ok).toBe(true);

    // Check wallet restored
    const walletAfter = await getWallet(userId);
    expect(walletAfter.available_balance).toBe(100000);
    expect(walletAfter.locked_balance).toBe(0);
  });
});
```

### Test 2: Deducción Parcial

```typescript
it('should deduct partial damage from deposit', async () => {
  await bookingsService.lockSecurityDeposit(bookingId, 50000);

  const result = await bookingsService.deductFromSecurityDeposit(
    bookingId,
    15000,
    'Rayón en puerta'
  );

  expect(result.ok).toBe(true);
  expect(result.remaining_deposit).toBe(35000);

  // Check renter lost ARS 150
  const renterWallet = await getWallet(renterId);
  expect(renterWallet.available_balance).toBe(35000);

  // Check owner gained ARS 150
  const ownerWallet = await getWallet(ownerId);
  expect(ownerWallet.available_balance).toBe(originalOwnerBalance + 15000);
});
```

---

**Última actualización**: 2025-10-21
**Versión**: 1.0.0
