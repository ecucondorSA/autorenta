# AutoRenta Database Remediation Plan

**Start Date**: November 18, 2025
**Target Completion**: December 16, 2025 (4 weeks)
**Total Estimated Effort**: 157 hours

---

## Overview

This plan addresses the critical security and performance issues identified in the [AUDIT_BASELINE_20251118.md](./AUDIT_BASELINE_20251118.md).

### Success Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| SECURITY_DEFINER Audited | 0% | 100% | Week 2 |
| RLS Coverage (tables with policies) | 63% (95/150) | 100% | Week 2 |
| Seq Scans (bookings) | 339,492 | < 10,000 | Week 3 |
| Seq Scans (cars) | 140,311 | < 10,000 | Week 3 |

---

## Week 1: Critical Security & RLS Foundation

**Objective**: Establish RLS baseline and audit most critical security functions
**Effort**: 20-25 hours
**Team**: 1 Developer + 1 Security Lead

### Tasks

#### 1.1: Audit Top 10 CRITICAL SECURITY_DEFINER Functions

**Effort**: 7-8 hours (45 min each)

**Functions to audit** (prioritized by usage/impact):
1. `public.encrypt_pii` - Encryption, HIGH RISK
2. `public.decrypt_pii` - Encryption, HIGH RISK
3. `public.process_split_payment` - Payment core, CRITICAL
4. `public.wallet_lock_rental_and_deposit` - Financial, CRITICAL
5. `public.wallet_unlock_funds` - Financial, CRITICAL
6. `public.complete_payment_split` - Payment, CRITICAL
7. `public.register_payment_split` - Payment, CRITICAL
8. `public.update_payment_intent_status` - Payment, CRITICAL
9. `public.send_encrypted_message` - Data, HIGH
10. `public.update_profile_with_encryption` - Data, HIGH

**Steps for each function**:

```sql
-- 1. Review definition
\df+ schema.function_name

-- 2. Check SECURITY DEFINER status
SELECT routine_name, security_type, routine_definition
FROM information_schema.routines
WHERE routine_name = 'function_name'
AND routine_schema = 'schema';

-- 3. Verify search_path is set
-- If not, execute:
ALTER FUNCTION schema.function_name (args...)
  SET search_path = schema, pg_temp;

-- 4. Document in SECURITY_AUDIT.md
-- Why SECURITY_DEFINER is necessary
-- What privileges it requires
-- Risk assessment
```

**Tracking**: Create GitHub Issue #SECURITY-001 through #SECURITY-010

#### 1.2: Enable RLS on 10 Critical Public Tables

**Effort**: 10-12 hours (50 min + 30 min testing each)

**Priority tables** (customer-facing first):
1. `bookings` - Core rental transactions
2. `wallet_transactions` - Financial data
3. `user_verifications` - Identity sensitive
4. `profiles` (if not already) - User data
5. `cars` - Owner-specific data
6. `reviews` - User feedback
7. `messages` - User communication
8. `notifications` - User-specific
9. `car_photos` - Content ownership
10. `favorites` or equivalent - User preferences

**Steps for each table**:

```bash
# 1. Run MCP generator
@autorenta-platform Genera RLS policies para [table_name]

# 2. Review generated SQL
# - Check user_id column is correct
# - Verify policy logic matches business rules
# - Add admin bypass if needed

# 3. Create policies in Supabase
# Copy SQL to SQL Editor → Execute

# 4. Test policies
# - Login as different user roles
# - Verify cannot see others' data
# - Verify can see own data

# 5. Update types
npm run sync:types

# 6. Test in application
npm run dev
# Navigate to feature → Verify still works
```

**Testing checklist**:
- [ ] SELECT policy works (user sees own records)
- [ ] INSERT policy works (user can create)
- [ ] UPDATE policy works (user can modify own)
- [ ] DELETE policy works (user can delete own)
- [ ] Admin can see all (if policy added)
- [ ] Other users blocked

**Tracking**: Create GitHub Issue #RLS-001 through #RLS-010

### Deliverables (End of Week 1)

- [ ] 10 GitHub Issues created for CRITICAL functions
- [ ] All 10 functions documented in SECURITY_AUDIT.md
- [ ] 10 RLS policies created and tested
- [ ] docs/WEEK1_PROGRESS.md completed
- [ ] Updated AUDIT_BASELINE with progress

---

## Week 2: Complete Security & RLS Coverage

**Objective**: Finish critical functions and extend RLS to remaining tables
**Effort**: 15-20 hours
**Team**: 1-2 Developers

### Tasks

#### 2.1: Audit Remaining CRITICAL Functions (35 more)

**Effort**: 26 hours (45 min each)

Focus on functions related to:
- Payments and financial transactions
- User data encryption/decryption
- Permission checks and validation

**Process**: Same as Week 1, but batch them

```bash
# Week 2 routine:
# Monday: Audit functions 11-15
# Tuesday: Audit functions 16-20
# Wednesday: Audit functions 21-25
# Thursday: Audit functions 26-30
# Friday: Audit functions 31-35 + documentation
```

**Tracking**: Create GitHub Issues #SECURITY-011 through #SECURITY-045

#### 2.2: Create RLS Policies for Remaining 17 Critical Tables

**Effort**: 10-12 hours

**Remaining tables**:
1. `wallet_deposits` - Financial
2. `booking_disputes` - Transactions
3. `user_ratings` - User activity
4. `car_availability` - Owner management
5. `driver_telemetry` - User activity
6. `payments` - Payment records
7. `refunds` - Payment related
8. `insurance_claims` - User records
9. `documents` - User documents
10. `bank_accounts` - Financial
11. ... (7 more based on actual tables)

**Process**: Batch generation and testing

```bash
# Generate all remaining policies at once
for table in wallet_deposits booking_disputes user_ratings car_availability ...; do
  @autorenta-platform Genera RLS policies para $table
done

# Test each one
# Apply to Supabase
# Verify in application
```

**Tracking**: Create GitHub Issues #RLS-011 through #RLS-027

#### 2.3: HIGH Priority SECURITY_DEFINER Review (89 functions)

**Effort**: Optional, start if ahead of schedule

Focus on documenting necessity and setting search_path

**Tracking**: Create GitHub Issue #SECURITY-AUDIT-HIGH-PRIORITY

### Deliverables (End of Week 2)

- [ ] All 45 CRITICAL functions audited
- [ ] SECURITY_AUDIT.md complete for critical functions
- [ ] 27 RLS policies created and deployed
- [ ] All policies tested in staging environment
- [ ] docs/WEEK2_PROGRESS.md completed
- [ ] Updated AUDIT_BASELINE with progress

---

## Week 3: Performance Optimization

**Objective**: Optimize database performance, create needed indexes
**Effort**: 15-20 hours
**Team**: 1 Database DBA + 1 Developer

### Tasks

#### 3.1: Create Indexes for CRITICAL Tables

**Effort**: 12-15 hours (2-3 hours per table)

**Priority indexes** (from audit):

**bookings table** (seq_scans: 339k)
```sql
-- Index 1: Most common filter (status + date range)
CREATE INDEX idx_bookings_status_dates
ON bookings(status, start_date, end_date);

-- Index 2: Car and date filtering
CREATE INDEX idx_bookings_car_dates
ON bookings(car_id, start_date, end_date);

-- Index 3: Renter lookups
CREATE INDEX idx_bookings_renter_id
ON bookings(renter_id);

-- Index 4: Owner lookups (join via cars)
CREATE INDEX idx_bookings_car_status
ON bookings(car_id, status);
```

**cars table** (seq_scans: 140k)
```sql
-- Index 1: Status filtering (for active listings)
CREATE INDEX idx_cars_status
ON cars(status);

-- Index 2: Owner queries
CREATE INDEX idx_cars_owner_id
ON cars(owner_id);

-- Index 3: Location + status (for search)
CREATE INDEX idx_cars_location_status
ON cars(location, status);

-- Index 4: Create date (for sorting)
CREATE INDEX idx_cars_created_at
ON cars(created_at DESC);
```

**profiles table** (seq_scans: 41k)
```sql
-- Index 1: Email lookup (unique constraint should exist)
CREATE UNIQUE INDEX idx_profiles_email
ON profiles(email);

-- Index 2: Role-based queries
CREATE INDEX idx_profiles_role
ON profiles(role);

-- Index 3: Verification status
CREATE INDEX idx_profiles_verification
ON profiles(verification_status);
```

**car_photos table** (seq_scans: 31k)
```sql
-- Index 1: Car photo retrieval
CREATE INDEX idx_car_photos_car_id
ON car_photos(car_id);

-- Index 2: Cover photo lookup
CREATE INDEX idx_car_photos_car_is_cover
ON car_photos(car_id, is_cover);
```

**wallet_transactions table**
```sql
-- Index 1: User transaction history
CREATE INDEX idx_wallet_tx_user_date
ON wallet_transactions(user_id, created_at DESC);

-- Index 2: Status filtering
CREATE INDEX idx_wallet_tx_status
ON wallet_transactions(status);

-- Index 3: Type filtering
CREATE INDEX idx_wallet_tx_type
ON wallet_transactions(type);
```

**Steps for each index**:

```bash
# 1. Create the index (low traffic time recommended)
CREATE INDEX CONCURRENTLY idx_name ON table(columns);

# 2. Analyze impact with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE status = 'active'
AND start_date >= '2025-11-18';

# 3. Monitor disk space
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

# 4. Verify in application
npm run dev
# Test features that use these queries
```

**Tracking**: Create GitHub Issue #PERFORMANCE-001 through #PERFORMANCE-008

#### 3.2: Verify Performance Improvements

**Effort**: 3-5 hours

```bash
# Compare seq_scans before and after
@autorenta-platform Analiza performance

# Document improvements
# bookings: 339k → ?
# cars: 140k → ?
# etc.
```

**Tracking**: Create GitHub Issue #PERFORMANCE-VALIDATION

### Deliverables (End of Week 3)

- [ ] All critical indexes created
- [ ] Performance verified with EXPLAIN ANALYZE
- [ ] Seq_scans reduced for critical tables
- [ ] Zero application errors from new indexes
- [ ] docs/WEEK3_PROGRESS.md completed
- [ ] Updated AUDIT_BASELINE with improvements

---

## Week 4: Documentation & Final Reviews

**Objective**: Document changes, finalize security review
**Effort**: 10-15 hours
**Team**: 1 Developer + 1 Security Lead

### Tasks

#### 4.1: Security Documentation

**Effort**: 5 hours

Create comprehensive security documentation:

```markdown
# Database Security Documentation

## SECURITY_DEFINER Functions Audit

### Summary
- Total functions: 164
- Audited: 45 CRITICAL (100%)
- Remaining: 89 HIGH, 30 MEDIUM

### Audited Functions

For each function:
- [ ] Function name and location
- [ ] Why SECURITY_DEFINER is necessary
- [ ] Privilege level required
- [ ] Search path configured
- [ ] Risk assessment
- [ ] Reviewer approval

### Risk Assessment

#### CRITICAL Functions
- Privilege escalation risks reviewed
- Search path explicitly set
- Approved for deployment

#### HIGH Functions
- Document necessity
- Set search_path
- Plan for next quarter

#### MEDIUM Functions
- Backlog for future review
```

Create file: `docs/SECURITY_AUDIT.md`

#### 4.2: RLS Policy Documentation

**Effort**: 3 hours

```markdown
# Row Level Security (RLS) Implementation

## Coverage Summary

| Table | RLS Enabled | Policies | Status |
|-------|-------------|----------|--------|
| bookings | ✓ | 5 | ✓ Complete |
| wallet_transactions | ✓ | 4 | ✓ Complete |
| ... | ... | ... | ... |

## Policy Details

For each table:
- SELECT: Who can read
- INSERT: Who can create
- UPDATE: Who can modify
- DELETE: Who can delete
- ADMIN BYPASS: If applicable

## Testing Results

- [ ] All policies tested with different user roles
- [ ] Cross-user access blocked
- [ ] Own data accessible
- [ ] Admin can see all (if applicable)
```

Create file: `docs/RLS_IMPLEMENTATION.md`

#### 4.3: Performance Documentation

**Effort**: 2 hours

```markdown
# Database Performance Optimization

## Indexes Created

| Table | Index Name | Columns | Impact |
|-------|-----------|---------|--------|
| bookings | idx_bookings_status_dates | status, start_date, end_date | seq_scans: 339k → X |
| ... | ... | ... | ... |

## Performance Improvements

Before:
- bookings seq_scans: 339,492
- cars seq_scans: 140,311
- etc.

After:
- bookings seq_scans: < 10,000
- cars seq_scans: < 10,000
- etc.

## Maintenance Plan

- [ ] Weekly index maintenance scheduled
- [ ] Quarterly index review planned
- [ ] Performance monitoring ongoing
```

Create file: `docs/PERFORMANCE_OPTIMIZATION.md`

#### 4.4: Final Security Review

**Effort**: 3-5 hours

```bash
# Run complete audit one final time
@autorenta-platform Genera reporte de auditoría completo

# Compare against baseline
# Verify all critical items addressed
# Document any remaining work
```

### Deliverables (End of Week 4)

- [ ] docs/SECURITY_AUDIT.md completed
- [ ] docs/RLS_IMPLEMENTATION.md completed
- [ ] docs/PERFORMANCE_OPTIMIZATION.md completed
- [ ] Final audit report generated
- [ ] All GitHub Issues closed with documentation
- [ ] Team trained on maintenance procedures

---

## Implementation Checklist

### Week 1
- [ ] 10 CRITICAL functions audited (GitHub Issues created)
- [ ] 10 RLS policies created and tested
- [ ] WEEK1_PROGRESS.md documented
- [ ] No production issues introduced

### Week 2
- [ ] 35 additional CRITICAL functions audited
- [ ] 17 additional RLS policies created
- [ ] RLS coverage: 27/27 critical tables complete
- [ ] WEEK2_PROGRESS.md documented
- [ ] Application tested with new policies

### Week 3
- [ ] All critical indexes created
- [ ] Performance verified
- [ ] seq_scans reduced significantly
- [ ] WEEK3_PROGRESS.md documented
- [ ] No query performance regressions

### Week 4
- [ ] Security documentation completed
- [ ] RLS documentation completed
- [ ] Performance documentation completed
- [ ] Team training completed
- [ ] Final audit report generated

---

## Risk Management

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| RLS breaks existing features | HIGH | CRITICAL | Test thoroughly in staging |
| Index creation locks tables | MEDIUM | MEDIUM | Use CONCURRENT index creation |
| Search_path causes issues | MEDIUM | HIGH | Test SECURITY_DEFINER functions fully |
| Regression in functionality | MEDIUM | HIGH | Automated tests + manual QA |

### Rollback Plan

If issues occur:

```sql
-- Disable RLS policy temporarily
ALTER POLICY policy_name ON table DISABLE;

-- Drop problematic index
DROP INDEX CONCURRENTLY idx_name;

-- Revert function changes
ALTER FUNCTION ... RESET search_path;
```

---

## Success Criteria

At the end of 4 weeks, we should have:

✅ **Security**: 100% of CRITICAL SECURITY_DEFINER functions audited
✅ **RLS**: 27/27 critical tables have RLS policies
✅ **Performance**: Critical table seq_scans reduced by 90%+
✅ **Documentation**: Complete security audit trail
✅ **Maintenance**: Team trained and procedures documented
✅ **Testing**: Zero regressions in functionality

---

## Resources

- [AUDIT_BASELINE_20251118.md](./AUDIT_BASELINE_20251118.md) - Initial findings
- [AUDIT_MCP_INDEX.md](../AUDIT_MCP_INDEX.md) - MCP tool reference
- [mcp-server/QUICK_START_AUDIT.md](../mcp-server/QUICK_START_AUDIT.md) - How to use MCP
- [CLAUDE.md](../CLAUDE.md) - Development workflow

---

## Weekly Status Template

Create a new file each week: `docs/WEEK{N}_PROGRESS.md`

```markdown
# Week {N} Progress Report

**Date Range**: {Start} - {End}
**Effort Spent**: {Hours} hours
**Team**: {Names}

## Completed

- [ ] Item 1
- [ ] Item 2

## In Progress

- [ ] Item 1
- [ ] Item 2

## Blockers

- Issue 1: {Description}
- Issue 2: {Description}

## Next Week

- [ ] Priority 1
- [ ] Priority 2

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Functions audited | X | Y | ✅/⚠️ |
| RLS policies | X | Y | ✅/⚠️ |
| Seq scans reduced | X% | Y% | ✅/⚠️ |
```

---

**Plan Created**: November 18, 2025
**Next Review**: November 25, 2025 (End of Week 1)
**Owner**: Security & Database Team
