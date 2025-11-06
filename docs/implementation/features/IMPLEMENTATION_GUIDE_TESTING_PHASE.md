# 🎯 Implementation Guide - Testing & Quality Phase

**Repository:** ecucondorSA/autorenta  
**Date:** 2025-10-28  
**Phase:** Testing, CI/CD, and Quality Assurance

---

## 📋 TABLE OF CONTENTS

1. [Quick Start](#quick-start)
2. [Priority Tasks](#priority-tasks)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing Strategy](#testing-strategy)
5. [Progress Tracking](#progress-tracking)

---

## 🚀 QUICK START

### Prerequisites Checklist
- [x] GitHub CLI installed (`gh` command available)
- [x] Playwright tests created (19+ test files found)
- [x] E2E workflow configured (`.github/workflows/e2e-tests.yml`)
- [ ] GitHub secrets configured
- [ ] Test user created in Supabase
- [ ] CI/CD passing

### Current Test Coverage
```
✅ Visitor tests: 3 files (homepage, catalog, SEO)
✅ Auth tests: 4 files (register, login, logout, reset)
✅ Booking tests: 3 files (card, wallet, success)
✅ Wallet tests: 2 files (deposit, UI)
✅ Critical tests: 3 files (publish, messages, webhooks)
✅ Chat tests: 2 files (demo, real e2e)
```

---

## 🔴 PRIORITY TASKS

### 🟢 CRITICAL (Esta Semana)

#### 1. ⚙️ Configurar Secretos en GitHub
**Status:** 🔴 PENDING  
**Estimated Time:** 10 minutes  
**Priority:** P0 - BLOCKER para CI/CD

**Steps:**
```bash
# Navigate to GitHub repository settings
# https://github.com/ecucondorSA/autorenta/settings/secrets/actions

# Add these secrets:
1. SUPABASE_URL
   - Value: https://your-project.supabase.co
   - Used by: E2E tests, authentication flows

2. SUPABASE_ANON_KEY
   - Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - Used by: All Supabase client operations

3. MERCADOPAGO_TEST_ACCESS_TOKEN
   - Value: TEST-xxxx-xxxxxxxxxxxx
   - Used by: Payment tests, webhook tests
```

**Verification Commands:**
```bash
# Test if secrets are accessible in workflow
gh secret list

# Expected output:
# SUPABASE_URL
# SUPABASE_ANON_KEY
# MERCADOPAGO_TEST_ACCESS_TOKEN
```

**Why This Matters:**
- E2E tests use real Supabase instance for auth/data
- Payment tests need MP sandbox credentials
- Without secrets, all CI/CD tests will fail

---

#### 2. 🧪 Verificar Tests en CI/CD
**Status:** 🔴 PENDING  
**Estimated Time:** 30 minutes  
**Priority:** P0 - Quality Gate

**Implementation:**

**Step 1: Create Test Branch**
```bash
cd /home/edu/autorenta
git checkout -b feat/testing-phase-setup
```

**Step 2: Add Documentation**
```bash
# Create this guide (already done)
git add IMPLEMENTATION_GUIDE_TESTING_PHASE.md
git commit -m "docs: add testing phase implementation guide"
```

**Step 3: Push and Trigger Workflow**
```bash
git push origin feat/testing-phase-setup

# Create PR to trigger E2E tests
gh pr create \
  --title "feat: Testing Phase Setup" \
  --body "Sets up testing infrastructure for production readiness" \
  --base main
```

**Step 4: Monitor Workflow**
```bash
# Watch workflow execution
gh run watch

# Or view in browser
gh run list --workflow=e2e-tests.yml
```

**Common Issues & Solutions:**

**Issue 1: Tests fail due to missing environment**
```yaml
# Already configured in e2e-tests.yml lines 24-28
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  MERCADOPAGO_TEST_ACCESS_TOKEN: ${{ secrets.MERCADOPAGO_TEST_ACCESS_TOKEN }}
```

**Issue 2: Build fails**
```bash
# Run locally first
pnpm install
pnpm build
pnpm test:e2e
```

**Issue 3: Server doesn't start**
```bash
# Check if port 4200 is available
# Workflow uses http-server (lines 58-62)
cd apps/web/dist/web/browser
npx http-server -p 4200
```

---

#### 3. 👤 Crear Usuario de Test en Supabase
**Status:** 🔴 PENDING  
**Estimated Time:** 15 minutes  
**Priority:** P0 - Required for E2E tests

**Method 1: Via Supabase Dashboard (Recommended)**
```
1. Go to: https://your-project.supabase.co/auth/users
2. Click "Add User" → "Create new user"
3. Enter:
   - Email: test-renter@autorenta.com
   - Password: TestPassword123!
   - Confirm password: TestPassword123!
   - Email Confirm: ✅ (auto-confirm)
4. Click "Create User"
```

**Method 2: Via SQL**
```sql
-- Run in Supabase SQL Editor
-- This creates a confirmed user ready for testing

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'test-renter@autorenta.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  'authenticated'
);
```

**Method 3: Via Supabase CLI**
```bash
# If you have supabase CLI installed
npx supabase auth users create \
  test-renter@autorenta.com \
  --password TestPassword123!
```

**Verification:**
```bash
# Create verification script
cat > verify-test-user.mjs << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!'
});

if (error) {
  console.error('❌ Login failed:', error.message);
  process.exit(1);
}

console.log('✅ Test user verified!');
console.log('User ID:', data.user.id);
console.log('Email:', data.user.email);
EOF

# Run verification
node verify-test-user.mjs
```

**Update Test Files:**
```typescript
// tests/fixtures/test-credentials.ts
export const TEST_CREDENTIALS = {
  renter: {
    email: 'test-renter@autorenta.com',
    password: 'TestPassword123!'
  },
  // Add more test users as needed
  owner: {
    email: 'test-owner@autorenta.com',
    password: 'TestPassword123!'
  }
};
```

---

### 🟠 MEDIUM (Próximas 2 Semanas)

#### 4. 🔄 Test de Booking Cancellation
**Status:** 🟡 NOT STARTED  
**Estimated Time:** 2-3 hours  
**Priority:** P1 - Quality Enhancement

**File to Create:** `tests/renter/booking/cancellation.spec.ts`

**Test Scenarios:**
```typescript
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../../fixtures/test-credentials';

test.describe('Booking Cancellation Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as test renter
    await page.goto('/auth/login');
    await page.fill('[data-test="email"]', TEST_CREDENTIALS.renter.email);
    await page.fill('[data-test="password"]', TEST_CREDENTIALS.renter.password);
    await page.click('[data-test="login-submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should cancel booking within cancellation period', async ({ page }) => {
    // TODO: Implement
    // 1. Navigate to booking details
    // 2. Click cancel button
    // 3. Confirm cancellation
    // 4. Verify status changed to 'cancelled'
    // 5. Verify refund initiated
  });

  test('should show cancellation fee after grace period', async ({ page }) => {
    // TODO: Implement
  });

  test('should prevent cancellation when too late', async ({ page }) => {
    // TODO: Implement
  });

  test('should refund security deposit on cancellation', async ({ page }) => {
    // TODO: Implement
  });
});
```

**Backend Implementation Needed:**
```typescript
// apps/web/src/app/core/services/booking.service.ts
async cancelBooking(bookingId: string): Promise<{
  success: boolean;
  refundAmount?: number;
  cancellationFee?: number;
}> {
  // Call Supabase RPC
  const { data, error } = await this.supabase
    .rpc('cancel_booking', { booking_id: bookingId });
  
  return data;
}
```

**SQL Function Needed:**
```sql
-- supabase/migrations/XXX_add_cancel_booking_function.sql
CREATE OR REPLACE FUNCTION cancel_booking(booking_id UUID)
RETURNS JSON AS $$
DECLARE
  booking_record bookings%ROWTYPE;
  hours_until_start INTEGER;
  cancellation_fee DECIMAL;
  refund_amount DECIMAL;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record FROM bookings WHERE id = booking_id;
  
  -- Calculate hours until booking start
  hours_until_start := EXTRACT(EPOCH FROM (booking_record.start_date - NOW())) / 3600;
  
  -- Calculate cancellation fee
  IF hours_until_start < 24 THEN
    RAISE EXCEPTION 'Cannot cancel within 24 hours of booking start';
  ELSIF hours_until_start < 48 THEN
    cancellation_fee := booking_record.total_amount * 0.25; -- 25% fee
  ELSIF hours_until_start < 72 THEN
    cancellation_fee := booking_record.total_amount * 0.10; -- 10% fee
  ELSE
    cancellation_fee := 0; -- Free cancellation
  END IF;
  
  refund_amount := booking_record.total_amount - cancellation_fee;
  
  -- Update booking status
  UPDATE bookings 
  SET status = 'cancelled',
      cancellation_fee = cancellation_fee,
      updated_at = NOW()
  WHERE id = booking_id;
  
  -- Initiate refund (connect to wallet/MP)
  -- TODO: Implement refund logic
  
  RETURN json_build_object(
    'success', true,
    'cancellationFee', cancellation_fee,
    'refundAmount', refund_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 5. 💳 Tests de MercadoPago Sandbox Real
**Status:** 🟡 NOT STARTED  
**Estimated Time:** 3-4 hours  
**Priority:** P1 - Payment Quality

**Current State:**
- Tests use mocked MP responses
- Need real sandbox integration

**File to Create:** `tests/payments/mercadopago-real.spec.ts`

**Implementation:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('MercadoPago Real Sandbox', () => {
  
  test('should create real preference', async ({ page }) => {
    // Use real MP SDK
    const preference = await fetch(`${process.env.API_URL}/api/mercadopago/create-preference`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_TEST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: 'Test Booking',
          unit_price: 100,
          quantity: 1
        }]
      })
    });
    
    const data = await preference.json();
    expect(data).toHaveProperty('init_point');
  });

  test('should handle real webhook', async ({ page }) => {
    // TODO: Implement webhook testing
    // Use MP's webhook simulator or real payment flow
  });

  test('should process test cards', async ({ page }) => {
    // Test with MP test cards
    const testCards = [
      { number: '5031 7557 3453 0604', name: 'APRO' }, // Approved
      { number: '5031 4332 1540 6351', name: 'OCHO' }, // Pending
      { number: '5031 7557 3453 0604', name: 'CALL' }  // Rejected
    ];
    
    // TODO: Implement card testing
  });
});
```

**MP Test Cards Reference:**
```javascript
// tests/fixtures/mercadopago-test-cards.ts
export const MP_TEST_CARDS = {
  APPROVED: {
    number: '5031 7557 3453 0604',
    cvv: '123',
    expiration: '11/25',
    name: 'APRO',
    dni: '12345678'
  },
  REJECTED_INSUFFICIENT_FUNDS: {
    number: '5031 4332 1540 6351',
    cvv: '123',
    expiration: '11/25',
    name: 'FUND',
    dni: '12345678'
  },
  REJECTED_INVALID_CARD: {
    number: '5031 7557 3453 0604',
    cvv: '123',
    expiration: '11/25',
    name: 'OTHE',
    dni: '12345678'
  }
};
```

---

#### 6. 📊 Aumentar Coverage a 60%
**Status:** 🟡 NOT STARTED  
**Estimated Time:** 4-6 hours  
**Priority:** P1 - Quality Metrics

**Current Coverage Analysis:**
```bash
# Run coverage report
pnpm test:coverage

# Expected output format:
# Services: 45%
# Components: 35%
# Models: 80%
# Overall: ~50%
```

**Coverage Gaps to Fill:**

**Gap 1: Service Coverage**
```typescript
// apps/web/src/app/core/services/booking.service.spec.ts
describe('BookingService', () => {
  it('should create booking', () => {});
  it('should cancel booking', () => {});
  it('should calculate pricing', () => {});
  it('should handle errors', () => {});
});
```

**Gap 2: Component Coverage**
```typescript
// apps/web/src/app/features/booking/components/payment-card/payment-card.component.spec.ts
describe('PaymentCardComponent', () => {
  it('should validate card number', () => {});
  it('should validate CVV', () => {});
  it('should handle payment submission', () => {});
  it('should show error messages', () => {});
});
```

**Gap 3: Integration Coverage**
```typescript
// apps/web/src/app/features/wallet/services/wallet.service.spec.ts
describe('WalletService', () => {
  it('should get balance', () => {});
  it('should process deposit', () => {});
  it('should process withdrawal', () => {});
  it('should handle transactions', () => {});
});
```

**Coverage Report Configuration:**
```typescript
// apps/web/karma.conf.js
coverageReporter: {
  dir: require('path').join(__dirname, '../../coverage/web'),
  subdir: '.',
  reporters: [
    { type: 'html' },
    { type: 'text-summary' },
    { type: 'lcovonly' }
  ],
  check: {
    global: {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60
    }
  }
}
```

---

## 🧪 TESTING STRATEGY

### Test Pyramid
```
         E2E Tests (Critical Flows)
              /\
             /  \
            /    \
           /      \
          /--------\
    Integration Tests (Services)
         /          \
        /            \
       /              \
      /----------------\
   Unit Tests (Components/Utils)
```

### Coverage Goals
- **Unit Tests:** 70% coverage
- **Integration Tests:** 50% coverage
- **E2E Tests:** 100% critical flows
- **Overall Target:** 60%+

### Test Categories

**1. Critical Path Tests** (Must Pass)
- User registration/login
- Car search and booking
- Payment processing
- Wallet operations

**2. Feature Tests** (Should Pass)
- Profile management
- Car publication
- Messaging
- Reviews

**3. Edge Case Tests** (Nice to Have)
- Error handling
- Network failures
- Concurrent operations
- Rate limiting

---

## 📈 PROGRESS TRACKING

### Checklist

#### Week 1 (Oct 28 - Nov 3)
- [ ] Configure GitHub secrets
- [ ] Verify E2E workflow passes
- [ ] Create test user in Supabase
- [ ] Document any CI/CD issues
- [ ] Fix critical test failures

#### Week 2 (Nov 4 - Nov 10)
- [ ] Implement booking cancellation test
- [ ] Set up real MP sandbox tests
- [ ] Start coverage improvements
- [ ] Reach 55% coverage

#### Week 3 (Nov 11 - Nov 17)
- [ ] Complete all cancellation scenarios
- [ ] Test all MP test cards
- [ ] Reach 60% coverage target
- [ ] Document testing patterns

---

## 🔧 USEFUL COMMANDS

### Local Testing
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/renter/booking/payment-card.spec.ts

# Run tests in UI mode (interactive)
pnpm test:e2e:ui

# Run tests in debug mode
pnpm test:e2e:debug

# Generate coverage report
pnpm test:coverage

# View Playwright report
pnpm test:e2e:report
```

### GitHub Actions
```bash
# List recent workflow runs
gh run list --workflow=e2e-tests.yml

# Watch current workflow
gh run watch

# View workflow logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed
```

### Debugging
```bash
# Check if secrets are set
gh secret list

# Test Supabase connection
node verify-test-user.mjs

# Test MP credentials
curl -X GET \
  "https://api.mercadopago.com/v1/payment_methods" \
  -H "Authorization: Bearer $MERCADOPAGO_TEST_ACCESS_TOKEN"
```

---

## 📚 REFERENCES

- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [MercadoPago Testing](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
- [Test Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)

---

## 💡 TIPS

1. **Always run tests locally before pushing**
2. **Use test tags (@critical, @smoke) for quick feedback**
3. **Keep test data isolated (separate test DB user)**
4. **Mock external services when possible**
5. **Document flaky tests immediately**
6. **Review coverage reports regularly**
7. **Automate what can be automated**

---

**Next Steps:** Start with Task 1 (Configure Secrets) → Task 2 (Verify CI/CD) → Task 3 (Create Test User)

**Questions?** Review existing tests in `/tests` directory for patterns and examples.
