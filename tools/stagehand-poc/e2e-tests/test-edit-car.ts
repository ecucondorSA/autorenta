/**
 * Test E2E - Editar Auto (Owner)
 *
 * Flujo: Mis autos → Seleccionar auto → Editar detalles → Guardar
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, humanFill, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('🚗 TEST E2E - Editar Auto (Owner)');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-edit-car');
  const screenshot = createScreenshotter('edit-car');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login como owner
    await login(page, CONFIG.credentials.owner.email, CONFIG.credentials.owner.password, take);

    // Ir a mis autos
    console.log('\n🔄 Accediendo a mis autos...');
    await page.goto(`${CONFIG.baseUrl}/cars/my-cars`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('my-cars');

    // Scroll para ver autos
    await humanScroll(page, 200);
    await take('cars-list');

    // Seleccionar un auto
    console.log('\n🔄 Seleccionando auto para editar...');
    const carCard = page.locator('[class*="car"], [class*="card"], a[href*="/cars/"]').first();
    if (await carCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, carCard);
      await humanWait(2000);
      await take('car-selected');
    }

    // Buscar botón de editar
    console.log('\n🔄 Buscando opción de editar...');
    const editBtn = page.locator('button:has-text("Editar"), a:has-text("Editar"), ion-icon[name="pencil"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, editBtn);
      await humanWait(2000);
      await take('edit-form');
    }

    // ========== EDITAR DETALLES ==========
    console.log('\n🔄 Editando detalles del auto...');

    // Editar descripción
    const descInput = page.locator('textarea[name="description"], textarea').first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill('');
      await humanFill(descInput, 'Auto en excelentes condiciones, recién lavado y con mantenimiento al día. Ideal para viajes en familia.');
      await take('description-edited');
    }

    // Scroll para ver más campos
    await humanScroll(page, 300);
    await take('edit-form-scroll');

    // Editar precio
    const priceInput = page.locator('input[name="price"], input[type="number"]').first();
    if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priceInput.fill('');
      await humanFill(priceInput, '85');
      await take('price-edited');
    }

    // ========== EDITAR FOTOS ==========
    console.log('\n🔄 Sección de fotos...');
    const photosSection = page.locator('text=/fotos|imágenes|photos/i, [class*="photo"], [class*="image"]').first();
    if (await photosSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, photosSection);
      await humanWait(1000);
      await take('photos-section');
    }

    // Input de archivo para nuevas fotos
    const photoInput = page.locator('input[type="file"]').first();
    if (await photoInput.count() > 0) {
      console.log('   → Input de fotos encontrado');
      await take('photo-upload-available');
    }

    // ========== EDITAR CARACTERÍSTICAS ==========
    console.log('\n🔄 Editando características...');
    await humanScroll(page, 300);

    const featuresSection = page.locator('text=/características|features|extras/i').first();
    if (await featuresSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await take('features-section');
    }

    // Toggle algunas características
    const featureToggle = page.locator('[role="checkbox"], input[type="checkbox"]').first();
    if (await featureToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await humanClick(page, featureToggle);
      await take('feature-toggled');
    }

    // ========== GUARDAR CAMBIOS ==========
    console.log('\n🔄 Guardando cambios...');
    await humanScroll(page, 200);
    await take('form-complete');

    const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Actualizar"), button[type="submit"]').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Formulario listo para guardar');
      await take('ready-to-save');
      console.log('   ⚠️ NO se guardan los cambios reales (test seguro)');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/edit-car';
    await generateOutputs(screenshotDir, 'test-edit-car');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE EDITAR AUTO COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
