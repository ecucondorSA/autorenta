/**
 * Test E2E - Pago con MercadoPago
 *
 * Flujo: Seleccionar auto → Checkout → Pago con tarjeta MercadoPago
 */

import { chromium } from 'patchright';
import { CONFIG, setupBrowser, createScreenshotter, login, humanClick, humanScroll, humanWait, humanFill, generateOutputs, sleep } from './shared/test-utils';

async function main() {
  console.log('═'.repeat(60));
  console.log('💳 TEST E2E - Pago con MercadoPago');
  console.log('═'.repeat(60));

  const { browser, page } = await setupBrowser(chromium, 'test-payment-mp');
  const screenshot = createScreenshotter('payment-mercadopago');
  const take = (name: string) => screenshot(page, name);

  try {
    // Login
    await login(page, CONFIG.credentials.renter.email, CONFIG.credentials.renter.password, take);

    // Ir al marketplace
    console.log('\n🔄 Seleccionando un auto...');
    await page.goto(`${CONFIG.baseUrl}/cars/list`, { waitUntil: 'domcontentloaded' });
    await humanWait(3000);
    await take('marketplace');

    // Seleccionar primer auto
    const carCard = page.locator('a[href*="/cars/"]').first();
    if (await carCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, carCard);
      await humanWait(3000);
      await take('car-detail');
    }

    // Click en reservar
    console.log('\n🔄 Iniciando reserva...');
    const bookBtn = page.locator('button:has-text("Reservar"), button:has-text("Alquilar")').first();
    if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, bookBtn);
      await humanWait(3000);
      await take('booking-start');
    }

    // Navegar al checkout
    console.log('\n🔄 Navegando al checkout...');
    await humanScroll(page, 300);
    await take('booking-form');

    const continueBtn = page.locator('button:has-text("Continuar")').first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await humanClick(page, continueBtn);
      await humanWait(2000);
    }
    await take('checkout-page');

    // Seleccionar MercadoPago
    console.log('\n🔄 Seleccionando MercadoPago...');
    const mpBtn = page.locator('button:has-text("MercadoPago"), [data-payment="mercadopago"], [class*="mercadopago"]').first();
    if (await mpBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await humanClick(page, mpBtn);
      await humanWait(2000);
      await take('mercadopago-selected');
    }

    // Buscar formulario de tarjeta (MercadoPago Bricks)
    console.log('\n🔄 Buscando formulario de tarjeta...');
    await humanWait(3000);
    await take('payment-form');

    // Buscar iframe de MercadoPago o campos de tarjeta
    const cardFrame = page.frameLocator('iframe[src*="mercadopago"]').first();
    const cardNumberInput = page.locator('input[name="cardNumber"], input[data-checkout="cardNumber"], #cardNumber').first();

    if (await cardNumberInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   → Formulario de tarjeta encontrado');
      await take('card-form-visible');

      // Datos de tarjeta de prueba MercadoPago
      console.log('   → Llenando datos de tarjeta de prueba...');
      await humanFill(cardNumberInput, '5031 7557 3453 0604'); // Tarjeta de prueba MP
      await take('card-number-filled');

      const expiryInput = page.locator('input[name="expiry"], input[data-checkout="cardExpirationDate"]').first();
      if (await expiryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanFill(expiryInput, '11/25');
      }

      const cvvInput = page.locator('input[name="cvv"], input[data-checkout="securityCode"]').first();
      if (await cvvInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanFill(cvvInput, '123');
      }

      const nameInput = page.locator('input[name="cardholderName"], input[data-checkout="cardholderName"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await humanFill(nameInput, 'APRO TEST');
      }

      await take('card-details-filled');
    } else {
      console.log('   ⚠️ Formulario de tarjeta no visible (puede requerir selección previa)');
      await take('card-form-not-visible');
    }

    // Capturar estado del botón de pagar
    console.log('\n🔄 Capturando botón de pago...');
    await humanScroll(page, 200);
    await take('pay-button-visible');

    const payBtn = page.locator('button:has-text("Pagar"), button:has-text("Confirmar pago")').first();
    if (await payBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Botón de pago encontrado');
      await take('ready-to-pay');

      // NO hacemos click real para evitar cobros
      console.log('   ⚠️ NO se ejecuta el pago real (test seguro)');
    }

    await take('final-state');

    // Generar outputs
    console.log('\n🎬 Generando videos...');
    const screenshotDir = '/home/edu/autorenta/tools/stagehand-poc/screenshots/payment-mercadopago';
    await generateOutputs(screenshotDir, 'test-payment-mercadopago');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DE PAGO MERCADOPAGO COMPLETADO');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n💥 Error:', error);
    await take('error-state');
  } finally {
    console.log('\n⏸️ Browser abierto - ciérralo manualmente');
  }
}

main().catch(console.error);
