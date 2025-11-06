# Safe Change Checklist

**Last Updated:** 2025-11-06
**Purpose:** Surgical code change validation before implementation

---

## Overview

This checklist helps you make surgical code changes with confidence by understanding the complete blast radius of your changes. Complete the relevant checklist before making changes.

---

## General Pre-Change Analysis

Before ANY code change, answer these questions:

- [ ] What layer does this code belong to? (Presentation, Service, Data Access, External)
- [ ] What domain does this code belong to? (Auth, Car, Booking, Payment, Wallet, Insurance, Risk)
- [ ] How many services/components depend on this code?
- [ ] Are there any circular dependencies?
- [ ] What database tables/RPCs are affected?
- [ ] Are there external API integrations involved?

**Tools:**
```bash
# Find who uses a service
./tools/analyze-dependencies.sh apps/web/src/app/core/services/bookings.service.ts

# Validate change impact
./tools/validate-change.sh apps/web/src/app/core/services/bookings.service.ts
```

---

## Checklist 1: Modifying a Service (Low Risk - 0-2 Dependencies)

**Examples:** ProfileService, CarsService, GeocodingService

### Pre-Change Analysis
- [ ] Read `docs/architecture/DEPENDENCY_GRAPH.md` - find service's dependency count
- [ ] Confirm service has 0-2 dependencies
- [ ] List all components that inject this service:
  ```bash
  grep -r "inject(YourService)" apps/web/src/app/
  ```

### Code Review
- [ ] Review all public methods - are any being called externally?
- [ ] Check for signals/observables that other components subscribe to
- [ ] Verify method signatures won't break callers

### Database Impact
- [ ] List tables this service modifies:
  ```bash
  grep -E "(from\('|\.rpc\()" service-file.ts
  ```
- [ ] Check RLS policies for affected tables
- [ ] Verify no schema changes needed

### Testing
- [ ] Run unit tests for this service:
  ```bash
  npm run test -- --include="**/your-service.service.spec.ts"
  ```
- [ ] Test all components that inject this service
- [ ] Verify no breaking changes to public API

### Documentation
- [ ] Update JSDoc comments if method signatures changed
- [ ] Update `docs/flows/` if any flow logic changed
- [ ] No need to update BREAKING_CHANGES_LOG.md (low risk)

**Estimated Impact:** 🟢 LOW (1-3 components affected)

---

## Checklist 2: Modifying a Service (Medium Risk - 3-5 Dependencies)

**Examples:** AuthService, WalletService, RiskCalculatorService, SettlementService

### Pre-Change Analysis
- [ ] Read `docs/architecture/DEPENDENCY_GRAPH.md` - map all dependencies
- [ ] Read `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md` - check cross-domain impact
- [ ] Create dependency tree diagram:
  ```
  YourService
  ├── Dependency1
  ├── Dependency2
  ├── Dependency3
  └── Dependency4
  ```

### Code Review
- [ ] Trace all transitive dependencies (dependencies of dependencies)
- [ ] Review all services that depend on THIS service:
  ```bash
  grep -r "inject(YourService)" apps/web/src/app/core/services/
  ```
- [ ] Check for method signature changes (breaking changes)
- [ ] Review signal/observable dependencies

### Database Impact
- [ ] List all RPC functions called
- [ ] List all tables modified (INSERT/UPDATE/DELETE)
- [ ] Check if any Edge Functions use these tables
- [ ] Verify RLS policies still valid

### Cross-Domain Impact
- [ ] Check `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md`
- [ ] List all domains affected by this change
- [ ] Review flows in `docs/flows/` that use this service

### Testing
- [ ] Run unit tests: `npm run test -- --include="**/your-service.service.spec.ts"`
- [ ] Run integration tests for affected domains
- [ ] Test all flows documented in `docs/flows/` that use this service
- [ ] Example: If changing WalletService, test:
  - Booking creation (uses wallet for locking funds)
  - Payment checkout (uses wallet for payments)
  - Wallet deposit flow

### Documentation
- [ ] Update JSDoc comments
- [ ] Update `docs/flows/` for affected flows
- [ ] Update `docs/architecture/DEPENDENCY_GRAPH.md` if dependencies changed
- [ ] Consider adding entry to `docs/guides/BREAKING_CHANGES_LOG.md`

**Estimated Impact:** 🟡 MEDIUM (5-10 components/services affected)

---

## Checklist 3: Modifying a Service (High Risk - 6+ Dependencies)

**Examples:** BookingsService (7 deps), CheckoutPaymentService (6 deps)

⚠️ **WARNING:** These services are orchestrators with high coupling. Changes have CRITICAL blast radius.

### Pre-Change Analysis
- [ ] **MANDATORY:** Read all related documentation:
  - `docs/architecture/DEPENDENCY_GRAPH.md`
  - `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md`
  - `docs/architecture/LAYER_SEPARATION.md`
  - Relevant flow docs in `docs/flows/`
- [ ] Map complete dependency tree (7+ services)
- [ ] Identify all affected domains (likely 3-5 domains)
- [ ] Create detailed change plan document

### Code Review (Detailed)
- [ ] List ALL services that inject this service
- [ ] List ALL components that use this service
- [ ] List ALL methods and their external callers
- [ ] Check for breaking changes to:
  - Method signatures
  - Signal types
  - Observable streams
  - Error handling behavior

### Database Impact (Critical)
- [ ] List ALL RPC functions called
- [ ] List ALL tables modified
- [ ] Check ALL Edge Functions that depend on these tables
- [ ] Verify RLS policies for all affected tables
- [ ] Check for potential race conditions
- [ ] Verify transaction boundaries

### Cross-Domain Impact (Critical)
- [ ] Analyze impact on ALL 7 domains using `DOMAIN_DEPENDENCY_MATRIX.md`
- [ ] Review ALL flows in `docs/flows/` that use this service
- [ ] Example: BookingsService changes affect:
  - Booking creation flow (`FLOW_BOOKING_CREATION.md`)
  - Payment checkout flow (`FLOW_PAYMENT_CHECKOUT.md`)
  - Insurance activation
  - Wallet locking
  - Risk calculation

### Testing (Comprehensive)
- [ ] Run ALL unit tests for this service
- [ ] Run integration tests for ALL affected domains:
  ```bash
  npm run test -- --include="**/{booking,payment,wallet,insurance}*.spec.ts"
  ```
- [ ] Test ALL flows end-to-end:
  - Booking creation
  - Payment checkout (3 modes: wallet, card, split)
  - Insurance activation
  - Claim submission
- [ ] Run full E2E test suite:
  ```bash
  npm run test:e2e
  ```

### Deployment Strategy
- [ ] Consider feature flags for gradual rollout
- [ ] Plan rollback strategy (database migrations, code revert)
- [ ] Coordinate with team before deployment
- [ ] Deploy during low-traffic window
- [ ] Monitor error rates post-deployment

### Documentation (Mandatory)
- [ ] Update JSDoc comments
- [ ] Update ALL affected flow docs in `docs/flows/`
- [ ] Update `docs/architecture/DEPENDENCY_GRAPH.md` if dependencies changed
- [ ] **MANDATORY:** Add entry to `docs/guides/BREAKING_CHANGES_LOG.md`
- [ ] Update `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md` if cross-domain deps changed

**Estimated Impact:** 🔴 CRITICAL (20+ components/services affected, 3-5 domains)

---

## Checklist 4: Modifying a Database Table/RPC

**Examples:** Changing `bookings` table schema, modifying `request_booking` RPC

### Pre-Change Analysis
- [ ] List ALL services that query/modify this table:
  ```bash
  grep -r "from('table_name')" apps/web/src/app/
  grep -r "\.rpc('rpc_name')" apps/web/src/app/
  ```
- [ ] List ALL Edge Functions that use this table:
  ```bash
  grep -r "from('table_name')" supabase/functions/
  ```
- [ ] Check for foreign key constraints:
  ```bash
  grep -A10 "CREATE TABLE.*table_name" supabase/migrations/
  ```

### RLS Policy Review
- [ ] Review existing RLS policies for this table
- [ ] Verify new columns/changes don't break RLS
- [ ] Test RLS policies with different user roles:
  ```sql
  SET LOCAL "request.jwt.claims" = '{"sub": "test-user-uuid"}';
  SELECT * FROM table_name; -- Should only return user's data
  ```

### Migration Planning
- [ ] Create migration file:
  ```bash
  supabase migration new descriptive_name
  ```
- [ ] Write migration SQL (ALTER TABLE, etc.)
- [ ] Write rollback SQL (DOWN migration)
- [ ] Test migration on local database
- [ ] Verify no data loss

### Edge Function Impact
- [ ] List all Edge Functions using this table
- [ ] Review Edge Function code for breaking changes
- [ ] Update Edge Function type definitions if schema changed

### Testing
- [ ] Test migration on local database
- [ ] Run ALL services that use this table
- [ ] Test RLS policies after migration
- [ ] Run integration tests for affected domains
- [ ] Test Edge Functions that use this table

### Documentation
- [ ] Update `docs/flows/` for affected flows
- [ ] Add migration notes to `docs/guides/BREAKING_CHANGES_LOG.md`
- [ ] Update database schema documentation

**Estimated Impact:** 🟡-🔴 MEDIUM to CRITICAL (depends on table usage)

---

## Checklist 5: Modifying an Angular Component

**Examples:** CarDetailPage, BookingCheckoutPage

### Pre-Change Analysis
- [ ] Confirm component is in Presentation Layer (Layer 1)
- [ ] List all services injected by this component
- [ ] Check if component has child components
- [ ] Check if component is used by parent components

### Code Review
- [ ] Verify NO business logic in component (should be in services)
- [ ] Verify NO direct Supabase calls (should be in services)
- [ ] Check for breaking changes to @Input/@Output properties
- [ ] Review signal dependencies

### Service Dependencies
- [ ] List services this component calls
- [ ] Verify service methods haven't changed signatures
- [ ] Check for new service dependencies added

### Testing
- [ ] Run component unit tests
- [ ] Test component in browser (manual)
- [ ] Test all user flows involving this component
- [ ] Verify responsive design (mobile/desktop)

### Documentation
- [ ] Update component JSDoc
- [ ] Update `docs/flows/` if UI flow changed
- [ ] No need for BREAKING_CHANGES_LOG.md (UI only)

**Estimated Impact:** 🟢 LOW (isolated to UI)

---

## Checklist 6: Modifying an Edge Function

**Examples:** mercadopago-webhook, mercadopago-create-booking-preference

### Pre-Change Analysis
- [ ] List all frontend services that call this Edge Function:
  ```bash
  grep -r "functions.invoke('edge-function-name')" apps/web/
  ```
- [ ] Check for external API integrations (MercadoPago, Mapbox, etc.)
- [ ] Review webhook signatures/security validation

### Database Impact
- [ ] List all RPC functions called by Edge Function
- [ ] List all tables modified by Edge Function
- [ ] Verify RLS policies (Edge Functions use service role, bypasses RLS)

### External API Changes
- [ ] Review third-party API documentation (MercadoPago, etc.)
- [ ] Check for API version changes
- [ ] Verify webhook payload format hasn't changed
- [ ] Test against sandbox API

### Security Review
- [ ] Verify HMAC signature validation (for webhooks)
- [ ] Check IP whitelisting (for webhooks)
- [ ] Review rate limiting logic
- [ ] Verify authorization checks (JWT validation)

### Testing
- [ ] Test Edge Function locally:
  ```bash
  supabase functions serve edge-function-name
  curl -X POST http://localhost:54321/functions/v1/edge-function-name ...
  ```
- [ ] Test against sandbox API (MercadoPago sandbox)
- [ ] Test webhook processing with mock payloads
- [ ] Verify idempotency (duplicate webhook handling)

### Deployment
- [ ] Deploy to staging first:
  ```bash
  supabase functions deploy edge-function-name --project-ref staging-ref
  ```
- [ ] Test on staging with real API (sandbox)
- [ ] Deploy to production:
  ```bash
  supabase functions deploy edge-function-name --project-ref prod-ref
  ```
- [ ] Monitor logs after deployment

### Documentation
- [ ] Update Edge Function README
- [ ] Update `docs/flows/` for affected flows (e.g., wallet deposit, payment checkout)
- [ ] Document any breaking changes to request/response format

**Estimated Impact:** 🟡 MEDIUM (affects external integrations)

---

## Checklist 7: Refactoring (Extracting Repository Pattern)

**Example:** Separating data access from BookingsService into BookingsRepository

### Pre-Change Analysis
- [ ] Read `docs/architecture/LAYER_SEPARATION.md`
- [ ] Identify data access code vs business logic in service
- [ ] Plan repository interface

### Repository Creation
- [ ] Create repository file: `apps/web/src/app/core/repositories/your.repository.ts`
- [ ] Define repository methods (pure data access, no business logic)
- [ ] Move Supabase queries from service to repository
- [ ] Keep business logic in service

### Service Refactoring
- [ ] Inject repository into service
- [ ] Replace direct Supabase calls with repository calls
- [ ] Keep orchestration logic in service

### Testing
- [ ] Write repository unit tests (mock Supabase)
- [ ] Update service unit tests (mock repository)
- [ ] Run integration tests
- [ ] Verify no behavior changes (refactoring should be transparent)

### Documentation
- [ ] Update `docs/architecture/LAYER_SEPARATION.md`
- [ ] Update `docs/architecture/DEPENDENCY_GRAPH.md`
- [ ] Add note to `docs/guides/BREAKING_CHANGES_LOG.md` if API changed

**Estimated Impact:** 🟡 MEDIUM (affects service architecture)

---

## Post-Change Verification

After completing ANY checklist above:

- [ ] All tests pass (unit, integration, E2E)
- [ ] No new ESLint errors
- [ ] No new TypeScript errors
- [ ] Documentation updated
- [ ] Code reviewed by team member (if high risk)
- [ ] Deployment plan documented (if critical)

---

## Emergency Rollback Checklist

If something goes wrong after deployment:

- [ ] Identify breaking change from logs/error reports
- [ ] Check `docs/guides/BREAKING_CHANGES_LOG.md` for rollback steps
- [ ] Revert code changes:
  ```bash
  git revert <commit-hash>
  git push origin <branch>
  ```
- [ ] If database migration involved:
  ```bash
  supabase migration down
  ```
- [ ] Monitor error rates return to normal
- [ ] Investigate root cause before re-attempting change

---

## Related Documentation

- **Service Dependencies:** `docs/architecture/DEPENDENCY_GRAPH.md`
- **Domain Dependencies:** `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md`
- **Layer Separation:** `docs/architecture/LAYER_SEPARATION.md`
- **Flow Documentation:** `docs/flows/`
- **Breaking Changes Log:** `docs/guides/BREAKING_CHANGES_LOG.md`

---

**Last Verified:** 2025-11-06
