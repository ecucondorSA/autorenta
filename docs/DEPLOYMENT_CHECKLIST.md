# Week 1 Remediation - Deployment Checklist

**Status**: ✅ READY FOR DEPLOYMENT
**Date**: November 18, 2025
**Risk Reduction**: HIGH → MEDIUM → LOW → VERY LOW

---

## Quick Summary

All remediation phases are complete and committed:
- ✅ Phase 1: search_path configuration (6 functions)
- ✅ Phase 2: Authorization checks (wallet_lock, send_encrypted_message)
- ✅ Phase 3: Race condition prevention (FOR UPDATE, idempotency)
- ✅ RLS enabled on critical tables

**Migration file**: `/supabase/migrations/20251118_security_definer_remediation_complete.sql`

---

## Pre-Deployment Checklist

Before deploying, verify:

- [ ] Database backup available (via Supabase Dashboard)
- [ ] Monitoring/alerting configured in Supabase
- [ ] Team reviewed audit findings (see [WEEK1_SECURITY_AUDIT.md](./WEEK1_SECURITY_AUDIT.md))
- [ ] Security lead approved (see risk assessment in [WEEK1_COMPLETE_SUMMARY.md](./WEEK1_COMPLETE_SUMMARY.md))

---

## Deployment Steps (Via Supabase Dashboard - RECOMMENDED)

### Step 1: Open Supabase SQL Editor
1. Go to: https://app.supabase.com/project/pisqjmoklivzpwufhscx/sql/new
2. (Or: Dashboard → SQL Editor → New Query)

### Step 2: Copy Migration Content
```bash
# On your local machine, copy the migration:
cat supabase/migrations/20251118_security_definer_remediation_complete.sql | pbcopy
# (Or: Just open file and select all text)
```

### Step 3: Execute in SQL Editor
1. Paste entire content into Supabase SQL Editor
2. Click **"Run"** button
3. Monitor output for:
   - ✅ "All critical functions have search_path configured"
   - ✅ "Platform system user exists and is configured"
   - ✅ "Remediation Complete"

### Step 4: Verify Deployment Success
If you see all three ✅ messages, deployment succeeded.

---

## Post-Deployment Validation (Run These Queries)

### Validation 1: Verify search_path
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

-- Expected: All 6 rows show '✅ HAS search_path'
```

### Validation 2: Verify Platform User
```sql
SELECT id, email
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Expected: One row with system user
```

### Validation 3: Verify RLS Enabled
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

-- Expected: All rows show 't' (true) for rowsecurity
```

---

## Testing Payment Flow (After Deployment)

```bash
# 1. Start development environment
npm run dev

# 2. Create test booking with payment processing
# Via UI: Create booking → Process payment

# 3. Verify in Supabase logs:
# - No authorization errors in wallet_lock_rental_and_deposit
# - Payment split completes successfully
# - No race condition issues

# 4. Check wallet balances updated correctly:
SELECT id, available_balance_cents, locked_balance_cents
FROM user_wallets
WHERE user_id IN (SELECT renter_id FROM bookings LIMIT 1);
```

---

## Success Criteria (Verify All)

After deployment:

- ✅ All 6 functions have search_path configured
- ✅ Platform system user exists (00000000-0000-0000-0000-000000000001)
- ✅ Authorization checks prevent unauthorized access
- ✅ RLS enabled on all 5 critical financial tables
- ✅ Payment flow works end-to-end
- ✅ No regressions in existing functionality
- ✅ No authorization errors in logs

---

## If Something Goes Wrong

### Issue: Authorization errors in wallet_lock functions
**Solution**: Check that auth.uid() matches the renter_id in test. These checks are expected to prevent unauthorized access.

### Issue: Payment split fails
**Solution**: Verify platform user exists with validation query above. If missing, contact security team.

### Issue: RLS prevents payment operations
**Solution**: RLS policies need to be created separately (Week 2). For now, RLS is enabled but policies are pending.

### Full Rollback
Contact Supabase support to restore from backup before this deployment. Otherwise, see [DEPLOYMENT_INSTRUCTIONS_WEEK1_REMEDIATION.md](./DEPLOYMENT_INSTRUCTIONS_WEEK1_REMEDIATION.md#rollback-procedure).

---

## Timeline

| Step | Time | Dependency |
|------|------|------------|
| Deploy migration | 5 min | None |
| Run validation queries | 10 min | Deployment complete |
| Test payment flow | 30 min | Validation passed |
| **Total** | **45 min** | — |

---

## Next Steps (Week 2)

1. Audit remaining 3 functions in production (encrypt_pii, decrypt_pii, wallet_unlock_funds)
2. Complete RLS policies for all 5 financial tables
3. Implement audit logging (Phase 4 - optional)

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| [WEEK1_COMPLETE_SUMMARY.md](./WEEK1_COMPLETE_SUMMARY.md) | Overview of all Week 1 work |
| [WEEK1_SECURITY_AUDIT.md](./WEEK1_SECURITY_AUDIT.md) | Detailed audit of 10 functions |
| [WEEK1_AUDIT_SUMMARY.md](./WEEK1_AUDIT_SUMMARY.md) | Executive summary |
| [WEEK1_REMEDIATION_SQL.md](./WEEK1_REMEDIATION_SQL.md) | SQL templates and patterns |
| [DEPLOYMENT_INSTRUCTIONS_WEEK1_REMEDIATION.md](./DEPLOYMENT_INSTRUCTIONS_WEEK1_REMEDIATION.md) | Detailed deployment guide |

---

## Git Commits

Latest commits ready for deployment:

```
e67272c4 feat: Implement complete security remediation - Phases 1, 2, 3
2a170497 docs: Week 1 remediation SQL templates - CRITICAL fixes ready
baa22176 docs: Complete Week 1 security audit - all 10 CRITICAL functions
```

---

**Status**: ✅ Ready to deploy
**Risk Level After Deployment**: VERY LOW
**Estimated Deployment Time**: 45 minutes

