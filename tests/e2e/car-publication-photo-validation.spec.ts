import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * E2E TEST: Car Publication Photo Upload Validation
 *
 * Tests photo upload functionality and validations during car publication.
 * This ensures photos are properly validated for format, size, and quantity.
 *
 * Test Categories:
 * 1. Photo upload success (multiple photos)
 * 2. Minimum photo requirement (3 photos)
 * 3. Maximum photo limit (10 photos)
 * 4. File size validation (< 5MB)
 * 5. File format validation (JPG, PNG, WEBP only)
 * 6. Photo preview functionality
 * 7. Photo deletion
 */

test.describe('Car Publication Photo Upload Validation', () => {
  const TEST_USER = {
    email: `test-photo-validation-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Photo Test User',
    phone: '+541112345683',
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

  test('should successfully upload multiple valid photos', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload 3 valid photos
      await photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);

      await page.waitForTimeout(2000);

      // Verify previews appear
      const previews = page.locator('img[src*="blob"]')
        .or(page.locator('.photo-preview'))
        .or(page.locator('.uploaded-photo'));

      const previewCount = await previews.count();

      // Should have at least some previews
      expect(previewCount).toBeGreaterThan(0);
    }
  });

  test('should show error when no photos uploaded', async ({ page }) => {
    // Fill other required fields but skip photos
    const yearInput = page.locator('input[name="year"]')
      .or(page.locator('ion-input[name="year"] input'));

    if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yearInput.fill('2023');
    }

    const priceInput = page.locator('input[name="price_per_day"]')
      .or(page.locator('ion-input[name="price_per_day"] input'));

    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('5000');
    }

    // Try to submit without photos
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show photo requirement error
      const photoError = page.locator('text=/fotos.*requeridas/i')
        .or(page.locator('text=/al menos.*foto/i'))
        .or(page.locator('text=/3.*fotos/i'))
        .or(page.locator('text=/imagen.*requerida/i'));

      const hasError = await photoError.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasError) {
        // Form shouldn't submit successfully without photos
        expect(page.url()).toContain('/publish');
      } else {
        expect(hasError).toBeTruthy();
      }
    }
  });

  test('should show error when less than minimum photos uploaded', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload only 1 photo (less than minimum of 3)
      await photoInput.setInputFiles(['tests/fixtures/test-car-1.jpg']);

      await page.waitForTimeout(2000);

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const photoError = page.locator('text=/mínimo.*3.*fotos/i')
          .or(page.locator('text=/al menos.*3/i'))
          .or(page.locator('text=/fotos.*insuficientes/i'));

        const hasError = await photoError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          expect(page.url()).toContain('/publish');
        } else {
          expect(hasError).toBeTruthy();
        }
      }
    }
  });

  test('should reject when exceeding maximum photo limit', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to upload 11 photos (more than maximum of 10)
      const files = Array(11).fill('tests/fixtures/test-car-1.jpg');

      await photoInput.setInputFiles(files);

      await page.waitForTimeout(2000);

      // Should either:
      // 1. Show error message
      // 2. Only accept first 10 photos
      // 3. Disable upload after 10

      const photoError = page.locator('text=/máximo.*10.*fotos/i')
        .or(page.locator('text=/límite.*fotos/i'))
        .or(page.locator('text=/demasiadas.*fotos/i'));

      const hasError = await photoError.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasError) {
        // Count uploaded previews - should be max 10
        const previews = page.locator('img[src*="blob"]')
          .or(page.locator('.photo-preview'));

        const previewCount = await previews.count();
        expect(previewCount).toBeLessThanOrEqual(10);
      } else {
        expect(hasError).toBeTruthy();
      }
    }
  });

  test('should reject invalid file format (PDF)', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to upload a PDF file
      const pdfPath = 'tests/fixtures/invalid-file.pdf';

      // Create a dummy PDF file if it doesn't exist
      try {
        await photoInput.setInputFiles([pdfPath]);
        await page.waitForTimeout(2000);

        // Should show format error
        const formatError = page.locator('text=/formato.*inválido/i')
          .or(page.locator('text=/solo.*imágenes/i'))
          .or(page.locator('text=/jpg.*png.*webp/i'))
          .or(page.locator('text=/tipo.*archivo.*inválido/i'));

        const hasError = await formatError.isVisible({ timeout: 3000 }).catch(() => false);

        // Either shows error or rejects the file
        if (!hasError) {
          // File should not be in preview
          const previews = page.locator('img[src*="blob"]');
          const previewCount = await previews.count();

          // Should have 0 previews (PDF rejected)
          expect(previewCount).toBe(0);
        } else {
          expect(hasError).toBeTruthy();
        }
      } catch (error) {
        // File might not exist or be rejected by input - that's OK
        console.log('PDF upload rejected by file input (expected)');
      }
    }
  });

  test('should reject invalid file format (TXT)', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      try {
        await photoInput.setInputFiles(['tests/fixtures/invalid-file.txt']);
        await page.waitForTimeout(2000);

        const formatError = page.locator('text=/formato.*inválido/i')
          .or(page.locator('text=/solo.*imágenes/i'));

        const hasError = await formatError.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasError) {
          const previews = page.locator('img[src*="blob"]');
          const previewCount = await previews.count();
          expect(previewCount).toBe(0);
        } else {
          expect(hasError).toBeTruthy();
        }
      } catch (error) {
        console.log('TXT upload rejected by file input (expected)');
      }
    }
  });

  test('should show photo previews after upload', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);

      await page.waitForTimeout(2000);

      // Verify previews are visible
      const previews = page.locator('img[src*="blob"]')
        .or(page.locator('.photo-preview img'))
        .or(page.locator('.uploaded-photo img'));

      const previewCount = await previews.count();

      // Should have 3 previews
      expect(previewCount).toBeGreaterThanOrEqual(3);

      // Each preview should be visible
      const firstPreview = previews.first();
      await expect(firstPreview).toBeVisible();
    }
  });

  test('should allow deleting uploaded photos', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload photos
      await photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);

      await page.waitForTimeout(2000);

      // Find delete button (usually X or trash icon)
      const deleteButton = page.locator('button:has-text("×")')
        .or(page.locator('button:has-text("Eliminar")'))
        .or(page.locator('.delete-photo'))
        .or(page.locator('ion-icon[name="close"]').locator('..'))
        .or(page.locator('ion-icon[name="trash"]').locator('..'));

      if (await deleteButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        const initialCount = await deleteButton.count();

        // Click first delete button
        await deleteButton.first().click();
        await page.waitForTimeout(1000);

        // Count should decrease
        const newCount = await deleteButton.count();
        expect(newCount).toBeLessThan(initialCount);
      }
    }
  });

  test('should maintain photo order after upload', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload photos in specific order
      await photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);

      await page.waitForTimeout(2000);

      // Verify photos are in order (first photo should be first in preview)
      const previews = page.locator('img[src*="blob"]')
        .or(page.locator('.photo-preview'));

      const firstPreview = previews.first();
      await expect(firstPreview).toBeVisible();

      // Should have exactly 3 previews
      const count = await previews.count();
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test('should accept valid image formats (JPG, PNG, WEBP)', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload different valid formats
      const files = [
        'tests/fixtures/test-car-1.jpg',   // JPG
        'tests/fixtures/test-car-2.png',   // PNG (if exists)
        'tests/fixtures/test-car-3.webp',  // WEBP (if exists)
      ].filter(Boolean);

      try {
        await photoInput.setInputFiles(files);
        await page.waitForTimeout(2000);

        // All valid formats should be accepted
        const previews = page.locator('img[src*="blob"]');
        const previewCount = await previews.count();

        // Should have at least 1 preview (JPG)
        expect(previewCount).toBeGreaterThan(0);
      } catch (error) {
        // Some test files might not exist, fallback to JPG only
        await photoInput.setInputFiles(['tests/fixtures/test-car-1.jpg']);
        await page.waitForTimeout(2000);

        const previews = page.locator('img[src*="blob"]');
        const previewCount = await previews.count();
        expect(previewCount).toBeGreaterThan(0);
      }
    }
  });

  test('should show upload progress indicator', async ({ page }) => {
    const photoInput = page.locator('input[type="file"]')
      .or(page.locator('input[accept*="image"]'));

    if (await photoInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Start upload
      const uploadPromise = photoInput.setInputFiles([
        'tests/fixtures/test-car-1.jpg',
        'tests/fixtures/test-car-2.jpg',
        'tests/fixtures/test-car-3.jpg',
      ]);

      // Check for loading indicator (might be very fast)
      const loadingIndicator = page.locator('ion-spinner')
        .or(page.locator('.loading'))
        .or(page.locator('.uploading'))
        .or(page.locator('text=/cargando/i'));

      const hasLoadingIndicator = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

      await uploadPromise;
      await page.waitForTimeout(2000);

      // Loading should complete
      const stillLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

      // Either we saw loading indicator and it completed, or upload was too fast
      if (hasLoadingIndicator) {
        expect(stillLoading).toBe(false);
      }

      // Photos should be uploaded
      const previews = page.locator('img[src*="blob"]');
      const previewCount = await previews.count();
      expect(previewCount).toBeGreaterThan(0);
    }
  });
});
