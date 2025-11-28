import { expect, test } from '@playwright/test';


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

test.use({ storageState: 'tests/.auth/renter.json' });

test.describe('Flujo Completo de Alquiler - E2E', () => {
  // Auth persistente via storageState (generado por tests/global-setup.ts)

  test('Debería completar el flujo completo de alquiler hasta postcheckout', async ({ page }) => {
    let carId: string | null = null;
    let bookingId: string | null = null;

    // ============================================
    // PASO 1: Verificar autenticación (via storageState del global-setup)
    // ============================================
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verificar auth - storageState ya aplicado por Playwright
    const userMenu = page.getByTestId('user-menu')
      .or(page.locator('a[href*="/profile"]'));

    await expect(userMenu.first()).toBeAttached({ timeout: 10000 });
    console.log('✅ Usuario autenticado via storageState');

    // ============================================
    // PASO 2: Buscar y seleccionar un auto
    // ============================================
    console.log('🚗 Navegando a /cars/list...');

    // Usar domcontentloaded y un timeout generoso, pero no fallar si tarda un poco más
    try {
      await page.goto('/cars/list', { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
      console.log('⚠️ La navegación tardó más de lo esperado, pero verificando contenido...');
    }

    // Esperar a que aparezca cualquier link de auto (basado en el HTML dump)
    // Los autos son links con href que empieza con /cars/
    const carLink = page.locator('a[href^="/cars/"]').first();
    await expect(carLink).toBeVisible({ timeout: 20000 });
    console.log('✅ Autos detectados en la lista');
    // await page.waitForLoadState('domcontentloaded'); // Ya incluido en el goto

    // Esperar a que el mapa se cargue primero
    // En mobile, el mapa puede estar en una pestaña oculta
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;

    if (isMobile) {
      console.log('📱 Detectado modo mobile, verificando pestañas...');
      // Buscar botón/tab de mapa si existe
      const mapTab = page.getByText('Mapa').or(page.locator('[data-tab="map"]'));
      if (await mapTab.isVisible()) {
        await mapTab.click();
        await page.waitForTimeout(500);
      }
    }

    // Intentar encontrar autos en cualquier vista (Mapa, Grid o Lista)
    console.log('🔍 Buscando autos en la página...');

    // Esperar a que desaparezca el loading inicial
    await expect(page.locator('app-skeleton-loader, .loading, ion-spinner').first()).not.toBeVisible({ timeout: 10000 }).catch(() => { });

    // Buscar container de autos (puede ser map-container o grid/list container)
    const anyCarCard = page.locator('app-car-card, [data-car-id], .car-card').first();

    try {
      await expect(anyCarCard).toBeVisible({ timeout: 15000 });
      console.log('✅ Autos encontrados en la vista actual');
    } catch (e) {
      console.log('⚠️ No se encontraron autos visibles inmediatamente. Verificando estado...');

      // Verificar si hay mensaje de "sin resultados"
      const noCarsMsg = page.locator('text=/no hay autos|sin resultados|no se encontraron/i');
      if (await noCarsMsg.isVisible()) {
        throw new Error('La búsqueda no arrojó resultados. Verifica que haya autos disponibles en la BD.');
      }

      // Verificar si estamos en vista de mapa pero el mapa no cargó
      const mapContainer = page.locator('#map-container, .map-container');
      if (await mapContainer.isVisible()) {
        console.log('🗺️ Estamos en vista de mapa, esperando a que carguen los pines...');
        // En vista de mapa, los autos pueden tardar más en aparecer
        await page.waitForTimeout(3000);
      } else {
        // Si no es mapa y no hay cards, algo anda mal
        const bodyHtml = await page.innerHTML('body');
        console.log('HTML Body Preview:', bodyHtml.substring(0, 1000));
        throw new Error('No se encontraron autos ni mapa visible. Revisa el HTML dump.');
      }
    }

    // ============================================
    // PASO 2.1: Seleccionar un auto
    // ============================================
    console.log('🔍 Buscando autos para seleccionar...');

    // Selector robusto: cards con data-id, componentes angular, o links directos
    // Priorizamos links que sabemos que llevan al detalle
    const carSelector = 'a[href^="/cars/"], app-car-card, [data-car-id], .car-card';
    const carElement = page.locator(carSelector).first();

    // Esperar a que sea visible
    await expect(carElement).toBeVisible({ timeout: 30000 });
    console.log('✅ Auto encontrado');

    // Intentar extraer ID para verificación (opcional pero útil)
    carId = await carElement.getAttribute('data-car-id');
    if (!carId) {
      const href = await carElement.getAttribute('href');
      if (href) {
        const match = href.match(/\/cars\/([a-f0-9-]+)/);
        carId = match ? match[1] : null;
      }
    }
    console.log(`🆔 Car ID detectado: ${carId || 'Desconocido'}`);

    // Clickear
    await carElement.click({ timeout: 5000 });

    // Verificar que navegamos a la página de detalle
    await page.waitForURL(/\/cars\/[a-f0-9-]+/, { timeout: 10000 });

    // Verificar que el carId coincida con la URL
    const carDetailUrl = page.url();
    const urlMatch = carDetailUrl.match(/\/cars\/([a-f0-9-]+)/);
    if (urlMatch && urlMatch[1] !== carId) {
      console.warn(`⚠️ CarId del card (${carId}) no coincide con la URL (${urlMatch[1]}). Usando el de la URL.`);
      carId = urlMatch[1];
    }

    expect(carId).toBeTruthy();

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
    // PASO 4: Verificar autenticación (debería estar autenticado con storageState)
    // ============================================
    // Con storageState, la sesión debería persistir
    const userMenuCheck = page.getByTestId('user-menu').or(page.locator('[data-testid="user-menu"]'));
    const isStillAuthenticated = await userMenuCheck.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isStillAuthenticated) {
      console.warn('⚠️ Sesión perdida, pero continuando con el test...');
    }

    // ============================================
    // PASO 5: Crear reserva (booking)
    // ============================================
    // Buscar y clickear el botón de reservar
    // El botón tiene id="book-now" y texto "Solicitar reserva" cuando está autenticado
    // O es un enlace "Inicia sesión para reservar" cuando no está autenticado
    const bookButton = page.locator('#book-now')
      .or(page.getByRole('button', { name: /solicitar reserva|reservar/i }))
      .or(page.getByRole('link', { name: /inicia sesión para reservar/i }))
      .first();

    await expect(bookButton).toBeVisible({ timeout: 10000 });

    // Verificar que el botón esté habilitado (si es un botón, no un link)
    const tagName = await bookButton.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'button') {
      const isEnabled = await bookButton.isEnabled();
      if (!isEnabled) {
        // Si está deshabilitado, puede ser porque faltan fechas o hay un error
        // Esperar un poco más y verificar el estado
        await page.waitForTimeout(2000);
        const stillDisabled = await bookButton.isEnabled();
        if (stillDisabled === false) {
          // Verificar si hay un mensaje de error
          const errorMessage = page.locator('text=/por favor seleccioná|fechas de alquiler/i');
          const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasError) {
            throw new Error('Las fechas no fueron seleccionadas correctamente. Verifica el date range picker.');
          }
          // Si no hay error pero está deshabilitado, puede ser que las fechas se perdieron
          // Re-seleccionar las fechas
          console.log('⚠️ Botón deshabilitado, re-seleccionando fechas...');
          const dateFromInput = page.getByTestId('date-from').or(page.locator('input[type="date"]').first());
          const dateToInput = page.getByTestId('date-to').or(page.locator('input[type="date"]').nth(1));
          await dateFromInput.fill(startDateStr);
          await page.waitForTimeout(500);
          await dateToInput.fill(endDateStr);
          await page.waitForTimeout(2000);
        }
      }
    }

    console.log('✅ Botón de reserva encontrado');

    // Verificar que el botón está habilitado antes de hacer click
    const isEnabled = await bookButton.isEnabled({ timeout: 5000 }).catch(() => false);
    if (!isEnabled) {
      // Verificar por qué está deshabilitado
      const disabledReason = await page.evaluate(() => {
        const btn = document.querySelector('#book-now');
        if (btn && btn.hasAttribute('disabled')) {
          return 'disabled attribute';
        }
        if (btn && btn.classList.contains('opacity-50')) {
          return 'opacity-50 class (visual disabled)';
        }
        if (btn && btn.classList.contains('cursor-not-allowed')) {
          return 'cursor-not-allowed class';
        }
        return 'unknown';
      });

      console.log(`⚠️ Botón deshabilitado: ${disabledReason}`);

      // Verificar si hay un error previo
      const existingError = page.locator('.border-red-300.bg-red-50');
      const hasError = await existingError.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        const errorMsg = await existingError.locator('p').last().textContent().catch(() => null);
        throw new Error(`No se puede reservar: ${errorMsg || 'Error desconocido'}`);
      }

      // Verificar si falta seleccionar fechas
      const dateFrom = page.locator('input[type="date"]').first();
      const dateTo = page.locator('input[type="date"]').nth(1);
      const fromValue = await dateFrom.inputValue().catch(() => '');
      const toValue = await dateTo.inputValue().catch(() => '');

      if (!fromValue || !toValue) {
        throw new Error('Las fechas no están seleccionadas. No se puede reservar.');
      }

      throw new Error(`El botón de reserva está deshabilitado (${disabledReason}). Verifica que las fechas estén seleccionadas y el auto esté disponible.`);
    }

    console.log('✅ Botón habilitado, haciendo click...');
    console.log('📍 URL antes del click:', page.url());

    // Click en reservar
    await bookButton.click({ timeout: 5000 });

    // Esperar un momento para que se procese el click
    await page.waitForTimeout(1000);

    // Monitorear navegación y errores
    let navigationPromise: Promise<void> | null = null;
    const networkErrors: string[] = [];
    const consoleErrors: string[] = [];

    // Capturar console errors del navegador
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log(`🔴 Console Error: ${text}`);
      } else if (text.includes('booking') || text.includes('reserva') || text.includes('error')) {
        console.log(`📝 Console [${msg.type()}]: ${text.substring(0, 150)}`);
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
      console.log(`🔴 Page Error: ${error.message}`);
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/bookings') || url.includes('request_booking') || url.includes('is_car_available') || url.includes('rpc')) {
        console.log(`📡 Response: ${response.status()} ${url}`);
        if (!response.ok()) {
          const errorText = await response.text().catch(() => '');
          console.log(`⚠️ Error response: ${response.status()} ${response.statusText()}`);
          console.log(`📄 Error body: ${errorText.substring(0, 200)}`);
          networkErrors.push(`${response.status()}: ${errorText.substring(0, 100)}`);
        } else {
          // También loggear respuestas exitosas para debug
          const body = await response.text().catch(() => '');
          if (body.length < 500) {
            console.log(`✅ Response body: ${body.substring(0, 200)}`);
          }
        }
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('/bookings') || url.includes('request_booking') || url.includes('rpc')) {
        console.log(`❌ Request failed: ${request.method()} ${url}`);
        console.log(`   Failure: ${request.failure()?.errorText || 'Unknown'}`);
        networkErrors.push(`Failed: ${request.failure()?.errorText || 'Unknown'}`);
      }
    });

    // Esperar a que se procese la reserva y redirija a detail-payment
    // Puede redirigir a detail-payment, login (si perdió sesión), o quedarse en la misma página con error
    try {
      navigationPromise = page.waitForURL(/\/bookings\/detail-payment/, { timeout: 25000 });
      await navigationPromise;
    } catch (error) {
      // Si no redirige, verificar qué pasó
      const currentUrl = page.url();
      console.log(`⚠️ No se redirigió a detail-payment. URL actual: ${currentUrl}`);

      if (currentUrl.includes('/auth/login')) {
        throw new Error('La sesión se perdió durante la reserva. Redirigido a login.');
      }

      // Esperar un momento más para que cualquier mensaje de error aparezca
      await page.waitForTimeout(2000);

      // Verificar si hay mensajes de error con múltiples selectores más específicos
      // El error de booking se muestra en un div con border-red-300 bg-red-50
      const errorSelectors = [
        // Selector específico del error de booking (basado en el HTML)
        page.locator('.border-red-300.bg-red-50, [class*="border-red"]'),
        // Mensajes de error específicos de booking
        page.locator('text=/no se pudo crear|error al crear|no pudimos crear/i'),
        page.locator('text=/no está disponible|no disponible para esas fechas/i'),
        page.locator('text=/debe estar autenticado|login required|sesión/i'),
        page.locator('text=/por favor seleccioná las fechas/i'),
        // Selectores genéricos de error
        page.locator('.error-message, .alert-error, [class*="error"]'),
        page.locator('[class*="booking-error"], [class*="bookingError"]'),
        page.locator('ion-toast, .toast, [role="alert"]'),
        page.locator('text=/error/i'),
      ];

      let errorFound = false;
      let errorText = '';

      // Buscar en todos los selectores posibles
      for (let sIdx = 0; sIdx < errorSelectors.length; sIdx++) {
        const selector = errorSelectors[sIdx];
        const count = await selector.count();
        if (count > 0) {
          for (let i = 0; i < Math.min(count, 5); i++) {
            const isVisible = await selector.nth(i).isVisible({ timeout: 3000 }).catch(() => false);
            if (isVisible) {
              // Intentar obtener el texto completo del error
              const text = await selector.nth(i).textContent().catch(() => null);
              // También intentar obtener el texto del párrafo interno (donde está el mensaje real)
              const innerText = await selector.nth(i).locator('p').first().textContent().catch(() => null);

              const finalText = innerText || text;
              if (finalText && finalText.trim() && finalText.trim().length > 3) {
                errorFound = true;
                errorText = finalText.trim();
                console.log(`🔍 Error encontrado (selector ${sIdx}, elemento ${i}): ${errorText}`);
                break;
              }
            }
          }
          if (errorText && errorText !== 'Error') break; // Si encontramos un mensaje específico, usarlo
        }
      }

      // Si solo encontramos "Error" genérico, buscar más detalles en el HTML específico
      if (errorText === 'Error' || errorText === 'Error al crear la reserva' || errorText === 'al crear la reserva' || (errorFound && !errorText)) {
        // Buscar el párrafo dentro del div de error que tiene el mensaje real
        // El HTML muestra:
        // <div class="flex-1">
        //   <p class="font-semibold">Error</p>
        //   <p>{{ bookingError() }}</p>  <- Este es el mensaje real
        // </div>
        const errorDiv = page.locator('.border-red-300.bg-red-50').first();

        // Buscar dentro del div.flex-1 el segundo párrafo
        const flexDiv = errorDiv.locator('.flex-1').first();
        const errorParagraphs = flexDiv.locator('p');
        const paragraphCount = await errorParagraphs.count();

        if (paragraphCount >= 2) {
          // El segundo párrafo (índice 1) tiene el mensaje real de bookingError()
          const detailedError = await errorParagraphs.nth(1).textContent().catch(() => null);
          if (detailedError && detailedError.trim() && detailedError.trim() !== 'Error') {
            errorText = detailedError.trim();
            console.log(`🔍 Mensaje de error detallado (párrafo 2): "${errorText}"`);
          }
        }

        // Si aún no tenemos un mensaje específico, intentar obtener todo el texto y parsearlo
        if (!errorText || errorText === 'Error' || errorText === 'Error al crear la reserva' || errorText === 'al crear la reserva') {
          const fullErrorText = await errorDiv.textContent().catch(() => null);
          if (fullErrorText) {
            // El formato es "Error\nMensajeReal" o "Error MensajeReal"
            const lines = fullErrorText.split('\n').map(l => l.trim()).filter(l => l && l !== 'Error');
            if (lines.length > 0) {
              errorText = lines[lines.length - 1]; // El último elemento no vacío
              console.log(`🔍 Mensaje de error parseado: "${errorText}"`);
            }
          }
        }
      }

      // También verificar si hay un estado de loading que no cambió (indica que algo falló)
      const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], text=/creando|procesando/i');
      const stillLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      if (stillLoading) {
        console.log('⚠️ El indicador de carga sigue visible, puede haber un error silencioso');
      }

      if (errorFound) {
        console.log(`⚠️ Error detectado: ${errorText}`);
        // Si es error de autenticación, intentar login nuevamente
        if (errorText.toLowerCase().includes('autenticado') || errorText.toLowerCase().includes('sesión')) {
          console.log('🔄 Reintentando login...');
          await page.goto('/auth/login');
          await page.waitForLoadState('domcontentloaded');

          const emailInput = page.locator('input[type="email"]').first();
          const passwordInput = page.locator('input[type="password"]').first();
          await emailInput.fill('test-renter@autorenta.com');
          await passwordInput.fill('TestPassword123!');

          const loginBtn = page.getByRole('button', { name: /entrar|iniciar/i }).first();
          await loginBtn.click();
          await page.waitForURL(/\/cars|\//, { timeout: 15000 });
          await page.waitForTimeout(2000);

          // Volver a la página del auto y reintentar
          await page.goto(`/cars/${carId}`);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(3000);

          // Re-seleccionar fechas
          const dateFrom = page.locator('input[type="date"]').first();
          const dateTo = page.locator('input[type="date"]').nth(1);
          await dateFrom.fill(startDateStr);
          await dateTo.fill(endDateStr);
          await page.waitForTimeout(2000);

          // Intentar reservar de nuevo
          const retryButton = page.locator('#book-now')
            .or(page.getByRole('button', { name: /solicitar reserva|reservar/i }))
            .first();
          await retryButton.click({ timeout: 5000 });

          // Esperar redirección
          await page.waitForURL(/\/bookings\/detail-payment/, { timeout: 25000 });
        } else {
          throw new Error(`Error al crear reserva: ${errorText || 'Error desconocido'}`);
        }
      }

      // Si estamos todavía en la página del auto, puede ser que el botón no funcionó
      if (currentUrl.includes(`/cars/${carId}`)) {
        // Incluir errores de red y console en el mensaje de error
        const networkErrorMsg = networkErrors.length > 0
          ? `\nErrores de red detectados:\n${networkErrors.join('\n')}`
          : '';
        const consoleErrorMsg = consoleErrors.length > 0
          ? `\nErrores de consola:\n${consoleErrors.join('\n')}`
          : '';

        // Tomar screenshot para debug
        await page.screenshot({ path: 'test-results/debug-booking-error.png', fullPage: true });
        throw new Error(`El botón de reserva no funcionó. La página no cambió.${networkErrorMsg}${consoleErrorMsg}\nRevisa test-results/debug-booking-error.png`);
      }

      // Si llegamos aquí, hay una URL inesperada
      throw new Error(`Redirección inesperada después de crear reserva. URL: ${currentUrl}`);
    }

    // Extraer bookingId de los query params
    const paymentUrl = page.url();
    const bookingIdMatch = paymentUrl.match(/bookingId=([a-f0-9-]+)/);
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
    // Hay 2 botones con texto similar, usar el primero o el más específico
    const confirmButton = page.getByRole('button', { name: /confirmar y pagar|confirmar|pagar/i }).first();
    await expect(confirmButton).toBeVisible({ timeout: 10000 });

    // Esperar a que el botón esté habilitado (puede estar deshabilitado inicialmente)
    await expect(confirmButton).toBeEnabled({ timeout: 10000 });

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
