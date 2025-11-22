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

function buildBookingUrl() {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);

  const vehicleValueUsd = process.env.PLAYWRIGHT_VEHICLE_VALUE_USD ?? '25000';
  const bucket = process.env.PLAYWRIGHT_BUCKET ?? 'standard';

  const params = new URLSearchParams({
    carId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    vehicleValueUsd: String(vehicleValueUsd),
    bucket,
    country,
  });

  return `${baseURL}/bookings/detail-payment?${params.toString()}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  page.on('console', (msg) => console.log(`[console:${msg.type()}] ${msg.text()}`));
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('mercadopago') || res.status() >= 400) {
      console.log(`[response ${res.status()}] ${url}`);
    }
  });

  console.log('Opening detail-payment page...');
  const url = buildBookingUrl();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  console.log('Filling Mercado Pago form...');
  await page.waitForSelector('#form-checkout__cardNumber iframe', { timeout: 20000 });

  // helper to fill iframe inputs
  async function fillIframe(selector, value, inputSelector = 'input') {
    const frameElement = await page.waitForSelector(selector, { timeout: 20000 });
    const frame = await frameElement.contentFrame();
    await frame.waitForSelector(inputSelector, { timeout: 20000 });
    await frame.fill(inputSelector, value);
  }

  async function selectOption(selector, value) {
    await page.waitForFunction(
      ({ sel, val }) => {
        const el = document.querySelector(sel);
        return (
          !!el &&
          Array.from(el.options || []).some((opt) => opt.value === val && !opt.disabled)
        );
      },
      { sel: selector, val: value },
      { timeout: 20000 },
    );
    await page.selectOption(selector, value);
  }

  async function selectFirstAvailable(selector) {
    const resultHandle = await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const opt = Array.from(el.options || []).find((o) => o.value && !o.disabled);
        return opt ? opt.value : null;
      },
      selector,
      { timeout: 20000 },
    );
    const resolved = await resultHandle.jsonValue();
    if (!resolved) {
      throw new Error(`No selectable option found for ${selector}`);
    }
    await page.selectOption(selector, resolved);
  }

  await fillIframe('#form-checkout__cardNumber iframe', '5031620000000008', 'input[name="cardNumber"]');

  console.log('Expiration container HTML:', await page.locator('#form-checkout__expirationDate').evaluate((el) => el.outerHTML));
  console.log('Security container HTML:', await page.locator('#form-checkout__securityCode').evaluate((el) => el.outerHTML));
  console.log('Identification container HTML:', await page.locator('#form-checkout__identificationType').evaluate((el) => el.outerHTML));
  console.log('Issuer container HTML:', await page.locator('#form-checkout__issuer').evaluate((el) => el.outerHTML));


  await fillIframe('#form-checkout__expirationDate iframe', '12/30', 'input[name="expirationDate"]');
  await fillIframe('#form-checkout__securityCode iframe', '123', 'input[name="securityCode"]');
  await page.fill('#form-checkout__cardholderName', 'APRO APRO');
  await selectOption('#form-checkout__identificationType', 'DNI');
  await page.fill('#form-checkout__identificationNumber', '12345678');
  await selectFirstAvailable('#form-checkout__issuer');
  await selectFirstAvailable('#form-checkout__installments');

  console.log('Submitting form...');
  const [consolePromise] = await Promise.all([
    page.waitForEvent('console', {
      timeout: 20000,
      predicate: (msg) => msg.type() === 'log' && msg.text().includes('Card token created:'),
    }),
    page.click('#form-checkout button[type="submit"]'),
  ]);
  console.log('Console log after submit:', consolePromise.text());

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
