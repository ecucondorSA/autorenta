# Análisis de Tipos TypeScript vs Esquema SQL

**Fecha**: 2025-10-28
**Objetivo**: Identificar tipos faltantes que pueden estar causando errores TypeScript

## 📊 Tablas en el Esquema SQL

### Tablas Principales (28 tablas)

| Tabla SQL | ¿Tiene tipo TS? | Archivo Afectado | Errores |
|-----------|-----------------|------------------|---------|
| `bookings` | ✅ Probablemente | Multiple | - |
| `booking_risk_snapshot` | ❓ Verificar | payment-authorization.service.ts | 99 |
| `booking_insurance_coverage` | ❓ Verificar | - | - |
| `booking_insurance_addons` | ❓ Verificar | - | - |
| `wallet_ledger` | ❓ Verificar | wallet-ledger.service.ts | 166 |
| `wallet_transactions` | ❓ Verificar | wallet-ledger.service.ts | 166 |
| `wallet_transfers` | ❓ Verificar | transfer-funds.component.ts | 171 |
| `user_wallets` | ❓ Verificar | wallet services | - |
| `payment_intents` | ❓ Verificar | payment-authorization.service.ts | 99 |
| `payments` | ✅ Probablemente | - | - |
| `payment_splits` | ❓ Verificar | - | - |
| `payment_issues` | ❓ Verificar | - | - |
| `insurance_policies` | ❓ Verificar | - | - |
| `insurance_claims` | ❓ Verificar | - | - |
| `insurance_addons` | ❓ Verificar | - | - |
| `exchange_rates` | ✅ Verificar | exchange-rate.service.ts | 5 |
| `fx_rates` | ❓ Verificar | fx.service.ts | 105 |
| `fgo_*` (5 tablas) | ❓ Verificar | - | - |
| `pricing_*` (8 tablas) | ❓ Verificar | dynamic-pricing.service.ts | - |
| `cars` | ✅ Sí | cars-map, car-detail, car-card | 1522 |
| `car_*` (8 tablas) | ❓ Verificar | - | - |
| `profiles` | ✅ Sí | profile.service.ts | 358 (fixed) |
| `bank_accounts` | ❓ Verificar | - | - |
| `withdrawal_requests` | ❓ Verificar | - | - |

## 🔍 Tipos Críticos Faltantes Identificados

### 1. Sistema de Wallet (337 errores combinados)

**Tablas necesarias**:
```typescript
// wallet_ledger
export interface WalletLedger {
  id: string;
  ts: string; // timestamp with time zone
  user_id: string;
  kind: WalletLedgerKind; // ENUM
  amount_cents: number; // bigint
  ref: string;
  meta: Record<string, unknown>;
  transaction_id?: string;
  booking_id?: string;
  created_at: string;
  exchange_rate?: number;
  original_currency?: string;
  original_amount_cents?: number;
}

export type WalletLedgerKind =
  | 'deposit'
  | 'withdrawal'
  | 'charge'
  | 'refund'
  | 'lock'
  | 'unlock'
  | 'transfer_in'
  | 'transfer_out';

// wallet_transactions
export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  currency: string;
  reference_type?: string;
  reference_id?: string;
  provider?: string;
  provider_transaction_id?: string;
  provider_metadata?: Record<string, unknown>;
  description?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  is_withdrawable: boolean;
}

export type WalletTransactionType =
  | 'deposit'
  | 'lock'
  | 'unlock'
  | 'charge'
  | 'refund'
  | 'bonus'
  | 'withdrawal'
  | 'rental_payment_lock'
  | 'rental_payment_transfer'
  | 'security_deposit_lock'
  | 'security_deposit_release'
  | 'security_deposit_charge';

export type WalletTransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

// user_wallets
export interface UserWallet {
  user_id: string;
  available_balance: number;
  locked_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
  non_withdrawable_floor: number;
}

// wallet_transfers
export interface WalletTransfer {
  id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  ref: string;
  status: WalletTransferStatus;
  meta: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export type WalletTransferStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### 2. Sistema de Pagos y Autorizaciones (99 errores)

**Tablas necesarias**:
```typescript
// payment_intents
export interface PaymentIntent {
  id: string;
  user_id: string;
  booking_id?: string;
  mp_payment_id?: string;
  mp_status?: string;
  mp_status_detail?: string;
  intent_type: PaymentIntentType;
  amount_usd: number;
  amount_ars: number;
  amount_captured_ars: number;
  fx_rate: number;
  payment_method_id?: string;
  card_last4?: string;
  card_holder_name?: string;
  is_preauth: boolean;
  preauth_expires_at?: string;
  status: PaymentIntentStatus;
  description?: string;
  external_reference?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  authorized_at?: string;
  captured_at?: string;
  cancelled_at?: string;
  expired_at?: string;
}

export type PaymentIntentType = 'preauth' | 'charge' | 'deposit';

export type PaymentIntentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'cancelled'
  | 'expired'
  | 'approved'
  | 'rejected'
  | 'failed';

// booking_risk_snapshot
export interface BookingRiskSnapshot {
  booking_id: string;
  country_code: string;
  bucket: string;
  fx_snapshot: number;
  currency: string;
  estimated_hold_amount?: number;
  estimated_deposit?: number;
  franchise_usd: number;
  has_card: boolean;
  has_wallet_security: boolean;
  meta: Record<string, unknown>;
  created_at: string;
  standard_franchise_usd?: number;
  rollover_franchise_usd?: number;
  guarantee_type?: GuaranteeType;
  guarantee_amount_ars?: number;
  guarantee_amount_usd?: number;
  fx_snapshot_date?: string;
  min_hold_ars?: number;
  requires_revalidation: boolean;
  revalidation_reason?: string;
}

export type GuaranteeType = 'hold' | 'security_credit';

// payment_splits
export interface PaymentSplit {
  id: string;
  booking_id: string;
  payment_id: string;
  total_amount_cents: number;
  owner_amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  collector_id: string;
  marketplace_id?: string;
  status: PaymentSplitStatus;
  validated_at?: string;
  transferred_at?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export type PaymentSplitStatus =
  | 'pending'
  | 'validated'
  | 'transferred'
  | 'failed'
  | 'disputed';
```

### 3. Sistema de Exchange Rates (110 errores combinados)

**Tablas necesarias**:
```typescript
// exchange_rates (Binance)
export interface ExchangeRate {
  id: string;
  pair: string; // e.g., 'USDTARS'
  source: string; // 'binance'
  binance_rate: number;
  platform_rate: number;
  margin_percent: number;
  margin_absolute: number;
  volatility_24h?: number;
  last_updated: string;
  created_at: string;
  is_active: boolean;
}

// fx_rates (Manual)
export interface FxRate {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  is_active: boolean;
  source: string;
  source_reference?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  valid_from: string;
  valid_until?: string;
}

export type CurrencyCode = 'USD' | 'ARS' | 'COP' | 'MXN';
```

### 4. Sistema de Insurance (No errores aún, pero preventivo)

```typescript
// insurance_policies
export interface InsurancePolicy {
  id: string;
  policy_type: InsurancePolicyType;
  insurer: InsuranceInsurer;
  platform_policy_number?: string;
  platform_contract_start?: string;
  platform_contract_end?: string;
  owner_id?: string;
  car_id?: string;
  owner_policy_number?: string;
  owner_policy_start?: string;
  owner_policy_end?: string;
  owner_policy_document_url?: string;
  verified_by_admin: boolean;
  verification_date?: string;
  liability_coverage_amount: number;
  own_damage_coverage: boolean;
  theft_coverage: boolean;
  fire_coverage: boolean;
  misappropriation_coverage: boolean;
  misappropriation_limit: number;
  deductible_type?: DeductibleType;
  deductible_percentage?: number;
  deductible_fixed_amount?: number;
  deductible_min_amount: number;
  daily_premium?: number;
  annual_premium?: number;
  status: InsurancePolicyStatus;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export type InsurancePolicyType = 'platform_floating' | 'owner_byoi';
export type InsuranceInsurer = 'rio_uruguay' | 'sancor' | 'federacion_patronal' | 'other';
export type DeductibleType = 'percentage' | 'fixed';
export type InsurancePolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending_verification';

// insurance_claims
export interface InsuranceClaim {
  id: string;
  booking_id: string;
  policy_id: string;
  reported_by: string;
  reporter_role?: ReporterRole;
  claim_type: ClaimType;
  description: string;
  location?: string;
  incident_date: string;
  photos: string[];
  police_report_number?: string;
  police_report_url?: string;
  estimated_damage_amount?: number;
  deductible_charged?: number;
  insurance_payout?: number;
  assigned_adjuster?: string;
  adjuster_contact?: string;
  status: ClaimStatus;
  resolution_notes?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export type ReporterRole = 'driver' | 'owner';
export type ClaimType = 'collision' | 'theft' | 'fire' | 'vandalism' | 'misappropriation' | 'other';
export type ClaimStatus = 'reported' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'closed';

// booking_insurance_coverage
export interface BookingInsuranceCoverage {
  id: string;
  booking_id: string;
  policy_id: string;
  coverage_start: string;
  coverage_end: string;
  liability_coverage: number;
  deductible_amount: number;
  daily_premium_charged?: number;
  certificate_number?: string;
  certificate_url?: string;
  status: CoverageStatus;
  activated_at: string;
  created_at: string;
  updated_at: string;
}

export type CoverageStatus = 'active' | 'completed' | 'cancelled';
```

### 5. Sistema de Pricing (Probablemente sin errores aún)

```typescript
// pricing_regions
export interface PricingRegion {
  id: string;
  name: string;
  country_code: string;
  currency: string;
  base_price_per_hour: number;
  fuel_cost_multiplier: number;
  inflation_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// pricing_day_factors
export interface PricingDayFactor {
  id: string;
  region_id?: string;
  day_of_week: number; // 0-6
  factor: number;
  created_at: string;
}

// pricing_hour_factors
export interface PricingHourFactor {
  id: string;
  region_id?: string;
  hour_start: number; // 0-23
  hour_end: number; // 0-23
  factor: number;
  description?: string;
  created_at: string;
}
```

## 🎯 Acción Recomendada

### Fase 2A: Agregar Tipos Faltantes (Prioridad Alta)

1. **Extender `database.types.ts`** con los tipos identificados arriba
2. **Verificar imports** en archivos con errores
3. **Actualizar servicios** para usar tipos correctos

### Comandos de Verificación

```bash
# Verificar si los tipos existen en database.types.ts
grep -n "WalletLedger\|WalletTransaction\|PaymentIntent\|BookingRiskSnapshot" \
  apps/web/src/app/core/types/database.types.ts

# Verificar imports en archivos problemáticos
grep -n "import.*database.types" \
  apps/web/src/app/core/services/wallet-ledger.service.ts \
  apps/web/src/app/core/services/payment-authorization.service.ts \
  apps/web/src/app/features/wallet/components/transfer-funds.component.ts
```

### Impacto Esperado

Si agregamos estos tipos faltantes:
- **wallet-ledger.service.ts**: -166 errores → ~50 errores
- **payment-authorization.service.ts**: -99 errores → ~30 errores
- **transfer-funds.component.ts**: -171 errores → ~60 errores

**Total**: -436 errores adicionales (~19.6% del total restante)

---

**Generado por**: Claude Code
**Basado en**: Esquema SQL proporcionado
**Próximo paso**: Agregar tipos faltantes a `database.types.ts`
