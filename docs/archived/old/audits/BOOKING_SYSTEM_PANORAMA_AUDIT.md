# 📊 Booking System Panorama - Critical Issues & Unification Plan

**Date:** 2025-01-25  
**Status:** 🔴 Critical - Multiple Breaking Issues  
**Priority:** P0 - Immediate Action Required

---

## 🎯 Executive Summary

The booking system has **two parallel payment flows** that are fundamentally incompatible:
1. **Legacy Flow**: `detail-payment` (pre-booking, sessionStorage-based, broken schema)
2. **Modern Flow**: `checkout/:bookingId` (post-booking, wallet-integrated, working)

**Critical Impact:**
- ❌ "Completar Pago" button produces 404 errors
- ❌ Database schema mismatches prevent booking creation
- ❌ Risk snapshots violate FK constraints
- ❌ Duplicate payment logic with divergent rules
- ❌ Status `pending_confirmation` breaks MercadoPago webhooks

---

## 🔴 Critical Issues (Blocking)

### 1. **Route Mismatch - 404 on "Completar Pago"**
**File:** `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html:108`

```html
<!-- CURRENT (BROKEN) -->
<button [routerLink]="['/booking-detail-payment', booking.id]">
  💳 Completar Pago
</button>
```

**Problem:**
- Route `/booking-detail-payment/:id` doesn't exist
- Actual route is `/bookings/detail-payment` (without ID)
- Should redirect to `/bookings/checkout/:bookingId` (modern flow)

**Impact:** Users cannot complete payments from booking list

---

### 2. **Schema Violation - Invalid Booking Insert**
**File:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:584`

```typescript
// CURRENT (BROKEN)
const bookingData = {
  user_id: userId,           // ❌ Column doesn't exist (should be renter_id)
  start_date: startDate,     // ❌ Should be start_at (timestamp)
  total_price_usd: priceUsd, // ❌ Should be total_amount (bigint cents)
  status: 'pending_confirmation', // ❌ Not in booking_status enum
  risk_snapshot_id: snapshotId,   // ❌ FK points to non-existent booking
};
```

**Actual Schema:**
- `renter_id` (not user_id)
- `start_at` / `end_at` (timestamptz)
- `total_amount` (bigint, cents)
- `status` enum: `pending` | `confirmed` | `active` | `completed` | `cancelled`

**Impact:** All booking creation attempts fail with constraint violations

---

### 3. **Risk Snapshot Table Name Error**
**File:** `apps/web/src/app/core/services/risk.service.ts:91`

```typescript
// CURRENT (BROKEN)
this.supabaseClient.from('booking_risk_snapshots').insert(...)
                                            // ^^^^ PLURAL (doesn't exist)
```

**Actual Table:** `booking_risk_snapshot` (singular)

**Impact:** All risk snapshot persistence fails at runtime

---

### 4. **Risk Snapshot FK Violation**
**File:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:563`

**Flow:**
1. Generate random UUID for booking
2. Create risk snapshot with FK to that UUID ❌
3. Later create actual booking with different ID ❌

**Constraint:**
```sql
booking_risk_snapshot.booking_id REFERENCES bookings(id)
```

**Impact:** Risk snapshots cannot be saved (FK violation)

---

### 5. **sessionStorage Dependency**
**File:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:250`

**Problem:**
- Entire flow depends on `sessionStorage.getItem('bookingInput')`
- When navigating from `/bookings` list → no data in sessionStorage
- Shows "Faltan parámetros" error

**Impact:** Cannot complete payment for existing bookings

---

### 6. **Invalid Booking Status**
**Status:** `pending_confirmation` (not in enum)

**Edge Function Expectation:**
```typescript
// supabase/functions/mercadopago-create-booking-preference/index.ts:139
if (booking.status !== 'pending') {
  throw new Error('Only pending bookings can create preferences');
}
```

**Impact:** MercadoPago preference creation fails silently

---

## ⚠️ High-Priority Issues

### 7. **Duplicate Payment Logic**
**Locations:**
- `checkout/support/risk-calculator.ts` - Modern, wallet-aware
- `booking-detail-payment.model.ts:270` - Legacy, sessionStorage-based

**Divergence:**
- Hold calculation formulas differ
- FX rate sources differ
- Coverage upgrade rules differ

**Impact:** Inconsistent pricing and guarantees

---

### 8. **Missing View Columns**
**View:** `my_bookings`  
**Expected by UI:**
```typescript
interface Booking {
  total_price_ars: number;    // ❌ Not in view
  risk_snapshot_id: string;   // ❌ Not in view
  coverage_upgrade: boolean;  // ❌ Not in view
  payment_mode: string;       // ❌ Not in view
  guarantee_type: string;     // ❌ Not in view
}
```

**Impact:** UI cannot display full booking details

---

### 9. **Pricing Trigger Incompatibility**
**Trigger:** Recalculates pricing on booking insert  
**Expected Columns:**
- `renter_id` (UUID)
- `start_at` / `end_at` (timestamptz)
- `total_amount` (bigint, cents)

**Booking Detail Payment Sends:**
- `user_id`, `start_date`, `total_price_usd`

**Impact:** Pricing triggers fail, installments not created

---

## 📋 Unification Plan

### Phase 1: Immediate Fixes (P0)

#### 1.1 Fix "Completar Pago" Route
```html
<!-- apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html -->
<button [routerLink]="['/bookings/checkout', booking.id]">
  💳 Completar Pago
</button>
```

#### 1.2 Fix Risk Service Table Name
```typescript
// apps/web/src/app/core/services/risk.service.ts:91
this.supabaseClient.from('booking_risk_snapshot').insert(...)
                                         // ^^^^ SINGULAR
```

#### 1.3 Deprecate Booking Detail Payment Flow
**Strategy:** Redirect all traffic to modern checkout

```typescript
// booking-detail-payment.page.ts:250
ngOnInit() {
  // If booking exists, redirect to modern checkout
  if (this.bookingId) {
    this.router.navigate(['/bookings/checkout', this.bookingId]);
    return;
  }
  
  // If no booking, must create one first via BookingsService
  const input = this.buildBookingInput();
  this.bookingsService.requestBooking(input).subscribe(booking => {
    this.router.navigate(['/bookings/checkout', booking.id]);
  });
}
```

---

### Phase 2: Schema Alignment (P0)

#### 2.1 Extend `my_bookings` View
```sql
-- Add missing columns
CREATE OR REPLACE VIEW my_bookings AS
SELECT
  b.*,
  b.total_amount AS total_price_ars, -- Alias for compatibility
  b.payment_mode,
  b.guarantee_type,
  b.coverage_upgrade,
  b.risk_snapshot_id,
  rs.guarantee_amount_ars,
  rs.fx_snapshot
FROM bookings b
LEFT JOIN booking_risk_snapshot rs ON rs.booking_id = b.id
WHERE b.renter_id = auth.uid();
```

#### 2.2 Add Missing Booking Columns (If Needed)
```sql
-- Only if these are actually used
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR,
  ADD COLUMN IF NOT EXISTS guarantee_type VARCHAR,
  ADD COLUMN IF NOT EXISTS coverage_upgrade BOOLEAN DEFAULT false;
```

---

### Phase 3: Consolidate Services (P1)

#### 3.1 Create Unified Payment Service
```typescript
// core/services/unified-payment.service.ts

@Injectable()
export class UnifiedPaymentService {
  constructor(
    private checkoutPayment: CheckoutPaymentService,
    private riskCalculator: CheckoutRiskCalculator,
    private wallet: WalletService,
    private mercadopago: MercadoPagoBookingGateway
  ) {}

  async processPayment(bookingId: string): Promise<PaymentResult> {
    // 1. Validate booking exists and is 'pending'
    const booking = await this.validateBooking(bookingId);
    
    // 2. Calculate risk/guarantees
    const risk = await this.riskCalculator.calculate(booking);
    
    // 3. Persist risk snapshot
    const snapshotId = await this.persistRiskSnapshot(bookingId, risk);
    
    // 4. Process payment (wallet or MercadoPago)
    return this.checkoutPayment.processPayment(booking, risk);
  }
}
```

#### 3.2 Deprecate Legacy Components
- ❌ `card-hold-panel.component.ts` → Use `checkout` components
- ❌ `credit-security-panel.component.ts` → Use `checkout` components
- ❌ `booking-detail-payment.model.ts` → Use `checkout/models`

---

### Phase 4: Risk Snapshot Fix (P0)

#### 4.1 Correct Snapshot Persistence Flow
```typescript
// CORRECT FLOW:
// 1. Create booking FIRST (with status = 'pending')
const booking = await bookingsService.requestBooking(input);

// 2. THEN create risk snapshot with real booking_id
const risk = await riskService.calculate(booking);
const snapshot = await riskService.persistRiskSnapshot(booking.id, risk);

// 3. Update booking with snapshot reference
await bookingsService.updateBooking(booking.id, {
  risk_snapshot_id: snapshot.id
});
```

---

### Phase 5: Route Consolidation (P1)

#### 5.1 Final Route Structure
```typescript
export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./my-bookings/my-bookings.page')
  },
  {
    path: ':id',
    loadComponent: () => import('./booking-detail/booking-detail.page')
  },
  {
    path: 'checkout/:bookingId',
    loadComponent: () => import('./checkout/checkout.page')
  },
  // DEPRECATED: Redirect to checkout
  {
    path: 'detail-payment',
    redirectTo: 'checkout',
    pathMatch: 'full'
  }
];
```

#### 5.2 Car Detail Flow
```typescript
// car-detail.page.ts:275
async reserveCar() {
  // Create booking FIRST
  const booking = await this.bookingsService.requestBooking({
    car_id: this.car.id,
    renter_id: this.userId,
    start_at: this.startDate,
    end_at: this.endDate,
    total_amount: this.pricing.totalCents,
    currency: 'ARS',
    status: 'pending'
  });
  
  // Navigate to unified checkout
  this.router.navigate(['/bookings/checkout', booking.id]);
}
```

---

## 🧪 Testing Requirements

### Pre-Refactor Tests
```bash
# Capture current behavior
npm run test:e2e -- --grep "booking"
python test_complete_payment.py
```

### Post-Refactor Validation
1. **Route Navigation**
   - ✅ `/bookings` → "Completar Pago" → `/bookings/checkout/:id` (200)
   - ✅ Car detail → "Reservar" → `/bookings/checkout/:id` (200)

2. **Booking Creation**
   - ✅ Valid schema (renter_id, start_at, end_at, total_amount)
   - ✅ Status = 'pending'
   - ✅ Pricing triggers fire correctly

3. **Risk Snapshots**
   - ✅ Table name = `booking_risk_snapshot` (singular)
   - ✅ FK constraint satisfied (booking exists first)
   - ✅ Snapshot references valid booking_id

4. **Payment Processing**
   - ✅ Wallet payments work
   - ✅ MercadoPago preferences created
   - ✅ Webhooks process correctly

---

## 🚨 Migration Risks

### Data Migration Needed
- Existing bookings with `pending_confirmation` → change to `pending`
- Risk snapshots with orphaned booking_ids → delete or fix

```sql
-- Fix invalid statuses
UPDATE bookings 
SET status = 'pending' 
WHERE status = 'pending_confirmation';

-- Clean orphaned snapshots
DELETE FROM booking_risk_snapshot
WHERE booking_id NOT IN (SELECT id FROM bookings);
```

### Backward Compatibility
- Edge functions expect `status = 'pending'`
- Views expect current schema
- Pricing triggers expect specific columns

**Strategy:** Run all migrations in transaction, test thoroughly on staging

---

## 📊 Implementation Priority

```
P0 (Week 1 - Critical):
├── Fix "Completar Pago" route → checkpoint
├── Fix risk service table name → checkout
├── Fix booking creation schema → checkout
└── Add risk snapshot FK fix → checkout

P1 (Week 2 - High):
├── Extend my_bookings view
├── Consolidate payment services
└── Deprecate detail-payment route

P2 (Week 3 - Medium):
├── Remove legacy components
├── Add comprehensive E2E tests
└── Documentation updates
```

---

## 🎯 Success Metrics

- ✅ 0 route 404 errors on "Completar Pago"
- ✅ 100% booking creation success rate
- ✅ 0 risk snapshot FK violations
- ✅ Single payment service (no duplication)
- ✅ All tests passing

---

## 📚 Related Documentation

- `BOOKINGS_ARCHITECTURE.md` - System overview
- `FGO_V1_1_DESIGN.md` - Wallet integration
- `BOOKING_DETAIL_PAYMENT_COMPLETE.md` - Legacy flow docs
- `supabase/migrations/20251024_booking_detail_payment_complete.sql` - Schema

---

## 🔗 Key Files Reference

### Routes
- `apps/web/src/app/features/bookings/bookings.routes.ts:5`
- `apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html:108`

### Services
- `apps/web/src/app/core/services/bookings.service.ts:40`
- `apps/web/src/app/core/services/risk.service.ts:91`
- `apps/web/src/app/features/bookings/checkout/services/checkout-payment.service.ts:32`

### Components
- `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:247`
- `apps/web/src/app/features/bookings/checkout/checkout.page.ts`

### Database
- `supabase/migrations/20251016_create_core_tables.sql:133` - bookings table
- `supabase/migrations/20251024_ar_risk_system_complete.sql:23` - risk snapshots
- `supabase/migrations/20251016_add_booking_pricing_adapted.sql:193` - my_bookings view

### Edge Functions
- `supabase/functions/mercadopago-create-booking-preference/index.ts:139`

---

**Last Updated:** 2025-01-25  
**Next Review:** After P0 fixes deployed  
**Owner:** Engineering Team
