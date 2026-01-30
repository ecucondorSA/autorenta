/**
 * Test E2E - Cancelación de Reserva
 *
 * Flujo: Mis reservas → Seleccionar reserva → Cancelar → Confirmar
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('❌ TEST E2E - Cancelación de Reserva');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-cancel');
  const screenshot = createScreenshotter('cancellation');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir a mis reservas
    console.log('\n🔄 Accediendo a mis reservas...');
    await page.goto(`${CONFIG.baseUrl}/bookings/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('my-bookings');

    // Scroll para ver reservas
    await humanScroll(page, 300);
    await take('bookings-scroll');

    // Seleccionar una reserva
    console.log('\n🔄 Seleccionando una reserva...');
    const bookingCard = page.locator('[class*="booking"], [class*="card"], [class*="reservation"]').first();
    if (await bookingCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, bookingCard);
      await humanWait(2000);
      await take('booking-detail');
    }

    // Scroll para ver opciones
    await humanScroll(page, 300);
    await take('booking-options');

    // Buscar botón de cancelar
    console.log('\n🔄 Buscando opción de cancelar...');
    const cancelBtn = page.locator('button:has-text("Cancelar"), a:has-text("Cancelar"), [class*="cancel"]').first();
    if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Botón de cancelar encontrado');
      await take('cancel-button-found');
      await humanClick(page, cancelBtn);
      await humanWait(2000);
      await take('cancel-dialog');
    }

    // Buscar modal de confirmación
    const confirmModal = page.locator('[role="dialog"], [class*="modal"], [class*="alert"]').first();
    if (await confirmModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Modal de confirmación visible');
      await take('confirm-cancel-modal');

      // Buscar motivo de cancelación
      const reasonSelect = page.locator('select, [role="listbox"], textarea').first();
      if (await reasonSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await take('cancel-reason-options');
      }

      // Capturar botón de confirmar cancelación
      const confirmCancelBtn = page.locator('button:has-text("Confirmar cancelación"), button:has-text("Sí, cancelar")').first();
      if (await confirmCancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   ✅ Diálogo de cancelación listo');
        await take('ready-to-cancel');
        console.log('   ⚠️ NO se ejecuta la cancelación real (test seguro)');
      }
    }

    // ========== CANCELACIÓN COMO OWNER ==========
    console.log('\n🔄 Probando cancelación como Owner...');
    await page.goto(`${CONFIG.baseUrl}/bookings/owner`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('owner-bookings');

    const ownerBooking = page.locator('[class*="booking"], [class*="card"]').first();
    if (await ownerBooking.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, ownerBooking);
      await humanWait(2000);
      await take('owner-booking-detail');

      const ownerCancelBtn = page.locator('button:has-text("Rechazar"), button:has-text("Cancelar")').first();
      if (await ownerCancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   → Opción de rechazo/cancelación de owner encontrada');
        await take('owner-cancel-option');
      }
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/cancellation';
    await generateOutputs(screenshotDir, 'test-cancellation');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE CANCELACIÓN COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
