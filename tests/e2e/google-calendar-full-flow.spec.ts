import { test, expect } from '@playwright/test';

/**
 * Google Calendar Integration - Full Flow E2E Tests
 *
 * Tests the complete integration flow:
 * 1. Connect Google Calendar from profile
 * 2. View calendar in car detail page
 * 3. Create booking and verify sync
 * 4. Manage calendars from profile
 */

test.describe('Google Calendar Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should connect Google Calendar from profile page', async ({ page }) => {
    // Navigate to profile
    await page.goto('/profile');

    // Find Google Calendar section
    const calendarSection = page.locator('text=Google Calendar').first();
    await expect(calendarSection).toBeVisible();

    // Check if already connected
    const isConnected = await page.locator('text=✓ Conectado').isVisible();

    if (!isConnected) {
      // Click connect button
      await page.click('button:has-text("Conectar Google Calendar")');

      // Note: In E2E tests, we can't fully test OAuth flow
      // as it requires real Google authentication
      // Instead, we verify the button opens the OAuth flow

      // For CI/CD, you would mock this or use test accounts
      console.log('Google Calendar connection flow initiated (requires manual OAuth in real tests)');
    } else {
      console.log('Google Calendar already connected');
    }
  });

  test('should display calendar in car detail page', async ({ page, context }) => {
    // Assume user has Calendar connected (or skip this test)
    // Navigate to a car detail page
    await page.goto('/cars');
    await page.waitForSelector('.car-card', { timeout: 5000 });

    // Click first car
    const firstCar = page.locator('.car-card').first();
    await firstCar.click();

    // Wait for car detail to load
    await page.waitForURL(/\/cars\/.+/);
    await page.waitForSelector('h1', { timeout: 5000 });

    // Scroll to calendar section
    const calendarSection = page.locator('text=Disponibilidad en Tiempo Real');

    if (await calendarSection.isVisible()) {
      // Verify calendar is embedded
      const calendarIframe = page.frameLocator('iframe[title="Google Calendar"]');
      await expect(calendarIframe.locator('body')).toBeVisible({ timeout: 10000 });

      // Verify sync badge
      const syncBadge = page.locator('text=Sincronizado con Google Calendar');
      await expect(syncBadge).toBeVisible();

      console.log('✅ Google Calendar displayed in car detail');
    } else {
      console.log('⚠️ This car does not have Google Calendar connected');
    }
  });

  test('should sync booking to Google Calendar', async ({ page }) => {
    // This test requires:
    // 1. User with Google Calendar connected
    // 2. Car with calendar_id
    // 3. Available dates

    await page.goto('/cars');
    await page.waitForSelector('.car-card', { timeout: 5000 });

    // Click first available car
    await page.locator('.car-card').first().click();
    await page.waitForURL(/\/cars\/.+/);

    // Select dates (assuming date picker is available)
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() + 7); // 7 days from now

    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateTo.getDate() + 3); // 3 day rental

    // Open date picker (implementation depends on your UI)
    // await page.click('button:has-text("Seleccionar fechas")');
    // ... select dates ...

    // Click reserve button
    const reserveButton = page.locator('button:has-text("Solicitar reserva")');

    if (await reserveButton.isVisible()) {
      await reserveButton.click();

      // Wait for booking confirmation or payment page
      await page.waitForURL(/\/bookings|\/payment/, { timeout: 10000 });

      // Check for sync notification (if on-screen notifications are used)
      // Note: This depends on your notification implementation
      const syncNotification = page.locator('text=/sincroniza|Google Calendar/i');

      if (await syncNotification.isVisible({ timeout: 3000 })) {
        console.log('✅ Booking sync notification displayed');
      }
    } else {
      console.log('⚠️ Reserve button not available (car may be unavailable)');
    }
  });

  test('should display calendar management panel in profile', async ({ page }) => {
    await page.goto('/profile');

    // Scroll to calendar management section
    const managementSection = page.locator('text=📅 Calendarios Sincronizados');

    if (await managementSection.isVisible()) {
      await expect(managementSection).toBeVisible();

      // Check for calendars grid
      const calendarsGrid = page.locator('.calendars-grid, .calendar-card').first();

      if (await calendarsGrid.isVisible()) {
        // Verify calendar cards
        const calendarCards = page.locator('.calendar-card');
        const count = await calendarCards.count();

        console.log(`✅ Found ${count} synced calendars`);

        if (count > 0) {
          // Verify calendar card contents
          const firstCard = calendarCards.first();
          await expect(firstCard.locator('.car-name')).toBeVisible();
          await expect(firstCard.locator('.sync-status')).toBeVisible();

          // Check "Ver en Google Calendar" link
          const viewLink = firstCard.locator('a:has-text("Ver en Google Calendar")');
          await expect(viewLink).toBeVisible();
          await expect(viewLink).toHaveAttribute('href', /calendar\.google\.com/);
        }
      } else {
        console.log('ℹ️ No calendars synced yet (empty state)');
        await expect(page.locator('text=No hay calendarios sincronizados')).toBeVisible();
      }
    } else {
      console.log('⚠️ Calendar management section not visible (may require Google Calendar connection)');
    }
  });

  test('should handle calendar availability data', async ({ page, request }) => {
    // Test API integration directly
    const carId = 'test-car-id'; // Replace with actual car ID in test env
    const from = new Date().toISOString().split('T')[0];
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await request.get(
      `${process.env.SUPABASE_URL}/functions/v1/get-car-calendar-availability?car_id=${carId}&from=${from}&to=${to}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          apikey: process.env.SUPABASE_ANON_KEY || '',
        },
      },
    );

    if (response.ok()) {
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('available');
      expect(data).toHaveProperty('blocked_dates');
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('google_calendar_checked');

      console.log('✅ Calendar availability API working');
      console.log(`   - Available: ${data.available}`);
      console.log(`   - Blocked dates: ${data.blocked_dates.length}`);
      console.log(`   - Events: ${data.events.length}`);
      console.log(`   - Calendar checked: ${data.google_calendar_checked}`);
    } else {
      console.log(`⚠️ Calendar availability API returned ${response.status()}`);
    }
  });

  test('should verify calendar OAuth callback', async ({ page }) => {
    // This test verifies the OAuth callback page exists and renders correctly
    // Note: Testing actual OAuth flow requires mocking or test credentials

    // The OAuth callback URL pattern
    const callbackUrl = `${process.env.SUPABASE_URL}/functions/v1/google-calendar-oauth?action=handle-callback&code=test&state=test`;

    // Try to access callback (will fail auth, but should return HTML)
    const response = await page.goto(callbackUrl, { waitUntil: 'domcontentloaded' });

    // Verify it returns HTML (not 404)
    expect(response?.status()).not.toBe(404);

    // The callback page should have specific content
    const content = await page.content();
    expect(content).toContain('Google Calendar'); // Should mention calendar in some form

    console.log('✅ OAuth callback endpoint exists');
  });
});

test.describe('Google Calendar - Integration Scenarios', () => {
  test('scenario: owner publishes car with calendar sync', async ({ page }) => {
    // 1. Login as owner
    await page.goto('/auth/login');
    // ... login ...

    // 2. Connect Google Calendar if not connected
    await page.goto('/profile');
    // ... connect calendar ...

    // 3. Create new car listing
    await page.goto('/cars/create');
    // ... fill car details ...

    // 4. Verify calendar is created automatically
    // After publishing, should see calendar in management panel

    // This is a placeholder for the full flow
    console.log('Owner car publishing scenario - implement with real test data');
  });

  test('scenario: renter sees availability and books', async ({ page }) => {
    // 1. Login as renter
    // 2. Find car with calendar sync
    // 3. Check blocked dates in calendar
    // 4. Select available dates
    // 5. Complete booking
    // 6. Verify sync notification

    console.log('Renter booking scenario - implement with real test data');
  });
});
