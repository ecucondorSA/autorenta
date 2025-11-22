import { test, expect, Page } from '@playwright/test';
import { SEED_USERS } from '../helpers/test-data';

/**
 * Smoke E2E: verifica que las páginas clave de la plataforma cargan y muestran
 * los elementos básicos. Esto da una señal rápida de salud del frontend
 * sin depender de flujos largos ni datos frágiles.
 *
 * Cubre:
 * - Home / landing de buscador
 * - Catálogo con mapa y cards de autos
 * - Wallet (requiere sesión)
 * - Perfil (requiere sesión)
 */

const FALLBACK_RENTER = {
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!',
};

async function ensureAuthenticated(page: Page): Promise<void> {
  // Si ya estamos autenticados, evitamos reloguear
  const profileLink = page.locator('a[href="/profile"], a[routerLink="/profile"], [data-testid="user-menu"]');
  const loginLink = page.locator('a[href*="/auth"], a[routerLink*="auth"], button:has-text("Login"), button:has-text("Entrar")');

  const onLoginPage = page.url().includes('/auth');
  const profileVisible = await profileLink.first().isVisible({ timeout: 2000 }).catch(() => false);
  const loginVisible = await loginLink.first().isVisible({ timeout: 2000 }).catch(() => false);

  if (profileVisible && !onLoginPage) return;

  // Navegar a login explícitamente
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');

  const email = SEED_USERS?.renter?.email ?? FALLBACK_RENTER.email;
  const password = SEED_USERS?.renter?.password ?? FALLBACK_RENTER.password;

  const emailInput = page.locator('input[type="email"], input[name="email"], input[formcontrolname="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[formcontrolname="password"]').first();

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submit = page.getByRole('button', { name: /iniciar sesión|entrar|login|continuar/i }).first().or(page.locator('button[type="submit"]'));
  await submit.click();

  // Esperar redirección a una ruta autenticada
  await page.waitForURL(/(cars|wallet|profile|bookings|dashboard)/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Platform smoke', () => {
  test('Home carga y muestra CTA principal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hero = page.getByRole('heading', { name: /auto?renta|alquil/i });
    await expect(hero).toBeVisible();

    const searchBtn = page.getByRole('button', { name: /buscar|encontrar|explorar/i }).first();
    await expect(searchBtn).toBeVisible();
  });

  test('Catálogo muestra mapa y al menos 1 card de auto', async ({ page }) => {
    await page.goto('/cars');
    await page.waitForLoadState('domcontentloaded');

    const map = page.locator('#map-container, app-map, [data-testid="map"]');
    await expect(map.first()).toBeVisible({ timeout: 15000 });

    const carCards = page.locator('[data-car-id], app-car-card, [data-testid="car-card"]');
    await expect(carCards.first()).toBeVisible({ timeout: 20000 });
  });

  test('Wallet abre y muestra saldo visible', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/wallet');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading', { name: /wallet|saldo|mi wallet/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    const balance = page.getByText(/USD|ARS/).first();
    await expect(balance).toBeVisible({ timeout: 10000 });
  });

  test('Perfil carga con datos básicos', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    const title = page.getByRole('heading', { name: /perfil|mi cuenta|configuración/i }).first();
    await expect(title).toBeVisible({ timeout: 10000 });

    const emailField = page.locator('text=@').or(page.locator('[data-testid="profile-email"]'));
    await expect(emailField.first()).toBeVisible({ timeout: 10000 });
  });
});
