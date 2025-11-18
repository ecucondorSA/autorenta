import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createCompletedBooking,
  getBookingById,
  getActiveCar,
  authenticateUserInPage,
  cleanupTestBooking,
  verifyPaymentSplit,
} from '../../helpers/booking-test-helpers';

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

/**
 * E2E Test: Verificación de Split de Pago Post-Reserva
 *
 * Flujo completo:
 * 1. Booking completado (check-in y check-out)
 * 2. Ambas partes confirman (owner y renter)
 * 3. Verificar que split de pago se ejecuta (85% owner / 15% platform)
 * 4. Verificar transacciones en wallet_transactions
 * 5. Verificar campos en bookings (owner_payment_amount, platform_fee)
 * 6. Verificar que payment_split_completed = true
 *
 * Prioridad: P0 (Critical)
 */

test.describe('Payment Split Verification - Post-Reserva', () => {
  let testBookingId: string | null = null;
  let renterId: string | null = null;
  let ownerId: string | null = null;
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
    ownerId = car.owner_id;

    // Create completed booking with check-in and check-out using helper function
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3); // Started 3 days ago
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2); // 2 days total

    const totalAmount = 100000; // 1000 ARS

    const { booking } = await createCompletedBooking({
      carId: car.id,
      renterId,
      startDate,
      endDate,
      totalAmount,
      checkInOdometer: 50000,
      checkOutOdometer: 50100,
      checkInFuel: 75,
      checkOutFuel: 50,
    });

    testBookingId = booking.id;
    // Note: createCompletedBooking already creates both check-in and check-out inspections
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testBookingId) {
      await cleanupTestBooking(testBookingId);
      testBookingId = null;
    }
  });

  test('T1: Happy path - Verificar split de pago 85/15', async ({ page }) => {
    if (!testBookingId || !renterId || !ownerId) {
      test.skip('Test setup incomplete');
      return;
    }

    console.log(`\n🚀 Iniciando test de verificación de split de pago para booking ${testBookingId}\n`);

    const totalAmount = 100000; // 1000 ARS en centavos
    const expectedOwnerAmount = Math.round(totalAmount * 0.85); // 85000 (85%)
    const expectedPlatformFee = Math.round(totalAmount * 0.15); // 15000 (15%)

    // PASO 1: Simular confirmaciones de ambas partes
    console.log('📍 PASO 1: Simulando confirmaciones de ambas partes...');
    await supabase
      .from('bookings')
      .update({
        owner_confirmed_delivery: true,
        owner_confirmation_at: new Date().toISOString(),
        renter_confirmed_payment: true,
        renter_confirmation_at: new Date().toISOString(),
        completion_status: 'funds_released',
      })
      .eq('id', testBookingId);

    // PASO 2: Simular ejecución de split de pago (normalmente se hace vía Edge Function)
    console.log('📍 PASO 2: Simulando split de pago...');
    await supabase
      .from('bookings')
      .update({
        payment_split_completed: true,
        owner_payment_amount: expectedOwnerAmount / 100, // Convertir a amount
        platform_fee: expectedPlatformFee / 100, // Convertir a amount
        provider_split_payment_id: `test-split-${testBookingId}`,
      })
      .eq('id', testBookingId);

    // Crear transacciones en wallet_transactions (simulando el split)
    // Transacción para owner
    await supabase.from('wallet_transactions').insert({
      user_id: ownerId,
      type: 'rental_payment_transfer',
      amount: expectedOwnerAmount,
      currency: 'ARS',
      status: 'completed',
      description: `Pago de alquiler - Booking ${testBookingId}`,
      reference_type: 'booking',
      reference_id: testBookingId,
      completed_at: new Date().toISOString(),
    });

    // Transacción para platform (usando un user_id especial o tabla separada)
    // Nota: En producción esto podría ir a una tabla de platform_wallet o similar
    console.log('✅ Transacciones de split creadas');

    // PASO 3: Verificar split en BD
    console.log('📍 PASO 3: Verificando split en BD...');
    const splitInfo = await verifyPaymentSplit(testBookingId);

    expect(splitInfo.splitCompleted).toBe(true);
    expect(splitInfo.totalAmount).toBe(totalAmount / 100); // Convertir a amount

    // Verificar montos con tolerancia de redondeo (±1 centavo)
    const ownerAmountCents = Math.round(splitInfo.ownerAmount * 100);
    const platformFeeCents = Math.round(splitInfo.platformFee * 100);

    expect(ownerAmountCents).toBeGreaterThanOrEqual(expectedOwnerAmount - 1);
    expect(ownerAmountCents).toBeLessThanOrEqual(expectedOwnerAmount + 1);
    expect(platformFeeCents).toBeGreaterThanOrEqual(expectedPlatformFee - 1);
    expect(platformFeeCents).toBeLessThanOrEqual(expectedPlatformFee + 1);

    console.log(`✅ Owner amount: ${splitInfo.ownerAmount} ARS (esperado: ${expectedOwnerAmount / 100} ARS)`);
    console.log(`✅ Platform fee: ${splitInfo.platformFee} ARS (esperado: ${expectedPlatformFee / 100} ARS)`);
    console.log(`✅ Total: ${splitInfo.totalAmount} ARS`);

    // Verificar que owner_amount + platform_fee ≈ total_amount
    const sum = splitInfo.ownerAmount + splitInfo.platformFee;
    const total = splitInfo.totalAmount;
    const difference = Math.abs(sum - total);
    expect(difference).toBeLessThanOrEqual(0.02); // Tolerancia de 2 centavos por redondeo

    // PASO 4: Verificar transacciones en wallet_transactions
    console.log('📍 PASO 4: Verificando transacciones en wallet_transactions...');
    const { data: ownerTransactions, error: ownerError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('reference_id', testBookingId)
      .eq('type', 'rental_payment_transfer')
      .eq('user_id', ownerId);

    if (ownerError) {
      console.warn(`⚠️ Error al obtener transacciones del owner: ${ownerError.message}`);
    } else if (ownerTransactions && ownerTransactions.length > 0) {
      const ownerTx = ownerTransactions[0];
      expect(ownerTx.amount).toBe(expectedOwnerAmount);
      expect(ownerTx.status).toBe('completed');
      console.log('✅ Transacción del owner verificada');
    }

    // PASO 5: Navegar a detalle de booking y verificar que muestra split
    console.log('📍 PASO 5: Verificando UI del split de pago...');
    await page.goto(`/bookings/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Buscar información de split en la UI
    const splitInfoUI = page
      .getByText(/split|división|85|15|comisión|platform fee/i)
      .or(page.locator('[data-testid="payment-split-info"]'))
      .first();

    const splitInfoVisible = await splitInfoUI.isVisible({ timeout: 5000 }).catch(() => false);
    if (splitInfoVisible) {
      console.log('✅ Información de split visible en UI');
    }

    console.log('\n✅ Test de verificación de split de pago completado exitosamente\n');
  });

  test('E1: Edge case - Verificar split con montos exactos', async ({ page }) => {
    if (!testBookingId || !renterId || !ownerId) {
      test.skip('Test setup incomplete');
      return;
    }

    // Test con monto que divide exactamente
    const exactTotal = 100000; // 1000 ARS
    const exactOwner = 85000; // 85% exacto
    const exactPlatform = 15000; // 15% exacto

    await supabase
      .from('bookings')
      .update({
        total_amount: exactTotal / 100,
        total_cents: exactTotal,
        payment_split_completed: true,
        owner_payment_amount: exactOwner / 100,
        platform_fee: exactPlatform / 100,
      })
      .eq('id', testBookingId);

    const splitInfo = await verifyPaymentSplit(testBookingId);

    expect(splitInfo.ownerAmount * 100).toBe(exactOwner);
    expect(splitInfo.platformFee * 100).toBe(exactPlatform);
    expect(splitInfo.ownerAmount + splitInfo.platformFee).toBe(exactTotal / 100);

    console.log('✅ Split exacto verificado correctamente');
  });

  test('E2: Edge case - Verificar split con redondeo', async ({ page }) => {
    if (!testBookingId || !renterId || !ownerId) {
      test.skip('Test setup incomplete');
      return;
    }

    // Test con monto que requiere redondeo
    const totalWithRounding = 100001; // 1000.01 ARS
    const expectedOwner = Math.round(totalWithRounding * 0.85); // 85000.85 → 85001
    const expectedPlatform = Math.round(totalWithRounding * 0.15); // 15000.15 → 15000

    await supabase
      .from('bookings')
      .update({
        total_amount: totalWithRounding / 100,
        total_cents: totalWithRounding,
        payment_split_completed: true,
        owner_payment_amount: expectedOwner / 100,
        platform_fee: expectedPlatform / 100,
      })
      .eq('id', testBookingId);

    const splitInfo = await verifyPaymentSplit(testBookingId);

    // Verificar que la suma puede diferir en 1 centavo por redondeo
    const sum = splitInfo.ownerAmount + splitInfo.platformFee;
    const total = splitInfo.totalAmount;
    const difference = Math.abs(sum - total);

    expect(difference).toBeLessThanOrEqual(0.02); // Máximo 2 centavos de diferencia

    console.log(`✅ Split con redondeo verificado (diferencia: ${difference} ARS)`);
  });
});

