# E2E Test Execution Guide

This guide shows how to run e2e tests for AutoRenta.

## Quick Start

### Option 1: Run Setup Verification Tests (No Server Required)

These tests verify that Playwright is installed and working correctly:

```bash
# From project root
npm run test:e2e -- e2e/tests/playwright-setup.spec.ts
```

### Option 2: Run Application Tests (Server Required)

These tests require the Angular dev server to be running:

```bash
# Terminal 1: Start the dev server
cd apps/web
npm run start

# Terminal 2: Run tests (once server is ready)
npm run test:e2e -- e2e/tests/smoke.spec.ts
```

### Option 3: Run All Tests

```bash
# This will run both setup and smoke tests
npm run test:e2e
```

## Test Organization

### Available Test Suites

| Test File | Purpose | Server Required |
|-----------|---------|----------------|
| `playwright-setup.spec.ts` | Verify Playwright installation | ❌ No |
| `smoke.spec.ts` | Basic application functionality | ✅ Yes |

## Running Tests with Different Options

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
# or
npx playwright test --headed
```

### Debug Mode

```bash
npm run test:e2e:debug
# or
npx playwright test --debug
```

### UI Mode (Interactive)

```bash
npm run test:e2e:ui
# or
npx playwright test --ui
```

### Run Specific Test File

```bash
npx playwright test e2e/tests/playwright-setup.spec.ts
```

### Run Tests Matching Pattern

```bash
npx playwright test --grep "homepage"
```

## Viewing Test Results

### HTML Report

After tests run, view the HTML report:

```bash
npx playwright show-report e2e/reports/html
```

### Screenshots and Videos

Failed tests automatically generate:
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip`

View traces:
```bash
npx playwright show-trace test-results/*/trace.zip
```

## CI/CD Integration

Tests run automatically in GitHub Actions. To run locally as in CI:

```bash
CI=true npm run test:e2e
```

## Troubleshooting

### "Cannot find module '@playwright/test'"

Install dependencies:
```bash
npm install
```

### "net::ERR_CONNECTION_REFUSED"

The dev server is not running. Start it first:
```bash
cd apps/web && npm run start
```

### Browsers not installed

Install Playwright browsers:
```bash
npx playwright install chromium --with-deps
```

### Tests timeout

Increase timeout in `e2e/playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

## Test Development

### Creating New Tests

1. Create a new file in `e2e/tests/`:
```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  // Your test logic
});
```

2. Run the new test:
```bash
npx playwright test e2e/tests/my-test.spec.ts
```

### Using Test Generator

Generate tests interactively:
```bash
npx playwright codegen http://localhost:4200
```

## Performance Tips

1. **Use `test.skip()`** for tests that are broken or slow
2. **Use `test.only()`** during development to run a single test
3. **Parallel execution** is enabled by default
4. **Reuse server** by keeping dev server running

## Comparison: Playwright vs Patchright

| Feature | Playwright (this directory) | Patchright (`apps/web/e2e/`) |
|---------|----------------------------|------------------------------|
| Purpose | General e2e testing | Payment flows with anti-bot bypass |
| Location | `/e2e/` | `/apps/web/e2e/` |
| Browser | Standard Chromium | Patched Chromium |
| Command | `npm run test:e2e` | `cd apps/web/e2e && npm test` |
| Use When | Testing navigation, UI, auth | Testing MercadoPago, iframes |

## Next Steps

- Add more test scenarios (auth flows, marketplace interactions)
- Integrate with CI/CD pipeline
- Set up test data management
- Add visual regression testing
- Configure test sharding for parallel execution
