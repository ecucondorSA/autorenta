/**
 * Test E2E - Panic Mode / Emergencia
 *
 * Flujo: Alquiler activo → Botón de emergencia → Opciones → Contacto
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('🚨 TEST E2E - Panic Mode / Emergencia');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-panic');
  const screenshot = createScreenshotter('panic-mode');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir a reservas activas
    console.log('\n🔄 Buscando alquiler activo...');
    await page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('bookings-hub');

    // Buscar booking activo
    const activeBooking = page.locator('text=/activ|en progreso/i, [class*="active"]').first();
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

    // ========== BUSCAR BOTÓN DE EMERGENCIA ==========
    console.log('\n🔄 Buscando botón de emergencia...');
    const panicBtn = page.locator('button:has-text("Emergencia"), button:has-text("SOS"), button:has-text("Ayuda urgente"), [class*="panic"], [class*="emergency"]').first();
    if (await panicBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Botón de emergencia encontrado');
      await take('panic-button-found');
      await humanClick(page, panicBtn);
      await humanWait(2000);
      await take('panic-activated');
    }

    // Ir directamente a página de emergencia
    await page.goto(`${CONFIG.baseUrl}/emergency`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('emergency-page');

    // ========== OPCIONES DE EMERGENCIA ==========
    console.log('\n🔄 Explorando opciones de emergencia...');

    // Opción de llamar
    const callBtn = page.locator('button:has-text("Llamar"), a[href^="tel:"], [class*="call"]').first();
    if (await callBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Opción de llamar disponible');
      await take('call-option');
    }

    // Opción de WhatsApp
    const whatsappBtn = page.locator('button:has-text("WhatsApp"), a[href*="whatsapp"], [class*="whatsapp"]').first();
    if (await whatsappBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   → Opción de WhatsApp disponible');
      await take('whatsapp-option');
    }

    // Scroll para ver más opciones
    await humanScroll(page, 200);
    await take('emergency-options');

    // ========== REPORTAR ACCIDENTE ==========
    console.log('\n🔄 Opción de reportar accidente...');
    const accidentBtn = page.locator('button:has-text("Accidente"), button:has-text("Siniestro")').first();
    if (await accidentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, accidentBtn);
      await humanWait(2000);
      await take('accident-report');
    }

    // ========== REPORTAR ROBO ==========
    console.log('\n🔄 Opción de reportar robo...');
    const theftBtn = page.locator('button:has-text("Robo"), button:has-text("Hurto")').first();
    if (await theftBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await take('theft-option');
    }

    // ========== ASISTENCIA EN RUTA ==========
    console.log('\n🔄 Opción de asistencia en ruta...');
    const roadsideBtn = page.locator('button:has-text("Asistencia"), button:has-text("Grúa"), button:has-text("Auxilio")').first();
    if (await roadsideBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, roadsideBtn);
      await humanWait(1000);
      await take('roadside-assistance');
    }

    // ========== UBICACIÓN ACTUAL ==========
    console.log('\n🔄 Compartir ubicación...');
    const locationBtn = page.locator('button:has-text("Ubicación"), button:has-text("Compartir mi ubicación")').first();
    if (await locationBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await take('share-location');
    }

    // ========== CONTACTOS DE EMERGENCIA ==========
    console.log('\n🔄 Contactos de emergencia...');
    await humanScroll(page, 200);
    await take('emergency-contacts');

    // Números de emergencia locales
    const emergencyNumbers = page.locator('text=/911|190|ambulancia|policía/i');
    if (await emergencyNumbers.count() > 0) {
      console.log('   → Números de emergencia visibles');
      await take('emergency-numbers');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/panic-mode';
    await generateOutputs(screenshotDir, 'test-panic-mode');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE PANIC MODE COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
