/**
 * E2E Test: Separated Balances for Booking Payments
 * 
 * Valida que el sistema separe correctamente:
 * - Efectivo (available_balance) para pago de alquiler
 * - Crédito Protección (autorentar_credit_balance) para garantía
 * 
 * Creado: 2025-11-15
 * Issue: Usuario con $300 crédito + $0 efectivo NO debería poder alquilar
 */

import { test, expect } from '@playwright/test';

test.describe('Separated Balances - Booking Payment System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login como usuario de prueba
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test-separated-balance@autorenta.com');
    await page.fill('input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Escenario 1: Usuario con $300 protección + $0 efectivo NO puede alquilar auto de $200', async ({ page }) => {
    console.log('\n🧪 Test: Usuario con protección pero sin efectivo...\n');

    // ARRANGE: Configurar wallet con $300 protección + $0 efectivo
    // (Esto debería hacerse a través de API helper, simulando depósito de tipo "protection_only")
    
    // ACT: Navegar a booking de auto que cuesta $200
    await page.goto('/cars');
    
    // Buscar un auto con precio ~$200
    const car = page.locator('[data-testid="car-card"]').first();
    await car.click();
    
    // Click en "Reservar ahora"
    await page.click('button:has-text("Reservar")');
    
    // Seleccionar fechas
    await page.fill('input[name="start_date"]', '2025-12-01');
    await page.fill('input[name="end_date"]', '2025-12-03');
    await page.click('button:has-text("Continuar")');
    
    // ASSERT: En método de pago, wallet debe estar DESHABILITADO
    const walletOption = page.locator('button:has-text("Wallet AutoRenta")');
    await expect(walletOption).toBeDisabled();
    
    // Verificar mensaje de error específico
    const errorMessage = page.locator('text=/Efectivo insuficiente.*necesitas.*\$200/i');
    await expect(errorMessage).toBeVisible();
    
    // Verificar que muestre balance de protección OK pero efectivo insuficiente
    await expect(page.locator('text=/🛡️ Crédito Protección.*\$300/i')).toBeVisible();
    await expect(page.locator('text=/💵 Efectivo disponible.*\$0/i')).toBeVisible();
    
    console.log('✅ Validación correcta: Usuario NO puede pagar con wallet (falta efectivo)');
  });

  test('Escenario 2: Usuario con $300 protección + $200 efectivo SÍ puede alquilar auto de $200', async ({ page }) => {
    console.log('\n🧪 Test: Usuario con protección Y efectivo suficiente...\n');

    // ARRANGE: Configurar wallet con $300 protección + $200 efectivo
    // (API helper: depositar $200 como "withdrawable cash")
    
    // ACT: Navegar a booking de auto que cuesta $200
    await page.goto('/cars');
    
    const car = page.locator('[data-testid="car-card"]').first();
    await car.click();
    
    await page.click('button:has-text("Reservar")');
    
    await page.fill('input[name="start_date"]', '2025-12-01');
    await page.fill('input[name="end_date"]', '2025-12-03');
    await page.click('button:has-text("Continuar")');
    
    // ASSERT: Wallet debe estar HABILITADO
    const walletOption = page.locator('button:has-text("Wallet AutoRenta")');
    await expect(walletOption).toBeEnabled();
    
    // Verificar que NO haya mensaje de error
    const errorMessage = page.locator('text=/Fondos insuficientes/i');
    await expect(errorMessage).not.toBeVisible();
    
    // Verificar desglose correcto
    await expect(page.locator('text=/💵 Alquiler \(de efectivo\).*\$200/i')).toBeVisible();
    await expect(page.locator('text=/🛡️ Garantía \(de protección\).*\$300/i')).toBeVisible();
    
    // Seleccionar wallet y confirmar
    await walletOption.click();
    await page.click('button:has-text("Confirmar Pago")');
    
    // ASSERT: Booking se crea exitosamente
    await expect(page.locator('text=/Reserva confirmada|Booking confirmed/i')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Validación correcta: Usuario SÍ puede pagar con wallet (fondos separados correctos)');
  });

  test('Escenario 3: Usuario con $300 protección + $150 efectivo NO puede alquilar auto de $200 (efectivo insuficiente)', async ({ page }) => {
    console.log('\n🧪 Test: Usuario con protección OK pero efectivo insuficiente...\n');

    // ARRANGE: Configurar wallet con $300 protección + $150 efectivo
    
    // ACT: Navegar a booking de auto que cuesta $200
    await page.goto('/cars');
    
    const car = page.locator('[data-testid="car-card"]').first();
    await car.click();
    
    await page.click('button:has-text("Reservar")');
    
    await page.fill('input[name="start_date"]', '2025-12-01');
    await page.fill('input[name="end_date"]', '2025-12-03');
    await page.click('button:has-text("Continuar")');
    
    // ASSERT: Wallet debe estar DESHABILITADO
    const walletOption = page.locator('button:has-text("Wallet AutoRenta")');
    await expect(walletOption).toBeDisabled();
    
    // Verificar mensaje de error específico mencionando SOLO efectivo
    const errorMessage = page.locator('text=/Efectivo insuficiente.*Tienes.*\$150.*necesitas.*\$200/i');
    await expect(errorMessage).toBeVisible();
    
    // Verificar que protección esté OK
    await expect(page.locator('text=/🛡️ Crédito Protección.*\$300/i')).toContainText('✓');
    
    // Verificar que muestre cuánto falta depositar
    await expect(page.locator('text=/Deposita \$50 adicionales/i')).toBeVisible();
    
    console.log('✅ Validación correcta: Usuario NO puede pagar (falta $50 de efectivo)');
  });

  test('Escenario 4: Usuario con $250 protección + $200 efectivo NO puede alquilar (protección insuficiente)', async ({ page }) => {
    console.log('\n🧪 Test: Usuario con efectivo OK pero protección insuficiente...\n');

    // ARRANGE: Configurar wallet con $250 protección + $200 efectivo
    
    // ACT: Navegar a booking de auto que cuesta $200 (necesita $300 protección)
    await page.goto('/cars');
    
    const car = page.locator('[data-testid="car-card"]').first();
    await car.click();
    
    await page.click('button:has-text("Reservar")');
    
    await page.fill('input[name="start_date"]', '2025-12-01');
    await page.fill('input[name="end_date"]', '2025-12-03');
    await page.click('button:has-text("Continuar")');
    
    // ASSERT: Wallet debe estar DESHABILITADO
    const walletOption = page.locator('button:has-text("Wallet AutoRenta")');
    await expect(walletOption).toBeDisabled();
    
    // Verificar mensaje de error específico mencionando SOLO protección
    const errorMessage = page.locator('text=/Crédito de Protección insuficiente.*Tienes.*\$250.*\$300 requeridos/i');
    await expect(errorMessage).toBeVisible();
    
    // Verificar que efectivo esté OK
    await expect(page.locator('text=/💵 Efectivo disponible.*\$200/i')).toContainText('✓');
    
    // Verificar que muestre cuánto falta depositar de protección
    await expect(page.locator('text=/Deposita \$50.*protección/i')).toBeVisible();
    
    console.log('✅ Validación correcta: Usuario NO puede pagar (falta $50 de protección)');
  });

  test('Escenario 5: Usuario sin fondos ve mensaje claro con ambos montos faltantes', async ({ page }) => {
    console.log('\n🧪 Test: Usuario sin fondos ve desglose completo...\n');

    // ARRANGE: Configurar wallet con $0 protección + $0 efectivo
    
    // ACT: Navegar a booking de auto que cuesta $200 (necesita $300 protección)
    await page.goto('/cars');
    
    const car = page.locator('[data-testid="car-card"]').first();
    await car.click();
    
    await page.click('button:has-text("Reservar")');
    
    await page.fill('input[name="start_date"]', '2025-12-01');
    await page.fill('input[name="end_date"]', '2025-12-03');
    await page.click('button:has-text("Continuar")');
    
    // ASSERT: Wallet debe estar DESHABILITADO
    const walletOption = page.locator('button:has-text("Wallet AutoRenta")');
    await expect(walletOption).toBeDisabled();
    
    // Verificar mensaje de error CON AMBOS montos
    await expect(page.locator('text=/💵 Efectivo necesario.*\$200/i')).toBeVisible();
    await expect(page.locator('text=/🛡️ Protección necesaria.*\$300/i')).toBeVisible();
    
    // Verificar mensaje completo
    const fullMessage = page.locator('text=/Necesitas depositar.*\$200.*efectivo.*\$300.*protección/i');
    await expect(fullMessage).toBeVisible();
    
    // Verificar que haya link a depositar
    await expect(page.locator('a[href="/wallet"]:has-text("Depositar fondos ahora")')).toBeVisible();
    
    console.log('✅ Validación correcta: Usuario ve desglose completo de fondos faltantes');
  });

  test('Escenario 6: Después de bloquear fondos, balances se actualizan correctamente', async ({ page }) => {
    console.log('\n🧪 Test: Verificar actualización de balances post-bloqueo...\n');

    // ARRANGE: Configurar wallet con $300 protección + $200 efectivo
    
    // ACT: Crear booking exitoso
    await page.goto('/cars');
    const car = page.locator('[data-testid="car-card"]').first();
    await car.click();
    await page.click('button:has-text("Reservar")');
    await page.fill('input[name="start_date"]', '2025-12-01');
    await page.fill('input[name="end_date"]', '2025-12-03');
    await page.click('button:has-text("Continuar")');
    
    const walletOption = page.locator('button:has-text("Wallet AutoRenta")');
    await walletOption.click();
    await page.click('button:has-text("Confirmar Pago")');
    
    await expect(page.locator('text=/Reserva confirmada/i')).toBeVisible({ timeout: 10000 });
    
    // ASSERT: Navegar a wallet y verificar balances actualizados
    await page.goto('/wallet');
    
    // Verificar que efectivo se redujo $200 → locked
    await expect(page.locator('text=/💵 Efectivo disponible.*\$0/i')).toBeVisible();
    
    // Verificar que protección se redujo $300 → locked
    await expect(page.locator('text=/🛡️ Crédito Protección.*\$0/i')).toBeVisible();
    
    // Verificar que locked_balance aumentó $500
    await expect(page.locator('text=/Bloqueados en reservas.*\$500/i')).toBeVisible();
    
    // Verificar en historial que se crearon 2 transacciones
    await expect(page.locator('text=/rental_payment_lock.*\$200/i')).toBeVisible();
    await expect(page.locator('text=/security_deposit_lock.*\$300/i')).toBeVisible();
    
    console.log('✅ Validación correcta: Balances actualizados separadamente en wallet');
  });

});

/**
 * HELPERS para setup de wallets con balances separados
 * (Estos deberían implementarse en un archivo de utilidades)
 */

// async function setupWalletWithSeparatedBalances(
//   page: Page,
//   protectionUsd: number,
//   cashUsd: number
// ): Promise<void> {
//   // Call RPC or API to set up user wallet with specific balances
//   await page.request.post('/api/test/setup-wallet', {
//     data: {
//       autorentar_credit_balance_cents: protectionUsd * 100,
//       available_balance_cents: cashUsd * 100,
//     },
//   });
// }

