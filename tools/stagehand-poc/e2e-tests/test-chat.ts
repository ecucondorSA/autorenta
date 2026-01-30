/**
 * Test E2E - Chat / Mensajería
 *
 * Flujo: Booking → Abrir chat → Enviar mensaje → Ver respuesta
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, humanFill, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('💬 TEST E2E - Chat / Mensajería');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-chat');
  const screenshot = createScreenshotter('chat');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir a mensajes
    console.log('\n🔄 Accediendo a mensajes...');
    await page.goto(`${CONFIG.baseUrl}/messages`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('messages-inbox');

    // Scroll para ver conversaciones
    await humanScroll(page, 200);
    await take('messages-list');

    // Seleccionar una conversación
    console.log('\n🔄 Abriendo conversación...');
    const conversation = page.locator('[class*="conversation"], [class*="chat"], [class*="message-item"]').first();
    if (await conversation.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, conversation);
      await humanWait(2000);
      await take('chat-opened');
    }

    // Ver historial de mensajes
    await humanScroll(page, -200); // Scroll hacia arriba para ver mensajes anteriores
    await take('chat-history');

    await humanScroll(page, 300);
    await take('chat-recent');

    // ========== ENVIAR MENSAJE ==========
    console.log('\n🔄 Escribiendo mensaje...');
    const messageInput = page.locator('input[placeholder*="mensaje" i], textarea[placeholder*="mensaje" i], input[name="message"]').first();
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanFill(messageInput, 'Hola! Tengo una consulta sobre la reserva. ¿El auto tiene bluetooth?');
      await take('message-typed');

      // Buscar botón de enviar
      const sendBtn = page.locator('button[type="submit"], button:has-text("Enviar"), ion-icon[name="send"]').first();
      if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   ✅ Mensaje listo para enviar');
        await take('ready-to-send');
        console.log('   ⚠️ NO se envía el mensaje real (test seguro)');
      }
    }

    // ========== CHAT DESDE BOOKING ==========
    console.log('\n🔄 Accediendo al chat desde booking...');
    await page.goto(`${CONFIG.baseUrl}/bookings/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);

    const booking = page.locator('[class*="booking"], [class*="card"]').first();
    if (await booking.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, booking);
      await humanWait(2000);
      await take('booking-for-chat');
    }

    // Buscar botón de chat/mensaje
    const chatBtn = page.locator('button:has-text("Chat"), button:has-text("Mensaje"), a:has-text("Chat"), ion-icon[name="chatbubble"]').first();
    if (await chatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Botón de chat encontrado');
      await humanClick(page, chatBtn);
      await humanWait(2000);
      await take('booking-chat');
    }

    // ========== CHAT DE SOPORTE ==========
    console.log('\n🔄 Buscando chat de soporte...');
    const supportBtn = page.locator('button:has-text("Soporte"), button:has-text("Ayuda"), a:has-text("Soporte")').first();
    if (await supportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, supportBtn);
      await humanWait(2000);
      await take('support-chat');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/chat';
    await generateOutputs(screenshotDir, 'test-chat');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE CHAT COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
