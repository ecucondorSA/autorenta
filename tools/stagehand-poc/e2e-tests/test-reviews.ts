/**
 * Test E2E - Reviews / Reseñas
 *
 * Flujo: Booking completado → Dejar reseña → Rating → Comentario
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, humanFill, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('⭐ TEST E2E - Reviews / Reseñas');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-reviews');
  const screenshot = createScreenshotter('reviews');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir a mis reservas
    console.log('\n🔄 Buscando reserva completada...');
    await page.goto(`${CONFIG.baseUrl}/bookings/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('my-bookings');

    // Buscar booking completado
    const completedBooking = page.locator('text=/completad|finaliz|terminad/i').first();
    if (await completedBooking.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, completedBooking);
      await humanWait(2000);
      await take('completed-booking');
    } else {
      const anyBooking = page.locator('[class*="booking"], [class*="card"]').first();
      if (await anyBooking.isVisible({ timeout: 3000 }).catch(() => false)) {
        await humanClick(page, anyBooking);
        await humanWait(2000);
        await take('booking-selected');
      }
    }

    // Scroll para ver opciones
    await humanScroll(page, 300);
    await take('booking-detail');

    // Buscar opción de dejar reseña
    console.log('\n🔄 Buscando opción de reseña...');
    const reviewBtn = page.locator('button:has-text("Reseña"), button:has-text("Calificar"), button:has-text("Review"), a:has-text("Reseña")').first();
    if (await reviewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Opción de reseña encontrada');
      await humanClick(page, reviewBtn);
      await humanWait(2000);
      await take('review-form');
    }

    // Buscar estrellas de rating
    console.log('\n🔄 Seleccionando rating...');
    const stars = page.locator('[class*="star"], [class*="rating"] button, ion-icon[name*="star"]');
    const starCount = await stars.count();
    console.log(`   → ${starCount} estrellas encontradas`);

    if (starCount >= 5) {
      // Click en 5ta estrella (5 estrellas)
      const fiveStar = stars.nth(4);
      if (await fiveStar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanClick(page, fiveStar);
        await humanWait(500);
        await take('five-stars-selected');
      }
    }

    // Llenar comentario
    console.log('\n🔄 Escribiendo comentario...');
    const commentInput = page.locator('textarea, input[name="comment"], input[placeholder*="comentario" i]').first();
    if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanFill(commentInput, 'Excelente experiencia! El auto estaba en perfectas condiciones y el propietario fue muy amable. 100% recomendado.');
      await take('comment-written');
    }

    // Scroll para ver más opciones
    await humanScroll(page, 200);
    await take('review-form-complete');

    // Capturar botón de enviar
    const submitBtn = page.locator('button:has-text("Enviar"), button:has-text("Publicar"), button:has-text("Guardar")').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Formulario de reseña listo');
      await take('ready-to-submit');
      console.log('   ⚠️ NO se envía la reseña real (test seguro)');
    }

    // ========== VER RESEÑAS EXISTENTES ==========
    console.log('\n🔄 Viendo reseñas existentes...');
    await page.goto(`${CONFIG.baseUrl}/cars/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);

    const carCard = page.locator('a[href*="/cars/"]').first();
    if (await carCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, carCard);
      await humanWait(2000);
      await take('car-detail-reviews');
    }

    // Buscar sección de reseñas
    await humanScroll(page, 500);
    await take('reviews-section');

    const reviewsSection = page.locator('text=/reseñas|reviews|opiniones/i').first();
    if (await reviewsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Sección de reseñas visible');
      await humanClick(page, reviewsSection);
      await humanWait(1000);
      await take('reviews-expanded');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/reviews';
    await generateOutputs(screenshotDir, 'test-reviews');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE REVIEWS COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
