import { chromium } from 'playwright';

const BASE_URL = 'https://autorentar.com';
const EMAIL = process.env.AUTORENTA_EMAIL;
const PASSWORD = process.env.AUTORENTA_PASSWORD;

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  console.log('1. Voy a /auth/login...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/tmp/login-page.png' });
  console.log('Screenshot guardado en /tmp/login-page.png');

  // Check for scenic login
  const scenicButton = page.locator('button[data-testid="login-scenic-signin"]').first();
  if ((await scenicButton.count()) > 0) {
    console.log('2. Pantalla scenic detected, clicking "Ingresar"...');
    await scenicButton.click();
    await page.waitForTimeout(2000);
  }

  console.log('3. Buscando form...');
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="correo" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i], input[placeholder*="contraseña" i]').first();

  if ((await emailInput.count()) === 0 || (await passwordInput.count()) === 0) {
    console.error('❌ No encontré inputs de email/password');
    await browser.close();
    return;
  }

  console.log('3. Completando email/password...');
  await emailInput.fill(EMAIL!);
  await passwordInput.fill(PASSWORD!);
  
  console.log('4. Submit...');
  const submitButton = page.locator('button[type="submit"]').first();
  if ((await submitButton.count()) > 0) {
    await submitButton.click();
  } else {
    await page.keyboard.press('Enter');
  }

  console.log('5. Esperando navegación post-login...');
  await page.waitForTimeout(3000);

  console.log('6. URL actual:', page.url());
  
  console.log('7. Navegando a /wallet (ruta privada)...');
  await page.goto(`${BASE_URL}/wallet`);
  await page.waitForTimeout(2000);
  
  console.log('8. URL después de /wallet:', page.url());
  
  if (page.url().includes('/auth/login')) {
    console.error('❌ Redirigió de vuelta al login → credenciales incorrectas o sesión no persiste');
  } else {
    console.log('✅ Login exitoso, estoy en:', page.url());
  }

  console.log('\nPresioná Ctrl+C para cerrar el navegador y terminar.');
  await new Promise(() => {}); // Keep browser open
}

main().catch(console.error);
