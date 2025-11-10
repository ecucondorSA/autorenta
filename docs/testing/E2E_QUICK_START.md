# Quick Start: Tests E2E sin Errores de TypeScript

> Guía rápida para crear tests E2E robustos en 5 minutos

## 🚀 Inicio Rápido

### 1. Copiar Template Apropiado

```bash
# Para test de página básica
cp tests/templates/basic-page-test.template.ts tests/[categoria]/my-feature.spec.ts

# Para test de formulario
cp tests/templates/form-test.template.ts tests/[categoria]/my-form.spec.ts

# Para test con autenticación
cp tests/templates/authenticated-test.template.ts tests/[categoria]/my-auth-feature.spec.ts

# Para test de lista + detalle
cp tests/templates/list-and-detail-test.template.ts tests/[categoria]/my-list.spec.ts
```

### 2. Buscar y Reemplazar Placeholders

Busca en el archivo y reemplaza estos placeholders:

| Placeholder | Ejemplo | Descripción |
|------------|---------|-------------|
| `[FEATURE_NAME]` | `Car Listing` | Nombre del feature |
| `[YOUR_ROUTE]` | `/cars` | Ruta de la página |
| `[URL_PATTERN]` | `/\/cars/` | Regex para URL |
| `[ELEMENT_SELECTOR]` | `#car-list` | Selector CSS del elemento |
| `[BUTTON_TEXT]` | `Ver más` | Texto del botón |
| `[FIELD_ID]` | `email` | ID del campo |

### 3. Ejecutar Test

```bash
# Ejecutar tu nuevo test
npm run test:e2e -- tests/[categoria]/my-feature.spec.ts

# Ver en modo UI
npm run test:e2e:ui -- tests/[categoria]/my-feature.spec.ts

# Debug
npm run test:e2e:debug -- tests/[categoria]/my-feature.spec.ts
```

---

## 📝 Reglas de Oro (Evitar Errores TypeScript)

### ✅ Siempre Hacer

```typescript
// 1. Importar tipos explícitos
import { test, expect, type Page, type Locator } from '@playwright/test';

// 2. Tipar variables
const button: Locator = page.locator('button');
const text: string | null = await element.textContent();

// 3. Manejar nulls
const value = await element.textContent() ?? '';
const isVisible = await element.isVisible().catch(() => false);

// 4. Usar fallbacks en selectores
const element: Locator = page.locator('#primary')
  .or(page.locator('#fallback'));
```

### ❌ Nunca Hacer

```typescript
// 1. NO usar 'any'
const data: any = await something(); // ❌

// 2. NO asumir valores no-null
const text = await element.textContent();
text.toLowerCase(); // ❌ text puede ser null

// 3. NO ignorar errores de compilación
// @ts-ignore // ❌
await element.click();

// 4. NO modificar código de producción para arreglar tests
// Si el test falla, arregla el test, no el código ❌
```

---

## 🔧 Snippets Útiles

### Verificar que Elemento Existe

```typescript
const element: Locator = page.locator('#my-element');
const exists: boolean = await element.count() > 0;

if (!exists) {
  throw new Error('Element not found');
}
```

### Click y Esperar Navegación

```typescript
const button: Locator = page.locator('#submit');
await button.click();
await page.waitForURL(/\/success/, { timeout: 10000 });
```

### Llenar Formulario

```typescript
interface FormData {
  email: string;
  password: string;
}

const data: FormData = {
  email: 'test@example.com',
  password: 'SecurePass123!',
};

await page.locator('#email').fill(data.email);
await page.locator('#password').fill(data.password);
```

### Verificar Múltiples Elementos

```typescript
const elements: string[] = ['#element1', '#element2', '#element3'];

for (const selector of elements) {
  const element: Locator = page.locator(selector);
  await expect(element).toBeVisible({ timeout: 5000 });
}
```

### Manejo de Elementos Opcionales

```typescript
const optionalElement: Locator = page.locator('#optional');
const isVisible: boolean = await optionalElement.isVisible().catch(() => false);

if (isVisible) {
  await optionalElement.click();
} else {
  console.log('Optional element not present, continuing...');
}
```

### Extraer y Validar Datos

```typescript
interface ItemData {
  id: string;
  title: string;
  price: number;
}

const itemData: ItemData = {
  id: await page.locator('[data-id]').getAttribute('data-id') ?? '',
  title: await page.locator('.title').textContent() ?? '',
  price: parseFloat(await page.locator('.price').textContent() ?? '0'),
};

expect(itemData.id).toBeTruthy();
expect(itemData.title.length).toBeGreaterThan(0);
expect(itemData.price).toBeGreaterThan(0);
```

---

## 🐛 Debugging TypeScript Errors

### Error: "Type 'null' is not assignable to type 'string'"

```typescript
// ❌ ERROR
const text: string = await element.textContent();

// ✅ SOLUCIÓN 1: Nullish coalescing
const text: string = await element.textContent() ?? '';

// ✅ SOLUCIÓN 2: Union type
const text: string | null = await element.textContent();
if (text) {
  // Usar text aquí
}
```

### Error: "Property 'X' does not exist on type 'unknown'"

```typescript
// ❌ ERROR
try {
  // ...
} catch (error) {
  console.log(error.message); // error es 'unknown'
}

// ✅ SOLUCIÓN
try {
  // ...
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

### Error: "Argument of type 'X' is not assignable to parameter of type 'Y'"

```typescript
// ❌ ERROR
const timeout = '5000';
await page.waitForTimeout(timeout); // Espera number, no string

// ✅ SOLUCIÓN
const timeout: number = 5000;
await page.waitForTimeout(timeout);
```

---

## 📚 Recursos

- **Guía Completa**: `docs/testing/E2E_TYPESCRIPT_GUIDE.md`
- **Templates**: `tests/templates/*.template.ts`
- **Ejemplos Reales**:
  - `tests/visitor/01-homepage.spec.ts`
  - `tests/auth/01-register.spec.ts`
  - `tests/e2e/complete-booking-flow.spec.ts`

---

## 🎯 Checklist Pre-Commit

Antes de hacer commit de tus tests:

- [ ] No hay errores de TypeScript: `npm run lint`
- [ ] No usé `any` en ningún lugar
- [ ] Todos los valores nullable están manejados
- [ ] Los selectores tienen fallbacks con `.or()`
- [ ] Los tests pasan: `npm run test:e2e -- path/to/test.spec.ts`
- [ ] Hay mensajes de error descriptivos
- [ ] Los tests son independientes (no dependen de orden)

---

**Happy Testing! 🎉**
