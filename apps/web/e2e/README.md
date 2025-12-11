# AutoRenta E2E Tests

End-to-end tests using **Patchright** (patched Chromium for anti-bot bypass) with Page Object Model.

## Test Suites

| Suite | Tests | Description |
|-------|-------|-------------|
| Login | 9 | Authentication flows, form validation |
| Marketplace | 8 | Car listing, search, filters |
| Payment | 7 | MercadoPago brick, payment flow |

## Quick Start

```bash
# Install dependencies
cd apps/web/e2e
npm install

# Install Patchright browser (required first time)
npm run setup

# Run all tests (headless)
TEST_USER_PASSWORD="your-password" npm run test:all

# Run specific suite
TEST_USER_PASSWORD="your-password" npm run test:login
TEST_USER_PASSWORD="your-password" npm run test:marketplace
TEST_USER_PASSWORD="your-password" npm run test:payment

# Run with visible browser (debugging)
TEST_USER_PASSWORD="your-password" npm run test:all:headed
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_USER_PASSWORD` | Yes | Password for test user (ecucondor@gmail.com) |
| `BASE_URL` | No | App URL (default: http://localhost:4200) |
| `HEADLESS` | No | Run headless (default: true) |
| `CI` | No | CI mode flag |

## CI/CD Integration

### GitHub Actions

The workflow `.github/workflows/patchright-e2e.yml` runs tests on PRs to main.

**Required Secrets:**
- `E2E_TEST_USER_PASSWORD` - Password for test user authentication

To add the secret:
1. Go to repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `E2E_TEST_USER_PASSWORD`
4. Value: The test user password

### Manual Trigger

You can manually trigger tests from the Actions tab:
1. Go to Actions > "Patchright E2E Tests"
2. Click "Run workflow"
3. Select test suite (all, login, marketplace, payment)

## Project Structure

```
apps/web/e2e/
├── page-objects/         # Page Object Model classes
│   ├── base.page.ts      # Base class with common methods
│   ├── login.page.ts     # Login page interactions
│   ├── marketplace.page.ts # Marketplace page
│   └── payment.page.ts   # Payment/checkout page
├── specs/                # Test specifications
│   ├── auth/
│   │   └── login.spec.ts
│   └── booking/
│       ├── browse-cars.spec.ts
│       └── payment.spec.ts
├── utils/                # Utilities
│   ├── selectors.ts      # Centralized CSS selectors
│   ├── waits.ts          # Smart wait functions
│   └── network-logger.ts # Network request logging
├── fixtures/             # Test fixtures
│   ├── test-fixtures.ts  # Test context setup
│   └── test-data.ts      # Test data (cards, users)
└── reports/              # Test reports & screenshots
```

## Key Features

### Patchright Anti-Bot Bypass

Patchright is a patched version of Playwright that bypasses common bot detection:
- MercadoPago secure iframes
- Cloudflare protection
- reCAPTCHA (in some cases)

### MercadoPago Testing

The payment tests interact with MercadoPago's CardPayment Brick which uses:
- **Secure iframes** for: card number, expiration, CVV (PCI-DSS compliance)
- **Native inputs** for: cardholder name, document, email

Test cards (holder name determines result):
- `APRO` - Payment approved
- `OTHE` - Payment rejected
- `CONT` - Payment pending
- `FUND` - Insufficient funds

### Persistent Browser Context

Tests use a persistent browser context to maintain session state between test runs, reducing login overhead.

## Debugging

### View browser
```bash
HEADLESS=false npm run test:login
```

### Check screenshots
Failed tests automatically save screenshots to `reports/`.

### View network logs
Each test saves network logs to `reports/<test-name>-logs.json`.

## Troubleshooting

### Tests timeout on iframe interactions
MercadoPago iframes take time to load. Increase wait times in `payment.page.ts`.

### Session expired
Clear the browser profile:
```bash
npm run clean:profile
```

### Server not running
Start the Angular dev server first:
```bash
cd apps/web
npm start
```
