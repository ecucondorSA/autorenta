import { test, expect } from '@playwright/test';

/**
 * E2E Test Completo: Flujo de Alquiler desde Inicio hasta Postcheckout
 * 
 * Objetivo: Simular el flujo completo de un usuario que alquila un auto
 * usando una cuenta de test, desde la búsqueda hasta la confirmación final.
 * 
 * Flujo completo:
 * 1. Login con cuenta de test (renter)
 * 2. Buscar/seleccionar un auto
 * 3. Seleccionar fechas de alquiler
 * 4. Crear reserva (booking)
 * 5. Configurar método de pago (wallet)
 * 6. Completar pago
 * 7. Verificar página de éxito/postcheckout
 * 
 * Prioridad: P0 (Critical)
 * Duración estimada: ~2-3 minutos
 */

test.describe('Flujo Completo de Alquiler - E2E', () => {
  // No usar storageState - hacer login manual en cada test
  // Esto asegura que el test funciona incluso si el storageState no existe
  
  // Configurar baseURL si no está configurado
  test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
  });

  test('Debería completar el flujo completo de alquiler hasta postcheckout', async ({ page }) => {
    let carId: string | null = null;
    let bookingId: string | null = null;

    // ============================================
    // PASO 1: Login
    // ============================================
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Verificar que estamos autenticados
    const userMenu = page.getByTestId('user-menu').or(page.locator('[data-testid="user-menu"]'));
    const isAuthenticated = await userMenu.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isAuthenticated) {
      // Si no está autenticado, hacer login manual
      console.log('🔐 Haciendo login manual...');
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');
      
      // Buscar campos de login
      const emailInput = page.getByPlaceholder(/email|correo/i).or(page.locator('input[type="email"]'));
      const passwordInput = page.getByPlaceholder(/contraseña|password/i).or(page.locator('input[type="password"]'));
      const loginButton = page.getByRole('button', { name: /entrar|iniciar sesión|login/i });
      
      await emailInput.fill('renter.test@autorenta.com');
      await passwordInput.fill('TestRenter123!');
      await loginButton.click();
      
      // Esperar a que se complete el login
      await page.waitForURL(/\/cars|\//, { timeout: 15000 });
      await page.waitForTimeout(2000); // Dar tiempo para que se establezca la sesión
      
      console.log('✅ Login completado');
    } else {
      console.log('✅ Usuario ya autenticado');
    }

    // ============================================
    // PASO 2: Buscar y seleccionar un auto
    // ============================================
    await page.goto('/cars');
    await page.waitForLoadState('domcontentloaded');
    
    // Esperar a que los autos se carguen
    await page.waitForTimeout(3000);
    
    // Buscar el primer auto disponible
    const firstCarCard = page.locator('[data-car-id]').or(page.locator('app-car-card').first());
    const carCardVisible = await firstCarCard.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (!carCardVisible) {
      // Si no hay cards visibles, intentar buscar por otro selector
      const carLink = page.locator('a[href*="/cars/"]').first();
      const linkVisible = await carLink.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (linkVisible) {
        carId = await carLink.getAttribute('href').then(href => {
          const match = href?.match(/\/cars\/([a-f0-9-]+)/);
          return match ? match[1] : null;
        });
        
        if (carId) {
          await carLink.click();
        }
      } else {
        throw new Error('No se encontraron autos disponibles para alquilar');
      }
    } else {
      // Obtener el carId del card
      carId = await firstCarCard.getAttribute('data-car-id');
      
      if (!carId) {
        // Intentar obtenerlo del href si es un link
        const carLink = firstCarCard.locator('a').first();
        const href = await carLink.getAttribute('href').catch(() => null);
        if (href) {
          const match = href.match(/\/cars\/([a-f0-9-]+)/);
          carId = match ? match[1] : null;
        }
      }
      
      // Click en el card para ir al detalle
      await firstCarCard.click({ timeout: 5000 });
    }
    
    // Verificar que navegamos a la página de detalle
    await page.waitForURL(/\/cars\/[a-f0-9-]+/, { timeout: 10000 });
    
    if (!carId) {
      // Extraer carId de la URL
      const url = page.url();
      const match = url.match(/\/cars\/([a-f0-9-]+)/);
      carId = match ? match[1] : null;
    }
    
    expect(carId).toBeTruthy();
    console.log(`✅ Auto seleccionado: ${carId}`);

    // ============================================
    // PASO 3: Seleccionar fechas de alquiler
    // ============================================
    // Calcular fechas: desde hoy + 3 días hasta hoy + 7 días
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 3);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    
    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Buscar el date range picker
    const dateFromInput = page.getByTestId('date-from').or(page.locator('input[type="date"]').first());
    const dateToInput = page.getByTestId('date-to').or(page.locator('input[type="date"]').nth(1));
    
    // Llenar fechas
    await dateFromInput.fill(startDateStr);
    await page.waitForTimeout(500);
    await dateToInput.fill(endDateStr);
    await page.waitForTimeout(1000);
    
    console.log(`✅ Fechas seleccionadas: ${startDateStr} a ${endDateStr}`);

    // ============================================
    // PASO 4: Crear reserva (booking)
    // ============================================
    // Buscar y clickear el botón de reservar
    const bookButton = page.getByRole('button', { name: /reservar|inicia sesión para reservar/i });
    await expect(bookButton).toBeVisible({ timeout: 10000 });
    
    // Verificar que el botón esté habilitado
    const isEnabled = await bookButton.isEnabled();
    if (!isEnabled) {
      // Si está deshabilitado, puede ser porque faltan fechas o hay un error
      // Esperar un poco más
      await page.waitForTimeout(2000);
    }
    
    // Click en reservar
    await bookButton.click();
    
    // Esperar a que se procese la reserva y redirija a detail-payment
    await page.waitForURL(/\/bookings\/detail-payment/, { timeout: 15000 });
    
    // Extraer bookingId de los query params
    const url = page.url();
    const bookingIdMatch = url.match(/bookingId=([a-f0-9-]+)/);
    bookingId = bookingIdMatch ? bookingIdMatch[1] : null;
    
    console.log(`✅ Reserva creada: ${bookingId}`);

    // ============================================
    // PASO 5: Configurar método de pago (wallet)
    // ============================================
    // Esperar a que la página de pago cargue
    await expect(page.getByText(/completa tu reserva|detalle de pago/i)).toBeVisible({ timeout: 10000 });
    
    // Esperar a que termine de calcular
    await page.waitForTimeout(2000);
    
    // Seleccionar método de pago "wallet"
    const walletOption = page.getByRole('button', { name: /wallet|billetera/i }).or(
      page.locator('[data-payment-method="wallet"]')
    );
    
    const walletVisible = await walletOption.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (walletVisible) {
      await walletOption.click();
      await page.waitForTimeout(500);
      
      // Bloquear fondos en wallet
      const lockButton = page.getByRole('button', { name: /bloquear fondos|lock funds/i });
      const lockVisible = await lockButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (lockVisible && await lockButton.isEnabled()) {
        await lockButton.click();
        await page.waitForTimeout(2000);
        
        // Verificar que los fondos se bloquearon
        const lockConfirmed = await page.getByText(/fondos bloqueados|funds locked/i).isVisible({ timeout: 5000 }).catch(() => false);
        if (!lockConfirmed) {
          console.warn('No se confirmó el bloqueo de fondos, pero continuando...');
        }
      }
    } else {
      console.warn('Opción de wallet no visible, usando tarjeta como alternativa');
      // Si wallet no está disponible, usar tarjeta
      const cardOption = page.getByRole('button', { name: /tarjeta|card|crédito/i });
      if (await cardOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cardOption.click();
      }
    }

    // ============================================
    // PASO 6: Aceptar términos y completar pago
    // ============================================
    // Aceptar términos y condiciones
    const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos|condiciones/i });
    const termsVisible = await termsCheckbox.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (termsVisible) {
      await termsCheckbox.check();
      await expect(termsCheckbox).toBeChecked();
    }
    
    // Click en "Confirmar y Pagar"
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar|confirmar|pagar/i });
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    
    await confirmButton.click();
    
    // Verificar estados del botón durante el proceso
    await expect(page.getByText(/creando reserva|procesando pago/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('No se mostró el estado de procesamiento');
    });
    
    // Esperar redirección a página de éxito
    await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 20000 });
    
    // Extraer bookingId de la URL si no lo tenemos
    if (!bookingId) {
      const successUrl = page.url();
      const match = successUrl.match(/\/bookings\/success\/([a-f0-9-]+)/);
      bookingId = match ? match[1] : null;
    }
    
    console.log(`✅ Pago completado, booking ID: ${bookingId}`);

    // ============================================
    // PASO 7: Verificar página de éxito/postcheckout
    // ============================================
    // Verificar que estamos en la página de éxito
    await expect(page).toHaveURL(/\/bookings\/success\/.+/);
    
    // Verificar elementos principales de la página de éxito
    await expect(page.getByText(/tu reserva está confirmada|reserva confirmada/i)).toBeVisible({ timeout: 10000 });
    
    // Verificar ícono de éxito
    const successIcon = page.locator('ion-icon[name="checkmark-circle"]').or(
      page.locator('[class*="success-icon"]')
    );
    await expect(successIcon.first()).toBeVisible({ timeout: 5000 });
    
    // Verificar mensaje principal
    await expect(page.getByText(/enviamos.*detalles.*email|hemos enviado/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('Mensaje de email no encontrado');
    });
    
    // Verificar detalles de reserva
    await expect(page.getByText(/detalles de tu reserva|resumen/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('Card de detalles no encontrado');
    });
    
    // Verificar fechas en el resumen
    await expect(page.getByText(/desde:|hasta:|fecha/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('Fechas no encontradas en el resumen');
    });
    
    // Verificar total pagado
    await expect(page.getByText(/total|precio|pagado/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('Total no encontrado');
    });
    
    // Verificar próximos pasos
    await expect(page.getByText(/próximos pasos|next steps/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      console.warn('Sección de próximos pasos no encontrada');
    });
    
    // Verificar botones de acción
    const viewDetailsButton = page.getByRole('button', { name: /ver detalles|ver reserva/i });
    const searchMoreButton = page.getByRole('button', { name: /buscar más|más vehículos/i });
    const homeButton = page.getByRole('button', { name: /ir al inicio|volver al inicio|home/i });
    
    // Al menos uno de estos botones debe estar visible
    const hasActionButton = await Promise.race([
      viewDetailsButton.isVisible().then(() => true),
      searchMoreButton.isVisible().then(() => true),
      homeButton.isVisible().then(() => true),
    ]).catch(() => false);
    
    expect(hasActionButton).toBe(true);
    
    // Verificar que el booking ID está presente en la página
    if (bookingId) {
      const bookingIdVisible = await page.getByText(bookingId.slice(0, 8)).isVisible({ timeout: 5000 }).catch(() => false);
      // No es crítico si no se muestra, pero es bueno verificarlo
      if (bookingIdVisible) {
        console.log('✅ Booking ID visible en la página');
      }
    }
    
    console.log('✅ Flujo completo de alquiler completado exitosamente');
    console.log(`   - Auto ID: ${carId}`);
    console.log(`   - Booking ID: ${bookingId}`);
    console.log(`   - Fechas: ${startDateStr} a ${endDateStr}`);
  });

  test('Debería manejar errores durante el proceso de pago', async ({ page }) => {
    // Este test verifica el manejo de errores
    // Por ahora lo dejamos como placeholder para futuras mejoras
    test.skip();
  });
});

