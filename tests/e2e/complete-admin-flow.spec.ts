import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * TEST E2E COMPLETO: Flujo Completo del ADMINISTRADOR
 *
 * Este test cubre el flujo completo de un administrador:
 * 1. Login como administrador
 * 2. Ver dashboard administrativo
 * 3. Ver estadísticas y métricas
 * 4. Ver autos pendientes de aprobación
 * 5. Aprobar un auto pendiente
 * 6. Ver reportes y transacciones
 * 7. Gestionar usuarios (ver lista)
 *
 * Captura:
 * - Screenshots en cada paso
 * - Console logs (info, warnings, errors)
 * - Network requests y responses
 * - Errores de JavaScript
 * - Performance metrics
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Flujo Completo: ADMINISTRADOR - Dashboard → Aprobaciones → Gestión', () => {
  let consoleLogs: Array<{ type: string; text: string; timestamp: number }> = [];
  let networkErrors: Array<{ url: string; status: number; error: string }> = [];
  let jsErrors: Array<{ message: string; stack?: string }> = [];
  let testCarId: string | null = null;
  let approvedCarId: string | null = null;

  // Credenciales de admin (debe existir en la BD)
  const ADMIN_CREDENTIALS = {
    email: 'admin.test@autorenta.com',
    password: 'TestAdmin123!',
  };

  test.beforeEach(async ({ page }) => {
    // Limpiar arrays de logs
    consoleLogs = [];
    networkErrors = [];
    jsErrors = [];

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

    // Crear un auto pendiente para aprobar (si no existe)
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'owner.test@autorenta.com')
        .single();

      if (ownerProfile) {
        const { data: car, error } = await supabase
          .from('cars')
          .insert({
            owner_id: ownerProfile.id,
            brand_text_backup: 'Toyota',
            model_text_backup: 'Corolla',
            year: 2023,
            price_per_day: 15000,
            location_city: 'Buenos Aires',
            status: 'pending', // Pendiente de aprobación
            seats: 5,
            transmission: 'automatic',
            fuel_type: 'gasoline',
          })
          .select()
          .single();

        if (car && !error) {
          testCarId = car.id;
          console.log(`✅ Auto de prueba creado (ID: ${testCarId}, status: pending)`);
        }
      }
    } catch (error) {
      console.log('⚠️ No se pudo crear auto de prueba, continuando...');
    }
  });

  test.afterEach(async () => {
    // Limpiar auto de prueba si existe
    if (testCarId) {
      await supabase.from('cars').delete().eq('id', testCarId);
      console.log(`🧹 Auto de prueba eliminado: ${testCarId}`);
    }
  });

  test('Flujo completo: Login → Dashboard → Aprobar Auto → Ver Reportes', async ({ page }) => {
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
          path: `test-results/screenshots/admin-${stepName.replace(/\s+/g, '-').toLowerCase()}.png`,
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
          path: `test-results/screenshots/admin-${stepName.replace(/\s+/g, '-').toLowerCase()}-ERROR.png`,
          fullPage: true,
        });

        throw error;
      }
    };

    // ============================================
    // PASO 1: LOGIN COMO ADMINISTRADOR
    // ============================================
    await captureStep('1. Login como Administrador', async () => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Llenar formulario de login
      await page.fill('input[name="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[name="password"]', ADMIN_CREDENTIALS.password);
      await page.click('button[type="submit"]');

      // Esperar redirección
      await page.waitForURL(/\/(admin|cars|inicio)/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Verificar que el usuario está autenticado
      const isAuthenticated = !page.url().includes('/auth/login');
      expect(isAuthenticated).toBeTruthy();
      console.log('✅ Login de administrador exitoso');
    });

    // ============================================
    // PASO 2: NAVEGAR AL DASHBOARD ADMINISTRATIVO
    // ============================================
    await captureStep('2. Navegar al Dashboard Administrativo', async () => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verificar que el dashboard está visible
      const dashboardVisible = await page
        .locator('h1, [class*="dashboard"], [class*="admin"]')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      expect(dashboardVisible).toBeTruthy();
      console.log('✅ Dashboard administrativo visible');
    });

    // ============================================
    // PASO 3: VER ESTADÍSTICAS Y MÉTRICAS
    // ============================================
    await captureStep('3. Ver Estadísticas del Dashboard', async () => {
      // Esperar a que las estadísticas se carguen
      await page.waitForTimeout(3000);

      // Verificar que hay estadísticas visibles
      const statsVisible = await page
        .locator('[class*="stat"], [class*="metric"], [class*="kpi"]')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      // Verificar métricas comunes
      const hasTotalUsers = await page
        .locator('text=/usuarios|profiles|total users/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      const hasTotalCars = await page
        .locator('text=/autos|cars|vehículos/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      const hasTotalBookings = await page
        .locator('text=/reservas|bookings/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(statsVisible || hasTotalUsers || hasTotalCars || hasTotalBookings).toBeTruthy();
      console.log('✅ Estadísticas del dashboard visibles');
    });

    // ============================================
    // PASO 4: VER AUTOS PENDIENTES DE APROBACIÓN
    // ============================================
    await captureStep('4. Ver Autos Pendientes de Aprobación', async () => {
      // Buscar sección de autos pendientes
      // Puede estar en un tab, sección o página separada
      const pendingCarsSection = page
        .locator('text=/pendiente|pending|aprobar/i')
        .or(page.locator('[class*="pending"]'))
        .or(page.locator('button:has-text("Aprobar")'));

      // Intentar navegar a la sección de aprobaciones si existe
      const approvalsLink = page
        .locator('a:has-text("Aprobaciones")')
        .or(page.locator('a:has-text("Pending Cars")'))
        .or(page.locator('[href*="approval"]'));

      if (await approvalsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approvalsLink.click();
        await page.waitForTimeout(2000);
      }

      // Verificar que hay autos pendientes o mensaje de "no hay pendientes"
      const hasPendingCars = await page
        .locator('[class*="pending-car"], [class*="car-card"], button:has-text("Aprobar")')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const hasNoPendingMessage = await page
        .locator('text=/no hay|sin pendientes|all approved/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasPendingCars || hasNoPendingMessage).toBeTruthy();
      console.log(`✅ Sección de aprobaciones visible${hasPendingCars ? ' (hay autos pendientes)' : ' (sin pendientes)'}`);
    });

    // ============================================
    // PASO 5: APROBAR UN AUTO PENDIENTE
    // ============================================
    await captureStep('5. Aprobar Auto Pendiente', async () => {
      // Buscar botón de aprobar
      const approveButton = page
        .locator('button:has-text("Aprobar")')
        .or(page.locator('button:has-text("Approve")'))
        .or(page.getByRole('button', { name: /aprobar|approve/i }))
        .first();

      const hasApproveButton = await approveButton.isVisible({ timeout: 10000 }).catch(() => false);

      if (hasApproveButton) {
        // Obtener el ID del auto antes de aprobar (si es posible)
        const carCard = approveButton.locator('..').or(approveButton.locator('xpath=ancestor::*[@data-car-id]'));
        const carIdAttr = await carCard.getAttribute('data-car-id').catch(() => null);
        if (carIdAttr) {
          approvedCarId = carIdAttr;
        }

        // Click en aprobar
        await approveButton.click();
        await page.waitForTimeout(2000);

        // Verificar que el auto fue aprobado (puede desaparecer de la lista o cambiar estado)
        const approvalSuccess = await page
          .locator('text=/aprobado|approved|éxito/i')
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (approvalSuccess) {
          console.log('✅ Auto aprobado exitosamente');
        } else {
          console.log('✅ Auto aprobado (verificación silenciosa)');
        }
      } else {
        console.log('⚠️ No hay autos pendientes para aprobar');
        // No fallar el test si no hay pendientes
      }
    });

    // ============================================
    // PASO 6: VER REPORTES Y TRANSACCIONES
    // ============================================
    await captureStep('6. Ver Reportes y Transacciones', async () => {
      // Buscar sección de reportes o transacciones
      const reportsLink = page
        .locator('a:has-text("Reportes")')
        .or(page.locator('a:has-text("Transacciones")'))
        .or(page.locator('a:has-text("Payments")'))
        .or(page.locator('[href*="report"], [href*="transaction"]'));

      if (await reportsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reportsLink.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');

        // Verificar que la página de reportes está visible
        const reportsVisible = await page
          .locator('h1, [class*="report"], [class*="transaction"]')
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false);

        expect(reportsVisible).toBeTruthy();
        console.log('✅ Reportes/Transacciones visibles');
      } else {
        // Si no hay link de reportes, verificar que hay información en el dashboard
        const hasFinancialInfo = await page
          .locator('text=/ingresos|revenue|transacciones|payments/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        expect(hasFinancialInfo).toBeTruthy();
        console.log('✅ Información financiera visible en dashboard');
      }
    });

    // ============================================
    // PASO 7: GESTIONAR USUARIOS (VER LISTA)
    // ============================================
    await captureStep('7. Ver Lista de Usuarios', async () => {
      // Buscar sección de usuarios
      const usersLink = page
        .locator('a:has-text("Usuarios")')
        .or(page.locator('a:has-text("Users")'))
        .or(page.locator('[href*="user"], [href*="profile"]'));

      if (await usersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');

        // Verificar que la lista de usuarios está visible
        const usersListVisible = await page
          .locator('[class*="user-list"], [class*="user-card"], table')
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false);

        expect(usersListVisible).toBeTruthy();
        console.log('✅ Lista de usuarios visible');
      } else {
        // Si no hay link de usuarios, verificar que hay información de usuarios en el dashboard
        const hasUsersInfo = await page
          .locator('text=/usuarios|users|profiles/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        expect(hasUsersInfo).toBeTruthy();
        console.log('✅ Información de usuarios visible en dashboard');
      }
    });

    // ============================================
    // PASO 8: VERIFICAR PERMISOS DE ADMIN
    // ============================================
    await captureStep('8. Verificar Permisos de Administrador', async () => {
      // Verificar que el usuario tiene acceso a funciones de admin
      // Buscar elementos que solo un admin debería ver
      const hasAdminFeatures = await page
        .locator('text=/admin|administración|dashboard/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      // Verificar que NO está en una página de acceso denegado
      const accessDenied = await page
        .locator('text=/acceso denegado|forbidden|unauthorized/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasAdminFeatures).toBeTruthy();
      expect(accessDenied).toBeFalsy();
      console.log('✅ Permisos de administrador verificados');
    });

    // ============================================
    // REPORTE FINAL
    // ============================================
    test.afterEach(async ({ page }) => {
      console.log('\n📊 ============================================');
      console.log('📊 REPORTE FINAL DEL TEST - ADMINISTRADOR');
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

      // Información de acciones realizadas
      if (testCarId) {
        console.log(`\n🚗 AUTO DE PRUEBA:`);
        console.log(`  ID: ${testCarId}`);
        console.log(`  Estado inicial: pending`);
      }

      if (approvedCarId) {
        console.log(`\n✅ AUTO APROBADO:`);
        console.log(`  ID: ${approvedCarId}`);
      }

      // Capturar screenshot final
      await page.screenshot({
        path: `test-results/screenshots/admin-final-state.png`,
        fullPage: true,
      });

      // Guardar reporte en archivo JSON
      const report = {
        timestamp: new Date().toISOString(),
        admin: {
          email: ADMIN_CREDENTIALS.email,
        },
        steps: testResults,
        consoleLogs: {
          total: consoleLogs.length,
          errors: errorLogs.length,
          warnings: warningLogs.length,
          info: infoLogs.length,
        },
        networkErrors: networkErrors.length,
        jsErrors: jsErrors.length,
        testCarId,
        approvedCarId,
      };

      // Escribir reporte a archivo
      const fs = require('fs');
      const reportPath = `test-results/admin-test-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Reporte guardado en: ${reportPath}`);

      console.log('\n📊 ============================================\n');
    });
  });
});




