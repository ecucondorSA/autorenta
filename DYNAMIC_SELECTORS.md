# Selectores Dinámicos - Documentación

Este documento lista los selectores que **no se pueden verificar estáticamente** porque se generan dinámicamente en tiempo de ejecución, pero son **válidos en los tests E2E**.

## Selectores Dinámicos Conocidos

### 1. MercadoPago SDK
- **`mercadopago-init-point`** - Botón generado dinámicamente cuando se crea una preferencia de pago
  - **Ubicación**: Se inyecta en el DOM por el SDK de MercadoPago
  - **Uso en tests**: `page.getByTestId('mercadopago-init-point')`
  - **Nota**: Este elemento solo existe después de crear una preferencia de pago exitosamente

### 2. Flatpickr (Date Picker)
- **`.flatpickr-calendar`** - Calendario generado por la librería Flatpickr
  - **Ubicación**: Se genera cuando se abre el date picker
  - **Uso en tests**: `page.locator('.flatpickr-calendar')`
  - **Nota**: El calendario se crea dinámicamente cuando el usuario interactúa con el input de fecha

### 3. Componentes Ionic
- **`ion-modal`** - Modales generados por Ionic
  - **Ubicación**: Se generan cuando se abre un modal
  - **Uso en tests**: `page.locator('ion-modal')`
  - **Nota**: Los modales de Ionic se renderizan fuera del componente principal

- **`ion-toast`** - Notificaciones toast generadas por Ionic
  - **Ubicación**: Se generan cuando se muestra una notificación
  - **Uso en tests**: `page.locator('ion-toast')`
  - **Nota**: Se renderizan en el body del documento

### 4. Modales de Onboarding
- **`.mp-onboarding-modal`** - Modal de onboarding de MercadoPago
  - **Ubicación**: Se genera cuando se abre el flujo de onboarding
  - **Uso en tests**: `page.locator('.mp-onboarding-modal, ion-modal')`
  - **Nota**: Se crea dinámicamente por el servicio de MercadoPago

### 5. Componentes Condicionales
- **`app-splash-loader`** - Componente de splash screen
  - **Ubicación**: Se renderiza condicionalmente al inicio de la app
  - **Uso en tests**: `page.locator('app-splash-loader')`
  - **Nota**: Aunque tiene `data-testid="splash-loader"`, se renderiza condicionalmente y puede no estar presente en el HTML estático

## Cómo Verificar Selectores Dinámicos

### En Tests E2E
Estos selectores funcionan correctamente en tests E2E porque:
1. Se ejecutan en un navegador real
2. El JavaScript genera los elementos dinámicamente
3. Playwright puede esperar a que aparezcan

### En Verificación Estática
No se pueden verificar estáticamente porque:
1. No existen en el HTML inicial
2. Se generan por JavaScript en tiempo de ejecución
3. Dependen de interacciones del usuario o estado de la aplicación

## Recomendaciones

### Para Tests
✅ **Usar estos selectores es correcto** - Funcionan en tests E2E
✅ **Agregar timeouts apropiados** - Esperar a que aparezcan
✅ **Usar `waitFor` cuando sea necesario**

### Para Verificación Estática
⚠️ **No se pueden verificar** - Se ignoran en el análisis estático
✅ **Se marcan como verificados** - Porque son válidos en runtime
📝 **Se documentan aquí** - Para referencia futura

## Ejemplos de Uso

### MercadoPago Init Point
```typescript
// ✅ Correcto en tests
const initPointButton = await page.getByTestId('mercadopago-init-point');
await expect(initPointButton).toBeVisible({ timeout: 10000 });
```

### Flatpickr Calendar
```typescript
// ✅ Correcto en tests
const calendar = page.locator('.flatpickr-calendar');
await expect(calendar).toBeVisible();
```

### Ionic Modal
```typescript
// ✅ Correcto en tests
const modal = page.locator('ion-modal');
await expect(modal).toBeVisible();
```

## Actualización de la Lista

Si encuentras un nuevo selector dinámico:
1. Agregarlo a `DYNAMIC_SELECTORS.md`
2. Agregarlo al array `dynamicSelectors` en `tools/analyze-test-selectors.mjs`
3. Documentar su origen y uso

---

**Última actualización**: 2025-01-20
**Versión**: 1.0.0






