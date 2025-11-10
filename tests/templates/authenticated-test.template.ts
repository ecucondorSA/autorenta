import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * TEMPLATE: Authenticated User Test
 *
 * Use este template para tests que requieren autenticación:
 * - Features que solo están disponibles para usuarios logueados
 * - Acciones que requieren sesión activa
 *
 * Hay dos formas de autenticar:
 * 1. StorageState (sesión persistente) - MÁS RÁPIDO
 * 2. Login manual en beforeEach - MÁS CONFIABLE
 *
 * INSTRUCCIONES:
 * 1. Elegir método de autenticación (comentar/descomentar)
 * 2. Reemplazar [PLACEHOLDERS]
 */

// ========================================
// OPCIÓN 1: StorageState (Sesión Persistente)
// ========================================
// Descomentar esta línea para usar storageState:
// test.use({ storageState: 'tests/.auth/renter.json' });

// NOTA: Para crear el storageState, primero ejecuta un test de setup
// Ver: tests/fixtures/auth.setup.ts

test.describe('[FEATURE_NAME] - Authenticated User', () => {
  // ========================================
  // OPCIÓN 2: Login Manual
  // ========================================
  // Descomentar este beforeEach si NO usas storageState:
  /*
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Login manual
    await page.goto('/auth/login');

    const emailInput: Locator = page.locator('#login-email');
    const passwordInput: Locator = page.locator('#login-password');
    const loginButton: Locator = page.getByRole('button', { name: /entrar|login/i });

    // Usar usuario de test existente en DB
    await emailInput.fill('[TEST_USER_EMAIL]'); // Ej: 'test-renter@autorenta.com'
    await passwordInput.fill('[TEST_USER_PASSWORD]'); // Ej: 'TestPassword123!'
    await loginButton.click();

    // Esperar a que se complete el login
    await page.waitForURL(/\//, { timeout: 15000 });
    await page.waitForTimeout(2000); // Dar tiempo para que se establezca la sesión
  });
  */

  test.beforeEach(async ({ page }: { page: Page }) => {
    // Navegar a la página del feature
    await page.goto('[FEATURE_URL]'); // Ej: '/profile', '/my-bookings'
  });

  test('should verify user is authenticated', async ({ page }: { page: Page }) => {
    // Verificar que el menú de usuario está visible
    const userMenu: Locator = page.getByTestId('user-menu')
      .or(page.locator('[data-testid="user-menu"]'))
      .or(page.locator('a[href*="/profile"]'));

    await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display user-specific content', async ({ page }: { page: Page }) => {
    // Verificar contenido específico del usuario autenticado
    const userContent: Locator = page.locator('[USER_CONTENT_SELECTOR]');
    await expect(userContent).toBeVisible({ timeout: 5000 });

    // Ejemplo: Verificar nombre de usuario
    // const userName: Locator = page.locator('[USER_NAME_SELECTOR]');
    // await expect(userName).toContainText(/[EXPECTED_NAME]/i);
  });

  test('should allow user to perform authenticated action', async ({ page }: { page: Page }) => {
    // Ejemplo: Crear una reserva, editar perfil, etc.

    // 1. Encontrar el botón/link de acción
    const actionButton: Locator = page.getByRole('button', { name: /[ACTION_TEXT]/i })
      .or(page.locator('[ACTION_BUTTON_SELECTOR]'));

    await expect(actionButton).toBeVisible({ timeout: 5000 });
    await expect(actionButton).toBeEnabled({ timeout: 5000 });

    // 2. Click en la acción
    await actionButton.click();

    // 3. Verificar resultado (redirección, modal, mensaje de éxito, etc.)
    // Opción A: Verificar redirección
    // await page.waitForURL(/[RESULT_URL_PATTERN]/, { timeout: 10000 });

    // Opción B: Verificar modal
    // const modal: Locator = page.locator('[MODAL_SELECTOR]');
    // await expect(modal).toBeVisible({ timeout: 5000 });

    // Opción C: Verificar mensaje de éxito
    // const successMessage: Locator = page.locator('[SUCCESS_MESSAGE_SELECTOR]');
    // await expect(successMessage).toContainText(/[SUCCESS_TEXT]/i);
  });

  test('should redirect to login if session expires', async ({ page }: { page: Page }) => {
    // Este test simula expiración de sesión

    // 1. Limpiar sesión (localStorage/cookies)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 2. Intentar navegar a página protegida
    await page.goto('[PROTECTED_URL]');

    // 3. Verificar que redirige a login
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('should maintain session across navigation', async ({ page }: { page: Page }) => {
    // Navegar a diferentes páginas
    await page.goto('[PAGE_1_URL]');
    await page.waitForLoadState('domcontentloaded');

    await page.goto('[PAGE_2_URL]');
    await page.waitForLoadState('domcontentloaded');

    await page.goto('[PAGE_3_URL]');
    await page.waitForLoadState('domcontentloaded');

    // Verificar que sigue autenticado
    const userMenu: Locator = page.getByTestId('user-menu');
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }: { page: Page }) => {
    // 1. Encontrar botón de logout
    const logoutButton: Locator = page.getByRole('button', { name: /salir|logout|cerrar sesión/i })
      .or(page.locator('[LOGOUT_BUTTON_SELECTOR]'));

    // Puede estar en un menú desplegable
    const userMenu: Locator = page.getByTestId('user-menu');
    const menuVisible: boolean = await userMenu.isVisible().catch(() => false);

    if (menuVisible) {
      await userMenu.click();
      await page.waitForTimeout(500); // Esperar animación del menú
    }

    await expect(logoutButton).toBeVisible({ timeout: 5000 });

    // 2. Click en logout
    await logoutButton.click();

    // 3. Verificar que redirige a página pública o login
    await page.waitForURL(/\/|\/auth\/login/, { timeout: 10000 });

    // 4. Verificar que el menú de usuario ya no está visible
    const userMenuAfterLogout: boolean = await page.getByTestId('user-menu')
      .isVisible()
      .catch(() => false);

    expect(userMenuAfterLogout).toBe(false);
  });
});
