import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Flujo Consolidado de Pago - Wallet
 * 
 * Objetivo: Validar que el flujo de pago con wallet funciona correctamente
 * desde la página de detail-payment hasta la página de éxito.
 * 
 * Flujo:
 * 1. Usuario llega a detail-payment con datos de reserva
 * 2. Selecciona método de pago "wallet"
 * 3. Bloquea fondos
 * 4. Acepta términos
 * 5. Click "Confirmar y Pagar"
 * 6. Ve estados: "Creando reserva..." → "Procesando pago..."
 * 7. Redirige a /bookings/success/:id
 * 8. Ve confirmación con detalles
 */

test.describe('Flujo Consolidado de Pago - Wallet', () => {
  test.beforeEach(async ({ page }) => {
    // Asume que el usuario ya está autenticado (via storageState)
    // y tiene fondos suficientes en la wallet
  });

  test('Debe completar pago con wallet exitosamente', async ({ page }) => {
    // PASO 1: Navegar a detail-payment
    // Nota: En producción, esto requeriría primero seleccionar un auto
    // Para este test, podemos mockearlo o usar queryParams
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Esperar que la página cargue
    await expect(page.getByText('Completa tu Reserva')).toBeVisible({ timeout: 10000 });

    // PASO 2: Verificar que NO está en loading
    await expect(page.getByText('Calculando tu reserva...')).not.toBeVisible({ timeout: 5000 });

    // PASO 3: Seleccionar método de pago "wallet"
    const walletOption = page.getByRole('button', { name: /wallet|billetera/i });
    await walletOption.click();
    await expect(walletOption).toHaveClass(/selected|active/);

    // PASO 4: Bloquear fondos en wallet
    const lockWalletBtn = page.getByRole('button', { name: /bloquear fondos|lock funds/i });
    await lockWalletBtn.click();
    
    // Esperar confirmación de bloqueo
    await expect(page.getByText(/fondos bloqueados|funds locked/i)).toBeVisible({ timeout: 5000 });

    // PASO 5: Aceptar términos y condiciones
    const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos/i });
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();

    // PASO 6: Click en "Confirmar y Pagar"
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // PASO 7: Verificar estado "Creando reserva..."
    await expect(page.getByText('Creando reserva...')).toBeVisible({ timeout: 3000 });

    // PASO 8: Verificar estado "Procesando pago..."
    await expect(page.getByText('Procesando pago...')).toBeVisible({ timeout: 5000 });

    // PASO 9: Esperar redirección a success page
    await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 15000 });

    // PASO 10: Verificar página de éxito
    await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible();
    
    // Verificar ícono de éxito
    await expect(page.locator('ion-icon[name="checkmark-circle"]')).toBeVisible();

    // Verificar detalles de reserva
    await expect(page.getByText(/detalles de tu reserva/i)).toBeVisible();
    await expect(page.getByText(/desde:/i)).toBeVisible();
    await expect(page.getByText(/hasta:/i)).toBeVisible();
    await expect(page.getByText(/total pagado:/i)).toBeVisible();

    // Verificar próximos pasos
    await expect(page.getByText(/próximos pasos/i)).toBeVisible();
    await expect(page.getByText(/revisa tu email/i)).toBeVisible();
    await expect(page.getByText(/contacta al propietario/i)).toBeVisible();

    // Verificar botones de acción
    await expect(page.getByRole('button', { name: /ver detalles/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /buscar más vehículos/i })).toBeVisible();
  });

  test('Debe mostrar error si wallet tiene fondos insuficientes', async ({ page }) => {
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Seleccionar wallet
    await page.getByRole('button', { name: /wallet|billetera/i }).click();
    
    // Intentar bloquear fondos (debería fallar)
    await page.getByRole('button', { name: /bloquear fondos/i }).click();
    
    // Esperar mensaje de error
    await expect(page.getByText(/fondos insuficientes|insufficient funds/i)).toBeVisible({ timeout: 5000 });
    
    // Verificar que botón de confirmar sigue deshabilitado
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i });
    await expect(confirmButton).toBeDisabled();
  });

  test('Debe permitir reintentar si falla el pago', async ({ page }) => {
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Preparar para interceptar y hacer fallar la request
    await page.route('**/rest/v1/rpc/create_booking_atomic', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Database error' })
      });
    });
    
    // Completar flujo normal
    await page.getByRole('button', { name: /wallet/i }).click();
    await page.getByRole('button', { name: /bloquear fondos/i }).click();
    await expect(page.getByText(/fondos bloqueados/i)).toBeVisible();
    await page.getByRole('checkbox', { name: /acepto/i }).check();
    
    // Click confirmar
    await page.getByRole('button', { name: /confirmar y pagar/i }).click();
    
    // Esperar error
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10000 });
    
    // Verificar que NO navegó a otra página
    expect(page.url()).toContain('/bookings/detail-payment');
    
    // Verificar que botón está habilitado para reintentar
    await expect(page.getByRole('button', { name: /confirmar y pagar/i })).toBeEnabled();
  });

  test('Debe ser responsive en móvil', async ({ page }) => {
    // Simular viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05');
    
    // Verificar que elementos principales son visibles
    await expect(page.getByText('Completa tu Reserva')).toBeVisible();
    
    // Verificar que botón es visible y clickeable
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i });
    await expect(confirmButton).toBeVisible();
    
    // Verificar que no hay overflow horizontal
    const body = await page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 por rounding
  });
});

/**
 * Helper: Simular usuario con wallet pre-cargada
 */
async function setupWalletWithFunds(page: Page, amount: number = 100000) {
  // Esto requeriría llamar a la API de wallet para depositar fondos
  // O mockearlo en el beforeEach
  await page.evaluate((amt) => {
    localStorage.setItem('mock_wallet_balance', String(amt));
  }, amount);
}

/**
 * Helper: Extraer booking ID de la URL de success
 */
function extractBookingId(url: string): string | null {
  const match = url.match(/\/bookings\/success\/([^\/]+)/);
  return match ? match[1] : null;
}
