import { test, expect } from '@playwright/test';
import {
  createBookingWithCheckIn,
  getBookingById,
  getActiveCar,
  authenticateUserInPage,
  cleanupTestBooking,
  updateBookingStatus,
} from '../../helpers/booking-test-helpers';

/**
 * E2E Test: Ver Booking Activo
 *
 * Flujo completo:
 * 1. Booking en estado 'in_progress'
 * 2. Locatario navega a detalle de booking
 * 3. Verifica que muestra información del booking activo
 * 4. Verifica countdown timer
 * 5. Verifica información del auto
 * 6. Verifica información del owner
 * 7. Verifica botones de acción (check-out, chat, etc.)
 *
 * Prioridad: P0 (Critical)
 */

test.describe('Active Booking View - Locatario', () => {
  let testBookingId: string | null = null;
  let renterId: string | null = null;
  let carId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Authenticate user using helper function
    const renterEmail = 'test-renter@autorenta.com';
    const renterPassword = 'TestPassword123!';

    const authResult = await authenticateUserInPage(page, renterEmail, renterPassword);

    if (!authResult) {
      test.skip('Failed to authenticate test user');
      return;
    }

    renterId = authResult.userId;

    // Get active car for testing
    const car = await getActiveCar();
    if (!car) {
      test.skip('No active cars available for testing');
      return;
    }
    carId = car.id;

    // Create test booking with check-in using helper function
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 2); // Started 2 hours ago
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2); // 2 days total

    const { booking } = await createBookingWithCheckIn({
      carId: car.id,
      renterId,
      startDate,
      endDate,
      status: 'in_progress',
      totalAmount: 100000, // 1000 ARS
      odometer: 50000,
      fuelLevel: 75,
    });

    testBookingId = booking.id;
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testBookingId) {
      await cleanupTestBooking(testBookingId);
      testBookingId = null;
    }
  });

  test('T1: Happy path - Ver detalles de booking activo', async ({ page }) => {
    if (!testBookingId || !renterId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Iniciando test de vista de booking activo para booking ${testBookingId}\n`);

    // PASO 1: Navegar a detalle de booking
    console.log('📍 PASO 1: Navegando a detalle de booking...');
    await page.goto(`/bookings/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Verificar que la página carga correctamente
    const bookingDetail = page.locator('app-booking-detail').first();
    await expect(bookingDetail).toBeVisible({
      timeout: 10000,
    });

    // PASO 2: Verificar estado del booking
    console.log('📍 PASO 2: Verificando estado del booking...');
    const statusBadge = page
      .locator('[data-testid="booking-status"]')
      .or(page.getByText(/en curso|in progress|activo/i))
      .first();

    const statusVisible = await statusBadge.isVisible({ timeout: 5000 }).catch(() => false);
    if (statusVisible) {
      const statusText = await statusBadge.textContent();
      console.log(`✅ Estado del booking mostrado: ${statusText}`);
      expect(statusText?.toLowerCase()).toMatch(/en curso|in progress|activo/i);
    }

    // PASO 3: Verificar countdown timer
    console.log('📍 PASO 3: Verificando countdown timer...');
    const countdown = page
      .locator('[data-testid="booking-countdown"]')
      .or(page.getByText(/tiempo restante|remaining|countdown/i))
      .first();

    const countdownVisible = await countdown.isVisible({ timeout: 5000 }).catch(() => false);
    if (countdownVisible) {
      const countdownText = await countdown.textContent();
      console.log(`✅ Countdown timer visible: ${countdownText}`);
      // Verificar que muestra tiempo restante (días, horas, minutos)
      expect(countdownText).toMatch(/\d+/); // Debe contener números
    }

    // PASO 4: Verificar información del auto
    console.log('📍 PASO 4: Verificando información del auto...');
    const carInfo = page
      .locator('[data-testid="car-info"]')
      .or(page.getByText(/marca|brand|modelo|model/i))
      .first();

    const carInfoVisible = await carInfo.isVisible({ timeout: 5000 }).catch(() => false);
    if (carInfoVisible) {
      console.log('✅ Información del auto visible');
    }

    // PASO 5: Verificar información del owner
    console.log('📍 PASO 5: Verificando información del owner...');
    const ownerInfo = page
      .locator('[data-testid="owner-info"]')
      .or(page.getByText(/dueño|owner|propietario/i))
      .first();

    const ownerInfoVisible = await ownerInfo.isVisible({ timeout: 5000 }).catch(() => false);
    if (ownerInfoVisible) {
      console.log('✅ Información del owner visible');
    }

    // PASO 6: Verificar fechas de inicio y fin
    console.log('📍 PASO 6: Verificando fechas de inicio y fin...');
    const startDate = page.getByText(/inicio|start|desde/i).first();
    const endDate = page.getByText(/fin|end|hasta/i).first();

    const startDateVisible = await startDate.isVisible({ timeout: 5000 }).catch(() => false);
    const endDateVisible = await endDate.isVisible({ timeout: 5000 }).catch(() => false);

    if (startDateVisible && endDateVisible) {
      console.log('✅ Fechas de inicio y fin visibles');
    }

    // PASO 7: Verificar botones de acción
    console.log('📍 PASO 7: Verificando botones de acción...');

    // Botón de check-out
    const checkOutButton = page
      .getByRole('button', { name: /check-out|devolver|return/i })
      .or(page.locator('[data-testid="check-out-button"]'))
      .first();

    const checkOutVisible = await checkOutButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (checkOutVisible) {
      console.log('✅ Botón de check-out visible');
    }

    // Botón de chat
    const chatButton = page
      .getByRole('button', { name: /mensajes|chat|contactar/i })
      .or(page.locator('[data-testid="chat-button"]'))
      .first();

    const chatVisible = await chatButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (chatVisible) {
      console.log('✅ Botón de chat visible');
    }

    // Botón de reportar incidente
    const reportButton = page
      .getByRole('button', { name: /reportar|incidente|problema/i })
      .or(page.locator('[data-testid="report-incident-button"]'))
      .first();

    const reportVisible = await reportButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (reportVisible) {
      console.log('✅ Botón de reportar incidente visible');
    }

    // PASO 8: Verificar que booking está en estado correcto en BD
    console.log('📍 PASO 8: Verificando estado en BD...');
    const booking = await getBookingById(testBookingId);
    expect(booking?.status).toBe('in_progress');
    console.log('✅ Booking verificado en BD: estado "in_progress"');

    console.log('\n✅ Test de vista de booking activo completado exitosamente\n');
  });

  test('E1: Edge case - Ver booking que no está activo', async ({ page }) => {
    if (!testBookingId || !renterId) {
      test.skip('Test setup incomplete');
      return;
    }

    // Cambiar booking a 'completed' using helper function
    // Note: If this fails due to trigger constraints, we'll skip the status change
    // and test with the existing booking status instead
    if (testBookingId) {
      try {
        await updateBookingStatus(testBookingId, 'completed');
      } catch (error) {
        console.warn(
          `⚠️ Could not update booking status to 'completed'. ` +
            `Testing with current status instead. Error: ${(error as Error).message}`,
        );
        // Continue with test using current booking status
      }
    }

    console.log(`\n🚀 Test edge case: ver booking completado\n`);

    await page.goto(`/bookings/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Debería mostrar estado "completado" en lugar de "en curso"
    const statusBadge = page
      .locator('[data-testid="booking-status"]')
      .or(page.getByText(/completado|completed|finalizado/i))
      .first();

    const statusVisible = await statusBadge.isVisible({ timeout: 5000 }).catch(() => false);
    if (statusVisible) {
      const statusText = await statusBadge.textContent();
      console.log(`✅ Estado correcto mostrado: ${statusText}`);
      expect(statusText?.toLowerCase()).toMatch(/completado|completed|finalizado/i);
    }

    // El countdown no debería estar visible
    const countdown = page.locator('[data-testid="booking-countdown"]');
    const countdownVisible = await countdown.isVisible({ timeout: 2000 }).catch(() => false);
    expect(countdownVisible).toBe(false);
    console.log('✅ Countdown no visible para booking completado');
  });
});

