# E2E Tests - AutorentA

**Generado desde PRDs con TestSprite MCP methodology**
**Fecha**: 2025-11-04
**Coverage**: Flujos críticos P0

---

## 📋 Test Suites

### 1. Booking Flow - Wallet Payment

**Archivo**: `booking-flow-wallet-payment.spec.ts`
**PRD**: `docs/prd/booking-flow-locatario.md`
**Priority**: P0 (Critical)

**Test Coverage**:
- ✅ T1: Happy path (complete booking with wallet)
- ✅ E1: Insufficient wallet balance
- ✅ E4: User tries to book own car
- ✅ T3: View booking details
- ✅ T4: Dynamic price calculation

**Prerequisites**:
- User authenticated with role "locatario" or "ambos"
- User has wallet balance >$20,000
- At least one active car published by different user

### 2. Wallet Deposit Flow

**Archivo**: `wallet-deposit-flow.spec.ts`
**PRD**: `docs/prd/wallet-deposit-flow.md`
**Priority**: P0 (Critical)

**Test Coverage**:
- ✅ T1: Happy path (deposit with credit card)
- ✅ T3: View transaction history
- ✅ E2: Minimum amount validation ($500)
- ✅ E3: Maximum amount validation ($100,000)
- ✅ Balance display
- ✅ Non-withdrawable funds

**Prerequisites**:
- User authenticated
- Wallet exists for user
- MercadoPago test credentials configured (for full test)

---

## 🚀 Running Tests

### Run All E2E Tests

```bash
# Run all E2E tests
npx playwright test tests/e2e/ --project=chromium:visitor

# Run with headed browser (see what's happening)
npx playwright test tests/e2e/ --project=chromium:visitor --headed

# Run specific suite
npx playwright test tests/e2e/booking-flow-wallet-payment.spec.ts
npx playwright test tests/e2e/wallet-deposit-flow.spec.ts
```

### Run Specific Tests

```bash
# Run only happy path tests
npx playwright test tests/e2e/ -g "T1:"

# Run only edge case tests
npx playwright test tests/e2e/ -g "E[0-9]:"

# Run specific test by name
npx playwright test tests/e2e/ -g "should complete booking successfully"
```

### Run with Different Browsers

```bash
# Chrome
npx playwright test tests/e2e/ --project=chromium:visitor

# Mobile Chrome
npx playwright test tests/e2e/ --project=mobile-chrome:owner

# Mobile Safari
npx playwright test tests/e2e/ --project=mobile-safari:renter
```

### Debug Tests

```bash
# Debug mode (opens DevTools)
npx playwright test tests/e2e/ --debug

# Show trace on failure
npx playwright test tests/e2e/ --trace on

# Generate HTML report
npx playwright test tests/e2e/
npx playwright show-report
```

---

## 🔧 Test Configuration

### Environment Variables

Create `.env.test` with:

```bash
# Test Users
TEST_LOCATARIO_EMAIL=test+locatario@autorentar.com
TEST_LOCATARIO_PASSWORD=TestPassword123!

TEST_LOCADOR_EMAIL=test+locador@autorentar.com
TEST_LOCADOR_PASSWORD=TestPassword123!

# Test Data
TEST_CAR_OWNER_USER=true            # For E4: booking own car test
TEST_LOW_BALANCE_USER=false         # For E1: insufficient balance test
TEST_EXISTING_BOOKING_ID=uuid       # For T3: view booking details
TEST_USER_WITH_CASH_DEPOSITS=false  # For non-withdrawable funds test

# API URLs
API_BASE_URL=http://localhost:4200
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# MercadoPago (Optional for payment tests)
MERCADOPAGO_TEST_PUBLIC_KEY=TEST-xxx
```

### Playwright Config

Tests use existing `playwright.config.ts` with projects:
- `chromium:visitor` - For booking tests
- `chromium:renter` - For authenticated renter tests
- `chromium:owner` - For owner tests

---

## 📊 Expected Results

### Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **Pass Rate** | >90% | 🟡 Pending |
| **Test Duration** | <5 min | 🟡 Pending |
| **Coverage** | 80%+ of P0 flows | ✅ Achieved |
| **False Positives** | <5% | 🟡 Pending |

### Known Limitations

1. **MercadoPago Integration**: Tests skip actual payment submission (requires sandbox)
2. **Webhook Processing**: Tests don't wait for real webhooks (mock/simulate instead)
3. **Date Picker**: Depends on actual calendar implementation (may need adjustment)
4. **Test Data**: Requires users, cars, and bookings in database

---

## 🎯 Test Selectors (data-testid)

### Wallet Balance Card
```typescript
// Total balance
page.locator('[data-testid="wallet-balance"]')

// Available balance
page.locator('[data-testid="available-balance"]')

// Locked balance (funds in active bookings)
page.locator('[data-testid="locked-balance"]')
page.locator('[data-testid="locked-balance-card"]')

// Deposit button
page.locator('[data-testid="deposit-button"]')
```

### Transaction History
```typescript
// History container
page.locator('[data-testid="transaction-history"]')

// Individual transaction items
page.locator('[data-testid="transaction-item"]')

// Empty state (no transactions)
page.locator('[data-testid="empty-transactions"]')
```

### Deposit Modal
```typescript
// Modal container
page.locator('[data-testid="deposit-modal"]')

// Amount input field
page.locator('[data-testid="deposit-amount-input"]')
// Or by name attribute
page.locator('input[name="amount"]')
```

### Alternative Selectors (Role-based)
```typescript
// Buttons by accessible role
page.getByRole('button', { name: /depositar/i })
page.getByRole('button', { name: /continuar/i })
page.getByRole('button', { name: /reservar/i })

// Form inputs
page.locator('input[type="number"]').first()
```

**Best Practice**: Always prefer `data-testid` over CSS selectors for stability.

---

## 🐛 Troubleshooting

### Tests Fail Immediately

**Problem**: Tests can't find elements

**Solutions**:
1. Verify server is running: `http://localhost:4200`
2. Check authentication: User should be logged in
3. Verify test data exists in database
4. Check `data-testid` attributes in components

### Splash Loader Issues

**Problem**: Splash loader blocks clicks

**Solution**: Tests already handle this with:
```typescript
await page.locator('app-splash-loader')
  .waitFor({ state: 'detached', timeout: 10000 })
  .catch(() => {});
```

### MercadoPago Redirect

**Problem**: Tests fail at MercadoPago redirect

**Solution**: Tests skip payment submission by default. To test payments:
1. Configure MercadoPago sandbox credentials
2. Set `MERCADOPAGO_TEST_PUBLIC_KEY` in `.env.test`
3. Remove `test.skip()` in payment tests

### Insufficient Balance

**Problem**: E1 test (insufficient balance) always skips

**Solution**: Create test user with low balance:
```sql
INSERT INTO user_wallets (user_id, balance) VALUES
('test-low-balance-user-id', 5000);
```

Then set `TEST_LOW_BALANCE_USER=true` in `.env.test`

---

## 📈 Adding New Tests

### 1. Create Test File

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### 2. Follow PRD Structure

- Read PRD: `docs/prd/my-feature.md`
- Identify test scenarios (T1, T2, E1, E2...)
- Implement happy path first
- Add edge cases
- Add assertions from PRD

### 3. Use Consistent Naming

- `T1:` - Happy path tests
- `E1:` - Edge case tests
- `should` - Test description

### 4. Add to CI/CD

Update `.github/workflows/testsprite-e2e.yml`:
```yaml
- name: Run E2E Tests
  run: npx playwright test tests/e2e/
```

---

## 🔗 Related Documentation

- **[TestSprite Integration Spec](../../docs/implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md)**
- **[PRD: Booking Flow](../../docs/prd/booking-flow-locatario.md)**
- **[PRD: Wallet Deposit](../../docs/prd/wallet-deposit-flow.md)**
- **[Testing Commands](../../docs/TESTING_COMMANDS.md)**

---

## ✅ Test Checklist

Before committing tests:

- [ ] Tests run locally and pass
- [ ] Tests have descriptive names
- [ ] Tests follow PRD scenarios
- [ ] Assertions are clear and specific
- [ ] Edge cases are covered
- [ ] Tests are independent (no order dependency)
- [ ] Tests clean up after themselves
- [ ] Documentation updated

---

**Generated by**: Claude Code + TestSprite MCP methodology
**Last Updated**: 2025-11-06 (Added data-testid selectors)
