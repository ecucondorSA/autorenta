# P0-SECURITY: Quick Reference Cheat Sheet

**⚡ Acceso rápido sin consultar Supabase**

---

## 📊 TABLAS

### `claims`
```
PK: id (UUID)
FK: booking_id → bookings
FK: reported_by → auth.users
Status: draft | submitted | under_review | approved | rejected | paid | processing
Columns: damages (JSONB), total_estimated_cost_usd, locked_at, locked_by, fraud_warnings, waterfall_result
RLS: ✅ Enabled
Indexes: 7 (booking, status, lock, anti-fraud)
```

---

## ⚙️ FUNCIONES RPC

### 1️⃣ `wallet_deduct_damage_atomic()`
```
Firma: (p_booking_id, p_renter_id, p_owner_id, p_damage_amount_cents, p_damage_description, p_car_id)
Retorna: {ok, remaining_deposit, damage_charged, original_deposit, ref}
❌ Rollback total si falla
Uso: Desde booking-wallet.service.ts
```

### 2️⃣ `validate_claim_anti_fraud()`
```
Firma: (p_booking_id, p_owner_id, p_total_estimated_usd)
Retorna: {ok, blocked, block_reason, warnings[], owner_claims_30d}
Validaciones:
  ⏱️ Booking < 24h → warning
  📊 3+ claims/30d → warning
  🚫 5+ claims/30d → BLOQUEA
  💰 Monto 3x promedio → warning
  🎲 Número redondo → warning
Uso: Desde settlement.service.ts
```

### 3️⃣ `submit_claim()`
```
Firma: (p_claim_id)
Acción: draft → submitted
Validaciones: User es reported_by, status='draft', tiene damages
Retorna: {ok, claim_id, new_status}
Uso: Desde settlement.service.ts
```

### 4️⃣ `get_claims_stats()`
```
Firma: ()
Retorna: {total, draft, submitted, under_review, approved, rejected, paid, processing, total_usd, avg_usd, claims_30d}
Uso: Admin dashboard
```

---

## 🔐 RLS POLICIES

| Policy | Type | Allows |
|--------|------|--------|
| Users view claims | SELECT | Renters/owners de booking + admins |
| Owners create claims | INSERT | Solo propietarios de autos |
| Reporters update draft | UPDATE | Propietario edita draft/submitted |
| Admins update any | UPDATE | Admins modifican cualquier claim |
| Admins delete claims | DELETE | Admins eliminan claims |

---

## 🔍 ÍNDICES

```
idx_claims_booking_id        → Buscar por reserva
idx_claims_reported_by       → Buscar por owner
idx_claims_status            → Filtrar estado
idx_claims_status_locked     → P0-SECURITY: Queries de lock
idx_claims_reported_by_created → P0-SECURITY: Anti-fraud
idx_claims_status_created    → Admin dashboard
claims_pkey                  → Primary key
```

---

## 📝 ENUMS

```
claim_status: draft | submitted | under_review | approved | rejected | paid | processing

damage_type: scratch | dent | broken_glass | tire_damage | mechanical | interior | missing_item | other

damage_severity: minor | moderate | severe
```

---

## 💾 JSONB STRUCTURES

### `damages` Array
```json
[
  {
    "type": "scratch",
    "description": "...",
    "estimatedCostUsd": 150,
    "photos": ["url1", "url2"],
    "severity": "minor"
  }
]
```

### `fraud_warnings` Array
```json
[
  {
    "type": "short_booking | high_claim_frequency | unusually_high_amount | round_number_amount",
    "message": "...",
    "value": 12
  }
]
```

### `waterfall_result` Object
```json
{
  "ok": true,
  "bookingId": "uuid",
  "totalClaimCents": 100000,
  "breakdown": {
    "holdCaptured": 50000,
    "walletDebited": 30000,
    "extraCharged": 10000,
    "fgoPaid": 10000,
    "remainingUncovered": 0
  },
  "executedAt": "ISO timestamp",
  "eligibility": {...}
}
```

---

## 🛡️ SECURITY FEATURES

### 1. Atomic Transactions
```
wallet_deduct_damage_atomic()
→ Todo o nada
→ Sin estados parciales
→ ROLLBACK automático
```

### 2. Optimistic Locking
```
Lock adquisition en status='approved'
→ Solo un admin procesa a la vez
→ Previene double-spend
→ Auto-expires en 5 minutos
Columnas: locked_at, locked_by, processed_at
```

### 3. Anti-Fraud Validation
```
validate_claim_anti_fraud()
→ Detecta patrones sospechosos
→ 5 tipos de validación
→ Bloquea en caso crítico
→ Warnings para review manual
```

### 4. Refund Blocking
```
refund.service.ts
→ Bloquea si claims en: draft|submitted|pending|under_review|approved
→ Fail-safe: Error en check → bloquea refund
→ Previene race condition
```

---

## 🚨 VULNERABILIDADES CORREGIDAS

| Issue | Fix | Resultado |
|-------|-----|-----------|
| Race condition: Cancelación + Claim | Bloquea refund si claim activo | ✅ Protegido |
| Double-spend Waterfall | Lock optimista | ✅ Una ejecución a la vez |
| Estado inconsistente Wallet | Transacción atómica DB | ✅ Todo o nada |
| Claim Farming | Validación anti-fraud | ✅ Detecta patrón |

---

## 🔧 SERVICIO CALLS

### Crear Claim
```typescript
const claim = await settlementService.createClaim(bookingId, damages, notes);
// → Valida anti-fraud automáticamente
// → Guarda en DB
// → Si bloqueado: error, no crea
```

### Procesar Claim
```typescript
const result = await settlementService.processClaim(claim);
// → Adquiere lock optimista
// → Ejecuta wallet_deduct_damage_atomic()
// → Libera lock
// → Status: approved → processing → paid
```

### Deducir Daño del Wallet
```typescript
const result = await bookingWalletService.deductFromSecurityDeposit(booking, damageAmountCents, description);
// → Usa RPC atómico internamente
// → Ya no hace múltiples inserts
```

### Intentar Refund
```typescript
await refundService.processRefund({booking_id, refund_type, amount});
// → Verifica claims en estados activos
// → Si existe → error
// → Bloquea automaticamente
```

---

## 📍 ARCHIVOS ACTUALIZADOS

```
Backend (Services):
  ✅ apps/web/src/app/core/services/settlement.service.ts
  ✅ apps/web/src/app/core/services/booking-wallet.service.ts
  ✅ apps/web/src/app/core/services/refund.service.ts
  ✅ apps/web/src/app/features/admin/settlements/admin-settlements.page.ts

Database:
  ✅ supabase/migrations/20251124_create_atomic_damage_deduction_rpc.sql
  ✅ supabase/migrations/20251124_create_claims_table.sql

Documentation:
  ✅ docs/P0_SECURITY_DATABASE_SCHEMA.md
  ✅ docs/P0_SECURITY_QUICK_REFERENCE.md
```

---

## ⚡ TESTING QUERIES

### Ver todas las claims
```sql
SELECT id, booking_id, status, total_estimated_cost_usd, created_at
FROM claims
ORDER BY created_at DESC;
```

### Claims por procesar (approved)
```sql
SELECT id, booking_id, reported_by, total_estimated_cost_usd, fraud_warnings
FROM claims
WHERE status = 'approved' AND locked_at IS NULL
ORDER BY created_at ASC;
```

### Claims con fraud warnings
```sql
SELECT id, booking_id, fraud_warnings, owner_claims_30d
FROM claims
WHERE fraud_warnings != '[]'::jsonb
ORDER BY created_at DESC;
```

### Claims en lock (procesando)
```sql
SELECT id, booking_id, locked_by, locked_at,
       (NOW() - locked_at) as locked_duration
FROM claims
WHERE status = 'processing'
ORDER BY locked_at ASC;
```

### Estadísticas
```sql
SELECT * FROM get_claims_stats();
```

### Claims del owner en últimos 30 días
```sql
SELECT COUNT(*), SUM(total_estimated_cost_usd)
FROM claims
WHERE reported_by = $1
  AND created_at > NOW() - INTERVAL '30 days'
  AND status != 'rejected';
```

---

## 🔗 REFERENCIAS

- Full schema: `docs/P0_SECURITY_DATABASE_SCHEMA.md`
- Frontend code: `apps/web/src/app/core/services/`
- Migrations: `supabase/migrations/20251124_*`
- Vulnerabilities: `docs/SECURITY_AUDIT_REPORT.md` (cuando se cree)

---

**Last Updated:** 2025-11-24
**Version:** 1.0
**Status:** ✅ Production Ready
