# 📚 Arquitectura Page Objects - AutoRenta E2E Tests

## Descripción

Esta arquitectura implementa el patrón **Page Object Model (POM)** para tests E2E con Playwright, proporcionando una estructura escalable, mantenible y reutilizable.

## Estructura

```
page-objects/
├── base/                    # Clases base
├── auth/                    # Páginas de autenticación
├── cars/                    # Páginas de autos
└── components/              # Componentes reutilizables
```

## Clases Base

### BasePage

Clase base para todas las páginas con funcionalidad común:

```typescript
import { LoginPage } from '../page-objects/auth/LoginPage';

const loginPage = new LoginPage(page);
await loginPage.login(email, password);
```

**Métodos principales:**
- `goto()` - Navegar a la página
- `waitForElement()` - Esperar elemento visible
- `fillFormField()` - Llenar campo de formulario
- `selectOption()` - Seleccionar opción
- `isAuthenticated()` - Verificar autenticación
- `getValidationErrors()` - Obtener errores de validación

### BaseComponent

Clase base para componentes que aparecen en múltiples páginas:

```typescript
import { StockPhotoSelector } from '../page-objects/components/StockPhotoSelector';

const photoSelector = new StockPhotoSelector(page);
await photoSelector.selectStockPhotos(3);
```

## Page Objects Implementados

### 1. LoginPage

Maneja todo el flujo de autenticación:

```typescript
const loginPage = new LoginPage(page);

// Login simple
await loginPage.login('user@example.com', 'password');

// Verificar login exitoso
const success = await loginPage.isLoginSuccessful();

// Obtener mensaje de error
const error = await loginPage.getErrorMessage();
```

### 2. PublishCarPage

Maneja la publicación de autos:

```typescript
const publishPage = new PublishCarPage(page);

// Llenar formulario completo
await publishPage.fillBasicInfo({
  brand: 'Porsche',
  model: '911 Carrera',
  year: 2023,
  color: 'Blanco',
  licensePlate: 'ABC123',
  description: 'Descripción del auto',
  pricePerDay: 25000,
  city: 'Buenos Aires',
  address: 'Av. Corrientes 1234'
});

// Publicar
await publishPage.publish();

// Verificar éxito
const isSuccess = await publishPage.isPublishSuccessful();
```

### 3. StockPhotoSelector

Componente para selección de fotos de stock:

```typescript
const photoSelector = new StockPhotoSelector(page);

// Flujo completo
await photoSelector.selectStockPhotos(5, 'Porsche', '911');

// O paso a paso
await photoSelector.waitForOpen();
await photoSelector.search('Porsche', '911');
await photoSelector.selectPhotos(3);
await photoSelector.confirm();
```

## UserFactory

Factory para crear usuarios de test:

```typescript
const userFactory = new UserFactory();

// Crear usuario único
const testUser = userFactory.createOwner();

// Usar usuario seed existente
const seedUser = userFactory.getSeedOwner();

// Usuario real (para tests específicos)
const realUser = userFactory.getRealOwner();
```

## Helpers de Diagnóstico

### captureStep

Captura cada paso del test con screenshot y métricas:

```typescript
import { captureStep } from '../../helpers/test-diagnostics';

const result = await captureStep(
  page,
  'Nombre del paso',
  async () => {
    // Acción a ejecutar
    await page.click('button');
  }
);
```

### setupErrorCollectors

Configura collectors de errores para debugging:

```typescript
const errorCollectors = setupErrorCollectors(page);

// Al final del test
errorCollectors.printErrors();
```

## Ejemplo de Test Completo

```typescript
import { test, expect } from '@playwright/test';
import { UserFactory } from '../../fixtures/auth/UserFactory';
import { LoginPage } from '../../page-objects/auth/LoginPage';
import { PublishCarPage } from '../../page-objects/cars/PublishCarPage';
import { StockPhotoSelector } from '../../page-objects/components/StockPhotoSelector';
import { captureStep } from '../../helpers/test-diagnostics';

test('Publicar auto con Page Objects', async ({ page }) => {
  // Setup
  const userFactory = new UserFactory();
  const loginPage = new LoginPage(page);
  const publishPage = new PublishCarPage(page);
  const photoSelector = new StockPhotoSelector(page);

  // Test user
  const user = userFactory.getRealOwner();

  // Step 1: Login
  await captureStep(page, 'Login', async () => {
    await loginPage.login(user.email, user.password);
  });

  // Step 2: Publicar auto
  await captureStep(page, 'Publicar auto', async () => {
    await publishPage.goto();
    await publishPage.fillBasicInfo({
      brand: 'Porsche',
      model: '911',
      year: 2023,
      // ... más campos
    });
  });

  // Step 3: Agregar fotos
  await captureStep(page, 'Agregar fotos', async () => {
    await publishPage.openStockPhotosModal();
    await photoSelector.selectStockPhotos(3);
  });

  // Step 4: Confirmar publicación
  await publishPage.publish();
  expect(await publishPage.isPublishSuccessful()).toBeTruthy();
});
```

## Ventajas de esta Arquitectura

### ✅ Mantenibilidad
- Cambios centralizados en Page Objects
- Sin duplicación de selectores
- Fácil actualización cuando cambia la UI

### ✅ Reutilización
- Page Objects compartidos entre tests
- Helpers comunes para todos
- UserFactory para datos de test

### ✅ Legibilidad
- Tests más cortos y claros
- Abstracción de detalles de implementación
- Nombres descriptivos de métodos

### ✅ Debugging
- Screenshots automáticos en cada paso
- Captura de errores de consola y red
- Reportes detallados de fallos

## Mejores Prácticas

1. **Un Page Object por página**
   - Mantener Page Objects enfocados
   - No mezclar responsabilidades

2. **Métodos descriptivos**
   - Usar nombres que describan la acción
   - Evitar detalles de implementación

3. **Sin asserts en Page Objects**
   - Page Objects solo interactúan
   - Los asserts van en los tests

4. **Esperas inteligentes**
   - Usar waitForElement en lugar de timeouts fijos
   - Configurar timeouts apropiados

5. **Datos de test aislados**
   - Usar UserFactory para usuarios únicos
   - Evitar dependencias entre tests

## Troubleshooting

### Test falla con timeout

```typescript
// Aumentar timeout específico
await page.waitForSelector('selector', { timeout: 15000 });

// O configurar globalmente
test.use({
  actionTimeout: 15000,
  navigationTimeout: 30000
});
```

### Elemento no visible

```typescript
// Verificar si elemento está visible antes de interactuar
if (await publishPage.isElementVisible(selector)) {
  await publishPage.click(selector);
}
```

### Modal no se abre

```typescript
// Esperar animación de Ionic
await page.waitForTimeout(300);
await photoSelector.waitForOpen();
```

## Próximos Pasos

1. **Agregar más Page Objects**
   - `CarDetailPage`
   - `MyCarsPage`
   - `BookingPage`

2. **Expandir helpers**
   - Helper de API para setup de datos
   - Helper de limpieza post-test

3. **Mejorar UserFactory**
   - Integración con Supabase Admin API
   - Limpieza automática de usuarios

4. **CI/CD Integration**
   - GitHub Actions workflow
   - Reportes automáticos
   - Paralelización de tests

## Recursos

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Pattern](https://martinfowler.com/bliki/PageObject.html)
- [Test Best Practices](https://playwright.dev/docs/best-practices)

---

**Última actualización:** 2024-11-13
**Versión:** 1.0.0