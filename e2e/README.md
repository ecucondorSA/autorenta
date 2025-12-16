# AutoRenta E2E Tests (Playwright)

Root-level end-to-end tests using **Playwright** for general application testing.

> **Note**: For payment-specific tests with anti-bot bypass (MercadoPago), see `apps/web/e2e/` which uses Patchright.

## Quick Start

```bash
# From project root
pnpm run test:e2e              # Run all tests (headless)
pnpm run test:e2e:ui           # Run with Playwright UI
pnpm run test:e2e:debug        # Run in debug mode
pnpm run test:e2e:headed       # Run with visible browser
```

## Installation

Playwright browsers are installed automatically via the root `package.json`. If needed:

```bash
npx playwright install chromium --with-deps
```

## Running Tests

### All Tests
```bash
./tools/run.sh test:e2e
# or
npm run test:e2e
```

### Specific Test Suites

#### Setup Verification (No Server Required)
```bash
npm run test:e2e -- e2e/tests/playwright-setup.spec.ts
```

#### Smoke Tests
```bash
npm run test:e2e -- e2e/tests/smoke.spec.ts
```

#### Booking and Payment Flow
```bash
npm run test:e2e -- e2e/tests/booking-payment-flow.spec.ts
```

### With UI Mode (Interactive)
```bash
./tools/run.sh test:e2e:ui
# or
npm run test:e2e:ui
```

### Specific Test File
```bash
npx playwright test e2e/tests/booking-payment-flow.spec.ts
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
# or
npm run test:e2e:headed
```

### Debug Mode
```bash
npx playwright test --debug
# or
npm run test:e2e:debug
```

### Run Tests with Authentication
```bash
# Set test credentials
export TEST_USER_EMAIL="your-test-email@example.com"
export TEST_USER_PASSWORD="your-test-password"

# Run booking/payment tests
npm run test:e2e -- e2e/tests/booking-payment-flow.spec.ts
```

## Test Structure

```
e2e/
├── playwright.config.ts           # Playwright configuration
├── tests/                         # Test specifications
│   ├── playwright-setup.spec.ts  # Playwright setup verification (5 tests)
│   ├── smoke.spec.ts             # Basic smoke tests (4 tests)
│   └── booking-payment-flow.spec.ts  # Complete booking & payment flow (8+ tests)
├── fixtures/                      # Test fixtures and utilities
│   └── test-fixtures.ts          # Custom Playwright fixtures
└── reports/                       # Test reports (gitignored)
    ├── html/                     # HTML reports
    └── results.json              # JSON results
```

## Available Test Suites

### 1. Playwright Setup Tests (`playwright-setup.spec.ts`)
**Status**: ✅ 5/5 passing | **Server Required**: No

Verifies that Playwright is correctly installed and configured:
- Page navigation with data URLs
- Screenshot capture
- JavaScript execution
- Element waiting
- Form interaction

### 2. Smoke Tests (`smoke.spec.ts`)
**Status**: ⏸️ 4 tests ready | **Server Required**: Yes

Basic application functionality tests:
- Homepage loads successfully
- Navigation is visible
- Can navigate to login page
- Marketplace page is accessible

### 3. Booking and Payment Flow (`booking-payment-flow.spec.ts`)
**Status**: 🆕 8 tests | **Server Required**: Yes | **Auth Required**: Yes

Complete end-to-end booking and payment flow:
- Browse cars in marketplace
- View car details
- Login and create booking
- Payment page displays correctly
- View booking summary
- Payment methods available
- Complete payment with card (skipped - requires full setup)
- Complete payment with wallet (skipped - requires full setup)

## Writing Tests

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AutoRenta/);
});
```

### Using Custom Fixtures

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test('test with custom fixture', async ({ page }) => {
  // Your test logic
});
```

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Pull requests to main
- Pushes to main
- Manual workflow dispatch

See `.github/workflows/ci.yml` for CI configuration.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:4200` | Base URL for the app |
| `CI` | `false` | CI environment flag |
| `TEST_USER_EMAIL` | `test@example.com` | Test user email for authentication |
| `TEST_USER_PASSWORD` | `testpass123` | Test user password for authentication |
| `TEST_BOOKING_START` | `2025-12-20` | Start date for test bookings (YYYY-MM-DD) |
| `TEST_BOOKING_END` | `2025-12-25` | End date for test bookings (YYYY-MM-DD) |

## Debugging

### View Test Reports
```bash
npx playwright show-report e2e/reports/html
```

### Take Screenshots
Screenshots are automatically taken on test failures and saved to `e2e/reports/`.

### Record Videos
Videos are recorded on test failures. Enable for all tests:
```typescript
// In playwright.config.ts
use: {
  video: 'on', // Record all tests
}
```

## Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Wait for network idle** on navigation: `await page.goto('/', { waitUntil: 'networkidle' })`
3. **Use page object model** for complex pages
4. **Keep tests independent** - each test should set up its own state
5. **Use auto-waiting** - Playwright automatically waits for elements
6. **Skip integration tests in CI** - Use `.skip()` for tests requiring full external services
7. **Set environment variables** - Configure test credentials and booking dates via environment variables

## Testing Booking and Payment Flows

The `booking-payment-flow.spec.ts` test suite covers the complete user journey from browsing cars to completing a payment.

### Prerequisites

1. **Dev server running**: `cd apps/web && npm run start`
2. **Test credentials**: Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` environment variables
3. **Test data**: Database should have available cars for booking

### Test Structure

The booking flow tests are organized into three describe blocks:

1. **Complete Booking and Payment Flow**: Core user journey tests
2. **Payment Methods**: Payment option validation
3. **Booking Confirmation**: Post-payment confirmation tests

### Running Booking Tests

```bash
# With environment variables
TEST_USER_EMAIL="test@example.com" \
TEST_USER_PASSWORD="your-password" \
npm run test:e2e -- e2e/tests/booking-payment-flow.spec.ts

# Run specific test
npm run test:e2e -- e2e/tests/booking-payment-flow.spec.ts -g "browse cars"

# Run in headed mode to see the flow
npm run test:e2e:headed -- e2e/tests/booking-payment-flow.spec.ts
```

### Skipped Tests

Some tests are skipped by default (`.skip()`) because they require:
- Valid payment credentials
- Active payment webhook
- Real booking creation in database

Enable these tests manually when running full integration testing with proper setup.

## Comparison with Patchright Tests

| Feature | Playwright (this directory) | Patchright (`apps/web/e2e/`) |
|---------|----------------------------|------------------------------|
| Purpose | General e2e testing | Payment/anti-bot scenarios |
| Browser | Standard Chromium | Patched Chromium |
| Use Cases | Navigation, auth, UI | MercadoPago, bot detection |
| Speed | Fast | Slower (persistent context) |
| Complexity | Simple | Complex (iframe handling) |

## Troubleshooting

### Tests timeout
Increase timeouts in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Server not starting
Ensure the Angular dev server is configured correctly in `playwright.config.ts`:
```typescript
webServer: {
  command: 'cd apps/web && npm run start',
  url: 'http://localhost:4200',
  reuseExistingServer: !process.env.CI,
}
```

### Browser not installed
```bash
npx playwright install chromium --with-deps
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
