/**
 * Utilidades compartidas para todos los tests E2E
 */

import { type Page } from 'patchright';
import * as fs from 'fs';
import * as path from 'path';

export const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    renter: {
      email: 'eduardomarques@campus.fmed.uba.ar',
      password: 'Ab.12345',
    },
    owner: {
      email: 'eduardomarques@campus.fmed.uba.ar',
      password: 'Ab.12345',
    },
  },
  viewport: { width: 430, height: 932 },
  screenshotBaseDir: '/home/edu/autorenta/tools/stagehand-poc/screenshots',
  outputDir: '/home/edu/autorenta/marketing/demos',
};

// ========== TIMING UTILITIES ==========

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function humanWait(baseMs: number = 1000) {
  const variation = randomDelay(-200, 400);
  await sleep(Math.max(400, baseMs + variation));
}

// ========== INTERACTION UTILITIES ==========

export async function humanClick(page: Page, locator: any, options?: { force?: boolean }) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await sleep(randomDelay(150, 400));
    await locator.click({
      position: { x: randomDelay(5, 15), y: randomDelay(5, 15) },
      force: options?.force,
    });
    await humanWait(600);
  } catch (e) {
    console.log(`   ⚠️ Click fallido, intentando force click...`);
    await locator.click({ force: true });
    await humanWait(600);
  }
}

export async function humanScroll(page: Page, amount: number = 300) {
  const steps = 4;
  const stepAmount = amount / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y: number) => window.scrollBy(0, y), stepAmount);
    await sleep(randomDelay(40, 80));
  }
  await humanWait(400);
}

export async function humanType(page: Page, locator: any, text: string) {
  await locator.click();
  await sleep(randomDelay(200, 400));
  for (const char of text) {
    await locator.type(char, { delay: randomDelay(40, 120) });
  }
  await humanWait(300);
}

export async function humanFill(locator: any, text: string) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  await locator.fill(text);
  await sleep(randomDelay(200, 400));
}

// ========== AUTH UTILITIES ==========

export async function login(page: Page, email: string, password: string, screenshotFn?: Function) {
  console.log(`   → Login con ${email.split('@')[0]}...`);

  await page.goto(`${CONFIG.baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  await humanWait(2000);

  // Click en Ingresar principal si existe
  const mainBtn = page.locator('button:has-text("Ingresar")').first();
  if (await mainBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await humanClick(page, mainBtn);
    await humanWait(1500);
  }

  // Click en "o con email"
  const emailOption = page.locator('button:has-text("o con email"), button:has-text("con email")').first();
  if (await emailOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await humanClick(page, emailOption);
    await humanWait(1500);
  }

  // Llenar credenciales
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);
  await sleep(300);

  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(password);
  await sleep(300);

  if (screenshotFn) await screenshotFn('login-filled');

  // Submit
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await humanWait(4000);

  if (screenshotFn) await screenshotFn('login-complete');
  console.log('   ✅ Login exitoso');
}

export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'domcontentloaded' });
  await humanWait(1000);
}

export async function ensureLoggedIn(page: Page, email: string, password: string, screenshotFn?: Function) {
  await page.goto(`${CONFIG.baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
  await humanWait(2000);

  const url = page.url();
  if (url.includes('/auth')) {
    await login(page, email, password, screenshotFn);
  }
}

// ========== SCREENSHOT UTILITIES ==========

export function createScreenshotter(testName: string) {
  const screenshotDir = path.join(CONFIG.screenshotBaseDir, testName);
  fs.mkdirSync(screenshotDir, { recursive: true });

  // Limpiar screenshots anteriores
  for (const file of fs.readdirSync(screenshotDir)) {
    if (file.endsWith('.png')) fs.unlinkSync(path.join(screenshotDir, file));
  }

  let step = 0;

  return async (page: Page, name: string) => {
    const filename = `${String(step++).padStart(2, '0')}-${name}.png`;
    await page.screenshot({
      path: path.join(screenshotDir, filename),
      clip: { x: 0, y: 0, width: CONFIG.viewport.width, height: CONFIG.viewport.height },
    });
    console.log(`   📸 ${filename}`);
    return { step, filename, dir: screenshotDir };
  };
}

// ========== VIDEO GENERATION ==========

export async function generateOutputs(screenshotDir: string, outputName: string) {
  const { execSync } = await import('child_process');
  const gifPath = path.join(CONFIG.outputDir, `${outputName}.gif`);
  const mp4Path = path.join(CONFIG.outputDir, `${outputName}.mp4`);

  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  try {
    execSync(`ffmpeg -y -framerate 0.8 -pattern_type glob -i '${screenshotDir}/*.png' -vf "scale=430:-1" -loop 0 "${gifPath}"`, { stdio: 'pipe' });
    console.log(`✅ GIF: ${gifPath}`);

    execSync(`ffmpeg -y -framerate 1 -pattern_type glob -i '${screenshotDir}/*.png' -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 "${mp4Path}"`, { stdio: 'pipe' });
    console.log(`✅ MP4: ${mp4Path}`);

    return { gifPath, mp4Path };
  } catch (e) {
    console.log(`📁 Screenshots en: ${screenshotDir}`);
    return { screenshotDir };
  }
}

// ========== BROWSER SETUP ==========

export async function setupBrowser(chromium: any, testName: string) {
  const userDataDir = `/home/edu/.patchright-${testName}`;

  // Limpiar perfil anterior
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: CONFIG.viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    args: ['--window-size=500,1000', '--window-position=100,50'],
  });

  const page = browser.pages()[0] || await browser.newPage();

  return { browser, page };
}

// ========== COMMON SELECTORS ==========

export const SELECTORS = {
  // Navigation
  backButton: 'button[aria-label="back"], ion-back-button, [class*="back"]',
  continueButton: 'button:has-text("Continuar"), button:has-text("Siguiente")',
  confirmButton: 'button:has-text("Confirmar"), button:has-text("Aceptar")',
  cancelButton: 'button:has-text("Cancelar"), button:has-text("Cerrar")',

  // Forms
  emailInput: 'input[type="email"], input[name="email"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',

  // Bookings
  bookingCard: '[class*="booking"], [class*="reservation"], [class*="card"]',
  carCard: 'a[href*="/cars/"], [data-testid="car-card"]',

  // Payments
  mercadoPagoButton: 'button:has-text("MercadoPago"), [data-payment="mercadopago"]',
  paypalButton: 'button:has-text("PayPal"), [data-payment="paypal"]',

  // Actions
  checkInButton: 'button:has-text("Check-in"), button:has-text("Entregar")',
  checkOutButton: 'button:has-text("Check-out"), button:has-text("Devolver")',
};
