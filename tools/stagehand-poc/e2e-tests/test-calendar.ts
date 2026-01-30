/**
 * Test E2E - Calendario de Disponibilidad (Owner)
 *
 * Flujo: Mi auto → Calendario → Bloquear fechas → Configurar precios
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('📆 TEST E2E - Calendario de Disponibilidad');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-calendar');
  const screenshot = createScreenshotter('calendar');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login como owner
    await login(page, CONFIG.credentials.owner.email, CONFIG.credentials.owner.password, take);

    // Ir a mis autos
    console.log('\n🔄 Accediendo a mis autos...');
    await page.goto(`${CONFIG.baseUrl}/cars/my-cars`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('my-cars');

    // Seleccionar un auto
    const carCard = page.locator('[class*="car"], [class*="card"]').first();
    if (await carCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, carCard);
      await humanWait(2000);
      await take('car-selected');
    }

    // Buscar opción de calendario
    console.log('\n🔄 Accediendo al calendario...');
    const calendarBtn = page.locator('button:has-text("Calendario"), button:has-text("Disponibilidad"), a:has-text("Calendario")').first();
    if (await calendarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, calendarBtn);
      await humanWait(2000);
      await take('calendar-view');
    }

    // Ir directamente a página de calendario
    await page.goto(`${CONFIG.baseUrl}/cars/my-cars`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);

    // Ver calendario
    const calendar = page.locator('[class*="calendar"], [class*="flatpickr"], .fc-view').first();
    if (await calendar.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Calendario visible');
      await take('calendar-visible');
    }

    // ========== BLOQUEAR FECHAS ==========
    console.log('\n🔄 Bloqueando fechas...');

    // Buscar opción de bloquear
    const blockBtn = page.locator('button:has-text("Bloquear"), button:has-text("No disponible")').first();
    if (await blockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, blockBtn);
      await humanWait(1000);
      await take('block-mode');
    }

    // Seleccionar fechas en el calendario
    const calendarDays = page.locator('.fc-day, .flatpickr-day, [class*="day"]');
    const dayCount = await calendarDays.count();
    console.log(`   → ${dayCount} días en el calendario`);

    if (dayCount > 10) {
      // Click en algunos días para bloquear
      const day1 = calendarDays.nth(10);
      if (await day1.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanClick(page, day1);
        await take('day1-selected');
      }

      const day2 = calendarDays.nth(11);
      if (await day2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanClick(page, day2);
        await take('day2-selected');
      }
    }

    await take('dates-blocked');

    // ========== PRECIOS ESPECIALES ==========
    console.log('\n🔄 Configurando precios especiales...');

    const pricingBtn = page.locator('button:has-text("Precio"), button:has-text("Tarifa"), a:has-text("Precio")').first();
    if (await pricingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, pricingBtn);
      await humanWait(1000);
      await take('pricing-mode');
    }

    // Buscar input de precio especial
    const specialPriceInput = page.locator('input[name="specialPrice"], input[type="number"]').first();
    if (await specialPriceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await specialPriceInput.fill('120');
      await take('special-price-entered');
    }

    // ========== VISTA MENSUAL ==========
    console.log('\n🔄 Cambiando vista...');
    const monthViewBtn = page.locator('button:has-text("Mes"), button:has-text("Month")').first();
    if (await monthViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, monthViewBtn);
      await humanWait(1000);
      await take('month-view');
    }

    // Navegar al mes siguiente
    const nextMonthBtn = page.locator('button[aria-label*="next"], .fc-next-button, button:has-text(">")').first();
    if (await nextMonthBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, nextMonthBtn);
      await humanWait(1000);
      await take('next-month');
    }

    // ========== GUARDAR CAMBIOS ==========
    console.log('\n🔄 Guardando cambios...');
    const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Aplicar")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Calendario listo para guardar');
      await take('ready-to-save');
      console.log('   ⚠️ NO se guardan los cambios reales (test seguro)');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/calendar';
    await generateOutputs(screenshotDir, 'test-calendar');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE CALENDARIO COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
