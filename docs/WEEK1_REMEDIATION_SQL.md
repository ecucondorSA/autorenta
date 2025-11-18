# Week 1 Remediation SQL - CRITICAL Fixes

**Date**: November 18, 2025
**Status**: Ready for implementation
**Priority**: CRITICAL - All fixes must be applied before deploying Week 1 work

---

## Fix 1: Add search_path to process_split_payment

**Issue**: Privilege escalation via schema injection
**Risk**: CRITICAL
**Time**: 5 minutes

```sql
-- Migration: Add search_path to process_split_payment
ALTER FUNCTION public.process_split_payment(uuid, numeric)
  SET search_path = public, pg_temp;

-- Verify the fix
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'process_split_payment'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Fix 2: Add search_path to wallet_lock_rental_and_deposit

**Issue**: Privilege escalation via schema injection
**Risk**: CRITICAL
**Time**: 5 minutes

```sql
-- Migration: Add search_path to wallet_lock_rental_and_deposit
ALTER FUNCTION public.wallet_lock_rental_and_deposit(uuid, numeric, numeric)
  SET search_path = public, pg_temp;

-- Verify the fix
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'wallet_lock_rental_and_deposit'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Fix 3: Add search_path to complete_payment_split

**Issue**: Privilege escalation via schema injection
**Risk**: CRITICAL
**Time**: 5 minutes

```sql
-- Migration: Add search_path to complete_payment_split
ALTER FUNCTION public.complete_payment_split(uuid, text, jsonb)
  SET search_path = public, pg_temp;

-- Verify the fix
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'complete_payment_split'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Fix 4: Add search_path to register_payment_split

**Issue**: Privilege escalation via schema injection
**Risk**: CRITICAL
**Time**: 5 minutes

```sql
-- Migration: Add search_path to register_payment_split (multi-provider version)
ALTER FUNCTION public.register_payment_split(uuid, payment_provider, text, integer, varchar)
  SET search_path = public, pg_temp;

-- Also fix the MercadoPago compatibility wrapper
ALTER FUNCTION public.register_payment_split(uuid, varchar, integer, varchar)
  SET search_path = public, pg_temp;

-- Verify the fixes
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'register_payment_split'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Fix 5: Add search_path to update_payment_intent_status

**Issue**: Privilege escalation via schema injection
**Risk**: CRITICAL
**Time**: 5 minutes

```sql
-- Migration: Add search_path to update_payment_intent_status
ALTER FUNCTION public.update_payment_intent_status(text, text, text, text, text, jsonb)
  SET search_path = public, pg_temp;

-- Verify the fix
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'update_payment_intent_status'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Fix 6: Add search_path to send_encrypted_message

**Issue**: Privilege escalation via schema injection
**Risk**: CRITICAL
**Time**: 5 minutes

```sql
-- Migration: Add search_path to send_encrypted_message
ALTER FUNCTION public.send_encrypted_message(uuid, uuid, uuid, text)
  SET search_path = public, pg_temp;

-- Verify the fix
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'send_encrypted_message'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Fix 7: Verify Platform User Exists

**Issue**: Hardcoded platform user ID in process_split_payment may not exist
**Risk**: HIGH
**Time**: 5 minutes

```sql
-- Migration: Verify platform user exists
-- If this returns no rows, the platform user must be created

SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;

-- If not found, create it:
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_app_meta_data,
--   raw_user_meta_data,
--   aud,
--   role
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000001'::UUID,
--   'system@autorenta.platform',
--   crypt('SYSTEM_PASSWORD_NOT_USED', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"provider":"builtin","providers":["builtin"]}'::jsonb,
--   '{"role":"system"}'::jsonb,
--   'authenticated',
--   'authenticated'
-- );
```

---

## Phase 2: Authorization Checks (Week 2+)

**Note**: These are more complex as they require function body rewrites.

### pattern for wallet_lock_rental_and_deposit

```sql
-- In the function body, after getting renter_id, add:
-- IF auth.uid() != v_renter_id THEN
--   RAISE EXCEPTION 'Unauthorized: can only lock own funds';
-- END IF;
```

### Pattern for process_split_payment

```sql
-- Add check that caller is authorized for this booking:
-- v_booking RECORD;
-- SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
-- IF v_booking.owner_id != auth.uid() AND NOT is_admin(auth.uid()) THEN
--   RAISE EXCEPTION 'Unauthorized: can only process own booking payments';
-- END IF;
```

### Pattern for send_encrypted_message

```sql
-- After getting booking/car, verify caller is a participant:
-- IF NOT (
--   (p_booking_id IS NOT NULL AND
--    (auth.uid() = (SELECT renter_id FROM bookings WHERE id = p_booking_id) OR
--     auth.uid() = (SELECT owner_id FROM cars WHERE id = (SELECT car_id FROM bookings WHERE id = p_booking_id))))
--   OR
--   (p_car_id IS NOT NULL AND
--    (auth.uid() = p_recipient_id OR
--     auth.uid() = (SELECT owner_id FROM cars WHERE id = p_car_id)))
-- ) THEN
--   RAISE EXCEPTION 'Unauthorized: cannot send messages for this context';
-- END IF;
```

---

## Phase 3: Race Condition Fixes (Week 2+)

### Pattern for wallet_lock_rental_and_deposit

```sql
-- Change the SELECT from (line ~63):
-- SELECT
--   autorentar_credit_balance_cents,
--   available_balance_cents
-- INTO v_protection_cents, v_cash_cents
-- FROM user_wallets
-- WHERE user_id = v_renter_id;

-- To:
-- SELECT
--   autorentar_credit_balance_cents,
--   available_balance_cents
-- INTO v_protection_cents, v_cash_cents
-- FROM user_wallets
-- WHERE user_id = v_renter_id
-- FOR UPDATE;  -- <- Add this to prevent concurrent updates
```

---

## Validation Checks

After applying all fixes, run these verification queries:

```sql
-- 1. Verify all SECURITY_DEFINER functions have search_path
SELECT
  proname,
  prosecdef,
  CASE
    WHEN proconfig IS NOT NULL THEN 'HAS search_path'
    ELSE 'MISSING search_path'
  END AS search_path_status
FROM pg_proc
WHERE prosecdef = true
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'process_split_payment',
    'wallet_lock_rental_and_deposit',
    'complete_payment_split',
    'register_payment_split',
    'update_payment_intent_status',
    'send_encrypted_message'
  )
ORDER BY proname;

-- Expected: All rows should show 'HAS search_path'

-- 2. Verify platform user exists
SELECT COUNT(*) as platform_user_count
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;

-- Expected: COUNT = 1

-- 3. Check if there are any remaining SECURITY_DEFINER functions without search_path
SELECT
  proname,
  prosecdef,
  proconfig
FROM pg_proc
WHERE prosecdef = true
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proconfig IS NULL
LIMIT 20;

-- Expected: Should be empty or show non-critical functions
```

---

## Timeline

- **Apply Phase 1 (search_path)**: 30 minutes
- **Verify Phase 1**: 10 minutes
- **Phase 2 (Authorization)**: 2-3 hours (Week 2)
- **Phase 3 (Race Conditions)**: 1-2 hours (Week 2)
- **Total for Week 1**: 40 minutes
- **Total including Week 2**: 4-5 hours

---

## Testing

Before and after each fix:

1. **Syntax Check**
   ```bash
   npm run build:web  # Should compile without errors
   ```

2. **Function Verification**
   ```sql
   \df+ function_name  -- Verify function loads
   ```

3. **Integration Test**
   - For payment functions: Make a test booking and verify payments process
   - For messaging: Send a test message and verify it's encrypted
   - For wallet: Lock funds and verify balances update correctly

---

## Rollback Plan

If any fix causes issues:

```sql
-- Rollback: Remove search_path from specific function
ALTER FUNCTION public.function_name(...)
  RESET search_path;

-- Or rollback entire migration:
-- If using a migration file, Supabase allows rolling back migrations
-- via the Supabase dashboard or CLI
```

---

## Sign-off

- [ ] Developer: ___________  Date: _______
- [ ] Security Lead: ___________  Date: _______
- [ ] QA: ___________  Date: _______

