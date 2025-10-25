# 🧪 Booking System P0 - Testing Plan

**Status:** Ready for Testing  
**Priority:** P0 - Critical  
**Estimated Time:** 30 minutes

---

## 🎯 Testing Objectives

1. Verify "Completar Pago" button works (no 404)
2. Verify booking creation succeeds
3. Verify risk snapshots are created properly
4. Verify FK constraints are satisfied
5. Verify MercadoPago webhook compatibility

---

## 🔧 Pre-Testing Setup

### 1. Apply Migration
```bash
cd /home/edu/autorenta
supabase migration up
```

**Expected Output:**
```
✅ Applying migration: 20250125_booking_p0_fixes.sql
✅ All booking statuses are valid
✅ No orphaned risk snapshots
✅ All validations passed
```

### 2. Verify Database State
```bash
# Check for invalid statuses
psql $DATABASE_URL -c "
SELECT COUNT(*) as invalid_count 
FROM bookings 
WHERE status NOT IN ('pending', 'confirmed', 'active', 'completed', 'cancelled');
"
# Expected: 0

# Check for orphaned snapshots
psql $DATABASE_URL -c "
SELECT COUNT(*) as orphaned_count
FROM booking_risk_snapshot brs
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = brs.booking_id);
"
# Expected: 0
```

### 3. Start Development Server
```bash
cd /home/edu/autorenta
npm run dev
```

---

## 📋 Test Cases

### Test 1: "Completar Pago" Button (Route Fix)

**Steps:**
1. Login as renter user
2. Navigate to `/bookings`
3. Find a booking with status = 'pending'
4. Click "Completar Pago" button

**Expected Result:**
- ✅ Navigate to `/bookings/checkout/:bookingId`
- ✅ No 404 error
- ✅ Checkout page loads correctly

**Failure Scenario:**
- ❌ If 404: Check route in `my-bookings.page.html`
- ❌ If wrong page: Check router config in `bookings.routes.ts`

---

### Test 2: Booking Creation (Schema Fix)

**Steps:**
1. Navigate to `/cars`
2. Select a car
3. Choose rental dates
4. Click "Reservar"
5. Fill booking detail form
6. Click "Confirmar Reserva"

**Expected Result:**
- ✅ Booking created successfully
- ✅ No database errors in console
- ✅ Redirect to `/bookings/checkout/:bookingId`

**Database Verification:**
```sql
-- Get last created booking
SELECT 
  id,
  renter_id,     -- Should be UUID (not null)
  start_at,      -- Should be timestamptz (not null)
  end_at,        -- Should be timestamptz (not null)
  total_amount,  -- Should be numeric (not null)
  currency,      -- Should be 'ARS'
  status,        -- Should be 'pending'
  payment_mode,
  created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 1;
```

**Failure Scenario:**
- ❌ If "column user_id does not exist": Schema not fixed
- ❌ If "invalid input syntax": Date format issue
- ❌ If FK violation: Check car_id exists

---

### Test 3: Risk Snapshot Creation (FK Fix)

**Steps:**
1. Complete Test 2 (create booking)
2. Check console for errors

**Database Verification:**
```sql
-- Get last booking and its risk snapshot
SELECT 
  b.id as booking_id,
  b.created_at as booking_created,
  b.risk_snapshot_id,
  brs.id as snapshot_id,
  brs.booking_id as snapshot_booking_ref,
  brs.created_at as snapshot_created,
  CASE 
    WHEN brs.booking_id = b.id THEN '✅ FK Valid'
    ELSE '❌ FK Invalid'
  END as fk_status
FROM bookings b
LEFT JOIN booking_risk_snapshot brs ON brs.id = b.risk_snapshot_id
ORDER BY b.created_at DESC
LIMIT 1;
```

**Expected Result:**
- ✅ `snapshot_id` is not null
- ✅ `snapshot_booking_ref` = `booking_id`
- ✅ `fk_status` = '✅ FK Valid'
- ✅ `snapshot_created` > `booking_created` (created after)

**Failure Scenario:**
- ❌ If `snapshot_id` is null: Risk snapshot not created
- ❌ If FK invalid: Check `persistRiskSnapshot()` call order
- ❌ If table not found: Check table name is singular

---

### Test 4: Table Name Fix

**Steps:**
1. Check browser console during Test 2
2. Look for database errors

**Expected Result:**
- ✅ No error about table "booking_risk_snapshots"
- ✅ Risk snapshot inserts successfully

**Database Verification:**
```sql
-- Check table exists (singular)
SELECT COUNT(*) FROM booking_risk_snapshot;
-- Should not error

-- This should fail (plural, doesn't exist)
-- SELECT COUNT(*) FROM booking_risk_snapshots;
```

**Failure Scenario:**
- ❌ If "relation booking_risk_snapshots does not exist": Check `risk.service.ts` line 91

---

### Test 5: Booking Status (Enum Fix)

**Steps:**
1. Complete Test 2 (create booking)

**Database Verification:**
```sql
-- Check status is valid
SELECT 
  id,
  status,
  CASE 
    WHEN status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled') 
    THEN '✅ Valid Status'
    ELSE '❌ Invalid Status'
  END as status_validation
FROM bookings
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
- ✅ All bookings have `status_validation` = '✅ Valid Status'
- ✅ New bookings have `status` = 'pending'

**Failure Scenario:**
- ❌ If status = 'pending_confirmation': Check `booking-detail-payment.page.ts` line 598

---

### Test 6: MercadoPago Webhook Compatibility

**Steps:**
1. Create booking (Test 2)
2. Trigger MercadoPago preference creation

**Database Verification:**
```sql
-- Check booking is ready for MercadoPago
SELECT 
  id,
  status,
  total_amount,
  currency,
  CASE 
    WHEN status = 'pending' AND total_amount > 0 AND currency IS NOT NULL
    THEN '✅ Ready for MP'
    ELSE '❌ Not Ready'
  END as mp_ready
FROM bookings
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

**Expected Result:**
- ✅ `mp_ready` = '✅ Ready for MP'
- ✅ Status = 'pending'

**Edge Function Test:**
```bash
# Call MercadoPago edge function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/mercadopago-create-booking-preference \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "BOOKING_ID_FROM_TEST"}'
```

**Expected Response:**
```json
{
  "success": true,
  "preference_id": "123456789-...",
  "init_point": "https://www.mercadopago.com/..."
}
```

**Failure Scenario:**
- ❌ If "Only pending bookings...": Status not 'pending'
- ❌ If 404: Booking not found

---

## 🔍 Post-Testing Validation

### 1. Check All Bookings
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE status NOT IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')) as invalid,
  COUNT(*) as total
FROM bookings
WHERE created_at > now() - interval '1 day';
```

**Expected:**
- ✅ `invalid` = 0
- ✅ `pending` > 0 (if you created test bookings)

### 2. Check Risk Snapshot Integrity
```sql
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT booking_id) as unique_bookings,
  COUNT(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id)
  ) as valid_fk_count
FROM booking_risk_snapshot;
```

**Expected:**
- ✅ `valid_fk_count` = `total_snapshots` (100% valid FKs)

### 3. Check for Errors in Logs
```bash
# Check application logs
tail -100 /home/edu/autorenta/apps/web/app_start.log | grep -i "error\|exception"

# Check Supabase logs
supabase logs --tail 100 | grep -i "error\|violation"
```

**Expected:**
- ✅ No FK violation errors
- ✅ No "table does not exist" errors
- ✅ No "column does not exist" errors

---

## 📊 Test Results Template

```
TEST RESULTS - Booking System P0 Fixes
Date: _______________
Tester: _______________

[ ] Test 1: "Completar Pago" Button
    - Route works: YES / NO
    - Checkout loads: YES / NO
    - Notes: _____________________

[ ] Test 2: Booking Creation
    - Booking created: YES / NO
    - Correct schema: YES / NO
    - Notes: _____________________

[ ] Test 3: Risk Snapshot
    - Snapshot created: YES / NO
    - FK valid: YES / NO
    - Notes: _____________________

[ ] Test 4: Table Name
    - No errors: YES / NO
    - Notes: _____________________

[ ] Test 5: Status Enum
    - Status = 'pending': YES / NO
    - Notes: _____________________

[ ] Test 6: MercadoPago
    - Preference created: YES / NO
    - Notes: _____________________

OVERALL STATUS: PASS / FAIL
Next Steps: _____________________
```

---

## 🚨 Rollback Plan

If tests fail critically:

```bash
# 1. Stop development server
# Ctrl+C

# 2. Revert code changes
cd /home/edu/autorenta
git checkout HEAD -- apps/web/src/app/features/bookings/
git checkout HEAD -- apps/web/src/app/core/services/risk.service.ts

# 3. Rollback migration
supabase migration down

# 4. Investigate logs
cat /tmp/booking_build.log
cat /tmp/booking_lint.log
```

---

## ✅ Success Criteria

- [ ] All 6 tests pass
- [ ] No database errors in console
- [ ] No FK violations in database
- [ ] Bookings create with correct schema
- [ ] Risk snapshots reference valid bookings
- [ ] MercadoPago preferences can be created

**When all pass:** Ready for staging deployment

---

**Last Updated:** 2025-01-25  
**Contact:** Check BOOKING_P0_FIXES_APPLIED.md for details
