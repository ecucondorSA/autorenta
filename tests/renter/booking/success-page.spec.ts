import { test, expect } from '@playwright/test';

/**
 * E2E Test: Página de Éxito de Reserva
 * 
 * Objetivo: Validar que la página de éxito muestra correctamente
 * toda la información de la reserva y permite navegar a otras páginas.
 */

test.describe('Página de Éxito de Reserva', () => {
  // ID de reserva de prueba (en producción, se crearía dinámicamente)
  const testBookingId = 'test-booking-id-123';

  test('Debe mostrar todos los elementos de la página', async ({ page }) => {
    // Navegar directamente a success con un booking ID de prueba
    await page.goto(`/bookings/success/${testBookingId}`);
    
    // Esperar que cargue
    await page.waitForLoadState('networkidle');

    // 1. Verificar header
    await expect(page.getByText('¡Reserva Confirmada!')).toBeVisible();

    // 2. Verificar ícono de éxito animado
    const successIcon = page.locator('ion-icon[name="checkmark-circle"]');
    await expect(successIcon).toBeVisible();
    await expect(successIcon).toHaveAttribute('color', 'success');

    // 3. Verificar mensaje principal
    await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible();
    await expect(page.getByText(/enviamos.*detalles.*email/i)).toBeVisible();

    // 4. Verificar card de detalles de reserva
    const detailsCard = page.getByText(/detalles de tu reserva/i).locator('..').locator('..');
    await expect(detailsCard).toBeVisible();

    // 5. Verificar placeholder de auto (ya que Booking no tiene car directamente)
    await expect(page.locator('ion-icon[name="car-outline"]')).toBeVisible();
    await expect(page.getByText('Vehículo')).toBeVisible();
    await expect(page.getByText('Reserva confirmada')).toBeVisible();

    // 6. Verificar fechas
    await expect(page.getByText(/desde:/i)).toBeVisible();
    await expect(page.getByText(/hasta:/i)).toBeVisible();

    // 7. Verificar total
    await expect(page.getByText(/total pagado:/i)).toBeVisible();
    // Debe mostrar en formato ARS con símbolo $
    const totalElement = page.locator('text=/total pagado:/i').locator('..').locator('.value');
    await expect(totalElement).toContainText('$');

    // 8. Verificar booking ID
    await expect(page.getByText(/número de reserva:/i)).toBeVisible();
    // Debe mostrar primeros caracteres del ID
    await expect(page.getByText(testBookingId.slice(0, 8))).toBeVisible();

    // 9. Verificar card de próximos pasos
    const stepsCard = page.getByText(/próximos pasos/i).locator('..').locator('..');
    await expect(stepsCard).toBeVisible();

    // 10. Verificar cada paso
    await expect(page.getByText(/revisa tu email/i)).toBeVisible();
    await expect(page.getByText(/contacta al propietario/i)).toBeVisible();
    await expect(page.getByText(/prepara tu documentación/i)).toBeVisible();
    await expect(page.getByText(/disfruta tu viaje/i)).toBeVisible();

    // 11. Verificar íconos de los pasos
    await expect(page.locator('ion-icon[name="mail-outline"]')).toBeVisible();
    await expect(page.locator('ion-icon[name="chatbubble-outline"]')).toBeVisible();
    await expect(page.locator('ion-icon[name="document-text-outline"]')).toBeVisible();
    await expect(page.locator('ion-icon[name="car-outline"]')).toBeVisible();

    // 12. Verificar botones de acción
    const detailsButton = page.getByRole('button', { name: /ver detalles.*reserva/i });
    const searchButton = page.getByRole('button', { name: /buscar más vehículos/i });
    const homeButton = page.getByRole('button', { name: /ir al inicio/i });

    await expect(detailsButton).toBeVisible();
    await expect(searchButton).toBeVisible();
    await expect(homeButton).toBeVisible();

    // 13. Verificar que botones están habilitados
    await expect(detailsButton).toBeEnabled();
    await expect(searchButton).toBeEnabled();
    await expect(homeButton).toBeEnabled();
  });

  test('Debe navegar correctamente al hacer click en botones', async ({ page }) => {
    await page.goto(`/bookings/success/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Test botón "Ver Detalles"
    const detailsButton = page.getByRole('button', { name: /ver detalles/i });
    await detailsButton.click();
    await page.waitForURL(`/bookings/${testBookingId}`);
    expect(page.url()).toContain(`/bookings/${testBookingId}`);
    
    // Volver
    await page.goBack();

    // Test botón "Buscar Más Vehículos"
    const searchButton = page.getByRole('button', { name: /buscar más/i });
    await searchButton.click();
    await page.waitForURL('/cars');
    expect(page.url()).toContain('/cars');
    
    // Volver
    await page.goBack();

    // Test botón "Ir al Inicio"
    const homeButton = page.getByRole('button', { name: /ir al inicio/i });
    await homeButton.click();
    await page.waitForURL('/');
    expect(page.url()).toMatch(/\/$|\/\?/);
  });

  test('Debe mostrar loading state mientras carga datos', async ({ page }) => {
    // Interceptar API y hacer que tarde
    await page.route('**/rest/v1/bookings?*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto(`/bookings/success/${testBookingId}`);

    // Verificar spinner de loading
    await expect(page.locator('ion-spinner')).toBeVisible();
    await expect(page.getByText(/cargando detalles/i)).toBeVisible();

    // Esperar a que termine de cargar
    await expect(page.locator('ion-spinner')).not.toBeVisible({ timeout: 5000 });
  });

  test('Debe mostrar error si booking no existe', async ({ page }) => {
    const invalidId = 'invalid-booking-id-999';

    // Interceptar API y devolver 404
    await page.route(`**/rest/v1/bookings?id=eq.${invalidId}*`, route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not found' })
      });
    });

    await page.goto(`/bookings/success/${invalidId}`);
    await page.waitForLoadState('networkidle');

    // Verificar mensaje de error
    await expect(page.getByText(/error/i)).toBeVisible();
    await expect(page.getByText(/reserva no encontrada|not found/i)).toBeVisible();

    // Verificar botón para ver mis reservas
    const myBookingsButton = page.getByRole('button', { name: /ver mis reservas/i });
    await expect(myBookingsButton).toBeVisible();
    await expect(myBookingsButton).toBeEnabled();
  });

  test('Debe redirigir a home si no hay booking ID', async ({ page }) => {
    // Navegar sin ID
    await page.goto('/bookings/success/');
    
    // Debe redirigir al home
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toMatch(/\/$|\/\?/);
  });

  test('Debe ser responsive en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`/bookings/success/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Verificar elementos principales visibles
    await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible();
    
    // Verificar ícono ajustado a tamaño móvil (CSS media query)
    const icon = page.locator('ion-icon[name="checkmark-circle"]');
    const iconSize = await icon.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    // En móvil debería ser 80px según el SCSS
    expect(parseInt(iconSize)).toBeLessThanOrEqual(90);

    // Verificar título ajustado
    const title = page.getByRole('heading', { name: /tu reserva está confirmada/i });
    const titleSize = await title.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    // En móvil debería ser 1.75rem = 28px (aproximado)
    expect(parseInt(titleSize)).toBeLessThanOrEqual(32);

    // Verificar que no hay overflow horizontal
    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verificar botones apilados verticalmente (flex-col)
    const actionButtons = page.locator('.action-buttons');
    const display = await actionButtons.evaluate(el => {
      return window.getComputedStyle(el).flexDirection;
    });
    expect(display).toBe('column');
  });

  test('Debe funcionar correctamente en dark mode', async ({ page }) => {
    // Establecer preferencia de dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto(`/bookings/success/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Verificar que el header tiene color correcto
    const toolbar = page.locator('ion-toolbar[color="success"]');
    await expect(toolbar).toBeVisible();

    // Verificar que los textos son legibles en dark mode
    const title = page.getByRole('heading', { name: /tu reserva está confirmada/i });
    const titleColor = await title.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    
    // En dark mode debería ser blanco o gris claro
    // rgb(255, 255, 255) o similar
    expect(titleColor).toMatch(/rgb\(2[0-9]{2},\s*2[0-9]{2},\s*2[0-9]{2}\)/);

    // Verificar que las cards tienen fondo apropiado para dark mode
    const card = page.locator('ion-card').first();
    const cardBg = await card.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // En dark mode debería ser oscuro (valores RGB bajos)
    expect(cardBg).toMatch(/rgb\([0-9]{1,2},\s*[0-9]{1,2},\s*[0-9]{1,2}\)/);
  });

  test('Debe tener animación en el ícono de éxito', async ({ page }) => {
    await page.goto(`/bookings/success/${testBookingId}`);
    
    const icon = page.locator('ion-icon[name="checkmark-circle"]');
    
    // Verificar que tiene la clase de animación
    await expect(icon).toHaveClass(/success-icon/);
    
    // Verificar que la animación está definida en CSS
    const animationName = await icon.evaluate(el => {
      return window.getComputedStyle(el).animationName;
    });
    
    expect(animationName).toBe('scaleIn');
  });

  test('Debe formatear correctamente las fechas', async ({ page }) => {
    await page.goto(`/bookings/success/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Buscar las fechas formateadas
    const dateElements = page.locator('.value').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ });
    
    // Debe haber al menos 2 (start_at y end_at)
    await expect(dateElements).toHaveCount(2, { timeout: 5000 });
    
    // Verificar formato dd/MM/yyyy HH:mm
    const dateText = await dateElements.first().textContent();
    expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/);
  });

  test('Debe formatear correctamente el total en ARS', async ({ page }) => {
    await page.goto(`/bookings/success/${testBookingId}`);
    await page.waitForLoadState('networkidle');

    // Buscar el total
    const totalElement = page.locator('text=/total pagado:/i')
      .locator('..')
      .locator('.value');
    
    await expect(totalElement).toBeVisible();
    
    const totalText = await totalElement.textContent();
    
    // Debe tener símbolo $ y formato de moneda argentina
    expect(totalText).toContain('$');
    // Puede ser $50.000 o $50,000 dependiendo de la configuración
    expect(totalText).toMatch(/\$\s*[\d,\.]+/);
  });
});
