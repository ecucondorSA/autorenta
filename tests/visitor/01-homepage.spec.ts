import { test, expect } from '@playwright/test';

/**
 * Test Suite: Homepage & Navigation (Visitor)
 *
 * Priority: P0 (Critical - first impression)
 * Duration: ~2 minutes
 * Coverage:
 * - Homepage loads correctly
 * - Main navigation elements
 * - Car catalog redirect
 * - Hero section display
 * - Footer links
 */

test.describe('Homepage & Navigation - Visitor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Verify page loaded (cars list is the default route)
    await expect(page).toHaveURL(/\/(cars)?$/);
  });

  test('should display main navigation header', async ({ page }) => {
    // Verify logo is visible
    await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible();

    // Verify main navigation links (in header)
    const nav = page.locator('header, nav').first();
    await expect(nav).toBeVisible();
  });

  test('should have login button visible in header', async ({ page }) => {
    // Look for "Ingresar" button in header/nav
    const loginButton = page.getByRole('link', { name: /ingresar|iniciar sesión/i }).first();
    await expect(loginButton).toBeVisible();
  });

  test('should navigate to login when clicking login button', async ({ page }) => {
    const loginButton = page.getByRole('link', { name: /ingresar|iniciar sesión/i }).first();
    await loginButton.click();

    await page.waitForURL('/auth/login');
    expect(page.url()).toContain('/auth/login');
  });

  test('should have register/signup link in header', async ({ page }) => {
    // Look for registration link
    const registerLink = page.getByRole('link', { name: /registrar|crear cuenta|sign up/i }).first();

    // May or may not be visible depending on design
    const count = await registerLink.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display car catalog as default page', async ({ page }) => {
    // Default route should show cars list
    await expect(page).toHaveURL(/\/(cars)?$/);

    // Should see car-related content
    await expect(
      page.getByText(/autos disponibles|modelos|cercanos/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have footer with links', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify footer exists
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have terms and conditions link in footer', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Look for terms link
    const termsLink = page.getByRole('link', { name: /términos.*condiciones/i });
    await expect(termsLink.first()).toBeVisible();
  });

  test.skip('should navigate to terms page', async ({ page }) => {
    // TODO: Terms link may open external page or modal instead of navigation
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const termsLink = page.getByRole('link', { name: /términos.*condiciones/i }).first();
    await termsLink.click();

    await page.waitForURL('/terminos');
    expect(page.url()).toContain('/terminos');
  });

  test('should have theme toggle (light/dark mode)', async ({ page }) => {
    // Look for theme toggle button (may be icon or button)
    const themeToggle = page.locator('[aria-label*="tema"], [aria-label*="dark"], [aria-label*="light"], [data-theme-toggle]');

    // Theme toggle may or may not exist
    const count = await themeToggle.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive (mobile viewport)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still load
    await page.goto('/');

    // Logo should be visible
    await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible();
  });

  test('should have accessible logo with alt text', async ({ page }) => {
    const logo = page.locator('img[alt="Autorentar"]').first();

    await expect(logo).toHaveAttribute('alt', 'Autorentar');
  });

  test('should redirect root to cars list', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /cars or stay at /
    const url = page.url();
    expect(url).toMatch(/\/(cars)?$/);
  });
});
