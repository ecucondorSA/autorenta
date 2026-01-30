/**
 * Test E2E - Suscripciones
 *
 * Flujo: Perfil → Suscripciones → Ver planes → Seleccionar plan
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, generateOutputs } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('💎 TEST E2E - Suscripciones');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-subscriptions');
  const screenshot = createScreenshotter('subscriptions');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir a suscripciones
    console.log('\n🔄 Accediendo a suscripciones...');
    await page.goto(`${CONFIG.baseUrl}/subscriptions`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('subscriptions-page');

    // Ver planes disponibles
    console.log('\n🔄 Explorando planes...');
    await humanScroll(page, 300);
    await take('plans-visible');

    // ========== PLAN STANDARD ==========
    console.log('\n🔄 Viendo Plan Standard...');
    const standardPlan = page.locator('text=/standard/i, [class*="standard"]').first();
    if (await standardPlan.isVisible({ timeout: 3000 }).catch(() => false)) {
      await take('standard-plan');
    }

    // ========== PLAN BLACK ==========
    console.log('\n🔄 Viendo Plan Black...');
    const blackPlan = page.locator('text=/black/i, [class*="black"]').first();
    if (await blackPlan.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, blackPlan);
      await humanWait(1000);
      await take('black-plan');
    }

    await humanScroll(page, 300);
    await take('plans-scroll');

    // ========== PLAN LUXURY ==========
    console.log('\n🔄 Viendo Plan Luxury...');
    const luxuryPlan = page.locator('text=/luxury|premium/i, [class*="luxury"]').first();
    if (await luxuryPlan.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, luxuryPlan);
      await humanWait(1000);
      await take('luxury-plan');
    }

    // Ver beneficios de un plan
    console.log('\n🔄 Viendo beneficios del plan...');
    const viewBenefitsBtn = page.locator('button:has-text("Ver beneficios"), button:has-text("Detalles"), a:has-text("beneficios")').first();
    if (await viewBenefitsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, viewBenefitsBtn);
      await humanWait(2000);
      await take('plan-benefits');
    }

    // Seleccionar un plan
    console.log('\n🔄 Seleccionando plan...');
    const selectPlanBtn = page.locator('button:has-text("Seleccionar"), button:has-text("Suscribir"), button:has-text("Elegir")').first();
    if (await selectPlanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, selectPlanBtn);
      await humanWait(2000);
      await take('plan-selected');
    }

    // Scroll para ver checkout de suscripción
    await humanScroll(page, 200);
    await take('subscription-checkout');

    // Ver opciones de pago
    const paymentOptions = page.locator('[class*="payment"], [class*="card"]');
    if (await paymentOptions.count() > 0) {
      console.log('   → Opciones de pago visibles');
      await take('payment-options');
    }

    // Capturar botón de confirmar suscripción
    const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Suscribir"), button:has-text("Pagar")').first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Checkout de suscripción listo');
      await take('ready-to-subscribe');
      console.log('   ⚠️ NO se procesa la suscripción real (test seguro)');
    }

    // ========== GESTIONAR SUSCRIPCIÓN EXISTENTE ==========
    console.log('\n🔄 Viendo gestión de suscripción...');
    await page.goto(`${CONFIG.baseUrl}/subscriptions/manage`, { waitUntil: 'domcontentloaded' });
    await humanWait(2000);
    await take('manage-subscription');

    // Buscar opciones de cancelar/cambiar
    const cancelBtn = page.locator('button:has-text("Cancelar"), button:has-text("Cambiar plan")').first();
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   → Opciones de gestión disponibles');
      await take('subscription-management');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/subscriptions';
    await generateOutputs(screenshotDir, 'test-subscriptions');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE SUSCRIPCIONES COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
