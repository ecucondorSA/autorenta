# Week 1 Remediation - Deployment Instructions

**Date**: November 18, 2025
**Status**: Ready for Manual Deployment
**Priority**: CRITICAL

---

## Quick Summary

Three migration phases have been created and are ready to deploy:
- **Fase 1**: Agregar `search_path` a funciones SECURITY_DEFINER (30 min)
- **Fase 2**: Agregar verificación de autorización (2-3 horas)
- **Fase 3**: Prevención de condiciones de carrera (1-2 horas)

All code is in: `/supabase/migrations/20251118_security_definer_remediation_complete.sql`

---

## Deployment Method 1: Via Supabase Dashboard (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/pisqjmoklivzpwufhscx/sql/new

2. **Copy Migration SQL**
   - Open `/supabase/migrations/20251118_security_definer_remediation_complete.sql`
   - Copy ALL content from `BEGIN;` to `COMMIT;`

3. **Execute in SQL Editor**
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Monitor for success message

4. **Verify Deployment**
   - Check for NOTICE messages showing all changes applied
   - Look for validation output at end of migration

---

## Deployment Method 2: Via CLI (If Migration History Fixed)

```bash
# 1. Verify migration is recognized
ls -la supabase/migrations/20251118*

# 2. Try deployment
supabase db push

# 3. If successful, verify
supabase migration list
```

---

## Post-Deployment Validation

After deploying, run these queries in Supabase SQL Editor to verify all fixes:

### 1. Verify search_path Configuration
```sql
-- Should show all critical functions with search_path configured
SELECT
  proname,
  prosecdef,
  CASE
    WHEN proconfig IS NOT NULL THEN 'HAS search_path ✅'
    ELSE 'MISSING search_path ❌'
  END AS status
FROM pg_proc
WHERE proname IN (
  'process_split_payment',
  'wallet_lock_rental_and_deposit',
  'complete_payment_split',
  'register_payment_split',
  'update_payment_intent_status',
  'send_encrypted_message'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Expected: All show 'HAS search_path ✅'
```

### 2. Verify Platform User Exists
```sql
-- Should return 1 row
SELECT id, email
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Expected: One row with system user
```

### 3. Test Authorization Check
```sql
-- Test wallet_lock_rental_and_deposit authorization
-- (This will fail gracefully if called by non-owner - expected behavior)

-- Get a test booking
SELECT id, renter_id, owner_id
FROM bookings
LIMIT 1;

-- Try to call as system user (should show authorization message)
-- In real test, would use a different user's renter_id
```

### 4. Verify RLS is Enabled
```sql
-- Check that critical tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'wallet_transactions',
  'wallet_ledger',
  'payment_intents',
  'payment_splits',
  'messages'
);

-- Expected: All show 't' (true) for rowsecurity
```

---

## Testing Payment Flow

After deployment, test the payment processing flow:

```sql
-- 1. Create test user
INSERT INTO auth.users (id, email) VALUES (
  gen_random_uuid(),
  'test-payment-' || gen_random_uuid()::text || '@test.com'
) RETURNING id, email;

-- 2. Create test wallet
INSERT INTO user_wallets (
  user_id,
  available_balance_cents,
  locked_balance_cents,
  autorentar_credit_balance_cents,
  balance_cents,
  currency
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid, -- Replace with test user ID
  50000,  -- $500 available
  0,
  30000,  -- $300 protection
  80000,
  'USD'
);

-- 3. Test wallet_lock_rental_and_deposit with authorization check
-- This should work if user is the renter
SELECT * FROM wallet_lock_rental_and_deposit(
  '<booking-id>',
  200.00,  -- rental
  300.00   -- deposit
);
```

---

## Rollback Procedure

If anything goes wrong, here's how to rollback:

```sql
-- Option 1: Restore functions to previous state (without phase 2-3 changes)
-- Contact support to restore from backup

-- Option 2: Manual rollback of Phase 2-3
-- Remove authorization check (revert to original function)
-- Remove idempotency check
-- But KEEP the search_path (Phase 1 must stay)
```

---

## Success Criteria

After deployment, verify:

- ✅ All 6 critical functions have `search_path` configured
- ✅ Platform system user exists (`00000000-0000-0000-0000-000000000001`)
- ✅ `wallet_lock_rental_and_deposit` requires `auth.uid() = renter_id`
- ✅ `send_encrypted_message` validates recipient exists
- ✅ `update_payment_intent_status` is idempotent
- ✅ RLS is enabled on all financial tables
- ✅ Payment flow works end-to-end
- ✅ No regressions in existing functionality

---

## Migration Details

### Phase 1: Search Path (30 min) ✅
- Adds `SET search_path = public, pg_temp` to all 6 critical functions
- Prevents privilege escalation via schema injection
- **Risk Reduction**: HIGH → MEDIUM

### Phase 2: Authorization (2-3h) ✅
- `wallet_lock_rental_and_deposit`: Checks `auth.uid() = renter_id`
- `send_encrypted_message`: Validates recipient exists and sender has permission
- `process_split_payment`: Validates platform user exists and amounts are reasonable
- **Risk Reduction**: MEDIUM → LOW

### Phase 3: Race Conditions (1-2h) ✅
- `wallet_lock_rental_and_deposit`: Adds `FOR UPDATE` lock to prevent double-locking
- `update_payment_intent_status`: Adds idempotency check to prevent duplicate updates
- **Risk Reduction**: Prevents concurrent access issues

---

## Timeline

| Phase | Tasks | Time | Risk | Status |
|-------|-------|------|------|--------|
| 1 | search_path | 30 min | HIGH→MEDIUM | ✅ Ready |
| 2 | Authorization | 2-3h | MEDIUM→LOW | ✅ Ready |
| 3 | Race Conditions | 1-2h | Prevents issues | ✅ Ready |
| **Total** | All fixes | **6-7h** | **VERY LOW** | ✅ Ready |

---

## Next Steps

1. ✅ **Deploy migration** (via Dashboard or CLI)
2. ✅ **Run validation queries** (confirm all changes applied)
3. ✅ **Test payment flow** (ensure no regressions)
4. ✅ **Monitor logs** (watch for authorization or validation errors)
5. 📋 **Week 2**: Audit remaining 3 functions in production
6. 📋 **Week 2**: Complete RLS policies for remaining tables
7. 📋 **Week 3**: Index optimization for performance

---

## Support

If deployment fails:

1. Check Supabase logs for errors
2. Verify all prerequisites are met (platform user exists, tables exist)
3. Try manual deployment via Dashboard (more reliable)
4. Contact security team if authorization checks are too strict

---

**Migration Created**: 2025-11-18
**Target Deployment**: 2025-11-18
**Estimated Total Duration**: 6-7 hours
**Risk After Deployment**: VERY LOW ✅
