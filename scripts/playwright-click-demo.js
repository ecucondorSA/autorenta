#!/usr/bin/env node
/**
 * Demo Playwright script that se conecta al Chrome dev profile expuesto en 9222
 * y realiza acciones visibles (navegar a playwright.dev y pulsar "Get started").
 */

const { chromium } = require('playwright');

async function main() {
  const endpoint = process.env.CHROME_DEVTOOLS_ENDPOINT || 'http://localhost:9222';
  const browser = await chromium.connectOverCDP(endpoint);

  const context = browser.contexts()[0];
  if (!context) {
    throw new Error('No hay contexto de Chrome disponible; abre Chrome con scripts/chrome-dev.sh primero.');
  }

  const page = await context.newPage();

  // Navegar a la app local de AutoRenta
  await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Hacer un click de demostración (ajusta el selector según tu app)
  // Por ejemplo, click en el logo o botón de login
  try {
    await page.click('a[href="/marketplace"]', { timeout: 3000 });
    console.log('✓ Navegó a marketplace');
  } catch (e) {
    console.log('ℹ No se encontró link de marketplace, solo cargando home');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'playwright-click-demo.png', fullPage: true });

  console.log('Demo completada en localhost:4200. Revisa playwright-click-demo.png para ver el resultado.');
  await page.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
