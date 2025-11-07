# Bonus Protector Backend Infrastructure - Complete Analysis

## 1. DATABASE SCHEMA

### Table: `driver_protection_addons`
**Location**: Defined in `/home/user/autorenta/supabase/migrations/20251106_create_bonus_malus_core_tables.sql`

#### Columns:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
addon_type TEXT NOT NULL CHECK (addon_type IN ('bonus_protector', 'deductible_shield', 'premium_coverage'))
purchase_date TIMESTAMPTZ DEFAULT NOW()
expires_at TIMESTAMPTZ
price_paid_cents BIGINT NOT NULL CHECK (price_paid_cents >= 0)
currency TEXT NOT NULL DEFAULT 'USD'
protection_level INTEGER DEFAULT 1 CHECK (protection_level BETWEEN 1 AND 3)
max_protected_claims INTEGER DEFAULT 1 CHECK (max_protected_claims > 0)
claims_used INTEGER DEFAULT 0 CHECK (claims_used >= 0)
is_active BOOLEAN DEFAULT TRUE
used_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()

Constraints:
- CHECK (claims_used <= max_protected_claims)
- CHECK (expires_at IS NULL OR expires_at > purchase_date)
```

#### Indexes:
```sql
idx_driver_protection_addons_user_id
idx_driver_protection_addons_addon_type
idx_driver_protection_addons_active (WHERE is_active = TRUE)
idx_driver_protection_addons_expires (WHERE expires_at IS NOT NULL)
```

#### RLS Policies:
- SELECT: Users can view own protection addons
- INSERT: Users can purchase protection addons
- UPDATE: Service role only (SECURITY DEFINER functions)

---

## 2. RPC METHODS

### 2.1 `purchase_bonus_protector(p_user_id, p_protection_level, p_price_cents)`
**Location**: `/home/user/autorenta/supabase/migrations/20251106_create_bonus_protector_rpcs.sql`

**Function Signature**:
```typescript
purchase_bonus_protector(
  p_user_id: UUID,
  p_protection_level: INTEGER DEFAULT 1,
  p_price_cents: BIGINT DEFAULT 1500
) → TABLE(
  success BOOLEAN,
  message TEXT,
  addon_id UUID,
  protection_level INTEGER,
  max_protected_claims INTEGER,
  expires_at TIMESTAMPTZ,
  price_paid_cents BIGINT
)
```

**Parameters**:
- `p_user_id`: User ID (UUID)
- `p_protection_level`: 1, 2, or 3 (defaults to 1)
- `p_price_cents`: Price in cents (defaults to 1500 = $15 USD)

**Returns**:
- `success`: Boolean indicating if purchase succeeded
- `message`: Human-readable message
- `addon_id`: ID of created addon record
- `protection_level`: The protection level purchased
- `max_protected_claims`: Number of claims this protects (equal to protection_level)
- `expires_at`: Expiration timestamp (6 months from now)
- `price_paid_cents`: Price charged in cents

**Business Logic**:
1. Validates protection level is 1-3
2. Retrieves user's wallet
3. Checks sufficient available balance
4. Calculates `max_protected_claims = protection_level`
5. Sets expiration to 6 months from now
6. Deducts from wallet `available_balance`
7. Creates `driver_protection_addons` record with `is_active = TRUE`
8. Records transaction in `wallet_ledger` with kind='addon_purchase'

**Error Cases**:
- Protection level < 1 or > 3: Exception
- Wallet not found: Exception
- Insufficient funds: Returns success=FALSE with message

---

### 2.2 `apply_bonus_protector(p_user_id, p_claim_id, p_claim_severity)`
**Location**: `/home/user/autorenta/supabase/migrations/20251106_create_bonus_protector_rpcs.sql`

**Function Signature**:
```typescript
apply_bonus_protector(
  p_user_id: UUID,
  p_claim_id: UUID,
  p_claim_severity: INTEGER
) → TABLE(
  success BOOLEAN,
  message TEXT,
  protection_applied BOOLEAN,
  class_before INTEGER,
  class_after INTEGER,
  class_change_prevented INTEGER,
  addon_id UUID,
  remaining_uses INTEGER
)
```

**Parameters**:
- `p_user_id`: User ID (UUID)
- `p_claim_id`: Booking claim ID (UUID)
- `p_claim_severity`: 1 (light), 2 (moderate), or 3 (severe)

**Returns**:
- `success`: Always TRUE (operation successful)
- `message`: Human-readable message about what happened
- `protection_applied`: Whether protection was actually used
- `class_before`: Driver's class before claim processing
- `class_after`: Driver's class after claim processing
- `class_change_prevented`: Number of class points prevented from increasing
- `addon_id`: ID of protector addon used (NULL if no protection)
- `remaining_uses`: How many protected claims left (after this one)

**Business Logic**:
1. Queries for active `driver_protection_addons` where:
   - `addon_type = 'bonus_protector'`
   - `is_active = TRUE`
   - `claims_used < max_protected_claims`
   - `(expires_at IS NULL OR expires_at > NOW())`
2. If no active protector found: Returns success=TRUE, protection_applied=FALSE
3. If active protector found:
   - Calculates `class_change = severity` (1, 2, or 3 points)
   - Updates addon: `claims_used += 1`
   - Deactivates addon if `claims_used >= max_protected_claims`
   - Records in `driver_class_history` with reason='bonus_protector_applied'
   - Returns protection_applied=TRUE, class_after=class_before (no increase)

**Called During**: Claim processing workflow (integration point with claim management system)

---

### 2.3 `get_active_bonus_protector(p_user_id DEFAULT NULL)`
**Location**: `/home/user/autorenta/supabase/migrations/20251106_create_bonus_protector_rpcs.sql`

**Function Signature**:
```typescript
get_active_bonus_protector(p_user_id: UUID DEFAULT NULL) → TABLE(
  has_active_protector BOOLEAN,
  addon_id UUID,
  protection_level INTEGER,
  max_protected_claims INTEGER,
  claims_used INTEGER,
  remaining_uses INTEGER,
  purchase_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiration INTEGER,
  is_expired BOOLEAN
)
```

**Parameters**:
- `p_user_id`: Optional user ID (defaults to current authenticated user)

**Returns**:
- `has_active_protector`: TRUE if user has active protector
- `addon_id`: ID of protector addon
- `protection_level`: 1, 2, or 3
- `max_protected_claims`: Total claims this protector covers
- `claims_used`: Number of claims already used
- `remaining_uses`: `max_protected_claims - claims_used`
- `purchase_date`: When purchased
- `expires_at`: When it expires
- `days_until_expiration`: Days remaining
- `is_expired`: TRUE if expired (expires_at < NOW())

**Business Logic**:
1. Uses current auth.uid() if p_user_id not provided
2. Queries active addon with same criteria as apply_bonus_protector
3. If no active protector: Returns all NULLs except has_active_protector=FALSE
4. Calculates days_until_expiration from expires_at
5. Returns complete status for UI display

---

### 2.4 `list_bonus_protector_options()` [DEPRECATED]
**Location**: `/home/user/autorenta/supabase/migrations/20251105_create_bonus_protector_rpcs.sql`

**Note**: This is the old v1 migration. The v2 migration (20251106) supersedes it.

**Returns**: Options like:
- Level 1: $15 USD, 365 days validity
- Level 2: $25 USD, 365 days validity  
- Level 3: $40 USD, 365 days validity

---

## 3. TYPESCRIPT TYPES & INTERFACES

### Service: `BonusProtectorService`
**Location**: `/home/user/autorenta/apps/web/src/app/core/services/bonus-protector.service.ts`

#### Interfaces (Exported):
```typescript
export interface BonusProtectorOption {
  protection_level: number;
  price_cents: number;
  price_usd: number;
  description: string;
  validity_days: number;
}

export interface ActiveBonusProtector {
  addon_id: string;
  protection_level: number;
  purchase_date: string;
  expires_at: string;
  days_until_expiry: number;
  price_paid_usd: number;
}
```

#### Service State Management:
- Uses Angular Signals for reactive state
- Stores: options[], activeProtector, loading, error
- Computed signals: hasActiveProtector, protectionLevel, isNearExpiry, isExpired

#### Key Methods:
```typescript
async loadOptions(): Promise<BonusProtectorOption[]>
async loadActiveProtector(): Promise<ActiveBonusProtector | null>
async purchaseProtector(level: number): Promise<string>
async canPurchase(level: number): Promise<{can: boolean; reason: string}>
getRecommendedLevel(driverClass: number): number
getProtectionCapacity(level: number): {leve, moderado, grave, description}
calculatePotentialSavings(...): {feeIncrease, guaranteeIncrease, totalSavings, isWorthIt}
simulateClaimImpact(...): {withoutProtector, withProtector, savings}
```

---

## 4. FRONTEND COMPONENT

### Component: `BonusProtectorPurchaseComponent`
**Location**: `/home/user/autorenta/apps/web/src/app/shared/components/bonus-protector-purchase/bonus-protector-purchase.component.ts`

**Features**:
- Displays purchase options with recommended level
- Shows active protector status with expiry warning
- Calculates estimated savings by level
- Includes claim impact simulator
- Integration with wallet verification
- Confirmation dialog before purchase

**Template Sections**:
1. Active Protector Display (if exists)
2. Expired Protector Warning
3. Recommendation Banner (based on driver class)
4. Purchase Options (Levels 1-3)
5. Protection Capacity Display
6. Savings Estimation
7. Claim Impact Simulator
8. How it Works Info Card

---

## 5. PROTECTION CREDIT (CP) INTEGRATION

**Location**: `/home/user/autorenta/supabase/migrations/20251105_create_protection_credit_rpcs.sql`

**Related Service**: `ProtectionCreditService`

**Related RPC**: `get_protection_credit_balance(user_id)`

**Note**: Bonus Protector and Protection Credit are separate systems:
- **Bonus Protector**: Prevents class increase on claims
- **Protection Credit**: Covers claim costs (waterfall: CP → Wallet → External)

---

## 6. PRICING CONFIGURATION

### Pricing Table: `pricing_class_factors`
**Location**: Defined in core tables migration

```sql
class INTEGER PRIMARY KEY (0-10)
fee_multiplier DECIMAL(5,3)
guarantee_multiplier DECIMAL(5,3)
description TEXT
is_active BOOLEAN DEFAULT TRUE
```

**Usage**: Used in pricing calculations based on driver class

---

## 7. RELATED TABLES

### `driver_risk_profile`
```sql
user_id UUID PRIMARY KEY
class INTEGER (0-10, default 5)
driver_score INTEGER (0-100)
last_claim_at TIMESTAMPTZ
good_years INTEGER
total_claims INTEGER
claims_with_fault INTEGER
last_class_update TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `driver_class_history` (Audit Trail)
```sql
id UUID PRIMARY KEY
user_id UUID
old_class INTEGER
new_class INTEGER
class_change INTEGER
reason TEXT (values include 'bonus_protector_applied')
claim_id UUID
notes TEXT
created_at TIMESTAMPTZ
```

### `booking_claims`
```sql
id UUID PRIMARY KEY
booking_id UUID
user_id UUID
claim_amount_cents BIGINT
severity INTEGER (1, 2, or 3)
fault_attributed BOOLEAN
status TEXT ('pending', 'approved', 'rejected', 'resolved', 'cancelled')
resolution_notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## 8. WALLET INTEGRATION

### Modifications to `user_wallets` table:
```sql
protection_credit_cents BIGINT DEFAULT 0
protection_credit_currency VARCHAR(3) DEFAULT 'USD'
protection_credit_issued_at TIMESTAMPTZ
protection_credit_expires_at TIMESTAMPTZ
```

### Related table: `wallet_ledger`
Used for recording bonus protector purchases with:
- `kind = 'addon_purchase'`
- `amount_cents = -price_cents` (negative because deducted)
- `meta.addon_id`, `meta.protection_level`, `meta.expires_at`

---

## 9. CURRENT IMPLEMENTATION STATUS

### Completed (v2 - 2025-11-06):
✅ Database schema (driver_protection_addons table)
✅ RPC methods (purchase, apply, get_active)
✅ TypeScript service (BonusProtectorService)
✅ Purchase component (BonusProtectorPurchaseComponent)
✅ Wallet integration
✅ Integration with driver_risk_profile
✅ Audit trail (driver_class_history)

### In Progress/Planned:
- 🟡 Claim processing integration (apply_bonus_protector not yet called)
- 🟡 Accounting integration (FASE 6)
- 🟡 Admin dashboard for protector management
- 🟡 Analytics/reporting

---

## 10. KEY MIGRATION FILES (Chronological)

1. **20251105_create_bonus_protector_rpcs.sql** - v1 (Old version)
2. **20251105_create_bonus_malus_system.sql** - Core tables (driver_protection_addons defined)
3. **20251105_create_protection_credit_rpcs.sql** - CP system
4. **20251106_create_bonus_malus_core_tables.sql** - Cleaner v2 of core tables
5. **20251106_create_bonus_protector_rpcs.sql** - v2 RPC functions (current)
6. **20251105_bonus_malus_accounting_integration.sql** - Accounting hooks
7. **20251106_bonus_malus_accounting_integration.sql** - Updated accounting

---

## 11. VALIDATION RULES

### Purchase Validation:
- `protection_level`: Must be 1, 2, or 3
- `price_cents`: Typically 1500, 2500, or 4000 (depending on level)
- Wallet balance: Must have available_balance >= price/100
- Existing protector: Can only have 1 active at a time (in v1 migration) but v2 allows multiple

### Apply Validation:
- Must have active addon: `is_active=TRUE AND claims_used < max_protected_claims AND expires_at > NOW()`
- Claim severity: 1, 2, or 3 (maps to class change amount)
- User must exist: Has driver_risk_profile record

---

## 12. ERROR HANDLING

### Purchase Errors:
- Invalid protection level → Exception
- Wallet not found → Exception  
- Insufficient funds → Returns success=FALSE
- Transaction failure → Rollback (within transaction)

### Apply Errors:
- User not authenticated → Exception
- Driver profile not found → Exception
- Claim processing failures → Handled gracefully

---

## 13. SECURITY CONSIDERATIONS

### RLS Policies:
- Only users can view/purchase their own protectors
- Service role can update (via SECURITY DEFINER functions)
- All RPC functions use SECURITY DEFINER for elevated privileges

### Wallet Deduction:
- Happens within atomic transaction
- Rollback on any error
- Recorded in wallet_ledger for audit

### Protection Application:
- Only callable via RPC (not direct SQL)
- SECURITY DEFINER prevents unauthorized updates
- All changes logged in driver_class_history

