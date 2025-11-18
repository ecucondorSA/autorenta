# Week 2 Plan - Security Hardening Continuation

**Status**: 🟡 PLANNED (Ready to begin after Week 1 validation)
**Estimated Duration**: 3-4 days (18-24 hours of work)
**Risk Reduction**: VERY LOW → MINIMAL
**Start Date**: November 19, 2025

---

## 📋 Overview

Week 2 focuses on completing the security hardening by:
1. Creating RLS policies for 3 tables (Phase 4)
2. Investigating 3-4 missing functions (Phase 5)
3. Performance optimization with indexes (Phase 6)

---

## 🎯 Task 1: RLS Policy Implementation (4 hours)

### 1.1: wallet_transactions Policies

**Current Status**: RLS enabled, NO policies (all access blocked)

**Required Policies**:
```sql
-- Users can only view their own transactions
CREATE POLICY wallet_transactions_user_select
  ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can INSERT (via trigger or function)
CREATE POLICY wallet_transactions_system_insert
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (true);

-- Prevent DELETE and UPDATE for users
-- (only system should modify via function)
```

**Audit Queries**:
```sql
-- Test user_1 can only see own transactions
SET LOCAL "request.jwt.claims" = '{"sub": "user_1_uuid"}';
SELECT COUNT(*) FROM public.wallet_transactions
WHERE user_id = 'user_1_uuid';  -- Should return transactions

SET LOCAL "request.jwt.claims" = '{"sub": "user_2_uuid"}';
SELECT COUNT(*) FROM public.wallet_transactions
WHERE user_id = 'user_1_uuid';  -- Should return 0 (access denied)
```

### 1.2: payment_intents Policies

**Current Status**: RLS enabled, NO policies

**Required Policies**:
```sql
-- Users can view payment intents related to their wallets
CREATE POLICY payment_intents_user_select
  ON public.payment_intents
  FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM public.user_wallets
      WHERE user_id = auth.uid()
    )
  );

-- Only system can INSERT
CREATE POLICY payment_intents_system_insert
  ON public.payment_intents
  FOR INSERT
  WITH CHECK (true);

-- Only system can UPDATE
CREATE POLICY payment_intents_system_update
  ON public.payment_intents
  FOR UPDATE
  USING (true);  -- All updates via system functions
```

### 1.3: messages Policies

**Current Status**: RLS enabled, NO policies

**Required Policies**:
```sql
-- Users can view messages where they are sender or recipient
CREATE POLICY messages_user_select
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = recipient_id
  );

-- Users can only INSERT their own messages
CREATE POLICY messages_user_insert
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Prevent DELETE and UPDATE for users
CREATE POLICY messages_no_update
  ON public.messages
  FOR UPDATE
  USING (false);

CREATE POLICY messages_no_delete
  ON public.messages
  FOR DELETE
  USING (false);
```

**Expected Outcome**: All 3 tables have complete RLS policies
**Validation Time**: 30 minutes
**Blocking**: Nothing - policies are additive

---

## 🔍 Task 2: Missing Functions Audit (3 hours)

### 2.1: Investigate encrypt_pii Function

**Current Status**: Not found in `pg_proc`

**Investigation Steps**:
```bash
# 1. Search in migration files
grep -r "encrypt_pii" supabase/migrations/

# 2. Search in Edge Functions
grep -r "encrypt_pii" supabase/functions/

# 3. Query production
psql -c "SELECT * FROM pg_proc WHERE proname LIKE '%encrypt%'"
```

**Possible Outcomes**:
- [ ] Function exists but named differently
- [ ] Function never implemented (can be created if needed)
- [ ] Function exists in production but not in local schema

**Action Needed**:
1. If exists: Document location and current hardening status
2. If missing: Determine if needed for production or can be deferred

### 2.2: Investigate decrypt_pii Function

**Same process as encrypt_pii**

### 2.3: Investigate wallet_unlock_funds Function

**Current Status**: Not found in `pg_proc`

**Investigation Steps**:
```bash
# Check if might be in wallet-related functions
psql -c "SELECT proname FROM pg_proc WHERE proname LIKE '%wallet%' OR proname LIKE '%unlock%'"

# Check for event triggers that might call unlock logic
psql -c "SELECT * FROM pg_event_trigger WHERE evtname LIKE '%unlock%'"
```

**Key Question**: Is this function essential for production?
- If YES: Implement hardening immediately
- If NO: Document as deferred, add to Phase 5

### 2.4: Check update_profile_with_encryption

**Same investigation pattern**

**Decision Tree**:
```
For each function:
  IF exists in production:
    - Document current implementation
    - Apply hardening (search_path + auth checks)
  ELSE IF needed for features:
    - Create function with built-in security
  ELSE:
    - Document as deferred/not-implemented
```

**Expected Outcome**: Clear inventory of 4 functions + remediation plan
**Blocking**: Nothing - documentation only, can implement async

---

## ⚡ Task 3: Performance Optimization (3 hours)

### 3.1: Index Creation Plan

**Step 1: Analyze Sequential Scans** (30 min)
```bash
# Run performance analysis
@autorenta-platform Analiza performance de tablas
```

**Step 2: Create Critical Indexes** (1 hour)

**Index 1**: bookings table
```sql
-- Most queries filter by car_id, renter_id, status
CREATE INDEX IF NOT EXISTS idx_bookings_car_id_status
  ON public.bookings(car_id, status)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_renter_id
  ON public.bookings(renter_id)
  WHERE status IN ('active', 'completed');
```

**Index 2**: cars table
```sql
-- Owner views, active cars listing
CREATE INDEX IF NOT EXISTS idx_cars_owner_id_status
  ON public.cars(owner_id, status)
  WHERE status IN ('draft', 'active', 'pending');
```

**Index 3**: wallet_transactions table
```sql
-- User views, date-range queries
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created
  ON public.wallet_transactions(user_id, created_at DESC)
  WHERE status != 'cancelled';
```

**Index 4**: payment_intents table
```sql
-- Payment tracking by user
CREATE INDEX IF NOT EXISTS idx_payment_intents_wallet_status
  ON public.payment_intents(wallet_id, status);
```

**Index 5**: messages table
```sql
-- Inbox queries (messages by user)
CREATE INDEX IF NOT EXISTS idx_messages_recipient
  ON public.messages(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON public.messages(sender_id, created_at DESC);
```

**Step 3: Validate Index Usage** (30 min)
```bash
# Check index effectiveness
EXPLAIN ANALYZE SELECT * FROM public.bookings
WHERE car_id = 'xxx' AND status = 'active';

# Should show "Index Scan" not "Sequential Scan"
```

**Expected Outcome**: 40-60% query speedup for common operations
**Blocking**: None - indexes are additive

---

## 📊 Task 4: Testing & Validation (2 hours)

### 4.1: RLS Policy Testing

**Test Case 1**: User can only see own wallet transactions
```bash
# As User A
npm run test:quick -- wallet-transactions

# Verify:
# - Can see own transactions ✅
# - Cannot see other users' transactions ✅
```

**Test Case 2**: Message access control
```bash
# As User A
# - Can view messages where A is sender or recipient ✅
# - Cannot view messages where A is neither ✅
# - Cannot modify messages ✅
```

### 4.2: Function Authorization Testing

**Test Case 3**: wallet_lock_rental_and_deposit authorization
```bash
# As Renter
npm run dev
# Create booking as renter
# Lock funds - should succeed ✅

# As Different User
# Try to lock funds for renter's booking
# Should fail with "Unauthorized" ✅
```

### 4.3: Payment Flow Testing

```bash
# Test complete payment flow
npm run test:quick -- payment-flow

# Verify:
# - Authorization checks pass ✅
# - RLS policies allow transactions ✅
# - Indexes improve performance ✅
```

---

## 🗂️ Implementation Sequence

### Day 1: RLS Policies
- [ ] Create wallet_transactions policy (30 min)
- [ ] Create payment_intents policy (30 min)
- [ ] Create messages policy (30 min)
- [ ] Validate all 3 policies (30 min)
- **Total**: 2 hours

### Day 2: Missing Functions
- [ ] Investigate encrypt_pii (30 min)
- [ ] Investigate decrypt_pii (30 min)
- [ ] Investigate wallet_unlock_funds (30 min)
- [ ] Investigate update_profile_with_encryption (30 min)
- [ ] Document findings & remediation plan (30 min)
- **Total**: 2.5 hours

### Day 3: Performance & Testing
- [ ] Analyze sequential scans (30 min)
- [ ] Create indexes (1 hour)
- [ ] Validate index usage (30 min)
- [ ] Integration testing (1 hour)
- **Total**: 3 hours

---

## 📈 Success Criteria

**By end of Week 2:**
- ✅ All RLS policies created and tested
- ✅ 3-4 missing functions inventoried with remediation plan
- ✅ 5+ performance indexes created
- ✅ All tests passing
- ✅ Zero regressions from Week 1 deployment
- ✅ Documentation updated with Week 2 changes

---

## 🚀 Triggering Week 2 Work

When ready to start Week 2, use:

```bash
# Phase 4: Create RLS policies
@autorenta-platform Genera RLS policies para wallet_transactions, payment_intents, messages

# Phase 5: Investigate missing functions
@autorenta-platform Audita funciones faltantes: encrypt_pii, decrypt_pii, wallet_unlock_funds

# Phase 6: Performance optimization
@autorenta-platform Crea indexes para bookings, cars, wallet_transactions
```

Or run full Week 2:
```bash
npm run audit:week2
```

---

## 📝 Notes

### Estimated Timeline
- If working 6 hours/day: 3-4 days
- If working 8 hours/day: 2-3 days
- If working 12 hours/day: 1.5-2 days

### Priorities
1. **HIGH**: RLS policies (blocking for production security)
2. **MEDIUM**: Missing functions (inventory & plan)
3. **LOW**: Performance indexes (nice-to-have, doesn't block)

### Risks
- Missing functions might not exist or have dependencies
- RLS policies might conflict with existing queries (unlikely but possible)
- Performance indexes could slow down writes slightly (trade-off)

### Mitigation
- Test RLS policies thoroughly before production deployment
- Validate indexes don't hurt INSERT/UPDATE performance
- Have rollback plan if issues arise

---

**Next Action**: Monitor Week 1 deployment for 24 hours, then start Week 2 on Day 2.

