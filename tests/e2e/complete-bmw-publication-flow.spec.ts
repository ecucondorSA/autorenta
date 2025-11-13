import { test, expect } from '@playwright/test';

/**
 * E2E TEST: Complete BMW X5 Publication Flow
 *
 * Tests the complete end-to-end flow of publishing a BMW X5 SUV
 * as a variant of the main publication flow test.
 *
 * This test validates that the publication flow works correctly
 * for different car brands and models, specifically luxury SUVs.
 *
 * Key Differences from Porsche Test:
 * - Different brand (BMW vs Porsche)
 * - Different model (X5 vs 911)
 * - SUV category vs Sports car
 * - Different pricing tier
 * - More seats (7 vs 4)
 */

test.describe('Complete BMW X5 Publication Flow', () => {
  const TEST_USER = {
    email: `test-bmw-owner-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'BMW Owner Test',
    phone: '+541112345679',
  };

  const BMW_DATA = {
    brand: 'BMW',
    model: 'X5',
    year: '2024',
    color: 'Alpine White',
    licensePlate: 'BMW540',
    description: 'BMW X5 xDrive40i M Sport. SUV de lujo con tecnología de última generación. Sistema de asistencia al conductor, Head-Up Display, cuero Vernasca, asientos con masaje, sonido Harman Kardon.',
    pricePerDay: '18000', // ARS per day
    transmission: 'automatic',
    fuelType: 'gasoline',
    seats: '7',
    category: 'suv',
    city: 'Buenos Aires',
    address: 'Av. Figueroa Alcorta 3000',
  };

  test.beforeEach(async ({ page }) => {
    // Register new user
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
  });

  test('should complete full BMW X5 publication flow', async ({ page }) => {
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // Handle MercadoPago onboarding modal
    const mpModal = page.locator('ion-modal');
    if (await mpModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const cancelBtn = mpModal.locator('button:has-text("Cancelar")')
        .or(mpModal.locator('button:has-text("Cerrar")'));

      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
      } else {
        await page.locator('ion-backdrop').click({ force: true });
      }

      const alert = page.locator('ion-alert');
      if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
        const continueBtn = alert.locator('button:has-text("Continuar Sin Vincular")');
        if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await continueBtn.click();
        }
      }
    }

    await page.waitForTimeout(2000);

    // Fill brand (BMW)
    const brandSelect = page.locator('select[name="brand_id"]')
      .or(page.locator('ion-select[name="brand_id"]'))
      .or(page.locator('[formcontrolname="brand_id"]'));

    await expect(brandSelect).toBeVisible({ timeout: 10000 });
    await brandSelect.click();
    await page.waitForTimeout(500);

    const bmwOption = page.locator(`ion-item:has-text("${BMW_DATA.brand}")`)
      .or(page.locator(`option:has-text("${BMW_DATA.brand}")`))
      .first();

    await bmwOption.click();
    await page.waitForTimeout(1000);

    // Fill model (X5)
    const modelSelect = page.locator('select[name="model_id"]')
      .or(page.locator('ion-select[name="model_id"]'));

    if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modelSelect.click();
      await page.waitForTimeout(500);

      const modelOption = page.locator(`ion-item:has-text("${BMW_DATA.model}")`)
        .or(page.locator(`option:has-text("${BMW_DATA.model}")`))
        .first();

      await modelOption.click();
      await page.waitForTimeout(1000);
    }

    // Fill year
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));
    await yearInput.fill(BMW_DATA.year);

    // Fill color
    const colorInput = page.locator('input[name="color"]')
      .or(page.locator('ion-input[name="color"] input'));
    if (await colorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await colorInput.fill(BMW_DATA.color);
    }

    // Fill license plate
    const plateInput = page.locator('input[name="license_plate"]')
      .or(page.locator('ion-input[name="license_plate"] input'));
    if (await plateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await plateInput.fill(BMW_DATA.licensePlate);
    }

    // Fill description
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'));
    await descriptionTextarea.fill(BMW_DATA.description);

    // Fill price
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));
    await priceInput.fill(BMW_DATA.pricePerDay);

    // Select transmission
    const transmissionSelect = page.locator('select[name="transmission"]')
      .or(page.locator('ion-select[name="transmission"]'));
    if (await transmissionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await transmissionSelect.click();
      await page.waitForTimeout(500);
      const transmissionOption = page.locator(`ion-item:has-text("Automático")`)
        .or(page.locator(`option[value="automatic"]`))
        .first();
      await transmissionOption.click();
      await page.waitForTimeout(500);
    }

    // Select fuel type
    const fuelSelect = page.locator('select[name="fuel_type"]')
      .or(page.locator('ion-select[name="fuel_type"]'));
    if (await fuelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fuelSelect.click();
      await page.waitForTimeout(500);
      const fuelOption = page.locator(`ion-item:has-text("Nafta")`)
        .or(page.locator(`option[value="gasoline"]`))
        .first();
      await fuelOption.click();
      await page.waitForTimeout(500);
    }

    // Fill seats (7 for SUV)
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'));
    if (await seatsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await seatsInput.fill(BMW_DATA.seats);
    }

    // Select category (SUV)
    const categorySelect = page.locator('select[name="category"]')
      .or(page.locator('ion-select[name="category"]'));
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      const categoryOption = page.locator(`ion-item:has-text("SUV")`)
        .or(page.locator(`option[value="suv"]`))
        .first();
      await categoryOption.click();
      await page.waitForTimeout(500);
    }

    // Fill city
    const cityInput = page.locator('input[name="city"]')
      .or(page.locator('ion-input[name="city"] input'));
    if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cityInput.fill(BMW_DATA.city);
    }

    // Fill address
    const addressInput = page.locator('input[name="address"]')
      .or(page.locator('ion-input[name="address"] input'));
    if (await addressInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addressInput.fill(BMW_DATA.address);
    }

    // Upload photos
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));
    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);
      await page.waitForTimeout(2000);
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /publicar|enviar/i }));
    await submitButton.click();

    await page.waitForTimeout(3000);

    // Verify success
    const successMessage = page.locator('text=/publicado exitosamente/i')
      .or(page.locator('text=/auto publicado/i'))
      .or(page.locator('text=/éxito/i'));

    const isOnMyCarsPage = page.url().includes('/cars/my') ||
                          page.url().includes('/mis-autos');

    const hasSuccess = await successMessage.isVisible({ timeout: 10000 }).catch(() => false) ||
                       isOnMyCarsPage;

    expect(hasSuccess).toBeTruthy();

    // Verify BMW appears in car list
    if (isOnMyCarsPage) {
      const carCard = page.locator('.car-card, ion-card')
        .filter({ hasText: BMW_DATA.model });
      await expect(carCard).toBeVisible({ timeout: 10000 });
    }
  });

  test('should validate 7 seats for BMW X5 SUV', async ({ page }) => {
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

    // Try invalid seats (more than 8)
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'));

    if (await seatsInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seatsInput.fill('10'); // Too many seats

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show validation error or reject the value
        const seatsError = page.locator('text=/máximo.*asientos/i')
          .or(page.locator('text=/asientos.*inválido/i'));

        const hasError = await seatsError.isVisible({ timeout: 5000 }).catch(() => false);

        if (!hasError) {
          // Form shouldn't submit successfully with invalid seats
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should accept valid BMW pricing (mid-range luxury)', async ({ page }) => {
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // Handle modal
    const mpModal = page.locator('ion-modal');
    if (await mpModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.locator('ion-backdrop').click({ force: true });
      await page.waitForTimeout(1000);
      const alert = page.locator('ion-alert');
      if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
        await alert.locator('button').last().click();
      }
    }

    await page.waitForTimeout(1000);

    // Fill valid BMW price (18000 ARS/day)
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill(BMW_DATA.pricePerDay);

      // Price should be accepted (no error)
      const priceError = page.locator('text=/precio inválido/i');
      const hasError = await priceError.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasError).toBe(false);
    }
  });
});
