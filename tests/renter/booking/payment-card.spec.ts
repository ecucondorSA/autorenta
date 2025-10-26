import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Flujo Consolidado de Pago - Tarjeta de Crédito
 * 
 * Objetivo: Validar que el flujo de pago con tarjeta funciona correctamente
 * desde la página de detail-payment hasta MercadoPago y de vuelta a success.
 * 
 * Flujo:
 * 1. Usuario llega a detail-payment con datos de reserva
 * 2. Selecciona método de pago "tarjeta"
 * 3. Autoriza hold de $1 USD
 * 4. Acepta términos
 * 5. Click "Confirmar y Pagar"
 * 6. Ve estados: "Creando reserva..." → "Procesando pago..."
 * 7. Redirige a MercadoPago
 * 8. (Simula pago en MP)
 * 9. Callback redirige a /bookings/success/:id
 * 10. Ve confirmación con detalles
 */

test.describe('Flujo Consolidado de Pago - Tarjeta', () => {
  test.beforeEach(async ({ page }) => {
    // Usuario autenticado vía storageState
  });

  test('Debe completar pago con tarjeta exitosamente', async ({ page }) => {
    // PASO 1: Navegar a detail-payment
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Esperar que la página cargue
    await expect(page.getByText('Completa tu Reserva')).toBeVisible({ timeout: 10000 });

    // PASO 2: Seleccionar método de pago "tarjeta"
    const cardOption = page.getByRole('button', { name: /tarjeta|card/i });
    await cardOption.click();
    await expect(cardOption).toHaveClass(/selected|active/);

    // PASO 3: Autorizar hold de $1 USD
    const authorizeHoldBtn = page.getByRole('button', { name: /autorizar.*hold|authorize.*hold/i });
    await authorizeHoldBtn.click();
    
    // Puede abrir modal de MercadoPago para autorizar
    // Esperar confirmación de hold autorizado
    await expect(page.getByText(/hold autorizado|hold authorized/i)).toBeVisible({ timeout: 10000 });

    // PASO 4: Aceptar términos y condiciones
    const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos/i });
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();

    // PASO 5: Click en "Confirmar y Pagar"
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i });
    await expect(confirmButton).toBeEnabled();
    
    // Preparar para interceptar redirección a MercadoPago
    const mpRedirectPromise = page.waitForURL(/mercadopago\.com|mpago\.la/, { 
      timeout: 15000 
    });
    
    await confirmButton.click();

    // PASO 6: Verificar estado "Creando reserva..."
    await expect(page.getByText('Creando reserva...')).toBeVisible({ timeout: 3000 });

    // PASO 7: Verificar estado "Procesando pago..."
    await expect(page.getByText('Procesando pago...')).toBeVisible({ timeout: 5000 });

    // PASO 8: Esperar redirección a MercadoPago
    await mpRedirectPromise;
    
    // Verificar que estamos en MercadoPago
    expect(page.url()).toMatch(/mercadopago\.com|mpago\.la/);

    // PASO 9: Simular pago exitoso en MercadoPago
    // En un test real, interactuarías con el formulario de MP
    // Aquí simulamos el callback exitoso
    await simulateMercadoPagoCallback(page, 'approved');

    // PASO 10: Esperar redirección a success page
    await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 15000 });

    // PASO 11: Verificar página de éxito
    await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible();
    
    // Verificar ícono de éxito
    await expect(page.locator('ion-icon[name="checkmark-circle"]')).toBeVisible();

    // Verificar detalles
    await expect(page.getByText(/detalles de tu reserva/i)).toBeVisible();
    await expect(page.getByText(/total pagado:/i)).toBeVisible();
  });

  test('Debe manejar pago rechazado en MercadoPago', async ({ page }) => {
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Seleccionar tarjeta
    await page.getByRole('button', { name: /tarjeta/i }).click();
    
    // Autorizar hold
    await page.getByRole('button', { name: /autorizar.*hold/i }).click();
    await expect(page.getByText(/hold autorizado/i)).toBeVisible({ timeout: 10000 });
    
    // Aceptar términos
    await page.getByRole('checkbox', { name: /acepto/i }).check();
    
    // Click confirmar
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i });
    await confirmButton.click();
    
    // Esperar redirección a MP
    await page.waitForURL(/mercadopago\.com|mpago\.la/, { timeout: 15000 });
    
    // Simular pago rechazado
    await simulateMercadoPagoCallback(page, 'rejected');
    
    // Debe redirigir a página de error o mostrar mensaje
    await expect(page.getByText(/pago rechazado|payment rejected|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('Debe cancelar correctamente si usuario vuelve sin pagar', async ({ page }) => {
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Completar flujo hasta llegar a MP
    await page.getByRole('button', { name: /tarjeta/i }).click();
    await page.getByRole('button', { name: /autorizar.*hold/i }).click();
    await expect(page.getByText(/hold autorizado/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('checkbox', { name: /acepto/i }).check();
    await page.getByRole('button', { name: /confirmar y pagar/i }).click();
    
    // Esperar redirección a MP
    await page.waitForURL(/mercadopago\.com|mpago\.la/, { timeout: 15000 });
    
    // Usuario cancela y vuelve
    await page.goBack();
    
    // Verificar que puede reintentar
    await expect(page.getByRole('button', { name: /confirmar y pagar/i })).toBeEnabled();
  });

  test('Debe mostrar error si falla creación de preferencia', async ({ page }) => {
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Interceptar API de MercadoPago y hacer fallar
    await page.route('**/api/mercadopago/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'MP API Error' })
      });
    });
    
    // Completar flujo
    await page.getByRole('button', { name: /tarjeta/i }).click();
    await page.getByRole('button', { name: /autorizar.*hold/i }).click();
    await expect(page.getByText(/hold autorizado/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('checkbox', { name: /acepto/i }).check();
    await page.getByRole('button', { name: /confirmar y pagar/i }).click();
    
    // Esperar error
    await expect(page.getByText(/error.*mercadopago|error.*pago/i)).toBeVisible({ timeout: 10000 });
    
    // No debe haber navegado
    expect(page.url()).toContain('/bookings/detail-payment');
  });

  test('Debe validar que hold esté autorizado antes de confirmar', async ({ page }) => {
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Seleccionar tarjeta pero NO autorizar hold
    await page.getByRole('button', { name: /tarjeta/i }).click();
    
    // Aceptar términos
    await page.getByRole('checkbox', { name: /acepto/i }).check();
    
    // Botón de confirmar debe estar deshabilitado
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i });
    await expect(confirmButton).toBeDisabled();
    
    // Verificar mensaje de ayuda
    await expect(page.getByText(/debes autorizar el hold|authorize hold first/i)).toBeVisible();
  });
});

/**
 * Helper: Simular callback de MercadoPago
 * En un test real, esto vendría de MercadoPago después de procesar el pago
 */
async function simulateMercadoPagoCallback(page: Page, status: 'approved' | 'rejected' | 'cancelled') {
  // Extraer booking ID de la URL actual o sessionStorage
  const bookingId = await page.evaluate(() => {
    return sessionStorage.getItem('pending_booking_id');
  });
  
  if (!bookingId) {
    console.warn('No booking ID found for MP callback simulation');
    return;
  }
  
  // Construir URL de callback
  const callbackUrl = `/api/mercadopago/callback?booking_id=${bookingId}&status=${status}`;
  
  // Navegar al callback
  await page.goto(callbackUrl);
}

/**
 * Helper: Autorizar hold de MercadoPago
 * Simula el flujo completo de autorización
 */
async function authorizeHold(page: Page): Promise<void> {
  const authorizeBtn = page.getByRole('button', { name: /autorizar.*hold/i });
  await authorizeBtn.click();
  
  // Puede abrir un iframe o popup de MP
  // Esperar a que cargue
  await page.waitForLoadState('networkidle');
  
  // Si es iframe, cambiar de contexto
  const mpIframe = page.frameLocator('iframe[src*="mercadopago"]').first();
  
  if (await mpIframe.locator('body').count() > 0) {
    // Completar formulario de MP en iframe
    await mpIframe.locator('input[name="cardNumber"]').fill('4509 9535 6623 3704');
    await mpIframe.locator('input[name="cardholderName"]').fill('APRO');
    await mpIframe.locator('input[name="cardExpirationMonth"]').fill('11');
    await mpIframe.locator('input[name="cardExpirationYear"]').fill('25');
    await mpIframe.locator('input[name="securityCode"]').fill('123');
    await mpIframe.locator('input[name="docNumber"]').fill('12345678');
    
    // Submit
    await mpIframe.locator('button[type="submit"]').click();
  }
  
  // Esperar confirmación
  await expect(page.getByText(/hold autorizado/i)).toBeVisible({ timeout: 15000 });
}
