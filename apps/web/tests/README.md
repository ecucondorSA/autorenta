# AutoRenta E2E Tests

Guía completa para ejecutar y mantener los tests E2E de AutoRenta.

## 📋 Tabla de Contenidos

- [Tests Disponibles](#tests-disponibles)
- [Configuración Inicial](#configuración-inicial)
- [Ejecución de Tests](#ejecución-de-tests)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)

---

## 🧪 Tests Disponibles

### 1. **booking-with-payment-e2e.spec.ts**
Flujo completo de booking con pago:
- Búsqueda de auto disponible
- Selección de auto
- Login de usuario
- Verificación de wallet
- Creación de booking
- Simulación de pago con MercadoPago
- Verificación de booking confirmado
- Verificación de fondos bloqueados

**Tests**: 4 test cases
**Duración estimada**: 2-3 minutos
**Prioridad**: 🔴 CRÍTICO

---

### 2. **cash-deposit-non-withdrawable-e2e.spec.ts**
Tests del fix de depósitos en efectivo:
- Warning en UI cuando selecciona MercadoPago
- Depósito en efectivo marcado como non-withdrawable
- Rechazo de retiro de fondos no retirables
- Visualización de balance no retirable
- Flujo completo de usuario con efectivo

**Tests**: 5 test cases
**Duración estimada**: 1-2 minutos
**Prioridad**: 🟠 ALTO

---

### 3. **wallet-deposit-e2e.spec.ts**
Tests de depósito en wallet:
- Iniciación de depósito
- Creación de preferencia de MercadoPago
- Validación de límites de monto
- Opciones de proveedores de pago
- Instrucciones de transferencia bancaria
- Manejo de errores de API

**Tests**: 6 test cases
**Duración estimada**: 1-2 minutos
**Prioridad**: 🟠 ALTO

---

### 4. **mercadopago-payment-flow.spec.ts**
Tests de UI de MercadoPago (ya existente):
- Flujo de deposit flow
- Conversion preview en tiempo real
- Warnings de efectivo
- Selección de proveedores

**Tests**: 4 test suites
**Duración estimada**: 1 minuto
**Prioridad**: 🟡 MEDIO

---

## ⚙️ Configuración Inicial

### 1. Instalar Playwright

```bash
cd apps/web
npm install

# Instalar browsers de Playwright
npx playwright install
```

### 2. Configurar .env.test

Crea el archivo `.env.test` en `apps/web/` con las siguientes variables:

```bash
# Supabase (Test Project)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# MercadoPago Sandbox
MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-your-sandbox-token
MERCADOPAGO_TEST_PUBLIC_KEY=TEST-your-public-key

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:4200

# Test Users
TEST_RENTER_EMAIL=test-renter@autorenta.com
TEST_RENTER_PASSWORD=TestPassword123!
```

**Importante**: NO commitear este archivo. Ya está en `.gitignore`.

### 3. Crear Usuario de Test

En Supabase:
1. Ir a Authentication → Users
2. Crear nuevo usuario con email `test-renter@autorenta.com`
3. Asignar password `TestPassword123!`
4. Verificar email si es necesario

---

## 🚀 Ejecución de Tests

### Tests Locales

```bash
# Desde /home/edu/autorenta/apps/web

# Ejecutar TODOS los tests E2E
npm run test:e2e

# Ejecutar tests en modo UI (visual, permite debugging)
npm run test:e2e:ui

# Ejecutar tests en modo debug
npm run test:e2e:debug

# Ejecutar un archivo específico
npx playwright test booking-with-payment-e2e

# Ejecutar solo tests críticos (tagged con @critical)
npx playwright test --grep "@critical"
```

### Tests con Servidor Local

```bash
# Terminal 1: Levantar servidor
npm start

# Terminal 2: Ejecutar tests
npm run test:e2e
```

### Tests en CI/CD

Los tests se ejecutan automáticamente en:
- Push a `main`, `develop`, `staging`
- Pull Requests a `main`
- Manualmente vía GitHub Actions

Ver resultados en: **Actions** → **E2E Tests**

---

## 📊 Coverage

### Ejecutar Unit Tests con Coverage

```bash
# Desde /home/edu/autorenta/apps/web

# Ejecutar tests con coverage
npm run test:coverage

# Ver reporte en browser
open coverage/index.html
```

### Coverage en CI/CD

El reporte de coverage se genera automáticamente en CI/CD y está disponible como artifact en GitHub Actions.

**Acceder al reporte**:
1. Ir a Actions → CI workflow
2. Click en el run más reciente
3. Descargar artifact "coverage-report"
4. Abrir `index.html` en browser

---

## 🐛 Troubleshooting

### Error: "Browser not installed"

```bash
npx playwright install chromium
```

### Error: "ECONNREFUSED localhost:4200"

Asegúrate de que el servidor esté corriendo:
```bash
npm start
```

### Error: "Test timeout"

Aumenta el timeout en el test:
```typescript
test.setTimeout(120000); // 2 minutos
```

### Error: "Usuario no puede login"

Verifica que:
1. El usuario existe en Supabase
2. El email/password en `.env.test` son correctos
3. El usuario tiene email verificado (si es requerido)

### Tests fallan en CI/CD pero pasan localmente

Revisa:
1. Secretos configurados en GitHub: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
2. Base URL correcta (`http://localhost:4200`)
3. Timeout suficiente (CI puede ser más lento)

---

## 📝 Escribir Nuevos Tests

### Template Básico

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mi Feature E2E', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // 1 minuto
    // Setup común
  });

  test('should do something', async ({ page }) => {
    // 1. Navigate
    await page.goto('http://localhost:4200/my-page');

    // 2. Interact
    await page.click('button');

    // 3. Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Usar data-testid cuando sea posible**:
   ```html
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Esperar por respuestas de API**:
   ```typescript
   await page.waitForResponse(response =>
     response.url().includes('/api/endpoint')
   );
   ```

3. **Usar timeouts generosos**:
   ```typescript
   await expect(element).toBeVisible({ timeout: 10000 });
   ```

4. **Capturar screenshots en fallas**:
   ```typescript
   test('my test', async ({ page }) => {
     try {
       // test logic
     } catch (error) {
       await page.screenshot({ path: 'failure.png' });
       throw error;
     }
   });
   ```

---

## 🎯 Objetivos de Cobertura

### Actual

- **Unit Tests**: ~45% coverage
- **E2E Tests**: 4 archivos, 19 test cases
- **Flujos Críticos**: 3/6 cubiertos

### Objetivo (3 Meses)

- **Unit Tests**: 80% coverage
- **E2E Tests**: 15+ archivos
- **Flujos Críticos**: 6/6 cubiertos

---

## 📚 Recursos

- **Playwright Docs**: https://playwright.dev/
- **Test Coverage Analysis**: `/home/edu/autorenta/TEST_COVERAGE_ANALYSIS.md`
- **Payment Architecture**: `/home/edu/autorenta/PAYMENT_ARCHITECTURE_CLARIFICATION.md`
- **Cash Deposit Fix**: `/home/edu/autorenta/CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md`

---

## 🤝 Contribuir

### Antes de crear un PR

1. Ejecutar todos los tests localmente:
   ```bash
   npm run test:coverage  # Unit tests
   npm run test:e2e       # E2E tests
   ```

2. Asegurar que todos los tests pasen

3. Si agregas nueva funcionalidad, agrega tests E2E correspondientes

### Guía de PR

```markdown
## Tests Added

- [ ] Unit tests added
- [ ] E2E test added (if applicable)
- [ ] All tests passing locally
- [ ] Coverage maintained or improved
```

---

**Última actualización**: 2025-10-28
**Mantenedor**: AutoRenta Team
