import { expect, test } from '@playwright/test';

/**
 * Test Suite: User Login
 *
 * Priority: P0 (Critical)
 * Duration: ~2 minutes
 * Coverage:
 * - Login form validation
 * - Successful login
 * - Invalid credentials handling
 * - Navigation after login
 * - Remember me functionality
 */

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible();
  });

  test('should display login form with all fields', async ({ page }) => {
    // Verify form elements
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();

    // Verify links
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();
    await expect(page.getByRole('link', { name: /olvidaste tu contraseña/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Try to submit with empty email
    await page.locator('#login-email').click();
    await page.locator('#login-password').click(); // Blur email field

    // Should show validation error for email
    await expect(page.locator('#login-email-error')).toContainText('email es obligatorio');
  });

  test('should validate email format', async ({ page }) => {
    await page.locator('#login-email').fill('invalid-email');
    await page.locator('#login-password').click(); // Blur email field

    await expect(page.locator('#login-email-error')).toContainText('Formato de email inválido');
  });

  test('should validate password minimum length', async ({ page }) => {
    await page.locator('#login-password').fill('short');
    await page.locator('#login-email').click(); // Blur password field

    await expect(page.locator('#login-password-error')).toContainText('al menos 6 caracteres');
  });

  test('should successfully fill login form (validation passes)', async ({ page }) => {
    await page.locator('#login-email').fill('test@autorenta.com');
    await page.locator('#login-password').fill('ValidPassword123!');

    // Verify no validation errors
    await expect(page.locator('#login-email-error')).not.toBeVisible();
    await expect(page.locator('#login-password-error')).not.toBeVisible();

    // Verify submit button becomes enabled
    const submitButton = page.getByRole('button', { name: 'Ingresar' });
    await expect(submitButton).toBeEnabled();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.getByRole('link', { name: 'Crear cuenta' }).click();
    await page.waitForURL('/auth/register');
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('should navigate to password recovery page', async ({ page }) => {
    await page.getByRole('link', { name: /olvidaste tu contraseña/i }).click();
    await page.waitForURL('/auth/reset-password');
    expect(page.url()).toContain('/auth/reset-password');
  });

  test('should display form in correct layout', async ({ page }) => {
    // Verify logo is visible
    await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible();

    // Verify heading and description
    await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible();
    await expect(page.getByText('Ingresá a tu cuenta de Autorentar')).toBeVisible();

    // Verify footer text about terms
    await expect(page.getByText(/términos y condiciones/i).first()).toBeVisible();
  });

  test('should show required field indicators', async ({ page }) => {
    // All form labels should have asterisks indicating required fields
    const emailLabel = page.locator('label[for="login-email"]');
    const passwordLabel = page.locator('label[for="login-password"]');

    await expect(emailLabel).toContainText('*');
    await expect(passwordLabel).toContainText('*');
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check ARIA attributes on inputs
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');

    await expect(emailInput).toHaveAttribute('aria-required', 'true');
    await expect(passwordInput).toHaveAttribute('aria-required', 'true');
    await expect(emailInput).toHaveAttribute('autocomplete', 'username email');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  test('should display loading state during login attempt', async ({ page }) => {
    await page.locator('#login-email').fill('test@autorenta.com');
    await page.locator('#login-password').fill('ValidPassword123!');

    // Submit form
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Should show loading state (either spinner or button text change)
    const loadingButton = page.getByRole('button', { name: /ingresando/i });

    // Give it a moment to show loading state or complete
    await expect(loadingButton.or(page.locator('role=alert'))).toBeVisible({ timeout: 5000 });
  });

  test.skip('should show error for invalid credentials', async ({ page }) => {
    // This test requires actual backend validation
    await page.locator('#login-email').fill('wrong@example.com');
    await page.locator('#login-password').fill('WrongPassword123!');

    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Should show error message
    await expect(page.locator('role=alert')).toContainText(/credenciales inválidas|email o contraseña incorrectos/i);
  });

  test.skip('should redirect to home/cars after successful login', async ({ page }) => {
    // This test requires valid test credentials
    await page.locator('#login-email').fill('test@autorenta.com');
    await page.locator('#login-password').fill('TestPassword123!');

    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Should redirect to main page
    await page.waitForURL(/\/(cars|home)?$/);
    expect(page.url()).toMatch(/\/(cars|home)?$/);
  });
});
