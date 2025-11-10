# Templates de Tests E2E

Esta carpeta contiene plantillas reutilizables para crear tests E2E sin errores de TypeScript.

## 📁 Templates Disponibles

| Template | Uso | Cuándo Usar |
|----------|-----|-------------|
| **basic-page-test.template.ts** | Tests básicos de página | Verificar que una página carga, elementos están presentes, navegación simple |
| **form-test.template.ts** | Tests de formularios | Validaciones, submit, errores, estados habilitado/deshabilitado |
| **authenticated-test.template.ts** | Tests con autenticación | Features que requieren login, sesión persistente |
| **list-and-detail-test.template.ts** | Tests de lista + detalle | Listas de items, click para ver detalle, filtros, paginación |

## 🚀 Cómo Usar

### Paso 1: Copiar Template

```bash
cp tests/templates/[template-name].template.ts tests/[categoria]/my-test.spec.ts
```

Ejemplo:
```bash
cp tests/templates/form-test.template.ts tests/auth/login-form.spec.ts
```

### Paso 2: Reemplazar Placeholders

Abre el archivo y busca todos los `[PLACEHOLDERS]` (en mayúsculas entre corchetes).

Ejemplos de placeholders comunes:
- `[FEATURE_NAME]` → Nombre del feature (ej: "User Login")
- `[YOUR_ROUTE]` → Ruta URL (ej: "/auth/login")
- `[URL_PATTERN]` → Regex de URL (ej: "/\/auth\/login/")
- `[ELEMENT_SELECTOR]` → Selector CSS (ej: "#login-form")
- `[BUTTON_TEXT]` → Texto del botón (ej: "Iniciar sesión")

### Paso 3: Adaptar a tu Caso

- Elimina tests que no aplican
- Agrega tests adicionales si es necesario
- Completa las interfaces de datos (FormData, ItemData, etc.)

### Paso 4: Ejecutar

```bash
# Ejecutar test específico
npm run test:e2e -- tests/[categoria]/my-test.spec.ts

# En modo UI (visual)
npm run test:e2e:ui -- tests/[categoria]/my-test.spec.ts

# Debug paso a paso
npm run test:e2e:debug -- tests/[categoria]/my-test.spec.ts
```

## 📖 Documentación

- **Guía Completa**: Ver `docs/testing/E2E_TYPESCRIPT_GUIDE.md`
- **Quick Start**: Ver `docs/testing/E2E_QUICK_START.md`
- **Ejemplos Reales**: Ver `tests/visitor/`, `tests/auth/`, `tests/e2e/`

## ✅ Checklist de Calidad

Antes de hacer commit, verificar:

- [ ] No hay errores de TypeScript (ejecutar `npm run lint`)
- [ ] Todos los imports incluyen tipos: `type Page`, `type Locator`
- [ ] No se usa `any` en ningún lugar
- [ ] Valores nullable están manejados (`.catch(() => false)`, `?? ''`)
- [ ] Selectores tienen fallbacks con `.or()`
- [ ] Tests pasan: ejecutar `npm run test:e2e`
- [ ] Hay mensajes de error descriptivos
- [ ] Tests son independientes (no dependen de orden)

## 🎯 Ejemplos de Uso

### Ejemplo 1: Test de Homepage

```bash
cp tests/templates/basic-page-test.template.ts tests/visitor/homepage.spec.ts
```

Reemplazar:
- `[FEATURE_NAME]` → "Homepage"
- `[YOUR_ROUTE]` → "/"
- `[URL_PATTERN]` → "/\//"
- `[MAIN_ELEMENT_SELECTOR]` → "#main-content"

### Ejemplo 2: Test de Login

```bash
cp tests/templates/form-test.template.ts tests/auth/login.spec.ts
```

Reemplazar:
- `[FORM_NAME]` → "Login"
- `[FORM_PAGE_URL]` → "/auth/login"
- `[FIELD_1_ID]` → "email"
- `[FIELD_2_ID]` → "password"
- `[SUBMIT_TEXT]` → "Iniciar sesión"

### Ejemplo 3: Test de Lista de Cars

```bash
cp tests/templates/list-and-detail-test.template.ts tests/cars/car-listing.spec.ts
```

Reemplazar:
- `[FEATURE_NAME]` → "Car Listing"
- `[LIST_PAGE_URL]` → "/cars"
- `[ITEM_TYPE]` → "car"
- `[ITEM_COMPONENT]` → "car-card"

## 🐛 Troubleshooting

### "Property X does not exist on type null"

```typescript
// ❌ MAL
const text: string = await element.textContent();

// ✅ BIEN
const text: string = await element.textContent() ?? '';
```

### "Type unknown is not assignable"

```typescript
// ❌ MAL
catch (error) {
  console.log(error.message);
}

// ✅ BIEN
catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

### "Element not found"

```typescript
// ❌ MAL
const button = page.locator('#button');

// ✅ BIEN - Con fallbacks
const button = page.locator('#button')
  .or(page.getByRole('button', { name: /submit/i }))
  .or(page.locator('button[type="submit"]'));
```

## 📚 Recursos Adicionales

- **Playwright Docs**: https://playwright.dev/docs/test-typescript
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/intro.html
- **AutoRenta Testing Guide**: `docs/testing/TESTING_PLAN.md`

---

**Última actualización**: 2025-11-10
