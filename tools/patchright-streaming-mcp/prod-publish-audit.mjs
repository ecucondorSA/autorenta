import { chromium } from 'patchright';

const profileDir = process.env.PATCHRIGHT_PROFILE_DIR || '/tmp/patchright-prod-audit-profile';

const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  channel: 'chrome',
  viewport: { width: 414, height: 896 }, // iPhone XR-ish
  args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
});

const page = ctx.pages()[0] || (await ctx.newPage());

try {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('https://autorentar.com/cars/publish', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await page.waitForTimeout(8000);

  const url = page.url();
  const hasPublishBtn = await page
    .locator('button:has-text("Publicar")')
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  console.log('URL:', url);
  console.log('Publish button visible:', hasPublishBtn);
  console.log('Console error count:', consoleErrors.length);

  await page.screenshot({ path: '/tmp/prod-cars-publish.png', fullPage: true }).catch(() => {});
} catch (err) {
  console.error('ERROR', err);
  await page.screenshot({ path: '/tmp/prod-cars-publish-error.png', fullPage: true }).catch(() => {});
} finally {
  await ctx.close();
}
