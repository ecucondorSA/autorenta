import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Auditoría de Accesibilidad (A11y)', () => {
  
  test('Login: Debe cumplir estándares WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/auth/login');
    // Esperar a que el formulario sea visible
    await page.waitForSelector('input', { state: 'visible', timeout: 15000 }).catch(() => {});

    const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    // Reportar violaciones de forma legible
    if (accessibilityScanResults.violations.length > 0) {
      console.log('⚠️ Violaciones A11y en Login:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Listado de Autos: Debe cumplir estándares WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/cars/list');
    // Esperar a que carguen las tarjetas
    await page.waitForSelector('[data-testid="car-card"]', { timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.log('⚠️ Violaciones A11y en Listado de Autos:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
