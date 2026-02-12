# ✅ Estrategia Integral de Calidad (QA) y Testing

> **Ingeniería de Fiabilidad**
> Este documento define cómo garantizamos que Autorenta funcione correctamente en cada commit. Combinamos pruebas estáticas, unitarias, de integración y end-to-end (E2E) en un pipeline continuo.

---

## 🏗️ La Pirámide de Testing

| Tipo | Herramienta | Cobertura Objetivo | Frecuencia | Costo (Tiempo) |
| :--- | :--- | :--- | :--- | :--- |
| **E2E (UI)** | Playwright | Flujos Críticos (Checkout, Login) | Nightly / Release | Alto (Minutos) |
| **Integración** | Vitest + Supabase | Interacción DB y Edge Functions | Pull Request | Medio (Segundos) |
| **Unitarios** | Vitest | Reglas de Negocio (Servicios, Utils) | > 80% | En cada Commit | Bajo (Milisegundos) |
| **Estáticos** | ESLint / TSC | Sintaxis y Tipos | 100% | En vivo (IDE) | Nulo |

---

## 🧪 1. Tests Unitarios (Vitest)

La base de la pirámide. Rápidos y aislados.

### Configuración (`vitest.config.ts`)
Usamos `jsdom` para simular un navegador ligero.

### Ejemplo: Testeando `BookingOpsService`
Validamos que el cálculo de precios sea exacto al centavo.

```typescript
// apps/web/src/app/core/services/bookings/booking-ops.service.spec.ts
import { BookingOpsService } from './booking-ops.service';

describe('BookingOpsService', () => {
  let service: BookingOpsService;

  beforeEach(() => {
    service = new BookingOpsService(); // Inyección simple
  });

  it('debe aplicar descuento del 10% para alquileres de 7 días', () => {
    const price = service.calculateRentalPrice({
      basePrice: 100, // $100/día
      days: 7,
    });
    
    // 7 * 100 = 700. Descuento 10% = 70. Total = 630.
    expect(price.total).toBe(630);
    expect(price.discountApplied).toBe(true);
  });

  it('debe lanzar error si la fecha de fin es anterior al inicio', () => {
    expect(() => service.validateDates(today, yesterday)).toThrowError(/fechas inválidas/);
  });
});
```

### Mocking de Dependencias
Para testear componentes que dependen de APIs externas, usamos Spies.

```typescript
// Mockear Supabase Client
const supabaseSpy = vi.spyOn(supabaseClient, 'from').mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [], error: null }),
} as any);
```

---

## 🔌 2. Tests de Integración (Backend)

Validan que nuestras Edge Functions y Triggers de base de datos funcionen juntos.

### Entorno Local
Requiere Supabase corriendo localmente (`supabase start`).

### Ejemplo: Testeando un Trigger RLS
```sql
-- supabase/tests/database/01_rls_bookings.sql
BEGIN;
  -- Crear usuarios de prueba
  SELECT tests.create_supabase_user('renter');
  SELECT tests.create_supabase_user('hacker');

  -- Actuar como renter
  SELECT tests.authenticate_as('renter');
  INSERT INTO public.bookings (car_id, ...) VALUES (...); -- Debería pasar

  -- Actuar como hacker
  SELECT tests.authenticate_as('hacker');
  SELECT * FROM public.bookings; -- Debería retornar 0 filas (o error)
  
  -- Aserción
  SELECT is(count(*), 0, 'Hacker no debe ver bookings ajenos') FROM public.bookings;
ROLLBACK;
```

---

## 🎭 3. Tests End-to-End (Playwright)

Simulan un usuario real navegando por el sitio. Son nuestra red de seguridad final.

### Flujos Críticos Automatizados
1.  **Renter Happy Path:** Login -> Buscar Auto -> Seleccionar Fechas -> Ver desglose de precio.
2.  **Owner Happy Path:** Publicar auto -> Subir fotos -> Guardar.
3.  **Auth:** Login fallido, Recuperar contraseña.

### Ejemplo: Flujo de Reserva
```typescript
// tests/e2e/booking.spec.ts
import { test, expect } from '@playwright/test';

test('Usuario puede iniciar proceso de reserva', async ({ page }) => {
  // 1. Navegar al detalle
  await page.goto('/cars/uuid-auto-prueba');

  // 2. Seleccionar fechas (interacción con DatePicker)
  await page.click('[data-testid="date-picker-trigger"]');
  await page.click('text=15'); // Día 15
  await page.click('text=20'); // Día 20

  // 3. Verificar precio calculado
  await expect(page.locator('[data-testid="total-price"]')).toContainText('$500');

  // 4. Click en reservar
  await page.click('text=Solicitar Reserva');

  // 5. Verificar redirección a login (si no estaba logueado)
  await expect(page).toHaveURL(/.*\/auth\/login/);
});
```

### Configuración CI (`.github/workflows/e2e.yml`)
Ejecutamos los tests en paralelo (sharding) para velocidad.

```yaml
jobs:
  e2e:
    strategy:
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - run: npx playwright test --shard ${{ matrix.shard }}
```

---

## 🚦 Quality Gates (Reglas de Merge)

Para que un Pull Request (PR) se fusione en `main`:

1.  ✅ **Lint:** 0 errores de estilo.
2.  ✅ **Unit:** 100% de tests pasando.
3.  ✅ **Build:** La aplicación debe compilar sin errores en modo producción.
4.  ✅ **Size Limit:** El bundle principal no debe exceder 500KB (gzip).

---

## 🛠️ Comandos de Testing

| Comando | Descripción |
| :--- | :--- |
| `pnpm test:unit` | Corre todos los tests unitarios una vez. |
| `pnpm test:unit:watch` | Modo interactivo para desarrollo (TDD). |
| `pnpm test:unit:coverage` | Genera reporte HTML de cobertura (`apps/web/coverage/index.html`). |
| `pnpm test:e2e` | Corre tests E2E en modo headless. |
| `pnpm test:e2e:ui` | Abre la UI de Playwright para depurar paso a paso. |
| `supabase test db` | Ejecuta la suite de pruebas SQL pgTAP. |

---

**© 2026 Autorenta QA Team**
