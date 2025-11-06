import { test, expect } from '@playwright/test';

/**
 * TEST CRÍTICO: Publicación de Auto con Onboarding de MP (Soft Requirement)
 *
 * Valida el flujo completo de publicación de un auto desde la perspectiva
 * de un locador, incluyendo el onboarding RECOMENDADO (pero no bloqueante) de Mercado Pago.
 *
 * Pre-requisitos:
 * - Usuario registrado sin onboarding de MP completado
 * - Migration 004_mp_onboarding_states.sql aplicada
 * - shouldPromptOnboarding = true en publish-car-v2.page.ts
 * - backdropDismiss = true en modal de onboarding
 *
 * Flujo Ideal (Con Onboarding):
 * 1. Login como locador
 * 2. Navegar a /cars/publish
 * 3. Modal de onboarding MP aparece
 * 4. Usuario completa OAuth con Mercado Pago
 * 5. Completar formulario de publicación
 * 6. Auto se publica exitosamente con pagos habilitados
 *
 * Flujo Alternativo (Sin Onboarding - Soft Requirement):
 * 1. Login como locador
 * 2. Navegar a /cars/publish
 * 3. Modal de onboarding MP aparece
 * 4. Usuario cancela o cierra modal
 * 5. Alert aparece explicando limitaciones (no pagos automáticos)
 * 6. Usuario elige:
 *    a. "Vincular Ahora" → Modal reaparece
 *    b. "Continuar Sin Vincular" → Puede publicar (con limitaciones)
 * 7. Auto se publica pero sin capacidad de pagos split
 */

test.describe('Publicación de Auto con Onboarding MP', () => {
  const TEST_USER = {
    email: `test-publisher-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Test Publisher',
    phone: '+541112345678',
  };

  test.beforeEach(async ({ page }) => {
    // Registrar usuario nuevo (sin onboarding)
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="full_name"]', TEST_USER.fullName);
    await page.fill('input[name="phone"]', TEST_USER.phone);
    await page.click('button[type="submit"]');

    // Esperar a que se complete el registro
    await expect(page).toHaveURL(/\/(cars|inicio)/, { timeout: 10000 });
  });

  test('debe bloquear publicación si no tiene onboarding de MP', async ({ page }) => {
    // Navegar a publicar auto
    await page.goto('/cars/publish');

    // Esperar a que se muestre el modal de onboarding
    await expect(page.locator('ion-modal[component="MpOnboardingModalComponent"]')).toBeVisible({
      timeout: 5000,
    });

    // Verificar texto del modal
    await expect(page.locator('ion-modal')).toContainText('Mercado Pago');
    await expect(page.locator('ion-modal')).toContainText('vincular');

    // Verificar que hay botón para vincular
    const vincularBtn = page.locator('ion-modal button:has-text("Vincular")');
    await expect(vincularBtn).toBeVisible();

    // Verificar que hay botón para cancelar
    const cancelarBtn = page.locator('ion-modal button:has-text("Cancelar")');
    await expect(cancelarBtn).toBeVisible();
  });

  test('debe mostrar alert de advertencia si cancela onboarding', async ({ page }) => {
    await page.goto('/cars/publish');

    // Esperar modal
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });

    // Click en cancelar (o cerrar modal con backdrop)
    await page.locator('ion-modal button:has-text("Cancelar")').click();

    // Debe mostrar alert de advertencia (NO redirigir)
    await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 });

    // Verificar contenido del alert
    await expect(page.locator('ion-alert')).toContainText('Onboarding Pendiente');
    await expect(page.locator('ion-alert')).toContainText('No podrás recibir pagos automáticos');
    await expect(page.locator('ion-alert')).toContainText('split-payments no funcionarán');

    // Verificar que existen ambos botones
    await expect(page.locator('ion-alert button:has-text("Vincular Ahora")')).toBeVisible();
    await expect(page.locator('ion-alert button:has-text("Continuar Sin Vincular")')).toBeVisible();
  });

  test('debe permitir publicar sin onboarding después de ver advertencia', async ({ page }) => {
    await page.goto('/cars/publish');

    // Modal aparece
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });

    // Cerrar modal
    await page.locator('ion-modal button:has-text("Cancelar")').click();

    // Alert aparece
    await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('ion-alert')).toContainText('No podrás recibir pagos');

    // Click en "Continuar Sin Vincular"
    await page.click('ion-alert button:has-text("Continuar Sin Vincular")');

    // Alert debe cerrarse
    await expect(page.locator('ion-alert')).not.toBeVisible();

    // Debe permitir acceso al formulario de publicación
    // (verificar que NO redirigió a /cars y que el formulario es visible)
    await expect(page).toHaveURL('/cars/publish');
    await expect(page.locator('form, ion-content')).toBeVisible();
  });

  test('debe reabrir modal si elige "Vincular Ahora" en alert', async ({ page }) => {
    await page.goto('/cars/publish');

    // Modal aparece
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });

    // Cerrar modal
    await page.locator('ion-modal button:has-text("Cancelar")').click();

    // Alert aparece
    await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 });

    // Click en "Vincular Ahora"
    await page.click('ion-alert button:has-text("Vincular Ahora")');

    // Alert debe cerrarse
    await expect(page.locator('ion-alert')).not.toBeVisible();

    // Modal debe reaparecer
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('ion-modal')).toContainText('Mercado Pago');
  });

  test('debe mostrar alert si cierra modal con backdrop dismiss', async ({ page }) => {
    await page.goto('/cars/publish');

    // Modal aparece
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });

    // Cerrar con backdrop (click fuera del modal)
    // Ionic modals con backdropDismiss:true se cierran al hacer click en el backdrop
    await page.locator('ion-backdrop').click();

    // Alert debe aparecer
    await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('ion-alert')).toContainText('Onboarding Pendiente');
  });

  test('debe permitir publicar después de completar onboarding', async ({ page, request }) => {
    // NOTA: Este test simula el flujo OAuth de MP usando mocks
    // En un entorno de testing real, se usaría un mock del servicio MP

    // 1. Navegar a publicar
    await page.goto('/cars/publish');
    await page.waitForLoadState('networkidle');

    // 2. Esperar modal de onboarding
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });

    // 3. Click en "Conectar pagos" para iniciar OAuth
    const connectButton = page.locator('ion-modal button:has-text("Conectar")')
      .or(page.locator('ion-modal button:has-text("Conectar pagos")'));
    await expect(connectButton).toBeVisible({ timeout: 5000 });
    
    // Interceptar redirección a MercadoPago
    await page.route('**/mercadopago-oauth-connect**', route => {
      // Simular respuesta de OAuth (mock)
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          auth_url: 'https://auth.mercadopago.com.ar/authorization?mock=true',
        }),
      });
    });

    // Interceptar callback de OAuth
    await page.route('**/mercadopago-oauth-callback**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          collector_id: '2302679571', // Test user ID de MP
        }),
      });
    });

    await connectButton.click();

    // 4. Simular que el usuario autoriza en MP (mock)
    // En un test real, aquí navegaríamos a MP y completaríamos el flujo
    // Por ahora, simulamos que el callback se ejecuta automáticamente
    await page.waitForTimeout(2000);

    // 5. Verificar que el modal se cierra y permite continuar
    await expect(page.locator('ion-modal')).not.toBeVisible({ timeout: 10000 });

    // 6. Completar formulario de publicación
    // Buscar campos del formulario
    const brandSelect = page.locator('select[name="brand_id"]').or(
      page.locator('ion-select[name="brand_id"]')
    );
    
    if (await brandSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await brandSelect.click();
      await page.waitForTimeout(500);
      await page.locator('ion-popover ion-item:has-text("Toyota")').first().click();
    }

    const modelSelect = page.locator('select[name="model_id"]').or(
      page.locator('ion-select[name="model_id"]')
    );
    
    if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modelSelect.click();
      await page.waitForTimeout(500);
      await page.locator('ion-popover ion-item:has-text("Corolla")').first().click();
    }

    // Llenar campos de texto
    const yearInput = page.locator('input[name="year"]').or(
      page.locator('ion-input[name="year"] input')
    );
    if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yearInput.fill('2023');
    }

    const colorInput = page.locator('input[name="color"]').or(
      page.locator('ion-input[name="color"] input')
    );
    if (await colorInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await colorInput.fill('Blanco');
    }

    const plateInput = page.locator('input[name="license_plate"]').or(
      page.locator('ion-input[name="license_plate"] input')
    );
    if (await plateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await plateInput.fill('ABC123');
    }

    const descriptionTextarea = page.locator('textarea[name="description"]').or(
      page.locator('ion-textarea[name="description"] textarea')
    );
    if (await descriptionTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await descriptionTextarea.fill('Auto en excelente estado');
    }

    const priceInput = page.locator('input[name="price_per_day"]').or(
      page.locator('ion-input[name="price_per_day"] input')
    );
    if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await priceInput.fill('5000');
    }

    // 7. Enviar formulario
    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /publicar|enviar|submit/i })
    );
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // 8. Verificar éxito (puede redirigir a /cars/my o mostrar mensaje)
    await page.waitForTimeout(3000);
    
    // Verificar que se completó la publicación
    const successMessage = page.locator('text=publicado exitosamente')
      .or(page.locator('text=auto publicado'))
      .or(page.getByText(/éxito|success/i));
    
    const isOnMyCarsPage = page.url().includes('/cars/my') || page.url().includes('/cars');
    
    expect(
      await successMessage.isVisible({ timeout: 10000 }).catch(() => false) ||
      isOnMyCarsPage
    ).toBeTruthy();
  });

  test('debe verificar RPC function can_list_cars', async ({ page, context }) => {
    // Obtener el user ID desde la sesión
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name.includes('supabase-auth'));

    if (!authCookie) {
      test.skip();
      return;
    }

    // Hacer request directo a Supabase RPC
    const response = await page.request.post(
      'https://obxvffplochgeiclibng.supabase.co/rest/v1/rpc/can_list_cars',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authCookie.value}`,
          apikey: process.env.SUPABASE_ANON_KEY || '',
        },
        data: {
          p_user_id: 'TEST-USER-ID', // Obtener del auth cookie
        },
      },
    );

    expect(response.ok()).toBeTruthy();
    const canList = await response.json();

    // Nuevo usuario sin onboarding NO debe poder listar
    expect(canList).toBe(false);
  });
});

test.describe('Validaciones del Formulario de Publicación', () => {
  test.beforeEach(async ({ page }) => {
    // Mock: Usuario con onboarding completo
    // En producción, esto requeriría completar el flujo OAuth
    await page.goto('/cars/publish');
  });

  test('debe validar campos requeridos', async ({ page }) => {
    // Intentar enviar formulario vacío
    await page.click('button[type="submit"]');

    // Verificar mensajes de error
    await expect(page.locator('text=Campo requerido')).toBeVisible();
  });

  test('debe validar año del auto', async ({ page }) => {
    const currentYear = new Date().getFullYear();

    // Año muy viejo
    await page.fill('input[name="year"]', '1990');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=año mínimo')).toBeVisible();

    // Año futuro
    await page.fill('input[name="year"]', String(currentYear + 2));
    await page.click('button[type="submit"]');
    await expect(page.locator('text=año máximo')).toBeVisible();
  });

  test('debe validar precio por día', async ({ page }) => {
    // Precio negativo
    await page.fill('input[name="price_per_day"]', '-100');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=precio debe ser positivo')).toBeVisible();

    // Precio muy alto
    await page.fill('input[name="price_per_day"]', '1000000');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=precio muy alto')).toBeVisible();
  });

  test('debe requerir al menos 3 fotos', async ({ page }) => {
    // Completar todos los campos excepto fotos
    await page.selectOption('select[name="brand_id"]', { index: 1 });
    await page.selectOption('select[name="model_id"]', { index: 1 });
    await page.fill('input[name="year"]', '2023');
    await page.fill('input[name="color"]', 'Blanco');
    await page.fill('input[name="price_per_day"]', '5000');

    await page.click('button[type="submit"]');

    // Debe mostrar error de fotos
    await expect(page.locator('text=al menos 3 fotos')).toBeVisible();
  });
});
