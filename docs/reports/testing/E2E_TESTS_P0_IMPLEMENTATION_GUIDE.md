# Guía de Implementación: Tests E2E P0 (Críticos)

**Versión**: 1.0.0
**Fecha**: 2025-11-03
**Proyecto**: AutoRenta
**Framework**: Playwright + TypeScript
**Prioridad**: P0 (Critical Path - Must Pass for Release)

---

## 📊 Estado Actual del Testing

### Tests Existentes: 30 archivos .spec.ts
- ✅ Tests parcialmente implementados
- ⚠️ Mayoría marcados como TODO en E2E_TEST_PLAN.md
- ❌ Suite configuration incompleta (faltan .env vars)

### Tests P0 Pendientes: 15 tests críticos
**Total estimado**: 43-58 horas
**Priorización**: P0 → P1 → P2

---

## 🎯 Tests P0 Críticos (Must Have)

### Categorización por Impacto

| # | Test | Archivo | Impacto en Producción | Duración | Esfuerzo |
|---|------|---------|------------------------|----------|----------|
| 1 | **Flujo Completo de Booking** | `tests/renter/booking/complete-booking-flow.spec.ts` | 🔥🔥🔥 Revenue Blocker | 8-12h | ⭐⭐⭐⭐ |
| 2 | **Publicación de Auto** | `tests/owner/01-publish-car.spec.ts` | 🔥🔥🔥 Inventory Blocker | 4-6h | ⭐⭐⭐ |
| 3 | **Aprobación Admin de Autos** | `tests/admin/01-car-approvals.spec.ts` | 🔥🔥 Moderation Blocker | 3-5h | ⭐⭐⭐ |
| 4 | **Depósito a Wallet (MercadoPago)** | `tests/wallet/01-deposit-mp.spec.ts` | 🔥🔥🔥 Payment Blocker | 6-8h | ⭐⭐⭐⭐⭐ |
| 5 | **Retiro de Wallet** | `tests/wallet/04-withdrawal.spec.ts` | 🔥🔥 Cashout Blocker | 3-5h | ⭐⭐⭐ |
| 6 | **Búsqueda y Filtros** | `tests/renter/02-search-filters.spec.ts` | 🔥🔥 Discovery Blocker | 4-6h | ⭐⭐⭐ |
| 7 | **Edición de Auto** | `tests/owner/02-edit-car.spec.ts` | 🔥 Update Blocker | 2-4h | ⭐⭐ |
| 8 | **Cancelación de Reserva** | `tests/renter/06-booking-cancel.spec.ts` | 🔥🔥 Refund Blocker | 3-5h | ⭐⭐⭐ |

**Total P0**: 33-51 horas (8 tests críticos)

---

## 🏗️ Plan de Implementación (3 Fases)

### FASE 1: Foundation & Quick Wins (12-16h)
**Objetivo**: Establecer infraestructura y tests más simples

#### 1.1 Setup y Configuración (2-3h)
```bash
# Tasks:
- [ ] Configurar .env.test con variables de Supabase
- [ ] Seed test data: npx ts-node tests/data/seed-test-db.ts
- [ ] Verificar auth fixtures funcionando
- [ ] Setup CI/CD con GitHub Actions
```

#### 1.2 Test #2: Publicación de Auto (4-6h)
**Por qué primero**: Es más simple que booking completo, establece Page Objects.

**Archivo**: `tests/owner/01-publish-car.spec.ts`

**Pasos**:
```typescript
test.describe('Car Publication Flow', () => {
  test('Owner can publish a new car', async ({ page, ownerAuth }) => {
    // 1. Login as owner
    // 2. Navigate to /cars/publish
    // 3. Fill form: brand, model, year, price, photos
    // 4. Submit
    // 5. Assert: Car created with status 'pending'
    // 6. Assert: Redirect to /cars/my-cars
    // 7. Assert: Car visible in list
  });

  test('Form validation prevents invalid data', async ({ page, ownerAuth }) => {
    // Test all required fields, price limits, photo requirements
  });

  test('Photo upload works correctly', async ({ page, ownerAuth }) => {
    // Test image upload, preview, delete
  });
});
```

**Page Objects Necesarios**:
- `PublishCarPage.ts`
- `MyCarsList Page.ts`

#### 1.3 Test #7: Edición de Auto (2-4h)
**Archivo**: `tests/owner/02-edit-car.spec.ts`

Reutiliza `PublishCarPage` logic.

#### 1.4 Test #6: Búsqueda y Filtros (4-6h)
**Archivo**: `tests/renter/02-search-filters.spec.ts`

**Page Objects**:
- `CatalogPage.ts` (ya parcialmente existe)
- `FiltersSidebar.ts`

---

### FASE 2: Revenue-Critical Flows (18-24h)
**Objetivo**: Tests que bloquean revenue

#### 2.1 Test #1: Flujo Completo de Booking (8-12h) ⭐ **MOST CRITICAL**
**Archivo**: `tests/renter/booking/complete-booking-flow.spec.ts`

**Sub-tests**:
```typescript
test.describe('Complete Booking Flow', () => {
  // SUB-TEST 1: Con saldo suficiente (3-4h)
  test('Renter with sufficient balance can complete booking', async ({ page, renterAuth }) => {
    // Given: Renter with $50,000 wallet
    // When: Books car for $10,000/day * 3 days = $30,000
    // Then:
    //   1. Wallet locked $30,000
    //   2. Booking status = 'confirmed'
    //   3. Owner notified
    //   4. Calendar updated
    //   5. Email sent
  });

  // SUB-TEST 2: Sin saldo suficiente → depósito (5-8h)
  test('Renter with insufficient balance must deposit first', async ({ page, renterAuth }) => {
    // Given: Renter with $10,000 wallet
    // When: Tries to book $30,000 rental
    // Then:
    //   1. Shows "Saldo insuficiente" error
    //   2. Redirects to /wallet/deposit
    //   3. User deposits $25,000 via MP
    //   4. Webhook confirms payment
    //   5. Balance updated to $35,000
    //   6. Returns to booking flow
    //   7. Booking succeeds
  });

  // SUB-TEST 3: Fechas no disponibles
  test('Cannot book overlapping dates', async ({ page, renterAuth }) => {
    // Test date collision detection
  });
});
```

**Page Objects**:
- `CarDetailPage.ts`
- `BookingPage.ts`
- `WalletPage.ts`
- `DepositPage.ts`

**Database Helpers**:
```typescript
// tests/helpers/supabase-helpers.ts
async function resetWalletBalance(userId: string, amount: number) {
  // Update user_wallets table
}

async function cleanupTestBookings(carId: string) {
  // Delete bookings created during tests
}
```

#### 2.2 Test #4: Depósito a Wallet (MercadoPago) (6-8h) ⭐ **COMPLEX**
**Archivo**: `tests/wallet/01-deposit-mp.spec.ts`

**Challenges**:
- MercadoPago sandbox integration
- Webhook simulation
- Async payment confirmation

**Approaches**:

**Approach A: Mock MP Webhook (Recommended for E2E)**
```typescript
test('Deposit via MercadoPago updates wallet', async ({ page, renterAuth, request }) => {
  // 1. User clicks "Depositar"
  await walletPage.clickDeposit();

  // 2. Enter amount: $25,000
  await depositPage.enterAmount(25000);

  // 3. Click "Depositar con MercadoPago"
  await depositPage.clickMercadoPago();

  // 4. Mock MercadoPago checkout (no redirection)
  // Instead of going to MP, we directly call our webhook
  const transactionId = await depositPage.getTransactionId();

  // 5. Simulate webhook call
  await request.post('/functions/v1/mercadopago-webhook', {
    data: {
      action: 'payment.created',
      data: { id: 'mp_test_123' },
      // ... MP payload
    }
  });

  // 6. Wait for balance update
  await page.waitForTimeout(2000);
  await page.reload();

  // 7. Assert balance increased
  await expect(walletPage.balance).toContainText('$75,000');
});
```

**Approach B: MP Sandbox (Real Integration)**
```typescript
// Uses real MercadoPago test credentials
// Slow (30s+ per test) but validates full flow
```

**Recommended**: Start with Approach A, add Approach B as P1 test.

#### 2.3 Test #8: Cancelación de Reserva (3-5h)
**Archivo**: `tests/renter/06-booking-cancel.spec.ts`

Tests:
- Cancel before 24h (full refund)
- Cancel after 24h (partial refund)
- Funds unlock correctly
- Owner notified

---

### FASE 3: Admin & Moderation (8-12h)
**Objetivo**: Tests de moderación y compliance

#### 3.1 Test #3: Aprobación de Autos (Admin) (3-5h)
**Archivo**: `tests/admin/01-car-approvals.spec.ts`

```typescript
test.describe('Car Approval Flow', () => {
  test('Admin can approve pending cars', async ({ page, adminAuth }) => {
    // 1. Login as admin
    // 2. Navigate to /admin/approvals
    // 3. See list of pending cars
    // 4. Click "Aprobar" on car
    // 5. Assert: Car status = 'active'
    // 6. Assert: Car visible in public catalog
    // 7. Assert: Owner notified
  });

  test('Admin can reject cars with reason', async ({ page, adminAuth }) => {
    // Test rejection flow + notification
  });
});
```

**Page Objects**:
- `AdminApprovalsPage.ts`
- `AdminDashboardPage.ts`

#### 3.2 Test #5: Retiro de Wallet (3-5h)
**Archivo**: `tests/wallet/04-withdrawal.spec.ts`

Tests:
- Request withdrawal
- Admin approval
- Bank transfer simulation
- Balance deduction

---

## 🛠️ Implementación Técnica

### Setup Inicial

#### 1. Variables de Entorno

**Archivo**: `.env.test`
```bash
# Supabase
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MercadoPago (Sandbox)
MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-xxx
MERCADOPAGO_TEST_PUBLIC_KEY=TEST-xxx

# App
PLAYWRIGHT_BASE_URL=http://localhost:4200
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Test Users (seeded)
TEST_RENTER_EMAIL=test-renter@autorenta.com
TEST_RENTER_PASSWORD=TestRenter123!
TEST_OWNER_EMAIL=test-owner@autorenta.com
TEST_OWNER_PASSWORD=TestOwner123!
TEST_ADMIN_EMAIL=test-admin@autorenta.com
TEST_ADMIN_PASSWORD=TestAdmin123!
```

#### 2. Seed Test Data

**Archivo**: `tests/data/seed-test-db.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NG_APP_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedTestData() {
  // 1. Create test users
  await supabase.auth.admin.createUser({
    email: 'test-renter@autorenta.com',
    password: 'TestRenter123!',
    email_confirm: true,
  });

  // 2. Create profiles
  await supabase.from('profiles').insert({
    id: 'renter-uuid',
    email: 'test-renter@autorenta.com',
    full_name: 'Test Renter',
    user_role: 'locatario',
  });

  // 3. Create wallet with balance
  await supabase.from('user_wallets').insert({
    user_id: 'renter-uuid',
    balance: 50000, // $50,000 ARS
    locked_funds: 0,
  });

  // 4. Create test cars (for owner)
  // ...

  console.log('✅ Test data seeded');
}

seedTestData();
```

#### 3. Page Objects Pattern

**Ejemplo**: `pages/bookings/BookingPage.ts`
```typescript
import { Page, expect, Locator } from '@playwright/test';

export class BookingPage {
  readonly page: Page;

  // Locators
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly totalPriceText: Locator;
  readonly confirmButton: Locator;
  readonly insufficientFundsError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startDateInput = page.getByTestId('start-date');
    this.endDateInput = page.getByTestId('end-date');
    this.totalPriceText = page.getByTestId('total-price');
    this.confirmButton = page.getByRole('button', { name: 'Confirmar Reserva' });
    this.insufficientFundsError = page.getByTestId('insufficient-funds-error');
  }

  // Actions
  async selectDates(startDate: string, endDate: string): Promise<void> {
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
  }

  async confirmBooking(): Promise<void> {
    await this.confirmButton.click();
  }

  // Assertions
  async assertTotalPrice(expectedPrice: string): Promise<void> {
    await expect(this.totalPriceText).toContainText(expectedPrice);
  }

  async assertInsufficientFunds(): Promise<void> {
    await expect(this.insufficientFundsError).toBeVisible();
  }
}
```

#### 4. Helper Functions

**Archivo**: `tests/helpers/supabase-helpers.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NG_APP_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getUserWalletBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();

  return data?.balance || 0;
}

export async function setUserWalletBalance(userId: string, balance: number): Promise<void> {
  await supabase
    .from('user_wallets')
    .update({ balance, locked_funds: 0 })
    .eq('user_id', userId);
}

export async function cleanupTestBookings(testPrefix: string = 'e2e-'): Promise<void> {
  await supabase
    .from('bookings')
    .delete()
    .like('id', `${testPrefix}%`);
}

export async function getCarAvailability(carId: string): Promise<any[]> {
  const { data } = await supabase
    .from('bookings')
    .select('start_date, end_date')
    .eq('car_id', carId)
    .in('status', ['confirmed', 'pending']);

  return data || [];
}
```

---

## 📋 Checklist de Implementación

### Pre-Implementation
- [ ] Leer `E2E_TEST_PLAN.md` completo
- [ ] Verificar `playwright.config.ts` configurado
- [ ] Instalar Playwright: `npx playwright install`
- [ ] Configurar `.env.test` con todas las variables
- [ ] Ejecutar seed script: `npm run seed:test-data`
- [ ] Verificar auth fixtures: `npx playwright test --project=setup:renter`

### FASE 1: Foundation (12-16h)
- [ ] Setup y configuración (2-3h)
- [ ] Test #2: Publicación de auto (4-6h)
- [ ] Test #7: Edición de auto (2-4h)
- [ ] Test #6: Búsqueda y filtros (4-6h)

### FASE 2: Revenue (18-24h)
- [ ] Test #1: Booking completo (8-12h)
- [ ] Test #4: Depósito MP (6-8h)
- [ ] Test #8: Cancelación (3-5h)

### FASE 3: Admin (8-12h)
- [ ] Test #3: Aprobación autos (3-5h)
- [ ] Test #5: Retiro wallet (3-5h)

### Post-Implementation
- [ ] Ejecutar suite completa: `npx playwright test`
- [ ] Generar reporte HTML: `npx playwright show-report`
- [ ] Verificar coverage de tests P0: 100%
- [ ] Configurar CI/CD en GitHub Actions
- [ ] Documentar edge cases conocidos

---

## 🎯 Priorización Recomendada

### Sprint 1 (CRÍTICO) - 1 semana
1. ✅ Test #2: Publicación de auto
2. ✅ Test #6: Búsqueda y filtros
3. ✅ Test #1: Booking completo (sub-test 1: con saldo)

**Objetivo**: Validar flujo end-to-end básico: Publish → Search → Book

### Sprint 2 (PAYMENTS) - 1 semana
4. ✅ Test #4: Depósito MP
5. ✅ Test #1: Booking completo (sub-test 2: sin saldo)
6. ✅ Test #8: Cancelación

**Objetivo**: Validar flujo completo de pagos y wallet

### Sprint 3 (ADMIN & POLISH) - 3-4 días
7. ✅ Test #3: Aprobación admin
8. ✅ Test #5: Retiro wallet
9. ✅ Test #7: Edición de auto

**Objetivo**: Completar moderation flows

---

## 🚨 Problemas Conocidos y Soluciones

### 1. Tests Timeout en Booking Flow

**Problema**: Booking test timeout después de 60s
**Causa**: Wallet lock RPC function lenta
**Solución**:
```typescript
test.setTimeout(120000); // 2 minutos
await page.waitForResponse(resp => resp.url().includes('lock_funds'));
```

### 2. MercadoPago Webhook no Llega

**Problema**: Test espera indefinidamente el webhook
**Causa**: Webhooks en localhost no funcionan
**Solución**: Mock el webhook directamente
```typescript
await request.post(`${process.env.NG_APP_SUPABASE_URL}/functions/v1/mercadopago-webhook`, {
  headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  data: mockWebhookPayload
});
```

### 3. Auth State no Persiste

**Problema**: Tests re-login en cada test
**Causa**: `.auth/*.json` files no se generan
**Solución**: Ejecutar setup explícitamente
```bash
npx playwright test --project=setup:renter
npx playwright test --project=setup:owner
```

### 4. Flaky Tests por Animaciones

**Problema**: Tests fallan aleatoriamente por timing
**Causa**: Animaciones CSS (Tailwind transitions)
**Solución**:
```typescript
// Opción A: Disable animations
await page.addStyleTag({ content: '* { transition: none !important; }' });

// Opción B: Explicit waits
await expect(element).toBeVisible({ timeout: 10000 });
```

### 5. Database State Leak

**Problema**: Tests fallan porque data de test anterior existe
**Causa**: Cleanup no ejecuta
**Solución**: `test.afterEach()` hooks
```typescript
test.afterEach(async () => {
  await cleanupTestBookings('e2e-');
  await resetWalletBalance('renter-uuid', 50000);
});
```

---

## 📊 Métricas de Éxito

### Coverage Target
- ✅ Tests P0 implementados: 8/8 (100%)
- ✅ Tests P0 passing: 8/8 (100%)
- ✅ Execution time: <30 min (parallel)
- ✅ Flaky rate: <5%

### Quality Gates (CI/CD)
- ❌ Blocker: Any P0 test fails
- ⚠️ Warning: >10% flaky tests
- ✅ Pass: All P0 green

---

## 🔄 Workflow Multi-Agente para Testing

### Claude Code (Yo) - Genera estructura
```bash
# 1. Genero Page Objects
# 2. Genero test skeletons con TODOs
# 3. Genero helpers y utilities
# 4. Configuro playwright.config.ts
```

### Cursor (Tú) - Implementa tests
```typescript
// 1. Abres test skeleton
// 2. Cmd+I: "Implementa este test según el plan"
// 3. Cursor genera assertions y actions
// 4. Review → Accept
```

### Claude Code (Yo) - Valida y documenta
```bash
# 1. Ejecuto: npx playwright test
# 2. Analizo failures
# 3. Sugiero fixes
# 4. Genero reporte final
```

---

## 📚 Recursos

### Playwright Docs
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [API Testing](https://playwright.dev/docs/api-testing)

### AutoRenta Docs
- `tests/E2E_TEST_PLAN.md` - Plan completo (26 suites)
- `tests/README.md` - Setup y configuración
- `CLAUDE.md` - Arquitectura del proyecto
- `CURSOR_OPTIMIZED_GUIDE.md` - Workflow con Cursor

### Playwright Best Practices
1. Use `data-testid` attributes for stable selectors
2. Page Object Model for reusable logic
3. Test isolation - each test independent
4. Auto-waiting - avoid manual `waitFor`
5. Cleanup hooks - reset state after tests
6. Parallel-safe - no shared state
7. Visual testing - snapshots for UI

---

## ✅ Próximos Pasos

1. **[AHORA] Tú continúas con Reviews en Cursor**
   - FASES 2-5 del sistema de reviews
   - Usa `REVIEWS_COMPLETION_PLAN.md`

2. **[YO] Genero estructura de tests mientras tanto**
   - Page Objects
   - Test skeletons
   - Helpers

3. **[DESPUÉS] Implementas tests con Cursor**
   - Sprint 1: Tests #2, #6, #1 (sub-test 1)
   - Uso de Agent Mode con prompts del plan

4. **[FINAL] Yo valido y documento**
   - CI/CD validation
   - Reporte de coverage
   - Documentación final

---

**Versión**: 1.0.0
**Última actualización**: 2025-11-03
**Mantenedor**: @ecucondorSA
**Proyecto**: AutoRenta - Car Rental Marketplace (Argentina)

**¡Plan listo para implementar!** 🚀

---

## 🎯 TL;DR (Resumen Ejecutivo)

**Objetivo**: Implementar 8 tests P0 críticos en 3 sprints (33-51 horas)

**Sprint 1** (1 semana): Publish → Search → Book básico
**Sprint 2** (1 semana): Payments + Wallet completo
**Sprint 3** (3-4 días): Admin moderation

**Workflow**: Claude genera estructura → Cursor implementa → Claude valida

**Start**: Tú continúa con reviews, yo genero Page Objects ahora.
