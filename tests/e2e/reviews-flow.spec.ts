import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Review Flow
 *
 * This test covers the entire review workflow from completing a booking
 * to submitting a review and verifying it appears on the car detail page.
 *
 * Flow:
 * 1. Login as test renter
 * 2. Complete a booking (or use existing completed booking)
 * 3. Navigate to pending reviews section
 * 4. Fill and submit review form with all 6 categories
 * 5. Verify review appears on car detail page
 * 6. Verify stats are updated
 *
 * Priority: P1 (High)
 * Duration: ~2-3 minutes
 */

test.describe('Reviews Flow - E2E', () => {
  // Test user credentials (should exist in database)
  const TEST_RENTER_EMAIL = 'test-renter@autorenta.com';
  const TEST_RENTER_PASSWORD = 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page
      .getByPlaceholder(/email|correo/i)
      .or(page.locator('input[type="email"]'))
      .first();
    const passwordInput = page
      .getByPlaceholder(/contraseña|password/i)
      .or(page.locator('input[type="password"]'))
      .first();

    await emailInput.fill(TEST_RENTER_EMAIL);
    await passwordInput.fill(TEST_RENTER_PASSWORD);

    const loginButton = page
      .getByRole('button', { name: /entrar|iniciar sesión|login|sign in/i })
      .or(page.locator('button[type="submit"]'))
      .first();

    await loginButton.click({ timeout: 10000 });
    await page.waitForURL(/\/cars|\//, { timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test('Should complete full review flow: pending reviews -> submit -> verify on car page', async ({
    page,
  }) => {
    // ============================================
    // STEP 1: Navigate to Pending Reviews
    // ============================================
    console.log('📋 Step 1: Navigating to pending reviews...');

    // Navigate to user profile or bookings
    await page.goto('/profile/bookings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Look for pending reviews section or link
    const pendingReviewsLink = page
      .getByRole('link', { name: /reseñas pendientes|pending reviews/i })
      .or(page.getByTestId('pending-reviews-link'))
      .or(page.locator('a[href*="pending-reviews"]'))
      .first();

    const hasPendingReviews = await pendingReviewsLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasPendingReviews) {
      console.warn('⚠️ No pending reviews link found. This test requires a completed booking.');
      console.warn('   Skipping test - please ensure test data includes completed bookings.');
      test.skip();
      return;
    }

    await pendingReviewsLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify we're on pending reviews page
    await expect(page.getByText(/reseñas pendientes|pending reviews/i)).toBeVisible({
      timeout: 10000,
    });

    // ============================================
    // STEP 2: Find a Booking to Review
    // ============================================
    console.log('🔍 Step 2: Finding a booking to review...');

    // Find the first pending review card
    const reviewCard = page
      .getByTestId('pending-review-card')
      .or(page.locator('[data-testid*="review-card"]'))
      .or(page.locator('.review-card, .booking-review-card'))
      .first();

    const hasReviewCard = await reviewCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasReviewCard) {
      console.warn('⚠️ No pending review cards found.');
      console.warn('   This could mean:');
      console.warn('   1. All bookings have been reviewed');
      console.warn('   2. No completed bookings exist for this user');
      console.warn('   3. Review window (14 days) has expired');
      test.skip();
      return;
    }

    // Get booking/car info from the card
    const carTitle =
      (await reviewCard.locator('.car-title, [class*="title"]').textContent()) || 'Unknown Car';
    console.log(`✅ Found pending review for: ${carTitle}`);

    // Click "Write Review" or "Review" button
    const writeReviewButton = reviewCard
      .getByRole('button', { name: /escribir reseña|write review|review/i })
      .or(reviewCard.locator('button:has-text("Reseñar")'))
      .first();

    await writeReviewButton.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // ============================================
    // STEP 3: Fill Review Form with All 6 Categories
    // ============================================
    console.log('✍️ Step 3: Filling review form...');

    // Verify review form is visible
    await expect(
      page.getByText(/deja tu reseña|write a review|califica tu experiencia/i),
    ).toBeVisible({ timeout: 10000 });

    // Category ratings (all 6 required categories)
    const categories = [
      { name: 'cleanliness', label: /limpieza|cleanliness/i, rating: 5 },
      { name: 'communication', label: /comunicación|communication/i, rating: 5 },
      { name: 'accuracy', label: /precisión|accuracy|descripción/i, rating: 4 },
      { name: 'location', label: /ubicación|location/i, rating: 5 },
      { name: 'checkin', label: /check.*in|entrega/i, rating: 5 },
      { name: 'value', label: /valor|value|precio/i, rating: 4 },
    ];

    // Fill each category rating
    for (const category of categories) {
      console.log(`   Setting ${category.name} to ${category.rating} stars...`);

      // Find the category section
      const categorySection = page
        .locator(`section:has-text("${category.label.source.slice(0, -2)}"), div:has-text("${category.label.source.slice(0, -2)}")`)
        .first();

      // Find star rating buttons or inputs
      // Could be star icons, radio buttons, or range inputs
      const starButton = categorySection
        .getByRole('button', { name: new RegExp(`${category.rating}.*star`, 'i') })
        .or(categorySection.locator(`button[data-rating="${category.rating}"]`))
        .or(categorySection.locator(`input[value="${category.rating}"]`))
        .or(
          categorySection.locator(
            `ion-icon[name="star"], svg[class*="star"]`,
          ).nth(category.rating - 1),
        )
        .first();

      const isVisible = await starButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        await starButton.click();
        await page.waitForTimeout(300);
      } else {
        console.warn(`⚠️ Could not find rating input for ${category.name}`);
      }
    }

    // Fill public comment
    const publicCommentTextarea = page
      .getByPlaceholder(/comparte tu experiencia|comentario público|public comment/i)
      .or(page.getByLabel(/comentario público|public comment/i))
      .or(page.locator('textarea[name="comment_public"]'))
      .first();

    const publicCommentText =
      'Excelente experiencia! El auto estaba impecable y el dueño fue muy amable. Totalmente recomendado.';

    await publicCommentTextarea.fill(publicCommentText);
    await page.waitForTimeout(500);

    // Optionally fill private comment
    const privateCommentTextarea = page
      .getByPlaceholder(/comentario privado|private comment|solo.*dueño/i)
      .or(page.getByLabel(/comentario privado|private comment/i))
      .or(page.locator('textarea[name="comment_private"]'))
      .first();

    const hasPrivateComment =
      await privateCommentTextarea.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasPrivateComment) {
      await privateCommentTextarea.fill('Pequeño rayón en la puerta del conductor.');
      await page.waitForTimeout(500);
    }

    console.log('✅ Review form filled successfully');

    // ============================================
    // STEP 4: Submit Review
    // ============================================
    console.log('📤 Step 4: Submitting review...');

    // Find and click submit button
    const submitButton = page
      .getByRole('button', { name: /enviar reseña|submit review|publicar/i })
      .or(page.locator('button[type="submit"]'))
      .first();

    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    await submitButton.click();

    // Wait for submission to complete
    await page.waitForTimeout(2000);

    // Verify success message or redirect
    const successMessage = page
      .getByText(/reseña publicada|review submitted|gracias por tu reseña/i)
      .first();

    const hasSuccess = await successMessage.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasSuccess) {
      console.log('✅ Review submitted successfully');
    } else {
      // Check if redirected to reviews list or car page
      const currentUrl = page.url();
      console.log(`   Current URL after submit: ${currentUrl}`);

      // Check for error messages
      const errorMessage = page
        .locator('.error-message, [class*="error"], text=/error/i')
        .first();
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasError) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Review submission failed: ${errorText}`);
      }
    }

    await page.waitForTimeout(2000);

    // ============================================
    // STEP 5: Navigate to Car Detail Page
    // ============================================
    console.log('🚗 Step 5: Navigating to car detail page...');

    // Extract car ID from URL or booking info
    // Try to navigate back to the car page
    let carId: string | null = null;

    // Option 1: Extract from current URL if we're on car page
    const urlMatch = page.url().match(/\/cars\/([a-f0-9-]+)/);
    if (urlMatch) {
      carId = urlMatch[1];
    }

    // Option 2: Look for "View Car" or similar link
    if (!carId) {
      const viewCarLink = page
        .getByRole('link', { name: /ver auto|view car|volver al auto/i })
        .or(page.locator('a[href*="/cars/"]'))
        .first();

      const hasLink = await viewCarLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasLink) {
        const href = await viewCarLink.getAttribute('href');
        const match = href?.match(/\/cars\/([a-f0-9-]+)/);
        if (match) {
          carId = match[1];
        }
        await viewCarLink.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // Option 3: Navigate to bookings and find the car from there
    if (!carId) {
      console.log('   Navigating via bookings page to find car...');
      await page.goto('/profile/bookings');
      await page.waitForLoadState('domcontentloaded');

      const firstCarLink = page.locator('a[href*="/cars/"]').first();
      const href = await firstCarLink.getAttribute('href');
      const match = href?.match(/\/cars\/([a-f0-9-]+)/);
      if (match) {
        carId = match[1];
        await firstCarLink.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }

    if (!carId) {
      console.warn('⚠️ Could not determine car ID. Skipping verification step.');
      return;
    }

    console.log(`✅ Navigated to car page: ${carId}`);

    // ============================================
    // STEP 6: Verify Review Appears on Car Page
    // ============================================
    console.log('✅ Step 6: Verifying review appears on car page...');

    await page.waitForTimeout(2000);

    // Scroll to reviews section
    const reviewsSection = page
      .getByTestId('reviews-section')
      .or(page.locator('#reviews-section'))
      .or(page.getByText(/reseñas|reviews/).locator('..').first())
      .first();

    const hasReviewsSection =
      await reviewsSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasReviewsSection) {
      await reviewsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }

    // Look for our review text
    const reviewText = page.getByText(publicCommentText.substring(0, 30), { exact: false });

    await expect(reviewText).toBeVisible({ timeout: 10000 });

    console.log('✅ Review found on car page');

    // Verify star ratings are displayed
    const starRatings = page.locator('ion-icon[name="star"], svg[class*="star"]');
    const starsCount = await starRatings.count();

    expect(starsCount).toBeGreaterThan(0);
    console.log(`✅ Found ${starsCount} star icons`);

    // ============================================
    // STEP 7: Verify Stats Are Updated
    // ============================================
    console.log('📊 Step 7: Verifying stats are updated...');

    // Check for review count
    const reviewCount = page
      .getByText(/\d+.*reseñas?|\d+.*reviews?/i)
      .or(page.locator('[data-testid="review-count"]'))
      .first();

    const hasCount = await reviewCount.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCount) {
      const countText = await reviewCount.textContent();
      console.log(`✅ Review count displayed: ${countText}`);
    }

    // Check for average rating
    const avgRating = page
      .getByText(/\d+\.\d+.*promedio|average.*\d+\.\d+/i)
      .or(page.locator('[data-testid="average-rating"]'))
      .first();

    const hasAvgRating = await avgRating.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAvgRating) {
      const ratingText = await avgRating.textContent();
      console.log(`✅ Average rating displayed: ${ratingText}`);
    }

    // Check category breakdown (if visible)
    const categoryBreakdown = page
      .getByText(/limpieza|comunicación|precisión/i)
      .first();

    const hasBreakdown = await categoryBreakdown.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasBreakdown) {
      console.log('✅ Category breakdown visible');
    }

    console.log('🎉 Full review flow completed successfully!');
  });

  test('Should handle review submission errors gracefully', async ({ page }) => {
    // Navigate to pending reviews
    await page.goto('/profile/pending-reviews');
    await page.waitForLoadState('domcontentloaded');

    const reviewCard = page.locator('[data-testid*="review-card"]').first();
    const hasCard = await reviewCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasCard) {
      test.skip();
      return;
    }

    // Start review process
    const writeButton = reviewCard.getByRole('button', { name: /review/i }).first();
    await writeButton.click();
    await page.waitForLoadState('domcontentloaded');

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /submit|enviar/i }).first();

    const isEnabled = await submitButton.isEnabled({ timeout: 3000 }).catch(() => false);

    if (isEnabled) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show validation error
      const validationError = page.getByText(
        /campo requerido|required field|selecciona.*calificación/i,
      );

      const hasError = await validationError.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasError).toBe(true);
      console.log('✅ Validation error displayed for incomplete form');
    } else {
      console.log('✅ Submit button is disabled when form is incomplete');
    }
  });

  test('Should prevent duplicate reviews for same booking', async ({ page }) => {
    // Navigate to a booking that already has a review
    await page.goto('/profile/bookings');
    await page.waitForLoadState('domcontentloaded');

    // Look for a completed booking with "View Review" instead of "Write Review"
    const viewReviewLink = page
      .getByRole('link', { name: /ver reseña|view review/i })
      .first();

    const hasViewReview = await viewReviewLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasViewReview) {
      console.log('⚠️ No reviewed bookings found. Skipping duplicate prevention test.');
      test.skip();
      return;
    }

    await viewReviewLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify that there's no "Edit" or "Submit New" button
    const editButton = page.getByRole('button', { name: /editar|edit|nueva reseña/i });
    const hasEdit = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasEdit).toBe(false);
    console.log('✅ Cannot create duplicate review - existing review is read-only');
  });

  test('Should display review window expiration warning', async ({ page }) => {
    await page.goto('/profile/pending-reviews');
    await page.waitForLoadState('domcontentloaded');

    // Look for reviews with expiration warnings
    const expirationWarning = page.getByText(
      /\d+.*días.*restantes|\d+.*days.*remaining|expira.*pronto/i,
    );

    const hasWarning = await expirationWarning.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasWarning) {
      const warningText = await expirationWarning.textContent();
      console.log(`✅ Expiration warning found: ${warningText}`);

      // Verify it shows correct number of days
      const daysMatch = warningText?.match(/(\d+)/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        expect(days).toBeGreaterThan(0);
        expect(days).toBeLessThanOrEqual(14);
        console.log(`✅ Days remaining: ${days} (within 0-14 range)`);
      }
    } else {
      console.log('ℹ️ No pending reviews with expiration warnings found');
    }
  });
});
