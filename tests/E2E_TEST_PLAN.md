# AutoRenta E2E Test Plan - Playwright

## 📋 Overview

Complete E2E test suite for AutoRenta covering all critical user flows across 4 roles.

**Total Suites**: 26
**Framework**: Playwright + TypeScript
**Execution Time**: ~45 minutes (parallel)
**Browsers**: Chromium, WebKit, Mobile (Safari/Chrome)

---

## 🎯 Test Coverage by Role

### 1. Visitor (Unauthenticated) - 3 Suites

| Suite | File | Priority | Duration | Status |
|-------|------|----------|----------|--------|
| Homepage & Navigation | `tests/visitor/01-homepage.spec.ts` | P0 | 2m | 📝 TODO |
| Car Catalog Browse | `tests/visitor/02-catalog-browse.spec.ts` | P0 | 3m | 📝 TODO |
| SEO & Links | `tests/visitor/03-seo-links.spec.ts` | P2 | 2m | 📝 TODO |

### 2. Auth & Session - 4 Suites

| Suite | File | Priority | Duration | Status |
|-------|------|----------|----------|--------|
| Registration Flow | `tests/auth/01-register.spec.ts` | P0 | 3m | 🚧 IN PROGRESS |
| Login/Logout | `tests/auth/02-login-logout.spec.ts` | P0 | 2m | 📝 TODO |
| Password Recovery | `tests/auth/03-password-recovery.spec.ts` | P1 | 3m | 📝 TODO |
| Theme Persistence | `tests/auth/04-theme-persistence.spec.ts` | P2 | 2m | 📝 TODO |

### 3. Renter (Locatario) - 6 Suites

| Suite | File | Priority | Duration | Status |
|-------|------|----------|----------|--------|
| Profile Edit | `tests/renter/01-profile-edit.spec.ts` | P0 | 3m | 📝 TODO |
| Car Search & Filters | `tests/renter/02-search-filters.spec.ts` | P0 | 4m | 📝 TODO |
| Car Comparison | `tests/renter/03-car-comparison.spec.ts` | P1 | 3m | 📝 TODO |
| Booking w/ Sufficient Balance | `tests/renter/04-booking-success.spec.ts` | P0 | 5m | 📝 TODO |
| Booking w/ Insufficient Balance | `tests/renter/05-booking-deposit.spec.ts` | P0 | 6m | 📝 TODO |
| Booking Cancellation | `tests/renter/06-booking-cancel.spec.ts` | P1 | 3m | 📝 TODO |

### 4. Owner (Locador) - 5 Suites

| Suite | File | Priority | Duration | Status |
|-------|------|----------|----------|--------|
| Car Publication - Create | `tests/owner/01-publish-car.spec.ts` | P0 | 5m | 📝 TODO |
| Car Publication - Edit | `tests/owner/02-edit-car.spec.ts` | P0 | 3m | 📝 TODO |
| Pending Approval Status | `tests/owner/03-pending-approval.spec.ts` | P1 | 2m | 📝 TODO |
| Car Pause/Resume | `tests/owner/04-pause-resume.spec.ts` | P1 | 2m | 📝 TODO |
| Booking Responses | `tests/owner/05-booking-responses.spec.ts` | P0 | 4m | 📝 TODO |

### 5. Wallet & Payments - 5 Suites

| Suite | File | Priority | Duration | Status |
|-------|------|----------|----------|--------|
| Deposit via MercadoPago | `tests/wallet/01-deposit-mp.spec.ts` | P0 | 6m | 📝 TODO |
| Balance Visualization | `tests/wallet/02-balance-view.spec.ts` | P0 | 2m | 📝 TODO |
| Funds Lock/Unlock | `tests/wallet/03-lock-unlock.spec.ts` | P0 | 4m | 📝 TODO |
| Withdrawal Request | `tests/wallet/04-withdrawal.spec.ts` | P0 | 3m | 📝 TODO |
| Transaction History | `tests/wallet/05-transactions.spec.ts` | P1 | 3m | 📝 TODO |

### 6. Admin - 3 Suites

| Suite | File | Priority | Duration | Status |
|-------|------|----------|----------|--------|
| Car Approvals | `tests/admin/01-car-approvals.spec.ts` | P0 | 4m | 📝 TODO |
| Withdrawal Management | `tests/admin/02-withdrawal-mgmt.spec.ts` | P0 | 5m | 📝 TODO |
| Dashboard Metrics | `tests/admin/03-dashboard.spec.ts` | P1 | 3m | 📝 TODO |

---

## 🏗️ Architecture

### Directory Structure

```
tests/
├── fixtures/
│   ├── auth.setup.ts              # Auth setup for all roles
│   └── base-test.ts               # Custom test fixtures
├── helpers/
│   ├── test-data.ts               # Data generators
│   ├── supabase-helpers.ts        # DB utilities
│   └── assertions.ts              # Custom assertions
├── pages/
│   ├── auth/
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   └── PasswordRecoveryPage.ts
│   ├── cars/
│   │   ├── CatalogPage.ts
│   │   ├── CarDetailPage.ts
│   │   ├── PublishCarPage.ts
│   │   └── ComparePage.ts
│   ├── bookings/
│   │   ├── BookingPage.ts
│   │   └── MyBookingsPage.ts
│   ├── wallet/
│   │   ├── WalletPage.ts
│   │   └── DepositPage.ts
│   └── admin/
│       ├── DashboardPage.ts
│       ├── ApprovalsPage.ts
│       └── WithdrawalsPage.ts
├── data/
│   └── seeds.sql                  # Database seed data
├── visitor/
│   └── *.spec.ts                  # Visitor tests
├── auth/
│   └── *.spec.ts                  # Auth tests
├── renter/
│   └── *.spec.ts                  # Renter tests
├── owner/
│   └── *.spec.ts                  # Owner tests
├── wallet/
│   └── *.spec.ts                  # Wallet tests
├── admin/
│   └── *.spec.ts                  # Admin tests
└── visual/
    └── *.spec.ts                  # Visual regression tests
```

### Fixtures & Setup

**Auth Fixtures** (`fixtures/auth.setup.ts`):
- Creates auth sessions for renter, owner, admin
- Saves storage state to `.auth/*.json`
- Runs before all tests as dependency

**Custom Test** (`fixtures/base-test.ts`):
- Extends base test with custom fixtures
- Adds Supabase client
- Adds API testing helpers
- Adds wallet helpers

### Page Object Pattern

All pages follow this structure:

```typescript
export class PageName {
  constructor(private page: Page) {}

  // Locators as getters
  get elementName() {
    return this.page.getByTestId('element-id');
  }

  // Actions as methods
  async actionName(params) {
    await this.elementName.click();
  }

  // Assertions as methods
  async assertState() {
    await expect(this.elementName).toBeVisible();
  }
}
```

---

## 🧪 Test Data Strategy

### Seed Data (Database)

**File**: `tests/data/seeds.sql`

Pre-populated test users:
- `renter.test@autorenta.com` (with $50,000 wallet)
- `owner.test@autorenta.com` (with 3 published cars)
- `admin.test@autorenta.com` (admin privileges)
- `both.test@autorenta.com` (renter + owner)

Pre-populated test cars:
- 5 economy cars (Buenos Aires)
- 3 premium cars (Córdoba)
- 2 luxury cars (Rosario)

### Dynamic Data (Factories)

**File**: `helpers/test-data.ts`

- `generateTestUser()` - Creates unique users
- `generateTestCar()` - Creates test car data
- `generateTestBooking()` - Creates booking date ranges

---

## 🚀 Execution

### Local Development

```bash
# Install Playwright browsers
npx playwright install

# Run all tests
npx playwright test

# Run specific role
npx playwright test tests/renter

# Run specific suite
npx playwright test tests/wallet/01-deposit-mp.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Run specific project (browser)
npx playwright test --project=chromium:renter
```

### CI/CD (GitHub Actions)

```bash
# Triggered on PR to main
# Runs all tests in parallel
# Uploads test report as artifact
```

**File**: `.github/workflows/e2e-tests.yml`

---

## 📊 Reporting

### HTML Report

```bash
npx playwright show-report
```

- Visual timeline
- Screenshots on failure
- Video recordings
- Trace viewer

### JUnit Report

**File**: `test-results/junit.xml`

Used for CI/CD integrations (Jenkins, GitLab, etc.)

### JSON Report

**File**: `test-results/results.json`

Machine-readable for custom dashboards.

---

## 🎯 Priority Levels

- **P0**: Critical path - Must pass for release
- **P1**: Important - Should pass for release
- **P2**: Nice to have - Can be deferred

### P0 Suites (Release Blockers)

1. Auth: Registration, Login/Logout
2. Renter: Profile Edit, Search, Booking (both flows)
3. Owner: Publish Car, Edit Car, Booking Responses
4. Wallet: All 5 suites
5. Admin: Car Approvals, Withdrawal Management

**Total P0 Suites**: 18 (~30 minutes)

---

## 🔧 Custom Playwright Extensions

### Supabase Helpers

```typescript
// Create booking via API
await supabaseHelpers.createBooking({
  carId,
  renterId,
  startDate,
  endDate
});

// Seed wallet balance
await supabaseHelpers.creditWallet(userId, 50000);

// Clear test data
await supabaseHelpers.cleanupTestData();
```

### Wallet Helpers

```typescript
// Wait for MercadoPago redirect
await walletHelpers.waitForPaymentSuccess();

// Verify funds locked
await walletHelpers.assertFundsLocked(userId, amount);

// Verify transaction created
await walletHelpers.assertTransactionExists(userId, type);
```

---

## 📝 Next Steps

### Phase 1: Foundation (Week 1)
- ✅ Playwright config
- ✅ Auth fixtures
- ✅ Test data helpers
- ⏳ Page Objects (in progress)
- ⏳ Seed data SQL

### Phase 2: Critical Path (Week 2)
- ⏳ Auth suites (4)
- ⏳ Renter suites (6)
- ⏳ Owner suites (5)

### Phase 3: Wallet & Admin (Week 3)
- ⏳ Wallet suites (5)
- ⏳ Admin suites (3)

### Phase 4: Polish (Week 4)
- ⏳ Visitor suites (3)
- ⏳ Visual regression
- ⏳ CI/CD integration
- ⏳ Documentation

---

## 🐛 Known Issues & Workarounds

### MercadoPago Sandbox

**Issue**: Sandbox redirects are flaky
**Workaround**: Use test mode with mock payment endpoint

### Mapbox in Tests

**Issue**: Map tiles don't load in headless
**Workaround**: Mock Mapbox API or skip map assertions

### File Uploads

**Issue**: Car photo uploads timing out
**Workaround**: Use smaller test images (<100KB)

---

## 📚 Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [AutoRenta CLAUDE.md](../CLAUDE.md) - Architecture reference

---

**Last Updated**: 2025-10-20
**Maintainer**: AutoRenta Team
