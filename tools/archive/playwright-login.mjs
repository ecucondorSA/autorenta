#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://autorenta-web.pages.dev';
const email = process.env.PLAYWRIGHT_EMAIL ?? 'autoplaywright+001@autorenta.dev';
const password = process.env.PLAYWRIGHT_PASSWORD ?? 'Autorenta!123';
const outputPath =
  process.env.PLAYWRIGHT_STATE_PATH ?? path.resolve(__dirname, '../tests/.auth/playwright.json');

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });

  console.log(`Navigating to ${baseURL}/auth/login`);
  await page.goto(`${baseURL}/auth/login`, { waitUntil: 'networkidle' });

  console.log('Filling login form...');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);

  console.log('Submitting login form...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);

  await page.waitForTimeout(3000);
  const currentURL = page.url();
  console.log(`Login completo. URL actual: ${currentURL}`);

  await page.context().storageState({ path: outputPath });
  console.log(`Estado de sesión guardado en: ${outputPath}`);

  await browser.close();
  console.log('Browser cerrado.');
}

main().catch((error) => {
  console.error('Error ejecutando login con Playwright:', error);
  process.exit(1);
});
