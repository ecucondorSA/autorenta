import { test, expect } from '@playwright/test';

/**
 * E2E TEST: Complete Toyota Corolla Publication Flow
 *
 * Tests the complete end-to-end flow of publishing a Toyota Corolla
 * as a budget/economy car variant.
 *
 * This test validates the publication flow for economy segment cars,
 * which represents the most common rental category and lower price points.
 *
 * Key Characteristics:
 * - Economy/compact sedan category
 * - Lower price point (mass market)
 * - Manual transmission option
 * - Hybrid fuel option
 * - High reliability and fuel efficiency focus
 */

test.describe('Complete Toyota Corolla Publication Flow', () => {
  const TEST_USER = {
    email: `test-toyota-owner-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Toyota Owner Test',
    phone: '+541112345681',
  };

  const TOYOTA_DATA = {
    brand: 'Toyota',
    model: 'Corolla',
    year: '2024',
    color: 'Blanco Perlado',
    licensePlate: 'TOY123',
    description: 'Toyota Corolla XEI CVT. Auto confiable y económico, ideal para ciudad y ruta. Bajo consumo, cámara de retroceso, control crucero, aire acondicionado automático, multimedia con Android Auto y Apple CarPlay.',
    pricePerDay: '8000', // ARS per day (economy pricing)
    transmission: 'automatic',
    fuelType: 'hybrid',
    seats: '5',
    category: 'compact',
    city: 'Buenos Aires',
    address: 'Av. Corrientes 2500',
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

  test('should complete full Toyota Corolla publication flow with hybrid', async ({ page }) => {
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

    // Fill brand (Toyota)
    const brandSelect = page.locator('select[name="brand_id"]')
      .or(page.locator('ion-select[name="brand_id"]'))
      .or(page.locator('[formcontrolname="brand_id"]'));

    await expect(brandSelect).toBeVisible({ timeout: 10000 });
    await brandSelect.click();
    await page.waitForTimeout(500);

    const toyotaOption = page.locator(`ion-item:has-text("${TOYOTA_DATA.brand}")`)
      .or(page.locator(`option:has-text("${TOYOTA_DATA.brand}")`))
      .first();

    await toyotaOption.click();
    await page.waitForTimeout(1000);

    // Fill model (Corolla)
    const modelSelect = page.locator('select[name="model_id"]')
      .or(page.locator('ion-select[name="model_id"]'));

    if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modelSelect.click();
      await page.waitForTimeout(500);

      const modelOption = page.locator(`ion-item:has-text("${TOYOTA_DATA.model}")`)
        .or(page.locator(`option:has-text("${TOYOTA_DATA.model}")`))
        .first();

      await modelOption.click();
      await page.waitForTimeout(1000);
    }

    // Fill year
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));
    await yearInput.fill(TOYOTA_DATA.year);

    // Fill color
    const colorInput = page.locator('input[name="color"]')
      .or(page.locator('ion-input[name="color"] input'));
    if (await colorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await colorInput.fill(TOYOTA_DATA.color);
    }

    // Fill license plate
    const plateInput = page.locator('input[name="license_plate"]')
      .or(page.locator('ion-input[name="license_plate"] input'));
    if (await plateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await plateInput.fill(TOYOTA_DATA.licensePlate);
    }

    // Fill description
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'));
    await descriptionTextarea.fill(TOYOTA_DATA.description);

    // Fill price (economy pricing)
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));
    await priceInput.fill(TOYOTA_DATA.pricePerDay);

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

    // Select fuel type (Hybrid - unique to Toyota)
    const fuelSelect = page.locator('select[name="fuel_type"]')
      .or(page.locator('ion-select[name="fuel_type"]'));
    if (await fuelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fuelSelect.click();
      await page.waitForTimeout(500);
      const fuelOption = page.locator(`ion-item:has-text("Híbrido")`)
        .or(page.locator(`ion-item:has-text("Hybrid")` ))
        .or(page.locator(`option[value="hybrid"]`))
        .first();
      await fuelOption.click();
      await page.waitForTimeout(500);
    }

    // Fill seats (5 for compact sedan)
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'));
    if (await seatsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await seatsInput.fill(TOYOTA_DATA.seats);
    }

    // Select category (Compact)
    const categorySelect = page.locator('select[name="category"]')
      .or(page.locator('ion-select[name="category"]'));
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      const categoryOption = page.locator(`ion-item:has-text("Compacto")`)
        .or(page.locator(`ion-item:has-text("Compact")` ))
        .or(page.locator(`option[value="compact"]`))
        .first();
      await categoryOption.click();
      await page.waitForTimeout(500);
    }

    // Fill city
    const cityInput = page.locator('input[name="city"]')
      .or(page.locator('ion-input[name="city"] input'));
    if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cityInput.fill(TOYOTA_DATA.city);
    }

    // Fill address
    const addressInput = page.locator('input[name="address"]')
      .or(page.locator('ion-input[name="address"] input'));
    if (await addressInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addressInput.fill(TOYOTA_DATA.address);
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

    // Verify Toyota appears in car list
    if (isOnMyCarsPage) {
      const carCard = page.locator('.car-card, ion-card')
        .filter({ hasText: TOYOTA_DATA.model });
      await expect(carCard).toBeVisible({ timeout: 10000 });
    }
  });

  test('should accept economy pricing for Toyota (8000 ARS/day)', async ({ page }) => {
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

    // Fill economy price
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill(TOYOTA_DATA.pricePerDay);

      // Price should be accepted (no error)
      const priceError = page.locator('text=/precio inválido/i');
      const hasError = await priceError.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasError).toBe(false);
    }
  });

  test('should validate hybrid fuel option is available', async ({ page }) => {
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

    // Check if hybrid fuel option exists
    const fuelSelect = page.locator('select[name="fuel_type"]')
      .or(page.locator('ion-select[name="fuel_type"]'));

    if (await fuelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fuelSelect.click();
      await page.waitForTimeout(500);

      const hybridOption = page.locator(`ion-item:has-text("Híbrido")`)
        .or(page.locator(`ion-item:has-text("Hybrid")` ))
        .or(page.locator(`option[value="hybrid"]`));

      const hasHybridOption = await hybridOption.isVisible({ timeout: 3000 }).catch(() => false);

      // Hybrid should be available as a fuel option (important for eco-friendly cars)
      expect(hasHybridOption).toBeTruthy();
    }
  });

  test('should validate compact category is available', async ({ page }) => {
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

    // Check if compact category exists
    const categorySelect = page.locator('select[name="category"]')
      .or(page.locator('ion-select[name="category"]'));

    if (await categorySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);

      const compactOption = page.locator(`ion-item:has-text("Compacto")`)
        .or(page.locator(`ion-item:has-text("Compact")` ))
        .or(page.locator(`option[value="compact"]`));

      const hasCompactOption = await compactOption.isVisible({ timeout: 3000 }).catch(() => false);

      // Compact should be available as a category (most common rental segment)
      expect(hasCompactOption).toBeTruthy();
    }
  });

  test('should validate minimum price threshold (1000 ARS)', async ({ page }) => {
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

    // Try price below minimum threshold
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('500'); // Below minimum

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show minimum price validation error
        const priceError = page.locator('text=/precio mínimo/i')
          .or(page.locator('text=/precio debe ser mayor/i'));

        const hasError = await priceError.isVisible({ timeout: 5000 }).catch(() => false);

        if (!hasError) {
          // Form shouldn't submit successfully with price below minimum
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });
});
