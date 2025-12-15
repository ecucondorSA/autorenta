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
```

### With UI Mode (Interactive)
```bash
./tools/run.sh test:e2e:ui
```

### Specific Test File
```bash
npx playwright test e2e/tests/smoke.spec.ts
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Debug Mode
```bash
npx playwright test --debug
```

## Test Structure

```
e2e/
├── playwright.config.ts    # Playwright configuration
├── tests/                  # Test specifications
│   └── smoke.spec.ts      # Basic smoke tests
├── fixtures/              # Test fixtures and utilities
│   └── test-fixtures.ts   # Custom Playwright fixtures
└── reports/               # Test reports (gitignored)
    ├── html/             # HTML reports
    └── results.json      # JSON results
```

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
