/**
 * Test: Publicar Porsche 911 Carrera
 *
 * Test refactorizado usando Page Objects
 * De 640 líneas → ~150 líneas
 *
 * Flujo:
 * 1. Login con usuario owner
 * 2. Navegar a publicar auto
 * 3. Llenar formulario del Porsche
 * 4. Agregar fotos de stock
 * 5. Publicar y verificar éxito
 */

import { test, expect } from '@playwright/test';
import { UserFactory } from '../../fixtures/auth/UserFactory';
import { LoginPage } from '../../page-objects/auth/LoginPage';
import { PublishCarPage } from '../../page-objects/cars/PublishCarPage';
import { StockPhotoSelector } from '../../page-objects/components/StockPhotoSelector';
import { captureStep, setupErrorCollectors, generateTestReport } from '../../helpers/test-diagnostics';

test.describe('Publicar Porsche 911 Carrera', () => {
  let userFactory: UserFactory;
  let loginPage: LoginPage;
  let publishCarPage: PublishCarPage;
  let stockPhotoSelector: StockPhotoSelector;
  let testResults: any[] = [];

  test.beforeEach(async ({ page }) => {
    // Inicializar Page Objects y factories
    userFactory = new UserFactory();
    loginPage = new LoginPage(page);
    publishCarPage = new PublishCarPage(page);
    stockPhotoSelector = new StockPhotoSelector(page);
    testResults = [];

    // Configurar collectors de errores para debugging
    const errorCollectors = setupErrorCollectors(page);

    // Al final del test, imprimir errores si los hay
    page.on('close', () => {
      errorCollectors.printErrors();
    });
  });

  test('Flujo completo: Login → Publicar Porsche con fotos de stock → Verificar', async ({ page }) => {
    // 1. SETUP: Obtener usuario para el test
    // Usando el usuario real proporcionado para este test específico
    const testUser = userFactory.getRealOwner();
    console.log(`🔑 Usando usuario: ${testUser.email}`);

    // 2. LOGIN
    const loginResult = await captureStep(
      page,
      'Login como owner',
      async () => {
        await loginPage.login(testUser.email, testUser.password);
        const isLoggedIn = await loginPage.isLoginSuccessful();
        expect(isLoggedIn).toBeTruthy();
      }
    );
    testResults.push(loginResult);

    // 3. NAVEGAR A PUBLICAR AUTO
    const navigateResult = await captureStep(
      page,
      'Navegar a publicar auto',
      async () => {
        await publishCarPage.goto();
        await expect(page).toHaveURL(/\/cars\/publish/);
      }
    );
    testResults.push(navigateResult);

    // 4. LLENAR INFORMACIÓN DEL PORSCHE
    const fillFormResult = await captureStep(
      page,
      'Llenar formulario del Porsche',
      async () => {
        await publishCarPage.fillBasicInfo({
          brand: 'Porsche',
          model: '911 Carrera',
          year: 2023,
          color: 'Blanco',
          licensePlate: `POR${Date.now().toString().slice(-4)}`,
          description: 'Porsche 911 Carrera en excelente estado. Motor 3.0L twin-turbo, tracción trasera.',
          pricePerDay: 25000,
          city: 'Buenos Aires',
          address: 'Av. del Libertador 1234, CABA'
        });

        // Verificar que no hay errores de validación
        const errors = await publishCarPage.getFormErrors();
        expect(errors).toHaveLength(0);
      }
    );
    testResults.push(fillFormResult);

    // 5. AGREGAR FOTOS DE STOCK
    const addPhotosResult = await captureStep(
      page,
      'Agregar fotos de stock',
      async () => {
        // Abrir modal de fotos
        await publishCarPage.openStockPhotosModal();

        // Seleccionar 3 fotos usando el componente
        await stockPhotoSelector.selectStockPhotos(3, 'Porsche', '911');

        // Verificar que se agregaron las fotos
        const photosCount = await publishCarPage.getPhotosCount();
        expect(photosCount).toBeGreaterThanOrEqual(3);
      }
    );
    testResults.push(addPhotosResult);

    // 6. PUBLICAR AUTO
    const publishResult = await captureStep(
      page,
      'Publicar el auto',
      async () => {
        await publishCarPage.publish();

        // Verificar publicación exitosa
        const isSuccess = await publishCarPage.isPublishSuccessful();
        expect(isSuccess).toBeTruthy();

        // Verificar redirección
        await expect(page).toHaveURL(/\/cars\/(my|[a-z0-9-]+)/);
      }
    );
    testResults.push(publishResult);

    // 7. VERIFICACIÓN FINAL
    const verificationResult = await captureStep(
      page,
      'Verificar auto en lista',
      async () => {
        // Navegar a "Mis Autos" si no estamos ahí
        if (!page.url().includes('/cars/my')) {
          await page.goto('/cars/my');
        }

        // Verificar que el Porsche aparece en la lista
        const porscheVisible = await page.locator('text=/Porsche.*911/i').isVisible();
        expect(porscheVisible).toBeTruthy();
      }
    );
    testResults.push(verificationResult);

    // GENERAR REPORTE
    const report = generateTestReport(testResults);
    expect(report.failureCount).toBe(0);
  });

  test('Validación: No permite publicar sin campos obligatorios', async ({ page }) => {
    // Login con usuario de test
    const testUser = userFactory.getRealOwner();
    await loginPage.login(testUser.email, testUser.password);

    // Ir a publicar
    await publishCarPage.goto();

    // Intentar publicar sin llenar nada
    await publishCarPage.publish();

    // Verificar que hay errores
    const errors = await publishCarPage.getFormErrors();
    expect(errors.length).toBeGreaterThan(0);

    // Verificar que NO se publicó
    const isSuccess = await publishCarPage.isPublishSuccessful();
    expect(isSuccess).toBeFalsy();
  });

  test('Fotos: Permite seleccionar hasta 10 fotos de stock', async ({ page }) => {
    // Login
    const testUser = userFactory.getRealOwner();
    await loginPage.login(testUser.email, testUser.password);

    // Ir a publicar y llenar info mínima
    await publishCarPage.goto();
    await publishCarPage.fillMinimalInfo('Porsche', '911 Carrera', 2023, 25000);

    // Abrir modal de fotos
    await publishCarPage.openStockPhotosModal();

    // Seleccionar 10 fotos (máximo permitido)
    await stockPhotoSelector.selectStockPhotos(10);

    // Verificar contador
    const photosCount = await publishCarPage.getPhotosCount();
    expect(photosCount).toBe(10);
  });
});

// Configuración específica para este test
test.use({
  // Aumentar timeout para publicación
  actionTimeout: 15000,
  navigationTimeout: 30000,

  // Capturar video solo en fallos
  video: 'retain-on-failure',

  // Screenshots en cada paso
  screenshot: 'only-on-failure'
});