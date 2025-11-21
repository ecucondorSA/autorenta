import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Flujo Unificado de Pago - Nueva Página booking-payment
 *
 * Objetivo: Validar el nuevo flujo de pago que:
 * 1. Crea el booking primero
 * 2. Navega a /bookings/:id/payment
 * 3. Procesa pago con wallet o tarjeta (SDK inline)
 * 4. Maneja wallet sin fondos mostrando opciones
 *
 * Casos de prueba:
 * - Wallet con fondos suficientes
 * - Wallet sin fondos (muestra opciones)
 * - Tarjeta con SDK inline (sin redirección)
 * - Cambio de método de pago en tiempo real
 */

test.describe('Flujo Unificado de Pago - booking-payment', () => {
  test.beforeEach(async ({ page }) => {
    // Usuario autenticado vía storageState
    // Mock de servicios necesarios
    await setupPaymentMocks(page);
  });

  test('Debe completar pago con wallet cuando tiene fondos suficientes', async ({ page }) => {
    // PASO 1: Navegar a car detail y seleccionar fechas
    await page.goto('/cars/test-car-id');
    await expect(page.getByRole('heading', { name: /detalles/i })).toBeVisible({ timeout: 10000 });

    // Seleccionar fechas
    const dateRangePicker = page.locator('app-date-range-picker');
    await dateRangePicker.click();

    // Seleccionar check-in (hoy + 1)
    await page.getByRole('button', { name: /siguiente día/i }).first().click();

    // Seleccionar check-out (hoy + 3)
    await page.getByRole('button', { name: /siguiente día/i }).nth(2).click();

    // PASO 2: Mock wallet con fondos suficientes
    await page.evaluate(() => {
      sessionStorage.setItem('wallet_balance', JSON.stringify({
        available: 50000, // $500 ARS
        locked: 0
      }));
    });

    // PASO 3: Seleccionar método de pago "Wallet"
    const walletButton = page.getByRole('button', { name: /wallet autorenta/i });
    await expect(walletButton).toBeVisible();

    // Verificar que muestra balance suficiente
    await expect(page.getByText(/balance disponible.*\$500/i)).toBeVisible();
    await expect(page.getByText(/fondos suficientes/i)).toBeVisible();

    await walletButton.click();

    // PASO 4: Esperar creación del booking y navegación
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 });

    // PASO 5: Verificar que estamos en la página de pago
    await expect(page.getByRole('heading', { name: /completar pago/i })).toBeVisible();

    // Verificar que muestra método wallet
    await expect(page.getByText(/wallet autorenta/i)).toBeVisible();

    // Verificar balance
    await expect(page.getByText(/balance disponible/i)).toBeVisible();

    // PASO 6: Confirmar pago con wallet
    const confirmButton = page.getByRole('button', { name: /confirmar y bloquear fondos/i });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // PASO 7: Esperar procesamiento
    await expect(page.getByText(/procesando tu pago/i)).toBeVisible({ timeout: 3000 });

    // PASO 8: Esperar redirección a success
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/success/, { timeout: 15000 });

    // PASO 9: Verificar página de éxito
    await expect(page.getByText(/pago procesado exitosamente/i)).toBeVisible();
  });

  test('Debe mostrar opciones cuando wallet no tiene fondos', async ({ page }) => {
    // PASO 1: Navegar a car detail
    await page.goto('/cars/test-car-id');
    await expect(page.getByRole('heading', { name: /detalles/i })).toBeVisible({ timeout: 10000 });

    // Seleccionar fechas (mismo flujo)
    const dateRangePicker = page.locator('app-date-range-picker');
    await dateRangePicker.click();
    await page.getByRole('button', { name: /siguiente día/i }).first().click();
    await page.getByRole('button', { name: /siguiente día/i }).nth(2).click();

    // PASO 2: Mock wallet SIN fondos suficientes
    await page.evaluate(() => {
      sessionStorage.setItem('wallet_balance', JSON.stringify({
        available: 5000, // $50 ARS (insuficiente)
        locked: 0
      }));
    });

    // PASO 3: Seleccionar wallet
    const walletButton = page.getByRole('button', { name: /wallet autorenta/i });
    await expect(walletButton).toBeVisible();

    // Verificar advertencia de fondos insuficientes
    await expect(page.getByText(/fondos insuficientes/i)).toBeVisible();

    await walletButton.click();

    // PASO 4: Esperar navegación a página de pago
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 });

    // PASO 5: Verificar que muestra opciones de pago
    await expect(page.getByRole('heading', { name: /opciones de pago disponibles/i })).toBeVisible();

    // Verificar advertencia
    await expect(page.getByText(/tu wallet no tiene fondos suficientes/i)).toBeVisible();

    // PASO 6: Verificar que muestra las 3 opciones
    await expect(page.getByRole('button', { name: /usar saldo actual/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /depositar fondos en wallet/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pagar con tarjeta/i })).toBeVisible();

    // PASO 7: Opción "Usar saldo" debe estar deshabilitada
    const useSaldoBtn = page.getByRole('button', { name: /usar saldo actual/i });
    await expect(useSaldoBtn).toBeDisabled();

    // PASO 8: Seleccionar "Pagar con tarjeta"
    const payWithCardBtn = page.getByRole('button', { name: /pagar con tarjeta/i });
    await payWithCardBtn.click();

    // PASO 9: Verificar que ahora muestra CardForm
    await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 5000 });
  });

  test('Debe procesar pago con tarjeta usando SDK inline', async ({ page }) => {
    // PASO 1: Navegar a car detail
    await page.goto('/cars/test-car-id');
    await expect(page.getByRole('heading', { name: /detalles/i })).toBeVisible({ timeout: 10000 });

    // Seleccionar fechas
    const dateRangePicker = page.locator('app-date-range-picker');
    await dateRangePicker.click();
    await page.getByRole('button', { name: /siguiente día/i }).first().click();
    await page.getByRole('button', { name: /siguiente día/i }).nth(2).click();

    // PASO 2: Seleccionar método "Tarjeta de Crédito"
    const cardButton = page.getByRole('button', { name: /tarjeta de crédito/i });
    await cardButton.click();

    // PASO 3: Esperar navegación a página de pago
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 });

    // PASO 4: Verificar que muestra CardForm (NO redirección a MP)
    await expect(page.getByRole('heading', { name: /pagar con tarjeta/i })).toBeVisible();
    await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 5000 });

    // PASO 5: Esperar que cargue el SDK de MercadoPago
    await page.waitForFunction(() => {
      return (window as any).MercadoPago !== undefined;
    }, { timeout: 10000 });

    // PASO 6: Completar formulario de tarjeta
    // Nota: El CardForm usa iframes de MP, necesitamos acceder a ellos
    await fillCardFormFields(page, {
      cardNumber: '4509 9535 6623 3704', // Tarjeta de prueba APRO
      cardholderName: 'APRO',
      expirationDate: '11/25',
      securityCode: '123',
      docNumber: '12345678',
      docType: 'DNI',
    });

    // PASO 7: Click en "Pagar"
    const payButton = page.getByRole('button', { name: /pagar/i });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    // PASO 8: Esperar procesamiento
    await expect(page.getByText(/procesando tu pago/i)).toBeVisible({ timeout: 3000 });

    // PASO 9: Verificar que NO se redirige a MercadoPago.com
    await page.waitForTimeout(2000);
    expect(page.url()).not.toMatch(/mercadopago\.com/);

    // PASO 10: Si el pago es aprobado, redirige a success
    // Si está en proceso, redirige a pending
    await Promise.race([
      page.waitForURL(/\/bookings\/[a-z0-9-]+\/success/, { timeout: 15000 }),
      page.waitForURL(/\/bookings\/[a-z0-9-]+\/pending/, { timeout: 15000 }),
    ]);

    // PASO 11: Verificar página correspondiente
    const currentUrl = page.url();
    if (currentUrl.includes('/success')) {
      await expect(page.getByText(/pago aprobado/i)).toBeVisible();
    } else if (currentUrl.includes('/pending')) {
      await expect(page.getByText(/procesando tu pago/i)).toBeVisible();
      // Verificar elementos de pending page
      await expect(page.getByText(/verificación/i)).toBeVisible();
    }
  });

  test('Debe manejar cambio de método de pago', async ({ page }) => {
    // PASO 1: Llegar a página de pago con wallet sin fondos
    await page.goto('/cars/test-car-id');
    await page.evaluate(() => {
      sessionStorage.setItem('wallet_balance', JSON.stringify({
        available: 5000,
        locked: 0
      }));
    });

    // Seleccionar fechas y método wallet
    const dateRangePicker = page.locator('app-date-range-picker');
    await dateRangePicker.click();
    await page.getByRole('button', { name: /siguiente día/i }).first().click();
    await page.getByRole('button', { name: /siguiente día/i }).nth(2).click();
    await page.getByRole('button', { name: /wallet autorenta/i }).click();

    // PASO 2: Esperar página de pago con opciones
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /opciones de pago/i })).toBeVisible();

    // PASO 3: Seleccionar "Depositar fondos"
    const depositButton = page.getByRole('button', { name: /depositar fondos/i });
    await depositButton.click();

    // PASO 4: Verificar redirección a wallet/deposit
    await page.waitForURL(/\/wallet\/deposit/, { timeout: 10000 });

    // Verificar query params
    expect(page.url()).toContain('returnUrl');
    expect(page.url()).toContain('amount');

    // PASO 5: Volver atrás (simular cancelación de depósito)
    await page.goBack();

    // PASO 6: Verificar que volvemos a opciones
    await expect(page.getByRole('heading', { name: /opciones de pago/i })).toBeVisible();

    // PASO 7: Ahora seleccionar "Pagar con tarjeta"
    const cardButton = page.getByRole('button', { name: /pagar con tarjeta/i });
    await cardButton.click();

    // PASO 8: Verificar que ahora muestra CardForm
    await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /pagar con tarjeta/i })).toBeVisible();
  });

  test('Debe mostrar página pending y polling de estado', async ({ page }) => {
    // Setup: Mock de pago que tarda en procesarse
    await page.route('**/api/payments/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: 'in_process',
          payment_id: 'test-payment-123'
        })
      });
    });

    // Flujo completo hasta pago
    await page.goto('/cars/test-car-id');
    const dateRangePicker = page.locator('app-date-range-picker');
    await dateRangePicker.click();
    await page.getByRole('button', { name: /siguiente día/i }).first().click();
    await page.getByRole('button', { name: /siguiente día/i }).nth(2).click();
    await page.getByRole('button', { name: /tarjeta de crédito/i }).click();

    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/payment/, { timeout: 15000 });

    // Completar pago (simulado)
    await fillCardFormFields(page, {
      cardNumber: '4509 9535 6623 3704',
      cardholderName: 'APRO',
      expirationDate: '11/25',
      securityCode: '123',
      docNumber: '12345678',
      docType: 'DNI',
    });

    await page.getByRole('button', { name: /pagar/i }).click();

    // PASO: Debe redirigir a pending
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/pending/, { timeout: 15000 });

    // PASO: Verificar elementos de pending page
    await expect(page.getByRole('heading', { name: /procesando tu pago/i })).toBeVisible();
    await expect(page.getByText(/verificación/i)).toBeVisible();

    // Verificar contador de verificaciones
    await expect(page.getByText(/verificación.*\/30/i)).toBeVisible();

    // Verificar animación de loading
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // PASO: Simular que el pago se aprueba después de 2 polling cycles
    let pollCount = 0;
    await page.route('**/api/bookings/**', route => {
      pollCount++;
      if (pollCount >= 2) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'booking-123',
            payment_status: 'approved',
            status: 'confirmed'
          })
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'booking-123',
            payment_status: 'pending',
            status: 'pending_payment'
          })
        });
      }
    });

    // PASO: Esperar redirección automática a success
    await page.waitForURL(/\/bookings\/[a-z0-9-]+\/success/, { timeout: 30000 });

    // PASO: Verificar página de éxito
    await expect(page.getByText(/pago aprobado/i)).toBeVisible();
  });
});

/**
 * Helper: Setup payment mocks
 */
async function setupPaymentMocks(page: Page): Promise<void> {
  // Mock de creación de booking
  await page.route('**/api/bookings', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 'test-booking-' + Date.now(),
          status: 'pending_payment',
          car_id: 'test-car-id',
          total_amount: 20000,
          deposit_amount: 10000,
        })
      });
    } else {
      route.continue();
    }
  });

  // Mock de wallet balance
  await page.route('**/api/wallet/balance', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        available: 50000,
        locked: 0,
        total: 50000
      })
    });
  });
}

/**
 * Helper: Fill card form fields
 * Maneja iframes de MercadoPago SDK
 */
async function fillCardFormFields(
  page: Page,
  data: {
    cardNumber: string;
    cardholderName: string;
    expirationDate: string;
    securityCode: string;
    docNumber: string;
    docType: string;
  }
): Promise<void> {
  // MercadoPago usa iframes para los campos de la tarjeta
  // Necesitamos esperar a que los iframes carguen
  await page.waitForSelector('iframe[name*="mp"]', { timeout: 10000 });

  // Número de tarjeta (iframe)
  const cardNumberFrame = page.frameLocator('iframe[name*="cardNumber"]').first();
  await cardNumberFrame.locator('input').fill(data.cardNumber);

  // Nombre del titular
  const cardholderNameFrame = page.frameLocator('iframe[name*="cardholderName"]').first();
  await cardholderNameFrame.locator('input').fill(data.cardholderName);

  // Fecha de expiración
  const expirationFrame = page.frameLocator('iframe[name*="expiration"]').first();
  await expirationFrame.locator('input').fill(data.expirationDate);

  // Código de seguridad
  const securityCodeFrame = page.frameLocator('iframe[name*="securityCode"]').first();
  await securityCodeFrame.locator('input').fill(data.securityCode);

  // Tipo de documento (fuera del iframe)
  await page.selectOption('select[name="docType"]', data.docType);

  // Número de documento (fuera del iframe)
  await page.fill('input[name="docNumber"]', data.docNumber);

  // Esperar validación
  await page.waitForTimeout(1000);
}
