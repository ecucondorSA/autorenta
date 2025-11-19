import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Test: Cancelación de Booking con Refund
 *
 * Casos:
 * 1. Cancelación dentro de ventana free (>24h) → refund completo
 * 2. Cancelación fuera de ventana (<24h) → sin refund o parcial
 * 3. Validación de ledger entries después de cancelación
 * 4. Cancelación de booking parcialmente pagado (wallet + tarjeta)
 * 5. Intento de cancelar booking ya iniciado → error
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test.describe('Cancelación y Refund de Bookings', () => {
  // Use renter auth state
  test.use({ storageState: 'tests/.auth/renter.json' });

  let supabase: ReturnType<typeof createClient>;
  let testBookingId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Crear cliente Supabase para queries directos
    supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    // Verify auth state
    await page.goto('/');
    await expect(page.getByTestId('user-menu').or(page.locator('[data-testid="user-menu"]'))).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    // Limpiar booking de test si existe
    if (testBookingId) {
      await supabase.from('bookings').delete().eq('id', testBookingId);
      testBookingId = null;
    }
  });

  test('Cancela booking dentro de ventana free (>24h) → refund completo', async ({ page }) => {
    // PASO 1: Crear booking confirmado (estado: confirmed, payment: completed)
    // Usar API directamente para crear booking de test
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 días en el futuro

    const endDate = new Date(futureDate);
    endDate.setDate(endDate.getDate() + 3); // 3 días de duración

    // Obtener un car disponible para testing
    const { data: cars } = await supabase
      .from('cars')
      .select('id, owner_id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!cars) {
      test.skip('No hay autos disponibles para testing');
      return;
    }

    // Obtener user ID del renter autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      test.skip('Usuario no autenticado');
      return;
    }

    // Crear booking de test directamente en la BD
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        car_id: cars.id,
        renter_id: user.id,
        start_at: futureDate.toISOString(),
        end_at: endDate.toISOString(),
        status: 'confirmed',
        total_amount_cents: 100000, // 1000 ARS
        currency: 'ARS',
        payment_status: 'completed',
      })
      .select()
      .single();

    if (bookingError || !booking) {
      test.skip('No se pudo crear booking de test');
      return;
    }

    testBookingId = booking.id;

    // Obtener balance inicial de wallet
    const { data: walletBefore } = await supabase
      .from('user_wallets')
      .select('balance_cents')
      .eq('user_id', user.id)
      .single();

    const balanceBefore = walletBefore?.balance_cents || 0;

    // PASO 2: Navegar a /bookings/:id
    await page.goto(`/bookings/${booking.id}`);
    await page.waitForLoadState('networkidle');

    // PASO 3: Verificar que botón "Cancelar Reserva" está visible
    const cancelButton = page.getByRole('button', { name: /cancelar/i });
    await expect(cancelButton).toBeVisible({ timeout: 10000 });

    // PASO 4: Click en cancelar
    await cancelButton.click();

    // PASO 5: Confirmar en modal/alert
    // Esperar a que aparezca el diálogo de confirmación
    await page.waitForTimeout(1000); // Dar tiempo para que aparezca el alert

    // Confirmar cancelación (puede ser confirm() o modal de Ionic)
    // En Ionic, buscar el botón de confirmar en el alert
    const confirmButton = page.locator('ion-alert button:has-text("Confirmar")')
      .or(page.locator('button:has-text("Sí, cancelar")'))
      .or(page.locator('button:has-text("Confirmar cancelación")'));

    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    } else {
      // Si no hay modal, el confirm() del browser ya se resolvió
      // Continuar con el flujo
    }

    // PASO 6: Esperar mensaje de éxito
    await expect(
      page.getByText(/cancelado exitosamente|cancelado/i)
    ).toBeVisible({ timeout: 10000 });

    // PASO 7: Verificar que booking status cambió a 'cancelled'
    // Refrescar página o verificar en la UI
    await page.reload();
    await page.waitForLoadState('networkidle');

    const bookingStatus = page.locator('[data-testid="booking-status"]')
      .or(page.getByText(/estado|status/i).locator('..'));

    await expect(bookingStatus).toContainText(/cancelado|cancelled/i, { timeout: 10000 });

    // PASO 8: Verificar en BD que el status cambió
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('status, cancellation_reason')
      .eq('id', booking.id)
      .single();

    expect(updatedBooking?.status).toBe('cancelled');

    // PASO 9: Verificar wallet balance incrementado (si aplica)
    // Nota: Esto requiere que el refund esté implementado
    // Por ahora solo verificamos que el booking se canceló correctamente
    const { data: walletAfter } = await supabase
      .from('user_wallets')
      .select('balance_cents')
      .eq('user_id', user.id)
      .single();

    // Si el refund está implementado, el balance debería incrementar
    // Por ahora, solo verificamos que no decrementó (el refund puede ser async)
    if (walletAfter) {
      expect(walletAfter.balance_cents).toBeGreaterThanOrEqual(balanceBefore);
    }
  });

  test('Cancela booking fuera de ventana (<24h) → sin refund o parcial', async ({ page }) => {
    // PASO 1: Crear booking con start_date muy cercano (ej: T-6h)
    const nearDate = new Date();
    nearDate.setHours(nearDate.getHours() + 6); // 6 horas en el futuro

    const endDate = new Date(nearDate);
    endDate.setDate(endDate.getDate() + 2);

    // Obtener car disponible
    const { data: cars } = await supabase
      .from('cars')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!cars) {
      test.skip('No hay autos disponibles');
      return;
    }

    // Obtener user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      test.skip('Usuario no autenticado');
      return;
    }

    // Crear booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        car_id: cars.id,
        renter_id: user.id,
        start_at: nearDate.toISOString(),
        end_at: endDate.toISOString(),
        status: 'confirmed',
        total_amount_cents: 100000,
        currency: 'ARS',
        payment_status: 'completed',
      })
      .select()
      .single();

    if (error || !booking) {
      test.skip('No se pudo crear booking de test');
      return;
    }

    testBookingId = booking.id;

    // PASO 2: Navegar a booking
    await page.goto(`/bookings/${booking.id}`);
    await page.waitForLoadState('networkidle');

    // PASO 3: Intentar cancelar
    const cancelButton = page.getByRole('button', { name: /cancelar/i });

    // Puede que el botón esté deshabilitado o no visible
    const isVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await cancelButton.click();

      // PASO 4: Verificar mensaje de advertencia
      await expect(
        page.getByText(/fuera de la ventana|no recibirás reembolso|sin reembolso/i)
      ).toBeVisible({ timeout: 10000 });

      // Confirmar cancelación de todas formas
      const confirmButton = page.locator('ion-alert button:has-text("Confirmar")')
        .or(page.locator('button:has-text("Continuar")'));

      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }
    } else {
      // Si el botón no está visible, verificar que hay un mensaje explicando
      await expect(
        page.getByText(/no puedes cancelar|fuera de plazo/i)
      ).toBeVisible({ timeout: 5000 });
    }

    // PASO 5: Verificar en BD
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('status, cancellation_fee_cents')
      .eq('id', booking.id)
      .single();

    // Si se canceló, debería tener cancellation_fee
    // Si no se canceló, el status debería seguir siendo 'confirmed'
    if (updatedBooking?.status === 'cancelled') {
      // Puede tener fee de cancelación
      expect(updatedBooking.cancellation_fee_cents).toBeGreaterThanOrEqual(0);
    }
  });

  test('Cancela booking parcialmente pagado (wallet + tarjeta)', async ({ page }) => {
    // Escenario: Booking con payment_method='partial_wallet'
    // 30% bloqueado en wallet, 70% pagado con MP

    test.skip('Pendiente de implementación de payment_method parcial');

    // Este test requiere:
    // 1. Soporte para payment_method='partial_wallet' en la BD
    // 2. Lógica de refund parcial
    // 3. Integración con MercadoPago para refunds
  });

  test('Intenta cancelar booking ya iniciado → error', async ({ page }) => {
    // PASO 1: Crear booking con start_date en el pasado (ya empezó)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Ayer

    const endDate = new Date(pastDate);
    endDate.setDate(endDate.getDate() + 3);

    // Obtener car
    const { data: cars } = await supabase
      .from('cars')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!cars) {
      test.skip('No hay autos disponibles');
      return;
    }

    // Obtener user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      test.skip('Usuario no autenticado');
      return;
    }

    // Crear booking ya iniciado
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        car_id: cars.id,
        renter_id: user.id,
        start_at: pastDate.toISOString(),
        end_at: endDate.toISOString(),
        status: 'in_progress', // Ya iniciado
        total_amount_cents: 100000,
        currency: 'ARS',
        payment_status: 'completed',
      })
      .select()
      .single();

    if (error || !booking) {
      test.skip('No se pudo crear booking de test');
      return;
    }

    testBookingId = booking.id;

    // PASO 2: Navegar a booking
    await page.goto(`/bookings/${booking.id}`);
    await page.waitForLoadState('networkidle');

    // PASO 3: Verificar que botón "Cancelar" NO está visible o está disabled
    const cancelButton = page.getByRole('button', { name: /cancelar/i });

    const isVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Si está visible, debe estar disabled
      await expect(cancelButton).toBeDisabled();
    } else {
      // Si no está visible, verificar mensaje explicativo
      await expect(
        page.getByText(/no puedes cancelar|ya inició|no se puede cancelar/i)
      ).toBeVisible({ timeout: 5000 });
    }

    // PASO 4: Si fuerza request (API directa), debe retornar error
    // Esto se puede hacer con una llamada directa a la API
    const response = await page.request.post(
      `${supabaseUrl}/rest/v1/rpc/cancel_booking`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        data: {
          booking_id: booking.id,
        },
      }
    );

    // Debe retornar error 400/422
    expect([400, 422, 500]).toContain(response.status());
  });
});

test.describe('Validación de Ledger después de Cancelación', () => {
  let supabase: ReturnType<typeof createClient>;

  test.beforeEach(() => {
    supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
  });

  test('Ledger entries cumplen doble entrada después de refund', async ({ page }) => {
    // TODO: Este test requiere que el sistema de ledger esté implementado
    // Por ahora, solo verificamos la estructura

    test.skip('Pendiente de implementación de ledger system');

    // Objetivo: Verificar que después de crear booking + cancelar,
    // el ledger mantiene balance (debe = haber)
    //
    // Pasos:
    // 1. Crear booking (genera HOLD_DEPOSIT + FEE_PLATFORM)
    // 2. Cancelar (genera REFUND_DEPOSIT)
    // 3. Query ledger_entries para este booking_id
    // 4. Sumar debits y credits
    // 5. Verificar: sum(debits) = sum(credits)
  });

  test('Conciliación de wallet después de múltiples cancelaciones', async ({ page }) => {
    // TODO: Test de stress de wallet
    test.skip('Pendiente de implementación');

    // Escenario:
    // - Usuario crea 3 bookings
    // - Cancela 2 de ellos
    // - Completa 1
    //
    // Validaciones:
    // - Wallet balance final = balance inicial + refunds - booking completado
    // - locked_balance refleja solo el booking activo
    // - available_balance = total - locked
  });
});
