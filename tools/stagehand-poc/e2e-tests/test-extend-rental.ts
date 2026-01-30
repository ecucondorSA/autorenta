/**
 * Test E2E - Extender Alquiler
 *
 * Flujo: Alquiler activo → Solicitar extensión → Confirmar
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('📅 TEST E2E - Extender Alquiler');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-extend');
  const screenshot = createScreenshotter('extend-rental');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir a mis reservas
    console.log('\n🔄 Buscando alquiler activo...');
    await page.goto(`${CONFIG.baseUrl}/bookings/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('my-bookings');

    // Buscar booking activo
    const activeBooking = page.locator('text=/activ|en progreso|in progress/i').first();
    if (await activeBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, activeBooking);
      await humanWait(2000);
      await take('active-booking');
    } else {
      // Seleccionar cualquier booking
      const anyBooking = page.locator('[class*="booking"], [class*="card"]').first();
      if (await anyBooking.isVisible({ timeout: 3000 }).catch(() => false)) {
        await humanClick(page, anyBooking);
        await humanWait(2000);
        await take('booking-selected');
      }
    }

    // Scroll para ver opciones
    await humanScroll(page, 300);
    await take('booking-options');

    // Buscar opción de extender
    console.log('\n🔄 Buscando opción de extender...');
    const extendBtn = page.locator('button:has-text("Extender"), button:has-text("Ampliar"), a:has-text("Extender")').first();
    if (await extendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Opción de extender encontrada');
      await humanClick(page, extendBtn);
      await humanWait(2000);
      await take('extend-dialog');
    }

    // Buscar selector de nuevas fechas
    const dateSelector = page.locator('[class*="date"], [class*="calendar"], input[type="date"]').first();
    if (await dateSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Selector de fechas visible');
      await take('date-selector');
    }

    // Buscar opciones de días adicionales
    const daysOptions = page.locator('button:has-text("+1"), button:has-text("+3"), button:has-text("+7")');
    if (await daysOptions.count() > 0) {
      console.log('   → Opciones de días adicionales encontradas');
      await take('days-options');

      const addDaysBtn = page.locator('button:has-text("+3")').first();
      if (await addDaysBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanClick(page, addDaysBtn);
        await humanWait(1000);
        await take('days-selected');
      }
    }

    // Capturar resumen de extensión
    await humanScroll(page, 200);
    await take('extension-summary');

    // Capturar nuevo precio
    const newPrice = page.locator('text=/R\\$|total|precio/i').first();
    if (await newPrice.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   → Nuevo precio calculado');
      await take('new-price');
    }

    // Capturar botón de confirmar
    const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Extender")').first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Formulario de extensión listo');
      await take('ready-to-extend');
      console.log('   ⚠️ NO se ejecuta la extensión real (test seguro)');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/extend-rental';
    await generateOutputs(screenshotDir, 'test-extend-rental');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE EXTENDER ALQUILER COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
