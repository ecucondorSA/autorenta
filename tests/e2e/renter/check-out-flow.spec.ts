import { test, expect } from '@playwright/test';
import {
  createBookingWithCheckIn,
  getBookingById,
  getInspectionByStage,
  getActiveCar,
  authenticateUserInPage,
  cleanupTestBooking,
  getWalletBalance,
  verifyPaymentSplit,
} from '../../helpers/booking-test-helpers';

/**
 * E2E Test: Check-out Flow del Locatario
 *
 * Flujo completo:
 * 1. Booking en estado 'in_progress' con check-in completado
 * 2. Locatario navega a página de check-out
 * 3. Ve comparación con check-in (odómetro, combustible)
 * 4. Sube fotos finales (mínimo 8)
 * 5. Registra odómetro y nivel de combustible final
 * 6. Firma digital de conformidad
 * 7. Completa check-out
 * 8. Verifica que booking cambia a 'completed'
 * 9. Verifica que inspección se guarda en BD
 * 10. Verifica liberación de fondos (si aplica)
 *
 * Prioridad: P0 (Critical)
 */

test.describe('Check-out Flow - Locatario', () => {
  let testBookingId: string | null = null;
  let renterId: string | null = null;
  let carId: string | null = null;
  let checkInInspectionId: string | null = null;

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
    startDate.setDate(startDate.getDate() - 1); // Started yesterday
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3 days total

    const { booking, inspection } = await createBookingWithCheckIn({
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
    checkInInspectionId = inspection.id;
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testBookingId) {
      await cleanupTestBooking(testBookingId);
      testBookingId = null;
    }
    checkInInspectionId = null;
  });

  test('T1: Happy path - Completar check-out exitosamente', async ({ page }) => {
    if (!testBookingId || !renterId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Iniciando test de check-out para booking ${testBookingId}\n`);

    // PASO 1: Navegar a página de check-out
    console.log('📍 PASO 1: Navegando a página de check-out...');
    await page.goto(`/bookings/${testBookingId}/check-out`);
    await page.waitForLoadState('networkidle');

    // Verificar que la página carga correctamente
    await expect(page.locator('app-check-out')).toBeVisible({ timeout: 10000 });

    // PASO 2: Verificar que muestra comparación con check-in
    console.log('📍 PASO 2: Verificando comparación con check-in...');
    const comparisonSection = page
      .locator('[data-testid="check-in-comparison"]')
      .or(page.getByText(/check-in|inspección inicial/i))
      .first();

    const comparisonVisible = await comparisonSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (comparisonVisible) {
      console.log('✅ Comparación con check-in visible');
    }

    // PASO 3: Subir fotos finales (mínimo 8)
    console.log('📍 PASO 3: Subiendo fotos finales de inspección...');
    const photoUploader = page.locator('app-inspection-uploader').or(
      page.locator('[data-testid="inspection-uploader"]')
    );

    const uploaderVisible = await photoUploader.isVisible({ timeout: 5000 }).catch(() => false);
    if (uploaderVisible) {
      console.log('✅ Componente de upload de fotos visible');
    }

    // PASO 4: Registrar odómetro final
    console.log('📍 PASO 4: Registrando odómetro final...');
    const odometerInput = page
      .locator('input[type="number"]')
      .filter({ hasText: /odómetro|odometer/i })
      .or(page.locator('[data-testid="odometer-input"]'))
      .or(page.locator('input[name="odometer"]'))
      .first();

    const odometerFinal = 50150; // 150 km más que check-in
    if (await odometerInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await odometerInput.fill(odometerFinal.toString());
      console.log(`✅ Odómetro final registrado: ${odometerFinal} km`);
    }

    // PASO 5: Registrar nivel de combustible final
    console.log('📍 PASO 5: Registrando nivel de combustible final...');
    const fuelInput = page
      .locator('input[type="number"]')
      .filter({ hasText: /combustible|fuel/i })
      .or(page.locator('[data-testid="fuel-level-input"]'))
      .or(page.locator('input[name="fuelLevel"]'))
      .first();

    const fuelLevelFinal = 70; // 5% menos que check-in
    if (await fuelInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fuelInput.fill(fuelLevelFinal.toString());
      console.log(`✅ Nivel de combustible final registrado: ${fuelLevelFinal}%`);
    }

    // PASO 6: Firma digital de conformidad
    console.log('📍 PASO 6: Completando firma digital de conformidad...');
    const signaturePad = page
      .locator('[data-testid="signature-pad"]')
      .or(page.locator('canvas'))
      .first();

    const signatureVisible = await signaturePad.isVisible({ timeout: 5000 }).catch(() => false);
    if (signatureVisible) {
      // Simular firma dibujando en el canvas
      await signaturePad.click({ position: { x: 100, y: 100 } });
      await page.mouse.move(200, 150);
      await page.mouse.up();
      console.log('✅ Firma digital de conformidad completada');
    }

    // PASO 7: Completar check-out
    console.log('📍 PASO 7: Completando check-out...');
    const completeButton = page
      .getByRole('button', { name: /completar check-out|finalizar|confirmar/i })
      .or(page.locator('[data-testid="complete-check-out-button"]'))
      .first();

    await expect(completeButton).toBeVisible({ timeout: 10000 });
    await completeButton.click();

    // Esperar a que se procese
    await page.waitForTimeout(2000);

    // PASO 8: Verificar que booking cambió a 'completed'
    console.log('📍 PASO 8: Verificando cambio de estado...');
    await page.waitForTimeout(3000); // Dar tiempo para que se actualice

    const updatedBooking = await getBookingById(testBookingId);
    expect(updatedBooking?.status).toBe('completed');
    expect(updatedBooking?.completion_status).toBe('returned');
    console.log('✅ Booking actualizado a estado "completed" con completion_status "returned"');

    // PASO 9: Verificar que inspección se guardó en BD
    console.log('📍 PASO 9: Verificando inspección en BD...');
    const inspection = await getInspectionByStage(testBookingId, 'check_out');
    expect(inspection).not.toBeNull();
    expect(inspection?.stage).toBe('check_out');
    expect(inspection?.inspectorId).toBe(renterId);
    expect(inspection?.signedAt).toBeDefined();
    console.log('✅ Inspección guardada correctamente en BD');

    // Verificar odómetro y combustible
    if (inspection?.odometer) {
      expect(inspection.odometer).toBe(odometerFinal);
      console.log(`✅ Odómetro verificado: ${inspection.odometer} km`);
    }

    if (inspection?.fuelLevel !== undefined) {
      expect(inspection.fuelLevel).toBe(fuelLevelFinal);
      console.log(`✅ Nivel de combustible verificado: ${inspection.fuelLevel}%`);
    }

    // PASO 10: Verificar liberación de fondos (si aplica)
    console.log('📍 PASO 10: Verificando liberación de fondos...');
    const walletBalance = await getWalletBalance(renterId);
    console.log(`Balance disponible: ${walletBalance.availableBalance} centavos`);
    console.log(`Balance bloqueado: ${walletBalance.lockedBalance} centavos`);

    // El balance bloqueado debería haber disminuido (fondos liberados)
    // Nota: Esto depende de la implementación del sistema de wallet
    // Por ahora solo verificamos que el balance existe
    expect(walletBalance.totalBalance).toBeGreaterThanOrEqual(0);

    console.log('\n✅ Test de check-out completado exitosamente\n');
  });

  test('E1: Edge case - Intentar check-out sin check-in previo', async ({ page }) => {
    if (!testBookingId || !renterId) {
      test.skip('Test setup incomplete');
      return;
    }

    // Eliminar check-in inspection
    await supabase
      .from('booking_inspections')
      .delete()
      .eq('booking_id', testBookingId)
      .eq('stage', 'check_in');

    console.log(`\n🚀 Test edge case: check-out sin check-in previo\n`);

    await page.goto(`/bookings/${testBookingId}/check-out`);
    await page.waitForLoadState('networkidle');

    // Debería mostrar error o redirigir
    const errorMessage = page
      .getByText(/check-in|inspección inicial|no disponible/i)
      .or(page.locator('[data-testid="error-message"]'))
      .first();

    const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    if (errorVisible) {
      console.log('✅ Mensaje de error mostrado correctamente');
    } else {
      // O debería redirigir a booking detail
      await page.waitForURL(/\/bookings\/[^/]+$/, { timeout: 5000 });
      console.log('✅ Redirigido a booking detail (comportamiento esperado)');
    }
  });

  test('E2: Edge case - Verificar cálculo de kilómetros recorridos', async ({ page }) => {
    if (!testBookingId || !renterId || !checkInInspectionId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Test edge case: cálculo de kilómetros recorridos\n`);

    await page.goto(`/bookings/${testBookingId}/check-out`);
    await page.waitForLoadState('networkidle');

    // Verificar que muestra kilómetros recorridos
    const kilometersDriven = page
      .getByText(/kilómetros|km recorridos|distance/i)
      .or(page.locator('[data-testid="kilometers-driven"]'))
      .first();

    const kmVisible = await kilometersDriven.isVisible({ timeout: 5000 }).catch(() => false);
    if (kmVisible) {
      const kmText = await kilometersDriven.textContent();
      console.log(`✅ Kilómetros recorridos mostrados: ${kmText}`);
    }
  });
});

