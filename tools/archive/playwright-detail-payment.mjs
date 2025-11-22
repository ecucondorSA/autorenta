#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://autorenta-web.pages.dev';
const storageStatePath =
  process.env.PLAYWRIGHT_STATE_PATH ?? path.resolve(__dirname, '../tests/.auth/playwright.json');

const carId = process.env.PLAYWRIGHT_CAR_ID ?? 'e8644fdd-e8a3-4565-8c50-ebb779cf6ba3';
const country = process.env.PLAYWRIGHT_COUNTRY ?? 'AR';

function formatISO(date) {
  return date.toISOString();
}

function buildUrl() {
  const start = new Date();
  start.setDate(start.getDate() + 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 5);

  const vehicleValueUsd = process.env.PLAYWRIGHT_VEHICLE_VALUE_USD ?? '25000';
  const bucket = process.env.PLAYWRIGHT_BUCKET ?? 'standard';

  const params = new URLSearchParams({
    carId,
    startDate: formatISO(start),
    endDate: formatISO(end),
    vehicleValueUsd: String(vehicleValueUsd),
    bucket,
    country,
  });

  return `${baseURL}/bookings/detail-payment?${params.toString()}`;
}

async function main() {
  console.log('Opening browser with saved session...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });

  const targetUrl = buildUrl();
  console.log(`Navigating to ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  const hasErrorBanner = await page.locator('text=No pudimos inicializar Mercado Pago').first().isVisible().catch(() => false);
  console.log(`Mercado Pago error banner visible: ${hasErrorBanner}`);

  await browser.close();
  console.log('Done.');
}

main().catch((error) => {
  console.error('Error running detail-payment script:', error);
  process.exit(1);
});
