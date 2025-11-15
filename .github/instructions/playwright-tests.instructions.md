---
applyTo: "**/tests/**/*.spec.ts"
---

# Playwright E2E Tests - Copilot Instructions

## Requirements

Cuando escribas tests E2E con Playwright para AutoRenta, sigue estas guías:

### 1. Locators Estables
- Preferir `getByRole()`, `getByText()`, `getByTestId()`
- Evitar CSS selectors o XPath

```typescript
// ✅ Correcto
await page.getByRole('button', { name: 'Publicar Auto' }).click();
await page.getByTestId('car-card-title').click();

// ❌ Evitar
await page.locator('.btn-primary').click();
await page.locator('div > button:nth-child(2)').click();
```

### 2. Tests Aislados
- Cada test debe ser independiente
- No depender de estado de otros tests
- Usar `beforeEach` para setup

```typescript
test.describe('Car Publication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsLocador(page);
  });

  test('should publish car successfully', async ({ page }) => {
    // Test aislado
  });
});
```

### 3. Naming Conventions
- Nombres descriptivos
- Archivos: `*.spec.ts` o `*.e2e.ts`

```typescript
test.describe('Booking Flow', () => {
  test('should create booking when car is available', async ({ page }) => {
    // ...
  });

  test('should show error when car is unavailable', async ({ page }) => {
    // ...
  });
});
```

### 4. Assertions Específicas
- Usar matchers de Playwright
- Ser específico con lo que esperas

```typescript
// ✅ Correcto
await expect(page.getByRole('heading')).toHaveText('Mis Autos');
await expect(page.getByTestId('car-status')).toBeVisible();
await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled();

// ❌ Evitar
await expect(page.locator('h1')).toBeTruthy();
```

### 5. Auto-wait (No Manual Sleeps)
- Confiar en auto-waiting de Playwright
- NO usar `setTimeout()` o `sleep()`

```typescript
// ✅ Correcto - Playwright espera automáticamente
await page.getByRole('button').click();
await expect(page.getByText('Éxito')).toBeVisible();

// ❌ Evitar
await page.getByRole('button').click();
await page.waitForTimeout(3000);
```

### 6. Cross-browser Testing
- Tests deben pasar en Chromium, Firefox y WebKit
- Configurar en `playwright.config.ts`

```typescript
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### 7. Page Object Model
- Organizar selectors en page classes
- Reutilizar lógica común

```typescript
// pages/car-publish.page.ts
export class CarPublishPage {
  constructor(private page: Page) {}

  async fillCarDetails(car: CarDetails) {
    await this.page.getByLabel('Marca').fill(car.brand);
    await this.page.getByLabel('Modelo').fill(car.model);
    await this.page.getByLabel('Año').fill(car.year.toString());
  }

  async submitForm() {
    await this.page.getByRole('button', { name: 'Publicar' }).click();
  }
}

// En test:
test('should publish car', async ({ page }) => {
  const publishPage = new CarPublishPage(page);
  await publishPage.fillCarDetails(mockCar);
  await publishPage.submitForm();
});
```

### 8. Manejo de Contenido Dinámico
- Esperar elementos correctamente
- Manejar estados de carga

```typescript
// Esperar que se cargue la lista
await page.waitForSelector('[data-testid="car-list"]');
await expect(page.getByTestId('car-card')).toHaveCount(5);

// Esperar navegación
await Promise.all([
  page.waitForNavigation(),
  page.getByRole('link', { name: 'Mis Autos' }).click(),
]);
```

### 9. Setup y Cleanup
- Usar hooks para preparar estado
- Limpiar después de tests

```typescript
test.describe('Wallet Tests', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser();
    await seedWalletBalance(100);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData();
  });
});
```

### 10. CI/CD Integration
- Configurar modo headless
- Guardar screenshots en fallas
- Ejecución paralela

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    headless: process.env.CI === 'true',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  workers: process.env.CI ? 2 : undefined,
});
```
