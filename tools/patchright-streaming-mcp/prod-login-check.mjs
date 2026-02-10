import { chromium } from 'patchright';

const EMAIL = process.env.AUTORENTA_EMAIL || 'ecucondor@gmail.com';
const PASSWORD = process.env.AUTORENTA_PASSWORD || 'Ab.12345';

const profileDir = process.env.PATCHRIGHT_PROFILE_DIR || '/tmp/patchright-prod-audit-profile';

const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 },
  args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
});

const page = ctx.pages()[0] || (await ctx.newPage());

try {
  await page.goto('https://autorentar.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 90000 });

  const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i], input[placeholder*="correo" i]');
  await emailInput.first().waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.first().fill(EMAIL);

  const passInput = page.locator('input[type="password"]');
  await passInput.first().fill(PASSWORD);

  // Submit: press Enter or click a button
  await passInput.first().press('Enter');

  await page.waitForTimeout(6000);

  await page.goto('https://autorentar.com/profile', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);

  console.log('URL after login check:', page.url());
  console.log('Logged in:', !page.url().includes('/auth/login'));

  await page.screenshot({ path: '/tmp/prod-profile-after-login.png', fullPage: true }).catch(() => {});
} catch (err) {
  console.error('ERROR', err);
  await page.screenshot({ path: '/tmp/prod-login-error.png', fullPage: true }).catch(() => {});
} finally {
  await ctx.close();
}
