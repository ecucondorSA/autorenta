import { expect, test } from '@playwright/test';

test('Smoke Test: Verificar Autenticación Global', async ({ page, baseURL }, testInfo) => {
  console.log(`🔍 Base URL resolved: '${baseURL}'`);
  console.log(`🔍 Project Base URL: '${testInfo.project.use.baseURL}'`);

  // Navegar a la home
  await page.goto('/');

  // Verificar que NO estamos en login
  await expect(page).not.toHaveURL(/.*login.*/);

  // Verificar indicador de usuario logueado (ajustar selector según app real)
  // Basado en complete-booking-flow.spec.ts: data-testid="user-menu"
  const userMenu = page.getByTestId('user-menu')
    .or(page.locator('[data-testid="user-menu"]'))
    .or(page.locator('a[routerLink="/profile"]'));

  await expect(userMenu.first()).toBeAttached({ timeout: 10000 });
  console.log('✅ Autenticación verificada correctamente');
});
