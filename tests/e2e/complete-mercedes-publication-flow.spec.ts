import { test, expect } from '@playwright/test';

/**
 * E2E TEST: Complete Mercedes-Benz C-Class Publication Flow
 *
 * Tests the complete end-to-end flow of publishing a Mercedes-Benz C-Class sedan
 * as another variant of the car publication flow.
 *
 * This test validates the publication flow for luxury sedans,
 * which is a different category from sports cars (Porsche) and SUVs (BMW).
 *
 * Key Characteristics:
 * - Luxury sedan category
 * - Premium features (leather, sunroof, advanced safety)
 * - Diesel fuel option (common in European luxury sedans)
 * - Mid-range pricing for executive segment
 */

test.describe('Complete Mercedes-Benz C-Class Publication Flow', () => {
  const TEST_USER = {
    email: `test-mercedes-owner-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Mercedes Owner Test',
    phone: '+541112345680',
  };

  const MERCEDES_DATA = {
    brand: 'Mercedes-Benz',
    model: 'C-Class',
    year: '2023',
    color: 'Obsidian Black',
    licensePlate: 'MER300',
    description: 'Mercedes-Benz C 300 AMG Line. Sedán ejecutivo de lujo con tecnología MBUX, asientos de cuero Artico, techo panorámico, sistema de sonido Burmester, asistente de conducción DISTRONIC PLUS.',
    pricePerDay: '15000', // ARS per day
    transmission: 'automatic',
    fuelType: 'diesel',
    seats: '5',
    category: 'sedan',
    city: 'Buenos Aires',
    address: 'Av. del Libertador 5000',
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

  test('should complete full Mercedes C-Class publication flow with diesel', async ({ page }) => {
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

    // Fill brand (Mercedes-Benz)
    const brandSelect = page.locator('select[name="brand_id"]')
      .or(page.locator('ion-select[name="brand_id"]'))
      .or(page.locator('[formcontrolname="brand_id"]'));

    await expect(brandSelect).toBeVisible({ timeout: 10000 });
    await brandSelect.click();
    await page.waitForTimeout(500);

    // Try both "Mercedes-Benz" and "Mercedes"
    const mercedesOption = page.locator(`ion-item:has-text("Mercedes")`)
      .or(page.locator(`option:has-text("Mercedes")`))
      .first();

    await mercedesOption.click();
    await page.waitForTimeout(1000);

    // Fill model (C-Class)
    const modelSelect = page.locator('select[name="model_id"]')
      .or(page.locator('ion-select[name="model_id"]'));

    if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modelSelect.click();
      await page.waitForTimeout(500);

      const modelOption = page.locator(`ion-item:has-text("C-Class")`)
        .or(page.locator(`ion-item:has-text("Clase C")`) )
        .or(page.locator(`option:has-text("C-Class")`))
        .first();

      await modelOption.click();
      await page.waitForTimeout(1000);
    }

    // Fill year
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));
    await yearInput.fill(MERCEDES_DATA.year);

    // Fill color
    const colorInput = page.locator('input[name="color"]')
      .or(page.locator('ion-input[name="color"] input'));
    if (await colorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await colorInput.fill(MERCEDES_DATA.color);
    }

    // Fill license plate
    const plateInput = page.locator('input[name="license_plate"]')
      .or(page.locator('ion-input[name="license_plate"] input'));
    if (await plateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await plateInput.fill(MERCEDES_DATA.licensePlate);
    }

    // Fill description
    const descriptionTextarea = page.locator('textarea[name="description"]')
      .or(page.locator('ion-textarea[name="description"] textarea'));
    await descriptionTextarea.fill(MERCEDES_DATA.description);

    // Fill price
    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));
    await priceInput.fill(MERCEDES_DATA.pricePerDay);

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

    // Select fuel type (Diesel - unique to Mercedes test)
    const fuelSelect = page.locator('select[name="fuel_type"]')
      .or(page.locator('ion-select[name="fuel_type"]'));
    if (await fuelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fuelSelect.click();
      await page.waitForTimeout(500);
      const fuelOption = page.locator(`ion-item:has-text("Diesel")`)
        .or(page.locator(`option[value="diesel"]`))
        .first();
      await fuelOption.click();
      await page.waitForTimeout(500);
    }

    // Fill seats (5 for sedan)
    const seatsInput = page.locator('input[name="seats"]')
      .or(page.locator('ion-input[name="seats"] input'));
    if (await seatsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await seatsInput.fill(MERCEDES_DATA.seats);
    }

    // Select category (Sedan)
    const categorySelect = page.locator('select[name="category"]')
      .or(page.locator('ion-select[name="category"]'));
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      const categoryOption = page.locator(`ion-item:has-text("Sedán")`)
        .or(page.locator(`ion-item:has-text("Sedan")`) )
        .or(page.locator(`option[value="sedan"]`))
        .first();
      await categoryOption.click();
      await page.waitForTimeout(500);
    }

    // Fill city
    const cityInput = page.locator('input[name="city"]')
      .or(page.locator('ion-input[name="city"] input'));
    if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cityInput.fill(MERCEDES_DATA.city);
    }

    // Fill address
    const addressInput = page.locator('input[name="address"]')
      .or(page.locator('ion-input[name="address"] input'));
    if (await addressInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addressInput.fill(MERCEDES_DATA.address);
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

    // Verify Mercedes appears in car list
    if (isOnMyCarsPage) {
      const carCard = page.locator('.car-card, ion-card')
        .filter({ hasText: /C-Class|Clase C/i });
      await expect(carCard).toBeVisible({ timeout: 10000 });
    }
  });

  test('should validate diesel fuel option is available', async ({ page }) => {
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

    // Check if diesel fuel option exists
    const fuelSelect = page.locator('select[name="fuel_type"]')
      .or(page.locator('ion-select[name="fuel_type"]'));

    if (await fuelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fuelSelect.click();
      await page.waitForTimeout(500);

      const dieselOption = page.locator(`ion-item:has-text("Diesel")`)
        .or(page.locator(`option[value="diesel"]`));

      const hasDieselOption = await dieselOption.isVisible({ timeout: 3000 }).catch(() => false);

      // Diesel should be available as a fuel option
      expect(hasDieselOption).toBeTruthy();
    }
  });

  test('should validate sedan category is available', async ({ page }) => {
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

    // Check if sedan category exists
    const categorySelect = page.locator('select[name="category"]')
      .or(page.locator('ion-select[name="category"]'));

    if (await categorySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categorySelect.click();
      await page.waitForTimeout(500);

      const sedanOption = page.locator(`ion-item:has-text("Sedán")`)
        .or(page.locator(`ion-item:has-text("Sedan")` ))
        .or(page.locator(`option[value="sedan"]`));

      const hasSedanOption = await sedanOption.isVisible({ timeout: 3000 }).catch(() => false);

      // Sedan should be available as a category
      expect(hasSedanOption).toBeTruthy();
    }
  });
});
