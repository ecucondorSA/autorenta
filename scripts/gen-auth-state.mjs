#!/usr/bin/env node
import fs from 'fs';
import { chromium } from 'playwright';

const roles = process.argv.slice(2).length ? process.argv.slice(2) : ['renter', 'owner', 'admin'];
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';

async function genFor(role) {
  const envUser = process.env[`TEST_${role.toUpperCase()}_EMAIL`];
  const envPass = process.env[`TEST_${role.toUpperCase()}_PASSWORD`];
  if (!envUser || !envPass) {
    console.warn(`Skipping ${role}: environment variables TEST_${role.toUpperCase()}_EMAIL / _PASSWORD not set`);
    return;
  }

  const outDir = 'tests/.auth';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating storageState for role=${role} using ${envUser}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL, { waitUntil: 'networkidle' });

    // Basic selectors - adapt to your app's login form
    await page.fill('[data-e2e="login-email"]', envUser).catch(() => {});
    await page.fill('[data-e2e="login-password"]', envPass).catch(() => {});
    await page.click('[data-e2e="login-submit"]').catch(() => {});

    // wait for a likely post-login url or element
    await page.waitForTimeout(2000);

    const outPath = `${outDir}/${role}.json`;
    await context.storageState({ path: outPath });
    console.log(`Saved storageState → ${outPath}`);
  } catch (err) {
    console.error(`Failed to generate storageState for ${role}:`, err.message || err);
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const r of roles) await genFor(r);
  process.exit(0);
})();
