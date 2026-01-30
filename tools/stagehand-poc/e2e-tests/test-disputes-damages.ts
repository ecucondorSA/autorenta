/**
 * Test E2E - Disputas y Daños
 *
 * Flujo: Booking activo → Reportar daño → Subir evidencia → Crear disputa
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, humanFill, generateOutputs, sleep } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('⚠️ TEST E2E - Disputas y Daños');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-disputes');
  const screenshot = createScreenshotter('disputes-damages');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.owner.email, CONFIG.credentials.owner.password, take);

    // Ir a mis reservas
    console.log('\n🔄 Accediendo a reservas...');
    await page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('bookings-list');

    // Buscar una reserva completada o activa
    console.log('\n🔄 Buscando reserva para reportar daño...');
    const bookingCard = page.locator('[class*="booking"], [class*="card"]').first();
    if (await bookingCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, bookingCard);
      await humanWait(2000);
      await take('booking-detail');
    }

    // Scroll para ver opciones
    await humanScroll(page, 300);
    await take('booking-options');

    // Buscar opción de reportar daño
    console.log('\n🔄 Buscando opción de reportar daño...');
    const damageBtn = page.locator('button:has-text("Daño"), button:has-text("Problema"), button:has-text("Reportar"), a:has-text("Daño")').first();
    if (await damageBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, damageBtn);
      await humanWait(2000);
      await take('damage-report-start');
    }

    // Ir a página de disputas directamente
    await page.goto(`${CONFIG.baseUrl}/disputes`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('disputes-page');

    // ========== CREAR NUEVA DISPUTA ==========
    console.log('\n🔄 Creando nueva disputa...');
    const newDisputeBtn = page.locator('button:has-text("Nueva"), button:has-text("Crear"), button:has-text("Reportar")').first();
    if (await newDisputeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, newDisputeBtn);
      await humanWait(2000);
      await take('new-dispute-form');
    }

    // Llenar formulario de disputa
    const descriptionInput = page.locator('textarea, input[name="description"]').first();
    if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Llenando descripción del daño...');
      await humanFill(descriptionInput, 'Rayón en puerta lateral derecha detectado durante la inspección de devolución.');
      await take('description-filled');
    }

    // Buscar upload de evidencia
    console.log('\n🔄 Buscando upload de evidencia...');
    const evidenceInput = page.locator('input[type="file"]').first();
    if (await evidenceInput.count() > 0) {
      console.log('   → Input de evidencia encontrado');
      await take('evidence-upload-found');
      console.log('   ⚠️ Upload de evidencia simulado (test seguro)');
    }

    // Scroll para ver más opciones
    await humanScroll(page, 300);
    await take('dispute-form-scroll');

    // Seleccionar tipo de daño si existe
    const damageType = page.locator('select, [role="listbox"]').first();
    if (await damageType.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, damageType);
      await humanWait(500);
      await take('damage-type-options');
    }

    // Capturar botón de enviar
    const submitBtn = page.locator('button:has-text("Enviar"), button:has-text("Crear disputa"), button:has-text("Reportar")').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Formulario de disputa listo');
      await take('ready-to-submit');
      console.log('   ⚠️ NO se envía la disputa (test seguro)');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/disputes-damages';
    await generateOutputs(screenshotDir, 'test-disputes-damages');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE DISPUTAS Y DAÑOS COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
