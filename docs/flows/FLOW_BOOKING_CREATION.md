# Flow: Booking Creation

**Last Updated:** 2025-11-06
**Complexity:** HIGH (7 service dependencies)
**Critical Path:** YES

---

## Overview

This document traces the complete booking creation flow from the initial user click on "Book Now" through database persistence and insurance activation. This is a critical business flow that involves multiple services and database operations.

---

## Entry Point

**Component:** CarDetailPage
**File:** `apps/web/src/app/features/cars/detail/car-detail.page.ts`
**Method:** `onBookClick()` (Lines 527-614)
**Trigger:** User clicks "Book Now" button on car detail page

### Initial State Requirements

- User must be authenticated (redirects to `/auth/login` if not)
- Date range must be selected (`dateRange` signal)
- Total price must be calculated (`totalPrice` computed signal)
- Car must be available

### Entry Method Flow

```typescript
onBookClick() {
  // 1. Verify authentication (line 544)
  if (!this.authService.session$()) {
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url }
    });
    return;
  }

  // 2. Track analytics: booking_initiated (line 569-574)
  this.analyticsService.trackEvent('booking_initiated', {
    car_id: this.car().id,
    start_date: this.dateRange().start,
    end_date: this.dateRange().end,
    total_price: this.totalPrice()
  });

  // 3. Call BookingsService
  this.bookingsService.createBookingWithValidation(
    this.car().id,
    this.dateRange().start,
    this.dateRange().end
  );

  // 4. On success: Navigate to payment page (line 600-602)
  // 5. Track analytics: booking_completed (line 593-598)
}
```

---

## Layer-by-Layer Flow

### LAYER 1: UI Component (CarDetailPage)

**File:** `apps/web/src/app/features/cars/detail/car-detail.page.ts`

| Signal/State | Type | Purpose |
|--------------|------|---------|
| `dateRange` | WritableSignal | Selected start/end dates |
| `totalPrice` | ComputedSignal | Calculated from price_per_day × days |
| `expressMode` | WritableSignal | For urgent rentals |
| `bookingInProgress` | WritableSignal | UI loading state |
| `selectedPaymentMethod` | WritableSignal | Payment method selection |

**Dependencies Injected:**
- CarsService (line 78)
- BookingsService (line 80)
- WalletService (line 81)
- AuthService (line 85)
- AnalyticsService (line 88)
- DynamicPricingService (line 86)
- LocationService (line 90)

**State Changes:**
- `bookingInProgress.set(true)` → `false`
- `bookingError.set(null)` → error message if failed

---

### LAYER 2: Service Layer (BookingsService)

**File:** `apps/web/src/app/core/services/bookings.service.ts`

#### Method 1: createBookingWithValidation()
**Lines:** 699-823

**Purpose:** Validates dates and creates booking with availability checking

**Flow:**
```typescript
1. Validate dates (lines 710-726)
   - Check start < end
   - Check start is not in past

2. Call requestBooking(carId, startDate, endDate) (line 732)

3. On Success (lines 734-737):
   return { success: true, booking }

4. On Error (lines 738-822):
   - Handle via ErrorHandlerService
   - Map error message patterns:
     * 'Auto no disponible' → Activates waitlist option
     * 'conflicting key' → Constraint violation
     * 'no autenticado' → Authentication required
     * 'propio auto' → Cannot book own car
     * 'pasado' → Cannot book in past
   return { success: false, error, canWaitlist }
```

**Error Mapping Patterns:**
```typescript
if (errorMsg.includes('Auto no disponible en esas fechas')) {
  canWaitlist = true;
} else if (errorMsg.includes('conflicting key') ||
           errorMsg.includes('exclusion constraint')) {
  errorMsg = 'Este auto no está disponible...';
} else if (errorMsg.includes('no autenticado')) {
  errorMsg = 'Debes iniciar sesión...';
}
```

#### Method 2: requestBooking()
**Lines:** 25-83

**Purpose:** Calls RPC and activates insurance

**Flow:**
```typescript
1. Call Supabase RPC: request_booking(carId, start, end)
2. Extract booking_id from result
3. Try to activate insurance coverage (non-blocking)
4. Recalculate pricing via RPC
5. Fetch updated booking with details
6. Return Booking object
```

**Dependencies Used:**
- ErrorHandlerService (line 22)
- LoggerService (line 23)
- WalletService (line 18) - for wallet operations
- PwaService (line 19) - for app badge updates
- InsuranceService (line 20) - for coverage activation
- DriverProfileService (line 21) - for bonus-malus

---

### LAYER 3: Database Access Layer (RPC Function)

**File:** `supabase/migrations/20251104_fix_booking_overlap_validation_v2.sql`
**Function:** `request_booking()` (Lines 49-157)

#### Function Signature
```sql
CREATE OR REPLACE FUNCTION public.request_booking(
  p_car_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS JSON
```

#### Execution Steps

| Step | Lines | Action | Database Impact |
|------|-------|--------|-----------------|
| 1 | 69-72 | Get authenticated user ID | Reads from `auth.uid()` |
| 2 | 74-84 | Validate dates | Check end > start, not in past |
| 3 | 86-94 | Fetch car details | Queries `cars` table |
| 4 | 96-98 | Verify car is active | Check `cars.status = 'active'` |
| 5 | 101-103 | Verify not owner | Check `car.owner_id ≠ user_id` |
| 6 | 108-115 | Check availability | Query bookings with status IN ('pending', 'confirmed', 'in_progress') |
| 7 | 118-124 | Calculate total amount | Multiply days × price_per_day + deposit |
| 8 | 127-146 | Insert booking | INSERT into `bookings` table with status='pending' |
| 9 | 149-155 | Return JSON | Return booking details |

#### Key Availability Check (Lines 108-115)
```sql
-- Prevents overlapping bookings
IF EXISTS (
  SELECT 1 FROM public.bookings
  WHERE car_id = p_car_id
    AND status IN ('pending', 'confirmed', 'in_progress')
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
) THEN
  RAISE EXCEPTION 'Auto no disponible en esas fechas';
END IF;
```

**Critical:** This check includes 'pending' status to prevent race conditions where multiple users try to book simultaneously.

#### Booking Record Created (Lines 127-146)

| Column | Value | Source |
|--------|-------|--------|
| `id` | `gen_random_uuid()` | Auto-generated |
| `car_id` | `p_car_id` | Parameter |
| `renter_id` | `v_user_id` | From `auth.uid()` |
| `start_at` | `p_start` | Parameter |
| `end_at` | `p_end` | Parameter |
| `status` | `'pending'` | Hard-coded |
| `total_amount` | `v_total_amount` | Calculated |
| `currency` | `'USD'` | Hard-coded |
| `expires_at` | `NOW() + 30 minutes` | Auto-expiry |
| `created_at` | `NOW()` | Auto-timestamp |

**Return JSON:**
```json
{
  "booking_id": "uuid-string",
  "status": "pending",
  "total_amount": 123.45,
  "deposit_amount": 0,
  "created_at": "2025-11-06T..."
}
```

---

### LAYER 4: Post-Booking Operations

After `request_booking()` succeeds, the service performs additional operations:

#### Operation 1: Activate Insurance
**File:** `apps/web/src/app/core/services/bookings.service.ts` (Lines 61-71)
**Service Called:** `InsuranceService.activateCoverage()`

```typescript
try {
  await this.insuranceService.activateCoverage({
    booking_id: bookingId,
    addon_ids: [], // No add-ons by default
  });
} catch (insuranceError) {
  this.logger.error('Insurance activation failed', insuranceError);
  // Non-blocking: don't fail booking if insurance fails
}
```

**Database Operations:**
- Creates entry in `booking_insurance_coverage` table
- Links to `insurance_policies` table
- Creates `booking_insurance_addon` entries for add-ons

#### Operation 2: Recalculate Pricing
**File:** `apps/web/src/app/core/services/bookings.service.ts` (Line 74)
**RPC Called:** `pricing_recalculate`

**Purpose:** Update booking breakdown fields with detailed pricing

#### Operation 3: Fetch Updated Booking
**File:** `apps/web/src/app/core/services/bookings.service.ts` (Lines 77-80)
**Method:** `getBookingById()`

**Three-Level Data Loading:**

| Level | Query | Fields Loaded |
|-------|-------|---------------|
| 1 | `my_bookings` view | Booking base fields + car aggregate fields |
| 2 | `cars` table (JOIN) | `id, brand, model, year, license_plate, images` |
| 3 | `booking_insurance_coverage` table (JOIN) | Insurance coverage details |
| 4 | `insurance_policies` table (JOIN) | Full policy details |

---

### LAYER 5: Navigation to Payment Page

**Component:** BookingDetailPaymentPage
**File:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`

**Route Parameters:**
```typescript
this.router.navigate(['/bookings/detail-payment'], {
  queryParams: { bookingId: result.booking.id }
});
```

**Page Signals Initialized:**

| Signal | Purpose |
|--------|---------|
| `bookingInput` | Booking parameters (dates, car) |
| `car` | Car details from booking |
| `fxSnapshot` | FX rate snapshot at booking time |
| `riskSnapshot` | Risk assessment snapshot |
| `priceBreakdown` | Detailed pricing breakdown |
| `paymentMode` | Payment method toggle (card/wallet) |
| `coverageUpgrade` | Insurance upgrade selection |
| `consents` | User consent flags |

**Services Injected:**
- FxService - FX rate conversions
- RiskService - Risk assessment
- PaymentAuthorizationService - Card authorization
- WalletService - Wallet operations
- BookingsService - Booking updates
- PaymentsService - Payment processing
- MercadoPagoBookingGateway - MercadoPago integration

---

## Database Schema Impact

### Tables Modified

**1. bookings table (INSERT)**

Record created with:
- status='pending'
- expires_at=NOW()+30min
- All booking details

**Constraints Applied:**
- Foreign key: `car_id` → `cars(id)` CASCADE DELETE
- Foreign key: `renter_id` → `auth.users(id)` CASCADE DELETE
- Exclusion constraint: `bookings_no_overlap` prevents overlapping bookings
- Check: `end_at > start_at`
- Check: `total_amount >= 0`

**2. booking_insurance_coverage table (INSERT)**

Fields:
- `booking_id`, `policy_id`, `addon_ids`, `premium`

**3. booking_insurance_addon table (INSERT - if add-ons)**

Fields:
- `coverage_id`, `addon_id`, `cost`

**4. booking_risk_snapshot table (Optional INSERT)**

Fields:
- `booking_id`, `driver_age`, `vehicle_value`, `daily_price`

---

## Side Effects and State Changes

### Observable Changes During Booking Creation

| Component | Signal/State | Change | Trigger |
|-----------|-------------|--------|---------|
| CarDetailPage | `bookingInProgress` | false → true → false | onBookClick() start/end |
| CarDetailPage | `bookingError` | null → error message | On validation failure |
| BookingsService | Wallet balance signal | May update | If wallet used |
| DriverProfileService | Driver class | May update | If bonus-malus applies |
| PwaService | App badge | Increments count | If pending bookings exist |
| AnalyticsService | Events tracked | Multiple events | Each flow milestone |

### Async Operations (Fire-and-forget)

- Insurance activation (non-blocking if fails)
- Analytics tracking (background)
- PWA badge update (background)

---

## Success and Error Paths

### ✓ Success Path

```
User clicks "Book Now"
  ↓
Authentication verified
  ↓
Dates validated (not past, start < end)
  ↓
RPC request_booking() called
  ↓
Car availability confirmed
  ↓
Booking record created (status='pending', 30-min expiry)
  ↓
Insurance activated (non-blocking)
  ↓
Pricing recalculated
  ↓
Booking details fetched
  ↓
Navigate to /bookings/detail-payment?bookingId=...
  ↓
User sees payment page
```

### ✗ Error Path: Not Authenticated

```
User clicks "Book Now"
  ↓
AuthService.session$() = null
  ↓
Redirect to /auth/login with returnUrl
```

### ✗ Error Path: Car Not Available (Overlapping Dates)

```
User clicks "Book Now"
  ↓
RPC request_booking() called
  ↓
Availability check fails (overlapping booking exists)
  ↓
PostgreSQL EXCEPTION: 'Auto no disponible en esas fechas'
  ↓
BookingsService catches error
  ↓
Error mapped: canWaitlist = true
  ↓
UI shows: "Este auto no está disponible. ¿Deseas unirte a la lista de espera?"
```

### ✗ Error Path: Own Car

```
RPC validates: car.owner_id ≠ user_id
  ↓
Validation fails (user owns this car)
  ↓
PostgreSQL EXCEPTION: 'No puedes reservar tu propio auto'
  ↓
UI shows error message
```

### ✗ Error Path: Past Dates

```
RPC validates: p_start >= NOW()
  ↓
Validation fails
  ↓
PostgreSQL EXCEPTION: 'No puedes reservar en el pasado'
  ↓
UI shows error message
```

### ✗ Error Path: Insurance Activation Fails

```
Booking created successfully
  ↓
Insurance activation attempted
  ↓
InsuranceService.activateCoverage() throws error
  ↓
Error logged but NOT thrown (non-blocking)
  ↓
Booking still proceeds to payment page
  ↓
Note: Database trigger will also try to activate insurance on confirmation
```

---

## Race Condition Prevention

The system prevents double-booking through multiple layers:

1. **Frontend Validation:** Checks dates before calling backend
2. **Backend RPC Validation:** `is_car_available()` function checks for overlaps
3. **Database Constraint:** `bookings_no_overlap` exclusion constraint

**Scenario: Two users book simultaneously**
- User A: Creates booking → RPC succeeds → Constraint passes → ✓ Success
- User B: Tries to create booking → RPC validation may pass → **Constraint fails** → Clear error message

**30-Minute Booking Hold:**
```sql
expires_at = NOW() + INTERVAL '30 minutes'
```
- Booking remains in 'pending' status for 30 minutes
- User must complete payment within this window
- After expiration, booking slot is released
- Prevents "booking hijacking" (claim a date then cancel)

---

## Dependencies and Interactions

```
┌──────────────────────────────────────────────┐
│ CarDetailPage (UI Entry Point)              │
│ Signals: dateRange, totalPrice, car         │
└─────────────┬────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│ BookingsService.createBookingWithValidation()│
│ - Validates dates                            │
│ - Maps error messages                        │
└─────────────┬────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│ Supabase RPC: request_booking()             │
│ - Auth validation                            │
│ - Car active check                           │
│ - Availability check (overlaps)              │
│ - Creates booking record                     │
└─────────────┬────────────────────────────────┘
              │
      ┌───────┴────────┬────────────┐
      ↓                ↓            ↓
┌──────────┐   ┌──────────────┐   ┌────────────┐
│Insurance │   │Recalculate   │   │Get Updated │
│Activation│   │Pricing (RPC) │   │Booking     │
└──────────┘   └──────────────┘   └────────────┘
      │                │            │
      └────────────────┴────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│ Navigation to /bookings/detail-payment       │
│ BookingDetailPaymentPage loads:              │
│ - Booking details                            │
│ - FX rates snapshot                          │
│ - Risk assessment                            │
│ - Price breakdown                            │
└──────────────────────────────────────────────┘
```

---

## Critical Implementation Details

### Non-Blocking Insurance Activation

If insurance activation fails:
- Error is logged but doesn't fail booking
- Booking is still created successfully
- Database trigger will also activate insurance on confirmation
- User can retry or select different insurance in checkout

### 30-Minute Expiry Window

- Booking holds the slot for 30 minutes
- User must complete payment within this timeframe
- After expiration, RLS policies may prevent access
- Cleanup handled by scheduled job (not manual)

### Status Transitions

```
draft → pending → confirmed → in_progress → completed
              ↓
           cancelled
```

**Initial Status:** `pending` (from request_booking RPC)
**Next Status:** `confirmed` (after successful payment)

---

## Complete File Path Reference

| File | Lines | Component/Function |
|------|-------|-------------------|
| `apps/web/src/app/features/cars/detail/car-detail.page.ts` | 527-614 | CarDetailPage.onBookClick() |
| `apps/web/src/app/core/services/bookings.service.ts` | 699-823 | BookingsService.createBookingWithValidation() |
| `apps/web/src/app/core/services/bookings.service.ts` | 25-83 | BookingsService.requestBooking() |
| `apps/web/src/app/core/services/bookings.service.ts` | 133-206 | BookingsService.getBookingById() |
| `apps/web/src/app/core/services/insurance.service.ts` | 143-150 | InsuranceService.activateCoverage() |
| `supabase/migrations/20251104_fix_booking_overlap_validation_v2.sql` | 49-157 | request_booking() RPC |
| `supabase/migrations/20251016_create_core_tables.sql` | 130-168 | Bookings table definition |
| `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts` | 92-200 | BookingDetailPaymentPage |
| `apps/web/src/app/core/models/index.ts` | 355-461 | Booking interface |

---

## Related Documentation

- **Payment Flow:** See `docs/flows/FLOW_PAYMENT_CHECKOUT.md`
- **Wallet Operations:** See `docs/flows/FLOW_WALLET_DEPOSIT.md`
- **Insurance Claims:** See `docs/flows/FLOW_SETTLEMENT_CLAIM.md`
- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`
- **Domain Boundaries:** See `docs/architecture/DOMAIN_BOUNDARIES.md`

---

## Maintenance Notes

**When to Update:**
- After changes to BookingsService
- After RPC function modifications
- After schema changes to bookings table
- After insurance activation logic changes

**Testing Checklist:**
- [ ] Verify authenticated user can create booking
- [ ] Verify overlapping dates are rejected
- [ ] Verify 30-minute expiry works
- [ ] Verify insurance activation (non-blocking failure)
- [ ] Verify navigation to payment page
- [ ] Verify analytics events fired

**Last Verified:** 2025-11-06
