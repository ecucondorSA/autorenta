# Plan de Mejoras para E2E Testing (Playwright)

He analizado tu setup de Playwright y, aunque tienes una base sólida (autenticación reutilizable, servidor local), hay 4 áreas clave para llevar tus tests al nivel "Profesional/Empresarial":

## 1. Accesibilidad (A11y) Automatizada
*   **Problema:** Tu app podría ser inutilizable para personas con discapacidad visual o motora sin que lo sepas.
*   **Solución:** Integrar `@axe-core/playwright`.
*   **Cómo:** Inyectar chequeos automáticos en tus tests existentes.
*   **Impacto:** Detecta bajo contraste, etiquetas faltantes y problemas ARIA automáticamente.

## 2. Page Object Model (POM)
*   **Problema:** `search-cars.spec.ts` tiene selectores (`[data-testid="car-card"]`) y lógica mezclados. Si cambia el UI, tienes que arreglar 20 tests.
*   **Solución:** Crear clases `SearchPage` que encapsulen la lógica.
*   **Ejemplo:**
    ```typescript
    // Antes
    await page.fill('[data-testid="search-input"]', 'Toyota');
    // Después
    await searchPage.buscarVehiculo('Toyota');
    ```

## 3. Mocking de Red (Network Interception)
*   **Problema:** Tus tests dependen de que la API de Supabase responda rápido y tenga datos específicos ("Toyota"). Si la red falla o borran el auto, el test falla (flaky).
*   **Solución:** Usar `page.route()` para interceptar requests.
*   **Beneficio:** Tests instantáneos y deterministas. Puedes probar errores (500) o listas vacías sin tocar la BD.

## 4. Testing Móvil (Responsive)
*   **Problema:** Solo pruebas en Desktop Chrome. Tu usuarios seguramente usan móviles.
*   **Solución:** Agregar proyectos 'Mobile Chrome' y 'Mobile Safari' en `playwright.config.ts`.
*   **Impacto:** Asegura que el menú hamburguesa y los filtros funcionen en pantallas chicas.

---

### ¿Por cuál quieres empezar?
Recomiendo **1. Accesibilidad** (es rápido y de alto valor) o **4. Móvil** (crítico para tu negocio de renta).
