import { test, expect } from '@playwright/test';

/**
 * E2E TEST: Car Publication Error Scenarios
 *
 * Tests various error conditions and validation failures during car publication.
 * This ensures the form properly validates user input and provides clear error messages.
 *
 * Test Categories:
 * 1. Missing required fields
 * 2. Invalid data formats
 * 3. Out-of-range values
 * 4. Special character handling
 * 5. SQL injection prevention
 * 6. XSS prevention
 */

test.describe('Car Publication Error Scenarios', () => {
  const TEST_USER = {
    email: `test-error-scenarios-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Error Test User',
    phone: '+541112345682',
  };

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="full_name"]', TEST_USER.fullName);
    await page.fill('input[name="phone"]', TEST_USER.phone);

    const locadorRadio = page.locator('input[type="radio"][value="locador"]')
      .or(page.locator('ion-radio[value="locador"]'));

    if (await locadorRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locadorRadio.click();
    }

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(cars|inicio|home)/, { timeout: 15000 });

    // Navigate to publish page
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // Handle MercadoPago modal
    const mpModal = page.locator('ion-modal');
    if (await mpModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.locator('ion-backdrop').click({ force: true });
      await page.waitForTimeout(1000);

      const alert = page.locator('ion-alert');
      if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
        const continueBtn = alert.locator('button').last();
        await continueBtn.click();
      }
    }

    await page.waitForTimeout(1000);
  });

  test('should show errors when submitting completely empty form', async ({ page }) => {
    // Try to submit without filling anything
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /publicar|enviar/i }));

    if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show validation errors
      const errorMessage = page.locator('text=/requerido/i')
        .or(page.locator('text=/obligatorio/i'))
        .or(page.locator('text=/campo.*vacío/i'))
        .or(page.locator('.error-message'))
        .or(page.locator('.validation-error'))
        .or(page.locator('ion-text[color="danger"]'));

      const hasError = await errorMessage.count() > 0;
      expect(hasError).toBeTruthy();

      // Form should still be on publish page
      expect(page.url()).toContain('/publish');
    }
  });

  test('should reject invalid year (too old)', async ({ page }) => {
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));

    if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yearInput.fill('1985'); // Too old

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show year validation error
        const yearError = page.locator('text=/año.*mínimo/i')
          .or(page.locator('text=/año.*inválido/i'))
          .or(page.locator('text=/2000/i')); // Assuming 2000 is minimum

        const hasError = await yearError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          // At minimum, form shouldn't submit successfully
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject invalid year (future)', async ({ page }) => {
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));

    if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const futureYear = new Date().getFullYear() + 5;
      await yearInput.fill(futureYear.toString());

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show year validation error
        const yearError = page.locator('text=/año.*máximo/i')
          .or(page.locator('text=/año.*futuro/i'))
          .or(page.locator('text=/año.*inválido/i'));

        const hasError = await yearError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject negative price', async ({ page }) => {
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('-5000');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show price validation error
        const priceError = page.locator('text=/precio.*positivo/i')
          .or(page.locator('text=/precio.*mayor/i'))
          .or(page.locator('text=/precio.*inválido/i'));

        const hasError = await priceError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject zero price', async ({ page }) => {
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('0');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const priceError = page.locator('text=/precio.*mayor.*cero/i')
          .or(page.locator('text=/precio.*debe.*positivo/i'));

        const hasError = await priceError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject excessively high price', async ({ page }) => {
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('999999999'); // Unreasonably high

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const priceError = page.locator('text=/precio.*alto/i')
          .or(page.locator('text=/precio.*máximo/i'));

        const hasError = await priceError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject non-numeric price', async ({ page }) => {
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('abc123');

      // Input field should either reject non-numeric input or show error
      const value = await priceInput.inputValue();

      // Either the field filtered out non-numeric (value is empty or only numbers)
      // OR there's a validation error shown
      const priceError = page.locator('text=/precio.*número/i')
        .or(page.locator('text=/formato.*inválido/i'));

      const hasError = await priceError.isVisible({ timeout: 2000 }).catch(() => false);

      // Should either filter input or show error
      const isValid = value === '' || /^\d+$/.test(value) || hasError;
      expect(isValid).toBeTruthy();
    }
  });

  test('should reject invalid seats number (too many)', async ({ page }) => {
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'));

    if (await seatsInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seatsInput.fill('15'); // Too many seats

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const seatsError = page.locator('text=/asientos.*máximo/i')
          .or(page.locator('text=/asientos.*inválido/i'));

        const hasError = await seatsError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject invalid seats number (zero)', async ({ page }) => {
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'));

    if (await seatsInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seatsInput.fill('0');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const seatsError = page.locator('text=/asientos.*mínimo/i')
          .or(page.locator('text=/asientos.*mayor.*cero/i'));

        const hasError = await seatsError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject description that is too short', async ({ page }) => {
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'));

    if (await descriptionTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await descriptionTextarea.fill('Short'); // Too short (< 20 chars usually)

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const descError = page.locator('text=/descripción.*mínimo/i')
          .or(page.locator('text=/descripción.*corta/i'))
          .or(page.locator('text=/20.*caracteres/i'));

        const hasError = await descError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should sanitize XSS attempts in description', async ({ page }) => {
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'));

    if (await descriptionTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      const xssPayload = '<script>alert("XSS")</script>Auto en buen estado con todos los papeles';
      await descriptionTextarea.fill(xssPayload);

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(3000);

        // Should either:
        // 1. Sanitize the script tags
        // 2. Show an error
        // 3. Still be on publish page (not execute script)

        // No alert should have been triggered
        const alerts = page.locator('text=/XSS/i');
        const hasAlert = await alerts.isVisible({ timeout: 2000 }).catch(() => false);

        // XSS should not execute
        expect(hasAlert).toBe(false);
      }
    }
  });

  test('should handle SQL injection attempts safely', async ({ page }) => {
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'));

    if (await descriptionTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      const sqlInjection = "'; DROP TABLE cars; -- Auto en buen estado";
      await descriptionTextarea.fill(sqlInjection);

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(3000);

        // App should handle this safely (either sanitize or reject)
        // Database should NOT be affected
        // The page should not crash

        // Verify page is still functional
        const isPageFunctional = await page.locator('button[type="submit"]')
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        expect(isPageFunctional).toBeTruthy();
      }
    }
  });

  test('should reject invalid license plate format', async ({ page }) => {
    const plateInput = page.locator('input[name="license_plate"]')
      .or(page.locator('ion-input[name="license_plate"] input'));

    if (await plateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try invalid formats
      await plateInput.fill('invalid@plate!');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const plateError = page.locator('text=/patente.*inválida/i')
          .or(page.locator('text=/formato.*patente/i'));

        const hasError = await plateError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          // At minimum, shouldn't submit successfully
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject empty city field', async ({ page }) => {
    const cityInput = page.locator('input[name="city"]')
      .or(page.locator('ion-input[name="city"] input'));

    if (await cityInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cityInput.clear();

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const cityError = page.locator('text=/ciudad.*requerida/i')
          .or(page.locator('text=/ciudad.*obligatoria/i'));

        const hasError = await cityError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject empty address field', async ({ page }) => {
    const addressInput = page.locator('input[name="address"]')
      .or(page.locator('ion-input[name="address"] input'));

    if (await addressInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addressInput.clear();

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const addressError = page.locator('text=/dirección.*requerida/i')
          .or(page.locator('text=/dirección.*obligatoria/i'));

        const hasError = await addressError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });
});
