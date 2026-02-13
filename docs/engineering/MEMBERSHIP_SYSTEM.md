# Sistema de Membresía AutoRenta Club

> Documento operativo — describe cómo funciona el sistema de membresía end-to-end.
> Última actualización: 2026-02-13

---

## 1. Resumen Ejecutivo

AutoRenta Club es un sistema de membresía mensual que ofrece **dos beneficios principales**:

1. **Descuento en garantía (hold):** Los miembros pagan menos depósito de seguridad al alquilar.
2. **Cobertura por daños:** Si hay un reclamo (claim) por daños, la membresía cubre total o parcialmente el costo antes de tocar la wallet del usuario.

Adicionalmente, el sistema incluye un **lock de activación de $150 USD** que bloquea fondos en la wallet como "skin in the game" — se liberan automáticamente al expirar la suscripción.

---

## 2. Planes y Precios

| | Club Access | Silver Access | Black Access |
|---|---|---|---|
| **Precio mensual** | USD 24.99 | USD 34.99 | USD 69.99 |
| **Cobertura por daños** | USD 3,000 | USD 6,000 | USD 15,000 |
| **Descuento en garantía** | 25% | 40% | 50% |
| **Vehículos elegibles** | Hasta USD 25,000 | Hasta USD 70,000 | Toda la flota |
| **FGO buy-down** | Incluido | Incluido | Incluido |
| **Soporte** | Prioritario | VIP 24/7 | VIP exclusivo 24/7 |
| **Cancelación flexible** | No (primer mes) | Sí | Sí |
| **Prioridad en reservas** | No | No | Sí |

**Nota:** Cualquier usuario puede alquilar cualquier auto pagando la garantía completa. La membresía otorga descuento solo para vehículos dentro del rango del plan.

---

## 3. Tiers de Vehículos y Garantías Base

El sistema define 6 tiers de vehículos por valor:

| Tier | Rango de valor | Garantía base (sin membresía) | Piso operativo |
|---|---|---|---|
| Starter | < USD 8,000 | USD 300 | USD 150 |
| Economy | USD 8k - 15k | USD 500 | USD 250 |
| Standard | USD 15k - 25k | USD 800 | USD 400 |
| Silver | USD 25k - 40k | USD 1,500 | USD 750 |
| Premium | USD 40k - 70k | USD 2,500 | USD 1,250 |
| Luxury | > USD 70,000 | USD 4,000 | USD 2,500 |

### Fórmula de cálculo del hold

```
holdFinal = max(holdBase × (1 - descuentoMembresía), pisoOperativo)
fgoBuyDown = holdBase - holdFinal
```

**Ejemplo:** Auto Standard ($20k) + miembro Club (25% OFF):
- holdBase = $800
- holdDescontado = $800 × 0.75 = **$600**
- pisoOperativo = $400
- holdFinal = max($600, $400) = **$600**
- FGO buy-down = $200 (la plataforma cubre esta diferencia)

**Ejemplo:** Auto Standard ($20k) + miembro Silver (40% OFF):
- holdDescontado = $800 × 0.60 = $480
- holdFinal = max($480, $400) = **$480**
- FGO buy-down = $320

---

## 4. Flujo de Compra

### 4.1 Compra con Wallet (instantáneo)

```
Usuario → /wallet/club/plans (ve planes + comparación de holds)
       → /wallet/club/subscribe?tier=club_standard
       → Click "Pagar con wallet"
       ↓
Edge Function: create-subscription-wallet
       ↓
RPC: create_subscription_with_wallet() [atómico]
  ├── Valida saldo suficiente (plan + $150 lock)
  ├── Debita fee de membresía ($24.99) → balance_cents baja
  ├── Bloquea activación ($150) → locked_balance_cents sube
  ├── Crea transacción tipo 'charge' (fee permanente)
  ├── Crea transacción tipo 'lock' (garantía temporal)
  └── Crea subscription (status: active, 30 días)
       ↓
Respuesta: subscription_id, transaction_id, lock_transaction_id
```

**Costo total en wallet al suscribirse:**

| Plan | Fee mensual | Lock activación | Total debitado |
|---|---|---|---|
| Club Access | $24.99 | $150.00 | $174.99 |
| Silver Access | $34.99 | $150.00 | $184.99 |
| Black Access | $69.99 | $150.00 | $219.99 |

### 4.2 Compra con MercadoPago (tarjeta/transferencia)

```
Usuario → /wallet/club/subscribe?tier=club_standard
       → Se renderiza MercadoPago Wallet Brick
       ↓
Edge Function: create-subscription-preference
  ├── Crea preference en MercadoPago API
  ├── Incluye metadata (tier, user_id, coverage_limit)
  └── Retorna preference_id + init_point
       ↓
Usuario completa pago en modal MP
       ↓
Webhook: mercadopago-webhook procesa confirmación
       ↓
RPC: create_subscription() crea el registro
```

### 4.3 Validaciones de seguridad

- **Idempotencia:** `payment_external_id` previene doble cargo
- **Suscripción activa:** No se permite tener dos activas simultáneamente
- **Primer mes no-cancelable:** `cancellable_after = starts_at + 30 días`

---

## 5. Flujo de Upgrade

Un usuario puede subir de tier sin esperar a que expire:

```
Usuario (Club $24.99) → quiere Silver ($34.99)
       ↓
RPC: calculate_subscription_upgrade()
  ├── Valida que sea upgrade (no downgrade)
  └── Calcula diferencia: $34.99 - $24.99 = $10.00
       ↓
Edge Function: upgrade-subscription-wallet
  ├── Cobra SOLO la diferencia ($10.00) de wallet
  ├── Marca suscripción anterior como 'cancelled' (upgraded_to: silver)
  └── Crea nueva suscripción Silver (30 días desde ahora)
```

**Reglas de upgrade:**
- Solo se permite subir (Club→Silver, Club→Black, Silver→Black)
- Se cobra únicamente la diferencia de precio
- El lock de activación ($150) NO se recobra
- La cobertura restante de la suscripción anterior NO se transfiere

---

## 6. Cobertura por Daños (Claims)

Cuando un auto sufre daños durante un alquiler:

### 6.1 Waterfall de cobros (orden de prioridad)

```
Costo total del daño
       ↓
1. Cobertura de suscripción (remaining_balance_cents)
       ↓ lo que no cubre ↓
2. FGO - Fondo de Garantía Operativa (fgo_subfunds.liquidity)
       ↓ lo que no cubre ↓
3. Wallet del usuario (available_balance_cents)
       ↓ lo que no cubre ↓
4. Pre-autorización de tarjeta (si existe)
       ↓ lo que no cubre ↓
5. Déficit → platform_blocked = true + pending_debt_cents
```

### 6.2 Check de cobertura

```sql
RPC: check_subscription_coverage(p_franchise_amount_cents)
→ Retorna:
  {
    has_coverage: true/false,
    coverage_type: 'full' | 'partial' | 'none' | 'depleted',
    available_cents: 250000,     -- saldo restante de suscripción
    covered_cents: 150000,       -- cuánto cubre la suscripción
    uncovered_cents: 50000,      -- cuánto debe el usuario
    deposit_required_cents: 50000
  }
```

### 6.3 Ejemplo de claim

Usuario Club Access con $2,500 de cobertura restante. Daño = $3,200.

1. Suscripción cubre $2,500 → saldo queda en $0 (status: `depleted`)
2. FGO cubre $700 restante (si hay fondos en `fgo_subfunds.liquidity`)
3. Si FGO = $0: wallet del usuario paga $700
4. Si wallet insuficiente: `platform_blocked = true`, `pending_debt_cents += faltante`

---

## 7. Ciclo de Vida de la Suscripción

```
                    ┌──────────┐
         compra →   │  active   │ ← 30 días
                    └──────┬───┘
                           │
            ┌──────────────┼──────────────┐──────────────┐
            ↓              ↓              ↓              ↓
     ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ expired  │   │ depleted │   │cancelled │   │ upgraded │
     │ (fecha)  │   │(sin saldo)│  │ (usuario)│   │(a tier+) │
     └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Status en UI

| Status DB | Label UI | Descripción |
|---|---|---|
| `active` | Activa | Vigente, con cobertura disponible |
| `depleted` | Saldo agotado | Claims consumieron toda la cobertura |
| `expired` | Expirada | Pasaron 30 días sin renovar |
| `cancelled` | Cancelada | Usuario canceló o hizo upgrade |
| `inactive` | Inactiva | Creada pero no activada |

---

## 8. Lock de Activación ($150)

### Creación (al suscribirse)
- Se bloquean $150 en `user_wallets.locked_balance_cents`
- Se crea transacción tipo `lock` con `reference_type = 'subscription_guarantee'`
- Metadata incluye `lock_type: 'activation_guarantee'` y `releases_at`

### Liberación (al expirar)
- **Cron:** `release-activation-locks` ejecuta diario a las 00:05 UTC
- **RPC:** `release_expired_activation_locks()` busca suscripciones expiradas/canceladas
- Mueve $150 de `locked_balance_cents` → `available_balance_cents`
- Crea transacción tipo `unlock` para audit trail
- **Idempotente:** verifica que no exista unlock previo antes de operar
- **Ventana:** solo procesa expiraciones de los últimos 7 días

### Seguridad
- `balance_consistency` constraint: `balance_cents = available_balance_cents + locked_balance_cents`
- El UPDATE solo procede si `locked_balance_cents >= lock_amount` (previene constraint violation)

---

## 9. Bloqueo de Plataforma (Deuda pendiente)

Si el waterfall de cobros no puede recuperar el total del daño:

1. `profiles.platform_blocked = true`
2. `profiles.pending_debt_cents += déficit`
3. `BookingInitiationService.checkPlatformBlock()` intercepta intentos de reserva
4. Usuario ve: _"Tenés una deuda pendiente de USD X.XX. Saldala desde tu wallet para poder reservar."_

---

## 10. Arquitectura Técnica

### Frontend (Angular)

| Componente | Ruta | Función |
|---|---|---|
| `club-plans.page` | `/wallet/club/plans` | Comparación de planes + holds |
| `club-subscribe.page` | `/wallet/club/subscribe` | Checkout (wallet o MP) |
| `club-history.page` | `/wallet/club/history` | Historial de uso + saldo |
| `club-membership-card` | (shared) | Card resumida en wallet |

### Servicios

| Servicio | Responsabilidad |
|---|---|
| `SubscriptionService` | Estado, señales, operaciones CRUD |
| `SubscriptionPolicyService` | Políticas de elegibilidad (gates) |
| `SettlementService` | Procesamiento de claims + waterfall |
| `BookingInitiationService` | Guard de platform_blocked |

### Edge Functions

| Función | Trigger |
|---|---|
| `create-subscription-wallet` | Compra con wallet |
| `create-subscription-preference` | Compra con MercadoPago |
| `upgrade-subscription-wallet` | Upgrade de tier |

### RPCs (Postgres)

| RPC | Propósito |
|---|---|
| `create_subscription()` | Crea registro de suscripción |
| `create_subscription_with_wallet()` | Compra atómica (fee + lock + subscription) |
| `upgrade_subscription_with_wallet()` | Upgrade atómico (diff charge + new sub) |
| `calculate_subscription_upgrade()` | Calcula elegibilidad y precio de upgrade |
| `check_subscription_coverage()` | Verifica cobertura para un monto de claim |
| `release_expired_activation_locks()` | Cron: libera $150 de suscripciones expiradas |
| `process_subscription_expirations()` | Cron: marca suscripciones como expiradas |

### Cron Jobs

| Job | Schedule | Función |
|---|---|---|
| `process-subscription-expirations` | `0 0 * * *` (00:00 UTC) | Marca expiradas |
| `release-activation-locks` | `5 0 * * *` (00:05 UTC) | Libera locks |

---

## 11. Modelo Financiero

### Flujo 15-70-15

Cada booking genera revenue que se distribuye:
- **15%** → Platform (operación)
- **70%** → Reward Pool (owner)
- **15%** → FGO (Fondo de Garantía Operativa)

El FGO es el fondo que cubre la diferencia entre la garantía base y la garantía con descuento (FGO buy-down), más los pagos por siniestros.

### Loss Ratio por Tier (estimado a 5% claims)

| Métrica | Club $24.99 | Silver $34.99 | Black $69.99 |
|---|---|---|---|
| Revenue mensual | $24.99 | $34.99 | $69.99 |
| Cobertura máxima | $3,000 | $6,000 | $15,000 |
| Expected loss (5%) | ~$15.50 | ~$21.70 | ~$43.35 |
| **Loss ratio** | **~62%** | **~62%** | **~62%** |

---

## 12. Source of Truth

Los precios y configuraciones viven en:

```
apps/web/src/app/core/models/subscription.model.ts   ← frontend
apps/web/src/app/core/models/guarantee-tiers.model.ts ← holds + floors
DB RPCs (create_subscription, etc.)                   ← backend enforcement
subscription_plans table                              ← seed/config (no leído por RPCs aún)
```

> **Nota:** Los RPCs actualmente hardcodean precios en CASE statements. Un refactor futuro haría que lean de `subscription_plans` para eliminar puntos de sincronización manual.
