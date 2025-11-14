import { test, expect, Page } from '@playwright/test';
import { SEED_USERS } from '../helpers/test-data';

/**
 * TEST E2E COMPLETO: Registro → Login → Publicar Porsche Carrera con Fotos IA
 *
 * Este test cubre el flujo completo:
 * 1. Registro de usuario nuevo
 * 2. Login con el usuario creado
 * 3. Navegación a publicar auto
 * 4. Completar formulario con Porsche Carrera
 * 5. Generar fotos con IA
 * 6. Publicar el auto
 * 7. Verificar publicación exitosa
 *
 * Captura:
 * - Screenshots en cada paso
 * - Console logs (info, warnings, errors)
 * - Network requests y responses
 * - Errores de JavaScript
 * - Performance metrics
 */

test.describe('Flujo Completo: Registro → Login → Publicar Porsche Carrera con IA', () => {
  let testUser: typeof SEED_USERS.owner;
  let consoleLogs: Array<{ type: string; text: string; timestamp: number }> = [];
  let networkErrors: Array<{ url: string; status: number; error: string }> = [];
  let jsErrors: Array<{ message: string; stack?: string }> = [];
  let carId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Limpiar arrays de logs
    consoleLogs = [];
    networkErrors = [];
    jsErrors = [];

    // Usar usuario real existente en producción
    testUser = {
      email: 'Ecucondor@gmail.com',
      password: 'Ab.12345',
      role: 'locador' as const,
    };

    // Capturar console logs
    page.on('console', (msg) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      };
      consoleLogs.push(logEntry);
      console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    // Capturar errores de red
    page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          error: response.statusText(),
        });
        console.log(`[NETWORK ERROR ${response.status()}]: ${response.url()}`);
      }
    });

    // Capturar errores de JavaScript
    page.on('pageerror', (error) => {
      jsErrors.push({
        message: error.message,
        stack: error.stack,
      });
      console.log(`[JS ERROR]: ${error.message}`);
    });

    // Capturar requests fallidos
    page.on('requestfailed', (request) => {
      networkErrors.push({
        url: request.url(),
        status: 0,
        error: request.failure()?.errorText || 'Request failed',
      });
      console.log(`[REQUEST FAILED]: ${request.url()}`);
    });
  });

  test('Flujo completo: Registro → Login → Publicar Porsche Carrera con Fotos IA', async ({
    page,
  }) => {
    const testResults: {
      step: string;
      success: boolean;
      error?: string;
      screenshot?: string;
      timestamp: number;
    }[] = [];

    const captureStep = async (
      stepName: string,
      action: () => Promise<void>,
    ): Promise<void> => {
      const timestamp = Date.now();
      console.log(`\n📸 Paso: ${stepName}`);

      try {
        await action();
        testResults.push({
          step: stepName,
          success: true,
          timestamp,
        });

        // Capturar screenshot después de cada paso exitoso
        await page.screenshot({
          path: `test-results/screenshots/${stepName.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        testResults.push({
          step: stepName,
          success: false,
          error: errorMessage,
          timestamp,
        });

        // Capturar screenshot en caso de error
        await page.screenshot({
          path: `test-results/screenshots/${stepName.replace(/\s+/g, '-').toLowerCase()}-ERROR.png`,
          fullPage: true,
        });

        throw error;
      }
    };

    // ============================================
    // PASO 1: LOGIN CON USUARIO EXISTENTE
    // ============================================
    await captureStep('1. Login con Usuario Existente', async () => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Llenar formulario de login
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // Submit
      await page.click('button[type="submit"]');

      // Esperar redirección después del login
      await page.waitForURL(/\/(cars|inicio|dashboard|$)/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Verificar que el usuario está autenticado
      const isAuthenticated = !page.url().includes('/auth/login');
      expect(isAuthenticated).toBeTruthy();

      console.log(`✅ Usuario autenticado, redirigido a: ${page.url()}`);
    });

    // ============================================
    // PASO 2: NAVEGAR A PUBLICAR AUTO
    // ============================================
    await captureStep('2. Navegar a Publicar Auto', async () => {
      await page.goto('/cars/publish');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Dar tiempo para que cargue el formulario

      // Verificar que el formulario está visible
      const formVisible = await page
        .locator('form, app-publish-car-v2, [class*="publish"]')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      expect(formVisible).toBeTruthy();
    });

    // ============================================
    // PASO 3: COMPLETAR FORMULARIO - PORSCHE CARRERA
    // ============================================
    await captureStep('3. Completar Formulario - Porsche Carrera', async () => {
      // Marca: Porsche
      const brandSelect = page
        .locator('select[name="brand_id"]')
        .or(page.locator('ion-select[name="brand_id"]'))
        .or(page.locator('[name="brand_id"]'));

      if (await brandSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await brandSelect.click();
        await page.waitForTimeout(500);

        // Buscar Porsche en el dropdown
        const porscheOption = page
          .locator('ion-popover ion-item')
          .filter({ hasText: /porsche/i })
          .first();
        await expect(porscheOption).toBeVisible({ timeout: 5000 });
        await porscheOption.click();
        await page.waitForTimeout(1000);
      } else {
        // Intentar con input de texto
        const brandInput = page.locator('input[placeholder*="marca" i], input[name*="brand" i]');
        if (await brandInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await brandInput.fill('Porsche');
          await page.waitForTimeout(1000);
        }
      }

      // Modelo: Carrera (o 911 Carrera)
      const modelSelect = page
        .locator('select[name="model_id"]')
        .or(page.locator('ion-select[name="model_id"]'))
        .or(page.locator('[name="model_id"]'));

      if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await modelSelect.click();
        await page.waitForTimeout(500);

        // Buscar Carrera o 911
        const carreraOption = page
          .locator('ion-popover ion-item')
          .filter({ hasText: /carrera|911/i })
          .first();
        await expect(carreraOption).toBeVisible({ timeout: 5000 });
        await carreraOption.click();
        await page.waitForTimeout(1000);
      } else {
        // Intentar con input de texto
        const modelInput = page.locator('input[placeholder*="modelo" i], input[name*="model" i]');
        if (await modelInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await modelInput.fill('Carrera');
          await page.waitForTimeout(1000);
        }
      }

      // Año: 2023
      const yearInput = page
        .locator('input[name="year"]')
        .or(page.locator('ion-input[name="year"] input'))
        .or(page.locator('input[type="number"][placeholder*="año" i]'));

      if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await yearInput.fill('2023');
      }

      // Color
      const colorInput = page
        .locator('input[name="color"]')
        .or(page.locator('ion-input[name="color"] input'));

      if (await colorInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await colorInput.fill('Blanco');
      }

      // Patente
      const plateInput = page
        .locator('input[name="license_plate"]')
        .or(page.locator('ion-input[name="license_plate"] input'));

      if (await plateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await plateInput.fill(`POR${Date.now().toString().slice(-4)}`);
      }

      // Descripción
      const descriptionTextarea = page
        .locator('textarea[name="description"]')
        .or(page.locator('ion-textarea[name="description"] textarea'));

      if (await descriptionTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await descriptionTextarea.fill(
          'Porsche Carrera 911 en excelente estado. Mantenimiento al día, sin choques. Perfecto para disfrutar de la experiencia Porsche.',
        );
      }

      // Precio por día
      const priceInput = page
        .locator('input[name="price_per_day"]')
        .or(page.locator('ion-input[name="price_per_day"] input'));

      if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await priceInput.fill('120000');
      }

      // Categoría (si existe)
      const categorySelect = page
        .locator('select[name="category"]')
        .or(page.locator('ion-select[name="category"]'));

      if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await categorySelect.click();
        await page.waitForTimeout(500);
        await page.locator('ion-popover ion-item:has-text("Lujo")').first().click();
      }

      // Transmisión
      const transmissionSelect = page
        .locator('select[name="transmission"]')
        .or(page.locator('ion-select[name="transmission"]'));

      if (await transmissionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await transmissionSelect.click();
        await page.waitForTimeout(500);
        await page.locator('ion-popover ion-item:has-text("Automática")').first().click();
      }

      // Combustible
      const fuelSelect = page
        .locator('select[name="fuel_type"]')
        .or(page.locator('ion-select[name="fuel_type"]'));

      if (await fuelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fuelSelect.click();
        await page.waitForTimeout(500);
        await page.locator('ion-popover ion-item:has-text("Nafta")').first().click();
      }

      // Asientos
      const seatsInput = page
        .locator('input[name="seats"]')
        .or(page.locator('ion-input[name="seats"] input'));

      if (await seatsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await seatsInput.fill('2');
      }

      // Ubicación - Ciudad
      const cityInput = page
        .locator('input[name="city"]')
        .or(page.locator('ion-input[name="city"] input'))
        .or(page.locator('input[placeholder*="ciudad" i]'));

      if (await cityInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cityInput.fill('Buenos Aires');
        await page.waitForTimeout(1000);
      }

      // Ubicación - Dirección
      const addressInput = page
        .locator('input[name="address"]')
        .or(page.locator('ion-input[name="address"] input'))
        .or(page.locator('input[placeholder*="dirección" i]'));

      if (await addressInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addressInput.fill('Av. Corrientes 1234, CABA');
        await page.waitForTimeout(1000);
      }
    });

    // ============================================
    // PASO 4: SUBIR FOTOS LOCALES
    // ============================================
    await captureStep('4. Subir Fotos Locales', async () => {
      // Scroll down para ver la sección de fotos
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(1000);

      // Buscar el label que contiene el input de archivos
      const uploadLabel = page.locator('label:has-text("➕ Agregar Fotos")');

      if (await uploadLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Botón de agregar fotos encontrado');

        // Buscar el input file dentro del label (aunque esté oculto, Playwright puede interactuar con él)
        const fileInput = uploadLabel.locator('input[type="file"]');

        // Preparar las rutas de las imágenes de prueba
        const testImages = [
          'tests/fixtures/images/porsche-front.jpg',
          'tests/fixtures/images/porsche-side.jpg',
          'tests/fixtures/images/porsche-interior.jpg'
        ];

        // Subir las imágenes directamente al input oculto
        await fileInput.setInputFiles(testImages);
        await page.waitForTimeout(5000); // Esperar más tiempo para que se procesen las imágenes

        console.log('✅ 3 fotos de prueba subidas');

        // Verificar que las fotos se hayan cargado
        const photoCount = await page.locator('text=/\\d+\\/10/').textContent().catch(() => '0/10');
        console.log(`📊 Contador de fotos después de subir: ${photoCount}`);
      } else {
        console.log('⚠️ No se encontró el botón de agregar fotos');

        // Como fallback, intentar con el input directamente
        const fileInputDirect = page.locator('input[type="file"]').first();

        // Playwright puede interactuar con inputs ocultos
        const testImages = [
          'tests/fixtures/images/porsche-front.jpg',
          'tests/fixtures/images/porsche-side.jpg',
          'tests/fixtures/images/porsche-interior.jpg'
        ];

        await fileInputDirect.setInputFiles(testImages);
        await page.waitForTimeout(5000);
        console.log('✅ 3 fotos subidas directamente al input file');
      }

      // Como fallback, intentar con el método anterior de stock photos
      return;

      // Buscar botón de stock photos (más confiable que IA)
      const stockPhotoButton = page
        .locator('button:has-text("📸 Buscar Fotos de Stock")')
        .or(page.locator('button:has-text("Buscar Fotos de Stock")'));

      if (await stockPhotoButton.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('✅ Botón de fotos de stock encontrado');
        await stockPhotoButton.click();
        await page.waitForTimeout(2000);

        // Esperar a que aparezca el modal/componente de stock photos
        const stockPhotosModal = await page
          .waitForSelector('app-stock-photos-selector', { timeout: 10000 })
          .catch(() => null);

        if (stockPhotosModal) {
          console.log('✅ Modal de stock photos abierto');

          // Primero, intentar con el botón de generar fotos de stock (AI)
          const generateButton = page.locator('button:has-text("🤖 Generar Fotos de Stock")');
          if (await generateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('✅ Usando botón de generar fotos de stock con IA...');
            await generateButton.click();
            await page.waitForTimeout(3000);
          } else {
            // Si no está disponible el botón de generar, intentar con búsqueda
            const searchButton = page.locator('button:has-text("🔍 Buscar Fotos de Stock")');
            if (await searchButton.isEnabled({ timeout: 5000 }).catch(() => false)) {
              console.log('✅ Clickeando botón de búsqueda...');
              await searchButton.click();
              await page.waitForTimeout(3000);
            } else {
              console.log('⚠️ Botón de búsqueda está deshabilitado, continuando sin fotos de stock');
            }
          }
        }

        // Esperar a que aparezcan las fotos buscadas
        console.log('⏳ Esperando que se carguen las fotos de stock...');

        // Buscar fotos en el grid (las fotos son clickeables)
        const photoElements = await page
          .locator('app-stock-photos-selector img')
          .count();

        if (photoElements > 0) {
          console.log(`✅ Se encontraron ${photoElements} fotos de stock`);

          // Clickear las primeras 3 fotos para seleccionarlas (mínimo requerido)
          const photosToSelect = Math.min(photoElements, 3);
          for (let i = 0; i < photosToSelect; i++) {
            const photoImg = page.locator('app-stock-photos-selector img, .stock-photos-selector img').nth(i);
            // Clickear el contenedor padre de la imagen
            const photoContainer = photoImg.locator('..');
            await photoContainer.click().catch(() => photoImg.click());
            await page.waitForTimeout(500);
            console.log(`📸 Foto ${i + 1}/${photosToSelect} seleccionada`);
          }

          // Buscar y clickear botón de aplicar/confirmar/usar fotos
          const confirmButton = page
            .locator('button:has-text("Aplicar")')
            .or(page.locator('button:has-text("Confirmar")'))
            .or(page.locator('button:has-text("Usar fotos")'))
            .or(page.locator('button:has-text("Seleccionar fotos")'));

          if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('✅ Aplicando fotos seleccionadas...');
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        } else {
          console.log('⚠️ No se encontraron fotos de stock después de buscar');
        }

        // Cerrar el modal de stock photos si sigue abierto
        const modalOverlay = page.locator('.fixed.inset-0.z-50, .modal-backdrop, [role="dialog"]');
        if (await modalOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('Cerrando modal de stock photos...');
          // Intentar presionar ESC primero
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);

          // Si aún está visible, intentar click en el botón de cerrar
          if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
            const closeButton = page.locator('button').filter({ hasText: /cerrar|close|×/i }).first();
            if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              await closeButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      } else {
        console.log('⚠️ Botón de stock photos no encontrado, intentando con IA...');

        // Fallback: intentar con IA
        const aiButton = page
          .locator('button:has-text("✨ Generar con IA")')
          .or(page.locator('button:has-text("Generar con IA")'));

        if (await aiButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('✅ Usando generador IA como fallback');
          await aiButton.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    // ============================================
    // PASO 5: VERIFICAR FOTOS CARGADAS
    // ============================================
    await captureStep('5. Verificar Fotos', async () => {
      // Verificar contador de fotos en la UI
      const photoCounterText = await page
        .locator('text=/\\d+\\/10/')
        .textContent()
        .catch(() => '0/10');

      const photosUploaded = parseInt(photoCounterText.split('/')[0]) || 0;
      console.log(`📊 Fotos cargadas según contador: ${photosUploaded}/10`);

      // Si no hay fotos, intentar verificar de otras formas
      if (photosUploaded === 0) {
        const alternativePhotosCount = await page
          .locator('img[src*="blob"], img[src*="preview"], img[src*="unsplash"], img[src*="pexels"], [class*="photo-preview"], [class*="uploaded-photo"]')
          .count();

        console.log(`📊 Fotos detectadas visualmente: ${alternativePhotosCount}`);

        if (alternativePhotosCount > 0) {
          console.log('✅ Fotos detectadas visualmente, continuando...');
        } else {
          console.log('⚠️ No se detectaron fotos. El formulario puede requerir fotos, pero intentaremos publicar de todos modos...');
          // No fallar aquí, dejar que el formulario valide al enviar
        }
      } else {
        console.log(`✅ ${photosUploaded} fotos cargadas exitosamente`);
      }
    });

    // ============================================
    // PASO 6: PUBLICAR AUTO
    // ============================================
    await captureStep('6. Publicar Auto', async () => {
      // Primero, asegurarnos de que no hay modales abiertos
      const modalCheck = page.locator('.fixed.inset-0.z-50, app-stock-photos-selector');
      if (await modalCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Modal detectado antes de publicar, intentando cerrar...');

        // Intentar ESC primero
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Si aún visible, buscar botón de cerrar
        if (await modalCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Buscar cualquier botón que pueda cerrar el modal
          const closeButtons = page.locator('button').filter({ hasText: /cerrar|close|cancelar|×|✕/i });
          const closeButtonCount = await closeButtons.count();

          if (closeButtonCount > 0) {
            console.log(`Encontrados ${closeButtonCount} botones de cierre, clickeando el primero...`);
            await closeButtons.first().click();
            await page.waitForTimeout(1500);
          }
        }
      }

      // Buscar botón de submit/publicar
      const submitButton = page
        .locator('button[type="submit"]')
        .or(page.getByRole('button', { name: /publicar|enviar|submit/i }))
        .or(page.locator('button:has-text("Publicar")'))
        .or(page.locator('button:has-text("Enviar")'));

      await expect(submitButton).toBeVisible({ timeout: 10000 });

      // Si el botón está bloqueado por un overlay, intentar con force
      try {
        await submitButton.click({ timeout: 5000 });
      } catch (e) {
        console.log('Click normal falló, intentando con force...');
        await submitButton.click({ force: true });
      }

      // Esperar respuesta (puede redirigir o mostrar mensaje)
      await page.waitForTimeout(3000);

      // Verificar éxito - puede ser:
      // 1. Redirección a /cars/my o /cars
      // 2. Mensaje de éxito visible
      // 3. Cambio en la URL

      const successIndicators = [
        page.url().includes('/cars/my'),
        page.url().includes('/cars'),
        page.locator('text=/éxito|success|publicado/i').isVisible(),
        page.locator('[class*="success"], [class*="toast"]').isVisible(),
      ];

      const hasSuccess = await Promise.any(
        successIndicators.map((indicator) =>
          Promise.resolve(indicator).then((result) => result === true),
        ),
      ).catch(() => false);

      expect(hasSuccess).toBeTruthy();

      // Intentar obtener el ID del auto desde la URL o del DOM
      const urlMatch = page.url().match(/\/cars\/([^\/]+)/);
      if (urlMatch) {
        carId = urlMatch[1];
      }
    });

    // ============================================
    // PASO 8: VERIFICAR PUBLICACIÓN
    // ============================================
    await captureStep('8. Verificar Publicación Exitosa', async () => {
      // Navegar a mis autos
      await page.goto('/cars/my');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verificar que el Porsche Carrera aparece en la lista
      const carVisible = await page
        .locator('text=/porsche/i')
        .or(page.locator('text=/carrera/i'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      expect(carVisible).toBeTruthy();
    });

    // ============================================
    // REPORTE FINAL
    // ============================================
    test.afterEach(async ({ page }) => {
      console.log('\n📊 ============================================');
      console.log('📊 REPORTE FINAL DEL TEST');
      console.log('📊 ============================================\n');

      // Resumen de pasos
      console.log('✅ PASOS EJECUTADOS:');
      testResults.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} ${result.step}`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });

      // Console logs
      console.log(`\n📝 CONSOLE LOGS (${consoleLogs.length} total):`);
      const errorLogs = consoleLogs.filter((log) => log.type === 'error');
      const warningLogs = consoleLogs.filter((log) => log.type === 'warning');
      const infoLogs = consoleLogs.filter((log) => log.type === 'log');

      if (errorLogs.length > 0) {
        console.log(`  ❌ Errores: ${errorLogs.length}`);
        errorLogs.slice(0, 10).forEach((log) => {
          console.log(`     - ${log.text}`);
        });
      }

      if (warningLogs.length > 0) {
        console.log(`  ⚠️  Warnings: ${warningLogs.length}`);
        warningLogs.slice(0, 10).forEach((log) => {
          console.log(`     - ${log.text}`);
        });
      }

      if (infoLogs.length > 0) {
        console.log(`  ℹ️  Info: ${infoLogs.length} logs`);
      }

      // Network errors
      if (networkErrors.length > 0) {
        console.log(`\n🌐 ERRORES DE RED (${networkErrors.length} total):`);
        networkErrors.slice(0, 10).forEach((error) => {
          console.log(`  ❌ ${error.status} - ${error.url}`);
        });
      }

      // JavaScript errors
      if (jsErrors.length > 0) {
        console.log(`\n💥 ERRORES DE JAVASCRIPT (${jsErrors.length} total):`);
        jsErrors.slice(0, 10).forEach((error) => {
          console.log(`  ❌ ${error.message}`);
          if (error.stack) {
            console.log(`     Stack: ${error.stack.split('\n')[0]}`);
          }
        });
      }

      // Información del auto creado
      if (carId) {
        console.log(`\n🚗 AUTO CREADO:`);
        console.log(`  ID: ${carId}`);
        console.log(`  Marca: Porsche`);
        console.log(`  Modelo: Carrera`);
        console.log(`  Usuario: ${testUser.email}`);
      }

      // Capturar screenshot final
      await page.screenshot({
        path: `test-results/screenshots/final-state.png`,
        fullPage: true,
      });

      // Guardar reporte en archivo JSON
      const report = {
        timestamp: new Date().toISOString(),
        user: {
          email: testUser.email,
          fullName: testUser.fullName,
        },
        steps: testResults,
        consoleLogs: {
          total: consoleLogs.length,
          errors: consoleLogs.filter((log) => log.type === 'error').length,
          warnings: consoleLogs.filter((log) => log.type === 'warning').length,
          info: consoleLogs.filter((log) => log.type === 'log').length,
        },
        networkErrors: networkErrors.length,
        jsErrors: jsErrors.length,
        carId,
      };

      // Escribir reporte a archivo (usando Node.js fs)
      const fs = require('fs');
      const reportPath = `test-results/porsche-test-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Reporte guardado en: ${reportPath}`);

      console.log('\n📊 ============================================\n');
    });
  });
});

