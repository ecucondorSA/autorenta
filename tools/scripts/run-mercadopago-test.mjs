import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { chromium } from 'playwright';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const supabase = createClient(
  process.env.NG_APP_SUPABASE_URL || 'http://localhost:54321',
  process.env.NG_APP_SUPABASE_ANON_KEY || ''
);

async function runTest() {
  console.log('🚀 Iniciando test automatizado de MercadoPago...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Hacer más lento para ver mejor
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    // STEP 1: Verificar autos disponibles
    console.log('🔍 Step 1: Verificando autos disponibles...');
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('id, owner_id, price_per_day, brand_text_backup, model_text_backup')
      .eq('status', 'active')
      .limit(1);

    if (carsError || !cars || cars.length === 0) {
      throw new Error('❌ No hay autos activos disponibles');
    }

    const testCar = cars[0];
    console.log(`✅ Auto seleccionado: ${testCar.brand_text_backup} ${testCar.model_text_backup} (${testCar.id})\n`);

    // STEP 2: Login
    console.log('🔐 Step 2: Haciendo login...');
    await page.goto('http://localhost:4200/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Buscar campos de login - esperar que la página cargue
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    // Intentar múltiples selectores para el botón
    let loginButton = page.getByRole('button', { name: /ingresar/i });
    if (!(await loginButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      loginButton = page.locator('button[type="submit"]').first();
    }

    // Intentar login (usar credenciales de test existente)
    await emailInput.fill('test-renter@autorenta.com');
    await passwordInput.fill('TestPassword123!');
    await page.waitForTimeout(500);
    await loginButton.click();

    await page.waitForURL(/\/cars|\//, { timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('✅ Login completado\n');

    // STEP 3: Navegar al auto
    console.log(`📅 Step 3: Navegando al auto ${testCar.id}...`);
    await page.goto(`http://localhost:4200/cars/${testCar.id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // STEP 4: Seleccionar fechas
    console.log('📅 Step 4: Seleccionando fechas...');
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 7);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 10);

    // Buscar date picker
    const datePicker = page.locator('app-date-range-picker').first();
    if (await datePicker.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click en el date picker para abrirlo
      await datePicker.click();
      await page.waitForTimeout(1000);

      // Intentar llenar fechas si hay inputs
      const startInput = page.locator('input[type="date"]').first();
      const endInput = page.locator('input[type="date"]').last();

      if (await startInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startInput.fill(startDate.toISOString().split('T')[0]);
        await endInput.fill(endDate.toISOString().split('T')[0]);
        console.log(`✅ Fechas seleccionadas: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}\n`);
      }
    }

    // STEP 5: Click en Reservar
    console.log('🔘 Step 5: Click en "Reservar"...');
    const bookButton = page.getByRole('button', { name: /reservar|alquilar|request/i });
    await bookButton.click();
    await page.waitForTimeout(3000);

    // Esperar redirección a checkout/payment
    await page.waitForURL(/\/bookings\/.*\/payment|\/checkout/, { timeout: 20000 });
    const currentUrl = page.url();
    console.log(`✅ Redirigido a: ${currentUrl}\n`);

    // Extraer booking ID
    const bookingIdMatch = currentUrl.match(/\/bookings\/([a-f0-9-]+)/);
    const bookingId = bookingIdMatch ? bookingIdMatch[1] : null;

    if (bookingId) {
      console.log(`📋 Booking ID: ${bookingId}\n`);
    }

    // STEP 6: Seleccionar método de pago "Tarjeta"
    console.log('💳 Step 6: Seleccionando método de pago "Tarjeta"...');
    const cardOption = page.getByRole('button', { name: /tarjeta|card|crédito/i });
    if (await cardOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardOption.click();
      await page.waitForTimeout(2000);
      console.log('✅ Método de pago "Tarjeta" seleccionado\n');
    }

    // STEP 7: Autorizar hold
    console.log('🔒 Step 7: Autorizando hold de $1 USD...');
    const authorizeBtn = page.getByRole('button', { name: /autorizar.*hold|authorize/i });
    if (await authorizeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await authorizeBtn.click();
      await page.waitForTimeout(3000);
      console.log('✅ Hold autorizado (o proceso iniciado)\n');
    }

    // STEP 8: Aceptar términos
    console.log('✅ Step 8: Aceptando términos y condiciones...');
    const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos/i });
    if (await termsCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await termsCheckbox.check();
      console.log('✅ Términos aceptados\n');
    }

    // STEP 9: Confirmar y pagar
    console.log('💳 Step 9: Click en "Confirmar y Pagar"...');
    const confirmButton = page.getByRole('button', { name: /confirmar.*pagar|pagar|checkout/i });

    if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('⚠️  IMPORTANTE: El test se detendrá aquí para que puedas completar el pago en MercadoPago manualmente');
      console.log('📝 Después de completar el pago, presiona Enter para continuar...\n');

      // Esperar a que el usuario complete el pago
      await confirmButton.click();

      // Esperar redirección a MercadoPago
      await page.waitForURL(/mercadopago|mpago/, { timeout: 15000 }).catch(() => {
        console.log('⚠️  No se detectó redirección a MercadoPago');
      });

      console.log('\n✅ Test completado hasta el punto de MercadoPago');
      console.log('💡 El navegador permanecerá abierto para que completes el pago manualmente');
      console.log('💡 URL actual:', page.url());

      // Mantener el navegador abierto
      await page.waitForTimeout(60000); // Esperar 60 segundos
    }

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    await page.screenshot({ path: '/tmp/test-error.png' });
  } finally {
    // No cerrar el navegador para que el usuario pueda ver el resultado
    console.log('\n✅ Test finalizado. El navegador permanecerá abierto.');
  }
}

runTest().catch(console.error);

