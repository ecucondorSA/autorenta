#!/usr/bin/env node
/**
 * Login directo a Autorentar usando Patchright (sin servidor MCP)
 */

import { chromium } from 'patchright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('📍 Navegando a https://autorentar.com...');
  await page.goto('https://autorentar.com', { waitUntil: 'networkidle' });
  
  console.log('🔍 Buscando botón Ingresar...');
  await page.waitForTimeout(2000);
  
  // Click en Ingresar
  const loginBtn = page.locator('a:has-text("Ingresar"), button:has-text("Ingresar")').first();
  await loginBtn.click();
  
  console.log('✅ Click en Ingresar');
  await page.waitForTimeout(3000);
  
  console.log(`📄 URL actual: ${page.url()}`);
  
  // Buscar inputs
  const emailInput = page.locator('input[type="email"], input[formcontrolname="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  console.log('✍️  Ingresando credenciales...');
  await emailInput.fill('eduardomarques@campus.fmed.uba.ar');
  await passwordInput.fill('Ab.12345');
  
  console.log('🔐 Enviando formulario...');
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  
  await page.waitForTimeout(5000);
  
  console.log(`✅ Login completado. URL: ${page.url()}`);
  console.log('\n📸 Screenshot guardado en /tmp/autorenta-logged-in.png');
  await page.screenshot({ path: '/tmp/autorenta-logged-in.png', fullPage: true });
  
  console.log('\n⏸️  Navegador abierto. Presiona Ctrl+C para cerrar...');
  
  process.on('SIGINT', async () => {
    console.log('\n🔒 Cerrando...');
    await browser.close();
    process.exit(0);
  });
})();
