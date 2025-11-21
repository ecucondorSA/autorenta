import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Flujo de Pagos Básico
 *
 * Tests rápidos para verificar que las páginas críticas de pago están funcionando
 * No realiza todo el flujo completo, solo verifica que las páginas cargan correctamente
 */

test.describe('Payment Flow - Smoke Tests', () => {
  test('booking-payment page debe cargar correctamente', async ({ page }) => {
    // Mock de datos necesarios
    await page.route('**/api/bookings/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-booking-123',
          car_id: 'test-car-id',
          status: 'pending_payment',
          total_amount: 20000,
          deposit_amount: 10000,
          car: {
            id: 'test-car-id',
            title: 'Test Car',
            brand: 'Toyota',
            model: 'Corolla',
            year: 2020,
            images: ['https://example.com/car.jpg']
          }
        })
      });
    });

    await page.route('**/api/wallet/balance', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          available: 50000,
          locked: 0
        })
      });
    });

    // Navegar a booking-payment
    await page.goto('/bookings/test-booking-123/payment?paymentMethod=wallet');

    // Verificar que la página carga
    await expect(page.getByRole('heading', { name: /completar pago/i })).toBeVisible({ timeout: 10000 });

    // Verificar que muestra el resumen del auto
    await expect(page.getByText(/test car/i)).toBeVisible();

    // Verificar que muestra el método de pago
    await expect(page.getByText(/wallet autorenta/i)).toBeVisible();
  });

  test('booking-pending page debe cargar correctamente', async ({ page }) => {
    // Mock de booking pendiente
    await page.route('**/api/bookings/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-booking-123',
          status: 'pending_payment',
          payment_status: 'pending',
          total_amount: 20000,
          deposit_amount: 10000
        })
      });
    });

    // Navegar a booking-pending
    await page.goto('/bookings/test-booking-123/pending');

    // Verificar que la página carga
    await expect(page.getByRole('heading', { name: /procesando tu pago/i })).toBeVisible({ timeout: 10000 });

    // Verificar elementos de UI
    await expect(page.getByText(/verificación/i)).toBeVisible();
    await expect(page.getByText(/no cierres esta ventana/i)).toBeVisible();

    // Verificar botón de ir a detalle
    await expect(page.getByRole('button', { name: /ver detalles de la reserva/i })).toBeVisible();
  });

  test('payment-method-buttons debe validar fondos correctamente', async ({ page }) => {
    // Mock de wallet con fondos bajos
    await page.route('**/api/wallet/balance', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          available: 1000, // Solo $10 ARS
          locked: 0
        })
      });
    });

    await page.route('**/api/cars/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-car-id',
          title: 'Test Car',
          daily_rate: 10000, // $100/día
          deposit_amount: 20000 // $200 depósito
        })
      });
    });

    // Ir a car detail
    await page.goto('/cars/test-car-id');

    // Seleccionar fechas
    const dateRangePicker = page.locator('app-date-range-picker');
    await dateRangePicker.click();
    await page.getByRole('button', { name: /siguiente día/i }).first().click();
    await page.getByRole('button', { name: /siguiente día/i }).nth(2).click();

    // Verificar que wallet muestra fondos insuficientes
    const walletButton = page.getByRole('button', { name: /wallet autorenta/i });
    await expect(walletButton).toBeVisible({ timeout: 5000 });

    // Buscar mensaje de fondos insuficientes
    await expect(page.getByText(/fondos insuficientes/i)).toBeVisible({ timeout: 5000 });

    // Verificar que tarjeta está recomendada
    const cardButton = page.getByRole('button', { name: /tarjeta de crédito/i });
    await expect(cardButton).toBeVisible();
    await expect(page.getByText(/⭐.*recomendado/i).first()).toBeVisible();
  });

  test('MercadoPago SDK debe cargar correctamente', async ({ page }) => {
    // Navegar a una página que necesita el SDK
    await page.route('**/api/bookings/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-booking-123',
          status: 'pending_payment',
          total_amount: 20000,
          deposit_amount: 10000
        })
      });
    });

    await page.goto('/bookings/test-booking-123/payment?paymentMethod=credit_card');

    // Verificar que se agregan hints de preconnect
    await page.waitForSelector('link[rel="preconnect"][href*="mercadopago"]', { timeout: 5000 });

    // Verificar que el script del SDK se carga
    await page.waitForFunction(() => {
      return (window as any).MercadoPago !== undefined;
    }, { timeout: 15000 });

    // Verificar que CardForm está visible
    await expect(page.locator('app-mercadopago-card-form')).toBeVisible({ timeout: 10000 });
  });

  test('Navegación entre páginas de pago debe funcionar', async ({ page }) => {
    // Mock de datos
    await page.route('**/api/**', route => {
      const url = route.request().url();

      if (url.includes('/bookings/') && !url.includes('/payment')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-booking-123',
            status: 'pending_payment',
            total_amount: 20000
          })
        });
      } else if (url.includes('/wallet/balance')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ available: 50000 })
        });
      } else if (url.includes('/cars/')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-car-id',
            title: 'Test Car'
          })
        });
      } else {
        route.continue();
      }
    });

    // 1. Ir a car detail
    await page.goto('/cars/test-car-id');
    expect(page.url()).toContain('/cars/test-car-id');

    // 2. Navegar a payment (simulado)
    await page.goto('/bookings/test-booking-123/payment');
    expect(page.url()).toContain('/payment');

    // 3. Botón "volver" debe funcionar
    const backButton = page.getByRole('button', { name: /volver/i });
    if (await backButton.isVisible()) {
      await backButton.click();
      // Debe volver al car detail
      await page.waitForURL(/\/cars\//, { timeout: 5000 });
    }
  });

  test('Error handling debe mostrar mensajes apropiados', async ({ page }) => {
    // Mock de error en booking
    await page.route('**/api/bookings/**', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Booking not found' })
      });
    });

    // Navegar a booking-payment con booking inexistente
    await page.goto('/bookings/non-existent-booking/payment');

    // Debe mostrar error o redirigir
    await Promise.race([
      expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 }),
      expect(page.getByText(/no encontrad/i)).toBeVisible({ timeout: 5000 }),
      page.waitForURL(/^(?!.*payment).*$/, { timeout: 5000 }) // Redirección
    ]);
  });
});

test.describe('Payment Components - Unit-like Tests', () => {
  test('payment-method-buttons component debe renderizar correctamente', async ({ page }) => {
    await page.goto('/cars/test-car-id');

    // Verificar que ambos botones están presentes
    await expect(page.getByRole('button', { name: /tarjeta de crédito/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /wallet autorenta/i })).toBeVisible({ timeout: 5000 });

    // Verificar íconos
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('wallet-balance-card debe mostrar balance actualizado', async ({ page }) => {
    await page.route('**/api/wallet/balance', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          available: 75000, // $750 ARS
          locked: 25000 // $250 ARS bloqueado
        })
      });
    });

    await page.route('**/api/bookings/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'test-booking-123',
          status: 'pending_payment'
        })
      });
    });

    await page.goto('/bookings/test-booking-123/payment?paymentMethod=wallet');

    // Esperar a que cargue el componente de wallet balance
    await expect(page.getByText(/balance disponible.*\$750/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/bloqueado.*\$250/i)).toBeVisible({ timeout: 5000 });
  });
});
