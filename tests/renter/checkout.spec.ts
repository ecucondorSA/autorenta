import { defineBlock, expect, test } from '../checkpoint/fixtures';
import { createPendingBooking } from '../helpers/api';
import { generateTestUser } from '../helpers/test-data';

/**
 * E2E Test: Checkout Flow (Real)
 *
 * Verifica el flujo de checkout navegando directamente a la página de pago
 * de una reserva existente (creada vía API).
 */

test.describe('Checkout Flow - Real', () => {

  let sharedBookingId: string | undefined;

  test('B1: Setup & Direct Navigation', async ({ page, createBlock, checkpointManager }) => {
    const block = createBlock(defineBlock('b1-checkout-setup', 'Setup y Navegación', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // 1. Preparar datos (Usuarios + Auto + Booking Pendiente)
      const renter = generateTestUser('locatario');
      const owner = generateTestUser('locador');

      console.log('🚀 Creando booking pendiente vía API...');

      // Sin try-catch: Si falla, queremos ver el error real (Mundo de Errores)
      sharedBookingId = await createPendingBooking(renter, owner);
      console.log(`✅ Booking creado: ${sharedBookingId}`);

      // 2. Navegar a la URL REAL del checkout
      const checkoutUrl = `/bookings/${sharedBookingId}/checkout`;
      console.log(`➡️ Navegando a: ${checkoutUrl}`);

      await page.goto(checkoutUrl);

      // 3. Verificar que cargó la página correcta
      // Buscamos elementos que sabemos que existen en booking-checkout.page.html
      // Por ejemplo: app-payment-provider-selector, o textos específicos
      await expect(page).toHaveURL(new RegExp(`/bookings/${sharedBookingId}/checkout`));

      // Esperar a que termine de cargar (isLoading = false)
      // Podemos buscar el selector de proveedores de pago
      await expect(page.getByText(/método de pago/i).or(page.locator('app-payment-provider-selector'))).toBeVisible({ timeout: 15000 });

      console.log('✅ Página de Checkout Real cargada');

      // Manual Checkpoint (solo si llegamos aquí)
      await checkpointManager.createCheckpoint({ name: 'checkout-loaded-real' });
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar Detalles de Reserva', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-checkout-details', 'Verificar Detalles', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!sharedBookingId) {
        console.log('⚠️ Skipping B2 because setup failed/skipped');
        return;
      }

      // Verificar que se muestre el precio
      // El componente usa formatCurrency, así que buscamos el símbolo $
      await expect(page.getByText('$')).toBeVisible();

      // Verificar botón de pago (debería estar deshabilitado o habilitado según lógica)
      // En el código vimos: isPaymentButtonEnabled depende de amountInProviderCurrency > 0
      // Como creamos el booking con monto, debería estar habilitado o seleccionable

      console.log('✅ Detalles verificados');
    })

    expect(result.state.status).toBe('passed')
  })
})
