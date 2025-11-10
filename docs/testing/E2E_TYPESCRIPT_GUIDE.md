# Guía de Tests E2E con TypeScript - AutoRenta

> **Objetivo**: Crear tests E2E robustos sin errores de TypeScript que no requieran modificar código de producción.

## 📋 Tabla de Contenidos

- [Principios Fundamentales](#principios-fundamentales)
- [Configuración TypeScript](#configuración-typescript)
- [Tipos y Interfaces](#tipos-y-interfaces)
- [Plantillas de Tests](#plantillas-de-tests)
- [Mejores Prácticas](#mejores-prácticas)
- [Errores Comunes y Soluciones](#errores-comunes-y-soluciones)
- [Helpers y Utilidades](#helpers-y-utilidades)

---

## Principios Fundamentales

### ✅ DO (Hacer)

1. **Siempre importar tipos correctos**
   ```typescript
   import { test, expect, type Page, type Locator } from '@playwright/test';
   ```

2. **Usar interfaces para datos de test**
   ```typescript
   interface TestUser {
     email: string;
     password: string;
     fullName: string;
   }
   ```

3. **Manejar nulls explícitamente**
   ```typescript
   const carId = await card.getAttribute('data-car-id');
   if (!carId) {
     throw new Error('Car ID not found');
   }
   ```

4. **Usar optional chaining y nullish coalescing**
   ```typescript
   const text = await element.textContent() ?? '';
   const isVisible = await element.isVisible().catch(() => false);
   ```

### ❌ DON'T (No hacer)

1. **NO usar `any`**
   ```typescript
   // ❌ MAL
   const data: any = await element.textContent();

   // ✅ BIEN
   const data: string | null = await element.textContent();
   ```

2. **NO asumir que elementos existen**
   ```typescript
   // ❌ MAL
   const text = await element.textContent();

   // ✅ BIEN
   const element = page.locator('#my-element');
   const exists = await element.count() > 0;
   if (!exists) {
     throw new Error('Element not found');
   }
   const text = await element.textContent();
   ```

3. **NO modificar código de producción para arreglar tests**
   - Los tests deben adaptarse a la UI, no al revés
   - Si un selector no funciona, busca alternativas (role, text, etc.)

4. **NO ignorar errores de compilación**
   - Cada error de TypeScript es una señal de un problema potencial
   - Arregla el tipo, no uses `@ts-ignore`

---

## Configuración TypeScript

### tsconfig para Tests E2E

El proyecto ya tiene configuración correcta en `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "preserve"
  }
}
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

---

## Tipos y Interfaces

### Tipos Playwright Básicos

```typescript
import {
  test,
  expect,
  type Page,
  type Locator,
  type BrowserContext
} from '@playwright/test';

// Page: Representa una página del navegador
const page: Page = await context.newPage();

// Locator: Representa un elemento o conjunto de elementos
const button: Locator = page.locator('button');

// BrowserContext: Representa una sesión de navegador
const context: BrowserContext = await browser.newContext();
```

### Interfaces para Test Data

```typescript
// tests/helpers/test-data.ts

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'locador' | 'locatario' | 'ambos';
}

export interface TestCar {
  brand: string;
  model: string;
  year: number;
  plate: string;
  category: 'economy' | 'premium' | 'luxury';
  pricePerDay: number;
  city: string;
  address: string;
  features: string[];
}

export interface TestBooking {
  startDate: string;
  endDate: string;
  totalDays: number;
  expectedPrice: number;
}
```

### Helper Classes con Tipos

```typescript
// tests/helpers/page-helpers.ts

import { Page, Locator, expect } from '@playwright/test';

export class LoginHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/auth/login');

    const emailInput: Locator = this.page.locator('#login-email');
    const passwordInput: Locator = this.page.locator('#login-password');
    const loginButton: Locator = this.page.getByRole('button', { name: /entrar|login/i });

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await loginButton.click();

    await this.page.waitForURL(/\/cars|\//, { timeout: 15000 });
  }

  async isAuthenticated(): Promise<boolean> {
    const userMenu: Locator = this.page.getByTestId('user-menu');
    return await userMenu.isVisible().catch(() => false);
  }
}

// Uso:
// const loginHelper = new LoginHelper(page);
// await loginHelper.login('test@example.com', 'password');
```

---

## Plantillas de Tests

### Plantilla Básica

```typescript
import { test, expect, type Page } from '@playwright/test';

/**
 * Test Suite: [Nombre descriptivo]
 *
 * Priority: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
 * Duration: ~X minutes
 * Coverage:
 * - Feature 1
 * - Feature 2
 */

test.describe('[Nombre del Feature]', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto('/ruta-inicial');
  });

  test('should [descripción del comportamiento esperado]', async ({ page }: { page: Page }) => {
    // Arrange (preparar)
    const element: Locator = page.locator('#my-element');

    // Act (actuar)
    await element.click();

    // Assert (verificar)
    await expect(page).toHaveURL(/\/expected-url/);
  });
});
```

### Plantilla con Login

```typescript
import { test, expect, type Page, type Locator } from '@playwright/test';
import { generateTestUser } from '../helpers/test-data';

test.describe('Feature requiring authentication', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }: { page: Page }) => {
    // Generar usuario de test
    testUser = generateTestUser('locatario');

    // Login
    await page.goto('/auth/login');

    const emailInput: Locator = page.locator('#login-email');
    const passwordInput: Locator = page.locator('#login-password');
    const loginButton: Locator = page.getByRole('button', { name: /entrar/i });

    await emailInput.fill(testUser.email);
    await passwordInput.fill(testUser.password);
    await loginButton.click();

    await page.waitForURL(/\//, { timeout: 15000 });
  });

  test('authenticated user can perform action', async ({ page }: { page: Page }) => {
    // Test implementation
  });
});
```

### Plantilla con StorageState (Sesión Persistente)

```typescript
import { test, expect, type Page } from '@playwright/test';

test.describe('Tests with persistent session', () => {
  // Usar sesión guardada
  test.use({ storageState: 'tests/.auth/renter.json' });

  test('should be already authenticated', async ({ page }: { page: Page }) => {
    await page.goto('/');

    const userMenu: Locator = page.getByTestId('user-menu');
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });
});
```

### Plantilla para Tests de Formularios

```typescript
import { test, expect, type Page, type Locator } from '@playwright/test';

interface FormData {
  fullName: string;
  email: string;
  password: string;
}

test.describe('Registration Form', () => {
  test('should validate form fields', async ({ page }: { page: Page }) => {
    await page.goto('/auth/register');

    // Definir datos del formulario
    const formData: FormData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    // Obtener elementos del formulario
    const fullNameInput: Locator = page.locator('#register-fullname');
    const emailInput: Locator = page.locator('#register-email');
    const passwordInput: Locator = page.locator('#register-password');
    const submitButton: Locator = page.getByRole('button', { name: /crear cuenta/i });

    // Llenar formulario
    await fullNameInput.fill(formData.fullName);
    await emailInput.fill(formData.email);
    await passwordInput.fill(formData.password);

    // Verificar que no hay errores de validación
    const fullNameError: Locator = page.locator('#register-fullname-error');
    const emailError: Locator = page.locator('#register-email-error');
    const passwordError: Locator = page.locator('#register-password-error');

    await expect(fullNameError).not.toBeVisible();
    await expect(emailError).not.toBeVisible();
    await expect(passwordError).not.toBeVisible();

    // Verificar que el botón está habilitado
    await expect(submitButton).toBeEnabled();

    // Submit
    await submitButton.click();

    // Verificar redirección o mensaje de éxito
    await page.waitForURL(/\/success|\//, { timeout: 10000 });
  });
});
```

### Plantilla para Tests de Lista/Cards

```typescript
import { test, expect, type Page, type Locator } from '@playwright/test';

test.describe('Car Listing', () => {
  test('should display car cards', async ({ page }: { page: Page }) => {
    await page.goto('/cars');

    // Esperar a que los cards carguen
    await page.waitForTimeout(2000);

    // Buscar cards con múltiples estrategias
    const carCards: Locator = page.locator('[data-car-id]')
      .or(page.locator('app-car-card'));

    // Verificar que hay al menos un card
    const cardCount: number = await carCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verificar que el primer card es visible
    const firstCard: Locator = carCards.first();
    await expect(firstCard).toBeVisible({ timeout: 5000 });

    // Obtener datos del card
    const carId: string | null = await firstCard.getAttribute('data-car-id');
    expect(carId).toBeTruthy();

    // Click en el card
    await firstCard.click();

    // Verificar navegación
    await page.waitForURL(new RegExp(`/cars/${carId}`), { timeout: 10000 });
  });
});
```

---

## Mejores Prácticas

### 1. Manejo de Elementos Opcionales

```typescript
// ✅ BIEN: Verificar existencia antes de interactuar
const element: Locator = page.locator('#optional-element');
const exists: boolean = await element.count() > 0;

if (exists) {
  const isVisible: boolean = await element.isVisible().catch(() => false);
  if (isVisible) {
    await element.click();
  }
}
```

### 2. Esperas Inteligentes

```typescript
// ❌ MAL: Espera fija sin razón
await page.waitForTimeout(5000);

// ✅ BIEN: Esperar a condición específica
await expect(element).toBeVisible({ timeout: 5000 });

// ✅ BIEN: Esperar a URL
await page.waitForURL(/\/expected-url/, { timeout: 10000 });

// ✅ BIEN: Esperar a estado de carga
await page.waitForLoadState('domcontentloaded');
```

### 3. Selectores Robustos con Fallbacks

```typescript
// ✅ BIEN: Múltiples estrategias de selección
const loginButton: Locator = page.getByRole('button', { name: /entrar|login|sign in/i })
  .or(page.locator('#login-button'))
  .or(page.locator('button[type="submit"]'));

await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
await loginButton.first().click();
```

### 4. Manejo de Errores Tipado

```typescript
// ✅ BIEN: Try-catch con tipos específicos
try {
  await page.waitForURL(/\/success/, { timeout: 10000 });
} catch (error: unknown) {
  // Verificar tipo de error
  if (error instanceof Error) {
    console.log(`Navigation error: ${error.message}`);
  }

  // Tomar screenshot para debug
  await page.screenshot({ path: 'test-results/error.png', fullPage: true });

  // Re-lanzar error
  throw new Error(`Failed to navigate to success page: ${error}`);
}
```

### 5. Extracción de Datos con Tipos

```typescript
// ✅ BIEN: Declarar tipos para datos extraídos
interface CarData {
  id: string;
  title: string;
  price: number;
}

const carData: CarData = {
  id: await page.locator('[data-car-id]').first().getAttribute('data-car-id') ?? '',
  title: await page.locator('.car-title').first().textContent() ?? '',
  price: parseFloat(await page.locator('.car-price').first().textContent() ?? '0'),
};

expect(carData.id).toBeTruthy();
expect(carData.title.length).toBeGreaterThan(0);
expect(carData.price).toBeGreaterThan(0);
```

### 6. Helpers Reutilizables

```typescript
// tests/helpers/common-actions.ts

import { Page, Locator, expect } from '@playwright/test';

export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; visible?: boolean } = {}
): Promise<Locator> {
  const { timeout = 5000, visible = true } = options;

  const element: Locator = page.locator(selector);

  if (visible) {
    await expect(element).toBeVisible({ timeout });
  } else {
    const count: number = await element.count();
    expect(count).toBeGreaterThan(0);
  }

  return element;
}

export async function fillFormField(
  page: Page,
  fieldId: string,
  value: string
): Promise<void> {
  const field: Locator = page.locator(`#${fieldId}`);
  await expect(field).toBeVisible({ timeout: 5000 });
  await field.fill(value);

  // Verificar que el valor se llenó correctamente
  const actualValue: string = await field.inputValue();
  expect(actualValue).toBe(value);
}

export async function clickAndWaitForNavigation(
  page: Page,
  element: Locator,
  expectedUrlPattern: RegExp,
  timeout: number = 10000
): Promise<void> {
  await element.click();
  await page.waitForURL(expectedUrlPattern, { timeout });
}

// Uso:
// await fillFormField(page, 'email', 'test@example.com');
// await clickAndWaitForNavigation(page, loginButton, /\/dashboard/, 15000);
```

---

## Errores Comunes y Soluciones

### Error 1: "Property does not exist on type 'null'"

```typescript
// ❌ ERROR
const text = await element.textContent();
text.toLowerCase(); // Error: text puede ser null

// ✅ SOLUCIÓN 1: Nullish coalescing
const text = await element.textContent() ?? '';
text.toLowerCase(); // OK

// ✅ SOLUCIÓN 2: Optional chaining
const text = await element.textContent();
text?.toLowerCase();

// ✅ SOLUCIÓN 3: Verificación explícita
const text = await element.textContent();
if (text) {
  text.toLowerCase();
}
```

### Error 2: "Argument of type 'unknown' is not assignable"

```typescript
// ❌ ERROR
try {
  // ...
} catch (error) {
  console.log(error.message); // Error: error es unknown
}

// ✅ SOLUCIÓN
try {
  // ...
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

### Error 3: "Type 'number' is not assignable to type 'string'"

```typescript
// ❌ ERROR
const timeout = 5000;
await page.waitForTimeout(timeout.toString()); // Error: espera number

// ✅ SOLUCIÓN
const timeout: number = 5000;
await page.waitForTimeout(timeout);
```

### Error 4: "Cannot read property 'click' of null"

```typescript
// ❌ ERROR
const button = await page.locator('button').elementHandle();
await button.click(); // button puede ser null

// ✅ SOLUCIÓN: Usar Locator directamente
const button: Locator = page.locator('button');
await button.click(); // Playwright maneja internamente

// ✅ SOLUCIÓN 2: Verificar existencia
const button = await page.locator('button').elementHandle();
if (button) {
  await button.click();
} else {
  throw new Error('Button not found');
}
```

### Error 5: "Timeout exceeded while waiting for element"

```typescript
// ❌ PROBLEMA: Elemento no existe o tarda mucho
await expect(page.locator('#slow-element')).toBeVisible();

// ✅ SOLUCIÓN 1: Aumentar timeout
await expect(page.locator('#slow-element')).toBeVisible({ timeout: 15000 });

// ✅ SOLUCIÓN 2: Usar fallbacks
const element: Locator = page.locator('#primary-selector')
  .or(page.locator('#fallback-selector'));
await expect(element.first()).toBeVisible({ timeout: 10000 });

// ✅ SOLUCIÓN 3: Manejar error gracefully
const isVisible: boolean = await page.locator('#optional-element')
  .isVisible()
  .catch(() => false);

if (isVisible) {
  // Element exists, interact with it
} else {
  // Element doesn't exist, use alternative flow
}
```

---

## Helpers y Utilidades

### Test Data Factory

```typescript
// tests/helpers/test-data.ts

import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'locador' | 'locatario' | 'ambos';
}

export function generateTestUser(role: 'locador' | 'locatario' | 'ambos' = 'locatario'): TestUser {
  const uniqueId: string = uuidv4().slice(0, 8);
  return {
    email: `test.${role}.${uniqueId}@autorenta.test`,
    password: `Test${role}${uniqueId}!`,
    fullName: `Test User ${uniqueId}`,
    phone: `+549${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    role,
  };
}
```

### Page Object Model

```typescript
// tests/pages/login.page.ts

import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#login-email');
    this.passwordInput = page.locator('#login-password');
    this.loginButton = page.getByRole('button', { name: /entrar|login/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSuccess(): Promise<void> {
    await this.page.waitForURL(/\/cars|\//, { timeout: 15000 });
  }

  async expectLoginError(errorMessage: string): Promise<void> {
    const errorElement: Locator = this.page.locator('.error-message');
    await expect(errorElement).toContainText(errorMessage);
  }
}

// Uso:
// const loginPage = new LoginPage(page);
// await loginPage.goto();
// await loginPage.login('test@example.com', 'password');
// await loginPage.expectLoginSuccess();
```

---

## Checklist de Revisión de Tests

Antes de commitear tests E2E, verificar:

- [ ] Todos los imports incluyen tipos: `import { test, expect, type Page } from '@playwright/test'`
- [ ] No hay tipos `any` en el código
- [ ] Todos los valores nullable están manejados (`.catch(() => false)`, `?? ''`, etc.)
- [ ] Los selectores tienen fallbacks: `.or()`
- [ ] Los timeouts son razonables (no muy cortos ni muy largos)
- [ ] Hay mensajes de error descriptivos en `throw new Error()`
- [ ] Los tests son independientes (no dependen del orden de ejecución)
- [ ] Se limpian datos de test si es necesario
- [ ] Hay comentarios explicando lógica compleja
- [ ] Los tests tienen nombre descriptivo y documentación

---

## Ejemplos Completos

Ver los siguientes archivos para ejemplos completos:

- `tests/visitor/01-homepage.spec.ts` - Test básico sin autenticación
- `tests/auth/01-register.spec.ts` - Test de formulario con validación
- `tests/e2e/complete-booking-flow.spec.ts` - Test complejo E2E
- `tests/helpers/map-test-helpers.ts` - Helper class avanzado

---

## Recursos Adicionales

- [Playwright TypeScript Docs](https://playwright.dev/docs/test-typescript)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Última actualización**: 2025-11-10
**Versión**: 1.0.0
