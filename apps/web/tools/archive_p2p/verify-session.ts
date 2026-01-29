import { chromium } from 'patchright';
import { MercadoPagoPage } from './src/browser/mercadopago-page.js';

async function verifySessionOnly() {
  console.log('🛡️ Verificando Sesión de Mercado Pago...');
  const browser = await chromium.launchPersistentContext(
    '/home/edu/.mercadopago-browser-profile',
    {
      headless: true, // Headless for simple check
      viewport: null,
    }
  );

  const page = await browser.newPage();
  const mpPage = new MercadoPagoPage(page);

  try {
    const sessionValid = await mpPage.verifySession();
    if (sessionValid) {
      console.log('✅ Sesión VÁLIDA en Mercado Pago.');
    } else {
      console.log('❌ Sesión INVÁLIDA o requerida activación manual.');
      await page.screenshot({ path: 'mp-session-error.png' });
      console.log('📸 Captura guardada en mp-session-error.png');
    }
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await browser.close();
  }
}

verifySessionOnly().catch(console.error);
