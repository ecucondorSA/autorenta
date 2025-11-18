# 🚀 DEPLOY WEEK 1 REMEDIATION NOW

**Status**: ✅ Ready to Deploy
**Time**: ~45 minutes total
**Risk After Deploy**: 🟢 VERY LOW (from 🔴 HIGH)

---

## STEP 1: Get Migration Content (2 min)

The migration file is here:
```
/supabase/migrations/20251118_security_definer_remediation_complete.sql
```

**Option A: Copy from terminal**
```bash
cat supabase/migrations/20251118_security_definer_remediation_complete.sql | pbcopy
```

**Option B: Open in editor and copy**
- Open the file in your editor
- Select all (Cmd+A / Ctrl+A)
- Copy (Cmd+C / Ctrl+C)

---

## STEP 2: Open Supabase SQL Editor (1 min)

1. Go to: https://app.supabase.com/project/pisqjmoklivzpwufhscx/sql/new
2. Or click: Dashboard → SQL Editor → New Query

You'll see a blank SQL editor.

---

## STEP 3: Paste & Execute (5 min)

1. **Paste** the migration content (Cmd+V / Ctrl+V)
2. **Click "Run"** button (top right)
3. **Wait** for execution to complete

**You'll see output like:**
```
=== Security Remediation Validation ===
✅ All critical functions have search_path configured
✅ Platform system user exists and is configured
=== Remediation Complete ===
```

If you see all three ✅ messages → **Deployment succeeded!**

---

## STEP 4: Validate Deployment (10 min)

Copy & run these queries in Supabase SQL Editor to verify:

### Query 1: Verify search_path
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

**Expected**: All 6 rows show '✅ HAS search_path'

### Query 2: Verify RLS Enabled
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

**Expected**: All rows show 't' (true) for rowsecurity

### Query 3: Verify Platform User
```sql
SELECT id, email
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
```

**Expected**: One row with system user

---

## STEP 5: Test Payment Flow (30 min)

```bash
# 1. Start development environment
npm run dev

# 2. Test payment processing via UI:
#    - Create a test booking
#    - Process payment
#    - Verify balances update

# 3. Check logs for errors:
#    - Open browser console
#    - Check Supabase logs
#    - Look for authorization errors (expected: none)
```

---

## ✅ Success Criteria

After deployment, verify ALL of these:

- ✅ All 6 functions have search_path configured (Query 1)
- ✅ RLS enabled on all 5 financial tables (Query 2)
- ✅ Platform system user exists (Query 3)
- ✅ Payment flow works end-to-end
- ✅ No authorization errors in logs
- ✅ No regressions in existing features

---

## ⚠️ If Something Goes Wrong

### Issue: "Function already exists" errors
**Solution**: This is normal. The migration uses CREATE OR REPLACE. It will update existing functions.

### Issue: Authorization errors in wallet functions
**Solution**: Expected behavior. These checks now prevent unauthorized access. Test with correct user.

### Issue: Payment processing fails
**Solution**: Check if platform user exists (Query 3). If missing, contact support.

### Full Rollback
Contact Supabase support to restore from backup before this migration.

---

## 📋 Quick Checklist

- [ ] Copy migration content (Step 1)
- [ ] Open Supabase SQL Editor (Step 2)
- [ ] Paste & execute (Step 3)
- [ ] See all ✅ validation messages
- [ ] Run Query 1 (verify search_path)
- [ ] Run Query 2 (verify RLS)
- [ ] Run Query 3 (verify platform user)
- [ ] Test payment flow (Step 5)
- [ ] Verify success criteria

---

## Documentation Reference

**Full Guides:**
- [DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md) - Detailed instructions
- [WEEK1_STATUS.md](./WEEK1_STATUS.md) - Complete overview
- [WEEK1_COMPLETE_SUMMARY.md](./docs/WEEK1_COMPLETE_SUMMARY.md) - Full details

**What Changed:**
- Phase 1: Added search_path to 6 SECURITY_DEFINER functions
- Phase 2: Added authorization checks to 3 functions
- Phase 3: Added race condition prevention with locks & idempotency
- RLS: Enabled on 5 critical financial tables

---

## Deployment Time Estimate

| Step | Time | Status |
|------|------|--------|
| Copy migration | 2 min | Quick |
| Open Supabase | 1 min | Quick |
| Paste & execute | 5 min | Automated |
| Validate (3 queries) | 10 min | Quick |
| Test payment flow | 30 min | Thorough |
| **TOTAL** | **48 min** | ✅ Ready |

---

**Status**: ✅ Ready to deploy
**Next**: Follow Step 1 above to begin deployment

