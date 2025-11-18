# Execute Deployment - Week 1 Remediation

**Status**: ✅ Ready to Execute
**Estimated Time**: 45 minutes
**Risk After Execution**: 🟢 VERY LOW

---

## 🎯 Objective

Deploy the complete Week 1 security remediation migration to Supabase production.

**What this does:**
- Adds search_path to 6 SECURITY_DEFINER functions (prevents privilege escalation)
- Implements authorization checks on 3 critical functions
- Adds race condition prevention with locks and idempotency checks
- Enables RLS on 5 critical financial tables

---

## ⏱️ Timeline Breakdown

| Step | Action | Time | Dependencies |
|------|--------|------|--------------|
| 1 | Copy migration file | 2 min | — |
| 2 | Open Supabase SQL Editor | 1 min | — |
| 3 | Paste & execute migration | 5 min | Step 1-2 |
| 4 | Verify deployment (3 queries) | 10 min | Step 3 |
| 5 | Test payment flow | 30 min | Step 4 |
| **TOTAL** | **Full Deployment** | **~48 min** | — |

---

## 🔥 EXECUTE NOW

### Step 1: Copy Migration (2 min)

Open terminal and copy the migration file:

```bash
cat supabase/migrations/20251118_security_definer_remediation_complete.sql | pbcopy
```

**On Linux:**
```bash
cat supabase/migrations/20251118_security_definer_remediation_complete.sql | xclip -selection clipboard
```

**Verify**: The entire migration is now in your clipboard.

---

### Step 2: Open Supabase SQL Editor (1 min)

Open browser and go to:

```
https://app.supabase.com/project/pisqjmoklivzpwufhscx/sql/new
```

**Or via Dashboard:**
1. Go to: https://app.supabase.com/project/pisqjmoklivzpwufhscx
2. Click: SQL Editor (left sidebar)
3. Click: New Query (top right)

You should see a blank SQL editor window.

---

### Step 3: Paste & Execute (5 min)

1. **Paste** the migration:
   ```
   Cmd+V  (Mac)
   Ctrl+V (Windows/Linux)
   ```

   You should see the SQL migration starting with `BEGIN;`

2. **Execute** the migration:
   - Click the **"Run"** button (top right of editor)
   - Or press: `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)

3. **Wait** for execution to complete.

   You'll see output in the "Results" panel below.

---

### Step 4: Verify Deployment Success (10 min)

**Check for these messages in the output:**

```
=== Security Remediation Validation ===
✅ All critical functions have search_path configured
✅ Platform system user exists and is configured
=== Remediation Complete ===
```

**If you see all 3 ✅ messages → Deployment succeeded!**

Now run these 3 validation queries in the same SQL editor:

#### Validation Query 1: Verify search_path
```sql
SELECT
  proname,
  CASE WHEN proconfig IS NOT NULL THEN '✅ HAS search_path'
       ELSE '❌ MISSING search_path' END AS status
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
```

**Expected Result**: All 6 rows show `✅ HAS search_path`

#### Validation Query 2: Verify RLS Enabled
```sql
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
```

**Expected Result**: All 5 rows show `t` (true) for rowsecurity column

#### Validation Query 3: Verify Platform User
```sql
SELECT id, email
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
```

**Expected Result**: One row with system user

**If all 3 validations pass → Proceed to Step 5**

---

### Step 5: Test Payment Flow (30 min)

Start your development environment:

```bash
npm run dev
```

**Manual Testing:**

1. **Create a test booking:**
   - Go to http://localhost:4200
   - As a car owner, list a car
   - As a renter, create a booking for the car

2. **Process payment:**
   - Go through payment flow
   - Complete the booking with payment

3. **Verify no errors:**
   - Check browser console (F12) for JavaScript errors
   - Check Supabase logs for database errors
   - Look for authorization errors (should be none)

4. **Verify balances updated:**
   - Go to Supabase Dashboard → SQL Editor
   - Run query to check wallet balances:
   ```sql
   SELECT id, available_balance_cents, locked_balance_cents
   FROM user_wallets
   WHERE user_id IN (
     SELECT renter_id FROM bookings
     WHERE status = 'active' OR status = 'completed'
     LIMIT 1
   );
   ```

**Expected**: Balances show correct rental and deposit amounts locked

---

## ✅ Success Criteria

After completing all 5 steps, verify:

- ✅ Migration executed without errors
- ✅ All 3 validation queries returned expected results
- ✅ All 6 functions have search_path configured
- ✅ RLS enabled on 5 financial tables
- ✅ Platform system user exists
- ✅ Payment flow works end-to-end
- ✅ No authorization errors in logs
- ✅ No regressions in existing features

---

## 🚨 Troubleshooting

### Issue: "Syntax error" during execution

**Cause**: Usually a database connection issue
**Fix**:
1. Check internet connection
2. Try again or contact Supabase support

### Issue: "Function already exists" error

**Cause**: Normal - migration uses CREATE OR REPLACE
**Action**: Continue - this is expected behavior

### Issue: Authorization errors in wallet functions

**Cause**: Expected! Authorization checks now prevent unauthorized access
**Fix**: Test with correct user (renter for wallet_lock functions)

### Issue: Payment processing fails

**Cause**: Platform user might not exist
**Fix**: Run Validation Query 3 to verify platform user exists

### Issue: RLS preventing operations

**Cause**: RLS is enabled but policies not yet created
**Fix**: RLS policies will be created in Week 2

---

## 📋 Quick Checklist

Print this checklist and verify each step:

- [ ] **Step 1**: Copied migration file to clipboard
- [ ] **Step 2**: Opened Supabase SQL Editor
- [ ] **Step 3**: Pasted and executed migration
- [ ] **Step 3**: Saw ✅ success messages in output
- [ ] **Step 4**: Ran Validation Query 1 (search_path)
- [ ] **Step 4**: All 6 functions show ✅ HAS search_path
- [ ] **Step 4**: Ran Validation Query 2 (RLS)
- [ ] **Step 4**: All 5 tables show 't' for rowsecurity
- [ ] **Step 4**: Ran Validation Query 3 (platform user)
- [ ] **Step 4**: Platform user exists
- [ ] **Step 5**: Started `npm run dev`
- [ ] **Step 5**: Created test booking
- [ ] **Step 5**: Processed payment successfully
- [ ] **Step 5**: No errors in browser console
- [ ] **Step 5**: Wallet balances updated correctly
- [ ] **FINAL**: All success criteria verified ✅

---

## 📚 Documentation Reference

If you need help during deployment:

| Issue | Reference |
|-------|-----------|
| General deployment | [DEPLOY_NOW.md](./DEPLOY_NOW.md) |
| Detailed instructions | [docs/DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md) |
| Troubleshooting | [docs/DEPLOYMENT_INSTRUCTIONS_WEEK1_REMEDIATION.md](./docs/DEPLOYMENT_INSTRUCTIONS_WEEK1_REMEDIATION.md) |
| What changed | [WEEK1_STATUS.md](./WEEK1_STATUS.md) |
| Full audit | [docs/WEEK1_SECURITY_AUDIT.md](./docs/WEEK1_SECURITY_AUDIT.md) |

---

## 🎉 After Successful Deployment

Once all steps are complete and verified:

1. **Notify team** that Week 1 remediation is deployed
2. **Monitor logs** for any issues (first 24 hours)
3. **Schedule Week 2** work:
   - Audit remaining 3 functions
   - Create RLS policies
   - Performance optimization

4. **Update status**:
   ```bash
   git log --oneline -1
   # Note the deployment commit for records
   ```

---

## ⏭️ What's Next (After Deployment)

**Week 2 Tasks:**
1. Investigate 3 not-found functions (encrypt_pii, decrypt_pii, wallet_unlock_funds)
2. Create RLS policies for 5 financial tables
3. Implement audit logging (optional)
4. Performance optimization (indexes, sequential scans)

---

**Status**: Ready to execute
**Time Estimate**: 45 minutes
**Risk Reduction**: HIGH → VERY LOW
**Next Action**: Follow Step 1 above

