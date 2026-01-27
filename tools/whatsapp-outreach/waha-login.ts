import { chromium } from 'playwright';

async function main() {
  console.log('Abriendo navegador...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    httpCredentials: {
      username: 'autorenta',
      password: 'AutoRenta2026!'
    }
  });
  const page = await context.newPage();

  console.log('Navegando a WAHA...');
  await page.goto('http://localhost:3000');

  console.log('Login completado!');
  console.log('Escaneá el QR con tu WhatsApp.');
  console.log('El navegador se cerrará en 5 minutos.');

  // Mantener abierto
  await page.waitForTimeout(300000); // 5 minutos
  await browser.close();
}

main().catch(console.error);
