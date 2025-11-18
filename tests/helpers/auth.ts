import type { Page } from '@playwright/test';

/**
 * Helpers for UI authentication in E2E tests
 */
export async function login(page: Page, email = 'renter_test@example.com', password = 'password123') {
  // Navigate to login page and perform sign-in
  await page.goto('/auth/login');
  // Fallback: try common selectors used across app
  if (await page.locator('input[name="email"]').count()) {
    await page.fill('input[name="email"]', email);
  } else if (await page.locator('#email').count()) {
    await page.fill('#email', email);
  }

  if (await page.locator('input[name="password"]').count()) {
    await page.fill('input[name="password"]', password);
  } else if (await page.locator('#password').count()) {
    await page.fill('#password', password);
  }

  // Submit form (try generic button selectors)
  if (await page.locator('button[type="submit"]').count()) {
    await page.click('button[type="submit"]');
  } else {
    await page.click('button:has-text("Ingresar")');
  }

  // Wait for a profile indicator (non-blocking, short timeout)
  try {
    await page.waitForSelector('text=Mi perfil', { timeout: 5000 });
  } catch (e) {
    // ignore - some apps redirect differently; leave it to the test assertions
  }
}

export async function logout(page: Page) {
  // Best-effort logout helper
  if (await page.locator('button:has-text("Salir")').count()) {
    await page.click('button:has-text("Salir")');
  } else if (await page.locator('a:has-text("Cerrar sesión")').count()) {
    await page.click('a:has-text("Cerrar sesión")');
  }
}
