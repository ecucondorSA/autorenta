# Bonus Protector - Quick Reference Guide

## File Locations

### Database Migrations
```
supabase/migrations/
├── 20251105_create_bonus_protector_rpcs.sql          [v1 - DEPRECATED]
├── 20251105_create_bonus_malus_system.sql            [Core tables definition]
├── 20251105_create_protection_credit_rpcs.sql        [Protection Credit system]
├── 20251106_create_bonus_malus_core_tables.sql       [v2 - Cleaner schema]
├── 20251106_create_bonus_protector_rpcs.sql          [v2 - Current RPC impl]
├── 20251105_bonus_malus_accounting_integration.sql   [Accounting hooks]
└── 20251106_bonus_malus_accounting_integration.sql   [Updated accounting]
```

### Backend Services (TypeScript)
```
apps/web/src/app/core/services/
├── bonus-protector.service.ts                  [Main service]
├── bonus-protector.service.spec.ts             [Unit tests]
├── bonus-malus.service.ts                      [Bonus-Malus integration]
├── protection-credit.service.ts                [Protection Credit system]
└── wallet.service.ts                           [Wallet integration]
```

### Frontend Components
```
apps/web/src/app/shared/components/
├── bonus-protector-purchase/
│   └── bonus-protector-purchase.component.ts   [Purchase UI]
├── protection-credit-card/
│   └── protection-credit-card.component.ts     [Credit display]
└── insurance-summary-card/
    └── insurance-summary-card.component.ts     [Summary view]
```

### Type Definitions
```
apps/web/src/app/core/
├── models/
│   └── index.ts                                [Export model types]
├── types/
│   ├── database.types.ts                       [Custom types]
│   └── supabase-types.ts                       [Generated types]
```

---

## Key Entities

### Database Tables
- **driver_protection_addons**: Stores purchased add-ons (bonus protector, deductible shield)
- **driver_risk_profile**: Driver class (0-10) and risk metrics
- **driver_class_history**: Audit trail of class changes
- **pricing_class_factors**: Fee/guarantee multipliers by class
- **booking_claims**: Damage claims linked to bookings
- **driver_telemetry**: GPS/telemetry data for driving score
- **wallet_ledger**: Transaction audit trail
- **user_wallets**: Wallet balance and protection credit

### RPC Functions
- `purchase_bonus_protector()`: Buy protection (Level 1-3)
- `apply_bonus_protector()`: Use protection on claim
- `get_active_bonus_protector()`: Check protection status

### Services
- `BonusProtectorService`: Main API service
- `ProtectionCreditService`: Protection Credit management
- `BonusMalusService`: Bonus-Malus factor calculations
- `WalletService`: Wallet operations

---

## Data Flow

### Purchase Flow
```
UI → BonusProtectorService.purchaseProtector()
  → Supabase RPC: purchase_bonus_protector(user_id, level)
  → Validate wallet funds
  → Deduct from user_wallets.available_balance
  → Create driver_protection_addons record
  → Record in wallet_ledger
  → Return addon_id, expiry, message
```

### Claim Processing Flow (NOT YET IMPLEMENTED)
```
Claim Created → booking_claims table
  → Claim Approved (status='approved')
  → Trigger: apply_bonus_protector() RPC
  → Check for active addon in driver_protection_addons
  → If found:
    ├── Update claims_used
    ├── Mark addon as inactive if exhausted
    └── Add entry to driver_class_history (protection_applied)
  → Skip class increase for driver_risk_profile
```

---

## Configuration & Pricing

### Protection Levels
| Level | Claims Covered | Price (USD) | Duration |
|-------|----------------|------------|----------|
| 1 | 1 claim | $15 | 6 months |
| 2 | 2 claims | $25 | 6 months |
| 3 | 3 claims | $40 | 6 months |

**Note**: v1 migration had 365 days, v2 changed to 6 months

### Claim Severity to Class Change
| Severity | Class Increase |
|----------|----------------|
| 1 (light) | +1 class |
| 2 (moderate) | +2 classes |
| 3 (severe) | +3 classes |

### Driver Class Scale
- **Class 0**: Excellent (best pricing)
- **Class 5**: Neutral (new drivers default)
- **Class 10**: High risk (worst pricing)

---

## RPC Method Signatures

### purchase_bonus_protector()
```typescript
purchase_bonus_protector(
  p_user_id: UUID,
  p_protection_level: INTEGER = 1,
  p_price_cents: BIGINT = 1500
) RETURNS TABLE(
  success: BOOLEAN,
  message: TEXT,
  addon_id: UUID,
  protection_level: INTEGER,
  max_protected_claims: INTEGER,
  expires_at: TIMESTAMPTZ,
  price_paid_cents: BIGINT
)
```

### apply_bonus_protector()
```typescript
apply_bonus_protector(
  p_user_id: UUID,
  p_claim_id: UUID,
  p_claim_severity: INTEGER
) RETURNS TABLE(
  success: BOOLEAN,
  message: TEXT,
  protection_applied: BOOLEAN,
  class_before: INTEGER,
  class_after: INTEGER,
  class_change_prevented: INTEGER,
  addon_id: UUID,
  remaining_uses: INTEGER
)
```

### get_active_bonus_protector()
```typescript
get_active_bonus_protector(p_user_id: UUID = NULL) RETURNS TABLE(
  has_active_protector: BOOLEAN,
  addon_id: UUID,
  protection_level: INTEGER,
  max_protected_claims: INTEGER,
  claims_used: INTEGER,
  remaining_uses: INTEGER,
  purchase_date: TIMESTAMPTZ,
  expires_at: TIMESTAMPTZ,
  days_until_expiration: INTEGER,
  is_expired: BOOLEAN
)
```

---

## Angular Service Usage

### Load Options
```typescript
const options = await bonusProtectorService.loadOptions();
// Returns: BonusProtectorOption[]
```

### Load Active Protector
```typescript
const protector = await bonusProtectorService.loadActiveProtector();
// Returns: ActiveBonusProtector | null
```

### Purchase
```typescript
try {
  const addonId = await bonusProtectorService.purchaseProtector(2);
  console.log('Purchased addon:', addonId);
} catch (error) {
  console.error('Purchase failed:', error.message);
}
```

### Computed Signals
```typescript
// Check if user has active protection
if (bonusProtectorService.hasActiveProtector()) {
  // Show active badge
  const level = bonusProtectorService.protectionLevel(); // 1, 2, or 3
  const daysLeft = bonusProtectorService.activeProtector()?.days_until_expiry;
}

// Check expiry status
if (bonusProtectorService.isExpired()) {
  // Show renewal prompt
}

if (bonusProtectorService.isNearExpiry()) {
  // Show expiry warning (≤30 days)
}
```

---

## Integration Points

### 1. Claim Processing (PENDING IMPLEMENTATION)
**Location**: Claim approval workflow
**Action**: Call `apply_bonus_protector()` when claim approved
**Impact**: Prevent class downgrade if protection active

### 2. Pricing Calculation
**Location**: `PricingService.calculate()`
**Impact**: Apply fee/guarantee multipliers based on class
**Method**: Query `pricing_class_factors` with driver's current class

### 3. Wallet Operations
**Location**: `WalletService`
**Action**: Deduct purchase amount from `available_balance`
**Recording**: Create `wallet_ledger` entry with `kind='addon_purchase'`

### 4. Accounting System
**Location**: Accounting Edge Functions
**Action**: Recognize revenue from protector purchases
**Method**: Query `wallet_ledger` entries of type 'addon_purchase'

---

## Differences: v1 vs v2 Migrations

### Schema (Both similar)
- Table created with same structure
- v2 cleaner organization in migration file

### RPC Functions
| Feature | v1 | v2 |
|---------|----|----|
| Expiry Duration | 365 days | 6 months |
| Return Type | Return statement | Return QUERY |
| Max Claims Calc | hardcoded per level | `protection_level` value |
| Transaction Recording | wallet_transactions | wallet_ledger |
| Function Naming | 4 functions | 3 functions (consolidated) |

### Current Status
- **Production**: Using v2 (20251106)
- **Deprecated**: v1 (20251105) kept for reference

---

## Testing Checklist

### Unit Tests
- [ ] BonusProtectorService mocking
- [ ] Purchase validation (level, funds)
- [ ] Protection application logic
- [ ] Computed signals updates
- [ ] Error handling

### Integration Tests
- [ ] Wallet deduction on purchase
- [ ] Addon creation in DB
- [ ] Ledger transaction recording
- [ ] RLS policy enforcement
- [ ] Class history audit trail

### E2E Tests
- [ ] Purchase flow (UI → RPC → DB)
- [ ] Protection application on claim
- [ ] Expiry handling
- [ ] Multiple users isolation
- [ ] Concurrent purchases

---

## Common Issues & Solutions

### Issue: Insufficient Funds
**Symptom**: Purchase returns success=FALSE
**Cause**: available_balance < price/100
**Solution**: Check wallet before purchase, show deposit prompt

### Issue: Protection Not Applied
**Symptom**: Class increases despite active protector
**Cause**: `apply_bonus_protector()` not called in claim workflow
**Solution**: Implement integration in claim approval process

### Issue: Expired Protector Still Active
**Symptom**: `get_active_bonus_protector()` returns active despite expires_at < NOW()
**Cause**: RLS policy not checking expiry
**Solution**: Already fixed in v2 RPC with `(expires_at IS NULL OR expires_at > NOW())`

### Issue: Wrong Protection Level Returned
**Symptom**: Level doesn't match what user purchased
**Cause**: Querying old v1 migration data
**Solution**: Check migration order, ensure v2 runs after v1

---

## Performance Considerations

### Indexes
- ✅ `idx_driver_protection_addons_user_id` - Fast user lookups
- ✅ `idx_driver_protection_addons_addon_type` - Fast type filtering
- ✅ `idx_driver_protection_addons_active` - Fast active queries
- ✅ `idx_driver_protection_addons_expires` - Fast expiry checks

### Query Optimization
- RPC functions use indexed filters
- No N+1 queries in Angular service
- Computed signals cache results
- Wallet balance lookup is primary key access

---

## Security Notes

### Wallet Deduction
- Atomic transaction (all-or-nothing)
- Verified before deduction
- Logged in wallet_ledger
- RLS prevents other users seeing transactions

### RPC Authorization
- All RPCs use SECURITY DEFINER
- Can be called by authenticated users
- Service role for updates
- No direct table access needed

### Claim Application
- Only via RPC (prevents manual manipulation)
- Audit trail in driver_class_history
- Protection marked as "used" atomically
- Class history records intent

---

## Navigation Quick Links

**Full Analysis**: `/home/user/autorenta/BONUS_PROTECTOR_BACKEND_ANALYSIS.md`

**Database Schema**: `/home/user/autorenta/supabase/migrations/20251106_create_bonus_malus_core_tables.sql` (Lines 150-214)

**RPC Implementation**: `/home/user/autorenta/supabase/migrations/20251106_create_bonus_protector_rpcs.sql`

**Service Code**: `/home/user/autorenta/apps/web/src/app/core/services/bonus-protector.service.ts`

**Component**: `/home/user/autorenta/apps/web/src/app/shared/components/bonus-protector-purchase/`

**Tests**: `/home/user/autorenta/apps/web/src/app/core/services/bonus-protector.service.spec.ts`
