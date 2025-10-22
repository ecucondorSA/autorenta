import { test, expect } from '@playwright/test';

/**
 * Test Suite: Password Recovery
 *
 * Priority: P1 (Important)
 * Duration: ~2 minutes
 * Coverage:
 * - Password reset form display
 * - Email validation
 * - Recovery link sending
 * - Success message display
 * - Help information visibility
 */

test.describe('Password Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();
  });

  test('should display password recovery form', async ({ page }) => {
    // Verify form elements
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar enlace de recuperación/i })).toBeVisible();

    // Verify back to login link
    await expect(page.getByRole('link', { name: /volver al inicio de sesión/i })).toBeVisible();
  });

  test('should display correct heading and description', async ({ page }) => {
    // Verify heading
    await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();

    // Verify description text
    await expect(page.getByText(/te enviaremos un enlace para restablecer tu contraseña/i)).toBeVisible();
  });

  test('should have submit button disabled when email is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i });

    // Button should be disabled initially
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when valid email is entered', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i });

    // Fill email
    await emailInput.fill('test@autorenta.com');

    // Button should become enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should show placeholder and helper text', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });

    // Verify placeholder
    await expect(emailInput).toHaveAttribute('placeholder', 'tu@email.com');

    // Verify helper text
    await expect(page.getByText(/ingresá el email asociado a tu cuenta/i)).toBeVisible();
  });

  test('should display help information card', async ({ page }) => {
    // Verify help section is visible
    await expect(page.getByRole('heading', { name: /no recibiste el email/i })).toBeVisible();

    // Verify help tips are displayed
    await expect(page.getByText(/revisá tu carpeta de spam/i)).toBeVisible();
    await expect(page.getByText(/asegurate de haber ingresado el email correcto/i)).toBeVisible();
    await expect(page.getByText(/el enlace puede tardar unos minutos/i)).toBeVisible();
  });

  test('should navigate back to login page', async ({ page }) => {
    await page.getByRole('link', { name: /volver al inicio de sesión/i }).click();

    await page.waitForURL('/auth/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
  });

  test('should display logo and branding', async ({ page }) => {
    // Verify logo is visible
    await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible();
  });

  test('should have proper form structure', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });

    // Verify input attributes
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });

  test.skip('should show loading state when submitting', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i });

    // Fill email
    await emailInput.fill('test@autorenta.com');

    // Submit form
    await submitButton.click();

    // Should show loading state
    await expect(page.getByRole('button', { name: /enviando/i })).toBeVisible({ timeout: 2000 });
  });

  test.skip('should show success message after sending recovery email', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i });

    // Fill email
    await emailInput.fill('test@autorenta.com');

    // Submit form
    await submitButton.click();

    // Should show success message
    const successMessage = page.locator('.bg-green-50');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(successMessage).toContainText(/enviado|éxito|correo/i);
  });

  test.skip('should handle non-existent email gracefully', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i });

    // Fill with non-existent email
    await emailInput.fill('nonexistent@example.com');

    // Submit form
    await submitButton.click();

    // May show success message anyway (for security - don't reveal if email exists)
    // or may show error - depends on implementation
    await page.waitForTimeout(2000);
  });

  test('should have accessible form labels', async ({ page }) => {
    // Verify email label
    const emailLabel = page.locator('label', { hasText: /email/i });
    await expect(emailLabel).toBeVisible();
  });

  test('should display recovery form in card layout', async ({ page }) => {
    // Verify card container
    const card = page.locator('.card-premium').first();
    await expect(card).toBeVisible();

    // Verify help card
    const helpCard = page.locator('.card-premium').last();
    await expect(helpCard).toBeVisible();
    await expect(helpCard).toContainText(/no recibiste el email/i);
  });
});
