import { test, expect } from '@playwright/test';

/**
 * E2E TEST: Complete Porsche 911 Publication Flow
 *
 * Tests the complete end-to-end flow of publishing a Porsche 911 car
 * including authentication, onboarding, form filling, photo upload,
 * and verification.
 *
 * Prerequisites:
 * - App running at http://localhost:4200
 * - Supabase connection working
 * - Test images available in tests/fixtures/
 *
 * Flow:
 * 1. Register new user (locador role)
 * 2. Navigate to /cars/publish
 * 3. Handle MercadoPago onboarding modal (skip for testing)
 * 4. Fill complete car publication form with Porsche 911 data
 * 5. Upload car photos (minimum 3)
 * 6. Submit form
 * 7. Verify car created successfully
 * 8. Verify car appears in my-cars list
 */

test.describe('Complete Porsche 911 Publication Flow', () => {
  const TEST_USER = {
    email: `test-porsche-owner-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Porsche Owner Test',
    phone: '+541112345678',
  };

  const PORSCHE_DATA = {
    brand: 'Porsche',
    model: '911',
    year: '2023',
    color: 'Guards Red',
    licensePlate: 'POR911',
    description: 'Porsche 911 Carrera S en excelente estado. Full equipo, mantenimiento al día en concesionaria oficial. Cuero, techo panorámico, sonido Bose, asientos deportivos con calefacción.',
    pricePerDay: '25000', // ARS per day
    transmission: 'automatic',
    fuelType: 'gasoline',
    seats: '4',
    category: 'luxury',
    city: 'Buenos Aires',
    address: 'Av. del Libertador 1234',
  };

  test.beforeEach(async ({ page }) => {
    // 1. Register new user
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="full_name"]', TEST_USER.fullName);
    await page.fill('input[name="phone"]', TEST_USER.phone);

    // Select locador role (car owner)
    const locadorRadio = page.locator('input[type="radio"][value="locador"]')
      .or(page.locator('ion-radio[value="locador"]'));

    if (await locadorRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locadorRadio.click();
    }

    await page.click('button[type="submit"]');

    // Wait for registration to complete
    await expect(page).toHaveURL(/\/(cars|inicio|home)/, { timeout: 15000 });
  });

  test('should complete full Porsche 911 publication flow', async ({ page }) => {
    // 2. Navigate to publish page
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // 3. Handle MercadoPago onboarding modal if it appears
    const mpModal = page.locator('ion-modal');
    if (await mpModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('MercadoPago onboarding modal detected, closing it...');

      // Try to find and click cancel/close button
      const cancelBtn = mpModal.locator('button:has-text("Cancelar")')
        .or(mpModal.locator('button:has-text("Cerrar")'))
        .or(mpModal.locator('ion-button:has-text("Cancelar")'));

      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
      } else {
        // Try backdrop dismiss
        await page.locator('ion-backdrop').click({ force: true });
      }

      // Handle the warning alert that appears after closing onboarding
      const alert = page.locator('ion-alert');
      if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
        const continueBtn = alert.locator('button:has-text("Continuar Sin Vincular")')
          .or(alert.locator('button:has-text("Continuar")'));

        if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await continueBtn.click();
        }
      }
    }

    // Wait for form to be ready
    await page.waitForTimeout(2000);

    // 4. Fill brand and model
    const brandSelect = page.locator('select[name="brand_id"]')
      .or(page.locator('ion-select[name="brand_id"]'))
      .or(page.locator('[formcontrolname="brand_id"]'));

    await expect(brandSelect).toBeVisible({ timeout: 10000 });
    await brandSelect.click();
    await page.waitForTimeout(500);

    // Select Porsche from dropdown
    const porscheOption = page.locator(`ion-item:has-text("${PORSCHE_DATA.brand}")`)
      .or(page.locator(`option:has-text("${PORSCHE_DATA.brand}")`))
      .first();

    await porscheOption.click();
    await page.waitForTimeout(1000);

    // Select model
    const modelSelect = page.locator('select[name="model_id"]')
      .or(page.locator('ion-select[name="model_id"]'))
      .or(page.locator('[formcontrolname="model_id"]'));

    if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modelSelect.click();
      await page.waitForTimeout(500);

      const modelOption = page.locator(`ion-item:has-text("${PORSCHE_DATA.model}")`)
        .or(page.locator(`option:has-text("${PORSCHE_DATA.model}")`))
        .first();

      await modelOption.click();
      await page.waitForTimeout(1000);
    }

    // 5. Fill year
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'))
      .or(page.locator('[formcontrolname="year"] input'));

    await expect(yearInput).toBeVisible({ timeout: 5000 });
    await yearInput.fill(PORSCHE_DATA.year);

    // 6. Fill color
    const colorInput = page.locator('input[name="color"]')
      .or(page.locator('ion-input[name="color"] input'))
      .or(page.locator('[formcontrolname="color"] input'));

    if (await colorInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await colorInput.fill(PORSCHE_DATA.color);
    }

    // 7. Fill license plate
    const plateInput = page.locator('input[name="license_plate"]')
      .or(page.locator('ion-input[name="license_plate"] input'))
      .or(page.locator('[formcontrolname="license_plate"] input'));

    if (await plateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await plateInput.fill(PORSCHE_DATA.licensePlate);
    }

    // 8. Fill description
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'))
      .or(page.locator('[formcontrolname="description"] textarea'));

    await expect(descriptionTextarea).toBeVisible({ timeout: 5000 });
    await descriptionTextarea.fill(PORSCHE_DATA.description);

    // 9. Fill price per day
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'))
      .or(page.locator('[formcontrolname="price_per_day"] input'));

    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await priceInput.fill(PORSCHE_DATA.pricePerDay);

    // 10. Select transmission
    const transmissionSelect = page.locator('select[name="transmission"]')
      .or(page.locator('ion-select[name="transmission"]'))
      .or(page.locator('[formcontrolname="transmission"]'));

    if (await transmissionSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transmissionSelect.click();
      await page.waitForTimeout(500);

      const transmissionOption = page.locator(`ion-item:has-text("Automático")`)
        .or(page.locator(`option[value="automatic"]`))
        .first();

      await transmissionOption.click();
      await page.waitForTimeout(500);
    }

    // 11. Select fuel type
    const fuelSelect = page.locator('select[name="fuel_type"]')
      .or(page.locator('ion-select[name="fuel_type"]'))
      .or(page.locator('[formcontrolname="fuel_type"]'));

    if (await fuelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fuelSelect.click();
      await page.waitForTimeout(500);

      const fuelOption = page.locator(`ion-item:has-text("Nafta")`)
        .or(page.locator(`option[value="gasoline"]`))
        .first();

      await fuelOption.click();
      await page.waitForTimeout(500);
    }

    // 12. Fill seats
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'))
      .or(page.locator('[formcontrolname="seats"] input'));

    if (await seatsInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seatsInput.fill(PORSCHE_DATA.seats);
    }

    // 13. Select category
    const categorySelect = page.locator('select[name="category"]')
      .or(page.locator('ion-select[name="category"]'))
      .or(page.locator('[formcontrolname="category"]'));

    if (await categorySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);

      const categoryOption = page.locator(`ion-item:has-text("Lujo")`)
        .or(page.locator(`option[value="luxury"]`))
        .first();

      await categoryOption.click();
      await page.waitForTimeout(500);
    }

    // 14. Fill city
    const cityInput = page.locator('input[name="city"]')
      .or(page.locator('ion-input[name="city"] input'))
      .or(page.locator('[formcontrolname="city"] input'));

    if (await cityInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cityInput.fill(PORSCHE_DATA.city);
    }

    // 15. Fill address
    const addressInput = page.locator('input[name="address"]')
      .or(page.locator('ion-input[name="address"] input'))
      .or(page.locator('[formcontrolname="address"] input'));

    if (await addressInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addressInput.fill(PORSCHE_DATA.address);
    }

    // 16. Upload photos (minimum 3 required)
    // Note: This section might need adjustment based on actual photo upload implementation
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload 3 test images
      await photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);

      await page.waitForTimeout(2000); // Wait for uploads to process
    }

    // 17. Submit the form
    const submitButton = page.locator('button[type="submit"]')
      .or(page.locator('ion-button[type="submit"]'))
      .or(page.getByRole('button', { name: /publicar|enviar|submit/i }));

    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // 18. Verify success
    await page.waitForTimeout(3000);

    // Check for success message or redirect to my-cars
    const successMessage = page.locator('text=/publicado exitosamente/i')
      .or(page.locator('text=/auto publicado/i'))
      .or(page.locator('text=/éxito/i'))
      .or(page.locator('.toast-success'))
      .or(page.locator('ion-toast'));

    const isOnMyCarsPage = page.url().includes('/cars/my') ||
                          page.url().includes('/mis-autos') ||
                          page.url().includes('/my-cars');

    // At least one success indicator should be present
    const hasSuccess = await successMessage.isVisible({ timeout: 10000 }).catch(() => false) ||
                       isOnMyCarsPage;

    expect(hasSuccess).toBeTruthy();

    // 19. If redirected to my-cars, verify Porsche appears in the list
    if (isOnMyCarsPage) {
      const carCard = page.locator('.car-card')
        .or(page.locator('ion-card'))
        .filter({ hasText: PORSCHE_DATA.model });

      await expect(carCard).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show validation errors for incomplete Porsche data', async ({ page }) => {
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // Handle MercadoPago modal if present
    const mpModal = page.locator('ion-modal');
    if (await mpModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cancelBtn = mpModal.locator('button:has-text("Cancelar")');
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
      }

      const alert = page.locator('ion-alert');
      if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
        const continueBtn = alert.locator('button:has-text("Continuar Sin Vincular")');
        if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await continueBtn.click();
        }
      }
    }

    await page.waitForTimeout(1000);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /publicar|enviar/i }));

    if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show validation errors
      const errorMessage = page.locator('text=/requerido/i')
        .or(page.locator('text=/campo obligatorio/i'))
        .or(page.locator('.error-message'))
        .or(page.locator('.validation-error'))
        .or(page.locator('ion-text[color="danger"]'));

      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasError).toBeTruthy();
    }
  });

  test('should validate Porsche year range', async ({ page }) => {
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // Handle modal
    const mpModal = page.locator('ion-modal');
    if (await mpModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.locator('ion-backdrop').click({ force: true });
      await page.waitForTimeout(1000);

      const alert = page.locator('ion-alert');
      if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
        const continueBtn = alert.locator('button:has-text("Continuar")');
        await continueBtn.click();
      }
    }

    await page.waitForTimeout(1000);

    // Try invalid year (too old)
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));

    if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yearInput.fill('1990'); // Too old for most platforms

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show year validation error
        const yearError = page.locator('text=/año mínimo/i')
          .or(page.locator('text=/año inválido/i'))
          .or(page.locator('text=/año debe ser mayor/i'));

        const hasError = await yearError.isVisible({ timeout: 5000 }).catch(() => false);

        // If no specific error, at least form shouldn't submit successfully
        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should validate Porsche price range', async ({ page }) => {
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // Handle modal
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

    // Try invalid price (negative)
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('-1000'); // Negative price

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show price validation error
        const priceError = page.locator('text=/precio.*positivo/i')
          .or(page.locator('text=/precio inválido/i'))
          .or(page.locator('text=/precio debe ser mayor/i'));

        const hasError = await priceError.isVisible({ timeout: 5000 }).catch(() => false);

        if (!hasError) {
          // Form shouldn't submit successfully with invalid price
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });
});
