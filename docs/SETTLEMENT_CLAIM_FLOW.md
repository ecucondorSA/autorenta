# Flow: Settlement and Claim Processing

**Last Updated:** 2025-11-06  
**Complexity:** VERY HIGH (4 service dependencies, complex FGO logic)  
**Critical Path:** YES (Insurance system)

---

## Overview

This document maps the complete settlement/claim flow from incident reporting through FGO (Fondo de Garantía de Origin) waterfall execution and claim payment. This is one of the most complex flows in AutoRenta, involving risk assessment, insurance eligibility, and multi-step payment waterfall logic.

---

## Entry Points

### 1. Renter Entry Point - Report Incident

**Component:** ReportClaimPage  
**File:** `apps/web/src/app/features/bookings/report-claim/report-claim.page.ts` (Lines 1-551)  
**Purpose:** Allows renters to report accidents/incidents during rental

**Form Inputs:**
- claim_type: 'collision' | 'theft' | 'fire' | 'vandalism' | 'misappropriation' | 'other'
- incident_date: ISO timestamp
- location: Text with geolocation option
- description: 0-1000 characters
- photos: 0-10 uploads, max 5MB each
- police_report_number: Optional

**Submit Flow:**
```
submitClaim() → proceedWithSubmit() (Line 461-480)
  ├─ insuranceService.reportClaim(claimData) (Line 487)
  ├─ RPC: report_insurance_claim()
  └─ Navigates to /bookings/{bookingId}
```

### 2. Owner Entry Point - Report Damage & Settlement

**Component:** ClaimFormComponent  
**File:** `apps/web/src/app/shared/components/claim-form/claim-form.component.ts` (Lines 1-269)  
**Purpose:** Owner reports damage with settlement calculation

**Damage Items:**
- type: DamageType (scratch, dent, broken_glass, tire_damage, mechanical, interior, missing_item, other)
- severity: 'minor' | 'moderate' | 'severe'
- description: Text
- estimatedCostUsd: Auto-calculated from type+severity
- photos: Evidence images

**Submit Flow:**
```
submit() → settlementService.createClaim() (Line 213-242)
  ├─ Validates damages
  ├─ Calculates total cost
  └─ Returns Claim object
```

---

## Service Layer - SettlementService

**File:** `apps/web/src/app/core/services/settlement.service.ts` (Lines 1-550)

### Architecture

```typescript
SettlementService (Injectable, providedIn: 'root')
├─ SupabaseClientService → Database access
├─ FgoV1_1Service → Eligibility & waterfall execution
├─ RiskMatrixService → Risk policy calculations
└─ FgoService → Legacy FGO ledger operations
```

**Total Dependencies:** 4

### Core Methods

#### 1. validateInspections(bookingId)
**Lines:** 104-129

**Purpose:** Ensures check-in and check-out inspections are complete

```typescript
Flow:
1. Get inspections via FgoV1_1Service.getInspections()
2. Check check_in: 8+ photos, odometer, fuel, signature
3. Check check_out: Same requirements
4. Return: { valid: boolean, missing: InspectionStage[] }
```

**Why Required:** Inspections provide evidence baseline to compare damage against.

#### 2. createClaim(bookingId, damages[], notes?)
**Lines:** 159-212

```typescript
Flow:
1. validateInspections() → if failed, return null
2. Calculate totalEstimatedCostUsd = SUM(damages.estimatedCostUsd)
3. Get current user from auth
4. Create Claim object:
   - id: UUID
   - bookingId, reportedBy
   - damages: DamageItem[]
   - totalEstimatedCostUsd
   - status: 'draft'
5. Set currentClaim signal
6. Return Claim | null
```

#### 3. evaluateClaim(claim)
**Lines:** 216-247

**Purpose:** Assess FGO eligibility for claim

```typescript
Flow:
1. getRiskSnapshot(bookingId) → BookingRiskSnapshot
2. Convert claim to local currency cents:
   claimAmountCents = usdToCents(claim.totalEstimatedCostUsd × fx)
3. Call FgoV1_1Service.assessEligibility({
     bookingId,
     claimAmountCents
   })
4. Return EligibilityResult | null
```

**Key:** Uses FX snapshot from booking creation for multimoneda consistency.

#### 4. processClaim(claim)
**Lines:** 249-389

**MOST CRITICAL METHOD** - Orchestrates entire claim processing

**PHASE 1: VALIDATION (Lines 258-301)**
```typescript
1. getRiskSnapshot(bookingId)
2. Get booking → car_id
3. Get car → price_per_day (for risk band)
4. getRiskPolicy(price_per_day) from RiskMatrixService
```

**PHASE 2: ELIGIBILITY (Lines 303-312)**
```typescript
1. evaluateClaim(claim)
2. If not eligible:
   claim.status = 'rejected'
   return { ok: false, eligibility }
3. If eligible: continue
```

**PHASE 3: WATERFALL EXECUTION (Lines 314-351)**

**4-Step Payment Waterfall:**

```typescript
claimAmountCents = usdToCents(claim.totalEstimatedCostUsd × fx)
breakdown = { holdCaptured, walletDebited, extraCharged, fgoPaid, remainingUncovered }

STEP 1: Hold Capture (Lines 325-331)
  IF snapshot.hasCard AND estimated_hold_amount > 0:
    holdCaptured = MIN(remaining, estimated_hold_amount)
    remaining -= holdCaptured

STEP 2: Wallet Debit (Lines 332-338)
  IF snapshot.hasWalletSecurity AND estimated_deposit > 0:
    walletDebited = MIN(remaining, estimated_deposit)
    remaining -= walletDebited

STEP 3: Extra Charge (Lines 340-343)
  IF remaining > 0:
    franchiseCents = franchise_usd × 100 × fx
    maxExtra = MAX(0, franchise - (hold + wallet))
    extraCharged = MIN(remaining, maxExtra)
    remaining -= extraCharged

STEP 4: FGO Coverage (Lines 345-351)
  IF remaining > 0:
    fgoPaid = MIN(remaining, eligibility.maxCoverCents)
    remaining -= fgoPaid

STEP 5: Uncovered (Line 353)
  remainingUncovered = remaining
```

**PHASE 4: FINALIZATION (Lines 365-371)**
```typescript
1. claim.status = 'paid'
2. claim.updatedAt = new Date()
3. currentClaim.set(claim)
Return ClaimProcessingResult
```

---

## FGO v1.1 Service - Eligibility & Waterfall

**File:** `apps/web/src/app/core/services/fgo-v1-1.service.ts` (Lines 1-675)

### RPC Call 1: assessEligibility(params)
**Lines:** 473-510

**Calls RPC:** `fgo_assess_eligibility(p_booking_id, p_claim_amount_cents)`

**Returns:**
```typescript
EligibilityResult {
  eligible: boolean,
  reasons: string[],           // Why ineligible
  rc: number | null,           // Coverage Ratio
  rcStatus: 'healthy'|'warning'|'critical',
  franchisePercentage: number, // Deductible if RC low
  maxCoverCents: number,       // Max FGO will pay
  maxCoverUsd: number,
  eventCapUsd: number,         // Per-event cap
  monthlyPayoutUsedCents,
  monthlyCapCents,
  userEventsQuarter,
  userEventLimit,
  fgoBalanceCents
}
```

### RPC Call 2: executeWaterfall(params)
**Lines:** 516-555

**Calls RPC:** `fgo_execute_waterfall(...)`

**Returns:**
```typescript
WaterfallResult {
  ok: boolean,
  bookingId,
  totalClaimCents,
  breakdown: {
    holdCaptured,
    walletDebited,
    extraCharged,
    fgoPaid,
    remainingUncovered
  },
  fgoMovementId,
  fgoRef,
  eligibility: EligibilityResult,
  executedAt: Date
}
```

---

## Database Layer - FGO v1.1 RPCs

**File:** `supabase/migrations/20251024_fgo_v1_1_enhancements.sql`

### Key Tables

**1. fgo_parameters (Lines 22-64)**

Operational parameters per country/bucket:
- alpha: NUMERIC [0.08-0.22] - Dynamic contribution rate
- rc_floor: NUMERIC [0.90] - RC threshold
- rc_hard_floor: NUMERIC [0.80] - Hard limit
- monthly_payout_cap: NUMERIC [0.08 = 8%]
- per_user_limit: INTEGER [2] - Events per quarter
- event_cap_usd: NUMERIC [800] - Max per event

**Initial Data:**
```sql
AR/default: α=15%, rc_floor=90%, event_cap=$800
AR/economy: α=18%, rc_floor=95%, event_cap=$600
AR/premium: α=15%, rc_floor=90%, event_cap=$1200, per_user=3
AR/luxury:  α=12%, rc_floor=85%, event_cap=$2000, per_user=3
```

**2. booking_risk_snapshot (Lines 69-99)**

Captures risk profile & FX at booking:
- country_code, bucket
- fx_snapshot: ARS/USD rate
- estimated_hold_amount (ARS)
- estimated_deposit (ARS)
- franchise_usd
- has_card, has_wallet_security

**3. booking_inspections (Lines 104-131)**

Evidence at check-in/check-out:
- stage: 'check_in' | 'check_out'
- photos: JSONB [8+ required]
- odometer, fuel_level
- signed_at

**Validation:** isInspectionComplete = photos ≥ 8 AND odometer AND fuel AND signed

**4. fgo_movements (Lines 137-152)**

Ledger of FGO transactions:
- movement_type: 'siniestro_payment' | 'franchise_payment' | 'recovery' | 'contribution'
- operation: 'debit' | 'credit'
- amount_cents
- fx_snapshot

### RPC: fgo_assess_eligibility()
**Lines:** 396-553

**4 Gates to Pass:**

**GATE 1: RC Solvency Check (Lines 466-478)**
```sql
v_rc := calculate_rc_v1_1(country, bucket)

IF v_rc < rc_hard_floor (0.8):
  eligible := FALSE
  max_cover := 10,000 cents (USD 100 only!)
  reason: "RC below hard floor (CRITICAL)"

ELSIF v_rc < rc_floor (0.9):
  franchise_pct := 20.0%
  reason: "RC below floor - 20% franchise applied"
ELSE:
  franchise_pct := 0.0%
```

**GATE 2: Monthly Payout Cap (Lines 480-494)**
```sql
monthly_cap := fgo_balance × monthly_payout_cap (0.08)
monthly_used := SUM(fgo_movements.amount_cents this month)

IF monthly_used + claim_amount > monthly_cap:
  eligible := FALSE
  reason: "Monthly payout cap exceeded"
```

**GATE 3: User Event Limit (Lines 496-510)**
```sql
user_events := COUNT(DISTINCT booking_id)
  WHERE locatario_id = user
  AND movement_type IN ('siniestro_payment', 'franchise_payment')
  AND ts >= NOW() - INTERVAL '3 months'

IF user_events >= per_user_limit (2):
  eligible := FALSE
  reason: "User limit exceeded (X events/quarter)"
```

**GATE 4: Event Cap (Lines 512-524)**
```sql
event_cap_usd := fgo_parameters.event_cap_usd (800)
max_cover_cents := LEAST(
  (event_cap_usd × 100 × fx_snapshot)::BIGINT,
  p_claim_amount_cents
)

-- Apply franchise deduction if RC low
IF franchise_pct > 0:
  max_cover_cents := max_cover_cents × (100 - franchise_pct) / 100

-- Cap at available balance
max_cover_cents := LEAST(max_cover_cents, fgo_balance)
```

### RPC: fgo_execute_waterfall()
**Lines:** 558-741

**VALIDATION PHASE (Lines 582-603)**
```sql
1. Check for check_out inspection
   IF NOT EXISTS (stage = 'check_out'):
     RETURN { ok: FALSE, error: 'Missing check-out inspection' }

2. Get booking_risk_snapshot
   IF NOT FOUND:
     RETURN { ok: FALSE, error: 'No risk snapshot' }
```

**ELIGIBILITY CHECK (Lines 605-614)**
```sql
v_eligibility := fgo_assess_eligibility(p_booking_id, p_total_claim_cents)
IF NOT v_eligibility.eligible:
  RETURN { ok: FALSE, error: 'Not eligible', eligibility }
```

**WATERFALL EXECUTION (Lines 616-716)**
```sql
v_remaining := p_total_claim_cents

STEP 1: Capture Hold
  IF has_card AND estimated_hold_amount > 0:
    v_hold_captured := LEAST(v_remaining, estimated_hold_amount)
    v_remaining -= v_hold_captured

STEP 2: Debit Wallet Security
  IF has_wallet_security AND estimated_deposit > 0 AND v_remaining > 0:
    v_wallet_debited := LEAST(v_remaining, estimated_deposit)
    v_remaining -= v_wallet_debited

STEP 3: Extra Charge (Card-on-File)
  IF v_remaining > 0:
    v_franchise_cents := franchise_usd × 100 × fx_snapshot
    v_already_charged := hold_captured + wallet_debited
    v_max_extra := MAX(0, franchise_cents - already_charged)
    v_extra_charged := LEAST(v_remaining, v_max_extra)
    v_remaining -= v_extra_charged

STEP 4: FGO Coverage
  IF v_remaining > 0:
    v_fgo_paid := LEAST(v_remaining, eligibility.max_cover_cents)
    
    IF v_fgo_paid > 0:
      -- Lock liquidity subfund (pessimistic lock)
      SELECT balance_cents FROM fgo_subfunds
      WHERE subfund_type = 'liquidity'
      FOR UPDATE
      
      -- Record movement
      INSERT INTO fgo_movements (
        movement_type: 'siniestro_payment',
        amount_cents: v_fgo_paid,
        operation: 'debit',
        booking_id, country_code, currency, fx_snapshot
      ) RETURNING id INTO v_movement_id

      v_remaining -= v_fgo_paid
    END IF
  END IF

RETURN {
  ok: TRUE,
  breakdown: { hold_captured, wallet_debited, extra_charged, fgo_paid, remaining_uncovered },
  fgo_movement_id, fgo_ref
}
```

---

## Waterfall Example

**Scenario:** Claim USD 2,000 with FX 1.7 (ARS/USD)

**Booking Configuration:**
- Has credit card: YES
- Card hold: ARS 2,000,000 (USD 1,176)
- Has wallet security: YES (USD 300 = ARS 510,000)
- Franchise: USD 1,000 (ARS 1,700,000 @ 1.7 FX)
- FGO balance: USD 50,000
- RC: 1.05 (healthy)
- User events this quarter: 0

**Claim Amount:** ARS 3,400,000 (USD 2,000 @ 1.7 FX)

**Waterfall Execution:**
```
├─ STEP 1: Hold Capture
│  Capture: MIN(3,400,000, 2,000,000) = ARS 2,000,000
│  Remaining: 1,400,000
│
├─ STEP 2: Wallet Debit
│  Capture: MIN(1,400,000, 510,000) = ARS 510,000
│  Remaining: 890,000
│
├─ STEP 3: Extra Charge
│  Franchise: ARS 1,700,000
│  Already charged: 2,000,000 + 510,000 = ARS 2,510,000
│  Exceeds franchise → MAX(0, 1,700,000 - 2,510,000) = 0
│  Extra: ARS 0
│  Remaining: 890,000
│
├─ STEP 4: FGO Coverage
│  Eligibility max: ARS 1,700,000 (USD 1,000)
│  FGO paid: MIN(890,000, 1,700,000) = ARS 890,000
│  Remaining: 0
│
└─ FINAL BREAKDOWN:
   Hold captured: ARS 2,000,000 (59%)
   Wallet debited: ARS 510,000 (15%)
   Extra charged: ARS 0 (0%)
   FGO paid: ARS 890,000 (26%)
   Uncovered: ARS 0 ✓ FULLY COVERED
```

---

## Success & Error Paths

### ✓ Success: Eligible & Fully Covered
```
createClaim() → evaluateClaim() → eligible=true
  ↓
processClaim()
  ├─ validateInspections() → valid=true
  ├─ assessEligibility() → eligible=true
  ├─ executeWaterfall() → ok=true
  └─ claim.status='paid'

Return: ClaimProcessingResult { ok: true, breakdown }
```

### ✗ Error: Missing Inspections
```
createClaim() → validateInspections() → valid=false, missing=['check_out']
  ↓
error.set('Faltan inspecciones: check_out')
  ↓
Return: null

UI: "Debe completar la inspección de check-out antes de reportar"
```

### ✗ Error: RC Critical (< 0.8)
```
evaluateClaim() → assessEligibility() GATE 1
  ↓
RC = 0.75 < 0.8 hard_floor
  ↓
eligible = false, maxCoverCents = 1,000 (USD 10 only!)
  ↓
processClaim() → claim.status = 'rejected'

UI: "FGO insufficient for coverage at this time"
```

### ✗ Error: Monthly Cap Exceeded
```
evaluateClaim() → assessEligibility() GATE 2
  ↓
monthly_cap = 50,000 × 0.08 = USD 4,000
monthly_used = USD 6,000 (already)
6,000 + 2,000 = 8,000 > 4,000
  ↓
eligible = false

UI: "Monthly FGO limit reached. Resubmit next month."
```

### ✗ Error: User Quarterly Limit
```
evaluateClaim() → assessEligibility() GATE 3
  ↓
user_events = 2 (limit = 2)
2 >= 2 → eligible = false

UI: "Quarterly claim limit reached (2/2)"
```

---

## File References

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Settlement Service | `core/services/settlement.service.ts` | 1-550 | Orchestrates claim flow |
| FGO v1.1 Service | `core/services/fgo-v1-1.service.ts` | 1-675 | RPC calls for eligibility & waterfall |
| Risk Matrix Service | `core/services/risk-matrix.service.ts` | 1-110 | Risk band mapping |
| Report Claim (Renter) | `features/bookings/report-claim/report-claim.page.ts` | 1-551 | Insurance claim entry |
| Claim Form (Owner) | `shared/components/claim-form/claim-form.component.ts` | 1-269 | Damage claim form |
| FGO v1.1 Migration | `supabase/migrations/20251024_fgo_v1_1_enhancements.sql` | 1-800+ | Schema & RPCs |

---

## Related Documentation

- **Booking Creation:** See `docs/flows/FLOW_BOOKING_CREATION.md`
- **Payment Checkout:** See `docs/flows/FLOW_PAYMENT_CHECKOUT.md`
- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`

---

**Last Verified:** 2025-11-06
