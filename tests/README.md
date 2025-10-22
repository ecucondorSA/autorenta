# AutoRenta E2E Tests - Playwright

Complete end-to-end test suite for AutoRenta platform covering all critical user flows.

## 📋 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create `.env.test` in the project root:

```bash
# Supabase
NG_APP_SUPABASE_URL=your_supabase_url
NG_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test environment
PLAYWRIGHT_BASE_URL=http://localhost:4200
DATABASE_URL=your_postgres_connection_string
```

### Seed Test Data

```bash
# Run seed SQL script
psql -U postgres -d autorenta -f tests/data/seeds.sql

# Verify seeded data
psql -U postgres -d autorenta -c "SELECT * FROM profiles WHERE id LIKE 'e2e-%';"
```

### Run Tests

```bash
# Run all tests
npx playwright test

# Run specific suite
npx playwright test tests/auth/01-register.spec.ts

# Run tests for specific role
npx playwright test tests/renter
npx playwright test tests/owner
npx playwright test tests/admin

# Run in UI mode (debugging)
npx playwright test --ui

# Run with specific browser
npx playwright test --project=chromium:renter
npx playwright test --project=webkit:visual
npx playwright test --project=mobile-safari:renter

# Run only P0 (critical) tests
npx playwright test --grep @p0
```

## 🧪 Test Coverage

### Total Suites: 26
- **Visitor**: 3 suites (homepage, catalog, SEO)
- **Auth**: 4 suites (register, login, password recovery, theme)
- **Renter**: 6 suites (profile, search, comparison, bookings)
- **Owner**: 5 suites (publish, edit, approvals, responses)
- **Wallet**: 5 suites (deposit, balance, lock/unlock, withdrawal, history)
- **Admin**: 3 suites (approvals, withdrawals, dashboard)

### Priority Levels
- **P0** (18 suites): Critical path - Must pass for release (~30 min)
- **P1** (5 suites): Important - Should pass for release (~10 min)
- **P2** (3 suites): Nice to have - Can be deferred (~5 min)

## 📁 Directory Structure

```
tests/
├── fixtures/
│   ├── auth.setup.ts              # Auth fixtures for all roles
│   └── base-test.ts               # Custom test extensions
├── helpers/
│   ├── test-data.ts               # Data factories and generators
│   ├── supabase-helpers.ts        # Database utilities
│   └── assertions.ts              # Custom assertions
├── pages/
│   ├── auth/                      # Auth page objects
│   ├── cars/                      # Car catalog/detail pages
│   ├── bookings/                  # Booking pages
│   ├── wallet/                    # Wallet pages
│   └── admin/                     # Admin pages
├── data/
│   └── seeds.sql                  # Test database seeds
├── auth/                          # Auth test suites
├── renter/                        # Renter test suites
├── owner/                         # Owner test suites
├── wallet/                        # Wallet test suites
├── admin/                         # Admin test suites
├── visitor/                       # Visitor test suites
└── visual/                        # Visual regression tests
```

## 🔧 Configuration

### Playwright Config

- **Projects**: 12 browser/role combinations
- **Parallel execution**: Fully parallel (except setup)
- **Retries**: 2 retries in CI, 0 locally
- **Timeout**: 60 seconds per test
- **Reporters**: HTML, JSON, JUnit, List

### Test Data

**Seeded Users** (from `tests/data/seeds.sql`):
- `renter.test@autorenta.com` - Password: `TestRenter123!`
- `owner.test@autorenta.com` - Password: `TestOwner123!`
- `admin.test@autorenta.com` - Password: `TestAdmin123!`
- `both.test@autorenta.com` - Password: `TestBoth123!`

**Seeded Cars**: 7 test cars across economy/premium/luxury categories

**Wallet Balances**:
- Renter: $50,000 ARS
- Owner: $100,000 ARS
- Admin: $200,000 ARS
- Both: $75,000 ARS

## 🚀 CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull requests to `main`
- Push to `main`
- Manual trigger via workflow dispatch

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run seed:test-data
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

## 📊 Reports

### View HTML Report

```bash
# After test run
npx playwright show-report
```

Features:
- Visual timeline of test execution
- Screenshots on failure
- Video recordings
- Network logs
- Trace viewer for debugging

### JUnit Report (CI/CD)

Located at: `test-results/junit.xml`

Used for CI/CD integrations.

### JSON Report (Machine-Readable)

Located at: `test-results/results.json`

For custom dashboards and analytics.

## 🐛 Debugging

### UI Mode (Recommended)

```bash
npx playwright test --ui
```

Features:
- Time-travel debugging
- Watch mode
- Pick locators
- Step-by-step execution

### Debug Specific Test

```bash
npx playwright test tests/auth/01-register.spec.ts --debug
```

### Trace Viewer

```bash
# After failed test run
npx playwright show-trace test-results/.../trace.zip
```

### VS Code Extension

Install Playwright Test for VS Code for:
- Test explorer
- Run/debug from editor
- Breakpoints
- Hover to see selectors

## 🧹 Cleanup

### Reset Test Data

```bash
# Via SQL function
psql -U postgres -d autorenta -c "SELECT cleanup_e2e_test_data();"

# Or re-run seed script
psql -U postgres -d autorenta -f tests/data/seeds.sql
```

### Clear Browser State

```bash
# Remove saved auth states
rm -rf tests/.auth/*.json

# Clear all test artifacts
rm -rf test-results/
```

## 📝 Writing Tests

### Page Object Pattern

```typescript
import { Page, expect, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly myElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myElement = page.getByTestId('my-element');
  }

  async goto(): Promise<void> {
    await this.page.goto('/my-path');
  }

  async myAction(): Promise<void> {
    await this.myElement.click();
  }

  async assertState(): Promise<void> {
    await expect(this.myElement).toBeVisible();
  }
}
```

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Test Data Generators

```typescript
import { generateTestUser, generateTestCar } from '../helpers/test-data';

const user = generateTestUser('locador');
const car = generateTestCar('premium');
```

## 🎯 Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Page Object Model** for reusable page logic
3. **Test isolation** - each test should be independent
4. **Explicit waits** - use Playwright's auto-waiting
5. **Cleanup** - reset test data after critical tests
6. **Parallel-safe** - avoid shared state between tests
7. **Visual testing** - use snapshots for UI components

## 📚 Resources

- [Playwright Docs](https://playwright.dev)
- [Test Plan](./E2E_TEST_PLAN.md)
- [AutoRenta CLAUDE.md](../CLAUDE.md)
- [Supabase Testing](https://supabase.com/docs/guides/testing)

## 🆘 Troubleshooting

### Tests timeout

```bash
# Increase timeout in playwright.config.ts
timeout: 120 * 1000 // 2 minutes
```

### Auth state not working

```bash
# Re-run setup
npx playwright test --project=setup:renter
```

### Flaky tests

```bash
# Run with retries
npx playwright test --retries=3
```

### Database connection issues

```bash
# Verify DATABASE_URL in .env.test
# Check Supabase connection pooling limits
```

---

**Last Updated**: 2025-10-20
**Maintainer**: AutoRenta Team
**Support**: Consultar CLAUDE.md para arquitectura del proyecto
