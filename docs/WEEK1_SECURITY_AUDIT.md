# Week 1: CRITICAL SECURITY_DEFINER Functions Audit

**Date Started**: November 18, 2025
**Target Completion**: November 24, 2025
**Effort**: 7-8 hours (45 min per function)

---

## Functions to Audit (Top 10 CRITICAL)

These are the most critical functions to audit first, prioritized by:
1. Impact on security (financial/personal data)
2. Privilege requirements
3. User-facing functionality

---

## 1. `public.encrypt_pii` - AUDIT PENDING ⏳

**Impact**: Encryption of personally identifiable data (names, IDs, documents)
**Risk**: Could expose or improperly encrypt sensitive user data
**Privilege Required**: HIGH (needs to encrypt all user data)

### Current Status

**Finding**: Function not found in current migration schema. Needs verification if:
1. Function was removed in newer migrations
2. Encryption handled differently (e.g., via app-level encryption)
3. Function exists under different name

### Investigation Required

```sql
-- Search for encryption functions
SELECT proname, prosecdef, pronargs
FROM pg_proc
WHERE proname ILIKE '%encrypt%' OR proname ILIKE '%crypto%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check all SECURITY DEFINER functions
SELECT proname, prosecdef
FROM pg_proc
WHERE prosecdef = true
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 20;
```

### Verification

- [ ] Verify function exists in production
- [ ] If exists: Review search_path configuration
- [ ] If removed: Document reason for removal
- [ ] If renamed: Find new function name and audit it

**Status**: 🔍 INVESTIGATION NEEDED

---

## 2. `public.decrypt_pii` - CRITICAL ⚠️

**Impact**: Decryption of PII (reverse of encrypt_pii)
**Risk**: Could expose decrypted data to unauthorized users
**Privilege Required**: HIGH (needs to decrypt user data)

### Audit Steps

```sql
\df+ public.decrypt_pii

-- Check search_path
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'decrypt_pii'
AND routine_schema = 'public';

-- Verify access controls
-- Who can call this function?
-- Are there RLS policies protecting the decrypted data?
```

### Risk Assessment

**Risk Level**: CRITICAL
**Justification**: Decrypts sensitive personal data; if compromised, exposes PII
**Action**: ✅ Audit required

### Questions

- [ ] Can unauthenticated users call this?
- [ ] Does it properly validate the encrypted input?
- [ ] Is there audit logging of decryption access?
- [ ] Is the encryption key properly protected?

**Status**: ⏳ TO DO

---

## 3. `public.process_split_payment` - CRITICAL ⚠️ [AUDIT IN PROGRESS]

**Impact**: Core payment processing - splits payment between renter and platform
**Risk**: Could allow unauthorized payment manipulation or theft
**Privilege Required**: VERY HIGH (financial transactions)

### Source
- **File**: [20251028_add_split_payment_system.sql](../supabase/migrations/20251028_add_split_payment_system.sql#L150)
- **Lines**: 150-259
- **Status**: SECURITY DEFINER confirmed

### Function Definition Analysis

```plpgsql
CREATE OR REPLACE FUNCTION process_split_payment(
    p_booking_id UUID,
    p_total_amount NUMERIC
)
RETURNS TABLE (
    split_payment_id UUID,
    locador_amount NUMERIC,
    platform_amount NUMERIC,
    locador_transaction_id UUID,
    platform_transaction_id UUID
) AS $$
... (implementation)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Audit Findings

#### ✅ POSITIVE FINDINGS
- **SECURITY DEFINER**: Properly declared (line 259)
- **Input Validation**: Booking existence checked (line 172-176)
- **Error Handling**: Raises exception if booking not found
- **Amount Validation**: Uses wallet_split_config to determine fees (line 179-184)
- **Fee Calculation**: Properly calculated with COALESCE fallback (line 187-188)
- **Transaction Logging**: Creates wallet_transactions for both parties (line 194-243)
- **Data Integrity**: Uses INSERT INTO ... RETURNING to track transaction IDs

#### ⚠️ AUDIT CONCERNS

1. **No search_path SET**: Function doesn't have explicit `search_path` configured
   - Risk: Potential privilege escalation via malicious schema
   - Recommendation: Add `SET search_path = public, pg_temp` to function

2. **No Authorization Check**: Function doesn't validate who is calling it
   - Current: Any role with EXECUTE permission can call
   - Should: Add check for `auth.uid() = v_booking.owner_id` or `IS_ADMIN()`

3. **No Amount Limits**: Function accepts any amount without upper bounds
   - Risk: Could be called with unrealistic amounts
   - Should: Add validation against booking details or MAX_TRANSACTION_AMOUNT

4. **Platform User ID Hardcoded**: `'00000000-0000-0000-0000-000000000001'`
   - Risk: If this user doesn't exist, transaction creation fails silently
   - Should: Query actual platform user or use function parameter

5. **No Audit Logging**: Doesn't log who called the function or when
   - Should: Add function call logging to audit_log table

### Key Questions - Answered

- [x] Why does this need SECURITY DEFINER?
  - **Answer**: Needs to insert directly into wallet_transactions table on behalf of users

- [ ] Who is authorized to call this function?
  - **Answer**: UNKNOWN - No authorization check found

- [x] Are there amount limits/checks?
  - **Answer**: NO - Any amount accepted

- [x] Is every payment logged?
  - **Answer**: PARTIAL - Wallet transactions logged but function call not logged

- [x] Is the split ratio hardcoded?
  - **Answer**: NO - Uses wallet_split_config table (with 10% fallback)

### Remediation Required

```sql
-- 1. Add search_path to prevent privilege escalation
ALTER FUNCTION public.process_split_payment(uuid, numeric)
  SET search_path = public, pg_temp;

-- 2. Verify platform user exists
SELECT id FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Add authorization check to function body (review existing RLS policies)
-- Consider: Should this be callable only by Edge Functions/system?

-- 4. Add amount validation
-- Consider: Add MAX CHECK against booking rental_total_cost

-- 5. Add audit logging
-- Consider: Create audit_log entry before returning
```

### Verification Checklist

- [x] Function definition reviewed
- [ ] Authorization mechanism documented
- [ ] Amount limits established
- [ ] search_path configuration verified
- [ ] Audit logging confirmed
- [ ] Platform user ID verified to exist
- [ ] Security lead approval obtained

**Status**: 📋 DOCUMENTATION COMPLETE - REQUIRES REMEDIATION

---

## 4. `public.wallet_lock_rental_and_deposit` - CRITICAL ⚠️ [AUDIT IN PROGRESS]

**Impact**: Locks user wallet funds (holds money during rental)
**Risk**: Could lock/unlock wrong amounts or for wrong users
**Privilege Required**: HIGH (financial locks)

### Source
- **File**: [20251115_fix_wallet_lock_rental_with_separated_balances.sql](../supabase/migrations/20251115_fix_wallet_lock_rental_with_separated_balances.sql#L17)
- **Lines**: 17-233
- **Status**: SECURITY DEFINER confirmed (line 30)
- **Last Updated**: 2025-11-15 (recent fix for balance separation)

### Function Definition

```plpgsql
CREATE OR REPLACE FUNCTION public.wallet_lock_rental_and_deposit(
  p_booking_id UUID,
  p_rental_amount NUMERIC,
  p_deposit_amount NUMERIC DEFAULT 300
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  rental_lock_transaction_id UUID,
  deposit_lock_transaction_id UUID,
  total_locked NUMERIC,
  new_available_balance NUMERIC,
  new_locked_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
...
$$;
```

### Audit Findings

#### ✅ POSITIVE FINDINGS
- **SECURITY DEFINER**: Properly declared (line 30)
- **Proper Authorization**: Granted to `authenticated` role only (line 255)
- **Comprehensive Validation**: Multi-step validation (lines 89-126)
  - Checks deposit amount against `autorentar_credit_balance_cents`
  - Checks rental amount against `available_balance_cents`
  - Separated fund validation (FIX from 2025-11-15)
- **Separate Transaction Tracking**: Creates separate wallet_ledger entries for rental and deposit (lines 133-175)
- **Clear Error Messages**: Helpful messages showing exact deficit (lines 95-125)
- **Recent Security Fix**: Latest migration (2025-11-15) explicitly separates balance types
- **Input Validation**: Checks for booking existence (lines 46-57)
- **Atomic Operations**: All updates wrapped in single transaction
- **Documentation**: Extensive COMMENT added with examples (lines 235-249)

#### ⚠️ AUDIT CONCERNS

1. **No search_path SET**: Function doesn't have explicit `search_path` configured
   - Risk: Potential privilege escalation via schema injection
   - Recommendation: Add `SET search_path = public, pg_temp`

2. **No Caller Authorization**: Doesn't verify that `auth.uid() = v_renter_id`
   - Current: Any authenticated user can lock funds for any booking
   - Should: Check `auth.uid() = (SELECT renter_id FROM bookings WHERE id = p_booking_id)`

3. **Race Condition Risk**: Multiple simultaneous calls could cause double-locking
   - Current: Updates `user_wallets` without row-level locking
   - Should: Use `FOR UPDATE` clause when selecting wallet (line 67)

4. **No Audit Logging**: Doesn't log who called the function
   - Should: Insert into audit_log table with user_id, timestamp, action

5. **TODO Comments Left in Code**: Line 205 has `-- TODO: agregar campo si no existe`
   - Indicates incomplete implementation for `deposit_lock_transaction_id`

6. **Soft Constraint on Amounts**: `DEFAULT 300` for deposit but no validation that amounts match booking
   - Risk: Could lock wrong amounts
   - Should: Query booking details and validate amounts

### Key Questions - Answered

- [x] Why does this need SECURITY DEFINER?
  - **Answer**: Needs to update wallet balances on behalf of users

- [ ] Who is authorized to call this function?
  - **Answer**: ISSUE - Any authenticated user (no caller validation)

- [x] Are there sufficient fund checks?
  - **Answer**: YES - Separate validation for rental and deposit amounts

- [x] What prevents double-locking?
  - **Answer**: ISSUE - No row-level lock; race condition possible

- [x] Is the booking valid?
  - **Answer**: YES - Checked at line 46-57

### Remediation Required

```sql
-- 1. Add search_path to prevent privilege escalation
ALTER FUNCTION public.wallet_lock_rental_and_deposit(uuid, numeric, numeric)
  SET search_path = public, pg_temp;

-- 2. Add caller authorization check (modify function body)
-- In the function, after getting renter_id, add:
-- IF auth.uid() != v_renter_id THEN
--   RAISE EXCEPTION 'Unauthorized: can only lock own funds';
-- END IF;

-- 3. Add row-level lock to prevent race conditions (modify line 63-68)
-- SELECT ... INTO v_protection_cents, v_cash_cents
-- FROM user_wallets
-- WHERE user_id = v_renter_id
-- FOR UPDATE;  -- <- Add this

-- 4. Complete the TODO for deposit_lock_transaction_id
-- Add deposit_amount_cents column to bookings if missing
-- Return v_deposit_tx_id instead of NULL::UUID

-- 5. Add audit logging (before returning)
-- INSERT INTO audit_log (...) VALUES (...);
```

### Verification Checklist

- [x] Function definition reviewed
- [ ] Authorization check implemented
- [ ] Race condition prevention (row-level lock)
- [x] search_path configuration needed
- [ ] Audit logging implemented
- [x] Input validation confirmed
- [ ] TODO items completed

**Status**: 📋 DOCUMENTATION COMPLETE - MINOR ISSUES FOUND - REQUIRES REMEDIATION

---

## 5. `public.wallet_unlock_funds` - CRITICAL ⚠️

**Impact**: Releases locked funds back to user
**Risk**: Could unlock wrong amounts or for wrong bookings
**Privilege Required**: HIGH (financial locks)

### Audit Steps

```sql
\df+ public.wallet_unlock_funds

-- Verify authorization
-- Only the original booking owner/system should unlock
-- Verify amount matches what was locked
-- Check for audit trail
```

**Status**: ⏳ TO DO

---

## 6. `public.complete_payment_split` - CRITICAL ⚠️

**Impact**: Finalizes payment after rental completion
**Risk**: Could mark payments as complete without actually processing
**Privilege Required**: HIGH

### Audit Steps

```sql
\df+ public.complete_payment_split

-- Verify it:
-- ☐ Validates booking is completed
-- ☐ Calculates final amounts correctly
-- ☐ Creates payment records
-- ☐ Updates booking status
-- ☐ Logs all changes
```

**Status**: ⏳ TO DO

---

## 7. `public.register_payment_split` - CRITICAL ⚠️

**Impact**: Registers a new payment split (initial payment setup)
**Risk**: Could incorrectly register payments
**Privilege Required**: HIGH

### Audit Steps

```sql
\df+ public.register_payment_split

-- Verify it validates:
-- ☐ Payment method exists
-- ☐ User has permission to make payment
-- ☐ Split percentages are correct
-- ☐ Amount is reasonable
```

**Status**: ⏳ TO DO

---

## 8. `public.update_payment_intent_status` - CRITICAL ⚠️

**Impact**: Updates payment processing status
**Risk**: Could mark pending payments as complete/failed incorrectly
**Privilege Required**: HIGH

### Audit Steps

```sql
\df+ public.update_payment_intent_status

-- Check what statuses are allowed
-- Who can change status?
-- Are all changes logged?
-- Can status go backwards (pending → confirmed)?
```

**Status**: ⏳ TO DO

---

## 9. `public.send_encrypted_message` - CRITICAL ⚠️

**Impact**: Sends encrypted messages between users
**Risk**: Could bypass encryption or send messages impersonating users
**Privilege Required**: MEDIUM-HIGH (can read/write messages)

### Audit Steps

```sql
\df+ public.send_encrypted_message

-- Verify it:
-- ☐ Validates sender is authenticated
-- ☐ Encrypts message before storage
-- ☐ Can't send as another user
-- ☐ Recipient exists and is valid
-- ☐ Messages are logged
```

**Status**: ⏳ TO DO

---

## 10. `public.update_profile_with_encryption` - CRITICAL ⚠️

**Impact**: Updates user profile including encrypted fields
**Risk**: Could update other users' profiles or corrupt encrypted data
**Privilege Required**: HIGH (user data modification)

### Audit Steps

```sql
\df+ public.update_profile_with_encryption

-- Verify authorization:
-- ☐ Can only update own profile
-- ☐ Encrypted fields are properly encrypted
-- ☐ Can't modify email/ID without verification
-- ☐ All changes are logged
-- ☐ Search_path is set
```

**Status**: ⏳ TO DO

---

## Week 1 Audit Workflow

### For Each Function (45 min):

```bash
# 1. Open Supabase SQL Editor
# 2. Run: \df+ public.[function_name]
# 3. Review the function definition
# 4. Answer the audit questions above
# 5. Check and set search_path if needed
# 6. Document findings in this file
# 7. Mark as COMPLETE below
```

### Documentation Template

After auditing each function, fill this in:

```markdown
## [Function Name] - AUDIT COMPLETE ✅

**Date Audited**: 2025-11-18
**Auditor**: [Your Name]
**Status**: APPROVED / REQUIRES FIXES / CRITICAL ISSUES

### Findings

- [ ] Search_path: ✅ Properly set / ⚠️ Needs fixing
- [ ] Authorization: ✅ Correct / ⚠️ Issues found
- [ ] SQL Injection: ✅ Safe / ⚠️ Risks detected
- [ ] Logging: ✅ Present / ❌ Missing
- [ ] Documentation: ✅ Complete / ❌ Lacking

### Actions Required

1. If APPROVED:
   ```sql
   COMMENT ON FUNCTION public.[function_name](...) IS
   'Audited 2025-11-18. Approved. Search_path set.';
   ```

2. If REQUIRES FIXES:
   - List specific fixes needed
   - Create GitHub Issue with tag #SECURITY-FIX

3. If CRITICAL ISSUES:
   - Disable function immediately if possible
   - Create URGENT GitHub Issue
   - Notify security team
```

---

## Progress Tracking

### Functions Audited

- [ ] 1. encrypt_pii
- [ ] 2. decrypt_pii
- [ ] 3. process_split_payment
- [ ] 4. wallet_lock_rental_and_deposit
- [ ] 5. wallet_unlock_funds
- [ ] 6. complete_payment_split
- [ ] 7. register_payment_split
- [ ] 8. update_payment_intent_status
- [ ] 9. send_encrypted_message
- [ ] 10. update_profile_with_encryption

### Summary

- **Target**: 10/10 functions audited
- **Current**: 0/10
- **Approval Rate**: 0%
- **Critical Issues Found**: 0
- **Hours Spent**: 0/7.5

---

## Next Steps (After Auditing)

1. **Document all findings** in GitHub Issue #SECURITY-AUDIT-WEEK1
2. **Create follow-up Issues** for any fixes needed
3. **Update function comments** with audit dates
4. **Get security lead approval** before closing

---

## Resources

- Supabase SQL Editor: https://app.supabase.com/project/[project-id]/sql/new
- PostgreSQL Function Docs: https://www.postgresql.org/docs/current/sql-createfunction.html
- SECURITY_DEFINER Guide: https://www.postgresql.org/docs/current/sql-createfunction.html#id1.9.3.17.5.9
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

---

## Week 1 Status

**Start Date**: November 18, 2025
**Target End**: November 24, 2025
**Progress**: 0% Complete

Next: Start with encrypt_pii ➜

